from django.urls import path
from . import views

urlpatterns = [
    # User endpoints (current user's notifications)
    path('', views.list_notifications, name='list-notifications'),
    path('unread-count/', views.get_unread_count, name='get-unread-count'),
    path('mark-read/', views.mark_notifications_read, name='mark-notifications-read'),
    path('<uuid:notification_id>/', views.get_notification, name='get-notification'),

    # Admin endpoints
    path('admin/', views.admin_list_notifications, name='admin-list-notifications'),
    path('admin/users/', views.search_users, name='search-users'),
    path('admin/bulk-delete/', views.admin_bulk_delete, name='admin-bulk-delete'),
    path('admin/send/', views.admin_send_notification, name='admin-send-notification'),
    path('admin/broadcast/', views.admin_broadcast, name='admin-broadcast'),
    path('admin/<uuid:notification_id>/', views.admin_notification_detail, name='admin-notification-detail'),

    # Template endpoints
    path('templates/', views.list_create_templates, name='list-create-templates'),
    path('templates/<uuid:template_id>/', views.template_detail, name='template-detail'),
]
