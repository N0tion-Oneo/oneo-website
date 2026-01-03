"""
Bottleneck Detection Service

This module provides the core detection logic for identifying bottlenecks
based on configurable rules.
"""
from datetime import timedelta
from typing import Dict, List, Any, Optional
from django.apps import apps
from django.utils import timezone
from django.db.models import QuerySet

from .models import BottleneckRule, BottleneckDetection, BottleneckRuleExecution, ExecutionTrigger, DetectionSeverity


class BottleneckDetectionService:
    """Service for executing bottleneck detection rules."""

    # Model mapping for entity types
    ENTITY_MODELS = {
        'lead': 'companies.Lead',
        'company': 'companies.Company',
        'candidate': 'candidates.CandidateProfile',
        'application': 'jobs.Application',
        'stage_instance': 'jobs.ApplicationStageInstance',
        'task': 'core.Task',
    }

    @classmethod
    def execute_rule(
        cls,
        rule: BottleneckRule,
        trigger: str = ExecutionTrigger.SCHEDULED,
        triggered_by=None
    ) -> Dict[str, Any]:
        """
        Execute a single bottleneck rule and take actions.

        Args:
            rule: The bottleneck rule to execute
            trigger: How the execution was triggered (scheduled, manual, api)
            triggered_by: User who triggered manual execution (optional)

        Returns:
            Dict with execution results including execution_id for tracking
        """
        import time
        start_time = time.time()
        started_at = timezone.now()

        # Create execution record
        execution = BottleneckRuleExecution.objects.create(
            rule=rule,
            trigger=trigger,
            triggered_by=triggered_by,
            started_at=started_at,
            rule_config_snapshot={
                'detection_config': rule.detection_config,
                'filter_conditions': rule.filter_conditions,
                'cooldown_hours': rule.cooldown_hours,
                'enable_warnings': rule.enable_warnings,
                'warning_threshold_percentage': rule.warning_threshold_percentage,
            }
        )

        try:
            # 1. Build and execute detection query (includes warnings if enabled)
            entities_with_values = cls._run_detection_query_with_values(rule)
            all_matched_ids = [str(e['entity'].pk) for e in entities_with_values]

            # 2. Filter out entities in cooldown period
            entities_to_process = cls._filter_cooldown_with_values(rule, entities_with_values)
            entities_in_cooldown = len(entities_with_values) - len(entities_to_process)

            # 3. Process each entity
            results = {
                'execution_id': str(execution.id),
                'scanned': len(entities_with_values),
                'matched': len(entities_with_values),
                'in_cooldown': entities_in_cooldown,
                'detected': 0,
                'warnings': 0,
                'critical': 0,
                'notifications': 0,
                'tasks': 0,
            }

            for entity_data in entities_to_process:
                entity = entity_data['entity']
                severity = entity_data['severity']
                current_value = entity_data.get('current_value')
                threshold_value = entity_data.get('threshold_value')
                projected_breach_at = entity_data.get('projected_breach_at')

                detection_data = cls._build_detection_data(rule, entity)
                detection = cls._create_detection(
                    rule, entity, detection_data, execution,
                    severity=severity,
                    current_value=current_value,
                    threshold_value=threshold_value,
                    projected_breach_at=projected_breach_at
                )
                results['detected'] += 1

                if severity == DetectionSeverity.WARNING:
                    results['warnings'] += 1
                else:
                    results['critical'] += 1

                # Only send notifications and create tasks for critical detections
                # (or optionally for warnings based on configuration)
                if severity == DetectionSeverity.CRITICAL:
                    if rule.send_notification:
                        if cls._send_notification(rule, entity, detection):
                            results['notifications'] += 1

                    if rule.create_task:
                        if cls._create_task(rule, entity, detection):
                            results['tasks'] += 1

            # 4. Update rule stats
            rule.last_run_at = timezone.now()
            rule.total_detections += results['detected']
            rule.total_notifications_sent += results['notifications']
            rule.total_tasks_created += results['tasks']
            rule.save(update_fields=[
                'last_run_at',
                'total_detections',
                'total_notifications_sent',
                'total_tasks_created',
            ])

            # 5. Finalize execution record
            end_time = time.time()
            execution.completed_at = timezone.now()
            execution.duration_ms = int((end_time - start_time) * 1000)
            execution.entities_scanned = results['scanned']
            execution.entities_matched = results['matched']
            execution.entities_in_cooldown = results['in_cooldown']
            execution.detections_created = results['detected']
            execution.notifications_sent = results['notifications']
            execution.tasks_created = results['tasks']
            execution.matched_entity_ids = all_matched_ids
            execution.success = True
            execution.save()

            return results

        except Exception as e:
            # Record failure
            end_time = time.time()
            execution.completed_at = timezone.now()
            execution.duration_ms = int((end_time - start_time) * 1000)
            execution.success = False
            execution.error_message = str(e)
            execution.save()
            raise

    @classmethod
    def preview_rule(cls, rule: BottleneckRule, limit: int = 50) -> List[Dict]:
        """
        Preview entities that would match this rule.
        Does not create detections or trigger actions.
        Includes warnings if enable_warnings is True.
        """
        # Use the new method that returns severity information
        entities_with_values = cls._run_detection_query_with_values(rule)[:limit]

        return [
            cls._entity_to_preview_dict_with_severity(rule, entity_data)
            for entity_data in entities_with_values
        ]

    @classmethod
    def _entity_to_preview_dict_with_severity(cls, rule: BottleneckRule, entity_data: Dict) -> Dict:
        """Convert entity data with severity to preview dict."""
        entity = entity_data['entity']
        base_dict = cls._entity_to_preview_dict(rule, entity)
        base_dict['severity'] = entity_data.get('severity', DetectionSeverity.CRITICAL)
        base_dict['current_value'] = entity_data.get('current_value')
        base_dict['threshold_value'] = entity_data.get('threshold_value')
        base_dict['projected_breach_at'] = entity_data.get('projected_breach_at')
        if base_dict['projected_breach_at']:
            base_dict['projected_breach_at'] = base_dict['projected_breach_at'].isoformat()
        return base_dict

    @classmethod
    def _run_detection_query_with_values(cls, rule: BottleneckRule) -> List[Dict]:
        """
        Run detection query and return entities with their current values and severity.

        Returns a list of dicts with:
        - entity: The model instance
        - severity: 'warning' or 'critical'
        - current_value: The current threshold value (e.g., days in stage)
        - threshold_value: The threshold that triggers critical
        - projected_breach_at: When warning will become critical (for warnings)
        """
        model_path = cls.ENTITY_MODELS.get(rule.entity_type)
        if not model_path:
            return []

        model = apps.get_model(model_path)
        config = rule.detection_config
        detection_type = config.get('type', 'stage_duration')

        # Calculate thresholds
        threshold_days = config.get('threshold_days', 7)
        warning_threshold_days = None

        if rule.enable_warnings and threshold_days:
            warning_threshold_days = threshold_days * (rule.warning_threshold_percentage / 100.0)

        now = timezone.now()
        results = []

        if detection_type == 'stage_duration':
            results = cls._query_stage_duration_with_values(model, rule, threshold_days, warning_threshold_days)
        elif detection_type == 'last_activity':
            results = cls._query_last_activity_with_values(model, config, threshold_days, warning_threshold_days, rule.enable_warnings)
        elif detection_type == 'overdue':
            results = cls._query_overdue_with_values(model, config, threshold_days, warning_threshold_days, rule.enable_warnings)
        else:
            # For other types (count_in_state, custom), just use existing query with critical severity
            entities = cls._run_detection_query(rule)
            for entity in entities:
                results.append({
                    'entity': entity,
                    'severity': DetectionSeverity.CRITICAL,
                    'current_value': None,
                    'threshold_value': None,
                    'projected_breach_at': None,
                })

        return results

    @classmethod
    def _query_stage_duration_with_values(
        cls, model, rule: BottleneckRule, threshold_days: float, warning_threshold_days: Optional[float]
    ) -> List[Dict]:
        """Query entities by stage duration and return with values."""
        from core.models import OnboardingStage, OnboardingHistory

        config = rule.detection_config
        exclude_terminal = config.get('exclude_terminal', True)
        stage_field = config.get('stage_field', 'onboarding_stage')
        now = timezone.now()

        results = []

        # Use warning threshold as minimum if enabled, otherwise use full threshold
        min_threshold_days = warning_threshold_days if warning_threshold_days else threshold_days
        min_threshold = now - timedelta(days=min_threshold_days)

        if rule.entity_type == 'application':
            from jobs.models import ApplicationStatus, ActivityLog, ActivityType

            queryset = model.objects.filter(**{f'{stage_field}__isnull': False})

            if exclude_terminal:
                terminal_statuses = [
                    ApplicationStatus.OFFER_ACCEPTED,
                    ApplicationStatus.OFFER_DECLINED,
                    ApplicationStatus.REJECTED,
                ]
                queryset = queryset.exclude(status__in=terminal_statuses)

            # Apply additional filter conditions
            queryset = cls._apply_filter_conditions(queryset, rule.filter_conditions)

            for entity in queryset:
                last_stage_change = ActivityLog.objects.filter(
                    application=entity,
                    activity_type=ActivityType.STAGE_CHANGED,
                ).order_by('-created_at').first()

                stage_entered_at = None
                if last_stage_change:
                    stage_entered_at = last_stage_change.created_at
                else:
                    stage_entered_at = getattr(entity, 'stage_entered_at', None) or getattr(entity, 'applied_at', None)

                if stage_entered_at and stage_entered_at < min_threshold:
                    days_in_stage = (now - stage_entered_at).total_seconds() / 86400
                    severity, projected_breach = cls._calculate_severity(
                        days_in_stage, threshold_days, warning_threshold_days, stage_entered_at
                    )
                    results.append({
                        'entity': entity,
                        'severity': severity,
                        'current_value': round(days_in_stage, 1),
                        'threshold_value': threshold_days,
                        'projected_breach_at': projected_breach,
                    })

            return results

        # For lead, company, candidate - use OnboardingStage
        if exclude_terminal and hasattr(model, stage_field):
            terminal_stages = OnboardingStage.objects.filter(
                entity_type=rule.entity_type,
                is_terminal=True
            ).values_list('id', flat=True)
            queryset = model.objects.exclude(**{f'{stage_field}__in': terminal_stages})
            queryset = queryset.filter(**{f'{stage_field}__isnull': False})
        else:
            queryset = model.objects.filter(**{f'{stage_field}__isnull': False})

        # Apply additional filter conditions
        queryset = cls._apply_filter_conditions(queryset, rule.filter_conditions)

        for entity in queryset:
            current_stage = getattr(entity, stage_field, None)
            if not current_stage:
                continue

            last_entry = OnboardingHistory.objects.filter(
                entity_type=rule.entity_type,
                entity_id=str(entity.id),
                to_stage=current_stage,
            ).order_by('-created_at').first()

            stage_entered_at = None
            if last_entry:
                stage_entered_at = last_entry.created_at
            elif hasattr(entity, 'created_at'):
                stage_entered_at = entity.created_at

            if stage_entered_at and stage_entered_at < min_threshold:
                days_in_stage = (now - stage_entered_at).total_seconds() / 86400
                severity, projected_breach = cls._calculate_severity(
                    days_in_stage, threshold_days, warning_threshold_days, stage_entered_at
                )
                results.append({
                    'entity': entity,
                    'severity': severity,
                    'current_value': round(days_in_stage, 1),
                    'threshold_value': threshold_days,
                    'projected_breach_at': projected_breach,
                })

        return results

    @classmethod
    def _query_last_activity_with_values(
        cls, model, config: Dict, threshold_days: float, warning_threshold_days: Optional[float], enable_warnings: bool
    ) -> List[Dict]:
        """Query entities by last activity and return with values."""
        activity_field = config.get('activity_field', 'updated_at')
        now = timezone.now()

        min_threshold_days = warning_threshold_days if warning_threshold_days else threshold_days
        min_threshold = now - timedelta(days=min_threshold_days)

        queryset = model.objects.filter(**{f'{activity_field}__lt': min_threshold})
        results = []

        for entity in queryset:
            last_activity = getattr(entity, activity_field, None)
            if last_activity:
                days_inactive = (now - last_activity).total_seconds() / 86400
                severity, projected_breach = cls._calculate_severity(
                    days_inactive, threshold_days, warning_threshold_days, last_activity
                )
                results.append({
                    'entity': entity,
                    'severity': severity,
                    'current_value': round(days_inactive, 1),
                    'threshold_value': threshold_days,
                    'projected_breach_at': projected_breach,
                })

        return results

    @classmethod
    def _query_overdue_with_values(
        cls, model, config: Dict, threshold_days: float, warning_threshold_days: Optional[float], enable_warnings: bool
    ) -> List[Dict]:
        """Query overdue entities and return with values."""
        now = timezone.now()
        today = now.date()

        # For overdue, threshold_days means how many days overdue
        # Warning would be "approaching due date"
        results = []
        model_name = model.__name__

        if model_name == 'Task':
            from core.models import TaskStatus

            # Get tasks that are either overdue OR approaching due date (for warnings)
            if enable_warnings and warning_threshold_days is not None:
                # warning_threshold_days for overdue means: warn X days BEFORE due date
                # So if threshold_days=0 (overdue) and warning=80%, we warn when 20% of typical lead time remains
                # This is a bit complex - let's interpret it as: warn when due within X days
                warning_due_date = today + timedelta(days=int(threshold_days + 1))  # Tasks due soon
                queryset = model.objects.filter(
                    due_date__lte=warning_due_date,
                    status__in=[TaskStatus.PENDING, TaskStatus.IN_PROGRESS]
                )
            else:
                cutoff = today - timedelta(days=threshold_days)
                queryset = model.objects.filter(
                    due_date__lt=cutoff,
                    status__in=[TaskStatus.PENDING, TaskStatus.IN_PROGRESS]
                )

            for entity in queryset:
                if entity.due_date:
                    days_overdue = (today - entity.due_date).days
                    if days_overdue >= threshold_days:
                        severity = DetectionSeverity.CRITICAL
                        projected_breach = None
                    elif enable_warnings and days_overdue >= -1:  # Due within 1 day
                        severity = DetectionSeverity.WARNING
                        projected_breach = timezone.make_aware(
                            timezone.datetime.combine(entity.due_date, timezone.datetime.min.time())
                        ) + timedelta(days=threshold_days)
                    else:
                        continue

                    results.append({
                        'entity': entity,
                        'severity': severity,
                        'current_value': days_overdue if days_overdue > 0 else 0,
                        'threshold_value': threshold_days,
                        'projected_breach_at': projected_breach,
                    })

        elif model_name == 'ApplicationStageInstance':
            from jobs.models.stages import StageInstanceStatus

            if enable_warnings:
                warning_deadline = now + timedelta(days=1)  # Due within 1 day
                queryset = model.objects.filter(
                    deadline__lte=warning_deadline,
                    deadline__isnull=False,
                    status__in=[
                        StageInstanceStatus.NOT_STARTED,
                        StageInstanceStatus.IN_PROGRESS,
                        StageInstanceStatus.AWAITING_SUBMISSION,
                    ]
                )
            else:
                cutoff = now - timedelta(days=threshold_days)
                queryset = model.objects.filter(
                    deadline__lt=cutoff,
                    deadline__isnull=False,
                    status__in=[
                        StageInstanceStatus.NOT_STARTED,
                        StageInstanceStatus.IN_PROGRESS,
                        StageInstanceStatus.AWAITING_SUBMISSION,
                    ]
                )

            for entity in queryset:
                if entity.deadline:
                    days_overdue = (now - entity.deadline).total_seconds() / 86400
                    if days_overdue >= threshold_days:
                        severity = DetectionSeverity.CRITICAL
                        projected_breach = None
                    elif enable_warnings and days_overdue >= -1:
                        severity = DetectionSeverity.WARNING
                        projected_breach = entity.deadline + timedelta(days=threshold_days)
                    else:
                        continue

                    results.append({
                        'entity': entity,
                        'severity': severity,
                        'current_value': round(max(0, days_overdue), 1),
                        'threshold_value': threshold_days,
                        'projected_breach_at': projected_breach,
                    })

        return results

    @classmethod
    def _calculate_severity(
        cls,
        current_value: float,
        threshold: float,
        warning_threshold: Optional[float],
        reference_time: Any
    ) -> tuple:
        """
        Calculate severity and projected breach time.

        Returns (severity, projected_breach_at)
        """
        if current_value >= threshold:
            return DetectionSeverity.CRITICAL, None

        if warning_threshold and current_value >= warning_threshold:
            # Calculate when threshold will be breached
            remaining_days = threshold - current_value
            projected_breach = timezone.now() + timedelta(days=remaining_days)
            return DetectionSeverity.WARNING, projected_breach

        # Should not reach here if called correctly
        return DetectionSeverity.CRITICAL, None

    @classmethod
    def _filter_cooldown_with_values(cls, rule: BottleneckRule, entities_data: List[Dict]) -> List[Dict]:
        """Filter out entities that are still in cooldown period, considering severity."""
        cooldown_threshold = timezone.now() - timedelta(hours=rule.cooldown_hours)

        # Get recent detections for this rule
        recent_detections = BottleneckDetection.objects.filter(
            rule=rule,
            entity_type=rule.entity_type,
            detected_at__gte=cooldown_threshold
        ).values('entity_id', 'severity')

        # Build a map of entity_id -> highest severity in cooldown
        cooldown_map = {}
        for det in recent_detections:
            entity_id = det['entity_id']
            severity = det['severity']
            # Track the highest severity seen (critical > warning)
            if entity_id not in cooldown_map or severity == DetectionSeverity.CRITICAL:
                cooldown_map[entity_id] = severity

        result = []
        for entity_data in entities_data:
            entity_id = str(entity_data['entity'].pk)
            new_severity = entity_data['severity']

            if entity_id in cooldown_map:
                existing_severity = cooldown_map[entity_id]
                # Skip if same or lower severity already detected
                if existing_severity == DetectionSeverity.CRITICAL:
                    continue  # Already critical, skip
                if existing_severity == DetectionSeverity.WARNING and new_severity == DetectionSeverity.WARNING:
                    continue  # Already warned, skip

            result.append(entity_data)

        return result

    @classmethod
    def _run_detection_query(cls, rule: BottleneckRule) -> QuerySet:
        """Build and execute the detection query based on config."""
        model_path = cls.ENTITY_MODELS.get(rule.entity_type)
        if not model_path:
            return []

        model = apps.get_model(model_path)
        config = rule.detection_config

        detection_type = config.get('type', 'stage_duration')

        if detection_type == 'stage_duration':
            queryset = cls._query_stage_duration(model, rule)
        elif detection_type == 'last_activity':
            queryset = cls._query_last_activity(model, config)
        elif detection_type == 'overdue':
            queryset = cls._query_overdue(model, config)
        elif detection_type == 'count_in_state':
            queryset = cls._query_count_in_state(model, config)
        elif detection_type == 'custom':
            queryset = cls._query_custom(model, config, rule.filter_conditions)
        else:
            return model.objects.none()

        # Apply additional filter conditions
        queryset = cls._apply_filter_conditions(queryset, rule.filter_conditions)

        return queryset

    @classmethod
    def entity_matches_rule(cls, rule: 'BottleneckRule', entity_id: str) -> bool:
        """
        Check if a specific entity still matches the rule's detection criteria.

        This is used for auto-resolution: when an entity is updated, we check if
        it still matches the rule. If not, the detection can be auto-resolved.

        Args:
            rule: The bottleneck rule to check against
            entity_id: The entity's primary key as string

        Returns:
            True if entity still matches (bottleneck still applies), False otherwise
        """
        try:
            # Run the detection query for this rule
            matching_entities = cls._run_detection_query(rule)

            # Check if the entity is in the matching set
            # Handle both UUID and integer PKs
            for entity in matching_entities:
                if str(entity.pk) == entity_id:
                    return True

            return False

        except Exception as e:
            # If there's an error, assume it still matches to avoid false resolution
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error checking if entity {entity_id} matches rule {rule.id}: {e}")
            return True

    @classmethod
    def _query_stage_duration(cls, model, rule: BottleneckRule) -> QuerySet:
        """Query entities stuck in a stage for too long."""
        from core.models import OnboardingStage, OnboardingHistory

        config = rule.detection_config
        threshold_days = config.get('threshold_days', 7)
        exclude_terminal = config.get('exclude_terminal', True)
        stage_field = config.get('stage_field', 'onboarding_stage')

        now = timezone.now()
        threshold = now - timedelta(days=threshold_days)

        # Handle different entity types - Applications use JobStage, others use OnboardingStage
        if rule.entity_type == 'application':
            # Applications have current_stage which points to JobStage (UUID-based)
            # Use ActivityLog to find when they entered current stage
            from jobs.models import ApplicationStatus, ActivityLog, ActivityType

            queryset = model.objects.filter(**{f'{stage_field}__isnull': False})

            if exclude_terminal:
                # Exclude applications in terminal statuses
                terminal_statuses = [
                    ApplicationStatus.OFFER_ACCEPTED,
                    ApplicationStatus.OFFER_DECLINED,
                    ApplicationStatus.REJECTED,
                ]
                queryset = queryset.exclude(status__in=terminal_statuses)

            # Find applications stuck in current stage using ActivityLog
            stuck_entity_ids = []
            for entity in queryset:
                # Look for the most recent STAGE_CHANGED activity for this application
                last_stage_change = ActivityLog.objects.filter(
                    application=entity,
                    activity_type=ActivityType.STAGE_CHANGED,
                ).order_by('-created_at').first()

                if last_stage_change:
                    # Check if stage change was before threshold
                    if last_stage_change.created_at < threshold:
                        stuck_entity_ids.append(entity.id)
                else:
                    # No stage change history - fall back to stage_entered_at or applied_at
                    stage_entered_at = getattr(entity, 'stage_entered_at', None)
                    if stage_entered_at and stage_entered_at < threshold:
                        stuck_entity_ids.append(entity.id)
                    elif not stage_entered_at:
                        applied_at = getattr(entity, 'applied_at', None)
                        if applied_at and applied_at < threshold:
                            stuck_entity_ids.append(entity.id)

            return model.objects.filter(id__in=stuck_entity_ids)

        # For lead, company, candidate - use OnboardingStage
        if exclude_terminal and hasattr(model, stage_field):
            terminal_stages = OnboardingStage.objects.filter(
                entity_type=rule.entity_type,
                is_terminal=True
            ).values_list('id', flat=True)

            # Start with all entities that have a non-terminal stage
            queryset = model.objects.exclude(**{f'{stage_field}__in': terminal_stages})
            queryset = queryset.filter(**{f'{stage_field}__isnull': False})
        else:
            queryset = model.objects.filter(**{f'{stage_field}__isnull': False})

        # Now filter by those who have been in their current stage > threshold_days
        # We need to check the OnboardingHistory for when they entered the current stage
        stuck_entity_ids = []

        for entity in queryset:
            current_stage = getattr(entity, stage_field, None)
            if not current_stage:
                continue

            # Get the most recent transition TO this stage
            last_entry = OnboardingHistory.objects.filter(
                entity_type=rule.entity_type,
                entity_id=str(entity.id),
                to_stage=current_stage,
            ).order_by('-created_at').first()

            if last_entry and last_entry.created_at < threshold:
                stuck_entity_ids.append(entity.id)
            elif not last_entry:
                # No history record, check entity created_at
                if hasattr(entity, 'created_at') and entity.created_at < threshold:
                    stuck_entity_ids.append(entity.id)

        return model.objects.filter(id__in=stuck_entity_ids)

    @classmethod
    def _query_last_activity(cls, model, config: Dict) -> QuerySet:
        """Query entities without recent activity."""
        activity_field = config.get('activity_field', 'updated_at')
        threshold_days = config.get('threshold_days', 14)

        threshold = timezone.now() - timedelta(days=threshold_days)

        return model.objects.filter(**{f'{activity_field}__lt': threshold})

    @classmethod
    def _query_overdue(cls, model, config: Dict) -> QuerySet:
        """Query overdue entities (tasks or stage instances)."""
        threshold_days = config.get('threshold_days', 0)
        now = timezone.now()
        cutoff = now - timedelta(days=threshold_days)

        # Handle different model types
        model_name = model.__name__

        if model_name == 'Task':
            from core.models import TaskStatus
            return model.objects.filter(
                due_date__lt=cutoff.date(),
                status__in=[TaskStatus.PENDING, TaskStatus.IN_PROGRESS]
            )
        elif model_name == 'ApplicationStageInstance':
            # Stage instances use deadline field (datetime)
            from jobs.models.stages import StageInstanceStatus
            return model.objects.filter(
                deadline__lt=cutoff,
                deadline__isnull=False,
                status__in=[
                    StageInstanceStatus.NOT_STARTED,
                    StageInstanceStatus.IN_PROGRESS,
                    StageInstanceStatus.AWAITING_SUBMISSION,
                ]
            )
        else:
            # Generic fallback - look for due_date or deadline field
            if hasattr(model, 'deadline'):
                return model.objects.filter(deadline__lt=cutoff)
            elif hasattr(model, 'due_date'):
                return model.objects.filter(due_date__lt=cutoff.date())
            return model.objects.none()

    @classmethod
    def _query_count_in_state(cls, model, config: Dict) -> QuerySet:
        """Query entities based on count thresholds."""
        field = config.get('field', 'status')
        value = config.get('value', 'pending')

        return model.objects.filter(**{field: value})

    @classmethod
    def _query_custom(cls, model, config: Dict, filter_conditions: List) -> QuerySet:
        """Execute custom query based on filter conditions."""
        queryset = model.objects.all()

        for condition in config.get('filters', []):
            queryset = cls._apply_single_condition(queryset, condition)

        return queryset

    @classmethod
    def _apply_filter_conditions(cls, queryset: QuerySet, conditions: List) -> QuerySet:
        """Apply additional filter conditions to queryset."""
        for condition in conditions:
            queryset = cls._apply_single_condition(queryset, condition)
        return queryset

    @classmethod
    def _apply_single_condition(cls, queryset: QuerySet, condition: Dict) -> QuerySet:
        """Apply a single filter condition."""
        field = condition.get('field')
        operator = condition.get('operator', 'equals')
        value = condition.get('value')

        if not field:
            return queryset

        now = timezone.now()
        today = now.date()

        if operator == 'equals':
            return queryset.filter(**{field: value})
        elif operator == 'not_equals':
            return queryset.exclude(**{field: value})
        elif operator == 'contains':
            return queryset.filter(**{f'{field}__icontains': value})
        elif operator == 'gt':
            return queryset.filter(**{f'{field}__gt': value})
        elif operator == 'gte':
            return queryset.filter(**{f'{field}__gte': value})
        elif operator == 'lt':
            return queryset.filter(**{f'{field}__lt': value})
        elif operator == 'lte':
            return queryset.filter(**{f'{field}__lte': value})
        elif operator == 'is_empty':
            return queryset.filter(**{f'{field}__isnull': True})
        elif operator == 'is_not_empty':
            return queryset.filter(**{f'{field}__isnull': False})
        elif operator == 'in':
            return queryset.filter(**{f'{field}__in': value})
        elif operator == 'not_in':
            return queryset.exclude(**{f'{field}__in': value})
        # Date/datetime operators
        elif operator == 'days_ago_gt':
            # Field value is MORE than X days ago (older)
            days = int(value) if value else 0
            threshold = now - timedelta(days=days)
            return queryset.filter(**{f'{field}__lt': threshold})
        elif operator == 'days_ago_lt':
            # Field value is LESS than X days ago (more recent)
            days = int(value) if value else 0
            threshold = now - timedelta(days=days)
            return queryset.filter(**{f'{field}__gte': threshold})
        elif operator == 'is_due_within':
            # Due date is within X days from now
            days = int(value) if value else 0
            future_date = today + timedelta(days=days)
            return queryset.filter(**{f'{field}__lte': future_date, f'{field}__gte': today})
        elif operator == 'is_overdue':
            # Due date is in the past
            return queryset.filter(**{f'{field}__lt': today})

        return queryset

    @classmethod
    def _filter_cooldown(cls, rule: BottleneckRule, entities: List) -> List:
        """Filter out entities that are still in cooldown period."""
        cooldown_threshold = timezone.now() - timedelta(hours=rule.cooldown_hours)

        recent_detections = set(
            BottleneckDetection.objects.filter(
                rule=rule,
                entity_type=rule.entity_type,
                detected_at__gte=cooldown_threshold
            ).values_list('entity_id', flat=True)
        )

        return [e for e in entities if str(e.pk) not in recent_detections]

    @classmethod
    def _build_detection_data(cls, rule: BottleneckRule, entity) -> Dict:
        """Build detection data snapshot for an entity."""
        data = {
            'entity_id': str(entity.pk),
            'entity_type': rule.entity_type,
        }

        # Add entity-specific data based on type
        if rule.entity_type in ['lead', 'company', 'candidate']:
            if hasattr(entity, 'onboarding_stage') and entity.onboarding_stage:
                data['stage_name'] = entity.onboarding_stage.name
                data['stage_id'] = str(entity.onboarding_stage.id)

        if rule.entity_type == 'task':
            data['title'] = getattr(entity, 'title', '')
            data['status'] = getattr(entity, 'status', '')
            data['priority'] = getattr(entity, 'priority', '')
            if hasattr(entity, 'due_date') and entity.due_date:
                data['due_date'] = entity.due_date.isoformat()
                data['days_overdue'] = (timezone.now().date() - entity.due_date).days

        if rule.entity_type == 'application':
            data['status'] = getattr(entity, 'status', '')
            if hasattr(entity, 'current_stage') and entity.current_stage:
                data['stage_name'] = entity.current_stage.name

        if rule.entity_type == 'stage_instance':
            data['status'] = getattr(entity, 'status', '')
            if hasattr(entity, 'stage_template') and entity.stage_template:
                data['stage_name'] = entity.stage_template.name
                data['stage_type'] = entity.stage_template.stage_type
            if hasattr(entity, 'application') and entity.application:
                data['application_id'] = str(entity.application.id)
                if entity.application.candidate:
                    data['candidate_name'] = entity.application.candidate.full_name
            if hasattr(entity, 'deadline') and entity.deadline:
                data['deadline'] = entity.deadline.isoformat()
                if entity.deadline < timezone.now():
                    data['days_overdue'] = (timezone.now() - entity.deadline).days
            if hasattr(entity, 'scheduled_at') and entity.scheduled_at:
                data['scheduled_at'] = entity.scheduled_at.isoformat()

        # Add name if available
        if hasattr(entity, 'name'):
            data['name'] = entity.name
        elif hasattr(entity, 'full_name'):
            data['name'] = entity.full_name
        elif hasattr(entity, 'title'):
            data['name'] = entity.title

        return data

    @classmethod
    def _create_detection(
        cls,
        rule: BottleneckRule,
        entity,
        detection_data: Dict,
        execution: BottleneckRuleExecution = None,
        severity: str = DetectionSeverity.CRITICAL,
        current_value: float = None,
        threshold_value: float = None,
        projected_breach_at = None
    ) -> BottleneckDetection:
        """Create a detection record linked to an execution."""
        return BottleneckDetection.objects.create(
            rule=rule,
            execution=execution,
            entity_type=rule.entity_type,
            entity_id=str(entity.pk),
            detection_data=detection_data,
            severity=severity,
            current_value=current_value,
            threshold_value=threshold_value,
            projected_breach_at=projected_breach_at,
        )

    @classmethod
    def _send_notification(
        cls,
        rule: BottleneckRule,
        entity,
        detection: BottleneckDetection
    ) -> bool:
        """Send notification for a detected bottleneck."""
        import logging
        logger = logging.getLogger(__name__)

        try:
            from notifications.services.notification_service import NotificationService

            config = rule.notification_config
            if not config:
                logger.warning(f"Bottleneck rule {rule.id} has no notification_config")
                return False

            # Build context for template rendering
            context = detection.detection_data.copy()
            context['rule_name'] = rule.name
            context['entity_type'] = rule.entity_type
            context['entity_id'] = detection.entity_id

            # Add entity name if available
            if hasattr(entity, 'name'):
                context['name'] = entity.name
            elif hasattr(entity, 'title'):
                context['name'] = entity.title

            # Resolve recipients based on config
            recipients = cls._resolve_recipients(config, entity, rule)
            if not recipients:
                logger.warning(
                    f"No recipients found for bottleneck rule {rule.id} "
                    f"(recipient_type={config.get('recipient_type')}, entity={entity})"
                )
                return False

            logger.info(f"Sending bottleneck notification to {len(recipients)} recipients")

            # Render templates
            title = cls._render_template(
                config.get('title_template') or f'Bottleneck detected: {rule.name}',
                context
            )
            body = cls._render_template(
                config.get('body_template') or 'A bottleneck has been detected.',
                context
            )

            # Send notification
            channel = config.get('channel', 'in_app')
            notifications = NotificationService.send_to_users(
                recipients=recipients,
                title=title,
                body=body,
                channel=channel,
            )

            if notifications:
                detection.notification_sent = True
                detection.notification = notifications[0] if notifications else None
                detection.save(update_fields=['notification_sent', 'notification'])
                logger.info(f"Bottleneck notification sent for detection {detection.id}")
                return True
            else:
                logger.warning(f"NotificationService.send_to_users returned empty for detection {detection.id}")

        except Exception as e:
            import traceback
            logger.error(f"Error sending notification for detection {detection.id}: {e}\n{traceback.format_exc()}")

        return False

    @classmethod
    def _create_task(
        cls,
        rule: BottleneckRule,
        entity,
        detection: BottleneckDetection
    ) -> bool:
        """Create a follow-up task for a detected bottleneck."""
        import logging
        logger = logging.getLogger(__name__)

        try:
            from core.models import Task, TaskPriority, EntityType
            from django.contrib.auth import get_user_model
            from users.models import UserRole

            config = rule.task_config
            if not config:
                logger.warning(f"Bottleneck rule {rule.id} has no task_config")
                return False

            # Map bottleneck entity types to Task entity types
            # stage_instance and task don't have direct mappings
            entity_type_mapping = {
                'lead': EntityType.LEAD,
                'company': EntityType.COMPANY,
                'candidate': EntityType.CANDIDATE,
                'application': EntityType.APPLICATION,
            }

            task_entity_type = entity_type_mapping.get(rule.entity_type)
            if not task_entity_type:
                # For stage_instance, try to link to application if available
                if rule.entity_type == 'stage_instance' and hasattr(entity, 'application_id'):
                    task_entity_type = EntityType.APPLICATION
                    entity_id = str(entity.application_id)
                    logger.info(f"Mapped stage_instance to application {entity_id} for task creation")
                else:
                    # Can't create task for unsupported entity types
                    logger.warning(f"Cannot create task for entity type {rule.entity_type} - no valid mapping")
                    return False
            else:
                entity_id = str(entity.pk)

            # Build context
            context = detection.detection_data.copy()
            context['rule_name'] = rule.name

            # Render title
            title = cls._render_template(
                config.get('title_template', f'Follow up: {rule.name}'),
                context
            )

            # Calculate due date
            due_days = config.get('due_days', 1)
            due_date = timezone.now().date() + timedelta(days=due_days)

            # Resolve assignee - fallback to first admin if no owner found
            assignee = cls._resolve_task_assignee(config, entity)
            if not assignee:
                logger.info(f"No entity owner found, falling back to admin for task assignment")
                User = get_user_model()
                assignee = User.objects.filter(
                    role=UserRole.ADMIN,
                    is_active=True
                ).first()
                if not assignee:
                    logger.error(f"No admin user found for task assignment - skipping task creation")
                    return False

            logger.info(f"Creating task for detection {detection.id}: entity_type={task_entity_type}, entity_id={entity_id}, assignee={assignee}")

            # Create task
            task = Task.objects.create(
                entity_type=task_entity_type,
                entity_id=entity_id,
                title=title[:200],
                description=f"Auto-created by bottleneck rule: {rule.name}",
                priority=config.get('priority', TaskPriority.MEDIUM),
                due_date=due_date,
                assigned_to=assignee,
                created_by=None,  # System-created
            )

            detection.task_created = True
            detection.task = task
            detection.save(update_fields=['task_created', 'task'])

            logger.info(f"Successfully created task {task.id} for detection {detection.id}")
            return True

        except Exception as e:
            import traceback
            logger.error(f"Error creating task for detection {detection.id}: {e}\n{traceback.format_exc()}")

        return False

    @classmethod
    def _resolve_recipients(cls, config: Dict, entity, rule: BottleneckRule) -> List:
        """Resolve notification recipients based on config."""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        recipient_type = config.get('recipient_type', 'assigned_user')

        if recipient_type == 'assigned_user':
            # Try to get assigned user from entity
            # Handle both ForeignKey (single user) and ManyToMany (multiple users)
            if hasattr(entity, 'assigned_to') and entity.assigned_to:
                assigned = entity.assigned_to
                # Check if it's a ManyToMany manager
                if hasattr(assigned, 'all'):
                    users = list(assigned.all())
                    if users:
                        return users
                else:
                    # It's a ForeignKey - single user
                    return [assigned]
            if hasattr(entity, 'assigned_recruiter') and entity.assigned_recruiter:
                return [entity.assigned_recruiter]
            if hasattr(entity, 'created_by') and entity.created_by:
                return [entity.created_by]

        elif recipient_type == 'all_admins':
            from users.models import UserRole
            return list(User.objects.filter(role=UserRole.ADMIN, is_active=True))

        elif recipient_type == 'all_recruiters':
            from users.models import UserRole
            return list(User.objects.filter(
                role__in=[UserRole.ADMIN, UserRole.RECRUITER],
                is_active=True
            ))

        return []

    @classmethod
    def _resolve_task_assignee(cls, config: Dict, entity):
        """Resolve task assignee based on config."""
        assign_to = config.get('assign_to', 'entity_owner')

        if assign_to == 'entity_owner':
            if hasattr(entity, 'assigned_to') and entity.assigned_to:
                assigned = entity.assigned_to
                # Check if it's a ManyToMany manager
                if hasattr(assigned, 'all'):
                    first_user = assigned.first()
                    if first_user:
                        return first_user
                else:
                    # It's a ForeignKey - single user
                    return assigned
            if hasattr(entity, 'assigned_recruiter') and entity.assigned_recruiter:
                return entity.assigned_recruiter

        elif assign_to == 'entity_creator':
            if hasattr(entity, 'created_by') and entity.created_by:
                return entity.created_by

        return None

    @classmethod
    def _render_template(cls, template: str, context: Dict) -> str:
        """Simple template rendering with {{variable}} syntax."""
        result = template
        for key, value in context.items():
            result = result.replace(f'{{{{{key}}}}}', str(value) if value else '')
        return result

    @classmethod
    def _entity_to_preview_dict(cls, rule: BottleneckRule, entity) -> Dict:
        """Convert entity to preview dictionary."""
        data = {
            'id': str(entity.pk),
            'entity_type': rule.entity_type,
        }

        # Add common fields
        if hasattr(entity, 'name'):
            data['name'] = entity.name
        elif hasattr(entity, 'full_name'):
            data['name'] = entity.full_name
        elif hasattr(entity, 'title'):
            data['name'] = entity.title

        if hasattr(entity, 'created_at'):
            data['created_at'] = entity.created_at.isoformat()

        # Entity-specific fields
        if rule.entity_type in ['lead', 'company', 'candidate']:
            if hasattr(entity, 'onboarding_stage') and entity.onboarding_stage:
                data['stage'] = entity.onboarding_stage.name

        if rule.entity_type == 'task':
            data['status'] = getattr(entity, 'status', '')
            data['priority'] = getattr(entity, 'priority', '')
            if hasattr(entity, 'due_date') and entity.due_date:
                data['due_date'] = entity.due_date.isoformat()

        if rule.entity_type == 'application':
            data['status'] = getattr(entity, 'status', '')
            if hasattr(entity, 'current_stage') and entity.current_stage:
                data['stage'] = entity.current_stage.name

        if rule.entity_type == 'stage_instance':
            data['status'] = getattr(entity, 'status', '')
            if hasattr(entity, 'stage_template') and entity.stage_template:
                data['stage'] = entity.stage_template.name
                data['name'] = entity.stage_template.name
            if hasattr(entity, 'application') and entity.application:
                if entity.application.candidate:
                    data['candidate'] = entity.application.candidate.full_name
            if hasattr(entity, 'deadline') and entity.deadline:
                data['deadline'] = entity.deadline.isoformat()
            if hasattr(entity, 'scheduled_at') and entity.scheduled_at:
                data['scheduled_at'] = entity.scheduled_at.isoformat()

        return data
