from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count, Case, When, IntegerField
from django.contrib.auth import get_user_model

from .models import Company, CompanyUser, CompanyUserRole, Country, City
from users.models import UserRole
from .serializers import (
    CompanyListSerializer,
    CompanyAdminListSerializer,
    CompanyDetailSerializer,
    CompanyUpdateSerializer,
    CompanyUserSerializer,
    CompanyUserCreateSerializer,
    CompanyUserUpdateSerializer,
    CompanyCreateSerializer,
    CountrySerializer,
    CitySerializer,
)
from .permissions import (
    IsCompanyMember,
    IsCompanyAdmin,
    IsCompanyEditor,
    get_user_company,
)


User = get_user_model()


# =============================================================================
# Public Company Endpoints
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def list_companies(request):
    """
    List all published companies.
    Supports filtering by industry, size, and search.
    """
    companies = Company.objects.filter(is_published=True)

    # Filter by industry
    industry = request.query_params.get('industry')
    if industry:
        companies = companies.filter(industry__slug=industry)

    # Filter by company size
    company_size = request.query_params.get('company_size')
    if company_size:
        companies = companies.filter(company_size=company_size)

    # Filter by funding stage
    funding_stage = request.query_params.get('funding_stage')
    if funding_stage:
        companies = companies.filter(funding_stage=funding_stage)

    # Search by name or tagline
    search = request.query_params.get('search')
    if search:
        companies = companies.filter(
            Q(name__icontains=search) | Q(tagline__icontains=search)
        )

    # Select related for optimization
    companies = companies.select_related('industry')

    serializer = CompanyListSerializer(companies, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_company(request, slug):
    """
    Get a single company by slug.
    Returns full details if published.
    """
    try:
        company = Company.objects.select_related('industry').get(slug=slug)
    except Company.DoesNotExist:
        return Response(
            {'error': 'Company not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Only show published companies to public
    if not company.is_published:
        # Check if user is a member
        if request.user.is_authenticated:
            is_member = CompanyUser.objects.filter(
                user=request.user,
                company=company,
                is_active=True
            ).exists()
            if not is_member:
                return Response(
                    {'error': 'Company not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            return Response(
                {'error': 'Company not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    serializer = CompanyDetailSerializer(company)
    return Response(serializer.data)


# =============================================================================
# My Company Endpoints (for client users)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_company(request):
    """
    Get the current user's company.
    Returns 404 if user is not associated with any company.
    """
    company = get_user_company(request.user)
    if not company:
        return Response(
            {'error': 'You are not associated with any company'},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = CompanyDetailSerializer(company)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsCompanyEditor])
def update_my_company(request):
    """
    Update the current user's company.
    Requires editor or admin role.
    """
    company = get_user_company(request.user)
    if not company:
        return Response(
            {'error': 'You are not associated with any company'},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = CompanyUpdateSerializer(company, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        # Return full company details
        return Response(CompanyDetailSerializer(company).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Company Users Management
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_company_users(request):
    """
    List all users in a company.

    For regular users: Returns users from their own company.
    For admin/recruiter: Can pass company_id query param to view any company's users.
    """
    company_id = request.query_params.get('company_id')
    is_staff = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]

    # Admin/Recruiter can view any company's users
    if company_id and is_staff:
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        # Regular users can only view their own company's users
        company = get_user_company(request.user)
        if not company:
            return Response(
                {'error': 'You are not associated with any company'},
                status=status.HTTP_404_NOT_FOUND
            )

    company_users = CompanyUser.objects.filter(company=company).select_related(
        'user', 'invited_by'
    )
    serializer = CompanyUserSerializer(company_users, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCompanyAdmin])
def invite_company_user(request):
    """
    Invite a user to a company.
    Creates a pending invitation with a unique signup link.
    If user already exists, adds them directly.
    Requires admin role (company admin or platform admin/recruiter).

    For platform admins/recruiters: pass company_id in the request body.
    For company admins: uses their own company.
    """
    from datetime import timedelta
    from django.utils import timezone
    from .models import CompanyInvitation, InvitationStatus
    from .serializers import CompanyInvitationCreateSerializer, CompanyInvitationSerializer

    is_platform_admin = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    company_id = request.data.get('company_id')

    # Platform admins/recruiters must specify a company_id
    if is_platform_admin:
        if not company_id:
            # Try to get their own company first
            company = get_user_company(request.user)
            if not company:
                return Response(
                    {'error': 'Please specify a company_id'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            try:
                company = Company.objects.get(id=company_id)
            except Company.DoesNotExist:
                return Response(
                    {'error': 'Company not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
    else:
        # Company admins use their own company
        company = get_user_company(request.user)
        if not company:
            return Response(
                {'error': 'You are not associated with any company'},
                status=status.HTTP_404_NOT_FOUND
            )

    serializer = CompanyInvitationCreateSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email'].lower()
        role = serializer.validated_data.get('role', CompanyUserRole.VIEWER)

        # Check if user already exists
        try:
            user = User.objects.get(email=email)
            # User exists - check if already a member
            if CompanyUser.objects.filter(user=user, company=company).exists():
                return Response(
                    {'error': 'User is already a member of this company'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Add them directly
            company_user = CompanyUser.objects.create(
                user=user,
                company=company,
                role=role,
                invited_by=request.user,
            )
            return Response(
                {'message': 'User added to company', 'type': 'added', 'data': CompanyUserSerializer(company_user).data},
                status=status.HTTP_201_CREATED
            )
        except User.DoesNotExist:
            pass  # User doesn't exist, create an invitation

        # Check for existing pending invitation
        existing_invite = CompanyInvitation.objects.filter(
            company=company,
            email=email,
            status=InvitationStatus.PENDING
        ).first()
        if existing_invite:
            return Response(
                {'error': 'An invitation has already been sent to this email'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create the invitation with 7 day expiry
        invitation = CompanyInvitation.objects.create(
            company=company,
            email=email,
            role=role,
            invited_by=request.user,
            expires_at=timezone.now() + timedelta(days=7),
        )

        return Response(
            {'message': 'Invitation sent', 'type': 'invited', 'data': CompanyInvitationSerializer(invitation).data},
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsCompanyAdmin])
def list_company_invitations(request):
    """
    List pending invitations for a company.

    For platform admins/recruiters: pass company_id as query param.
    For company admins: uses their own company.
    """
    from .models import CompanyInvitation, InvitationStatus
    from .serializers import CompanyInvitationSerializer

    is_platform_admin = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    company_id = request.query_params.get('company_id')

    if is_platform_admin and company_id:
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        company = get_user_company(request.user)
        if not company:
            return Response(
                {'error': 'You are not associated with any company'},
                status=status.HTTP_404_NOT_FOUND
            )

    invitations = CompanyInvitation.objects.filter(
        company=company,
        status=InvitationStatus.PENDING
    ).order_by('-created_at')

    return Response(CompanyInvitationSerializer(invitations, many=True).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsCompanyAdmin])
def cancel_company_invitation(request, invitation_id):
    """
    Cancel a pending invitation.

    Platform admins/recruiters can cancel any invitation.
    Company admins can only cancel invitations for their own company.
    """
    from .models import CompanyInvitation, InvitationStatus

    is_platform_admin = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]

    if is_platform_admin:
        # Platform admins can cancel any invitation
        try:
            invitation = CompanyInvitation.objects.get(
                id=invitation_id,
                status=InvitationStatus.PENDING
            )
        except CompanyInvitation.DoesNotExist:
            return Response(
                {'error': 'Invitation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        # Company admins can only cancel invitations for their own company
        company = get_user_company(request.user)
        if not company:
            return Response(
                {'error': 'You are not associated with any company'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            invitation = CompanyInvitation.objects.get(
                id=invitation_id,
                company=company,
                status=InvitationStatus.PENDING
            )
        except CompanyInvitation.DoesNotExist:
            return Response(
                {'error': 'Invitation not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    invitation.status = InvitationStatus.CANCELLED
    invitation.save()

    return Response({'message': 'Invitation cancelled'})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsCompanyAdmin])
def update_company_user(request, user_id):
    """
    Update a company user's role or active status.
    Requires admin role (company admin or platform admin/recruiter).
    """
    is_platform_admin = request.user.role in ['admin', 'recruiter']

    # Platform admins can update any company user
    if is_platform_admin:
        try:
            company_user = CompanyUser.objects.get(id=user_id)
        except CompanyUser.DoesNotExist:
            return Response(
                {'error': 'Company user not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        # Company admins can only update users in their own company
        company = get_user_company(request.user)
        if not company:
            return Response(
                {'error': 'You are not associated with any company'},
                status=status.HTTP_404_NOT_FOUND
            )
        try:
            company_user = CompanyUser.objects.get(id=user_id, company=company)
        except CompanyUser.DoesNotExist:
            return Response(
                {'error': 'Company user not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    # Prevent self-demotion (only applies to company admins, not platform admins)
    if not is_platform_admin and company_user.user == request.user:
        if 'role' in request.data and request.data['role'] != CompanyUserRole.ADMIN:
            return Response(
                {'error': 'You cannot change your own role'},
                status=status.HTTP_400_BAD_REQUEST
            )

    serializer = CompanyUserUpdateSerializer(company_user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(CompanyUserSerializer(company_user).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsCompanyAdmin])
def remove_company_user(request, user_id):
    """
    Remove a user from a company.
    Requires admin role (company admin or platform admin/recruiter).
    """
    is_platform_admin = request.user.role in ['admin', 'recruiter']

    # Platform admins can remove any company user
    if is_platform_admin:
        try:
            company_user = CompanyUser.objects.get(id=user_id)
            company = company_user.company
        except CompanyUser.DoesNotExist:
            return Response(
                {'error': 'Company user not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        # Company admins can only remove users from their own company
        company = get_user_company(request.user)
        if not company:
            return Response(
                {'error': 'You are not associated with any company'},
                status=status.HTTP_404_NOT_FOUND
            )
        try:
            company_user = CompanyUser.objects.get(id=user_id, company=company)
        except CompanyUser.DoesNotExist:
            return Response(
                {'error': 'Company user not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    # Prevent self-removal (only applies to company admins, not platform admins)
    if not is_platform_admin and company_user.user == request.user:
        return Response(
            {'error': 'You cannot remove yourself from the company'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if this is the last admin
    if company_user.role == CompanyUserRole.ADMIN:
        admin_count = CompanyUser.objects.filter(
            company=company,
            role=CompanyUserRole.ADMIN,
            is_active=True
        ).count()
        if admin_count <= 1:
            return Response(
                {'error': 'Cannot remove the last admin. Promote another user first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    company_user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Create Company
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_company(request):
    """
    Create a new company.

    Only CLIENT, RECRUITER, or ADMIN users can create companies.
    The creator becomes the first company admin.
    User must not already be associated with a company.
    """
    # Only invited clients, recruiters, or admins can create companies
    allowed_roles = [UserRole.CLIENT, UserRole.RECRUITER, UserRole.ADMIN]
    if request.user.role not in allowed_roles:
        return Response(
            {'error': 'You must be invited as a client to create a company'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Check if user already has a company
    if CompanyUser.objects.filter(user=request.user).exists():
        return Response(
            {'error': 'You are already associated with a company'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = CompanyCreateSerializer(data=request.data)
    if serializer.is_valid():
        company = serializer.save()

        # Creator becomes company admin
        CompanyUser.objects.create(
            user=request.user,
            company=company,
            role=CompanyUserRole.ADMIN,
        )

        return Response(
            CompanyDetailSerializer(company).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Admin/Recruiter Endpoints (access to ALL companies)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_companies(request):
    """
    List ALL companies (published and unpublished).
    Admin/Recruiter only.
    Includes job counts per status.
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    companies = Company.objects.all().order_by('-created_at')

    # Search by name or tagline
    search = request.query_params.get('search')
    if search:
        companies = companies.filter(
            Q(name__icontains=search) | Q(tagline__icontains=search)
        )

    # Filter by published status
    is_published = request.query_params.get('is_published')
    if is_published is not None:
        companies = companies.filter(is_published=is_published.lower() == 'true')

    # Annotate with job counts per status
    companies = companies.select_related('industry').annotate(
        jobs_total=Count('jobs'),
        jobs_draft=Count(
            Case(When(jobs__status='draft', then=1), output_field=IntegerField())
        ),
        jobs_published=Count(
            Case(When(jobs__status='published', then=1), output_field=IntegerField())
        ),
        jobs_closed=Count(
            Case(When(jobs__status='closed', then=1), output_field=IntegerField())
        ),
        jobs_filled=Count(
            Case(When(jobs__status='filled', then=1), output_field=IntegerField())
        ),
    )

    serializer = CompanyAdminListSerializer(companies, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def company_detail_by_id(request, company_id):
    """
    Get or update a company by ID.
    Admin/Recruiter only.
    """
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        company = Company.objects.select_related('industry').get(id=company_id)
    except Company.DoesNotExist:
        return Response(
            {'error': 'Company not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        serializer = CompanyDetailSerializer(company)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        serializer = CompanyUpdateSerializer(company, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(CompanyDetailSerializer(company).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Location Endpoints (Countries and Cities)
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def list_countries(request):
    """List all active countries."""
    countries = Country.objects.filter(is_active=True)
    serializer = CountrySerializer(countries, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def list_cities(request, country_id=None):
    """
    List cities, optionally filtered by country.
    """
    cities = City.objects.filter(is_active=True).select_related('country')
    if country_id:
        cities = cities.filter(country_id=country_id)
    serializer = CitySerializer(cities, many=True)
    return Response(serializer.data)


# =============================================================================
# Question Templates Endpoints
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def list_create_question_templates(request):
    """
    List or create question templates for a company.

    GET: List all templates for the user's company (or specified company for admins).
    POST: Create a new template.
    """
    from jobs.models import QuestionTemplate
    from jobs.serializers import (
        QuestionTemplateListSerializer,
        QuestionTemplateDetailSerializer,
        QuestionTemplateCreateSerializer,
    )

    is_platform_admin = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]
    company_id = request.query_params.get('company_id')

    # Determine which company to use
    if is_platform_admin and company_id:
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        company = get_user_company(request.user)
        if not company:
            return Response(
                {'error': 'You are not associated with any company'},
                status=status.HTTP_404_NOT_FOUND
            )

    if request.method == 'GET':
        templates = QuestionTemplate.objects.filter(company=company)

        # Filter by active status
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            templates = templates.filter(is_active=is_active.lower() == 'true')

        serializer = QuestionTemplateListSerializer(templates, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = QuestionTemplateCreateSerializer(data=request.data)
        if serializer.is_valid():
            template = serializer.save(company=company, created_by=request.user)
            return Response(
                QuestionTemplateDetailSerializer(template).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def question_template_detail(request, template_id):
    """
    Get, update, or delete a question template.
    """
    from jobs.models import QuestionTemplate
    from jobs.serializers import (
        QuestionTemplateDetailSerializer,
        QuestionTemplateUpdateSerializer,
    )

    is_platform_admin = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]

    # Platform admins can access any template
    if is_platform_admin:
        try:
            template = QuestionTemplate.objects.get(id=template_id)
        except QuestionTemplate.DoesNotExist:
            return Response(
                {'error': 'Template not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        # Company users can only access their company's templates
        company = get_user_company(request.user)
        if not company:
            return Response(
                {'error': 'You are not associated with any company'},
                status=status.HTTP_404_NOT_FOUND
            )
        try:
            template = QuestionTemplate.objects.get(id=template_id, company=company)
        except QuestionTemplate.DoesNotExist:
            return Response(
                {'error': 'Template not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    if request.method == 'GET':
        serializer = QuestionTemplateDetailSerializer(template)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        serializer = QuestionTemplateUpdateSerializer(template, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(QuestionTemplateDetailSerializer(template).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
