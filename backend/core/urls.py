from django.urls import path
from . import views
from .views import tasks as task_views
from .views import service_center as service_center_views

urlpatterns = [
    # Onboarding stages CRUD
    path('onboarding-stages/', views.list_onboarding_stages, name='list_onboarding_stages'),
    path('onboarding-stages/create/', views.create_onboarding_stage, name='create_onboarding_stage'),
    path('onboarding-stages/<int:stage_id>/', views.update_onboarding_stage, name='update_onboarding_stage'),
    path('onboarding-stages/<int:stage_id>/delete/', views.delete_onboarding_stage, name='delete_onboarding_stage'),
    path('onboarding-stages/<int:stage_id>/integrations/', views.get_stage_integrations, name='get_stage_integrations'),
    path('onboarding-stages/reorder/', views.reorder_onboarding_stages, name='reorder_onboarding_stages'),

    # Onboarding history
    path('onboarding-history/<str:entity_type>/<int:entity_id>/', views.get_onboarding_history, name='get_onboarding_history'),

    # Task Analytics API (must come BEFORE onboarding analytics to avoid URL conflict)
    path('analytics/tasks/overview/', task_views.task_analytics_overview, name='task_analytics_overview'),
    path('analytics/tasks/trends/', task_views.task_analytics_trends, name='task_analytics_trends'),
    path('analytics/tasks/by-assignee/', task_views.task_analytics_by_assignee, name='task_analytics_by_assignee'),
    path('analytics/tasks/bottlenecks/', task_views.task_analytics_bottlenecks, name='task_analytics_bottlenecks'),

    # Onboarding analytics (generic entity_type patterns must come AFTER specific patterns)
    path('analytics/<str:entity_type>/overview/', views.onboarding_overview, name='onboarding_overview'),
    path('analytics/<str:entity_type>/time-in-stage/', views.onboarding_time_in_stage, name='onboarding_time_in_stage'),
    path('analytics/<str:entity_type>/funnel/', views.onboarding_funnel, name='onboarding_funnel'),
    path('analytics/<str:entity_type>/trends/', views.onboarding_trends, name='onboarding_trends'),
    path('analytics/<str:entity_type>/bottlenecks/', views.onboarding_bottlenecks, name='onboarding_bottlenecks'),

    # Recruiter/Admin Dashboard
    path('dashboard/todays-bookings/', views.todays_bookings, name='todays_bookings'),
    path('dashboard/todays-interviews/', views.todays_interviews, name='todays_interviews'),
    path('dashboard/invitations/', views.invitations_summary, name='invitations_summary'),
    path('dashboard/new-applications/', views.new_applications, name='new_applications'),
    path('dashboard/pipeline/', views.pipeline_overview, name='pipeline_overview'),
    path('dashboard/recent-activity/', views.recent_activity, name='recent_activity'),

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

    # Tasks API
    path('tasks/', task_views.task_list_create, name='task_list_create'),
    path('tasks/my-tasks/', task_views.my_tasks, name='my_tasks'),
    path('tasks/overdue/', task_views.overdue_tasks, name='overdue_tasks'),
    path('tasks/<uuid:task_id>/', task_views.task_detail, name='task_detail'),
    path('tasks/<uuid:task_id>/complete/', task_views.task_complete, name='task_complete'),
    path('tasks/<uuid:task_id>/activities/', task_views.task_activities, name='task_activities'),
    path('tasks/<uuid:task_id>/notes/', task_views.task_notes, name='task_notes'),
    path('tasks/<uuid:task_id>/notes/<uuid:note_id>/', task_views.task_note_delete, name='task_note_delete'),

    # Timeline API (aggregate)
    path('timeline/<str:entity_type>/<str:entity_id>/', service_center_views.timeline_list, name='timeline_list'),
    path('timeline/<str:entity_type>/<str:entity_id>/note/', service_center_views.timeline_add_note, name='timeline_add_note'),
    path('timeline/<str:entity_type>/<str:entity_id>/call/', service_center_views.timeline_log_call, name='timeline_log_call'),

    # Service Center API
    path('service-center/<str:entity_type>/<str:entity_id>/', service_center_views.service_center_data, name='service_center_data'),
]
