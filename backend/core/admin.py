from django.contrib import admin
from .models import OnboardingStage, OnboardingHistory, Task


@admin.register(OnboardingStage)
class OnboardingStageAdmin(admin.ModelAdmin):
    list_display = ['name', 'entity_type', 'order', 'color', 'is_terminal', 'is_active']
    list_filter = ['entity_type', 'is_terminal', 'is_active']
    search_fields = ['name', 'slug']
    ordering = ['entity_type', 'order']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(OnboardingHistory)
class OnboardingHistoryAdmin(admin.ModelAdmin):
    list_display = ['entity_type', 'entity_id', 'from_stage', 'to_stage', 'changed_by', 'created_at']
    list_filter = ['entity_type', 'created_at']
    search_fields = ['entity_id']
    ordering = ['-created_at']
    readonly_fields = ['created_at']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'entity_type', 'entity_id', 'priority', 'status', 'due_date', 'assigned_to', 'created_at']
    list_filter = ['entity_type', 'priority', 'status', 'due_date']
    search_fields = ['title', 'description', 'entity_id']
    ordering = ['due_date', '-priority', '-created_at']
    readonly_fields = ['id', 'created_at', 'updated_at', 'completed_at']
    raw_id_fields = ['assigned_to', 'created_by']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Entity', {
            'fields': ('entity_type', 'entity_id')
        }),
        ('Task Details', {
            'fields': ('title', 'description', 'priority', 'status', 'due_date')
        }),
        ('Assignment', {
            'fields': ('assigned_to', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )
