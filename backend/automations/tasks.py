"""
Celery tasks for automation execution.

These tasks handle the async processing of automation events,
including webhook delivery with retry logic.
"""
import json
import time
import logging
import re
from datetime import timedelta
from typing import Any, Dict, Optional

import requests
from django.conf import settings
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType

# Try to import Celery - if not available, provide fallback
try:
    from celery import shared_task
    CELERY_AVAILABLE = True
except ImportError:
    CELERY_AVAILABLE = False

    def shared_task(*args, **kwargs):
        """Fallback decorator when Celery is not installed."""
        def decorator(func):
            return func
        return decorator


logger = logging.getLogger(__name__)


@shared_task(name="automations.process_automation_event")
def process_automation_event(
    content_type_id: int,
    object_id: str,
    event_type: str,
    old_values: Dict[str, Any],
    new_values: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Process an automation event and execute matching workflows and rules.

    Args:
        content_type_id: ID of the ContentType for the model
        object_id: Primary key of the affected object
        event_type: Type of event (model_created, model_updated, model_deleted, stage_changed)
        old_values: Previous field values
        new_values: New field values

    Returns:
        Summary of workflows and rules executed
    """
    from .models import Workflow, WorkflowExecution, AutomationRule

    logger.info(f"[AUTOMATION] Processing event: content_type_id={content_type_id}, object_id={object_id}, event_type={event_type}")

    try:
        ct = ContentType.objects.get(id=content_type_id)
    except ContentType.DoesNotExist:
        logger.error(f"ContentType {content_type_id} not found")
        return {'error': 'ContentType not found', 'workflows_executed': 0, 'rules_executed': 0}

    model_key = f"{ct.app_label}.{ct.model}"
    logger.info(f"[AUTOMATION] Model: {model_key}")
    workflows_executed = 0
    rules_executed = 0

    # ==========================================================================
    # Process Workflows (React Flow node-based)
    # ==========================================================================
    workflows = Workflow.objects.filter(is_active=True)

    for workflow in workflows:
        if _workflow_matches_event(workflow, model_key, event_type, old_values, new_values):
            # Create execution record
            execution = WorkflowExecution.objects.create(
                workflow=workflow,
                trigger_content_type=ct,
                trigger_object_id=object_id,
                trigger_type=event_type,
                trigger_data={
                    'old_values': old_values,
                    'new_values': new_values,
                },
                status=WorkflowExecution.Status.RUNNING,
            )

            try:
                # Execute the workflow
                result = _execute_workflow(workflow, ct, object_id, old_values, new_values)

                execution.status = WorkflowExecution.Status.SUCCESS
                execution.node_results = result
                execution.completed_at = timezone.now()
                execution.save()

                # Update workflow stats
                workflow.last_executed_at = timezone.now()
                workflow.total_executions += 1
                workflow.total_success += 1
                workflow.save(update_fields=['last_executed_at', 'total_executions', 'total_success'])

                workflows_executed += 1

            except Exception as e:
                logger.error(f"Workflow {workflow.name} execution failed: {e}")
                execution.status = WorkflowExecution.Status.FAILED
                execution.error_message = str(e)
                execution.completed_at = timezone.now()
                execution.save()

                workflow.total_executions += 1
                workflow.total_failed += 1
                workflow.save(update_fields=['total_executions', 'total_failed'])

    # ==========================================================================
    # Process AutomationRules (Form-based)
    # ==========================================================================
    from .models import RuleExecution
    import time

    rules = AutomationRule.objects.filter(
        is_active=True,
        trigger_content_type=ct,
        trigger_type=event_type,
    )

    logger.info(f"[AUTOMATION] Found {rules.count()} matching rules for {model_key} + {event_type}")

    for rule in rules:
        if _rule_matches_conditions(rule, old_values, new_values):
            # Create execution record
            execution = RuleExecution.objects.create(
                rule=rule,
                trigger_type=event_type,
                trigger_content_type=ct,
                trigger_object_id=object_id,
                trigger_data={
                    'old_values': old_values,
                    'new_values': new_values,
                },
                status=RuleExecution.Status.RUNNING,
                action_type=rule.action_type,
            )
            start_time = time.time()

            try:
                logger.info(f"Executing automation rule: {rule.name}")
                result = _execute_rule(rule, ct, object_id, old_values, new_values, execution)

                # Update execution record
                execution.status = RuleExecution.Status.SUCCESS
                execution.action_result = result
                execution.execution_time_ms = int((time.time() - start_time) * 1000)
                execution.completed_at = timezone.now()
                execution.save()

                # Update rule stats
                rule.last_triggered_at = timezone.now()
                rule.total_executions += 1
                rule.total_success += 1
                rule.save(update_fields=['last_triggered_at', 'total_executions', 'total_success'])

                rules_executed += 1
                logger.info(f"Rule {rule.name} executed successfully: {result}")

            except Exception as e:
                logger.error(f"Rule {rule.name} execution failed: {e}")

                # Update execution record with error
                execution.status = RuleExecution.Status.FAILED
                execution.error_message = str(e)
                execution.execution_time_ms = int((time.time() - start_time) * 1000)
                execution.completed_at = timezone.now()
                execution.save()

                rule.total_executions += 1
                rule.total_failed += 1
                rule.save(update_fields=['total_executions', 'total_failed'])

    return {
        'model': model_key,
        'event_type': event_type,
        'object_id': object_id,
        'workflows_executed': workflows_executed,
        'rules_executed': rules_executed,
    }


def _workflow_matches_event(
    workflow: 'Workflow',
    model_key: str,
    event_type: str,
    old_values: Dict[str, Any],
    new_values: Dict[str, Any]
) -> bool:
    """
    Check if a workflow's trigger matches the given event.

    Returns True if the workflow should be executed.
    """
    nodes = workflow.nodes or []

    # Find trigger nodes
    trigger_nodes = [n for n in nodes if n.get('type') == 'trigger']

    for trigger in trigger_nodes:
        node_type = trigger.get('node_type', '')
        config = trigger.get('data', {}).get('config', {})

        # Map node_type to event_type
        trigger_event_map = {
            'model_created': 'model_created',
            'model_updated': 'model_updated',
            'model_deleted': 'model_deleted',
            'stage_changed': 'stage_changed',
        }

        expected_event = trigger_event_map.get(node_type)
        if expected_event != event_type:
            continue

        # Check if model matches
        trigger_model = config.get('model')
        if trigger_model and trigger_model != model_key:
            continue

        # Check conditions
        conditions = config.get('conditions', {})
        if not _matches_conditions(conditions, old_values, new_values):
            continue

        return True

    return False


def _matches_conditions(
    conditions: Dict[str, Any],
    old_values: Dict[str, Any],
    new_values: Dict[str, Any]
) -> bool:
    """
    Check if the event matches the trigger conditions.

    Supports conditions like:
    - {"stage_to": "qualified"} - new stage equals value
    - {"stage_from": "lead"} - old stage equals value
    - {"field": "source", "equals": "inbound"} - field equals value
    - {"field": "source", "not_equals": "manual"} - field not equals value
    """
    if not conditions:
        return True

    # Stage change conditions
    if 'stage_to' in conditions:
        new_stage = new_values.get('stage') or new_values.get('stage_display')
        if str(new_stage) != str(conditions['stage_to']):
            return False

    if 'stage_from' in conditions:
        old_stage = old_values.get('stage') or old_values.get('stage_display')
        if str(old_stage) != str(conditions['stage_from']):
            return False

    # Field conditions
    if 'field' in conditions:
        field_name = conditions['field']
        field_value = new_values.get(field_name)

        if 'equals' in conditions:
            if str(field_value) != str(conditions['equals']):
                return False

        if 'not_equals' in conditions:
            if str(field_value) == str(conditions['not_equals']):
                return False

        if 'contains' in conditions:
            if conditions['contains'] not in str(field_value or ''):
                return False

    return True


def _execute_workflow(
    workflow: 'Workflow',
    content_type: ContentType,
    object_id: str,
    old_values: Dict[str, Any],
    new_values: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Execute all action nodes in a workflow.

    Returns a summary of actions executed.
    """
    model_class = content_type.model_class()

    try:
        instance = model_class.objects.get(pk=object_id)
    except model_class.DoesNotExist:
        # Object was deleted, use new_values or old_values as context
        instance = None

    nodes = workflow.nodes or []
    edges = workflow.edges or []

    # Build adjacency list from edges
    adjacency = {}
    for edge in edges:
        source = edge.get('source')
        target = edge.get('target')
        if source not in adjacency:
            adjacency[source] = []
        adjacency[source].append(target)

    # Find all action nodes
    action_nodes = [n for n in nodes if n.get('type') == 'action']

    results = []
    for action in action_nodes:
        action_type = action.get('node_type', '')
        config = action.get('data', {}).get('config', {})

        try:
            result = _execute_action(
                action_type=action_type,
                config=config,
                instance=instance,
                old_values=old_values,
                new_values=new_values,
                workflow=workflow,
                content_type=content_type,
                object_id=object_id,
            )
            results.append({
                'node_id': action.get('id'),
                'action_type': action_type,
                'status': 'success',
                'result': result,
            })
        except Exception as e:
            logger.error(f"Action {action_type} failed: {e}")
            results.append({
                'node_id': action.get('id'),
                'action_type': action_type,
                'status': 'failed',
                'error': str(e),
            })

    return {'actions': results}


def _execute_action(
    action_type: str,
    config: Dict[str, Any],
    instance: Optional[Any],
    old_values: Dict[str, Any],
    new_values: Dict[str, Any],
    workflow: 'Workflow',
    content_type: ContentType,
    object_id: str,
) -> Dict[str, Any]:
    """
    Execute a single action based on its type.
    """
    if action_type == 'send_webhook':
        return _execute_webhook_action(
            config=config,
            instance=instance,
            old_values=old_values,
            new_values=new_values,
            workflow=workflow,
            content_type=content_type,
            object_id=object_id,
        )
    elif action_type == 'send_email':
        return _execute_email_action(config, instance, old_values, new_values)
    elif action_type == 'create_activity':
        return _execute_activity_action(config, instance, old_values, new_values)
    else:
        raise ValueError(f"Unknown action type: {action_type}")


def _execute_webhook_action(
    config: Dict[str, Any],
    instance: Optional[Any],
    old_values: Dict[str, Any],
    new_values: Dict[str, Any],
    workflow: 'Workflow',
    content_type: ContentType,
    object_id: str,
) -> Dict[str, Any]:
    """
    Execute a webhook action - send HTTP request.
    """
    from .models import WebhookDelivery
    from .encryption import decrypt_value

    url = config.get('url')
    if not url:
        raise ValueError("Webhook URL is required")

    method = config.get('method', 'POST').upper()
    headers = config.get('headers', {})
    payload_template = config.get('payload_template', {})

    # Decrypt secrets if available
    secrets = {}
    if config.get('secrets_encrypted'):
        try:
            secrets = json.loads(decrypt_value(config['secrets_encrypted']))
        except Exception as e:
            logger.warning(f"Failed to decrypt secrets: {e}")

    # Render headers with secrets
    rendered_headers = {}
    for key, value in headers.items():
        rendered_headers[key] = _render_template_string(value, instance, secrets, old_values, new_values)

    # Render payload
    payload = _render_payload_template(payload_template, instance, old_values, new_values)

    # Create delivery record
    delivery = WebhookDelivery.objects.create(
        workflow=workflow,
        url=url,
        method=method,
        headers=rendered_headers,
        payload=payload,
        trigger_content_type=content_type,
        trigger_object_id=object_id,
    )

    # Send the request (can be async via Celery or sync)
    if CELERY_AVAILABLE:
        try:
            from celery import current_app
            if current_app.conf.broker_url:
                send_webhook_request.delay(str(delivery.id))
                return {'delivery_id': str(delivery.id), 'status': 'queued'}
        except Exception:
            pass

    # Sync fallback
    result = send_webhook_request(str(delivery.id))
    return result


@shared_task(name="automations.send_webhook_request", bind=True, max_retries=3)
def send_webhook_request(self, delivery_id: str) -> Dict[str, Any]:
    """
    Send a webhook request with retry logic.

    Uses exponential backoff for retries.
    """
    from .models import WebhookDelivery

    try:
        delivery = WebhookDelivery.objects.get(id=delivery_id)
    except WebhookDelivery.DoesNotExist:
        logger.error(f"WebhookDelivery {delivery_id} not found")
        return {'error': 'Delivery not found'}

    delivery.attempts += 1
    start_time = time.time()

    try:
        response = requests.request(
            method=delivery.method,
            url=delivery.url,
            headers=delivery.headers,
            json=delivery.payload,
            timeout=30,
        )

        delivery.status_code = response.status_code
        delivery.response_body = response.text[:10000]  # Limit size
        delivery.response_time_ms = int((time.time() - start_time) * 1000)

        if response.status_code < 400:
            delivery.status = WebhookDelivery.Status.SUCCESS
            delivery.completed_at = timezone.now()

            # Update workflow stats
            if delivery.workflow:
                delivery.workflow.total_success += 1
                delivery.workflow.save(update_fields=['total_success'])

            delivery.save()
            return {
                'delivery_id': str(delivery.id),
                'status': 'success',
                'status_code': response.status_code,
                'response_time_ms': delivery.response_time_ms,
            }
        else:
            raise Exception(f"HTTP {response.status_code}: {response.text[:500]}")

    except Exception as e:
        delivery.error_message = str(e)

        if delivery.attempts < delivery.max_attempts:
            delivery.status = WebhookDelivery.Status.RETRYING
            retry_delay = 60 * (2 ** delivery.attempts)  # Exponential backoff
            delivery.next_retry_at = timezone.now() + timedelta(seconds=retry_delay)
            delivery.save()

            if CELERY_AVAILABLE and hasattr(self, 'retry'):
                self.retry(countdown=retry_delay, exc=e)

            return {
                'delivery_id': str(delivery.id),
                'status': 'retrying',
                'attempts': delivery.attempts,
                'next_retry': str(delivery.next_retry_at),
            }
        else:
            delivery.status = WebhookDelivery.Status.FAILED
            delivery.completed_at = timezone.now()

            # Update workflow stats
            if delivery.workflow:
                delivery.workflow.total_failed += 1
                delivery.workflow.save(update_fields=['total_failed'])

            delivery.save()
            return {
                'delivery_id': str(delivery.id),
                'status': 'failed',
                'error': str(e),
            }


def _execute_email_action(
    config: Dict[str, Any],
    instance: Optional[Any],
    old_values: Dict[str, Any],
    new_values: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Execute an email action.

    Placeholder - integrate with existing email service.
    """
    # TODO: Integrate with email service
    logger.info(f"Email action triggered with config: {config}")
    return {'status': 'email_action_not_implemented'}


def _execute_activity_action(
    config: Dict[str, Any],
    instance: Optional[Any],
    old_values: Dict[str, Any],
    new_values: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Execute a create activity action.

    Placeholder - integrate with activity logging.
    """
    # TODO: Integrate with activity logging
    logger.info(f"Activity action triggered with config: {config}")
    return {'status': 'activity_action_not_implemented'}


def _render_payload_template(
    template: Dict[str, Any],
    instance: Optional[Any],
    old_values: Dict[str, Any],
    new_values: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Render a payload template with instance data.

    Supports {{field}} syntax for variable substitution.
    """

    def format_value(value):
        """Format a value for display in templates."""
        if value is None:
            return ''
        if isinstance(value, str):
            return value

        # Handle QuerySets and managers
        if hasattr(value, 'all'):
            items = list(value.all())
            if not items:
                return ''
            # Extract display values from each item
            names = []
            for item in items:
                if hasattr(item, 'name'):
                    names.append(item.name)
                elif hasattr(item, 'title'):
                    names.append(item.title)
                else:
                    names.append(str(item))
            return ', '.join(names)

        # Handle lists
        if isinstance(value, list):
            if not value:
                return ''
            # Check if it's a list of dicts (serialized data)
            if value and isinstance(value[0], dict):
                names = []
                for item in value:
                    if 'name' in item:
                        names.append(item['name'])
                    elif 'title' in item:
                        names.append(item['title'])
                    else:
                        names.append(str(item))
                return ', '.join(names)
            return ', '.join(str(v) for v in value)

        # Handle model instances - use name/title if available
        if hasattr(value, 'name'):
            return value.name
        if hasattr(value, 'title'):
            return value.title

        return str(value)

    def replace_var(match):
        var_path = match.group(1)

        # First try to get from instance
        if instance:
            value = instance
            for part in var_path.split('.'):
                value = getattr(value, part, None)
                if value is None:
                    break
            if value is not None:
                return format_value(value)

        # Fallback to new_values
        if var_path in new_values:
            return format_value(new_values[var_path])

        # Fallback to old_values
        if var_path in old_values:
            return format_value(old_values[var_path])

        return ''

    def process(obj):
        if isinstance(obj, str):
            return re.sub(r'\{\{(\w+(?:\.\w+)*)\}\}', replace_var, obj)
        elif isinstance(obj, dict):
            return {k: process(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [process(i) for i in obj]
        return obj

    return process(template)


def _render_template_string(
    template: str,
    instance: Optional[Any],
    secrets: Dict[str, str],
    old_values: Dict[str, Any],
    new_values: Dict[str, Any],
) -> str:
    """
    Render a template string with instance data and secrets.

    Supports:
    - {{field}} for instance fields
    - {{secrets.key}} for secret values
    """

    def replace_var(match):
        var_path = match.group(1)

        # Check for secrets prefix
        if var_path.startswith('secrets.'):
            secret_key = var_path[8:]  # Remove 'secrets.' prefix
            return secrets.get(secret_key, '')

        # Try to get from instance
        if instance:
            value = instance
            for part in var_path.split('.'):
                value = getattr(value, part, None)
                if value is None:
                    break
            if value is not None:
                return str(value) if not isinstance(value, str) else value

        # Fallback to new_values
        if var_path in new_values:
            return str(new_values[var_path]) if new_values[var_path] else ''

        return ''

    return re.sub(r'\{\{(\w+(?:\.\w+)*)\}\}', replace_var, template)


# ==============================================================================
# AutomationRule Processing (Form-based rules)
# ==============================================================================

def _compare_values(actual: Any, expected: Any, operator: str) -> bool:
    """
    Compare two values using the specified operator.
    Handles both numeric and date comparisons.

    Args:
        actual: The actual value from the record
        expected: The expected value from the condition
        operator: One of '>', '>=', '<', '<='

    Returns:
        True if comparison matches, False otherwise
    """
    from datetime import date, datetime
    from decimal import Decimal

    if actual is None:
        return False

    # Try date/datetime comparison first
    try:
        # If actual is already a date/datetime
        if isinstance(actual, (date, datetime)):
            actual_dt = actual
        else:
            # Try parsing as ISO date/datetime string
            actual_str = str(actual)
            if 'T' in actual_str or ' ' in actual_str:
                # Datetime format
                actual_dt = datetime.fromisoformat(actual_str.replace('Z', '+00:00'))
            else:
                # Date format
                actual_dt = date.fromisoformat(actual_str)

        # Parse expected value
        expected_str = str(expected)
        if isinstance(expected, (date, datetime)):
            expected_dt = expected
        elif 'T' in expected_str or ' ' in expected_str:
            expected_dt = datetime.fromisoformat(expected_str.replace('Z', '+00:00'))
        else:
            expected_dt = date.fromisoformat(expected_str)

        # Normalize to same type for comparison
        if isinstance(actual_dt, datetime) and isinstance(expected_dt, date) and not isinstance(expected_dt, datetime):
            expected_dt = datetime.combine(expected_dt, datetime.min.time())
        elif isinstance(expected_dt, datetime) and isinstance(actual_dt, date) and not isinstance(actual_dt, datetime):
            actual_dt = datetime.combine(actual_dt, datetime.min.time())

        if operator == '>':
            return actual_dt > expected_dt
        elif operator == '>=':
            return actual_dt >= expected_dt
        elif operator == '<':
            return actual_dt < expected_dt
        elif operator == '<=':
            return actual_dt <= expected_dt
    except (ValueError, TypeError):
        pass  # Not a valid date, try numeric comparison

    # Try numeric comparison
    try:
        actual_num = Decimal(str(actual))
        expected_num = Decimal(str(expected))

        if operator == '>':
            return actual_num > expected_num
        elif operator == '>=':
            return actual_num >= expected_num
        elif operator == '<':
            return actual_num < expected_num
        elif operator == '<=':
            return actual_num <= expected_num
    except (ValueError, TypeError, Exception):
        pass  # Not a valid number

    # Fallback: string comparison (alphabetical)
    actual_str = str(actual) if actual is not None else ''
    expected_str = str(expected) if expected is not None else ''

    if operator == '>':
        return actual_str > expected_str
    elif operator == '>=':
        return actual_str >= expected_str
    elif operator == '<':
        return actual_str < expected_str
    elif operator == '<=':
        return actual_str <= expected_str

    return False


def _rule_matches_conditions(
    rule: 'AutomationRule',
    old_values: Dict[str, Any],
    new_values: Dict[str, Any]
) -> bool:
    """
    Check if an AutomationRule's conditions match the event data.

    Condition format (stored as list):
    [
        {"field": "status", "operator": "equals", "value": "active"},
        {"field": "source", "operator": "not_equals", "value": "manual"},
    ]
    """
    conditions = rule.trigger_conditions or []

    logger.info(f"[AUTOMATION] Checking conditions for rule '{rule.name}'")
    logger.info(f"[AUTOMATION] Conditions: {conditions}")
    logger.info(f"[AUTOMATION] old_values: {old_values}")
    logger.info(f"[AUTOMATION] new_values: {new_values}")

    # If no conditions, rule always matches
    if not conditions:
        logger.info(f"[AUTOMATION] No conditions - rule matches")
        return True

    # All conditions must match (AND logic)
    for condition in conditions:
        field = condition.get('field')
        operator = condition.get('operator', 'equals')
        expected = condition.get('value')

        if not field:
            continue

        # Get the current value (from new_values or instance)
        actual = new_values.get(field)

        # For stage_changed/status_changed events, handle special fields
        if field in ('stage', 'stage_to', 'status', 'status_to'):
            actual = new_values.get('status') or new_values.get('stage') or new_values.get('status_display') or new_values.get('stage_display')
        elif field in ('stage_from', 'status_from'):
            actual = old_values.get('status') or old_values.get('stage') or old_values.get('status_display') or old_values.get('stage_display')

        logger.info(f"[AUTOMATION] Condition: {field} {operator} '{expected}' | actual='{actual}'")

        # Convert to string for comparison
        actual_str = str(actual) if actual is not None else ''
        expected_str = str(expected) if expected is not None else ''

        # Apply operator
        matched = True
        if operator == 'equals':
            matched = actual_str.lower() == expected_str.lower()
        elif operator == 'not_equals':
            matched = actual_str.lower() != expected_str.lower()
        elif operator == 'contains':
            matched = expected_str.lower() in actual_str.lower()
        elif operator == 'not_contains':
            matched = expected_str.lower() not in actual_str.lower()
        elif operator == 'is_empty':
            matched = not actual_str
        elif operator == 'is_not_empty':
            matched = bool(actual_str)
        elif operator in ('in', 'is_one_of'):
            # Check if actual value is in the list of expected values
            if isinstance(expected, list):
                matched = actual_str.lower() in [str(v).lower() for v in expected]
            else:
                matched = actual_str.lower() == expected_str.lower()
        elif operator in ('not_in', 'is_not_one_of'):
            # Check if actual value is NOT in the list of expected values
            if isinstance(expected, list):
                matched = actual_str.lower() not in [str(v).lower() for v in expected]
            else:
                matched = actual_str.lower() != expected_str.lower()
        elif operator in ('gt', 'greater_than'):
            matched = _compare_values(actual, expected, '>')
        elif operator in ('gte', 'greater_than_or_equal'):
            matched = _compare_values(actual, expected, '>=')
        elif operator in ('lt', 'less_than'):
            matched = _compare_values(actual, expected, '<')
        elif operator in ('lte', 'less_than_or_equal'):
            matched = _compare_values(actual, expected, '<=')

        logger.info(f"[AUTOMATION] Condition result: '{actual_str}' {operator} '{expected_str}' = {matched}")

        if not matched:
            logger.info(f"[AUTOMATION] Condition NOT matched - rule will not execute")
            return False

    logger.info(f"[AUTOMATION] All conditions matched - rule will execute")
    return True


def _execute_rule(
    rule: 'AutomationRule',
    content_type: ContentType,
    object_id: str,
    old_values: Dict[str, Any],
    new_values: Dict[str, Any],
    execution: 'RuleExecution' = None,
) -> Dict[str, Any]:
    """
    Execute an AutomationRule's action.

    Supports action types:
    - send_webhook: Send HTTP request to external URL
    - send_notification: Send email/in-app notification
    - update_field: Update a field on the record or related record
    - create_activity: Log an activity entry
    """
    model_class = content_type.model_class()

    try:
        instance = model_class.objects.get(pk=object_id)
    except model_class.DoesNotExist:
        instance = None
        logger.warning(f"Object {object_id} not found, using event values only")

    action_type = rule.action_type
    config = rule.action_config or {}

    if action_type == 'send_webhook':
        return _execute_rule_webhook(rule, instance, old_values, new_values, content_type, object_id)
    elif action_type == 'send_notification':
        return _execute_rule_notification(rule, instance, old_values, new_values, execution)
    elif action_type == 'update_field':
        return _execute_rule_update_field(rule, instance, old_values, new_values)
    elif action_type == 'create_activity':
        return _execute_rule_activity(rule, instance, old_values, new_values)
    else:
        raise ValueError(f"Unknown action type: {action_type}")


def _execute_rule_webhook(
    rule: 'AutomationRule',
    instance: Optional[Any],
    old_values: Dict[str, Any],
    new_values: Dict[str, Any],
    content_type: ContentType,
    object_id: str,
) -> Dict[str, Any]:
    """Execute a webhook action for an AutomationRule."""
    from .models import WebhookDelivery
    from .encryption import decrypt_value

    config = rule.action_config or {}
    url = config.get('url')

    if not url:
        raise ValueError("Webhook URL is required")

    method = config.get('method', 'POST').upper()
    headers = config.get('headers', {})
    payload_template = config.get('payload_template', {})

    # Decrypt secrets if available
    secrets = {}
    if rule.secrets_encrypted:
        try:
            secrets = json.loads(decrypt_value(rule.secrets_encrypted))
        except Exception as e:
            logger.warning(f"Failed to decrypt secrets: {e}")

    # Render headers with secrets
    rendered_headers = {}
    for key, value in headers.items():
        rendered_headers[key] = _render_template_string(value, instance, secrets, old_values, new_values)

    # Render payload
    payload = _render_payload_template(payload_template, instance, old_values, new_values)

    # Create delivery record
    delivery = WebhookDelivery.objects.create(
        automation_rule=rule,
        url=url,
        method=method,
        headers=rendered_headers,
        payload=payload,
        trigger_content_type=content_type,
        trigger_object_id=object_id,
    )

    # Send the request (can be async via Celery or sync)
    if CELERY_AVAILABLE:
        try:
            from celery import current_app
            if current_app.conf.broker_url:
                send_webhook_request.delay(str(delivery.id))
                return {'delivery_id': str(delivery.id), 'status': 'queued'}
        except Exception:
            pass

    # Sync fallback
    result = send_webhook_request(str(delivery.id))
    return result


def _execute_rule_notification(
    rule: 'AutomationRule',
    instance: Optional[Any],
    old_values: Dict[str, Any],
    new_values: Dict[str, Any],
    execution: 'RuleExecution' = None,
) -> Dict[str, Any]:
    """
    Execute a notification action for an AutomationRule.

    Uses shared utilities and NotificationService infrastructure for:
    - Template rendering with {variable} or {{variable}} syntax
    - Recipient resolution
    - Email sending with branding
    - In-app notifications

    Supports two modes:
    1. Template mode: If rule.notification_template is set, use NotificationTemplate
    2. Inline mode: Use action_config templates

    Config format (inline mode):
    {
        "channel": "email" | "in_app" | "both",
        "recipient_type": "assigned_user" | "record_owner" | "company_admin" | etc.,
        "recipient_ids": [1, 2, 3],  # if specific_users
        "title_template": "New lead: {name}",
        "body_template": "A new lead {name} from {source} was created.",
        "action_url": "/dashboard/leads/{id}",  # optional
    }
    """
    from core.utils import TemplateRenderer, ContextBuilder, RecipientResolver
    from notifications.services.notification_service import NotificationService

    config = rule.action_config or {}

    # Build context for template rendering (shared utility)
    template_context = ContextBuilder.build(instance, extra_context=new_values)

    # Render action URL
    action_url_template = config.get('action_url', '')
    action_url = TemplateRenderer.render(action_url_template, template_context) if action_url_template else ''

    # Determine if using template mode or inline mode
    if rule.notification_template:
        # =========================================================================
        # Template Mode - Use NotificationTemplate
        # =========================================================================
        template = rule.notification_template

        try:
            rendered = template.render(template_context)
            title = rendered['title']
            body = rendered['body']
        except KeyError as e:
            logger.warning(f"Missing template variable {e} for rule {rule.name}")
            title = template.title_template
            body = template.body_template

        # Allow config overrides for channel/recipient, otherwise use template defaults
        channel = config.get('channel') or template.default_channel
        recipient_type = config.get('recipient_type') or template.recipient_type
    else:
        # =========================================================================
        # Inline Mode - Use action_config templates
        # =========================================================================
        channel = config.get('channel', 'both')
        recipient_type = config.get('recipient_type', 'assigned_user')
        title_template = config.get('title_template', '')
        body_template = config.get('body_template', '')

        # Render templates using shared TemplateRenderer (supports both {var} and {{var}})
        title = TemplateRenderer.render(title_template, template_context) if title_template else ''
        body = TemplateRenderer.render(body_template, template_context) if body_template else ''

    # Resolve recipients using shared RecipientResolver
    extra_context = {'user_ids': config.get('recipient_ids', [])} if recipient_type == 'specific_users' else {}
    recipients = RecipientResolver.resolve(
        recipient_type=recipient_type,
        instance=instance,
        extra_context=extra_context,
    )

    if not recipients:
        logger.warning(f"No recipients found for notification rule {rule.name} (recipient_type={recipient_type})")
        return {
            'status': 'no_recipients',
            'channel': channel,
            'recipient_type': recipient_type,
        }

    # Send notification using NotificationService
    result = NotificationService.send_automation_notification(
        recipients=recipients,
        title=title,
        body=body,
        channel=channel,
        action_url=action_url,
        instance=instance,
        automation_rule=rule,
        rule_execution=execution,
    )

    return result


def _build_template_context(
    instance: Optional[Any],
    old_values: Dict[str, Any],
    new_values: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Build a context dictionary for NotificationTemplate rendering.
    Uses the same variable names as the notification system for consistency.
    Template syntax: {variable_name}
    """
    context = {}

    if not instance:
        return context

    model_name = instance.__class__.__name__

    # ==========================================================================
    # Model-specific context (matching NotificationService patterns)
    # ==========================================================================

    if model_name == 'Job':
        # Match notify_job_published context
        context['job_title'] = instance.title
        context['title'] = instance.title
        if hasattr(instance, 'company') and instance.company:
            context['company_name'] = instance.company.name
            context['company'] = str(instance.company)
        context['job'] = instance
        context['status'] = getattr(instance, 'status', '')
        context['location'] = getattr(instance, 'location', '')
        context['employment_type'] = getattr(instance, 'employment_type', '')

    elif model_name == 'Application':
        # Match application notification context
        context['application'] = instance
        if hasattr(instance, 'job') and instance.job:
            context['job_title'] = instance.job.title
            context['job'] = instance.job
            if hasattr(instance.job, 'company') and instance.job.company:
                context['company_name'] = instance.job.company.name
        if hasattr(instance, 'candidate') and instance.candidate:
            context['candidate_name'] = instance.candidate.full_name if hasattr(instance.candidate, 'full_name') else str(instance.candidate)
            if hasattr(instance.candidate, 'user') and instance.candidate.user:
                context['candidate_email'] = instance.candidate.user.email
        context['status'] = getattr(instance, 'status', '')

    elif model_name == 'Lead':
        # Lead-specific context
        from branding.models import BrandingSettings
        branding = BrandingSettings.get_settings()

        context['brand_name'] = branding.company_name
        context['lead'] = instance
        context['lead_name'] = getattr(instance, 'name', '') or str(instance)
        context['name'] = context['lead_name']
        context['lead_email'] = getattr(instance, 'email', '')
        context['email'] = context['lead_email']
        context['phone'] = getattr(instance, 'phone', '')
        context['lead_source'] = getattr(instance, 'get_source_display', lambda: getattr(instance, 'source', ''))()
        context['source'] = context['lead_source']
        context['job_title'] = getattr(instance, 'job_title', '')
        context['lead_company_name'] = getattr(instance, 'company_name', '')
        context['company_website'] = getattr(instance, 'company_website', '')
        context['notes'] = getattr(instance, 'notes', '')
        context['subject'] = getattr(instance, 'subject', '')

        # Stage info
        onboarding_stage = getattr(instance, 'onboarding_stage', None)
        if onboarding_stage:
            context['lead_stage'] = onboarding_stage.name
            context['stage'] = onboarding_stage.name
        else:
            context['lead_stage'] = ''
            context['stage'] = ''

        # Assigned users
        if hasattr(instance, 'assigned_to'):
            if hasattr(instance.assigned_to, 'all'):
                # ManyToMany
                assigned = list(instance.assigned_to.all())
                context['assigned_to'] = ', '.join(u.get_full_name() or u.email for u in assigned) if assigned else ''
            else:
                context['assigned_to'] = str(instance.assigned_to)

        # Conversion info
        context['is_converted'] = instance.is_converted if hasattr(instance, 'is_converted') else False
        if hasattr(instance, 'converted_to_company') and instance.converted_to_company:
            context['converted_company_name'] = instance.converted_to_company.name

    elif model_name == 'Company':
        from branding.models import BrandingSettings
        branding = BrandingSettings.get_settings()

        context['brand_name'] = branding.company_name
        context['company'] = instance
        context['company_name'] = instance.name
        context['name'] = instance.name
        context['company_slug'] = getattr(instance, 'slug', '')
        context['company_tagline'] = getattr(instance, 'tagline', '')

        # Industry
        industry = getattr(instance, 'industry', None)
        if industry:
            context['company_industry'] = industry.name
        else:
            context['company_industry'] = ''

        # Size
        context['company_size'] = getattr(instance, 'get_company_size_display', lambda: getattr(instance, 'company_size', ''))()

        # Location
        context['headquarters_location'] = instance.headquarters_location if hasattr(instance, 'headquarters_location') else ''

        # Onboarding stage
        onboarding_stage = getattr(instance, 'onboarding_stage', None)
        if onboarding_stage:
            context['company_stage'] = onboarding_stage.name
            context['stage'] = onboarding_stage.name
        else:
            context['company_stage'] = ''
            context['stage'] = ''

        # Assigned users
        if hasattr(instance, 'assigned_to'):
            if hasattr(instance.assigned_to, 'all'):
                assigned = list(instance.assigned_to.all())
                context['assigned_to'] = ', '.join(u.get_full_name() or u.email for u in assigned) if assigned else ''
            else:
                context['assigned_to'] = str(instance.assigned_to)

    elif model_name == 'Invoice':
        # Invoice-specific context
        from branding.models import BrandingSettings
        branding = BrandingSettings.get_settings()

        context['brand_name'] = branding.company_name
        context['invoice'] = instance
        context['invoice_number'] = getattr(instance, 'invoice_number', '')
        context['invoice_type'] = getattr(instance, 'get_invoice_type_display', lambda: getattr(instance, 'invoice_type', ''))()
        context['status'] = getattr(instance, 'get_status_display', lambda: getattr(instance, 'status', ''))()

        # Amounts
        subtotal = getattr(instance, 'subtotal', 0)
        vat_amount = getattr(instance, 'vat_amount', 0)
        total_amount = getattr(instance, 'total_amount', 0)
        amount_paid = getattr(instance, 'amount_paid', 0)
        balance_due = getattr(instance, 'balance_due', 0) if hasattr(instance, 'balance_due') else total_amount - amount_paid

        context['subtotal'] = f"R{subtotal:,.2f}" if subtotal else 'R0.00'
        context['vat_amount'] = f"R{vat_amount:,.2f}" if vat_amount else 'R0.00'
        context['total_amount'] = f"R{total_amount:,.2f}" if total_amount else 'R0.00'
        context['amount_paid'] = f"R{amount_paid:,.2f}" if amount_paid else 'R0.00'
        context['balance_due'] = f"R{balance_due:,.2f}" if balance_due else 'R0.00'

        # Dates
        invoice_date = getattr(instance, 'invoice_date', None)
        due_date = getattr(instance, 'due_date', None)
        paid_at = getattr(instance, 'paid_at', None)

        context['invoice_date'] = invoice_date.strftime('%B %d, %Y') if invoice_date else ''
        context['due_date'] = due_date.strftime('%B %d, %Y') if due_date else ''
        context['payment_date'] = paid_at.strftime('%B %d, %Y') if paid_at else ''

        # Calculate days overdue
        if due_date and instance.status in ['sent', 'overdue', 'partially_paid']:
            from datetime import date
            today = date.today()
            if today > due_date:
                context['days_overdue'] = (today - due_date).days
            else:
                context['days_overdue'] = 0
        else:
            context['days_overdue'] = 0

        context['invoice_description'] = getattr(instance, 'description', '')

        # Company info
        company = getattr(instance, 'company', None)
        if company:
            context['company_name'] = company.name
            context['billing_contact_name'] = getattr(company, 'billing_contact_name', '')
            context['billing_contact_email'] = getattr(company, 'billing_contact_email', '')

    elif model_name == 'Subscription':
        # Subscription-specific context
        from branding.models import BrandingSettings
        branding = BrandingSettings.get_settings()

        context['brand_name'] = branding.company_name
        context['subscription'] = instance
        context['service_type'] = getattr(instance, 'get_service_type_display', lambda: getattr(instance, 'service_type', ''))()
        context['status'] = getattr(instance, 'get_status_display', lambda: getattr(instance, 'status', ''))()

        # Dates
        contract_start = getattr(instance, 'contract_start_date', None)
        contract_end = getattr(instance, 'contract_end_date', None)
        paused_at = getattr(instance, 'paused_at', None)
        terminated_at = getattr(instance, 'terminated_at', None)
        termination_effective_date = getattr(instance, 'termination_effective_date', None)

        context['contract_start'] = contract_start.strftime('%B %d, %Y') if contract_start else ''
        context['contract_end'] = contract_end.strftime('%B %d, %Y') if contract_end else ''
        context['paused_date'] = paused_at.strftime('%B %d, %Y') if paused_at else ''

        # Termination date - use effective date if set, otherwise terminated_at
        if termination_effective_date:
            context['termination_date'] = termination_effective_date.strftime('%B %d, %Y')
        elif terminated_at:
            context['termination_date'] = terminated_at.strftime('%B %d, %Y')
        else:
            context['termination_date'] = ''

        # Days remaining
        days_remaining = getattr(instance, 'days_until_renewal', None)
        context['days_remaining'] = days_remaining if days_remaining is not None else 0

        # Company info
        company = getattr(instance, 'company', None)
        if company:
            context['company_name'] = company.name

    elif model_name == 'Candidate':
        context['candidate'] = instance
        context['candidate_name'] = instance.full_name if hasattr(instance, 'full_name') else str(instance)
        context['name'] = context['candidate_name']
        if hasattr(instance, 'user') and instance.user:
            context['candidate_email'] = instance.user.email
            context['email'] = instance.user.email

    elif model_name in ('ClientInvitation', 'RecruiterInvitation', 'CandidateInvitation', 'CompanyInvitation'):
        # Invitation-specific context
        from branding.models import BrandingSettings
        branding = BrandingSettings.get_settings()

        context['email'] = getattr(instance, 'email', '')
        context['token'] = str(getattr(instance, 'token', ''))
        context['brand_name'] = branding.company_name

        # Generate signup URL based on invitation type
        site_url = getattr(settings, 'SITE_URL', 'http://localhost:5173')
        token = context['token']

        if model_name == 'ClientInvitation':
            context['signup_url'] = f"{site_url}/signup/client/{token}"
            context['invitation_type'] = 'Client'
        elif model_name == 'RecruiterInvitation':
            context['signup_url'] = f"{site_url}/signup/recruiter/{token}"
            context['invitation_type'] = 'Team Member'
        elif model_name == 'CandidateInvitation':
            context['signup_url'] = f"{site_url}/signup/candidate/{token}"
            context['invitation_type'] = 'Candidate'
            context['name'] = getattr(instance, 'name', '')
            # Add booking context if this invitation has a booking
            booking = getattr(instance, 'booking', None)
            if booking:
                context['has_booking'] = True
                context['booking_title'] = getattr(booking, 'title', '') or ''
                scheduled_at = getattr(booking, 'scheduled_at', None)
                if scheduled_at:
                    context['scheduled_date'] = scheduled_at.strftime('%B %d, %Y')
                    context['scheduled_time'] = scheduled_at.strftime('%I:%M %p')
                    context['scheduled_datetime'] = scheduled_at.strftime('%B %d, %Y at %I:%M %p')
                duration = getattr(booking, 'duration_minutes', None)
                if duration:
                    context['duration'] = f"{duration} minutes"
                meeting_type = getattr(booking, 'meeting_type', None)
                if meeting_type:
                    context['meeting_type'] = meeting_type.name
                organizer = getattr(booking, 'organizer', None)
                if organizer:
                    context['organizer_name'] = organizer.get_full_name() or organizer.email
        elif model_name == 'CompanyInvitation':
            company = getattr(instance, 'company', None)
            if company:
                context['company_name'] = company.name
                context['signup_url'] = f"{site_url}/signup/company/{token}"
            else:
                context['signup_url'] = f"{site_url}/signup/{token}"
            context['invitation_type'] = 'Company Member'
            context['role'] = getattr(instance, 'role', '')

        # Inviter information
        created_by = getattr(instance, 'created_by', None) or getattr(instance, 'invited_by', None)
        if created_by:
            context['inviter_name'] = created_by.get_full_name() or created_by.email
            context['inviter_email'] = created_by.email

    elif model_name == 'User':
        # User-specific context (for welcome emails, etc.)
        from branding.models import BrandingSettings
        branding = BrandingSettings.get_settings()

        context['brand_name'] = branding.company_name
        context['email'] = getattr(instance, 'email', '')
        context['first_name'] = getattr(instance, 'first_name', '')
        context['last_name'] = getattr(instance, 'last_name', '')
        context['full_name'] = instance.get_full_name() if hasattr(instance, 'get_full_name') else ''
        context['role'] = getattr(instance, 'role', '')

        # Generate login URL
        site_url = getattr(settings, 'SITE_URL', 'http://localhost:5173')
        context['login_url'] = f"{site_url}/login"
        context['dashboard_url'] = f"{site_url}/dashboard"

    elif model_name == 'Booking':
        # Booking-specific context
        from branding.models import BrandingSettings
        branding = BrandingSettings.get_settings()

        context['brand_name'] = branding.company_name
        context['attendee_name'] = getattr(instance, 'attendee_name', '') or ''
        context['attendee_email'] = getattr(instance, 'attendee_email', '') or ''
        context['title'] = getattr(instance, 'title', '') or ''
        context['description'] = getattr(instance, 'description', '') or ''

        # Format scheduled time
        scheduled_at = getattr(instance, 'scheduled_at', None)
        if scheduled_at:
            context['scheduled_date'] = scheduled_at.strftime('%B %d, %Y')
            context['scheduled_time'] = scheduled_at.strftime('%I:%M %p')
            context['scheduled_datetime'] = scheduled_at.strftime('%B %d, %Y at %I:%M %p')

        duration = getattr(instance, 'duration_minutes', None)
        if duration:
            context['duration'] = f"{duration} minutes"

        # Organizer info
        organizer = getattr(instance, 'organizer', None)
        if organizer:
            context['organizer_name'] = organizer.get_full_name() or organizer.email
            context['organizer_email'] = organizer.email

        # Meeting type info
        meeting_type = getattr(instance, 'meeting_type', None)
        if meeting_type:
            context['meeting_type'] = meeting_type.name
            context['meeting_location'] = getattr(meeting_type, 'location', '') or ''

        # Generate booking URL
        site_url = getattr(settings, 'SITE_URL', 'http://localhost:5173')
        context['booking_url'] = f"{site_url}/bookings/{instance.pk}"

    else:
        # Generic fallback for other models
        context['name'] = str(instance)

    # ==========================================================================
    # Add all instance fields generically (as fallback/extras)
    # ==========================================================================
    model_prefix = model_name.lower()
    for field in instance._meta.get_fields():
        if hasattr(field, 'name') and not field.is_relation:
            value = getattr(instance, field.name, None)
            if value is not None:
                str_value = str(value)
                # Add with field name if not already set
                if field.name not in context:
                    context[field.name] = str_value
                # Also add with model prefix (e.g., job_title, lead_email)
                context[f'{model_prefix}_{field.name}'] = str_value

    # Add primary key
    context['id'] = str(instance.pk) if instance.pk else ''
    context[f'{model_prefix}_id'] = context['id']

    # Add related objects generically
    for field in instance._meta.get_fields():
        if hasattr(field, 'name') and field.is_relation and not field.one_to_many and not field.many_to_many:
            related_obj = getattr(instance, field.name, None)
            if related_obj:
                key = f'{field.name}_name'
                if key not in context:
                    context[key] = str(related_obj)
                if hasattr(related_obj, 'id'):
                    context[f'{field.name}_id'] = str(related_obj.id)

    # ==========================================================================
    # Add old and new values for changed fields
    # ==========================================================================
    for key, value in old_values.items():
        context[f'old_{key}'] = str(value) if value is not None else ''

    for key, value in new_values.items():
        context[f'new_{key}'] = str(value) if value is not None else ''

    return context


def _execute_rule_update_field(
    rule: 'AutomationRule',
    instance: Optional[Any],
    old_values: Dict[str, Any],
    new_values: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Execute an update_field action for an AutomationRule.

    Config format:
    {
        "target": "same" | "related",
        "related_model": "companies.company",  # if target is related
        "relation_field": "company",  # field on instance that points to related
        "field": "status",
        "value": "qualified",
        "value_type": "static" | "field" | "template",
        "source_field": "some_field",  # if value_type is field
    }
    """
    if not instance:
        return {'status': 'skipped', 'reason': 'no_instance'}

    config = rule.action_config or {}
    target = config.get('target', 'same')
    field = config.get('field')
    value = config.get('value')
    value_type = config.get('value_type', 'static')

    if not field:
        raise ValueError("Field name is required for update_field action")

    # Determine the actual value to set
    if value_type == 'field':
        source_field = config.get('source_field', value)
        actual_value = getattr(instance, source_field, None) or new_values.get(source_field)
    elif value_type == 'template':
        actual_value = _render_payload_template(value, instance, old_values, new_values) if isinstance(value, str) else value
    else:
        actual_value = value

    # Determine target object
    if target == 'related':
        relation_field = config.get('relation_field')
        if not relation_field:
            raise ValueError("relation_field is required for related target")

        target_obj = getattr(instance, relation_field, None)
        if not target_obj:
            return {'status': 'skipped', 'reason': 'related_object_not_found'}
    else:
        target_obj = instance

    # Handle foreign key fields
    field_meta = target_obj._meta.get_field(field) if hasattr(target_obj._meta, 'get_field') else None
    if field_meta and field_meta.is_relation:
        # It's a foreign key - need to get the related object
        related_model = field_meta.related_model
        try:
            if actual_value:
                actual_value = related_model.objects.get(pk=actual_value)
            else:
                actual_value = None
        except related_model.DoesNotExist:
            logger.warning(f"Related object {related_model} with pk {actual_value} not found")
            return {'status': 'failed', 'reason': 'related_value_not_found'}

    # Update the field
    old_value = getattr(target_obj, field, None)
    setattr(target_obj, field, actual_value)
    target_obj.save(update_fields=[field])

    return {
        'status': 'updated',
        'target': target,
        'field': field,
        'old_value': str(old_value) if old_value else None,
        'new_value': str(actual_value) if actual_value else None,
    }


def _execute_rule_activity(
    rule: 'AutomationRule',
    instance: Optional[Any],
    old_values: Dict[str, Any],
    new_values: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Execute a create_activity action for an AutomationRule.

    Config format:
    {
        "activity_type": "note" | "system" | "automation",
        "content_template": "Lead {{name}} was created from {{source}}",
    }
    """
    config = rule.action_config or {}
    activity_type = config.get('activity_type', 'automation')
    content_template = config.get('content_template', '')

    # Render content
    content = _render_payload_template(content_template, instance, old_values, new_values) if isinstance(content_template, str) else str(content_template)

    # Try to create activity using common Activity model patterns
    try:
        from activities.models import Activity
        from django.contrib.contenttypes.models import ContentType

        activity = Activity.objects.create(
            activity_type=activity_type,
            content=content,
            content_type=ContentType.objects.get_for_model(instance.__class__) if instance else None,
            object_id=str(instance.pk) if instance else None,
        )

        return {
            'status': 'created',
            'activity_id': str(activity.id),
            'activity_type': activity_type,
        }
    except ImportError:
        logger.warning("Activity model not available")
        return {'status': 'skipped', 'reason': 'activity_model_not_configured'}
    except Exception as e:
        logger.error(f"Failed to create activity: {e}")
        return {'status': 'failed', 'error': str(e)}


# ==========================================================================
# Scheduled Trigger Processing
# ==========================================================================

@shared_task(name="automations.process_scheduled_triggers")
def process_scheduled_triggers() -> Dict[str, Any]:
    """
    Process scheduled automation rules.

    This task runs periodically (e.g., every 5 minutes via Celery Beat) and checks
    for records that match scheduled trigger conditions.

    Example schedule_config:
    {
        "datetime_field": "scheduled_at",  # Field on the model containing the target datetime
        "offset_hours": -24,               # Negative = before, positive = after the datetime
        "offset_type": "before",           # "before" or "after" (for display)
        "conditions": [                    # Optional additional conditions
            {"field": "status", "operator": "equals", "value": "scheduled"}
        ]
    }

    Returns:
        Summary of rules processed and executions triggered
    """
    from .models import AutomationRule, ScheduledTriggerExecution, RuleExecution

    logger.info("[SCHEDULED] Starting scheduled trigger processing")

    results = {
        'rules_checked': 0,
        'records_checked': 0,
        'executions_triggered': 0,
        'errors': [],
    }

    # Get all active scheduled rules
    scheduled_rules = AutomationRule.objects.filter(
        is_active=True,
        trigger_type='scheduled',
        schedule_config__isnull=False,
    ).select_related('trigger_content_type')

    results['rules_checked'] = scheduled_rules.count()
    logger.info(f"[SCHEDULED] Found {results['rules_checked']} active scheduled rules")

    now = timezone.now()

    for rule in scheduled_rules:
        try:
            executions = _process_scheduled_rule(rule, now)
            results['executions_triggered'] += executions
        except Exception as e:
            logger.error(f"[SCHEDULED] Error processing rule {rule.name}: {e}")
            results['errors'].append({
                'rule_id': str(rule.id),
                'rule_name': rule.name,
                'error': str(e),
            })

    logger.info(f"[SCHEDULED] Completed: {results['executions_triggered']} executions triggered")
    return results


def _process_scheduled_rule(rule: 'AutomationRule', now) -> int:
    """
    Process a single scheduled automation rule.

    Args:
        rule: The AutomationRule to process
        now: Current datetime

    Returns:
        Number of executions triggered
    """
    from .models import ScheduledTriggerExecution, RuleExecution

    config = rule.schedule_config or {}
    datetime_field = config.get('datetime_field')
    offset_hours = config.get('offset_hours', -24)

    if not datetime_field:
        logger.warning(f"[SCHEDULED] Rule {rule.name} missing datetime_field in config")
        return 0

    # Get the model class
    model_class = rule.trigger_content_type.model_class()
    if not model_class:
        logger.warning(f"[SCHEDULED] Could not get model class for {rule.trigger_content_type}")
        return 0

    # Verify the field exists
    try:
        field = model_class._meta.get_field(datetime_field)
    except Exception:
        logger.warning(f"[SCHEDULED] Field {datetime_field} not found on {model_class}")
        return 0

    # Calculate the target window
    # If offset_hours is -24, we want to trigger 24 hours BEFORE the datetime_field value
    # So we look for records where datetime_field is within the next 24 hours
    #
    # window_start = now + abs(offset) - buffer
    # window_end = now + abs(offset) + buffer

    # For a 5-minute task interval, use a 6-minute window to avoid missing records
    buffer_minutes = 6

    if offset_hours < 0:
        # Before trigger: look for datetimes coming up
        # e.g., -24 means trigger 24 hours before → find records where datetime is ~24 hours from now
        target_time = now + timedelta(hours=abs(offset_hours))
        window_start = target_time - timedelta(minutes=buffer_minutes)
        window_end = target_time + timedelta(minutes=buffer_minutes)
    else:
        # After trigger: look for datetimes that have passed
        # e.g., +24 means trigger 24 hours after → find records where datetime was ~24 hours ago
        target_time = now - timedelta(hours=offset_hours)
        window_start = target_time - timedelta(minutes=buffer_minutes)
        window_end = target_time + timedelta(minutes=buffer_minutes)

    logger.info(f"[SCHEDULED] Rule {rule.name}: looking for {datetime_field} between {window_start} and {window_end}")

    # Build the query
    filter_kwargs = {
        f'{datetime_field}__gte': window_start,
        f'{datetime_field}__lte': window_end,
        f'{datetime_field}__isnull': False,
    }

    # Add any additional conditions from the rule
    conditions = config.get('conditions', []) or rule.trigger_conditions or []
    for condition in conditions:
        field_name = condition.get('field')
        operator = condition.get('operator', 'equals')
        value = condition.get('value')

        if not field_name:
            continue

        if operator == 'equals':
            filter_kwargs[field_name] = value
        elif operator == 'not_equals':
            filter_kwargs[f'{field_name}__ne'] = value
        elif operator == 'contains':
            filter_kwargs[f'{field_name}__icontains'] = value
        elif operator in ('in', 'is_one_of'):
            if isinstance(value, list):
                filter_kwargs[f'{field_name}__in'] = value
        elif operator in ('not_in', 'is_not_one_of'):
            if isinstance(value, list):
                # Django doesn't have __not_in, so we exclude
                pass  # Handled separately below
        elif operator in ('gt', 'greater_than'):
            filter_kwargs[f'{field_name}__gt'] = value
        elif operator in ('gte', 'greater_than_or_equal'):
            filter_kwargs[f'{field_name}__gte'] = value
        elif operator in ('lt', 'less_than'):
            filter_kwargs[f'{field_name}__lt'] = value
        elif operator in ('lte', 'less_than_or_equal'):
            filter_kwargs[f'{field_name}__lte'] = value
        elif operator in ('is_empty', 'is_null'):
            filter_kwargs[f'{field_name}__isnull'] = True
        elif operator in ('is_not_empty', 'is_not_null'):
            filter_kwargs[f'{field_name}__isnull'] = False

    # Query matching records
    try:
        matching_records = model_class.objects.filter(**filter_kwargs)
    except Exception as e:
        logger.error(f"[SCHEDULED] Query error for rule {rule.name}: {e}")
        return 0

    logger.info(f"[SCHEDULED] Rule {rule.name}: found {matching_records.count()} matching records")

    executions = 0
    content_type = rule.trigger_content_type

    for record in matching_records:
        record_id = str(record.pk)
        trigger_datetime = getattr(record, datetime_field)

        # Check if we've already processed this record for this trigger datetime
        already_executed = ScheduledTriggerExecution.objects.filter(
            rule=rule,
            content_type=content_type,
            object_id=record_id,
            trigger_datetime=trigger_datetime,
        ).exists()

        if already_executed:
            logger.debug(f"[SCHEDULED] Skipping {record_id} - already executed for {trigger_datetime}")
            continue

        # Execute the rule
        try:
            # Build context - for scheduled triggers, old_values is empty
            # and new_values contains current record state
            new_values = {}
            for field in record._meta.get_fields():
                if hasattr(field, 'name') and not field.is_relation:
                    value = getattr(record, field.name, None)
                    if value is not None:
                        new_values[field.name] = value

            # Create execution record
            execution = RuleExecution.objects.create(
                rule=rule,
                trigger_type='scheduled',
                trigger_content_type=content_type,
                trigger_object_id=record_id,
                trigger_data={
                    'old_values': {},
                    'new_values': new_values,
                    'scheduled_trigger': {
                        'datetime_field': datetime_field,
                        'trigger_datetime': trigger_datetime.isoformat(),
                        'offset_hours': offset_hours,
                    }
                },
                status=RuleExecution.Status.RUNNING,
                action_type=rule.action_type,
            )

            start_time = time.time()

            # Execute the action
            result = _execute_rule(rule, content_type, record_id, {}, new_values)

            # Update execution record
            execution.status = RuleExecution.Status.SUCCESS
            execution.action_result = result
            execution.execution_time_ms = int((time.time() - start_time) * 1000)
            execution.completed_at = timezone.now()
            execution.save()

            # Record that we've processed this
            ScheduledTriggerExecution.objects.create(
                rule=rule,
                content_type=content_type,
                object_id=record_id,
                trigger_datetime=trigger_datetime,
                execution=execution,
            )

            # Update rule stats
            rule.last_triggered_at = timezone.now()
            rule.total_executions += 1
            rule.total_success += 1
            rule.save(update_fields=['last_triggered_at', 'total_executions', 'total_success'])

            executions += 1
            logger.info(f"[SCHEDULED] Executed rule {rule.name} for record {record_id}")

        except Exception as e:
            logger.error(f"[SCHEDULED] Error executing rule {rule.name} for {record_id}: {e}")

            # Update execution record with error if we created one
            if 'execution' in locals():
                execution.status = RuleExecution.Status.FAILED
                execution.error_message = str(e)
                execution.completed_at = timezone.now()
                execution.save()

                rule.total_executions += 1
                rule.total_failed += 1
                rule.save(update_fields=['total_executions', 'total_failed'])

    return executions


@shared_task(name="automations.execute_automation_rule")
def execute_automation_rule(
    rule_id: str,
    instance_id: Optional[str] = None,
    instance_model: Optional[str] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Execute a single automation rule for signal/view_action triggers.

    Args:
        rule_id: The automation rule ID
        instance_id: Optional instance primary key
        instance_model: Optional model name (app_label.model_name)
        old_values: Previous field values (empty for signal triggers)
        new_values: Additional context values

    Returns:
        Execution result dictionary
    """
    from .models import AutomationRule, RuleExecution

    old_values = old_values or {}
    new_values = new_values or {}

    try:
        rule = AutomationRule.objects.get(id=rule_id, is_active=True)
    except AutomationRule.DoesNotExist:
        logger.warning(f"Automation rule not found or inactive: {rule_id}")
        return {'success': False, 'error': 'Rule not found or inactive'}

    # Get instance if provided
    instance = None
    if instance_id and instance_model:
        try:
            app_label, model_name = instance_model.split('.')
            content_type = ContentType.objects.get(app_label=app_label, model=model_name)
            model_class = content_type.model_class()
            instance = model_class.objects.get(pk=instance_id)
        except Exception as e:
            logger.warning(f"Could not load instance {instance_model}:{instance_id}: {e}")

    # Create execution record
    execution = RuleExecution.objects.create(
        rule=rule,
        trigger_type=rule.trigger_type,
        status=RuleExecution.Status.RUNNING,
        context_snapshot={
            'signal_name': rule.signal_name,
            'instance_id': instance_id,
            'instance_model': instance_model,
            'context': new_values,
        },
    )

    try:
        # Execute the rule action
        if rule.action_type == 'send_notification':
            result = _execute_rule_notification(rule, instance, old_values, new_values)
        elif rule.action_type == 'send_webhook':
            result = _execute_rule_webhook(rule, instance, old_values, new_values)
        else:
            result = {'success': False, 'error': f'Unsupported action type: {rule.action_type}'}

        execution.status = RuleExecution.Status.SUCCESS if result.get('success') else RuleExecution.Status.FAILED
        execution.result_data = result
        execution.completed_at = timezone.now()
        execution.save()

        # Update rule stats
        rule.last_triggered_at = timezone.now()
        rule.total_executions += 1
        if result.get('success'):
            rule.total_success += 1
        else:
            rule.total_failed += 1
        rule.save(update_fields=['last_triggered_at', 'total_executions', 'total_success', 'total_failed'])

        return result

    except Exception as e:
        logger.error(f"Error executing automation rule {rule.name}: {e}")
        execution.status = RuleExecution.Status.FAILED
        execution.error_message = str(e)
        execution.completed_at = timezone.now()
        execution.save()

        rule.total_executions += 1
        rule.total_failed += 1
        rule.save(update_fields=['total_executions', 'total_failed'])

        return {'success': False, 'error': str(e)}


@shared_task(name="automations.execute_manual_automation")
def execute_manual_automation(
    rule_id: str,
    recipients: Optional[list] = None,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Execute a manual automation rule (e.g., admin broadcast).

    Args:
        rule_id: The automation rule ID
        recipients: List of recipient user IDs or emails
        context: Context variables for template rendering

    Returns:
        Execution result dictionary
    """
    from .models import AutomationRule, RuleExecution
    from notifications.services.notification_service import NotificationService, ExternalRecipient
    from django.contrib.auth import get_user_model

    User = get_user_model()
    recipients = recipients or []
    context = context or {}

    try:
        rule = AutomationRule.objects.get(id=rule_id, trigger_type='manual', is_active=True)
    except AutomationRule.DoesNotExist:
        logger.warning(f"Manual automation rule not found or inactive: {rule_id}")
        return {'success': False, 'error': 'Rule not found or inactive'}

    # Create execution record
    execution = RuleExecution.objects.create(
        rule=rule,
        trigger_type='manual',
        status=RuleExecution.Status.RUNNING,
        context_snapshot={
            'recipients': recipients,
            'context': context,
        },
    )

    try:
        # Get notification template
        template = rule.notification_template
        if not template:
            raise ValueError("No notification template configured for this rule")

        # Resolve recipients
        resolved_recipients = []
        for recipient in recipients:
            if isinstance(recipient, str):
                # Could be user ID or email
                if '@' in recipient:
                    # Email - treat as external
                    resolved_recipients.append(ExternalRecipient(email=recipient, name=''))
                else:
                    # User ID
                    try:
                        user = User.objects.get(pk=recipient)
                        resolved_recipients.append(user)
                    except User.DoesNotExist:
                        logger.warning(f"User not found: {recipient}")

        # If no recipients specified, use recipient_type from action_config
        if not resolved_recipients:
            recipient_type = rule.action_config.get('recipient_type', 'all_users')
            if recipient_type == 'all_users':
                resolved_recipients = list(User.objects.filter(is_active=True))
            elif recipient_type == 'all_admins':
                resolved_recipients = list(User.objects.filter(is_active=True, is_staff=True))
            elif recipient_type == 'all_recruiters':
                resolved_recipients = list(User.objects.filter(is_active=True, role='recruiter'))

        # Render and send notifications
        channel = rule.action_config.get('channel', 'both')
        rendered = template.render(context)

        result = NotificationService.send_automation_notification(
            recipients=resolved_recipients,
            title=rendered['title'],
            body=rendered['body'],
            channel=channel,
            automation_rule=rule,
        )

        execution.status = RuleExecution.Status.SUCCESS
        execution.result_data = {
            'success': True,
            'recipients_count': len(resolved_recipients),
            'notification_result': result,
        }
        execution.completed_at = timezone.now()
        execution.save()

        # Update rule stats
        rule.last_triggered_at = timezone.now()
        rule.total_executions += 1
        rule.total_success += 1
        rule.save(update_fields=['last_triggered_at', 'total_executions', 'total_success'])

        return execution.result_data

    except Exception as e:
        logger.error(f"Error executing manual automation {rule.name}: {e}")
        execution.status = RuleExecution.Status.FAILED
        execution.error_message = str(e)
        execution.completed_at = timezone.now()
        execution.save()

        rule.total_executions += 1
        rule.total_failed += 1
        rule.save(update_fields=['total_executions', 'total_failed'])

        return {'success': False, 'error': str(e)}
