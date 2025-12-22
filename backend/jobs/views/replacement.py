"""Views for replacement request functionality."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from jobs.models import Application, ReplacementRequest, ReplacementStatus
from jobs.serializers import (
    ReplacementRequestListSerializer,
    ReplacementRequestDetailSerializer,
    ReplacementRequestCreateSerializer,
    ReplacementApproveSerializer,
    ReplacementRejectSerializer,
    ReplacementEligibilitySerializer,
)
from jobs.services.replacement import (
    check_replacement_eligibility,
    create_replacement_request,
    approve_replacement_request,
    reject_replacement_request,
)
from users.models import UserRole
from companies.models import CompanyUser


def is_admin_or_recruiter(user):
    """Check if user is admin or recruiter."""
    return user.role in [UserRole.ADMIN, UserRole.RECRUITER]


def is_client(user):
    """Check if user is a client."""
    return user.role == UserRole.CLIENT


def get_client_company(user):
    """Get the company for a client user."""
    try:
        membership = CompanyUser.objects.get(user=user, is_active=True)
        return membership.company
    except CompanyUser.DoesNotExist:
        return None


# =============================================================================
# Client Endpoints
# =============================================================================


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_eligibility(request, application_id):
    """
    Check if an application is eligible for a replacement request.

    Returns eligibility status with details about the replacement period.
    """
    application = get_object_or_404(Application, id=application_id)

    # Clients can only check their own company's applications
    if is_client(request.user):
        company = get_client_company(request.user)
        if not company or application.job.company != company:
            return Response(
                {'detail': 'You do not have permission to view this application.'},
                status=status.HTTP_403_FORBIDDEN
            )

    eligibility = check_replacement_eligibility(application)
    serializer = ReplacementEligibilitySerializer(eligibility)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_replacement_request(request, application_id):
    """
    Submit a replacement request for an application.

    Admins and recruiters can submit for any application.
    Clients can only submit for their own company's placements.
    """
    application = get_object_or_404(Application, id=application_id)

    # Admins and recruiters can submit for any application
    if is_admin_or_recruiter(request.user):
        pass  # Allowed
    elif is_client(request.user):
        # Verify the application belongs to the client's company
        company = get_client_company(request.user)
        if not company or application.job.company != company:
            return Response(
                {'detail': 'You do not have permission to request a replacement for this placement.'},
                status=status.HTTP_403_FORBIDDEN
            )
    else:
        return Response(
            {'detail': 'You do not have permission to submit replacement requests.'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = ReplacementRequestCreateSerializer(data={
        'application': application_id,
        'reason_category': request.data.get('reason_category'),
        'reason_details': request.data.get('reason_details', ''),
    })

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        replacement_request = create_replacement_request(
            application=application,
            reason_category=serializer.validated_data['reason_category'],
            reason_details=serializer.validated_data.get('reason_details', ''),
            requested_by=request.user,
        )

        # TODO: Send notification to admins

        response_serializer = ReplacementRequestDetailSerializer(replacement_request)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    except ValueError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Admin Endpoints
# =============================================================================


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_replacement_requests(request):
    """
    List all replacement requests.

    Admin/recruiters see all requests.
    Clients see only their company's requests.

    Query params:
    - company_id: Filter by company (admin only)
    - status: Filter by status (pending, approved_free, approved_discounted, rejected)
    """
    if is_admin_or_recruiter(request.user):
        queryset = ReplacementRequest.objects.all()

        # Filter by company if provided
        company_id = request.query_params.get('company_id')
        if company_id:
            queryset = queryset.filter(application__job__company_id=company_id)

    elif is_client(request.user):
        company = get_client_company(request.user)
        if not company:
            return Response(
                {'detail': 'You are not associated with a company.'},
                status=status.HTTP_404_NOT_FOUND
            )
        queryset = ReplacementRequest.objects.filter(application__job__company=company)

    else:
        return Response(
            {'detail': 'You do not have permission to view replacement requests.'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Filter by status if provided
    status_filter = request.query_params.get('status')
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    # Order by most recent first
    queryset = queryset.select_related(
        'application__job__company',
        'application__candidate__user',
        'requested_by',
        'reviewed_by',
    ).order_by('-requested_at')

    serializer = ReplacementRequestListSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_replacement_request(request, request_id):
    """
    Get details of a single replacement request.
    """
    replacement_request = get_object_or_404(
        ReplacementRequest.objects.select_related(
            'application__job__company',
            'application__candidate__user',
            'requested_by',
            'reviewed_by',
        ),
        id=request_id
    )

    # Check permissions
    if is_client(request.user):
        company = get_client_company(request.user)
        if not company or replacement_request.application.job.company != company:
            return Response(
                {'detail': 'You do not have permission to view this request.'},
                status=status.HTTP_403_FORBIDDEN
            )

    elif not is_admin_or_recruiter(request.user):
        return Response(
            {'detail': 'You do not have permission to view this request.'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = ReplacementRequestDetailSerializer(replacement_request)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_request(request, request_id):
    """
    Approve a replacement request.

    Only admins can approve requests.

    Request body:
    - approval_type: 'free' or 'discounted'
    - discount_percentage: Required if approval_type is 'discounted'
    - review_notes: Optional notes
    """
    if not is_admin_or_recruiter(request.user):
        return Response(
            {'detail': 'Only admins can approve replacement requests.'},
            status=status.HTTP_403_FORBIDDEN
        )

    replacement_request = get_object_or_404(ReplacementRequest, id=request_id)

    serializer = ReplacementApproveSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        approved_request = approve_replacement_request(
            replacement_request=replacement_request,
            approval_type=serializer.validated_data['approval_type'],
            reviewed_by=request.user,
            discount_percentage=serializer.validated_data.get('discount_percentage'),
            notes=serializer.validated_data.get('review_notes', ''),
        )

        response_serializer = ReplacementRequestDetailSerializer(approved_request)
        return Response(response_serializer.data)

    except ValueError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_request(request, request_id):
    """
    Reject a replacement request.

    Only admins can reject requests.

    Request body:
    - review_notes: Optional notes explaining the rejection
    """
    if not is_admin_or_recruiter(request.user):
        return Response(
            {'detail': 'Only admins can reject replacement requests.'},
            status=status.HTTP_403_FORBIDDEN
        )

    replacement_request = get_object_or_404(ReplacementRequest, id=request_id)

    serializer = ReplacementRejectSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        rejected_request = reject_replacement_request(
            replacement_request=replacement_request,
            reviewed_by=request.user,
            notes=serializer.validated_data.get('review_notes', ''),
        )

        response_serializer = ReplacementRequestDetailSerializer(rejected_request)
        return Response(response_serializer.data)

    except ValueError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Company-specific endpoints
# =============================================================================


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_company_replacement_requests(request, company_id):
    """
    List replacement requests for a specific company.

    Used in the company detail page.
    """
    if not is_admin_or_recruiter(request.user):
        return Response(
            {'detail': 'Only admins can view company replacement requests.'},
            status=status.HTTP_403_FORBIDDEN
        )

    queryset = ReplacementRequest.objects.filter(
        application__job__company_id=company_id
    ).select_related(
        'application__job__company',
        'application__candidate__user',
        'requested_by',
        'reviewed_by',
    ).order_by('-requested_at')

    # Filter by status if provided
    status_filter = request.query_params.get('status')
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    serializer = ReplacementRequestListSerializer(queryset, many=True)
    return Response(serializer.data)
