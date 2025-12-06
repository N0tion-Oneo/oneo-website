from django.contrib import admin
from .models import Skill, Industry, CandidateProfile


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'slug', 'is_active', 'created_at']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['category', 'name']


@admin.register(Industry)
class IndustryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['name']


@admin.register(CandidateProfile)
class CandidateProfileAdmin(admin.ModelAdmin):
    list_display = [
        'user',
        'professional_title',
        'seniority',
        'location',
        'visibility',
        'profile_completeness',
        'updated_at',
    ]
    list_filter = ['seniority', 'work_preference', 'visibility', 'country']
    search_fields = [
        'user__email',
        'user__first_name',
        'user__last_name',
        'professional_title',
        'city',
        'country',
    ]
    readonly_fields = ['profile_completeness', 'created_at', 'updated_at', 'slug']
    filter_horizontal = ['industries']

    fieldsets = (
        ('User', {
            'fields': ('user', 'slug')
        }),
        ('Professional Info', {
            'fields': (
                'professional_title',
                'headline',
                'seniority',
                'professional_summary',
                'years_of_experience',
            )
        }),
        ('Location', {
            'fields': ('city', 'country', 'region')
        }),
        ('Work Preferences', {
            'fields': (
                'work_preference',
                'willing_to_relocate',
                'preferred_locations',
            )
        }),
        ('Compensation', {
            'fields': (
                'salary_expectation_min',
                'salary_expectation_max',
                'salary_currency',
                'notice_period_days',
            )
        }),
        ('Portfolio & Resume', {
            'fields': ('portfolio_links', 'resume_url')
        }),
        ('Industries', {
            'fields': ('industries',)
        }),
        ('Visibility', {
            'fields': ('visibility', 'profile_completeness')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
