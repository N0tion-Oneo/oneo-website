"""
Onboarding analytics views for companies and candidates.
"""
from datetime import datetime, timedelta
from django.db.models import Count, Avg, F, ExpressionWrapper, DurationField, Min, Max
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import OnboardingStage, OnboardingHistory, OnboardingEntityType
from companies.models import Company
from candidates.models import CandidateProfile
from users.models import UserRole


def is_staff_user(user):
    """Check if user is admin or recruiter."""
    return user.role in [UserRole.ADMIN, UserRole.RECRUITER]


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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def onboarding_overview(request, entity_type):
    """
    Get onboarding overview for companies or candidates.

    URL params:
    - entity_type: 'company' or 'candidate'

    Query params:
    - start_date: YYYY-MM-DD (for counting new entities)
    - end_date: YYYY-MM-DD

    Returns: stage distribution, completion rate, total counts
    """
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=403)

    if entity_type not in ['company', 'candidate']:
        return Response({'error': 'Invalid entity_type'}, status=400)

    start_date, end_date = get_date_range(request)

    # Get stages for this entity type
    stages = OnboardingStage.objects.filter(
        entity_type=entity_type,
        is_active=True
    ).order_by('order')

    # Get counts per stage
    if entity_type == 'company':
        model = Company
        date_field = 'created_at'
    else:
        model = CandidateProfile
        date_field = 'created_at'

    # Total entities
    total_entities = model.objects.count()

    # New entities in date range
    new_entities = model.objects.filter(**{
        f'{date_field}__range': (start_date, end_date)
    }).count()

    # Stage distribution (all entities, not just date range)
    stage_distribution = []
    entities_with_no_stage = model.objects.filter(onboarding_stage__isnull=True).count()

    # Add "Not Started" bucket
    stage_distribution.append({
        'stage_id': None,
        'stage_name': 'Not Started',
        'stage_color': '#9CA3AF',
        'count': entities_with_no_stage,
        'percentage': round(entities_with_no_stage / total_entities * 100, 1) if total_entities > 0 else 0
    })

    terminal_count = 0
    for stage in stages:
        count = model.objects.filter(onboarding_stage=stage).count()
        if stage.is_terminal and stage.name.lower() in ['onboarded', 'active', 'completed']:
            terminal_count += count
        stage_distribution.append({
            'stage_id': stage.id,
            'stage_name': stage.name,
            'stage_color': stage.color,
            'is_terminal': stage.is_terminal,
            'count': count,
            'percentage': round(count / total_entities * 100, 1) if total_entities > 0 else 0
        })

    # Completion rate (entities at terminal success stage / total)
    # Find terminal stages that indicate completion
    completed_stages = stages.filter(is_terminal=True, name__iregex=r'(onboarded|active|completed)')
    completed_count = 0
    for stage in completed_stages:
        completed_count += model.objects.filter(onboarding_stage=stage).count()

    completion_rate = round(completed_count / total_entities * 100, 1) if total_entities > 0 else 0

    return Response({
        'entity_type': entity_type,
        'period': {
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
        },
        'summary': {
            'total': total_entities,
            'new_in_period': new_entities,
            'completed': completed_count,
            'completion_rate': completion_rate,
        },
        'stage_distribution': stage_distribution,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def onboarding_time_in_stage(request, entity_type):
    """
    Get average time spent in each stage.

    URL params:
    - entity_type: 'company' or 'candidate'

    Query params:
    - start_date: YYYY-MM-DD (filter transitions in this range)
    - end_date: YYYY-MM-DD

    Returns: average duration per stage based on transition history
    """
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=403)

    if entity_type not in ['company', 'candidate']:
        return Response({'error': 'Invalid entity_type'}, status=400)

    start_date, end_date = get_date_range(request)

    # Get all transitions for this entity type in date range
    transitions = OnboardingHistory.objects.filter(
        entity_type=entity_type,
        created_at__range=(start_date, end_date),
        from_stage__isnull=False,  # Has a "from" stage
    ).select_related('from_stage', 'to_stage')

    # Calculate time spent in each "from_stage" by finding next transition
    # Group by entity to calculate durations
    entity_transitions = {}
    for t in transitions.order_by('entity_id', 'created_at'):
        if t.entity_id not in entity_transitions:
            entity_transitions[t.entity_id] = []
        entity_transitions[t.entity_id].append(t)

    # Calculate stage durations
    stage_durations = {}
    for entity_id, trans_list in entity_transitions.items():
        for i, trans in enumerate(trans_list):
            if trans.from_stage:
                stage_id = trans.from_stage.id
                stage_name = trans.from_stage.name

                # Find how long they were in this stage
                # Use the current transition's timestamp - previous entry timestamp
                if i == 0:
                    # First transition - can't calculate previous duration
                    continue

                prev_trans = trans_list[i - 1]
                if prev_trans.to_stage and prev_trans.to_stage.id == trans.from_stage.id:
                    duration = (trans.created_at - prev_trans.created_at).days
                    if stage_id not in stage_durations:
                        stage_durations[stage_id] = {
                            'stage_name': stage_name,
                            'stage_color': trans.from_stage.color,
                            'durations': []
                        }
                    stage_durations[stage_id]['durations'].append(duration)

    # Calculate averages
    time_in_stage = []
    stages = OnboardingStage.objects.filter(
        entity_type=entity_type,
        is_active=True
    ).order_by('order')

    for stage in stages:
        data = stage_durations.get(stage.id, {'durations': []})
        durations = data.get('durations', [])
        avg_days = round(sum(durations) / len(durations), 1) if durations else None
        min_days = min(durations) if durations else None
        max_days = max(durations) if durations else None

        time_in_stage.append({
            'stage_id': stage.id,
            'stage_name': stage.name,
            'stage_color': stage.color,
            'is_terminal': stage.is_terminal,
            'avg_days': avg_days,
            'min_days': min_days,
            'max_days': max_days,
            'sample_size': len(durations),
        })

    return Response({
        'entity_type': entity_type,
        'period': {
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
        },
        'time_in_stage': time_in_stage,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def onboarding_funnel(request, entity_type):
    """
    Get onboarding funnel showing progression through stages.

    URL params:
    - entity_type: 'company' or 'candidate'

    Query params:
    - start_date: YYYY-MM-DD (entities created in this range)
    - end_date: YYYY-MM-DD

    Returns: funnel data showing how entities progress through stages
    """
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=403)

    if entity_type not in ['company', 'candidate']:
        return Response({'error': 'Invalid entity_type'}, status=400)

    start_date, end_date = get_date_range(request)

    # Get model
    if entity_type == 'company':
        model = Company
    else:
        model = CandidateProfile

    # Get entities created in date range
    entities_in_period = model.objects.filter(
        created_at__range=(start_date, end_date)
    )
    total_in_period = entities_in_period.count()

    # Get stages ordered
    stages = OnboardingStage.objects.filter(
        entity_type=entity_type,
        is_active=True
    ).order_by('order')

    # For each stage, count how many entities have ever reached it
    # This requires checking OnboardingHistory
    funnel = []

    # Stage 0: Started (all entities in period)
    funnel.append({
        'stage': 'Started',
        'count': total_in_period,
        'percentage': 100,
    })

    for stage in stages:
        # Count entities that have reached this stage (currently at or passed through)
        entities_at_stage = entities_in_period.filter(onboarding_stage=stage).count()

        # Also count those who have transitioned FROM this stage (already passed it)
        entity_ids_in_period = list(entities_in_period.values_list('id', flat=True))
        entities_passed = OnboardingHistory.objects.filter(
            entity_type=entity_type,
            entity_id__in=entity_ids_in_period,
            from_stage=stage,
        ).values('entity_id').distinct().count()

        # Total reached = currently at + already passed
        total_reached = entities_at_stage + entities_passed

        funnel.append({
            'stage': stage.name,
            'stage_id': stage.id,
            'stage_color': stage.color,
            'is_terminal': stage.is_terminal,
            'count': total_reached,
            'percentage': round(total_reached / total_in_period * 100, 1) if total_in_period > 0 else 0,
        })

    # Calculate conversion rates between stages
    conversion_rates = []
    for i in range(1, len(funnel)):
        prev_count = funnel[i - 1]['count']
        curr_count = funnel[i]['count']
        rate = round(curr_count / prev_count * 100, 1) if prev_count > 0 else 0
        conversion_rates.append({
            'from_stage': funnel[i - 1]['stage'],
            'to_stage': funnel[i]['stage'],
            'rate': rate,
        })

    return Response({
        'entity_type': entity_type,
        'period': {
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
        },
        'total_started': total_in_period,
        'funnel': funnel,
        'conversion_rates': conversion_rates,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def onboarding_trends(request, entity_type):
    """
    Get time series data for onboarding completions.

    URL params:
    - entity_type: 'company' or 'candidate'

    Query params:
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - metric: 'new' | 'completed' (default: 'new')

    Returns: daily counts of new entities or completions
    """
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=403)

    if entity_type not in ['company', 'candidate']:
        return Response({'error': 'Invalid entity_type'}, status=400)

    start_date, end_date = get_date_range(request)
    metric = request.query_params.get('metric', 'new')

    if entity_type == 'company':
        model = Company
    else:
        model = CandidateProfile

    if metric == 'completed':
        # Count transitions to terminal stages per day
        terminal_stages = OnboardingStage.objects.filter(
            entity_type=entity_type,
            is_terminal=True,
            is_active=True,
            name__iregex=r'(onboarded|active|completed)'
        )

        data = OnboardingHistory.objects.filter(
            entity_type=entity_type,
            to_stage__in=terminal_stages,
            created_at__range=(start_date, end_date),
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')

        data_points = [
            {'date': item['date'].strftime('%Y-%m-%d'), 'count': item['count']}
            for item in data if item['date']
        ]
    else:
        # Count new entities per day
        data = model.objects.filter(
            created_at__range=(start_date, end_date)
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')

        data_points = [
            {'date': item['date'].strftime('%Y-%m-%d'), 'count': item['count']}
            for item in data if item['date']
        ]

    return Response({
        'entity_type': entity_type,
        'period': {
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
        },
        'metric': metric,
        'data': data_points,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def onboarding_bottlenecks(request, entity_type):
    """
    Identify bottlenecks in the onboarding process.

    URL params:
    - entity_type: 'company' or 'candidate'

    Returns: stages where entities are getting stuck
    """
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=403)

    if entity_type not in ['company', 'candidate']:
        return Response({'error': 'Invalid entity_type'}, status=400)

    if entity_type == 'company':
        model = Company
    else:
        model = CandidateProfile

    # Get stages
    stages = OnboardingStage.objects.filter(
        entity_type=entity_type,
        is_active=True,
        is_terminal=False  # Exclude terminal stages
    ).order_by('order')

    bottlenecks = []
    now = timezone.now()

    for stage in stages:
        # Entities currently at this stage
        entities_at_stage = model.objects.filter(onboarding_stage=stage)
        count = entities_at_stage.count()

        if count == 0:
            continue

        # Find entities that have been at this stage for a long time (> 7 days)
        # by checking when they entered this stage
        stale_count = 0
        stale_threshold = now - timedelta(days=7)

        entity_ids = list(entities_at_stage.values_list('id', flat=True))

        for entity_id in entity_ids:
            # Get the most recent transition TO this stage
            last_entry = OnboardingHistory.objects.filter(
                entity_type=entity_type,
                entity_id=entity_id,
                to_stage=stage,
            ).order_by('-created_at').first()

            if last_entry and last_entry.created_at < stale_threshold:
                stale_count += 1

        bottlenecks.append({
            'stage_id': stage.id,
            'stage_name': stage.name,
            'stage_color': stage.color,
            'order': stage.order,
            'current_count': count,
            'stale_count': stale_count,  # Stuck for > 7 days
            'stale_percentage': round(stale_count / count * 100, 1) if count > 0 else 0,
        })

    # Sort by stale count descending to highlight biggest bottlenecks
    bottlenecks.sort(key=lambda x: x['stale_count'], reverse=True)

    return Response({
        'entity_type': entity_type,
        'bottlenecks': bottlenecks,
        'stale_threshold_days': 7,
    })
