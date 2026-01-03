"""
Analytics views for recruitment performance reporting.
"""
from datetime import datetime, timedelta
from django.db.models import Count, Q, Avg, F, ExpressionWrapper, DurationField, Min, Max
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from jobs.models import Application, ApplicationStatus, ActivityLog, ActivityType
from users.models import UserRole


def get_date_range(request):
    """Parse start_date and end_date from query params."""
    start_date_str = request.query_params.get('start_date')
    end_date_str = request.query_params.get('end_date')

    # Default to last 30 days
    end_date = timezone.now()
    start_date = end_date - timedelta(days=30)

    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            start_date = timezone.make_aware(start_date) if timezone.is_naive(start_date) else start_date
        except ValueError:
            pass

    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            # End of day
            end_date = end_date.replace(hour=23, minute=59, second=59)
            end_date = timezone.make_aware(end_date) if timezone.is_naive(end_date) else end_date
        except ValueError:
            pass

    return start_date, end_date


def get_filtered_applications(request, start_date, end_date):
    """
    Get applications filtered by user role and optional company_id/job_id.
    """
    user = request.user
    company_id = request.query_params.get('company_id')
    job_id = request.query_params.get('job_id')

    # Base queryset filtered by date
    queryset = Application.objects.filter(
        applied_at__range=(start_date, end_date)
    )

    # Role-based filtering
    if user.role == UserRole.ADMIN:
        # Admins see all, can optionally filter by company
        if company_id:
            queryset = queryset.filter(job__company_id=company_id)
    elif user.role == UserRole.RECRUITER:
        # Recruiters see jobs they created or are assigned to
        queryset = queryset.filter(
            Q(job__created_by=user) | Q(job__assigned_recruiters=user)
        )
    elif user.role == UserRole.CLIENT:
        # Clients see only their company's data
        company_membership = user.company_memberships.first()
        if company_membership:
            queryset = queryset.filter(job__company=company_membership.company)
        else:
            queryset = queryset.none()
    else:
        # Candidates don't have access to analytics
        queryset = queryset.none()

    # Optional job filter
    if job_id:
        queryset = queryset.filter(job_id=job_id)

    return queryset


