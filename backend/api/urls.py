from django.urls import path, include
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('hello/', views.hello_world, name='hello_world'),

    # Authentication endpoints
    path('auth/', include('authentication.urls')),

    # Candidates endpoints (skills, industries, profiles)
    path('', include('candidates.urls')),

    # Companies endpoints
    path('companies/', include('companies.urls')),

    # Jobs endpoints
    path('jobs/', include('jobs.urls')),

    # Scheduling endpoints (calendar integration)
    path('scheduling/', include('scheduling.urls')),

    # Notifications endpoints
    path('notifications/', include('notifications.urls')),

    # Branding settings
    path('branding/', include('branding.urls')),

    # Resume parser
    path('resume/', include('resume_parser.urls')),

    # Users endpoints (recruiter profiles)
    path('', include('users.urls')),

    # Core endpoints (onboarding stages)
    path('', include('core.urls')),

    # CMS endpoints (pages, blog, faqs, glossary, case studies)
    path('cms/', include('cms.urls')),

    # Feed endpoints (private content stream)
    path('feed/', include('feed.urls')),

    # Subscriptions endpoints (billing, pricing, invoices)
    path('', include('subscriptions.urls')),

    # Integrations endpoints (Xero, etc.)
    path('integrations/', include('integrations.urls')),

    # Automations endpoints (webhooks, workflows)
    path('webhooks/', include('automations.urls')),
]
