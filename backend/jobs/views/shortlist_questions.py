import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction

from ..models import (
    Job, Application,
    ShortlistQuestion,
    ShortlistAnswer,
)
from ..serializers import (
    ShortlistQuestionSerializer,
    ShortlistQuestionBulkSerializer,
    ShortlistAnswerSerializer,
    ShortlistAnswerCreateSerializer,
    ShortlistAnswersBulkCreateSerializer,
    ShortlistReviewSummarySerializer,
)
from companies.models import CompanyUser, CompanyUserRole
from users.models import UserRole

logger = logging.getLogger(__name__)


# =============================================================================
# Job-Level Shortlist Question Endpoints
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def list_create_shortlist_questions(request, job_id):
    """
    GET: List all shortlist screening questions for a job.
    POST: Create a new shortlist question for a job.
    """
    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        return Response(
            {'error': 'Job not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_member = CompanyUser.objects.filter(
        user=request.user,
        company=job.company,
        is_active=True
    ).exists()

    if not is_staff and not is_company_member:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == 'GET':
        questions = ShortlistQuestion.objects.filter(job=job).order_by('order')
        serializer = ShortlistQuestionSerializer(questions, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Check editor permission for creation
        is_company_editor = CompanyUser.objects.filter(
            user=request.user,
            company=job.company,
            role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
            is_active=True
        ).exists()

        if not is_staff and not is_company_editor:
            return Response(
                {'error': 'You do not have permission to create shortlist questions'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get next order number
        max_order = ShortlistQuestion.objects.filter(job=job).order_by('-order').values_list('order', flat=True).first()
        next_order = (max_order or 0) + 1

        data = request.data.copy()
        if 'order' not in data or data['order'] == 0:
            data['order'] = next_order

        # Manually create the question since we're not using ModelSerializer
        question = ShortlistQuestion.objects.create(
            job=job,
            question_text=data.get('question_text', ''),
            description=data.get('description', ''),
            is_required=data.get('is_required', False),
            order=data['order'],
        )
        return Response(
            ShortlistQuestionSerializer(question).data,
            status=status.HTTP_201_CREATED
        )


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def bulk_update_shortlist_questions(request, job_id):
    """
    Bulk create/update/delete shortlist questions for a job.
    Replaces all existing questions with the provided list.
    """
    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_editor = CompanyUser.objects.filter(
        user=request.user,
        company=job.company,
        role__in=[CompanyUserRole.ADMIN, CompanyUserRole.EDITOR],
        is_active=True
    ).exists()

    if not is_staff and not is_company_editor:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = ShortlistQuestionBulkSerializer(data=request.data)
    if serializer.is_valid():
        questions_data = serializer.validated_data['questions']

        with transaction.atomic():
            # Get existing questions
            existing_questions = {str(q.id): q for q in ShortlistQuestion.objects.filter(job=job)}
            incoming_ids = {str(q.get('id')) for q in questions_data if q.get('id')}

            # Delete questions not in incoming data
            for qid in set(existing_questions.keys()) - incoming_ids:
                existing_questions[qid].delete()

            # Create/update questions
            result_questions = []
            for i, q_data in enumerate(questions_data):
                question_id = q_data.pop('id', None)
                question_id_str = str(question_id) if question_id else None
                new_order = i + 1

                if question_id_str and question_id_str in existing_questions:
                    # Update existing
                    question = existing_questions[question_id_str]
                    question.question_text = q_data.get('question_text', question.question_text)
                    question.description = q_data.get('description', question.description)
                    question.is_required = q_data.get('is_required', question.is_required)
                    question.order = new_order
                    question.save()
                else:
                    # Create new
                    question = ShortlistQuestion.objects.create(
                        job=job,
                        question_text=q_data.get('question_text', ''),
                        description=q_data.get('description', ''),
                        is_required=q_data.get('is_required', False),
                        order=new_order,
                    )
                result_questions.append(question)

        return Response(
            ShortlistQuestionSerializer(result_questions, many=True).data,
            status=status.HTTP_200_OK
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Application-Level Shortlist Answer Endpoints
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def list_create_shortlist_answers(request, application_id):
    """
    GET: List all shortlist answers for an application.
    POST: Submit/update the current user's answers for all questions.
    """
    try:
        application = Application.objects.select_related('job', 'job__company').get(id=application_id)
    except Application.DoesNotExist:
        return Response(
            {'error': 'Application not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_member = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        is_active=True
    ).exists()

    if not is_staff and not is_company_member:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == 'GET':
        answers = ShortlistAnswer.objects.filter(
            application=application
        ).select_related('question', 'reviewer').order_by('question__order', 'created_at')
        serializer = ShortlistAnswerSerializer(answers, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = ShortlistAnswersBulkCreateSerializer(data=request.data)
        if serializer.is_valid():
            answers_data = serializer.validated_data['answers']

            with transaction.atomic():
                result_answers = []
                for answer_data in answers_data:
                    question_id = answer_data['question_id']

                    # Verify question belongs to this application's job
                    try:
                        question = ShortlistQuestion.objects.get(
                            id=question_id,
                            job=application.job
                        )
                    except ShortlistQuestion.DoesNotExist:
                        return Response(
                            {'error': f'Question {question_id} not found for this job'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    # Update or create answer for this reviewer
                    answer, created = ShortlistAnswer.objects.update_or_create(
                        application=application,
                        question=question,
                        reviewer=request.user,
                        defaults={
                            'score': answer_data['score'],
                            'notes': answer_data.get('notes', ''),
                        }
                    )
                    result_answers.append(answer)

            return Response(
                ShortlistAnswerSerializer(result_answers, many=True).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def shortlist_review_summary(request, application_id):
    """
    Get aggregated shortlist review summary for an application.
    Returns overall scores, per-question averages, and per-reviewer summaries.
    """
    try:
        application = Application.objects.select_related('job', 'job__company').get(id=application_id)
    except Application.DoesNotExist:
        return Response(
            {'error': 'Application not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_member = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        is_active=True
    ).exists()

    if not is_staff and not is_company_member:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    summary_data = ShortlistReviewSummarySerializer.build_summary(application_id)
    serializer = ShortlistReviewSummarySerializer(data=summary_data)
    serializer.is_valid()  # Build validates the structure
    return Response(summary_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_shortlist_answers(request, application_id):
    """
    Get the current user's shortlist answers for an application.
    Useful for pre-filling the form when a reviewer revisits.
    """
    try:
        application = Application.objects.select_related('job', 'job__company').get(id=application_id)
    except Application.DoesNotExist:
        return Response(
            {'error': 'Application not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check permission
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    is_company_member = CompanyUser.objects.filter(
        user=request.user,
        company=application.job.company,
        is_active=True
    ).exists()

    if not is_staff and not is_company_member:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    answers = ShortlistAnswer.objects.filter(
        application=application,
        reviewer=request.user
    ).select_related('question').order_by('question__order')

    serializer = ShortlistAnswerSerializer(answers, many=True)
    return Response(serializer.data)
