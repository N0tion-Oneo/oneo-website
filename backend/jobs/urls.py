from django.urls import path
from . import views

app_name = 'jobs'

urlpatterns = [
    # Public endpoints
    path('', views.list_jobs, name='list-jobs'),

    # Admin/Recruiter endpoints (must come before slug pattern)
    path('all/', views.list_all_jobs, name='list-all-jobs'),

    # Company management endpoints (must come before slug pattern)
    path('my/', views.list_company_jobs, name='list-company-jobs'),
    path('create/', views.create_job, name='create-job'),
    path('<uuid:job_id>/detail/', views.job_detail, name='job-detail'),
    path('<uuid:job_id>/publish/', views.publish_job, name='publish-job'),
    path('<uuid:job_id>/close/', views.close_job, name='close-job'),
    path('<uuid:job_id>/filled/', views.mark_job_filled, name='mark-job-filled'),

    # Application endpoints
    path('applications/', views.apply_to_job, name='apply-to-job'),
    path('applications/my/', views.list_my_applications, name='list-my-applications'),
    path('applications/<uuid:application_id>/', views.get_application, name='get-application'),
    path('applications/<uuid:application_id>/withdraw/', views.withdraw_application, name='withdraw-application'),
    path('applications/<uuid:application_id>/advance/', views.advance_application, name='advance-application'),
    path('applications/<uuid:application_id>/shortlist/', views.shortlist_application, name='shortlist-application'),
    path('applications/<uuid:application_id>/reject/', views.reject_application, name='reject-application'),
    path('applications/<uuid:application_id>/offer/', views.make_offer, name='make-offer'),
    path('applications/<uuid:application_id>/accept/', views.accept_offer, name='accept-offer'),
    path('applications/<uuid:application_id>/move/', views.move_to_stage, name='move-to-stage'),
    path('applications/<uuid:application_id>/notes/', views.update_application_notes, name='update-application-notes'),
    path('<uuid:job_id>/applications/', views.list_job_applications, name='list-job-applications'),

    # Public single job by slug (must be last - catches any remaining slug)
    path('<slug:slug>/', views.get_job, name='get-job'),
]
