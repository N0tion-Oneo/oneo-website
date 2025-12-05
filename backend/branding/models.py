import uuid
import os
from django.db import models
from django.conf import settings as django_settings


class BrandingSettings(models.Model):
    """
    Singleton model for application-wide branding configuration.
    Used for emails, PDFs, and other branded content.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Company Information
    company_name = models.CharField(
        max_length=100,
        default='Oneo',
        help_text='Company/platform name',
    )
    tagline = models.CharField(
        max_length=200,
        default='Recruitment Made Simple',
        blank=True,
        help_text='Company tagline or slogan',
    )

    # Logo - File uploads (preferred)
    logo = models.ImageField(
        upload_to='branding/',
        blank=True,
        null=True,
        help_text='Upload main logo (recommended: PNG with transparent background)',
    )
    logo_dark = models.ImageField(
        upload_to='branding/',
        blank=True,
        null=True,
        help_text='Upload logo for dark backgrounds',
    )
    favicon = models.ImageField(
        upload_to='branding/',
        blank=True,
        null=True,
        help_text='Upload favicon (recommended: .ico or .png, 32x32 or 16x16)',
    )

    # Logo - URL fallbacks (if no file uploaded)
    logo_url = models.URLField(
        blank=True,
        help_text='URL to main logo (used if no file uploaded)',
    )
    logo_dark_url = models.URLField(
        blank=True,
        help_text='URL to logo for dark backgrounds (used if no file uploaded)',
    )
    favicon_url = models.URLField(
        blank=True,
        help_text='URL to favicon (used if no file uploaded)',
    )

    # Typography
    font_family = models.CharField(
        max_length=200,
        default='Poppins',
        help_text='Primary font family name (e.g., Poppins, Inter, Roboto)',
    )

    # Brand Colors - Primary
    primary_color = models.CharField(
        max_length=7,
        default='#003E49',
        help_text='Primary brand color (hex)',
    )
    primary_color_dark = models.CharField(
        max_length=7,
        default='#002A32',
        help_text='Primary color - dark variant (hex)',
    )
    primary_color_light = models.CharField(
        max_length=7,
        default='#0D646D',
        help_text='Primary color - light variant (hex)',
    )

    # Brand Colors - Secondary
    secondary_color = models.CharField(
        max_length=7,
        default='#0D646D',
        help_text='Secondary brand color (hex)',
    )
    secondary_color_dark = models.CharField(
        max_length=7,
        default='#064852',
        help_text='Secondary color - dark variant (hex)',
    )
    secondary_color_light = models.CharField(
        max_length=7,
        default='#1A7A88',
        help_text='Secondary color - light variant (hex)',
    )

    # Brand Colors - Accent
    accent_color = models.CharField(
        max_length=7,
        default='#FF7B55',
        help_text='Accent/highlight color (hex)',
    )
    accent_color_dark = models.CharField(
        max_length=7,
        default='#E65A35',
        help_text='Accent color - dark variant (hex)',
    )
    accent_color_light = models.CharField(
        max_length=7,
        default='#FFAB97',
        help_text='Accent color - light variant (hex)',
    )

    # Status Colors
    success_color = models.CharField(
        max_length=7,
        default='#10b981',
        help_text='Success state color (hex)',
    )
    warning_color = models.CharField(
        max_length=7,
        default='#f97316',
        help_text='Warning state color (hex)',
    )
    error_color = models.CharField(
        max_length=7,
        default='#ef4444',
        help_text='Error state color (hex)',
    )

    # Email-specific settings
    email_background_color = models.CharField(
        max_length=7,
        default='#f5f5f5',
        help_text='Email background color (hex)',
    )
    email_header_background = models.CharField(
        max_length=7,
        default='#fafafa',
        help_text='Email header background color (hex)',
    )
    email_footer_text = models.TextField(
        default='If you have any questions, please contact the hiring team directly.',
        blank=True,
        help_text='Custom footer text for emails',
    )

    # Social Links
    website_url = models.URLField(
        blank=True,
        help_text='Company website URL',
    )
    facebook_url = models.URLField(blank=True)
    twitter_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True)

    # Contact Information
    support_email = models.EmailField(
        blank=True,
        help_text='Support email address',
    )
    contact_phone = models.CharField(
        max_length=20,
        blank=True,
        help_text='Contact phone number',
    )
    address = models.TextField(
        blank=True,
        help_text='Company address',
    )

    # Legal
    privacy_policy_url = models.URLField(
        blank=True,
        help_text='Link to privacy policy',
    )
    terms_of_service_url = models.URLField(
        blank=True,
        help_text='Link to terms of service',
    )

    # Advanced
    custom_css = models.TextField(
        blank=True,
        help_text='Custom CSS for emails (advanced)',
    )

    # Email Template - Single source of truth for email base template
    email_base_template = models.TextField(
        default='''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{{ branding.company_name|default:"Oneo" }}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        /* Reset styles */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }

        /* Base styles */
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: {{ branding.background_color|default:"#f5f5f5" }};
            width: 100% !important;
            height: 100% !important;
        }
        .email-wrapper {
            width: 100%;
            background-color: {{ branding.background_color|default:"#f5f5f5" }};
            padding: 40px 20px;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            overflow: hidden;
        }
        .header {
            text-align: center;
            padding: 32px 32px 24px 32px;
            border-bottom: 1px solid #eaeaea;
            background-color: {{ branding.header_background|default:"#fafafa" }};
        }
        .logo {
            font-size: 28px;
            font-weight: 700;
            color: {{ branding.primary_color|default:"#111111" }};
            letter-spacing: -0.5px;
        }
        .logo a {
            color: {{ branding.primary_color|default:"#111111" }};
            text-decoration: none;
        }
        .logo img {
            max-height: 50px;
            width: auto;
        }
        .tagline {
            font-size: 13px;
            color: #666666;
            margin-top: 4px;
        }
        .content {
            padding: 32px;
        }
        h1 {
            color: {{ branding.primary_color|default:"#111111" }};
            font-size: 22px;
            font-weight: 600;
            margin: 0 0 20px 0;
            line-height: 1.3;
        }
        h2 {
            color: #333333;
            font-size: 16px;
            font-weight: 600;
            margin: 28px 0 12px 0;
        }
        p {
            margin: 0 0 16px 0;
            color: #555555;
            font-size: 15px;
        }
        a {
            color: {{ branding.secondary_color|default:"#0066cc" }};
        }
        .button {
            display: inline-block;
            padding: 14px 28px;
            background-color: {{ branding.primary_color|default:"#111111" }};
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            font-size: 15px;
            margin: 8px 0;
            transition: background-color 0.2s;
        }
        .button:hover {
            opacity: 0.9;
        }
        .button-secondary {
            background-color: #ffffff;
            color: {{ branding.primary_color|default:"#111111" }} !important;
            border: 2px solid {{ branding.primary_color|default:"#111111" }};
        }
        .button-success {
            background-color: {{ branding.success_color|default:"#10b981" }};
        }
        .details {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .details-row {
            display: flex;
            margin-bottom: 12px;
            font-size: 14px;
        }
        .details-row:last-child {
            margin-bottom: 0;
        }
        .details-label {
            font-weight: 600;
            color: #666666;
            width: 130px;
            flex-shrink: 0;
        }
        .details-value {
            color: #333333;
        }
        .highlight {
            background-color: #eff6ff;
            border-left: 4px solid {{ branding.secondary_color|default:"#3b82f6" }};
            padding: 16px 20px;
            margin: 20px 0;
            border-radius: 0 6px 6px 0;
        }
        .highlight p {
            margin: 0;
            color: #1e40af;
        }
        .warning {
            background-color: #fff7ed;
            border-left: 4px solid {{ branding.warning_color|default:"#f97316" }};
            padding: 16px 20px;
            margin: 20px 0;
            border-radius: 0 6px 6px 0;
        }
        .warning p {
            margin: 0;
            color: #9a3412;
        }
        .success {
            background-color: #ecfdf5;
            border-left: 4px solid {{ branding.success_color|default:"#10b981" }};
            padding: 16px 20px;
            margin: 20px 0;
            border-radius: 0 6px 6px 0;
        }
        .success p {
            margin: 0;
            color: #065f46;
        }
        .error {
            background-color: #fef2f2;
            border-left: 4px solid {{ branding.error_color|default:"#ef4444" }};
            padding: 16px 20px;
            margin: 20px 0;
            border-radius: 0 6px 6px 0;
        }
        .error p {
            margin: 0;
            color: #991b1b;
        }
        .divider {
            height: 1px;
            background-color: #eaeaea;
            margin: 24px 0;
        }
        .footer {
            padding: 24px 32px;
            background-color: {{ branding.header_background|default:"#fafafa" }};
            border-top: 1px solid #eaeaea;
            text-align: center;
        }
        .footer p {
            margin: 0 0 8px 0;
            color: #888888;
            font-size: 13px;
        }
        .footer p:last-child {
            margin-bottom: 0;
        }
        .footer a {
            color: #666666;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .footer-links {
            margin-top: 12px;
        }
        .footer-links a {
            margin: 0 8px;
        }
        .social-links {
            margin: 16px 0;
        }
        .social-links a {
            display: inline-block;
            margin: 0 8px;
            color: #666666;
        }
        .preheader {
            display: none !important;
            visibility: hidden;
            opacity: 0;
            color: transparent;
            height: 0;
            width: 0;
            max-height: 0;
            max-width: 0;
            overflow: hidden;
            mso-hide: all;
        }

        /* Custom CSS from branding settings */
        {{ branding.custom_css|default:""|safe }}

        /* Responsive styles */
        @media only screen and (max-width: 620px) {
            .email-wrapper {
                padding: 20px 10px;
            }
            .email-container {
                border-radius: 0;
            }
            .content {
                padding: 24px 20px;
            }
            .header {
                padding: 24px 20px 20px 20px;
            }
            .footer {
                padding: 20px;
            }
            h1 {
                font-size: 20px;
            }
            .details-row {
                flex-direction: column;
            }
            .details-label {
                width: 100%;
                margin-bottom: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <!-- Header -->
            <div class="header">
                <div class="logo">
                    {% if branding.logo_url %}
                        <a href="{{ site_url }}"><img src="{{ branding.logo_url }}" alt="{{ branding.company_name|default:'Oneo' }}"></a>
                    {% else %}
                        <a href="{{ site_url }}">{{ branding.company_name|default:"Oneo" }}</a>
                    {% endif %}
                </div>
                {% if branding.tagline %}
                <div class="tagline">{{ branding.tagline }}</div>
                {% endif %}
            </div>

            <!-- Content -->
            <div class="content">
                {{ email_content|safe }}
            </div>

            <!-- Footer -->
            <div class="footer">
                <p>This email was sent by {{ branding.company_name|default:"Oneo" }}.</p>
                {% if branding.footer_text %}
                <p>{{ branding.footer_text }}</p>
                {% endif %}

                {% if branding.facebook_url or branding.twitter_url or branding.linkedin_url or branding.instagram_url %}
                <div class="social-links">
                    {% if branding.facebook_url %}<a href="{{ branding.facebook_url }}">Facebook</a>{% endif %}
                    {% if branding.twitter_url %}<a href="{{ branding.twitter_url }}">Twitter</a>{% endif %}
                    {% if branding.linkedin_url %}<a href="{{ branding.linkedin_url }}">LinkedIn</a>{% endif %}
                    {% if branding.instagram_url %}<a href="{{ branding.instagram_url }}">Instagram</a>{% endif %}
                </div>
                {% endif %}

                <div class="footer-links">
                    {% if branding.website_url %}
                    <a href="{{ branding.website_url }}">Visit {{ branding.company_name|default:"Oneo" }}</a> |
                    {% else %}
                    <a href="{{ site_url }}">Visit {{ branding.company_name|default:"Oneo" }}</a> |
                    {% endif %}
                    <a href="{{ site_url }}/settings/notifications">Email Preferences</a>
                    {% if branding.privacy_policy_url %}
                    | <a href="{{ branding.privacy_policy_url }}">Privacy Policy</a>
                    {% endif %}
                </div>
                <p style="margin-top: 16px; font-size: 12px; color: #aaa;">
                    &copy; {% now "Y" %} {{ branding.company_name|default:"Oneo" }}. All rights reserved.
                </p>
            </div>
        </div>
    </div>
</body>
</html>''',
        help_text='Base HTML template for emails. Use Django template syntax with {{ branding.* }} variables.',
    )

    # Metadata
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_branding_settings',
    )

    class Meta:
        db_table = 'branding_settings'
        verbose_name = 'Branding Settings'
        verbose_name_plural = 'Branding Settings'

    def __str__(self):
        return f"Branding Settings ({self.company_name})"

    @property
    def effective_logo_url(self):
        """Return logo file URL if uploaded, otherwise fall back to URL field."""
        if self.logo:
            return self.logo.url
        return self.logo_url or ''

    @property
    def effective_logo_dark_url(self):
        """Return dark logo file URL if uploaded, otherwise fall back to URL field."""
        if self.logo_dark:
            return self.logo_dark.url
        return self.logo_dark_url or ''

    @property
    def effective_favicon_url(self):
        """Return favicon file URL if uploaded, otherwise fall back to URL field."""
        if self.favicon:
            return self.favicon.url
        return self.favicon_url or ''

    def save(self, *args, **kwargs):
        """Ensure only one instance exists (singleton pattern)."""
        if not self.pk and BrandingSettings.objects.exists():
            # Update existing instead of creating new
            existing = BrandingSettings.objects.first()
            self.pk = existing.pk
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance."""
        settings_obj, created = cls.objects.get_or_create(
            defaults={
                'company_name': 'Oneo',
                'tagline': 'Recruitment Made Simple',
            }
        )
        return settings_obj

    def _get_absolute_media_url(self, url):
        """Convert relative media URL to absolute URL for emails."""
        if not url:
            return ''
        # If already absolute, return as-is
        if url.startswith('http://') or url.startswith('https://'):
            return url
        # Get backend URL from settings (where media files are served)
        from django.conf import settings
        backend_url = getattr(settings, 'BACKEND_URL', 'http://localhost:8000')
        # Ensure no double slashes
        if url.startswith('/') and backend_url.endswith('/'):
            return backend_url[:-1] + url
        elif not url.startswith('/') and not backend_url.endswith('/'):
            return backend_url + '/' + url
        return backend_url + url

    def get_email_context(self):
        """Return context dict for email template rendering."""
        return {
            'branding': {
                'company_name': self.company_name,
                'tagline': self.tagline,
                'logo_url': self._get_absolute_media_url(self.effective_logo_url),
                'logo_dark_url': self._get_absolute_media_url(self.effective_logo_dark_url),
                'font_family': self.font_family,
                # Primary colors
                'primary_color': self.primary_color,
                'primary_color_dark': self.primary_color_dark,
                'primary_color_light': self.primary_color_light,
                # Secondary colors
                'secondary_color': self.secondary_color,
                'secondary_color_dark': self.secondary_color_dark,
                'secondary_color_light': self.secondary_color_light,
                # Accent colors
                'accent_color': self.accent_color,
                'accent_color_dark': self.accent_color_dark,
                'accent_color_light': self.accent_color_light,
                # Status colors
                'success_color': self.success_color,
                'warning_color': self.warning_color,
                'error_color': self.error_color,
                # Email specific
                'background_color': self.email_background_color,
                'header_background': self.email_header_background,
                'footer_text': self.email_footer_text,
                # Links
                'website_url': self.website_url,
                'facebook_url': self.facebook_url,
                'twitter_url': self.twitter_url,
                'linkedin_url': self.linkedin_url,
                'instagram_url': self.instagram_url,
                'support_email': self.support_email,
                'privacy_policy_url': self.privacy_policy_url,
                'terms_of_service_url': self.terms_of_service_url,
                'custom_css': self.custom_css,
            }
        }

    def has_social_links(self):
        """Check if any social links are configured."""
        return any([
            self.facebook_url,
            self.twitter_url,
            self.linkedin_url,
            self.instagram_url,
        ])

    def get_email_template(self):
        """Get the email base template from database."""
        return self.email_base_template
