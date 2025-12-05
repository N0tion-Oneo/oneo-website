from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.paginator import Paginator

from api.permissions import IsAdmin, IsRecruiterOrAdmin
from .models import Notification, NotificationTemplate, NotificationType
from .serializers import (
    NotificationSerializer,
    NotificationListSerializer,
    MarkNotificationReadSerializer,
    AdminNotificationSerializer,
    AdminNotificationListSerializer,
    SendNotificationSerializer,
    BroadcastNotificationSerializer,
    BulkDeleteSerializer,
    NotificationTemplateSerializer,
    NotificationTemplateListSerializer,
)
from .services.notification_service import NotificationService

User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    """
    List notifications for the current user.
    """
    notifications = Notification.objects.filter(
        recipient=request.user
    ).order_by('-sent_at')

    # Filter by read status
    is_read = request.query_params.get('is_read')
    if is_read is not None:
        notifications = notifications.filter(is_read=is_read.lower() == 'true')

    # Limit
    limit = request.query_params.get('limit', 50)
    notifications = notifications[:int(limit)]

    serializer = NotificationListSerializer(notifications, many=True)

    # Also return unread count
    unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()

    return Response({
        'notifications': serializer.data,
        'unread_count': unread_count,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notification(request, notification_id):
    """
    Get a single notification and mark it as read.
    """
    try:
        notification = Notification.objects.get(id=notification_id, recipient=request.user)
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

    # Mark as read
    notification.mark_as_read()

    return Response(NotificationSerializer(notification).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notifications_read(request):
    """
    Mark notification(s) as read.
    If notification_ids is empty or not provided, marks all as read.
    """
    serializer = MarkNotificationReadSerializer(data=request.data)
    if serializer.is_valid():
        notification_ids = serializer.validated_data.get('notification_ids', [])

        if notification_ids:
            Notification.objects.filter(
                id__in=notification_ids,
                recipient=request.user,
                is_read=False
            ).update(is_read=True, read_at=timezone.now())
        else:
            Notification.objects.filter(
                recipient=request.user,
                is_read=False
            ).update(is_read=True, read_at=timezone.now())

        unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({'unread_count': unread_count})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unread_count(request):
    """
    Get the count of unread notifications.
    """
    unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
    return Response({'unread_count': unread_count})


# =============================================================================
# Admin Endpoints
# =============================================================================

@api_view(['GET'])
@permission_classes([IsRecruiterOrAdmin])
def search_users(request):
    """
    Search users for notification recipient selection.
    Returns id, email, first_name, last_name, role.
    """
    search = request.query_params.get('search', '').strip()
    role_filter = request.query_params.get('role')
    limit = min(int(request.query_params.get('limit', 20)), 100)

    users = User.objects.filter(is_active=True).order_by('email')

    if search:
        users = users.filter(email__icontains=search) | users.filter(
            first_name__icontains=search
        ) | users.filter(last_name__icontains=search)

    if role_filter:
        users = users.filter(role=role_filter)

    users = users[:limit]

    result = [
        {
            'id': u.id,
            'email': u.email,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'full_name': f"{u.first_name} {u.last_name}".strip() or u.email,
            'role': u.role,
        }
        for u in users
    ]

    return Response(result)


@api_view(['GET'])
@permission_classes([IsRecruiterOrAdmin])
def admin_list_notifications(request):
    """
    List all notifications with filters and pagination (admin only).
    """
    notifications = Notification.objects.select_related('recipient').order_by('-sent_at')

    # Filters
    notification_type = request.query_params.get('notification_type')
    if notification_type:
        notifications = notifications.filter(notification_type=notification_type)

    channel = request.query_params.get('channel')
    if channel:
        notifications = notifications.filter(channel=channel)

    is_read = request.query_params.get('is_read')
    if is_read is not None:
        notifications = notifications.filter(is_read=is_read.lower() == 'true')

    email_sent = request.query_params.get('email_sent')
    if email_sent is not None:
        notifications = notifications.filter(email_sent=email_sent.lower() == 'true')

    search = request.query_params.get('search')
    if search:
        notifications = notifications.filter(
            recipient__email__icontains=search
        ) | notifications.filter(
            title__icontains=search
        )

    # Pagination
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 20))
    paginator = Paginator(notifications, page_size)
    page_obj = paginator.get_page(page)

    serializer = AdminNotificationListSerializer(page_obj, many=True)

    return Response({
        'results': serializer.data,
        'count': paginator.count,
        'num_pages': paginator.num_pages,
        'page': page,
        'has_next': page_obj.has_next(),
        'has_previous': page_obj.has_previous(),
    })


@api_view(['GET', 'DELETE'])
@permission_classes([IsRecruiterOrAdmin])
def admin_notification_detail(request, notification_id):
    """
    Get or delete a single notification (admin only).
    """
    try:
        notification = Notification.objects.select_related('recipient').get(id=notification_id)
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(AdminNotificationSerializer(notification).data)

    elif request.method == 'DELETE':
        # Only admins can delete
        if not request.user.role == 'admin':
            return Response({'error': 'Only admins can delete notifications'}, status=status.HTTP_403_FORBIDDEN)
        notification.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAdmin])