def get_filtered_activity_logs(request, start_date, end_date):
    """
    Get activity logs filtered by user role.
    """
    user = request.user
    company_id = request.query_params.get('company_id')
    job_id = request.query_params.get('job_id')

    queryset = ActivityLog.objects.filter(
        created_at__range=(start_date, end_date)
    )

    if user.role == UserRole.ADMIN:
        if company_id:
            queryset = queryset.filter(application__job__company_id=company_id)
    elif user.role == UserRole.RECRUITER:
        queryset = queryset.filter(
            Q(application__job__created_by=user) | Q(application__job__assigned_recruiters=user)
        )
    elif user.role == UserRole.CLIENT:
        company_membership = user.company_memberships.first()
        if company_membership:
            queryset = queryset.filter(application__job__company=company_membership.company)
        else:
            queryset = queryset.none()
    else:
        queryset = queryset.none()

    if job_id:
        queryset = queryset.filter(application__job_id=job_id)

    return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_overview(request):
    """
    Get summary analytics overview.

    Query params:
    - start_date: YYYY-MM-DD (default: 30 days ago)
    - end_date: YYYY-MM-DD (default: today)
    - company_id: Filter by company (admin only)

    Returns summary stats and comparison to previous period.
    """
    start_date, end_date = get_date_range(request)

    # Calculate previous period for comparison
    period_length = (end_date - start_date).days
    prev_end_date = start_date
    prev_start_date = prev_end_date - timedelta(days=period_length)

    # Current period applications
    applications = get_filtered_applications(request, start_date, end_date)

    # Previous period for comparison
    prev_applications = get_filtered_applications(request, prev_start_date, prev_end_date)

    # Current period stats
    current_stats = applications.aggregate(
        total_applications=Count('id'),
        total_shortlisted=Count('id', filter=Q(status__in=[
            ApplicationStatus.SHORTLISTED,
            ApplicationStatus.IN_PROGRESS,
            ApplicationStatus.OFFER_MADE,
            ApplicationStatus.OFFER_ACCEPTED,
        ])),
        total_offered=Count('id', filter=Q(status__in=[
            ApplicationStatus.OFFER_MADE,
            ApplicationStatus.OFFER_ACCEPTED,
            ApplicationStatus.OFFER_DECLINED,
        ])),
        total_hired=Count('id', filter=Q(status=ApplicationStatus.OFFER_ACCEPTED)),
    )

    # Calculate time-to-hire for hired candidates
    hired_apps = applications.filter(
        status=ApplicationStatus.OFFER_ACCEPTED,
        offer_accepted_at__isnull=False,
    ).annotate(
        time_to_hire=ExpressionWrapper(
            F('offer_accepted_at') - F('applied_at'),
            output_field=DurationField()
        )
    )

    time_to_hire_agg = hired_apps.aggregate(
        avg_time_to_hire=Avg('time_to_hire'),
    )

    avg_time_to_hire_days = None
    if time_to_hire_agg['avg_time_to_hire']:
        avg_time_to_hire_days = time_to_hire_agg['avg_time_to_hire'].days

    # Conversion rate
    total_apps = current_stats['total_applications'] or 0
    total_hired = current_stats['total_hired'] or 0
    conversion_rate = (total_hired / total_apps * 100) if total_apps > 0 else 0

    # Previous period stats for comparison
    prev_stats = prev_applications.aggregate(
        total_applications=Count('id'),
        total_hired=Count('id', filter=Q(status=ApplicationStatus.OFFER_ACCEPTED)),
    )

    prev_total_apps = prev_stats['total_applications'] or 0
    prev_total_hired = prev_stats['total_hired'] or 0

    # Calculate percentage changes
    def calc_change(current, previous):
        if previous == 0:
            return 100 if current > 0 else 0
        return round((current - previous) / previous * 100, 1)

    return Response({
        'period': {
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
        },
        'summary': {
            'total_applications': total_apps,
            'total_shortlisted': current_stats['total_shortlisted'] or 0,
            'total_offered': current_stats['total_offered'] or 0,
            'total_hired': total_hired,
            'avg_time_to_hire_days': avg_time_to_hire_days,
            'conversion_rate': round(conversion_rate, 2),
        },
        'comparison': {
            'applications_change': calc_change(total_apps, prev_total_apps),
            'hires_change': calc_change(total_hired, prev_total_hired),
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pipeline_funnel(request):
    """
    Get pipeline funnel data.

    Query params:
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - company_id: Filter by company (admin only)
    - job_id: Filter by specific job

    Returns funnel stages with counts and conversion rates.
    """
    start_date, end_date = get_date_range(request)
    applications = get_filtered_applications(request, start_date, end_date)

    # Count by status
    total = applications.count()

    # Applied = all applications
    applied = total

    # Shortlisted = reached shortlisted or beyond (excluding rejected at applied stage)
    shortlisted = applications.filter(
        status__in=[
            ApplicationStatus.SHORTLISTED,
            ApplicationStatus.IN_PROGRESS,
            ApplicationStatus.OFFER_MADE,
            ApplicationStatus.OFFER_ACCEPTED,
            ApplicationStatus.OFFER_DECLINED,
        ]
    ).count()

    # In Progress (interviewing) = has a current stage or is in_progress status
    interviewed = applications.filter(
        Q(status=ApplicationStatus.IN_PROGRESS) |
        Q(current_stage__isnull=False)
    ).count()

    # Offered = reached offer stage
    offered = applications.filter(
        status__in=[
            ApplicationStatus.OFFER_MADE,
            ApplicationStatus.OFFER_ACCEPTED,
            ApplicationStatus.OFFER_DECLINED,
        ]
    ).count()

    # Hired = offer accepted
    hired = applications.filter(
        status=ApplicationStatus.OFFER_ACCEPTED
    ).count()

    # Build funnel data
    funnel = [
        {'stage': 'Applied', 'count': applied, 'percentage': 100},
        {'stage': 'Shortlisted', 'count': shortlisted, 'percentage': round(shortlisted / applied * 100, 1) if applied > 0 else 0},
        {'stage': 'Interviewed', 'count': interviewed, 'percentage': round(interviewed / applied * 100, 1) if applied > 0 else 0},
        {'stage': 'Offered', 'count': offered, 'percentage': round(offered / applied * 100, 1) if applied > 0 else 0},
        {'stage': 'Hired', 'count': hired, 'percentage': round(hired / applied * 100, 1) if applied > 0 else 0},
    ]

    # Conversion rates between stages
    conversion_rates = {
        'applied_to_shortlisted': round(shortlisted / applied * 100, 1) if applied > 0 else 0,
        'shortlisted_to_interviewed': round(interviewed / shortlisted * 100, 1) if shortlisted > 0 else 0,
        'interviewed_to_offered': round(offered / interviewed * 100, 1) if interviewed > 0 else 0,
        'offered_to_hired': round(hired / offered * 100, 1) if offered > 0 else 0,
        'overall': round(hired / applied * 100, 1) if applied > 0 else 0,
    }

    return Response({
        'period': {
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
        },
        'funnel': funnel,
        'conversion_rates': conversion_rates,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recruiter_performance(request):
    """
    Get recruiter performance metrics.

    Query params:
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - recruiter_id: Filter by specific recruiter

    Returns metrics per recruiter: actions, shortlists, offers, conversion rates.
    """
    start_date, end_date = get_date_range(request)
    recruiter_id = request.query_params.get('recruiter_id')

    activity_logs = get_filtered_activity_logs(request, start_date, end_date)

    # Filter to only activities performed by admins or recruiters
    activity_logs = activity_logs.filter(
        performed_by__isnull=False,
        performed_by__role__in=[UserRole.ADMIN, UserRole.RECRUITER],
    )

    # Optionally filter by recruiter
    if recruiter_id:
        activity_logs = activity_logs.filter(performed_by_id=recruiter_id)

    # Aggregate by recruiter
    recruiter_stats = activity_logs.values(
        'performed_by',
        'performed_by__first_name',
        'performed_by__last_name',
        'performed_by__email',
    ).annotate(
        total_actions=Count('id'),
        applications_viewed=Count('id', filter=Q(activity_type=ActivityType.APPLICATION_VIEWED)),
        shortlisted=Count('id', filter=Q(activity_type=ActivityType.SHORTLISTED)),
        interviews_scheduled=Count('id', filter=Q(activity_type=ActivityType.INTERVIEW_SCHEDULED)),
        offers_made=Count('id', filter=Q(activity_type=ActivityType.OFFER_MADE)),
        rejections=Count('id', filter=Q(activity_type=ActivityType.REJECTED)),
    ).order_by('-total_actions')

    # Build response
    recruiters = []
    for stat in recruiter_stats:
        viewed = stat['applications_viewed'] or 0
        shortlisted = stat['shortlisted'] or 0
        offers = stat['offers_made'] or 0

        # Conversion rate: shortlisted / viewed
        conversion_rate = round(shortlisted / viewed * 100, 1) if viewed > 0 else 0

        first_name = stat['performed_by__first_name'] or ''
        last_name = stat['performed_by__last_name'] or ''
        name = f"{first_name} {last_name}".strip() or stat['performed_by__email']

        recruiters.append({
            'id': str(stat['performed_by']),
            'name': name,
            'email': stat['performed_by__email'],
            'actions_count': stat['total_actions'],
            'applications_viewed': viewed,
            'shortlisted': shortlisted,
            'interviews_scheduled': stat['interviews_scheduled'] or 0,
            'offers_made': offers,
            'rejections': stat['rejections'] or 0,
            'conversion_rate': conversion_rate,
        })

    # Calculate totals
    totals = {
        'actions_count': sum(r['actions_count'] for r in recruiters),
        'applications_viewed': sum(r['applications_viewed'] for r in recruiters),
        'shortlisted': sum(r['shortlisted'] for r in recruiters),
        'interviews_scheduled': sum(r['interviews_scheduled'] for r in recruiters),
        'offers_made': sum(r['offers_made'] for r in recruiters),
        'rejections': sum(r['rejections'] for r in recruiters),
    }

    total_viewed = totals['applications_viewed']
    total_shortlisted = totals['shortlisted']
    totals['conversion_rate'] = round(total_shortlisted / total_viewed * 100, 1) if total_viewed > 0 else 0

    return Response({
        'period': {
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
        },
        'recruiters': recruiters,
        'totals': totals,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def time_metrics(request):
    """
    Get time-based metrics.

    Query params:
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - job_id: Filter by specific job

    Returns time-to-hire stats, stage durations, and bottlenecks.
    """
    start_date, end_date = get_date_range(request)
    applications = get_filtered_applications(request, start_date, end_date)

    # Time-to-hire for hired candidates
    hired_apps = applications.filter(
        status=ApplicationStatus.OFFER_ACCEPTED,
        offer_accepted_at__isnull=False,
    ).annotate(
        time_to_hire=ExpressionWrapper(
            F('offer_accepted_at') - F('applied_at'),
            output_field=DurationField()
        )
    )

    time_to_hire_stats = hired_apps.aggregate(
        avg=Avg('time_to_hire'),
        min=Min('time_to_hire'),
        max=Max('time_to_hire'),
    )

    # Convert to days
    def duration_to_days(duration):
        if duration:
            return duration.days
        return None

    time_to_hire = {
        'average_days': duration_to_days(time_to_hire_stats['avg']),
        'min_days': duration_to_days(time_to_hire_stats['min']),
        'max_days': duration_to_days(time_to_hire_stats['max']),
        'count': hired_apps.count(),
    }

    # Time-to-shortlist
    shortlisted_apps = applications.filter(
        shortlisted_at__isnull=False,
    ).annotate(
        time_to_shortlist=ExpressionWrapper(
            F('shortlisted_at') - F('applied_at'),
            output_field=DurationField()
        )
    )

    shortlist_stats = shortlisted_apps.aggregate(avg=Avg('time_to_shortlist'))
    time_to_shortlist_days = duration_to_days(shortlist_stats['avg'])

    # Stage durations from activity logs
    activity_logs = get_filtered_activity_logs(request, start_date, end_date)

    stage_activities = activity_logs.filter(
        activity_type=ActivityType.STAGE_CHANGED,
        stage_name__isnull=False,
    ).exclude(stage_name='').values('stage_name').annotate(
        count=Count('id'),
    ).order_by('stage_name')

    stage_durations = [
        {
            'stage_name': sa['stage_name'],
            'count': sa['count'],
        }
        for sa in stage_activities
    ]

    # Identify bottlenecks (stages with most applications currently stuck)
    # Calculate actual time in stage using ActivityLog for accuracy
    now = timezone.now()
    stale_threshold = now - timedelta(days=7)

    bottleneck_apps = applications.filter(
        current_stage__isnull=False,
        status=ApplicationStatus.IN_PROGRESS,
    ).select_related('current_stage')

    # Group by stage and calculate stale counts
    stage_bottlenecks = {}
    for app in bottleneck_apps:
        stage_name = app.current_stage.name if app.current_stage else 'Unknown'

        if stage_name not in stage_bottlenecks:
            stage_bottlenecks[stage_name] = {
                'total': 0,
                'stale': 0,
            }

        stage_bottlenecks[stage_name]['total'] += 1

        # Check when this application entered its current stage using ActivityLog
        last_stage_change = ActivityLog.objects.filter(
            application=app,
            activity_type=ActivityType.STAGE_CHANGED,
        ).order_by('-created_at').first()

        if last_stage_change:
            if last_stage_change.created_at < stale_threshold:
                stage_bottlenecks[stage_name]['stale'] += 1
        else:
            # No stage change history - use stage_entered_at or applied_at
            stage_entered = getattr(app, 'stage_entered_at', None)
            check_date = stage_entered or app.applied_at
            if check_date and check_date < stale_threshold:
                stage_bottlenecks[stage_name]['stale'] += 1

    # Sort by stale count and build response
    bottlenecks = sorted([
        {
            'stage_name': stage_name,
            'applications_stuck': data['total'],
            'stale_count': data['stale'],
            'stale_percentage': round(data['stale'] / data['total'] * 100, 1) if data['total'] > 0 else 0,
        }
        for stage_name, data in stage_bottlenecks.items()
    ], key=lambda x: x['stale_count'], reverse=True)[:5]

    return Response({
        'period': {
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
        },
        'time_to_hire': time_to_hire,
        'time_to_shortlist_days': time_to_shortlist_days,
        'stage_durations': stage_durations,
        'bottlenecks': bottlenecks,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_trends(request):
    """
    Get time series data for trend charts.

    Query params:
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - metric: applications, hires, offers (default: applications)
    - granularity: day, week, month (default: day)

    Returns time series data grouped by the specified granularity.
    """
    start_date, end_date = get_date_range(request)
    metric = request.query_params.get('metric', 'applications')
    granularity = request.query_params.get('granularity', 'day')

    applications = get_filtered_applications(request, start_date, end_date)

    # Choose truncation function based on granularity
    if granularity == 'week':
        trunc_func = TruncWeek
    elif granularity == 'month':
        trunc_func = TruncMonth
    else:
        trunc_func = TruncDate

    # Choose which date field and filter to use
    if metric == 'hires':
        applications = applications.filter(
            status=ApplicationStatus.OFFER_ACCEPTED,
            offer_accepted_at__isnull=False,
        )
        date_field = 'offer_accepted_at'
    elif metric == 'offers':
        applications = applications.filter(
            offer_made_at__isnull=False,
        )
        date_field = 'offer_made_at'
    elif metric == 'shortlisted':
        applications = applications.filter(
            shortlisted_at__isnull=False,
        )
        date_field = 'shortlisted_at'
    else:  # applications
        date_field = 'applied_at'

    # Group by date
    trend_data = applications.annotate(
        date=trunc_func(date_field)
    ).values('date').annotate(
        count=Count('id')
    ).order_by('date')

    # Format response
    data_points = [
        {
            'date': item['date'].strftime('%Y-%m-%d') if item['date'] else None,
            'count': item['count'],
        }
        for item in trend_data
        if item['date']
    ]

    return Response({
        'period': {
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
        },
        'metric': metric,
        'granularity': granularity,
        'data': data_points,
    })
