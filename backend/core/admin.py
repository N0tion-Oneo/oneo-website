from django.contrib import admin
from .models import OnboardingStage, OnboardingHistory


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
