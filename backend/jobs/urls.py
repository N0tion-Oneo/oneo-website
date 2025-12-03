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

    # Public single job by slug (must be last - catches any remaining slug)
    path('<slug:slug>/', views.get_job, name='get-job'),
]
