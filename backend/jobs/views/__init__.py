# Re-export all views for backward compatibility
from .jobs import (
    list_jobs,
    get_job,
    list_company_jobs,
    list_all_jobs,
    create_job,
    job_detail,
    publish_job,
    close_job,
    mark_job_filled,
    list_job_interviewers,
)

from .applications import (
    apply_to_job,
    list_my_applications,
    list_all_applications,
    get_application,
    withdraw_application,
    list_job_applications,
    shortlist_application,
    reject_application,
    make_offer,
    accept_offer,
    decline_offer,
    move_to_stage,
    update_application_notes,
    record_application_view,
)

from .stages import (
    list_create_stage_templates,
    stage_template_detail,
    bulk_update_stage_templates,
    reorder_stage_templates,
    list_application_stage_instances,
    get_stage_instance,
    schedule_stage,
    reschedule_stage,
    cancel_stage,
    complete_stage,
    update_stage_feedback,
    reopen_stage,
    assign_assessment,
    submit_assessment,
    move_to_stage_template,
    send_booking_link,
)

from .booking import (
    get_booking_info,
    book_slot,
)

from .activity import (
    log_activity,
    list_application_activities,
    add_activity_note,
)

from .analytics import (
    analytics_overview,
    pipeline_funnel,
    recruiter_performance,
    time_metrics,
    analytics_trends,
)

from .feedback import (
    application_feedback_list,
    feedback_detail,
    stage_feedback_list,
    status_feedback_list,
)

__all__ = [
    # Jobs
    'list_jobs',
    'get_job',
    'list_company_jobs',
    'list_all_jobs',
    'create_job',
    'job_detail',
    'publish_job',
    'close_job',
    'mark_job_filled',
    'list_job_interviewers',
    # Applications
    'apply_to_job',
    'list_my_applications',
    'list_all_applications',
    'get_application',
    'withdraw_application',
    'list_job_applications',
    'shortlist_application',
    'reject_application',
    'make_offer',
    'accept_offer',
    'decline_offer',
    'move_to_stage',
    'update_application_notes',
    'record_application_view',
    # Stages
    'list_create_stage_templates',
    'stage_template_detail',
    'bulk_update_stage_templates',
    'reorder_stage_templates',
    'list_application_stage_instances',
    'get_stage_instance',
    'schedule_stage',
    'reschedule_stage',
    'cancel_stage',
    'complete_stage',
    'update_stage_feedback',
    'reopen_stage',
    'assign_assessment',
    'submit_assessment',
    'move_to_stage_template',
    'send_booking_link',
    # Booking
    'get_booking_info',
    'book_slot',
    # Activity
    'log_activity',
    'list_application_activities',
    'add_activity_note',
    # Analytics
    'analytics_overview',
    'pipeline_funnel',
    'recruiter_performance',
    'time_metrics',
    'analytics_trends',
    # Feedback
    'application_feedback_list',
    'feedback_detail',
    'stage_feedback_list',
    'status_feedback_list',
]
