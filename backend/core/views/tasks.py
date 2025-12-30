from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import UserRole
from core.models import Task, TaskStatus
from core.serializers import (
    TaskSerializer,
    TaskCreateSerializer,
    TaskUpdateSerializer,
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

        tasks = tasks.select_related('assigned_to', 'created_by')
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
        serializer = TaskUpdateSerializer(task, data=request.data, partial=True)
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

    tasks = tasks.select_related('assigned_to', 'created_by')
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
    ).select_related('assigned_to', 'created_by')

    # Optionally filter to just user's tasks
    my_only = request.query_params.get('my_only', 'false').lower() == 'true'
    if my_only:
        tasks = tasks.filter(assigned_to=request.user)

    serializer = TaskSerializer(tasks, many=True)
    return Response(serializer.data)
