import uuid
from django.db import models
from django.conf import settings


class BottleneckEntityType(models.TextChoices):
    """Entity types that can have bottleneck rules."""
    LEAD = 'lead', 'Lead'
    COMPANY = 'company', 'Company'
    CANDIDATE = 'candidate', 'Candidate'
    APPLICATION = 'application', 'Application'
    STAGE_INSTANCE = 'stage_instance', 'Interview Stage'
    TASK = 'task', 'Task'


class BottleneckType(models.TextChoices):
    """Types of bottleneck detection."""
    THRESHOLD = 'threshold', 'Threshold Exceeded'  # e.g., > X days in stage
    COUNT = 'count', 'Count Exceeded'  # e.g., > X items in state
    PERCENTAGE = 'percentage', 'Percentage Exceeded'  # e.g., > X% stuck
    DURATION = 'duration', 'Duration Exceeded'  # e.g., > X days since last action
    OVERDUE = 'overdue', 'Overdue'  # For tasks past due date


class DetectionSeverity(models.TextChoices):
    """Severity level of a bottleneck detection."""
    WARNING = 'warning', 'Warning'  # Approaching threshold
    CRITICAL = 'critical', 'Critical'  # Threshold exceeded


class BottleneckRule(models.Model):
    """
    Configurable bottleneck detection rule.

    Defines what constitutes a bottleneck and what actions to take
    when detected (notifications, task creation).

    Detection Config Examples:
    - Stage duration: {"type": "stage_duration", "stage_field": "onboarding_stage", "threshold_days": 7, "exclude_terminal": true}
    - Last activity: {"type": "last_activity", "activity_field": "updated_at", "threshold_days": 14}
    - Count in state: {"type": "count_in_state", "field": "status", "value": "pending", "threshold_count": 50, "aggregation": "per_assignee"}
    - Overdue: {"type": "overdue", "threshold_days": 0}
    - Custom: {"type": "custom", "filters": [...]}
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Basic info
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # Entity targeting
    entity_type = models.CharField(
        max_length=20,
        choices=BottleneckEntityType.choices,
    )

    # Detection type
    bottleneck_type = models.CharField(
        max_length=20,
        choices=BottleneckType.choices,
        default=BottleneckType.THRESHOLD,
    )

    # Detection configuration (JSONField for flexibility)
    detection_config = models.JSONField(
        default=dict,
        help_text='''
        Detection configuration. Examples:
        - For stage duration: {"type": "stage_duration", "stage_field": "onboarding_stage", "threshold_days": 7}
        - For count: {"type": "count_in_state", "field": "status", "value": "pending", "threshold_count": 10}
        - For overdue: {"type": "overdue", "threshold_days": 0}
        '''
    )

    # Additional filter conditions (reuse AutomationRule pattern)
    filter_conditions = models.JSONField(
        default=list,
        help_text='Additional filter conditions: [{"field": "priority", "operator": "equals", "value": "high"}]'
    )

    # Notification action
    send_notification = models.BooleanField(default=False)
    notification_config = models.JSONField(
        default=dict,
        blank=True,
        help_text='{"recipient_type": "assigned_user", "channel": "both", "title_template": "...", "body_template": "..."}'
    )

    # Task creation action
    create_task = models.BooleanField(default=False)
    task_config = models.JSONField(
        default=dict,
        blank=True,
        help_text='{"title_template": "Follow up: {{name}}", "priority": "high", "due_days": 1, "assign_to": "entity_owner"}'
    )

    # Duplicate prevention - hours before same entity can trigger rule again
    cooldown_hours = models.PositiveIntegerField(
        default=24,
        help_text='Hours before same entity can trigger this rule again'
    )

    # Warning threshold configuration
    enable_warnings = models.BooleanField(
        default=False,
        help_text='Enable warning detections for entities approaching the threshold'
    )
    warning_threshold_percentage = models.PositiveIntegerField(
        default=80,
        help_text='Percentage of threshold at which to create warning detections (e.g., 80 = warn at 80% of threshold)'
    )

    # Settings
    is_active = models.BooleanField(default=True)
    run_on_schedule = models.BooleanField(
        default=True,
        help_text='Run automatically via Celery Beat'
    )

    # Per-rule scheduling
    schedule_interval_minutes = models.PositiveIntegerField(
        default=60,
        help_text='How often to run this rule (in minutes). Common values: 15, 30, 60, 240, 1440 (daily)'
    )
    next_run_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When this rule should next be executed'
    )

    # Statistics
    last_run_at = models.DateTimeField(null=True, blank=True)
    total_detections = models.PositiveIntegerField(default=0)
    total_notifications_sent = models.PositiveIntegerField(default=0)
    total_tasks_created = models.PositiveIntegerField(default=0)

    # Audit
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_bottleneck_rules'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bottleneck_rules'
        ordering = ['-created_at']
        verbose_name = 'Bottleneck Rule'
        verbose_name_plural = 'Bottleneck Rules'

    def __str__(self):
        return f"{self.name} ({self.entity_type})"


class ExecutionTrigger(models.TextChoices):
    """How the execution was triggered."""
    SCHEDULED = 'scheduled', 'Scheduled'
    MANUAL = 'manual', 'Manual'
    API = 'api', 'API Call'


class BottleneckRuleExecution(models.Model):
    """
    Log of individual rule executions.

    Tracks each time a rule is run, what was found, and allows
    comparison between runs to see trends over time.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    rule = models.ForeignKey(
        BottleneckRule,
        on_delete=models.CASCADE,
        related_name='executions'
    )

    # Execution metadata
    trigger = models.CharField(
        max_length=20,
        choices=ExecutionTrigger.choices,
        default=ExecutionTrigger.SCHEDULED,
    )
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triggered_bottleneck_executions',
        help_text='User who triggered manual execution (null for scheduled)'
    )

    # Timing
    started_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_ms = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Execution duration in milliseconds'
    )

    # Results summary
    entities_scanned = models.PositiveIntegerField(default=0)
    entities_matched = models.PositiveIntegerField(default=0)
    entities_in_cooldown = models.PositiveIntegerField(default=0)
    detections_created = models.PositiveIntegerField(default=0)
    notifications_sent = models.PositiveIntegerField(default=0)
    tasks_created = models.PositiveIntegerField(default=0)

    # Snapshot of matched entities for comparison
    matched_entity_ids = models.JSONField(
        default=list,
        help_text='List of entity IDs that matched this run'
    )

    # Rule config snapshot (for historical comparison if rule changes)
    rule_config_snapshot = models.JSONField(
        default=dict,
        help_text='Snapshot of detection_config and filter_conditions at execution time'
    )

    # Status tracking
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = 'bottleneck_rule_executions'
        ordering = ['-started_at']
        verbose_name = 'Rule Execution'
        verbose_name_plural = 'Rule Executions'
        indexes = [
            models.Index(fields=['rule', '-started_at']),
            models.Index(fields=['-started_at']),
        ]

    def __str__(self):
        return f"{self.rule.name} @ {self.started_at.strftime('%Y-%m-%d %H:%M')}"

    @property
    def duration_display(self):
        """Return human-readable duration."""
        if self.duration_ms is None:
            return '-'
        if self.duration_ms < 1000:
            return f"{self.duration_ms}ms"
        return f"{self.duration_ms / 1000:.1f}s"


