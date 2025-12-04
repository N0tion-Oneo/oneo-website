from django.urls import path
from . import views

urlpatterns = [
    # Calendar connections
    path('connections/', views.list_calendar_connections, name='list_calendar_connections'),

    # OAuth flow
    path('auth/<str:provider>/', views.initiate_calendar_oauth, name='initiate_calendar_oauth'),
    path('auth/<str:provider>/callback/', views.calendar_oauth_callback, name='calendar_oauth_callback'),
    path('disconnect/<str:provider>/', views.disconnect_calendar, name='disconnect_calendar'),

    # Calendar settings
    path('<str:provider>/calendars/', views.list_available_calendars, name='list_available_calendars'),
    path('<str:provider>/settings/', views.update_calendar_settings, name='update_calendar_settings'),
]
