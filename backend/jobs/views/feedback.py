"""
Views for stage feedback (threaded comments on application stages).
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import UserRole
from companies.models import CompanyUser, CompanyUserRole
from ..models import (
    Application,
    ApplicationStageInstance,
    StageFeedback,
    StageFeedbackType,
)
from ..serializers import (
    StageFeedbackSerializer,
    StageFeedbackCreateSerializer,
    StageFeedbackUpdateSerializer,
)


def check_application_access(user, application):
    """
    Check if user has access to view/modify feedback on an application.
    Returns True if user is staff or has company editor access.
    """
    is_staff = user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_member = CompanyUser.objects.filter(
        user=user,
        company=application.job.company,
        is_active=True
    ).exists()
    return is_staff or is_company_member


def check_application_edit_access(user, application):
    """
    Check if user can add/edit feedback on an application.
    """
    is_staff = user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_editor = CompanyUser.objects.filter(
        user=user,
        company=application.job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()
    return is_staff or is_company_editor


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def application_feedback_list(request, application_id):
    """
    GET: List all feedback for an application.
    POST: Add new feedback to an application.
    """
    try:
        application = Application.objects.select_related('job', 'job__company').get(id=application_id)
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check access
    if not check_application_access(request.user, application):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        # List all feedback for this application
        feedbacks = StageFeedback.objects.filter(
            application=application
        ).select_related('author', 'stage_instance__stage_template').order_by('created_at')

        serializer = StageFeedbackSerializer(feedbacks, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Check edit access for creating feedback
        if not check_application_edit_access(request.user, application):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        serializer = StageFeedbackCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Create the feedback
        feedback_data = {
            'application': application,
            'author': request.user,
            'comment': serializer.validated_data['comment'],
            'score': serializer.validated_data.get('score'),
        }

        # Handle stage_type or stage_instance
        stage_type = serializer.validated_data.get('stage_type')
        stage_instance_id = serializer.validated_data.get('stage_instance_id')

        if stage_type:
            feedback_data['stage_type'] = stage_type
        elif stage_instance_id:
            try:
                stage_instance = ApplicationStageInstance.objects.get(
                    id=stage_instance_id,
                    application=application
                )
                feedback_data['stage_instance'] = stage_instance
            except ApplicationStageInstance.DoesNotExist:
                return Response(
                    {'error': 'Stage instance not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        feedback = StageFeedback.objects.create(**feedback_data)
        return Response(
            StageFeedbackSerializer(feedback).data,
            status=status.HTTP_201_CREATED
        )


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def feedback_detail(request, application_id, feedback_id):
    """
    GET: Get a single feedback.
    PATCH: Update a feedback (author only).
    DELETE: Delete a feedback (author or admin only).
    """
    try:
        application = Application.objects.select_related('job', 'job__company').get(id=application_id)
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        feedback = StageFeedback.objects.select_related(
            'author', 'stage_instance__stage_template'
        ).get(id=feedback_id, application=application)
    except StageFeedback.DoesNotExist:
        return Response({'error': 'Feedback not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check access
    if not check_application_access(request.user, application):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        return Response(StageFeedbackSerializer(feedback).data)

    elif request.method == 'PATCH':
        # Only author can edit their own feedback
        if feedback.author != request.user:
            return Response(
                {'error': 'You can only edit your own feedback'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = StageFeedbackUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if 'comment' in serializer.validated_data:
            feedback.comment = serializer.validated_data['comment']
        if 'score' in serializer.validated_data:
            feedback.score = serializer.validated_data['score']

        feedback.save()
        return Response(StageFeedbackSerializer(feedback).data)

    elif request.method == 'DELETE':
        # Author or admin can delete
        is_author = feedback.author == request.user
        is_admin = request.user.role == UserRole.ADMIN

        if not is_author and not is_admin:
            return Response(
                {'error': 'You can only delete your own feedback'},
                status=status.HTTP_403_FORBIDDEN
            )

        feedback.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stage_feedback_list(request, application_id, instance_id):
    """
    Get feedback for a specific stage instance.
    """
    try:
        application = Application.objects.select_related('job', 'job__company').get(id=application_id)
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        stage_instance = ApplicationStageInstance.objects.get(
            id=instance_id,
            application=application
        )
    except ApplicationStageInstance.DoesNotExist:
        return Response({'error': 'Stage instance not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check access
    if not check_application_access(request.user, application):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    feedbacks = StageFeedback.objects.filter(
        stage_instance=stage_instance
    ).select_related('author').order_by('created_at')

    return Response(StageFeedbackSerializer(feedbacks, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def status_feedback_list(request, application_id, stage_type):
    """
    Get feedback for a specific status stage (applied/shortlisted).
    """
    # Validate stage_type
    if stage_type not in [StageFeedbackType.APPLIED, StageFeedbackType.SHORTLISTED]:
        return Response(
            {'error': 'Invalid stage type. Must be "applied" or "shortlisted"'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        application = Application.objects.select_related('job', 'job__company').get(id=application_id)
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check access
    if not check_application_access(request.user, application):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    feedbacks = StageFeedback.objects.filter(
        application=application,
        stage_type=stage_type
    ).select_related('author').order_by('created_at')

    return Response(StageFeedbackSerializer(feedbacks, many=True).data)
