# Re-export existing views from parent
from core.views_main import (
    list_onboarding_stages,
    create_onboarding_stage,
    update_onboarding_stage,
    delete_onboarding_stage,
    reorder_onboarding_stages,
    get_onboarding_history,
)

# Export analytics views
from core.views.analytics import (
    onboarding_overview,
    onboarding_time_in_stage,
    onboarding_funnel,
    onboarding_trends,
    onboarding_bottlenecks,
)

# Export dashboard views
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
