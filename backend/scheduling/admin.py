from django.contrib import admin
from .models import UserCalendarConnection


@admin.register(UserCalendarConnection)
class UserCalendarConnectionAdmin(admin.ModelAdmin):
    list_display = ['user', 'provider', 'provider_email', 'is_active', 'created_at']
    list_filter = ['provider', 'is_active']
    search_fields = ['user__email', 'provider_email']
    readonly_fields = ['id', 'created_at', 'updated_at']
