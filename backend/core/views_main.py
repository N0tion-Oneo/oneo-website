from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import UserRole
from .models import OnboardingStage, OnboardingHistory
from .serializers import (
    OnboardingStageSerializer,
    OnboardingStageCreateSerializer,
    OnboardingStageUpdateSerializer,
    OnboardingStageReorderSerializer,
    OnboardingHistorySerializer,
)


def is_staff_user(user):
    """Check if user is admin or recruiter."""
    return user.role in [UserRole.ADMIN, UserRole.RECRUITER]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_onboarding_stages(request):
    """
    List all onboarding stages, filterable by entity_type.

    Query params:
    - entity_type: 'company' or 'candidate' (optional)
    - include_inactive: 'true' to include inactive stages (default: false)
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    entity_type = request.query_params.get('entity_type')
    include_inactive = request.query_params.get('include_inactive', 'false').lower() == 'true'

    stages = OnboardingStage.objects.all()

    if entity_type:
        stages = stages.filter(entity_type=entity_type)

    if not include_inactive:
        stages = stages.filter(is_active=True)

    stages = stages.order_by('entity_type', 'order')

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
    Cannot delete if any entities are currently at this stage.
    """
    if not is_staff_user(request.user):
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    stage = get_object_or_404(OnboardingStage, id=stage_id)

    # Check if any companies or candidates are at this stage
    if stage.entity_type == 'company':
        from companies.models import Company
        count = Company.objects.filter(onboarding_stage=stage).count()
        if count > 0:
            return Response(
                {'error': f'Cannot delete stage: {count} company(ies) are currently at this stage.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    else:
        from candidates.models import CandidateProfile
        count = CandidateProfile.objects.filter(onboarding_stage=stage).count()
        if count > 0:
            return Response(
                {'error': f'Cannot delete stage: {count} candidate(s) are currently at this stage.'},
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