def admin_bulk_delete(request):
    """
    Bulk delete notifications (admin only).
    """
    serializer = BulkDeleteSerializer(data=request.data)
    if serializer.is_valid():
        notification_ids = serializer.validated_data['notification_ids']
        deleted_count = Notification.objects.filter(id__in=notification_ids).delete()[0]
        return Response({'deleted_count': deleted_count})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsRecruiterOrAdmin])
def admin_send_notification(request):
    """
    Send notification to specific users.
    """
    serializer = SendNotificationSerializer(data=request.data)
    if serializer.is_valid():
        recipient_ids = serializer.validated_data['recipient_ids']
        title = serializer.validated_data['title']
        body = serializer.validated_data['body']
        channel = serializer.validated_data['channel']
        action_url = serializer.validated_data.get('action_url', '')

        # Get recipients
        recipients = User.objects.filter(id__in=recipient_ids, is_active=True)
        if not recipients.exists():
            return Response({'error': 'No valid recipients found'}, status=status.HTTP_400_BAD_REQUEST)

        # Send notifications
        notifications = NotificationService.send_to_users(
            recipients=recipients,
            title=title,
            body=body,
            channel=channel,
            action_url=action_url,
        )

        return Response({
            'sent_count': len(notifications),
            'notifications': AdminNotificationListSerializer(notifications, many=True).data,
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAdmin])
def admin_broadcast(request):
    """
    Broadcast notification to a user group (admin only).
    """
    serializer = BroadcastNotificationSerializer(data=request.data)
    if serializer.is_valid():
        recipient_filter = serializer.validated_data['recipient_filter']
        title = serializer.validated_data['title']
        body = serializer.validated_data['body']
        channel = serializer.validated_data['channel']
        action_url = serializer.validated_data.get('action_url', '')

        # Broadcast
        notifications = NotificationService.broadcast(
            recipient_filter=recipient_filter,
            title=title,
            body=body,
            channel=channel,
            action_url=action_url,
        )

        return Response({
            'sent_count': len(notifications),
            'recipient_filter': recipient_filter,
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Template Endpoints
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsRecruiterOrAdmin])
def list_create_templates(request):
    """
    List all templates or create a new one.
    """
    if request.method == 'GET':
        templates = NotificationTemplate.objects.all()

        # Filter by active status
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            templates = templates.filter(is_active=is_active.lower() == 'true')

        # Filter by custom status
        is_custom = request.query_params.get('is_custom')
        if is_custom is not None:
            templates = templates.filter(is_custom=is_custom.lower() == 'true')

        search = request.query_params.get('search')
        if search:
            templates = templates.filter(name__icontains=search)

        serializer = NotificationTemplateListSerializer(templates, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Only admins can create templates
        if not request.user.role == 'admin':
            return Response({'error': 'Only admins can create templates'}, status=status.HTTP_403_FORBIDDEN)

        serializer = NotificationTemplateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user, is_custom=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsRecruiterOrAdmin])
def template_detail(request, template_id):
    """
    Get, update, or delete a notification template.
    """
    try:
        template = NotificationTemplate.objects.get(id=template_id)
    except NotificationTemplate.DoesNotExist:
        return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(NotificationTemplateSerializer(template).data)

    elif request.method == 'PUT':
        # Only admins can update templates
        if not request.user.role == 'admin':
            return Response({'error': 'Only admins can update templates'}, status=status.HTTP_403_FORBIDDEN)

        serializer = NotificationTemplateSerializer(template, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # Only admins can delete templates
        if not request.user.role == 'admin':
            return Response({'error': 'Only admins can delete templates'}, status=status.HTTP_403_FORBIDDEN)
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
