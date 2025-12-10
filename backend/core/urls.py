from django.urls import path
from . import views

urlpatterns = [
    # Onboarding stages CRUD
    path('onboarding-stages/', views.list_onboarding_stages, name='list_onboarding_stages'),
    path('onboarding-stages/create/', views.create_onboarding_stage, name='create_onboarding_stage'),
    path('onboarding-stages/<int:stage_id>/', views.update_onboarding_stage, name='update_onboarding_stage'),
    path('onboarding-stages/<int:stage_id>/delete/', views.delete_onboarding_stage, name='delete_onboarding_stage'),
    path('onboarding-stages/reorder/', views.reorder_onboarding_stages, name='reorder_onboarding_stages'),

    # Onboarding history
    path('onboarding-history/<str:entity_type>/<int:entity_id>/', views.get_onboarding_history, name='get_onboarding_history'),

    # Onboarding analytics
    path('analytics/<str:entity_type>/overview/', views.onboarding_overview, name='onboarding_overview'),
    path('analytics/<str:entity_type>/time-in-stage/', views.onboarding_time_in_stage, name='onboarding_time_in_stage'),
    path('analytics/<str:entity_type>/funnel/', views.onboarding_funnel, name='onboarding_funnel'),
    path('analytics/<str:entity_type>/trends/', views.onboarding_trends, name='onboarding_trends'),
    path('analytics/<str:entity_type>/bottlenecks/', views.onboarding_bottlenecks, name='onboarding_bottlenecks'),

    # Recruiter/Admin Dashboard
    path('dashboard/settings/', views.dashboard_settings, name='dashboard_settings'),
    path('dashboard/todays-bookings/', views.todays_bookings, name='todays_bookings'),
    path('dashboard/todays-interviews/', views.todays_interviews, name='todays_interviews'),
    path('dashboard/invitations/', views.invitations_summary, name='invitations_summary'),
    path('dashboard/new-applications/', views.new_applications, name='new_applications'),
    path('dashboard/pipeline/', views.pipeline_overview, name='pipeline_overview'),
    path('dashboard/recent-activity/', views.recent_activity, name='recent_activity'),
    path('dashboard/candidates-attention/', views.candidates_needing_attention, name='candidates_needing_attention'),

    # Client Dashboard
    path('client-dashboard/active-jobs/', views.client_active_jobs, name='client_active_jobs'),
    path('client-dashboard/recent-applications/', views.client_recent_applications, name='client_recent_applications'),
    path('client-dashboard/upcoming-interviews/', views.client_upcoming_interviews, name='client_upcoming_interviews'),
    path('client-dashboard/pipeline/', views.client_pipeline_overview, name='client_pipeline_overview'),
    path('client-dashboard/pending-offers/', views.client_pending_offers, name='client_pending_offers'),
    path('client-dashboard/profile-completion/', views.client_profile_completion, name='client_profile_completion'),
    path('client-dashboard/team-activity/', views.client_team_activity, name='client_team_activity'),
    path('client-dashboard/assigned-recruiter/', views.client_assigned_recruiter, name='client_assigned_recruiter'),
    path('client-dashboard/hiring-metrics/', views.client_hiring_metrics, name='client_hiring_metrics'),
]
