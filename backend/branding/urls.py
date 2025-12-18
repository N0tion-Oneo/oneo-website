from django.urls import path
from . import views

urlpatterns = [
    # Public endpoint (no auth)
    path('public/', views.get_public_branding, name='public-branding'),

    # Admin endpoints
    path('', views.get_branding_settings, name='get-branding'),
    path('update/', views.update_branding_settings, name='update-branding'),
    path('reset/', views.reset_branding_settings, name='reset-branding'),

    # Platform company management
    path('platform-company/', views.get_platform_company, name='get-platform-company'),
    path('platform-company/create/', views.create_or_update_platform_company, name='create-platform-company'),
]
