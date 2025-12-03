from django.contrib import admin
from .models import Company, CompanyUser


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'industry', 'company_size', 'headquarters_location', 'is_published', 'created_at']
    list_filter = ['is_published', 'company_size', 'funding_stage', 'industry']
    search_fields = ['name', 'tagline', 'description']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'slug', 'logo', 'tagline', 'description')
        }),
        ('Details', {
            'fields': ('industry', 'company_size', 'founded_year', 'funding_stage')
        }),
        ('URLs', {
            'fields': ('website_url', 'linkedin_url')
        }),
        ('Location', {
            'fields': ('headquarters_city', 'headquarters_country', 'locations')
        }),
        ('Culture', {
            'fields': ('culture_description', 'values', 'benefits')
        }),
        ('Tech & Process', {
            'fields': ('tech_stack', 'interview_process', 'remote_work_policy')
        }),
        ('Status', {
            'fields': ('is_published', 'created_at', 'updated_at')
        }),
    )


@admin.register(CompanyUser)
class CompanyUserAdmin(admin.ModelAdmin):
    list_display = ['user', 'company', 'role', 'is_active', 'joined_at']
    list_filter = ['role', 'is_active', 'company']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'company__name']
    readonly_fields = ['joined_at']
    raw_id_fields = ['user', 'company', 'invited_by']
