from django.urls import path
from . import views

app_name = 'jobs'

urlpatterns = [
    # Public endpoints
    path('', views.list_jobs, name='list-jobs'),

    # Analytics endpoints (must come before slug pattern)
    path('analytics/overview/', views.analytics_overview, name='analytics-overview'),
    path('analytics/pipeline-funnel/', views.pipeline_funnel, name='pipeline-funnel'),
    path('analytics/recruiter-performance/', views.recruiter_performance, name='recruiter-performance'),
    path('analytics/time-metrics/', views.time_metrics, name='time-metrics'),
    path('analytics/trends/', views.analytics_trends, name='analytics-trends'),

    # Admin/Recruiter endpoints (must come before slug pattern)
    path('all/', views.list_all_jobs, name='list-all-jobs'),

    # Company management endpoints (must come before slug pattern)
    path('my/', views.list_company_jobs, name='list-company-jobs'),
    path('create/', views.create_job, name='create-job'),
    path('<uuid:job_id>/detail/', views.job_detail, name='job-detail'),
    path('<uuid:job_id>/publish/', views.publish_job, name='publish-job'),
    path('<uuid:job_id>/close/', views.close_job, name='close-job'),
    path('<uuid:job_id>/filled/', views.mark_job_filled, name='mark-job-filled'),

    # Interview Stage Template endpoints (job pipeline configuration)
    path('<uuid:job_id>/stages/', views.list_create_stage_templates, name='list-create-stage-templates'),
    path('<uuid:job_id>/stages/bulk/', views.bulk_update_stage_templates, name='bulk-update-stage-templates'),
    path('<uuid:job_id>/stages/reorder/', views.reorder_stage_templates, name='reorder-stage-templates'),
    path('<uuid:job_id>/stages/<uuid:template_id>/', views.stage_template_detail, name='stage-template-detail'),

    # Application endpoints
    path('applications/', views.apply_to_job, name='apply-to-job'),
    path('applications/all/', views.list_all_applications, name='list-all-applications'),
    path('applications/my/', views.list_my_applications, name='list-my-applications'),
    path('applications/<uuid:application_id>/', views.get_application, name='get-application'),
    path('applications/<uuid:application_id>/withdraw/', views.withdraw_application, name='withdraw-application'),
    path('applications/<uuid:application_id>/shortlist/', views.shortlist_application, name='shortlist-application'),
    path('applications/<uuid:application_id>/reject/', views.reject_application, name='reject-application'),
    path('applications/<uuid:application_id>/offer/', views.make_offer, name='make-offer'),
    path('applications/<uuid:application_id>/accept/', views.accept_offer, name='accept-offer'),
    path('applications/<uuid:application_id>/decline/', views.decline_offer, name='decline-offer'),
    path('applications/<uuid:application_id>/move/', views.move_to_stage, name='move-to-stage'),
    path('applications/<uuid:application_id>/notes/', views.update_application_notes, name='update-application-notes'),
    path('applications/<uuid:application_id>/activities/', views.list_application_activities, name='list-application-activities'),
    path('applications/<uuid:application_id>/activities/<uuid:activity_id>/notes/', views.add_activity_note, name='add-activity-note'),
    path('applications/<uuid:application_id>/view/', views.record_application_view, name='record-application-view'),
    path('<uuid:job_id>/applications/', views.list_job_applications, name='list-job-applications'),

    # Application Stage Instance endpoints (candidate scheduling)
    path('applications/<uuid:application_id>/stages/', views.list_application_stage_instances, name='list-application-stage-instances'),
    path('applications/<uuid:application_id>/stages/<uuid:instance_id>/', views.get_stage_instance, name='get-stage-instance'),
    path('applications/<uuid:application_id>/stages/<uuid:instance_id>/schedule/', views.schedule_stage, name='schedule-stage'),
    path('applications/<uuid:application_id>/stages/<uuid:instance_id>/reschedule/', views.reschedule_stage, name='reschedule-stage'),
    path('applications/<uuid:application_id>/stages/<uuid:instance_id>/cancel/', views.cancel_stage, name='cancel-stage'),
    path('applications/<uuid:application_id>/stages/<uuid:instance_id>/complete/', views.complete_stage, name='complete-stage'),
    path('applications/<uuid:application_id>/stages/<uuid:instance_id>/feedback/', views.update_stage_feedback, name='update-stage-feedback'),
    path('applications/<uuid:application_id>/stages/<uuid:instance_id>/reopen/', views.reopen_stage, name='reopen-stage'),
    path('applications/<uuid:application_id>/stages/<uuid:instance_id>/assign-assessment/', views.assign_assessment, name='assign-assessment'),
    path('applications/<uuid:application_id>/stages/<uuid:instance_id>/submit/', views.submit_assessment, name='submit-assessment'),
    path('applications/<uuid:application_id>/stages/<uuid:instance_id>/send-booking-link/', views.send_booking_link, name='send-booking-link'),
    path('applications/<uuid:application_id>/move-to/<uuid:template_id>/', views.move_to_stage_template, name='move-to-stage-template'),

    # Feedback endpoints (threaded comments on stages)
    path('applications/<uuid:application_id>/feedback/', views.application_feedback_list, name='application-feedback-list'),
    path('applications/<uuid:application_id>/feedback/<uuid:feedback_id>/', views.feedback_detail, name='feedback-detail'),
    path('applications/<uuid:application_id>/stages/<uuid:instance_id>/feedbacks/', views.stage_feedback_list, name='stage-feedback-list'),
    path('applications/<uuid:application_id>/status/<str:stage_type>/feedback/', views.status_feedback_list, name='status-feedback-list'),

    # Public booking endpoints (Calendly-like self-scheduling)
    path('booking/<str:token>/', views.get_booking_info, name='get-booking-info'),
    path('booking/<str:token>/book/', views.book_slot, name='book-slot'),

    # NOTE: Notification endpoints moved to notifications app (/api/v1/notifications/)

    # Interviewer endpoints (for scheduling)
    # NOTE: Calendar connection endpoints moved to scheduling app (/api/v1/scheduling/)
    path('<uuid:job_id>/interviewers/', views.list_job_interviewers, name='list-job-interviewers'),

    # Shortlist screening questions (job-level)
    path('<uuid:job_id>/shortlist-questions/', views.list_create_shortlist_questions, name='list-create-shortlist-questions'),
    path('<uuid:job_id>/shortlist-questions/bulk/', views.bulk_update_shortlist_questions, name='bulk-update-shortlist-questions'),

    # Shortlist screening answers (application-level)
    path('applications/<uuid:application_id>/shortlist-answers/', views.list_create_shortlist_answers, name='list-create-shortlist-answers'),
    path('applications/<uuid:application_id>/shortlist-answers/my/', views.my_shortlist_answers, name='my-shortlist-answers'),
    path('applications/<uuid:application_id>/shortlist-summary/', views.shortlist_review_summary, name='shortlist-review-summary'),

    # Replacement request endpoints
    path('applications/<uuid:application_id>/replacement/eligibility/', views.check_eligibility, name='check-replacement-eligibility'),
    path('applications/<uuid:application_id>/replacement/request/', views.submit_replacement_request, name='submit-replacement-request'),

    # Admin replacement request endpoints
    path('replacement-requests/', views.list_replacement_requests, name='list-replacement-requests'),
    path('replacement-requests/<uuid:request_id>/', views.get_replacement_request, name='get-replacement-request'),
    path('replacement-requests/<uuid:request_id>/approve/', views.approve_request, name='approve-replacement-request'),
    path('replacement-requests/<uuid:request_id>/reject/', views.reject_request, name='reject-replacement-request'),

    # Company-specific replacement requests (for company detail page)
    path('companies/<uuid:company_id>/replacement-requests/', views.list_company_replacement_requests, name='list-company-replacement-requests'),

    # Public single job by slug (must be last - catches any remaining slug)
    path('<slug:slug>/', views.get_job, name='get-job'),
]
