from rest_framework import serializers
from .models import Notification, NotificationTemplate, NotificationChannel


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications."""
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'notification_type_display',
            'channel',
            'application',
            'stage_instance',
            'title',
            'body',
            'action_url',
            'is_read',
            'read_at',
            'email_sent',
            'email_sent_at',
            'sent_at',
        ]
        read_only_fields = fields


class NotificationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for notification list."""
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'notification_type_display',
            'title',
            'body',
            'action_url',
            'is_read',
            'sent_at',
        ]
        read_only_fields = fields


class MarkNotificationReadSerializer(serializers.Serializer):
    """Serializer for marking notification(s) as read."""
    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        help_text='List of notification IDs to mark as read. If empty, marks all as read.'
    )


# =============================================================================
# Admin Serializers
# =============================================================================

class AdminNotificationSerializer(serializers.ModelSerializer):
    """Admin serializer for notifications with recipient info."""
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    channel_display = serializers.CharField(source='get_channel_display', read_only=True)
    recipient_email = serializers.CharField(source='recipient.email', read_only=True)
    recipient_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient',
            'recipient_email',
            'recipient_name',
            'notification_type',
            'notification_type_display',
            'channel',
            'channel_display',
            'application',
            'stage_instance',
            'title',
            'body',
            'action_url',
            'is_read',
            'read_at',
            'email_sent',
            'email_sent_at',
            'email_error',
            'sent_at',
        ]
        read_only_fields = fields

    def get_recipient_name(self, obj):
        if obj.recipient:
            return f"{obj.recipient.first_name} {obj.recipient.last_name}".strip() or obj.recipient.email
        return None


class AdminNotificationListSerializer(serializers.ModelSerializer):
    """Lightweight admin serializer for notification list."""
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    channel_display = serializers.CharField(source='get_channel_display', read_only=True)
    recipient_email = serializers.CharField(source='recipient.email', read_only=True)
    recipient_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient_email',
            'recipient_name',
            'notification_type',
            'notification_type_display',
            'channel',
            'channel_display',
            'title',
            'is_read',
            'email_sent',
            'sent_at',
        ]
        read_only_fields = fields

    def get_recipient_name(self, obj):
        if obj.recipient:
            return f"{obj.recipient.first_name} {obj.recipient.last_name}".strip() or obj.recipient.email
        return None


class SendNotificationSerializer(serializers.Serializer):
    """Serializer for sending targeted notifications."""
    recipient_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text='List of user IDs to send notification to',
    )
    title = serializers.CharField(max_length=200)
    body = serializers.CharField()
    channel = serializers.ChoiceField(
        choices=NotificationChannel.choices,
        default=NotificationChannel.BOTH,
    )
    action_url = serializers.URLField(required=False, allow_blank=True, default='')
    template_id = serializers.UUIDField(required=False, allow_null=True)


class BroadcastNotificationSerializer(serializers.Serializer):
    """Serializer for broadcasting notifications to user groups."""
    RECIPIENT_FILTERS = [
        ('all', 'All Users'),
        ('candidates', 'All Candidates'),
        ('clients', 'All Clients'),
        ('recruiters', 'Recruiters & Admins'),
    ]

    recipient_filter = serializers.ChoiceField(choices=RECIPIENT_FILTERS)
    title = serializers.CharField(max_length=200)
    body = serializers.CharField()
    channel = serializers.ChoiceField(
        choices=NotificationChannel.choices,
        default=NotificationChannel.BOTH,
    )
    action_url = serializers.URLField(required=False, allow_blank=True, default='')


class BulkDeleteSerializer(serializers.Serializer):
    """Serializer for bulk deleting notifications."""
    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        help_text='List of notification IDs to delete',
    )


# =============================================================================
# Template Serializers
# =============================================================================

class NotificationTemplateSerializer(serializers.ModelSerializer):
    """Serializer for notification templates."""
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)

    class Meta:
        model = NotificationTemplate
        fields = [
            'id',
            'name',
            'description',
            'template_type',
            'recipient_type',
            'is_custom',
            'title_template',
            'body_template',
            'email_subject_template',
            'email_body_template',
            'default_channel',
            'is_active',
            'created_by',
            'created_by_email',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_email', 'created_at', 'updated_at']


class NotificationTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for template list."""

    class Meta:
        model = NotificationTemplate
        fields = [
            'id',
            'name',
            'description',
            'template_type',
            'recipient_type',
            'is_custom',
            'default_channel',
            'is_active',
            'updated_at',
        ]
        read_only_fields = fields
