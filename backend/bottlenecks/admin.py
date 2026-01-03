from django.contrib import admin
from .models import BottleneckRule, BottleneckDetection


@admin.register(BottleneckRule)
class BottleneckRuleAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'entity_type',
        'bottleneck_type',
        'is_active',
        'send_notification',
        'create_task',
        'total_detections',
        'last_run_at',
    ]
    list_filter = [
        'entity_type',
        'bottleneck_type',
        'is_active',
        'send_notification',
        'create_task',
    ]
    search_fields = ['name', 'description']
    readonly_fields = [
        'id',
        'last_run_at',
        'total_detections',
        'total_notifications_sent',
        'total_tasks_created',
        'created_at',
        'updated_at',
    ]
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'entity_type', 'bottleneck_type')
        }),
        ('Detection Configuration', {
            'fields': ('detection_config', 'filter_conditions')
        }),
        ('Actions', {
            'fields': (
                'send_notification', 'notification_config',
                'create_task', 'task_config'
            )
        }),
        ('Settings', {
            'fields': ('is_active', 'run_on_schedule', 'cooldown_hours')
        }),
        ('Statistics', {
            'fields': (
                'last_run_at',
                'total_detections',
                'total_notifications_sent',
                'total_tasks_created'
            ),
            'classes': ('collapse',)
        }),
        ('Audit', {
            'fields': ('id', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(BottleneckDetection)
class BottleneckDetectionAdmin(admin.ModelAdmin):
    list_display = [
        'rule',
        'entity_type',
        'entity_id',
        'notification_sent',
        'task_created',
        'is_resolved',
        'detected_at',
    ]
    list_filter = [
        'rule',
        'entity_type',
        'notification_sent',
        'task_created',
        'is_resolved',
        'detected_at',
    ]
    search_fields = ['entity_id', 'rule__name']
    readonly_fields = [
        'id',
        'rule',
        'entity_type',
        'entity_id',
        'detection_data',
        'notification_sent',
        'notification',
        'task_created',
        'task',
        'detected_at',
    ]
    date_hierarchy = 'detected_at'
