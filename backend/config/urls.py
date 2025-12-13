"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from cms import views as cms_views

urlpatterns = [
    path('admin/', admin.site.urls),

    # API v1 routes
    path('api/v1/', include('api.urls')),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # SEO files at root level (clean URLs)
    path('sitemap.xml', cms_views.sitemap_index, name='sitemap-index'),
    path('sitemap.xsl', cms_views.sitemap_xsl, name='sitemap-xsl'),
    path('<str:sitemap_type>-sitemap.xml', cms_views.sitemap_by_type, name='sitemap-by-type'),
    path('robots.txt', cms_views.robots_txt, name='robots-txt'),
    path('llms.txt', cms_views.llms_txt, name='llms-txt'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
