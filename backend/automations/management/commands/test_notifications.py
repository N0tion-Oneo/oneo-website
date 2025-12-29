"""
Management command to test notification automation rules.
"""
import traceback
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from automations.models import AutomationRule, RuleExecution
from automations.tasks import _execute_rule_notification, _build_template_context
from automations.registry import AutomatableModelRegistry


class Command(BaseCommand):
    help = 'Test notification automation rules'

    def add_arguments(self, parser):
        parser.add_argument(
            '--rule-id',
            type=str,
            help='Test a specific rule by ID'
        )
        parser.add_argument(
            '--trigger-type',
            type=str,
            help='Test all rules of a specific trigger type (e.g., model_created, status_changed)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=True,
            help='Preview only, do not actually send notifications (default: True)'
        )
        parser.add_argument(
            '--send',
            action='store_true',
            help='Actually send the notifications (overrides --dry-run)'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Test all notification rules'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show full tracebacks for errors'
        )

    def handle(self, *args, **options):
        User = get_user_model()
        admin = User.objects.filter(is_superuser=True, is_active=True).first()

        if not admin:
            self.stderr.write(self.style.ERROR('No admin user found'))
            return

        dry_run = not options.get('send', False)
        verbose = options.get('verbose', False)

        # Build queryset
        rules = AutomationRule.objects.filter(action_type='send_notification')

        if options.get('rule_id'):
            rules = rules.filter(id=options['rule_id'])
        elif options.get('trigger_type'):
            rules = rules.filter(trigger_type=options['trigger_type'])
        elif not options.get('all'):
            self.stdout.write(self.style.WARNING('No rules selected. Use --all, --rule-id, or --trigger-type'))
            self.stdout.write('')
            self.stdout.write('Available trigger types:')
            for tt in rules.values_list('trigger_type', flat=True).distinct():
                count = rules.filter(trigger_type=tt).count()
                self.stdout.write(f'  {tt}: {count} rules')
            return

        rules = rules.order_by('trigger_type', 'name')

        self.stdout.write(f'Testing {rules.count()} notification rules')
        self.stdout.write(f'Mode: {"DRY RUN (preview only)" if dry_run else "LIVE (sending notifications!)"}')
        self.stdout.write('=' * 80)

        results = {'success': 0, 'failed': 0, 'skipped': 0}
        errors_by_type = {}

        for rule in rules:
            self.stdout.write('')
            self.stdout.write(f'Rule: {rule.name}')
            self.stdout.write(f'  Trigger: {rule.trigger_type}')

            # Get sample record
            instance = None
            record_data = {}

            if rule.trigger_content_type:
                model_key = f"{rule.trigger_content_type.app_label}.{rule.trigger_content_type.model}"
                self.stdout.write(f'  Model: {model_key}')

                config = AutomatableModelRegistry.get_by_key(model_key)
                if config:
                    model_class = config['model']
                    instance = model_class.objects.first()

                    if instance:
                        self.stdout.write(f'  Sample: {instance.pk}')

                        # Build record data
                        for field_info in config.get('fields', []):
                            field_name = field_info['name']
                            try:
                                value = getattr(instance, field_name, None)
                                if hasattr(value, 'pk'):
                                    record_data[field_name] = str(value)
                                else:
                                    record_data[field_name] = value
                            except Exception:
                                record_data[field_name] = None
                    else:
                        error_type = 'NO_SAMPLE_RECORD'
                        errors_by_type[error_type] = errors_by_type.get(error_type, 0) + 1
                        self.stdout.write(self.style.WARNING(f'  SKIPPED: No sample record found for {model_key}'))
                        results['skipped'] += 1
                        continue
                else:
                    error_type = 'MODEL_NOT_IN_REGISTRY'
                    errors_by_type[error_type] = errors_by_type.get(error_type, 0) + 1
                    self.stdout.write(self.style.WARNING(f'  SKIPPED: Model not in registry: {model_key}'))
                    results['skipped'] += 1
                    continue
            elif rule.signal_name:
                self.stdout.write(f'  Signal: {rule.signal_name}')
                # For signal triggers, we might need a user instance
                instance = admin
                record_data = {
                    'email': admin.email,
                    'first_name': admin.first_name,
                    'last_name': admin.last_name,
                    'full_name': admin.get_full_name(),
                }
            else:
                error_type = 'NO_TRIGGER_CONFIG'
                errors_by_type[error_type] = errors_by_type.get(error_type, 0) + 1
                self.stdout.write(self.style.WARNING('  SKIPPED: No trigger model or signal configured'))
                results['skipped'] += 1
                continue

            # Show template info
            if rule.notification_template:
                self.stdout.write(f'  Template: {rule.notification_template.name}')
            else:
                action_config = rule.action_config or {}
                self.stdout.write(f'  Title: {action_config.get("title_template", "(none)")}')

            # Show recipient type
            action_config = rule.action_config or {}
            recipient_type = action_config.get('recipient_type', 'unknown')
            self.stdout.write(f'  Recipient Type: {recipient_type}')

            # Test the rule
            try:
                if dry_run:
                    # Preview mode - just show what would be sent
                    context = _build_template_context(instance, {}, record_data)

                    if rule.notification_template:
                        try:
                            rendered = rule.notification_template.render(context)
                            self.stdout.write(self.style.SUCCESS(f'  Rendered Title: {rendered.get("title", "")[:60]}'))
                            self.stdout.write(self.style.SUCCESS(f'  Rendered Body: {rendered.get("body", "")[:80]}...'))
                        except Exception as e:
                            error_type = 'TEMPLATE_RENDER_ERROR'
                            errors_by_type[error_type] = errors_by_type.get(error_type, 0) + 1
                            self.stdout.write(self.style.ERROR(f'  FAILED: Template render error: {e}'))
                            if verbose:
                                self.stdout.write(self.style.ERROR(traceback.format_exc()))
                            results['failed'] += 1
                            continue
                    else:
                        action_config = rule.action_config or {}
                        self.stdout.write(self.style.SUCCESS(f'  Would send: {action_config.get("channel", "email")} notification'))

                    results['success'] += 1
                else:
                    # Actually execute the rule
                    old_values = {}
                    new_values = record_data

                    # Create execution record
                    execution = RuleExecution.objects.create(
                        rule=rule,
                        trigger_type=rule.trigger_type,
                        trigger_content_type=rule.trigger_content_type,
                        trigger_object_id=str(instance.pk) if instance else None,
                        status=RuleExecution.Status.RUNNING,
                        is_test=True,
                        triggered_by=admin,
                    )

                    result = _execute_rule_notification(rule, instance, old_values, new_values, execution)

                    # Check for error status (only set on failure)
                    status = result.get('status')
                    external_emails = result.get('external_emails', [])

                    if status is None or status not in ('no_recipients', 'error'):
                        # Success - notifications are linked via FK
                        execution.status = RuleExecution.Status.SUCCESS
                        execution.action_result = result
                        execution.save()

                        # Fetch via relationship
                        notifications = list(execution.notifications.select_related('recipient'))

                        notif_count = len(notifications)
                        emails_sent = sum(1 for n in notifications if n.email_sent)
                        emails_sent += sum(1 for e in external_emails if e.get('email_sent'))
                        emails_failed = sum(1 for n in notifications if n.email_error)
                        emails_failed += sum(1 for e in external_emails if e.get('email_error'))

                        recipient_emails = [n.recipient.email for n in notifications if n.recipient]
                        recipient_emails += [e['email'] for e in external_emails if e.get('email')]

                        msg = f'  SUCCESS: {notif_count} notifications, {emails_sent} emails sent'
                        if emails_failed:
                            msg += f', {emails_failed} emails failed'
                        if recipient_emails:
                            msg += f' to {", ".join(recipient_emails[:3])}'
                            if len(recipient_emails) > 3:
                                msg += f' (+{len(recipient_emails) - 3} more)'

                        self.stdout.write(self.style.SUCCESS(msg))
                        results['success'] += 1

                    elif status == 'no_recipients':
                        error_type = 'NO_RECIPIENTS'
                        errors_by_type[error_type] = errors_by_type.get(error_type, 0) + 1
                        execution.status = RuleExecution.Status.FAILED
                        execution.error_message = f"No recipients found for recipient_type={recipient_type}"
                        execution.action_result = result
                        execution.save()
                        self.stdout.write(self.style.ERROR(
                            f'  FAILED [NO_RECIPIENTS]: No recipients found for recipient_type="{recipient_type}"'
                        ))
                        results['failed'] += 1

                    elif status == 'error':
                        error_msg = result.get('error', 'Unknown error')
                        error_type = self._categorize_error(error_msg)
                        errors_by_type[error_type] = errors_by_type.get(error_type, 0) + 1
                        execution.status = RuleExecution.Status.FAILED
                        execution.error_message = error_msg
                        execution.action_result = result
                        execution.save()
                        self.stdout.write(self.style.ERROR(f'  FAILED [{error_type}]: {error_msg}'))
                        results['failed'] += 1

                    else:
                        # Unknown status - try to extract any error info
                        error_msg = result.get('error') or result.get('message') or f'Unknown status: {status}'
                        error_type = self._categorize_error(str(result))
                        errors_by_type[error_type] = errors_by_type.get(error_type, 0) + 1
                        execution.status = RuleExecution.Status.FAILED
                        execution.error_message = error_msg
                        execution.action_result = result
                        execution.save()
                        self.stdout.write(self.style.ERROR(f'  FAILED [{error_type}]: {error_msg}'))
                        if verbose:
                            self.stdout.write(self.style.ERROR(f'  Full result: {result}'))
                        results['failed'] += 1

            except Exception as e:
                error_type = self._categorize_error(str(e))
                errors_by_type[error_type] = errors_by_type.get(error_type, 0) + 1
                self.stdout.write(self.style.ERROR(f'  FAILED [{error_type}]: {e}'))
                if verbose:
                    self.stdout.write(self.style.ERROR(traceback.format_exc()))
                results['failed'] += 1

        # Summary
        self.stdout.write('')
        self.stdout.write('=' * 80)
        self.stdout.write(f'Results: {results["success"]} success, {results["failed"]} failed, {results["skipped"]} skipped')

        if errors_by_type:
            self.stdout.write('')
            self.stdout.write('Errors by type:')
            for error_type, count in sorted(errors_by_type.items(), key=lambda x: -x[1]):
                self.stdout.write(f'  {error_type}: {count}')

    def _categorize_error(self, error_msg: str) -> str:
        """Categorize an error message into a type for reporting."""
        error_msg_lower = error_msg.lower()

        if 'no recipients' in error_msg_lower or 'recipient' in error_msg_lower:
            return 'NO_RECIPIENTS'
        elif 'template' in error_msg_lower or 'render' in error_msg_lower:
            return 'TEMPLATE_ERROR'
        elif 'not found' in error_msg_lower or 'does not exist' in error_msg_lower:
            return 'NOT_FOUND'
        elif 'permission' in error_msg_lower or 'access' in error_msg_lower:
            return 'PERMISSION_ERROR'
        elif 'connection' in error_msg_lower or 'timeout' in error_msg_lower:
            return 'CONNECTION_ERROR'
        elif 'email' in error_msg_lower or 'smtp' in error_msg_lower:
            return 'EMAIL_ERROR'
        elif 'attribute' in error_msg_lower or 'cannot access' in error_msg_lower:
            return 'ATTRIBUTE_ERROR'
        elif 'type' in error_msg_lower or 'invalid' in error_msg_lower:
            return 'TYPE_ERROR'
        else:
            return 'UNKNOWN_ERROR'