class BottleneckDetection(models.Model):
    """
    Log of bottleneck detections.

    Used to:
    - Track what was detected and when
    - Prevent duplicate notifications (cooldown)
    - Provide analytics on bottleneck patterns
    - Track resolution status
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    rule = models.ForeignKey(
        BottleneckRule,
        on_delete=models.CASCADE,
        related_name='detections'
    )

    # Link to the execution that created this detection
    execution = models.ForeignKey(
        BottleneckRuleExecution,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='detections'
    )

    # What was detected
    entity_type = models.CharField(max_length=20)
    entity_id = models.CharField(max_length=50)

    # Severity level
    severity = models.CharField(
        max_length=10,
        choices=DetectionSeverity.choices,
        default=DetectionSeverity.CRITICAL,
        help_text='Warning = approaching threshold, Critical = threshold exceeded'
    )

    # Threshold tracking for warnings
    current_value = models.FloatField(
        null=True,
        blank=True,
        help_text='Current value (e.g., days in stage, days overdue)'
    )
    threshold_value = models.FloatField(
        null=True,
        blank=True,
        help_text='Threshold value that triggers critical detection'
    )
    projected_breach_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Projected time when threshold will be breached (for warnings)'
    )

    # Detection context snapshot
    detection_data = models.JSONField(
        default=dict,
        help_text='Snapshot of detection context: {"days_in_stage": 12, "stage_name": "Qualified", ...}'
    )

    # Actions taken
    notification_sent = models.BooleanField(default=False)
    notification = models.ForeignKey(
        'notifications.Notification',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bottleneck_detections'
    )

    task_created = models.BooleanField(default=False)
    task = models.ForeignKey(
        'core.Task',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bottleneck_detections'
    )

    # Resolution tracking
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_bottlenecks'
    )
    resolution_notes = models.TextField(
        blank=True,
        default='',
        help_text='Notes about how this detection was resolved (manual or auto)'
    )

    detected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bottleneck_detections'
        ordering = ['-detected_at']
        verbose_name = 'Bottleneck Detection'
        verbose_name_plural = 'Bottleneck Detections'
        indexes = [
            models.Index(fields=['rule', 'entity_type', 'entity_id', '-detected_at']),
            models.Index(fields=['is_resolved', '-detected_at']),
            models.Index(fields=['entity_type', 'entity_id']),
        ]

    def __str__(self):
        return f"Detection: {self.rule.name} - {self.entity_type}:{self.entity_id}"
