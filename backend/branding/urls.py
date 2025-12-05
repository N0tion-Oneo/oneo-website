from django.urls import path
from . import views

urlpatterns = [
    # Public endpoint (no auth)
    path('public/', views.get_public_branding, name='public-branding'),

    # Admin endpoints
    path('', views.get_branding_settings, name='get-branding'),
    path('update/', views.update_branding_settings, name='update-branding'),
    path('reset/', views.reset_branding_settings, name='reset-branding'),
]
