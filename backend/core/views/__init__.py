# Re-export existing views from parent
from core.views_main import (
    list_onboarding_stages,
    create_onboarding_stage,
    update_onboarding_stage,
    delete_onboarding_stage,
    reorder_onboarding_stages,
    get_onboarding_history,
    get_stage_integrations,
)

# Export analytics views
from core.views.analytics import (
    onboarding_overview,
    onboarding_time_in_stage,
    onboarding_funnel,
    onboarding_trends,
    onboarding_bottlenecks,
)

# Export dashboard views (recruiter/admin)
from core.views.dashboard import (
    dashboard_settings,
    todays_bookings,
    todays_interviews,
    invitations_summary,
    new_applications,
    pipeline_overview,
    recent_activity,
    candidates_needing_attention,
)

# Export client dashboard views
from core.views.client_dashboard import (
    client_active_jobs,
    client_recent_applications,
    client_upcoming_interviews,
    client_pipeline_overview,
    client_pending_offers,
    client_profile_completion,
    client_team_activity,
    client_assigned_recruiter,
    client_hiring_metrics,
)
