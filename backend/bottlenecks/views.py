from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from datetime import timedelta

from users.models import UserRole
from .models import BottleneckRule, BottleneckDetection, BottleneckRuleExecution, BottleneckEntityType, BottleneckType, ExecutionTrigger
from .serializers import (
    BottleneckRuleSerializer,
    BottleneckRuleCreateSerializer,
    BottleneckRuleUpdateSerializer,
    BottleneckDetectionSerializer,
    BottleneckRuleQuickUpdateSerializer,
    BottleneckRuleExecutionSerializer,
    BottleneckRuleExecutionListSerializer,
)


def is_staff_user(user):
    """Check if user is admin or recruiter."""
    return user.role in [UserRole.ADMIN, UserRole.RECRUITER]


def is_admin_user(user):
    """Check if user is admin."""
    return user.role == UserRole.ADMIN


# =============================================================================
# Bottleneck Rules CRUD
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def rule_list_create(request):
    """
    GET: List all bottleneck rules.
    POST: Create a new bottleneck rule.

    Query params (GET):
    - entity_type: Filter by entity type
    - is_active: Filter by active status
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == 'GET':
        rules = BottleneckRule.objects.all()

        # Apply filters
        entity_type = request.query_params.get('entity_type')
        if entity_type:
            rules = rules.filter(entity_type=entity_type)

        is_active = request.query_params.get('is_active')
        if is_active is not None:
            rules = rules.filter(is_active=is_active.lower() == 'true')

        rules = rules.select_related('created_by')
        serializer = BottleneckRuleSerializer(rules, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        if not is_admin_user(request.user):
            return Response(
                {'error': 'Only admins can create bottleneck rules'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = BottleneckRuleCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            rule = serializer.save()
            return Response(
                BottleneckRuleSerializer(rule).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def rule_detail(request, rule_id):
    """
    GET: Retrieve a bottleneck rule.
    PATCH: Update a bottleneck rule.
    DELETE: Delete a bottleneck rule.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    rule = get_object_or_404(BottleneckRule, id=rule_id)

    if request.method == 'GET':
        serializer = BottleneckRuleSerializer(rule)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        if not is_admin_user(request.user):
            return Response(
                {'error': 'Only admins can update bottleneck rules'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = BottleneckRuleUpdateSerializer(
            rule,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            rule = serializer.save()
            return Response(BottleneckRuleSerializer(rule).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        if not is_admin_user(request.user):
            return Response(
                {'error': 'Only admins can delete bottleneck rules'},
                status=status.HTTP_403_FORBIDDEN
            )

        rule.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def rule_quick_update(request, rule_id):
    """
    Quick update for threshold/active status from analytics UI.
    Only updates specific fields.
    """
    if not is_admin_user(request.user):
        return Response(
            {'error': 'Only admins can update bottleneck rules'},
            status=status.HTTP_403_FORBIDDEN
        )

    rule = get_object_or_404(BottleneckRule, id=rule_id)
    serializer = BottleneckRuleQuickUpdateSerializer(
        rule,
        data=request.data,
        partial=True
    )
    if serializer.is_valid():
        rule = serializer.save()
        return Response(BottleneckRuleSerializer(rule).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rule_run(request, rule_id):
    """
    Manually trigger a bottleneck rule execution.
    """
    if not is_admin_user(request.user):
        return Response(
            {'error': 'Only admins can run bottleneck rules'},
            status=status.HTTP_403_FORBIDDEN
        )

    rule = get_object_or_404(BottleneckRule, id=rule_id)

    # Import here to avoid circular imports
    from .services import BottleneckDetectionService

    try:
        result = BottleneckDetectionService.execute_rule(
            rule,
            trigger=ExecutionTrigger.MANUAL,
            triggered_by=request.user
        )
        return Response({
            'success': True,
            'rule_id': str(rule.id),
            'rule_name': rule.name,
            'result': result,
        })
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_all_rules(request):
    """
    Manually trigger all active bottleneck rules.
    Returns aggregated results.
    """
    if not is_admin_user(request.user):
        return Response(
            {'error': 'Only admins can run bottleneck rules'},
            status=status.HTTP_403_FORBIDDEN
        )

    from .services import BottleneckDetectionService

    rules = BottleneckRule.objects.filter(is_active=True)

    totals = {
        'rules_executed': 0,
        'rules_failed': 0,
        'scanned': 0,
        'detected': 0,
        'warnings': 0,
        'critical': 0,
        'notifications': 0,
        'tasks': 0,
    }
    rule_results = []

    for rule in rules:
        try:
            result = BottleneckDetectionService.execute_rule(
                rule,
                trigger=ExecutionTrigger.MANUAL,
                triggered_by=request.user
            )
            totals['rules_executed'] += 1
            totals['scanned'] += result.get('scanned', 0)
            totals['detected'] += result.get('detected', 0)
            totals['warnings'] += result.get('warnings', 0)
            totals['critical'] += result.get('critical', 0)
            totals['notifications'] += result.get('notifications', 0)
            totals['tasks'] += result.get('tasks', 0)

            if result.get('detected', 0) > 0:
                rule_results.append({
                    'rule_id': str(rule.id),
                    'rule_name': rule.name,
                    'detected': result['detected'],
                    'warnings': result['warnings'],
                    'critical': result['critical'],
                    'notifications': result['notifications'],
                    'tasks': result['tasks'],
                })
        except Exception as e:
            totals['rules_failed'] += 1
            rule_results.append({
                'rule_id': str(rule.id),
                'rule_name': rule.name,
                'error': str(e),
            })

    return Response({
        'success': True,
        'totals': totals,
        'rules_with_detections': rule_results,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def rule_preview(request, rule_id):
    """
    Preview entities that would match this rule.
    Does not create detections or trigger actions.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    rule = get_object_or_404(BottleneckRule, id=rule_id)

    # Import here to avoid circular imports
    from .services import BottleneckDetectionService

    try:
        matches = BottleneckDetectionService.preview_rule(rule, limit=50)
        return Response({
            'rule_id': str(rule.id),
            'rule_name': rule.name,
            'match_count': len(matches),
            'matches': matches,
        })
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rule_preview_adhoc(request):
    """
    Preview entities that would match a rule configuration.
    Accepts rule config as POST body, does not require saved rule.
    Used for previewing while creating/editing rules.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Validate required fields
    entity_type = request.data.get('entity_type')
    detection_config = request.data.get('detection_config', {})
    filter_conditions = request.data.get('filter_conditions', [])

    if not entity_type:
        return Response(
            {'error': 'entity_type is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate entity_type is a valid choice
    valid_entity_types = [choice[0] for choice in BottleneckEntityType.choices]
    if entity_type not in valid_entity_types:
        return Response(
            {'error': f'Invalid entity_type. Must be one of: {valid_entity_types}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create a temporary rule object (not saved)
    temp_rule = BottleneckRule(
        name=request.data.get('name', 'Preview'),
        entity_type=entity_type,
        detection_config=detection_config,
        filter_conditions=filter_conditions,
        cooldown_hours=request.data.get('cooldown_hours', 24),
    )

    # Import here to avoid circular imports
    from .services import BottleneckDetectionService

    try:
        matches = BottleneckDetectionService.preview_rule(temp_rule, limit=50)
        return Response({
            'rule_id': None,
            'rule_name': temp_rule.name,
            'match_count': len(matches),
            'matches': matches,
        })
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =============================================================================
# Bottleneck Detections
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detection_list(request):
    """
    List bottleneck detections with pagination.

    Query params:
    - rule_id: Filter by rule
    - entity_type: Filter by entity type
    - is_resolved: Filter by resolution status
    - severity: Filter by severity (critical, warning)
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20)
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Base queryset before severity filter (for counts)
    base_detections = BottleneckDetection.objects.all()

    # Apply filters (except severity)
    rule_id = request.query_params.get('rule_id')
    if rule_id:
        base_detections = base_detections.filter(rule_id=rule_id)

    entity_type = request.query_params.get('entity_type')
    if entity_type:
        base_detections = base_detections.filter(entity_type=entity_type)

    is_resolved = request.query_params.get('is_resolved')
    if is_resolved is not None:
        base_detections = base_detections.filter(is_resolved=is_resolved.lower() == 'true')

    # Calculate severity counts before applying severity filter
    severity_counts = base_detections.values('severity').annotate(count=Count('id'))
    counts_by_severity = {item['severity']: item['count'] for item in severity_counts}
    critical_count = counts_by_severity.get('critical', 0)
    warning_count = counts_by_severity.get('warning', 0)

    # Now apply severity filter if provided
    detections = base_detections
    severity = request.query_params.get('severity')
    if severity:
        detections = detections.filter(severity=severity)

    # Order by severity (critical first) then by date
    from django.db.models import Case, When, Value, IntegerField
    detections = detections.annotate(
        severity_order=Case(
            When(severity='critical', then=Value(0)),
            When(severity='warning', then=Value(1)),
            default=Value(2),
            output_field=IntegerField(),
        )
    ).order_by('severity_order', '-detected_at')

    # Pagination
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 20))

    total_count = detections.count()
    total_pages = (total_count + page_size - 1) // page_size

    start = (page - 1) * page_size
    end = start + page_size

    detections = detections.select_related('rule', 'resolved_by')[start:end]

    serializer = BottleneckDetectionSerializer(detections, many=True)
    return Response({
        'results': serializer.data,
        'count': total_count,
        'num_pages': total_pages,
        'has_next': page < total_pages,
        'has_previous': page > 1,
        'severity_counts': {
            'critical': critical_count,
            'warning': warning_count,
        },
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def detection_resolve(request, detection_id):
    """
    Mark a detection as resolved.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    detection = get_object_or_404(BottleneckDetection, id=detection_id)

    if detection.is_resolved:
        return Response(
            {'error': 'Detection is already resolved'},
            status=status.HTTP_400_BAD_REQUEST
        )

    detection.is_resolved = True
    detection.resolved_at = timezone.now()
    detection.resolved_by = request.user
    detection.save()

    serializer = BottleneckDetectionSerializer(detection)
    return Response(serializer.data)


# =============================================================================
# Analytics
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_summary(request):
    """
    Get bottleneck analytics summary.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    today = timezone.now().date()
    today_start = timezone.make_aware(
        timezone.datetime.combine(today, timezone.datetime.min.time())
    )

    # Rule stats
    total_rules = BottleneckRule.objects.count()
    active_rules = BottleneckRule.objects.filter(is_active=True).count()

    # Detection stats
    total_detections = BottleneckDetection.objects.count()
    unresolved_detections = BottleneckDetection.objects.filter(is_resolved=False).count()
    detections_today = BottleneckDetection.objects.filter(detected_at__gte=today_start).count()

    # Action stats for today
    notifications_sent_today = BottleneckDetection.objects.filter(
        detected_at__gte=today_start,
        notification_sent=True
    ).count()
    tasks_created_today = BottleneckDetection.objects.filter(
        detected_at__gte=today_start,
        task_created=True
    ).count()

    # By entity type
    by_entity_type = list(
        BottleneckDetection.objects.filter(is_resolved=False)
        .values('entity_type')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    return Response({
        'total_rules': total_rules,
        'active_rules': active_rules,
        'total_detections': total_detections,
        'unresolved_detections': unresolved_detections,
        'detections_today': detections_today,
        'notifications_sent_today': notifications_sent_today,
        'tasks_created_today': tasks_created_today,
        'by_entity_type': by_entity_type,
    })


# =============================================================================
# Model Introspection for Rule Builder
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_models(request):
    """
    Get available entity types for bottleneck rules.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    entity_types = [
        {'value': choice[0], 'label': choice[1]}
        for choice in BottleneckEntityType.choices
    ]

    bottleneck_types = [
        {'value': choice[0], 'label': choice[1]}
        for choice in BottleneckType.choices
    ]

    return Response({
        'entity_types': entity_types,
        'bottleneck_types': bottleneck_types,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def model_fields(request, entity_type):
    """
    Get available fields for a specific entity type with choices and operators.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Common operators by field type
    OPERATORS = {
        'stage': [
            {'value': 'equals', 'label': 'is'},
            {'value': 'not_equals', 'label': 'is not'},
            {'value': 'in', 'label': 'is one of'},
            {'value': 'not_in', 'label': 'is not one of'},
        ],
        'choice': [
            {'value': 'equals', 'label': 'is'},
            {'value': 'not_equals', 'label': 'is not'},
            {'value': 'in', 'label': 'is one of'},
            {'value': 'not_in', 'label': 'is not one of'},
        ],
        'boolean': [
            {'value': 'equals', 'label': 'is'},
        ],
        'datetime': [
            {'value': 'is_empty', 'label': 'is not set'},
            {'value': 'is_not_empty', 'label': 'is set'},
            {'value': 'gt', 'label': 'is after'},
            {'value': 'lt', 'label': 'is before'},
            {'value': 'days_ago_gt', 'label': 'more than X days ago'},
            {'value': 'days_ago_lt', 'label': 'less than X days ago'},
        ],
        'date': [
            {'value': 'is_empty', 'label': 'is not set'},
            {'value': 'is_not_empty', 'label': 'is set'},
            {'value': 'gt', 'label': 'is after'},
            {'value': 'lt', 'label': 'is before'},
            {'value': 'equals', 'label': 'is'},
            {'value': 'is_overdue', 'label': 'is overdue'},
            {'value': 'is_due_within', 'label': 'is due within X days'},
        ],
        'string': [
            {'value': 'equals', 'label': 'equals'},
            {'value': 'not_equals', 'label': 'does not equal'},
            {'value': 'contains', 'label': 'contains'},
            {'value': 'not_contains', 'label': 'does not contain'},
            {'value': 'is_empty', 'label': 'is empty'},
            {'value': 'is_not_empty', 'label': 'is not empty'},
        ],
        'number': [
            {'value': 'equals', 'label': 'equals'},
            {'value': 'not_equals', 'label': 'does not equal'},
            {'value': 'gt', 'label': 'is greater than'},
            {'value': 'gte', 'label': 'is at least'},
            {'value': 'lt', 'label': 'is less than'},
            {'value': 'lte', 'label': 'is at most'},
        ],
    }

    # Choices for specific fields
    from jobs.models import ApplicationStatus, StageInstanceStatus, StageType
    from core.models import TaskStatus, TaskPriority

    APPLICATION_STATUS_CHOICES = [
        {'value': s[0], 'label': s[1]} for s in ApplicationStatus.choices
    ]
    TASK_STATUS_CHOICES = [
        {'value': s[0], 'label': s[1]} for s in TaskStatus.choices
    ]
    TASK_PRIORITY_CHOICES = [
        {'value': s[0], 'label': s[1]} for s in TaskPriority.choices
    ]
    STAGE_INSTANCE_STATUS_CHOICES = [
        {'value': s[0], 'label': s[1]} for s in StageInstanceStatus.choices
    ]
    STAGE_TYPE_CHOICES = [
        {'value': s[0], 'label': s[1]} for s in StageType.choices
    ]

    # Define available fields per entity type with full metadata
    ENTITY_FIELDS = {
        'lead': [
            {'field': 'onboarding_stage', 'label': 'Onboarding Stage', 'type': 'stage', 'operators': OPERATORS['stage']},
            {'field': 'created_at', 'label': 'Created At', 'type': 'datetime', 'operators': OPERATORS['datetime']},
            {'field': 'updated_at', 'label': 'Last Updated', 'type': 'datetime', 'operators': OPERATORS['datetime']},
            {'field': 'company_name', 'label': 'Company Name', 'type': 'string', 'operators': OPERATORS['string']},
            {'field': 'contact_name', 'label': 'Contact Name', 'type': 'string', 'operators': OPERATORS['string']},
            {'field': 'contact_email', 'label': 'Contact Email', 'type': 'string', 'operators': OPERATORS['string']},
        ],
        'company': [
            {'field': 'onboarding_stage', 'label': 'Onboarding Stage', 'type': 'stage', 'operators': OPERATORS['stage']},
            {'field': 'created_at', 'label': 'Created At', 'type': 'datetime', 'operators': OPERATORS['datetime']},
            {'field': 'updated_at', 'label': 'Last Updated', 'type': 'datetime', 'operators': OPERATORS['datetime']},
            {'field': 'is_active', 'label': 'Is Active', 'type': 'boolean', 'operators': OPERATORS['boolean']},
            {'field': 'name', 'label': 'Company Name', 'type': 'string', 'operators': OPERATORS['string']},
        ],
        'candidate': [
            {'field': 'onboarding_stage', 'label': 'Onboarding Stage', 'type': 'stage', 'operators': OPERATORS['stage']},
            {'field': 'created_at', 'label': 'Created At', 'type': 'datetime', 'operators': OPERATORS['datetime']},
            {'field': 'updated_at', 'label': 'Last Updated', 'type': 'datetime', 'operators': OPERATORS['datetime']},
            {'field': 'user__first_name', 'label': 'First Name', 'type': 'string', 'operators': OPERATORS['string']},
            {'field': 'user__last_name', 'label': 'Last Name', 'type': 'string', 'operators': OPERATORS['string']},
            {'field': 'user__email', 'label': 'Email', 'type': 'string', 'operators': OPERATORS['string']},
            {'field': 'years_experience', 'label': 'Years Experience', 'type': 'number', 'operators': OPERATORS['number']},
        ],
        'application': [
            {'field': 'current_stage', 'label': 'Current Stage', 'type': 'stage', 'operators': OPERATORS['stage']},
            {'field': 'status', 'label': 'Status', 'type': 'choice', 'operators': OPERATORS['choice'], 'choices': APPLICATION_STATUS_CHOICES},
            {'field': 'applied_at', 'label': 'Applied At', 'type': 'datetime', 'operators': OPERATORS['datetime']},
            {'field': 'shortlisted_at', 'label': 'Shortlisted At', 'type': 'datetime', 'operators': OPERATORS['datetime']},
            {'field': 'stage_entered_at', 'label': 'Stage Entered At', 'type': 'datetime', 'operators': OPERATORS['datetime']},
        ],
        'task': [
            {'field': 'status', 'label': 'Status', 'type': 'choice', 'operators': OPERATORS['choice'], 'choices': TASK_STATUS_CHOICES},
            {'field': 'priority', 'label': 'Priority', 'type': 'choice', 'operators': OPERATORS['choice'], 'choices': TASK_PRIORITY_CHOICES},
            {'field': 'due_date', 'label': 'Due Date', 'type': 'date', 'operators': OPERATORS['date']},
            {'field': 'created_at', 'label': 'Created At', 'type': 'datetime', 'operators': OPERATORS['datetime']},
            {'field': 'updated_at', 'label': 'Last Updated', 'type': 'datetime', 'operators': OPERATORS['datetime']},
            {'field': 'title', 'label': 'Title', 'type': 'string', 'operators': OPERATORS['string']},
        ],
        'stage_instance': [
            {'field': 'status', 'label': 'Status', 'type': 'choice', 'operators': OPERATORS['choice'], 'choices': STAGE_INSTANCE_STATUS_CHOICES},
            {'field': 'stage_template__stage_type', 'label': 'Stage Type', 'type': 'choice', 'operators': OPERATORS['choice'], 'choices': STAGE_TYPE_CHOICES},
            {'field': 'scheduled_at', 'label': 'Scheduled At', 'type': 'datetime', 'operators': OPERATORS['datetime']},
            {'field': 'deadline', 'label': 'Assessment Deadline', 'type': 'datetime', 'operators': OPERATORS['datetime']},
            {'field': 'completed_at', 'label': 'Completed At', 'type': 'datetime', 'operators': OPERATORS['datetime']},
            {'field': 'created_at', 'label': 'Created At', 'type': 'datetime', 'operators': OPERATORS['datetime']},
            {'field': 'updated_at', 'label': 'Last Updated', 'type': 'datetime', 'operators': OPERATORS['datetime']},
            {'field': 'score', 'label': 'Score', 'type': 'number', 'operators': OPERATORS['number']},
            {'field': 'calendar_invite_sent', 'label': 'Calendar Invite Sent', 'type': 'boolean', 'operators': OPERATORS['boolean']},
        ],
    }

    fields = ENTITY_FIELDS.get(entity_type, [])
    return Response({'fields': fields})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_stages(request, entity_type):
    """
    Get available onboarding stages for a specific entity type.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    from core.models import OnboardingStage

    # Map bottleneck entity types to onboarding entity types
    onboarding_entity_map = {
        'lead': 'lead',
        'company': 'company',
        'candidate': 'candidate',
    }

    onboarding_type = onboarding_entity_map.get(entity_type)
    if not onboarding_type:
        return Response({'stages': []})

    stages = OnboardingStage.objects.filter(
        entity_type=onboarding_type,
        is_active=True
    ).order_by('order')

    return Response({
        'stages': [
            {
                'id': stage.id,
                'name': stage.name,
                'color': stage.color,
                'is_terminal': stage.is_terminal,
                'order': stage.order,
            }
            for stage in stages
        ]
    })


# =============================================================================
# Get rules by entity type (for analytics quick-edit)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def rules_by_entity_type(request, entity_type):
    """
    Get bottleneck rules for a specific entity type.
    Used by analytics components for quick threshold editing.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    rules = BottleneckRule.objects.filter(
        entity_type=entity_type
    ).select_related('created_by')

    serializer = BottleneckRuleSerializer(rules, many=True)
    return Response(serializer.data)


# =============================================================================
# Execution History
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def rule_executions(request, rule_id):
    """
    Get execution history for a specific rule.

    Query params:
    - limit: Max number of executions to return (default: 50)
    - offset: Number of executions to skip (default: 0)
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    rule = get_object_or_404(BottleneckRule, id=rule_id)

    limit = int(request.query_params.get('limit', 50))
    offset = int(request.query_params.get('offset', 0))

    executions = BottleneckRuleExecution.objects.filter(
        rule=rule
    ).select_related('triggered_by').order_by('-started_at')[offset:offset + limit]

    total_count = BottleneckRuleExecution.objects.filter(rule=rule).count()

    serializer = BottleneckRuleExecutionListSerializer(executions, many=True)
    return Response({
        'rule_id': str(rule.id),
        'rule_name': rule.name,
        'total_count': total_count,
        'executions': serializer.data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def execution_detail(request, execution_id):
    """
    Get detailed information about a single execution.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    execution = get_object_or_404(
        BottleneckRuleExecution.objects.select_related('rule', 'triggered_by'),
        id=execution_id
    )

    serializer = BottleneckRuleExecutionSerializer(execution)
    return Response(serializer.data)


def resolve_entity_details(entity_type: str, entity_ids: list, detections_map: dict = None) -> list:
    """
    Resolve entity IDs to detailed entity information.

    Returns list of dicts with id, name, and optionally detection data.
    """
    if not entity_ids:
        return []

    results = []
    try:
        if entity_type == 'candidate':
            from candidates.models import CandidateProfile
            entities = CandidateProfile.objects.filter(
                id__in=entity_ids
            ).select_related('user', 'onboarding_stage')
            entity_map = {str(e.id): e for e in entities}
            for eid in entity_ids:
                entity = entity_map.get(eid)
                stage = getattr(entity, 'onboarding_stage', None) if entity else None
                result = {
                    'id': eid,
                    'name': entity.full_name if entity else f'Candidate {eid[:8]}...',
                    'email': entity.user.email if entity and entity.user else None,
                    'stage': stage.name if stage else None,
                }
                if detections_map and eid in detections_map:
                    result['detection'] = detections_map[eid]
                results.append(result)

        elif entity_type == 'application':
            from jobs.models import Application
            entities = Application.objects.filter(
                id__in=entity_ids
            ).select_related('candidate__user', 'job')
            entity_map = {str(e.id): e for e in entities}
            for eid in entity_ids:
                entity = entity_map.get(eid)
                result = {
                    'id': eid,
                    'name': f"{entity.candidate.full_name} - {entity.job.title}" if entity else f'Application {eid[:8]}...',
                    'candidate_name': entity.candidate.full_name if entity else None,
                    'job_title': entity.job.title if entity else None,
                    'status': entity.status if entity else None,
                }
                if detections_map and eid in detections_map:
                    result['detection'] = detections_map[eid]
                results.append(result)

        elif entity_type == 'task':
            from core.models import Task
            entities = Task.objects.filter(
                id__in=entity_ids
            ).select_related('assigned_to')
            entity_map = {str(e.id): e for e in entities}
            for eid in entity_ids:
                entity = entity_map.get(eid)
                result = {
                    'id': eid,
                    'name': entity.title if entity else f'Task {eid[:8]}...',
                    'assigned_to': entity.assigned_to.get_full_name() if entity and entity.assigned_to else None,
                    'status': entity.status if entity else None,
                    'priority': entity.priority if entity else None,
                    'due_date': entity.due_date.isoformat() if entity and entity.due_date else None,
                }
                if detections_map and eid in detections_map:
                    result['detection'] = detections_map[eid]
                results.append(result)

        elif entity_type == 'lead':
            from companies.models import Lead
            entities = Lead.objects.filter(id__in=entity_ids).select_related('onboarding_stage')
            entity_map = {str(e.id): e for e in entities}
            for eid in entity_ids:
                entity = entity_map.get(eid)
                stage = getattr(entity, 'onboarding_stage', None) if entity else None
                result = {
                    'id': eid,
                    'name': entity.name or entity.company_name or f'Lead {eid[:8]}...' if entity else f'Lead {eid[:8]}...',
                    'stage': stage.name if stage else None,
                }
                if detections_map and eid in detections_map:
                    result['detection'] = detections_map[eid]
                results.append(result)

        elif entity_type == 'company':
            from companies.models import Company
            entities = Company.objects.filter(id__in=entity_ids).select_related('onboarding_stage')
            entity_map = {str(e.id): e for e in entities}
            for eid in entity_ids:
                entity = entity_map.get(eid)
                stage = getattr(entity, 'onboarding_stage', None) if entity else None
                result = {
                    'id': eid,
                    'name': entity.name if entity else f'Company {eid[:8]}...',
                    'stage': stage.name if stage else None,
                }
                if detections_map and eid in detections_map:
                    result['detection'] = detections_map[eid]
                results.append(result)

        elif entity_type == 'stage_instance':
            from jobs.models import ApplicationStageInstance
            entities = ApplicationStageInstance.objects.filter(
                id__in=entity_ids
            ).select_related('application__candidate__user', 'stage_template')
            entity_map = {str(e.id): e for e in entities}
            for eid in entity_ids:
                entity = entity_map.get(eid)
                result = {
                    'id': eid,
                    'name': f"{entity.application.candidate.full_name} - {entity.stage_template.name}" if entity else f'Stage {eid[:8]}...',
                    'stage_name': entity.stage_template.name if entity else None,
                    'status': entity.status if entity else None,
                }
                if detections_map and eid in detections_map:
                    result['detection'] = detections_map[eid]
                results.append(result)

        else:
            # Unknown entity type - just return IDs with truncated display
            for eid in entity_ids:
                result = {'id': eid, 'name': f'{entity_type} {eid[:8]}...'}
                if detections_map and eid in detections_map:
                    result['detection'] = detections_map[eid]
                results.append(result)

    except Exception as e:
        # If resolution fails, fall back to just IDs
        for eid in entity_ids:
            result = {'id': eid, 'name': f'{entity_type} {eid[:8]}...'}
            if detections_map and eid in detections_map:
                result['detection'] = detections_map[eid]
            results.append(result)

    return results


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def execution_compare(request, execution_id):
    """
    Compare an execution with the previous one for the same rule.

    Returns:
    - current execution details
    - previous execution details (if exists)
    - new_entities: detailed entity info for new bottlenecks
    - resolved_entities: detailed entity info for resolved bottlenecks
    - persistent_entities: detailed entity info for persistent bottlenecks
    - detections_created: list of detections created in this execution
    - rule_config: current rule configuration
    - config_changed: whether config changed from previous execution
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    execution = get_object_or_404(
        BottleneckRuleExecution.objects.select_related('rule', 'triggered_by'),
        id=execution_id
    )

    # Find the previous execution for the same rule
    previous = BottleneckRuleExecution.objects.filter(
        rule=execution.rule,
        started_at__lt=execution.started_at,
        success=True
    ).order_by('-started_at').first()

    current_ids = set(execution.matched_entity_ids)
    previous_ids = set(previous.matched_entity_ids) if previous else set()

    new_entity_ids = list(current_ids - previous_ids)
    resolved_entity_ids = list(previous_ids - current_ids)
    persistent_entity_ids = list(current_ids & previous_ids)

    # Get detections created in this execution for additional context
    detections = BottleneckDetection.objects.filter(
        execution=execution
    ).select_related('rule')

    # Build detection map: entity_id -> detection data
    detections_map = {}
    for d in detections:
        detections_map[d.entity_id] = {
            'id': str(d.id),
            'severity': d.severity,
            'current_value': d.current_value,
            'threshold_value': d.threshold_value,
            'detection_data': d.detection_data,
            'notification_sent': d.notification_sent,
            'task_created': d.task_created,
        }

    # Resolve entity details with detection info
    entity_type = execution.rule.entity_type
    new_entities = resolve_entity_details(entity_type, new_entity_ids, detections_map)
    resolved_entities = resolve_entity_details(entity_type, resolved_entity_ids)
    persistent_entities = resolve_entity_details(entity_type, persistent_entity_ids, detections_map)

    # Check if config changed
    config_changed = False
    if previous and previous.rule_config_snapshot:
        config_changed = execution.rule_config_snapshot != previous.rule_config_snapshot

    # Get recent trend (last 5 executions)
    recent_executions = list(
        BottleneckRuleExecution.objects.filter(
            rule=execution.rule,
            success=True
        ).order_by('-started_at')[:5].values('started_at', 'entities_matched')
    )
    for e in recent_executions:
        e['started_at'] = e['started_at'].isoformat()

    return Response({
        'current': BottleneckRuleExecutionSerializer(execution).data,
        'previous': BottleneckRuleExecutionSerializer(previous).data if previous else None,
        'new_entities': new_entities,
        'resolved_entities': resolved_entities,
        'persistent_entities': persistent_entities,
        'summary': {
            'new_count': len(new_entity_ids),
            'resolved_count': len(resolved_entity_ids),
            'persistent_count': len(persistent_entity_ids),
            'trend': 'increasing' if len(new_entity_ids) > len(resolved_entity_ids) else (
                'decreasing' if len(resolved_entity_ids) > len(new_entity_ids) else 'stable'
            ),
            'net_change': len(new_entity_ids) - len(resolved_entity_ids),
        },
        'rule_config': execution.rule_config_snapshot,
        'config_changed': config_changed,
        'recent_trend': recent_executions,
        'detections_summary': {
            'total': len(detections),
            'with_notification': sum(1 for d in detections if d.notification_sent),
            'with_task': sum(1 for d in detections if d.task_created),
            'critical': sum(1 for d in detections if d.severity == 'critical'),
            'warning': sum(1 for d in detections if d.severity == 'warning'),
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_executions(request):
    """
    Get recent executions across all rules.

    Query params:
    - limit: Max number of executions to return (default: 20)
    - entity_type: Filter by entity type (optional)
    - success: Filter by success status (optional, 'true' or 'false')
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    limit = int(request.query_params.get('limit', 20))

    executions = BottleneckRuleExecution.objects.select_related(
        'rule', 'triggered_by'
    ).order_by('-started_at')

    # Apply filters
    entity_type = request.query_params.get('entity_type')
    if entity_type:
        executions = executions.filter(rule__entity_type=entity_type)

    success_filter = request.query_params.get('success')
    if success_filter is not None:
        executions = executions.filter(success=success_filter.lower() == 'true')

    executions = executions[:limit]

    serializer = BottleneckRuleExecutionListSerializer(executions, many=True)
    return Response(serializer.data)
