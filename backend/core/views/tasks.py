from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Count, Avg, F
from django.db.models.functions import TruncDate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from datetime import datetime, timedelta

from users.models import UserRole
from core.models import Task, TaskStatus, TaskActivity, TaskNote
from core.serializers import (
    TaskSerializer,
    TaskCreateSerializer,
    TaskUpdateSerializer,
    TaskActivitySerializer,
    TaskNoteSerializer,
    TaskNoteCreateSerializer,
)


def is_staff_user(user):
    """Check if user is admin or recruiter."""
    return user.role in [UserRole.ADMIN, UserRole.RECRUITER]


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def task_list_create(request):
    """
    GET: List tasks with optional filters.
    POST: Create a new task.

    Query params (GET):
    - entity_type: 'lead' | 'company' | 'candidate'
    - entity_id: ID of the entity
    - status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    - assigned_to: User ID
    - priority: 'low' | 'medium' | 'high' | 'urgent'
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == 'GET':
        tasks = Task.objects.all()

        # Apply filters
        entity_type = request.query_params.get('entity_type')
        if entity_type:
            tasks = tasks.filter(entity_type=entity_type)

        entity_id = request.query_params.get('entity_id')
        if entity_id:
            tasks = tasks.filter(entity_id=entity_id)

        task_status = request.query_params.get('status')
        if task_status:
            tasks = tasks.filter(status=task_status)

        assigned_to = request.query_params.get('assigned_to')
        if assigned_to:
            tasks = tasks.filter(assigned_to_id=assigned_to)

        priority = request.query_params.get('priority')
        if priority:
            tasks = tasks.filter(priority=priority)

        tasks = tasks.select_related('assigned_to', 'created_by').prefetch_related(
            'bottleneck_detections__rule'
        )
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = TaskCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            task = serializer.save()
            return Response(
                TaskSerializer(task).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def task_detail(request, task_id):
    """
    GET: Retrieve a task.
    PATCH: Update a task.
    DELETE: Delete a task.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    task = get_object_or_404(Task, id=task_id)

    if request.method == 'GET':
        serializer = TaskSerializer(task)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        serializer = TaskUpdateSerializer(
            task,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        if serializer.is_valid():
            task = serializer.save()
            return Response(TaskSerializer(task).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def task_complete(request, task_id):
    """Mark a task as completed."""
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    task = get_object_or_404(Task, id=task_id)

    if task.status == TaskStatus.COMPLETED:
        return Response(
            {'error': 'Task is already completed'},
            status=status.HTTP_400_BAD_REQUEST
        )

    task.status = TaskStatus.COMPLETED
    task.completed_at = timezone.now()
    task._current_user = request.user  # For activity logging
    task.save()

    return Response(TaskSerializer(task).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_tasks(request):
    """
    Get tasks assigned to the current user.

    Query params:
    - status: Filter by status (default: pending,in_progress)
    - include_completed: 'true' to include completed tasks
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    tasks = Task.objects.filter(assigned_to=request.user)

    # By default, exclude completed and cancelled unless requested
    include_completed = request.query_params.get('include_completed', 'false').lower() == 'true'
    if not include_completed:
        tasks = tasks.exclude(status__in=[TaskStatus.COMPLETED, TaskStatus.CANCELLED])

    task_status = request.query_params.get('status')
    if task_status:
        tasks = tasks.filter(status=task_status)

    tasks = tasks.select_related('assigned_to', 'created_by').prefetch_related(
        'bottleneck_detections__rule'
    )
    serializer = TaskSerializer(tasks, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overdue_tasks(request):
    """
    Get all overdue tasks.
    Only returns pending or in_progress tasks past their due date.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    today = timezone.now().date()
    tasks = Task.objects.filter(
        due_date__lt=today,
        status__in=[TaskStatus.PENDING, TaskStatus.IN_PROGRESS]
    ).select_related('assigned_to', 'created_by').prefetch_related(
        'bottleneck_detections__rule'
    )

    # Optionally filter to just user's tasks
    my_only = request.query_params.get('my_only', 'false').lower() == 'true'
    if my_only:
        tasks = tasks.filter(assigned_to=request.user)

    serializer = TaskSerializer(tasks, many=True)
    return Response(serializer.data)


# ============================================================================
# Task Activities
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def task_activities(request, task_id):
    """Get activity history for a task."""
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    task = get_object_or_404(Task, id=task_id)
    activities = TaskActivity.objects.filter(task=task).select_related('performed_by')

    serializer = TaskActivitySerializer(activities, many=True)
    return Response(serializer.data)


# ============================================================================
# Task Notes
# ============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def task_notes(request, task_id):
    """
    GET: List notes for a task.
    POST: Add a note to a task.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    task = get_object_or_404(Task, id=task_id)

    if request.method == 'GET':
        notes = TaskNote.objects.filter(task=task).select_related('created_by')
        serializer = TaskNoteSerializer(notes, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        data = request.data.copy()
        data['task'] = str(task.id)
        serializer = TaskNoteCreateSerializer(
            data=data,
            context={'request': request}
        )
        if serializer.is_valid():
            note = serializer.save()
            return Response(
                TaskNoteSerializer(note).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def task_note_delete(request, task_id, note_id):
    """Delete a task note."""
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    note = get_object_or_404(TaskNote, id=note_id, task_id=task_id)

    # Only creator or admin can delete
    if note.created_by != request.user and request.user.role != UserRole.ADMIN:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    note.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# Task Analytics
# ============================================================================

def parse_date_range(request):
    """Parse start_date and end_date from request query params."""
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        else:
            start_date = (timezone.now() - timedelta(days=30)).date()

        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        else:
            end_date = timezone.now().date()

        return start_date, end_date
    except ValueError as e:
        raise ValueError(f"Invalid date format. Use YYYY-MM-DD. Error: {e}")


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def task_analytics_overview(request):
    """
    Get task analytics overview.

    Query params:
    - start_date: YYYY-MM-DD (default: 30 days ago)
    - end_date: YYYY-MM-DD (default: today)

    Returns summary stats:
    - Total tasks created
    - Completed tasks
    - Completion rate
    - Average completion time
    - Overdue tasks
    - Tasks by status
    - Tasks by priority
    - Tasks by entity type
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        start_date, end_date = parse_date_range(request)
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Base queryset for period
        period_tasks = Task.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )

        # All tasks (for current state metrics)
        all_tasks = Task.objects.all()

        # Summary stats
        total_created = period_tasks.count()
        completed_in_period = period_tasks.filter(status=TaskStatus.COMPLETED).count()
        completion_rate = (completed_in_period / total_created * 100) if total_created > 0 else 0

        # Overdue tasks (current)
        today = timezone.now().date()
        overdue_count = all_tasks.filter(
            due_date__lt=today,
            status__in=[TaskStatus.PENDING, TaskStatus.IN_PROGRESS]
        ).count()

        # Average completion time (in days)
        completed_tasks_with_time = Task.objects.filter(
            status=TaskStatus.COMPLETED,
            completed_at__isnull=False
        ).annotate(
            completion_days=F('completed_at') - F('created_at')
        )
        avg_completion_time = None
        if completed_tasks_with_time.exists():
            # Calculate average in Python since extraction varies by DB
            times = []
            for t in completed_tasks_with_time[:1000]:
                if t.completed_at and t.created_at:
                    delta = t.completed_at - t.created_at
                    times.append(delta.total_seconds() / 86400)  # days
            if times:
                avg_completion_time = sum(times) / len(times)

        # Tasks by status (current)
        by_status = list(all_tasks.values('status').annotate(count=Count('id')))

        # Tasks by priority (current)
        by_priority = list(all_tasks.values('priority').annotate(count=Count('id')))

        # Tasks by entity type (current)
        by_entity_type = list(all_tasks.values('entity_type').annotate(count=Count('id')))

        # On-time completion rate
        completed_on_time = Task.objects.filter(
            status=TaskStatus.COMPLETED,
            completed_at__isnull=False,
            due_date__isnull=False
        ).annotate(
            completed_date=TruncDate('completed_at')
        ).filter(
            completed_date__lte=F('due_date')
        ).count()
        total_with_due = Task.objects.filter(
            status=TaskStatus.COMPLETED,
            due_date__isnull=False
        ).count()
        on_time_rate = (completed_on_time / total_with_due * 100) if total_with_due > 0 else None

        return Response({
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
            },
            'summary': {
                'total_created': total_created,
                'completed': completed_in_period,
                'completion_rate': round(completion_rate, 1),
                'avg_completion_time_days': round(avg_completion_time, 1) if avg_completion_time else None,
                'on_time_completion_rate': round(on_time_rate, 1) if on_time_rate else None,
                'overdue_count': overdue_count,
            },
            'by_status': by_status,
            'by_priority': by_priority,
            'by_entity_type': by_entity_type,
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def task_analytics_trends(request):
    """
    Get task trends over time.

    Query params:
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - metric: 'created' | 'completed' (default: 'created')
    - granularity: 'day' | 'week' | 'month' (default: 'day')
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    start_date, end_date = parse_date_range(request)
    metric = request.query_params.get('metric', 'created')
    granularity = request.query_params.get('granularity', 'day')

    if metric == 'completed':
        tasks = Task.objects.filter(
            status=TaskStatus.COMPLETED,
            completed_at__date__gte=start_date,
            completed_at__date__lte=end_date
        ).annotate(date=TruncDate('completed_at'))
    else:
        tasks = Task.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).annotate(date=TruncDate('created_at'))

    data = list(tasks.values('date').annotate(count=Count('id')).order_by('date'))

    # Format dates
    for item in data:
        item['date'] = item['date'].isoformat() if item['date'] else None

    return Response({
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        },
        'metric': metric,
        'granularity': granularity,
        'data': data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def task_analytics_by_assignee(request):
    """
    Get task metrics by assignee.

    Query params:
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    start_date, end_date = parse_date_range(request)

    # Get tasks in period
    period_tasks = Task.objects.filter(
        created_at__date__gte=start_date,
        created_at__date__lte=end_date
    )

    # Aggregate by assignee
    by_assignee = list(
        period_tasks.values(
            'assigned_to',
            'assigned_to__first_name',
            'assigned_to__last_name',
            'assigned_to__email'
        ).annotate(
            total=Count('id'),
            completed=Count('id', filter=Q(status=TaskStatus.COMPLETED)),
            pending=Count('id', filter=Q(status=TaskStatus.PENDING)),
            in_progress=Count('id', filter=Q(status=TaskStatus.IN_PROGRESS)),
        ).order_by('-total')
    )

    # Calculate completion rates and format names
    for item in by_assignee:
        item['assignee_name'] = f"{item['assigned_to__first_name'] or ''} {item['assigned_to__last_name'] or ''}".strip()
        if not item['assignee_name']:
            item['assignee_name'] = item['assigned_to__email'] or 'Unknown'
        item['completion_rate'] = round(
            (item['completed'] / item['total'] * 100) if item['total'] > 0 else 0, 1
        )
        # Clean up extra fields
        del item['assigned_to__first_name']
        del item['assigned_to__last_name']
        del item['assigned_to__email']

    return Response({
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        },
        'assignees': by_assignee,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def task_analytics_bottlenecks(request):
    """
    Identify task bottlenecks - oldest pending tasks, most overdue, etc.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    today = timezone.now().date()

    # Most overdue tasks
    overdue_tasks = Task.objects.filter(
        due_date__lt=today,
        status__in=[TaskStatus.PENDING, TaskStatus.IN_PROGRESS]
    ).order_by('due_date').select_related('assigned_to')[:10]

    overdue_list = []
    for task in overdue_tasks:
        days_overdue = (today - task.due_date).days
        overdue_list.append({
            'id': str(task.id),
            'title': task.title,
            'entity_type': task.entity_type,
            'assigned_to_name': task.assigned_to.get_full_name() or task.assigned_to.email if task.assigned_to else None,
            'due_date': task.due_date.isoformat(),
            'days_overdue': days_overdue,
            'priority': task.priority,
        })

    # Oldest pending tasks (stale)
    stale_tasks = Task.objects.filter(
        status=TaskStatus.PENDING
    ).order_by('created_at').select_related('assigned_to')[:10]

    stale_list = []
    for task in stale_tasks:
        days_pending = (timezone.now() - task.created_at).days
        stale_list.append({
            'id': str(task.id),
            'title': task.title,
            'entity_type': task.entity_type,
            'assigned_to_name': task.assigned_to.get_full_name() or task.assigned_to.email if task.assigned_to else None,
            'created_at': task.created_at.isoformat(),
            'days_pending': days_pending,
            'priority': task.priority,
        })

    # Assignees with most overdue
    overdue_by_assignee = Task.objects.filter(
        due_date__lt=today,
        status__in=[TaskStatus.PENDING, TaskStatus.IN_PROGRESS]
    ).values(
        'assigned_to',
        'assigned_to__first_name',
        'assigned_to__last_name',
        'assigned_to__email'
    ).annotate(
        overdue_count=Count('id')
    ).order_by('-overdue_count')[:5]

    assignee_bottlenecks = []
    for item in overdue_by_assignee:
        name = f"{item['assigned_to__first_name'] or ''} {item['assigned_to__last_name'] or ''}".strip()
        if not name:
            name = item['assigned_to__email'] or 'Unknown'
        assignee_bottlenecks.append({
            'assigned_to': item['assigned_to'],
            'assignee_name': name,
            'overdue_count': item['overdue_count'],
        })

    return Response({
        'most_overdue': overdue_list,
        'stale_tasks': stale_list,
        'assignee_bottlenecks': assignee_bottlenecks,
    })
