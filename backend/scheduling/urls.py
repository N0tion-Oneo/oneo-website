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

    # Meeting Types (for recruiters/admins)
    path('meeting-types/', views.meeting_types_list_create, name='meeting_types_list_create'),
    path('meeting-types/<uuid:meeting_type_id>/', views.meeting_type_detail, name='meeting_type_detail'),

    # Public Booking Pages
    path('book/<slug:booking_slug>/', views.public_recruiter_booking_page, name='public_recruiter_booking_page'),
    path('book/<slug:booking_slug>/<slug:meeting_type_slug>/availability/', views.public_meeting_type_availability, name='public_meeting_type_availability'),
    path('book/<slug:booking_slug>/<slug:meeting_type_slug>/', views.public_create_booking, name='public_create_booking'),

    # Booking Management (for recruiters/admins)
    path('bookings/', views.bookings_list, name='bookings_list'),
    path('bookings/<uuid:booking_id>/', views.booking_detail, name='booking_detail'),
    path('bookings/<uuid:booking_id>/cancel/', views.booking_cancel, name='booking_cancel'),
    path('bookings/<uuid:booking_id>/complete/', views.booking_complete, name='booking_complete'),
    path('bookings/<uuid:booking_id>/no-show/', views.booking_no_show, name='booking_no_show'),

    # Interview Stage Status Updates (for interview bookings from applications)
    path('interviews/<uuid:stage_id>/cancel/', views.interview_cancel, name='interview_cancel'),
    path('interviews/<uuid:stage_id>/complete/', views.interview_complete, name='interview_complete'),
    path('interviews/<uuid:stage_id>/no-show/', views.interview_no_show, name='interview_no_show'),
]
