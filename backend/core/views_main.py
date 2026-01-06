from django.db import transaction
from django.db.models import Count, Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import UserRole
from .models import OnboardingStage, OnboardingHistory
from .serializers import (
    OnboardingStageSerializer,
    OnboardingStageWithIntegrationsSerializer,
    OnboardingStageCreateSerializer,
    OnboardingStageUpdateSerializer,
    OnboardingStageReorderSerializer,
    OnboardingHistorySerializer,
)


def is_staff_user(user):
    """Check if user is admin or recruiter."""
    return user.role in [UserRole.ADMIN, UserRole.RECRUITER]


# Wizard step to stage slug mapping (must match companies/views.py)
STEP_TO_STAGE_SLUG = {
    'contract': 'onboarding-contract',
    'profile': 'onboarding-profile',
    'billing': 'onboarding-billing',
    'team': 'onboarding-team',
    'booking': 'onboarding-call-booked',
}

# Reverse mapping: stage slug to wizard step
STAGE_SLUG_TO_STEP = {v: k for k, v in STEP_TO_STAGE_SLUG.items()}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_onboarding_stages(request):
    """
    List all onboarding stages, filterable by entity_type.

    Query params:
    - entity_type: 'company', 'candidate', or 'lead' (optional)
    - include_inactive: 'true' to include inactive stages (default: false)
    - include_integrations: 'true' to include integration data inline (default: false)
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    entity_type = request.query_params.get('entity_type')
    include_inactive = request.query_params.get('include_inactive', 'false').lower() == 'true'
    include_integrations = request.query_params.get('include_integrations', 'false').lower() == 'true'

    stages = OnboardingStage.objects.all()

    if entity_type:
        stages = stages.filter(entity_type=entity_type)

    if not include_inactive:
        stages = stages.filter(is_active=True)

    # If including integrations, add prefetch and annotations for efficiency
    if include_integrations:
        from scheduling.models import MeetingType

        # Prefetch meeting types (both unauthenticated and authenticated targets)
        stages = stages.prefetch_related(
            Prefetch(
                'meeting_types_unauthenticated',
                queryset=MeetingType.objects.filter(is_active=True),
                to_attr='_prefetched_meeting_types_unauthenticated'
            ),
            Prefetch(
                'meeting_types_authenticated',
                queryset=MeetingType.objects.filter(is_active=True),
                to_attr='_prefetched_meeting_types_authenticated'
            ),
        )

        # Annotate entity counts - each related_name is unique to one entity type
        # so we count all related objects (no filter needed)
        stages = stages.annotate(
            company_count=Count('companies', distinct=True),
            lead_count=Count('leads', distinct=True),
            candidate_count=Count('candidates', distinct=True),
        )

    stages = stages.order_by('entity_type', 'order')

    # Use appropriate serializer based on include_integrations flag
    if include_integrations:
        serializer = OnboardingStageWithIntegrationsSerializer(stages, many=True)
    else:
        serializer = OnboardingStageSerializer(stages, many=True)

    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_onboarding_stage(request):
    """Create a new onboarding stage."""
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = OnboardingStageCreateSerializer(data=request.data)
    if serializer.is_valid():
        stage = serializer.save()
        return Response(
            OnboardingStageSerializer(stage).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_onboarding_stage(request, stage_id):
    """Update an existing onboarding stage."""
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    stage = get_object_or_404(OnboardingStage, id=stage_id)

    serializer = OnboardingStageUpdateSerializer(
        stage,
        data=request.data,
        partial=True
    )
    if serializer.is_valid():
        stage = serializer.save()
        return Response(OnboardingStageSerializer(stage).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_onboarding_stage(request, stage_id):
    """
    Soft delete an onboarding stage (set is_active=False).
    Cannot delete if there are any connected integrations.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    stage = get_object_or_404(OnboardingStage, id=stage_id)
    blockers = []

    # Check for meeting types targeting this stage
    mt_unauthenticated = stage.meeting_types_unauthenticated.filter(is_active=True).count()
    mt_authenticated = stage.meeting_types_authenticated.filter(is_active=True).count()
    total_meeting_types = mt_unauthenticated + mt_authenticated
    if total_meeting_types > 0:
        blockers.append(f'{total_meeting_types} meeting type(s)')

    # Check for wizard step mapping
    wizard_step = STAGE_SLUG_TO_STEP.get(stage.slug)
    if wizard_step:
        blockers.append(f'wizard step "{wizard_step}"')

    # Check for entities at this stage
    if stage.entity_type == 'company':
        from companies.models import Company
        count = Company.objects.filter(onboarding_stage=stage).count()
        if count > 0:
            blockers.append(f'{count} company(ies)')
    elif stage.entity_type == 'lead':
        from companies.models import Lead
        count = Lead.objects.filter(onboarding_stage=stage).count()
        if count > 0:
            blockers.append(f'{count} lead(s)')
    elif stage.entity_type == 'candidate':
        from candidates.models import CandidateProfile
        count = CandidateProfile.objects.filter(onboarding_stage=stage).count()
        if count > 0:
            blockers.append(f'{count} candidate(s)')

    if blockers:
        return Response(
            {'error': f'Cannot delete stage: connected to {", ".join(blockers)}.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Soft delete
    stage.is_active = False
    stage.save()

    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reorder_onboarding_stages(request):
    """
    Bulk reorder stages within an entity_type.

    Request body:
    {
        "entity_type": "company" | "candidate",
        "stage_ids": [1, 2, 3, ...]  // IDs in new order
    }
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = OnboardingStageReorderSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    entity_type = serializer.validated_data['entity_type']
    stage_ids = serializer.validated_data['stage_ids']

    with transaction.atomic():
        for new_order, stage_id in enumerate(stage_ids):
            OnboardingStage.objects.filter(id=stage_id).update(order=new_order)

    # Return updated stages
    stages = OnboardingStage.objects.filter(
        entity_type=entity_type,
        is_active=True
    ).order_by('order')

    return Response(OnboardingStageSerializer(stages, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_onboarding_history(request, entity_type, entity_id):
    """
    Get stage transition history for a company or candidate.

    URL params:
    - entity_type: 'company' or 'candidate'
    - entity_id: ID of the company or candidate
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    if entity_type not in ['company', 'candidate']:
        return Response(
            {'error': 'Invalid entity_type'},
            status=status.HTTP_400_BAD_REQUEST
        )

    history = OnboardingHistory.objects.filter(
        entity_type=entity_type,
        entity_id=entity_id
    ).select_related('from_stage', 'to_stage', 'changed_by')

    serializer = OnboardingHistorySerializer(history, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_stage_integrations(request, stage_id):
    """
    Get all integration points for a specific onboarding stage.

    Returns:
    - meeting_types: List of meeting types that advance to this stage
    - wizard_step: The wizard step mapped to this stage (if any)
    - entity_counts: Count of entities currently at this stage
    - total_integrations: Total count for badge display
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    stage = get_object_or_404(OnboardingStage, id=stage_id)

    # Get meeting types that advance to this stage
    meeting_types = []

    # Unauthenticated target
    for mt in stage.meeting_types_unauthenticated.filter(is_active=True):
        meeting_types.append({
            'id': mt.id,
            'name': mt.name,
            'slug': mt.slug,
            'type': 'unauthenticated',
        })

    # Authenticated target
    for mt in stage.meeting_types_authenticated.filter(is_active=True):
        meeting_types.append({
            'id': mt.id,
            'name': mt.name,
            'slug': mt.slug,
            'type': 'authenticated',
        })

    # Check if this stage is mapped to a wizard step
    wizard_step = STAGE_SLUG_TO_STEP.get(stage.slug)

    # Get entity counts based on entity_type
    entity_counts = {
        'companies': 0,
        'leads': 0,
        'candidates': 0,
    }

    if stage.entity_type == 'company':
        from companies.models import Company
        entity_counts['companies'] = Company.objects.filter(onboarding_stage=stage).count()
    elif stage.entity_type == 'lead':
        from companies.models import Lead
        entity_counts['leads'] = Lead.objects.filter(onboarding_stage=stage).count()
    elif stage.entity_type == 'candidate':
        from candidates.models import CandidateProfile
        entity_counts['candidates'] = CandidateProfile.objects.filter(onboarding_stage=stage).count()

    # Calculate total integrations for badge (only config items, not entity counts)
    total_integrations = len(meeting_types) + (1 if wizard_step else 0)

    return Response({
        'stage_id': stage.id,
        'stage_name': stage.name,
        'stage_slug': stage.slug,
        'entity_type': stage.entity_type,
        'meeting_types': meeting_types,
        'wizard_step': wizard_step,
        'entity_counts': entity_counts,
        'total_integrations': total_integrations,
    })
