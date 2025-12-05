from django.contrib import admin
from .models import BrandingSettings


@admin.register(BrandingSettings)
class BrandingSettingsAdmin(admin.ModelAdmin):
    list_display = ['company_name', 'tagline', 'updated_at']

    fieldsets = (
        ('Company Information', {
            'fields': ('company_name', 'tagline')
        }),
        ('Logo & Images', {
            'fields': ('logo_url', 'logo_dark_url', 'favicon_url')
        }),
        ('Brand Colors', {
            'fields': (
                'primary_color', 'secondary_color',
                'success_color', 'warning_color', 'error_color'
            )
        }),
        ('Email Settings', {
            'fields': ('email_background_color', 'email_header_background', 'email_footer_text')
        }),
        ('Social Links', {
            'fields': ('website_url', 'facebook_url', 'twitter_url', 'linkedin_url', 'instagram_url')
        }),
        ('Contact Information', {
            'fields': ('support_email', 'contact_phone', 'address')
        }),
        ('Legal', {
            'fields': ('privacy_policy_url', 'terms_of_service_url')
        }),
        ('Advanced', {
            'fields': ('custom_css',),
            'classes': ('collapse',)
        }),
    )

    def has_add_permission(self, request):
        # Only allow one instance
        return not BrandingSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of the singleton
        return False
