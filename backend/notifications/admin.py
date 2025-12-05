from django.contrib import admin
from .models import Notification, NotificationTemplate


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'recipient', 'notification_type', 'title', 'is_read', 'email_sent', 'sent_at']
    list_filter = ['notification_type', 'channel', 'is_read', 'email_sent']
    search_fields = ['recipient__email', 'title', 'body']
    readonly_fields = ['id', 'sent_at', 'read_at', 'email_sent_at']
    ordering = ['-sent_at']


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'template_type', 'is_custom', 'default_channel', 'is_active', 'updated_at']
    list_filter = ['template_type', 'is_custom', 'is_active', 'default_channel']
    search_fields = ['name', 'description', 'title_template', 'body_template']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['name']
