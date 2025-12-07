from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, RecruiterProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'role', 'is_verified', 'is_active')
    list_filter = ('role', 'is_verified', 'is_active', 'is_staff')
    search_fields = ('email', 'first_name', 'last_name', 'phone')
    ordering = ('-date_joined',)

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('phone', 'avatar', 'role', 'is_verified', 'verification_token'),
        }),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Info', {
            'fields': ('email', 'first_name', 'last_name', 'phone', 'role'),
        }),
    )


@admin.register(RecruiterProfile)
class RecruiterProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'professional_title', 'city', 'country', 'years_of_experience', 'updated_at')
    list_filter = ('industries', 'country')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'professional_title', 'city__name', 'country__name')
    filter_horizontal = ('industries',)
    readonly_fields = ('id', 'created_at', 'updated_at')

    fieldsets = (
        (None, {
            'fields': ('id', 'user'),
        }),
        ('Professional Info', {
            'fields': ('professional_title', 'bio', 'linkedin_url', 'years_of_experience'),
        }),
        ('Location', {
            'fields': ('country', 'city', 'timezone'),
        }),
        ('Specializations', {
            'fields': ('industries',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
