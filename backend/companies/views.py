import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count, Case, When, IntegerField
from django.contrib.auth import get_user_model
from django.conf import settings

from notifications.services import NotificationService

logger = logging.getLogger(__name__)

from .models import Company, CompanyUser, CompanyUserRole, Country, City, ServiceType, TermsAcceptance, TermsAcceptanceContext
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
    OnboardingStatusSerializer,
    OnboardingProfileStepSerializer,
    OnboardingBillingStepSerializer,
    OnboardingContractStepSerializer,
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

    serializer = CompanyDetailSerializer(company, context={'request': request})
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

    serializer = CompanyDetailSerializer(company, context={'request': request})
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
        return Response(CompanyDetailSerializer(company, context={'request': request}).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_company_features(request):
    """
    Get features available for the user's company based on service type.

    Returns a list of feature names that are included for the company's
    service type (headhunting or retained), with company-specific overrides applied.

    Feature resolution order:
    1. Start with service type defaults (included_in_headhunting or included_in_retained)
    2. Apply company-specific overrides (CompanyFeatureOverride):
       - is_enabled=True: Enable feature even if not in service type default
       - is_enabled=False: Disable feature even if in service type default
    """
    from cms.models.pricing import PricingFeature
    from subscriptions.models import CompanyFeatureOverride, Subscription, SubscriptionStatus

    company = get_user_company(request.user)
    if not company:
        return Response({
            'service_type': None,
            'service_type_display': None,
            'subscription_status': None,
            'features': [],
        })

    # Check subscription status for client users
    if request.user.role == UserRole.CLIENT:
        subscription = Subscription.objects.filter(
            company=company,
            service_type__in=['retained', 'headhunting']
        ).first()

        if subscription and subscription.status in [
            SubscriptionStatus.PAUSED,
            SubscriptionStatus.TERMINATED,
            SubscriptionStatus.EXPIRED
        ]:
            return Response({
                'error': 'Subscription inactive',
                'error_code': 'subscription_blocked',
                'subscription_status': subscription.status,
                'subscription_status_display': subscription.get_status_display(),
                'message': f'Your subscription is {subscription.get_status_display().lower()}. Please contact support to restore access.',
                'contact_email': 'hello@oneo.com',
            }, status=status.HTTP_403_FORBIDDEN)

    if not company.service_type:
        return Response({
            'service_type': None,
            'service_type_display': None,
            'subscription_status': None,
            'features': [],
        })

    # Get all active features
    all_features = PricingFeature.objects.filter(is_active=True).order_by('order', 'name')

    # Determine which features are enabled by default based on service type
    if company.service_type == 'headhunting':
        default_feature_ids = set(
            all_features.filter(included_in_headhunting=True).values_list('id', flat=True)
        )
    else:  # retained
        default_feature_ids = set(
            all_features.filter(included_in_retained=True).values_list('id', flat=True)
        )

    # Get company-specific overrides
    overrides = CompanyFeatureOverride.objects.filter(company=company).select_related('feature')
    override_map = {override.feature_id: override.is_enabled for override in overrides}

    # Build final feature list with overrides applied
    enabled_feature_ids = set()
    for feature in all_features:
        if feature.id in override_map:
            # Override exists - use the override value
            if override_map[feature.id]:
                enabled_feature_ids.add(feature.id)
        elif feature.id in default_feature_ids:
            # No override - use service type default
            enabled_feature_ids.add(feature.id)

    # Get the actual feature objects for enabled features, maintaining order
    enabled_features = [f for f in all_features if f.id in enabled_feature_ids]

    return Response({
        'service_type': company.service_type,
        'service_type_display': company.get_service_type_display() if company.service_type else None,
        'subscription_status': 'active',
        'features': [
            {
                'id': str(f.id),
                'slug': f.slug,
                'name': f.name,
                'category': f.category,
            }
            for f in enabled_features
        ],
    })


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

        # Build signup URL - notification handled by automation rule: [Auto] Company Member Invitation Created
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        signup_url = f"{frontend_url}/signup/company/{invitation.token}"

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

    Automatically creates a subscription/contract for the selected service type
    with a 1-year term and auto-renew enabled.

    Records terms acceptance if terms_document_slug is provided.
    """
    from subscriptions.models import Subscription, SubscriptionServiceType, CompanyPricing
    from datetime import date
    from dateutil.relativedelta import relativedelta

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

        # Auto-create subscription/contract for the selected service type
        service_type = company.service_type
        subscription = None
        if service_type in [ServiceType.RETAINED, ServiceType.HEADHUNTING]:
            # Map company service type to subscription service type
            subscription_service_type = (
                SubscriptionServiceType.RETAINED
                if service_type == ServiceType.RETAINED
                else SubscriptionServiceType.HEADHUNTING
            )

            # Create 1-year contract starting today
            today = date.today()
            end_date = today + relativedelta(years=1)

            subscription = Subscription.objects.create(
                company=company,
                service_type=subscription_service_type,
                contract_start_date=today,
                contract_end_date=end_date,
                billing_day_of_month=today.day,  # Use today's day for billing
                auto_renew=True,
            )

            # Create CompanyPricing with defaults (null values fall back to CMS defaults)
            CompanyPricing.objects.create(company=company)

        # Record terms acceptance if provided
        terms_document_slug = request.data.get('terms_document_slug')
        if terms_document_slug:
            # Get client IP and user agent for audit trail
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0].strip()
            else:
                ip_address = request.META.get('REMOTE_ADDR')
            user_agent = request.META.get('HTTP_USER_AGENT', '')

            TermsAcceptance.objects.create(
                company=company,
                accepted_by=request.user,
                subscription=subscription,
                document_slug=terms_document_slug,
                document_title=request.data.get('terms_document_title', ''),
                document_version=request.data.get('terms_document_version', ''),
                context=TermsAcceptanceContext.COMPANY_CREATION,
                service_type=service_type or '',
                ip_address=ip_address,
                user_agent=user_agent[:1000] if user_agent else '',  # Limit length
            )

        return Response(
            CompanyDetailSerializer(company, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Lead Management (Admin/Recruiter only)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_leads(request):
    """
    List all leads with pagination.

    Supports filtering by:
    - stage: filter by onboarding stage ID
    - source: filter by lead source
    - assigned_to: filter by assigned user ID
    - converted: 'true' or 'false' to filter by conversion status
    - industry: filter by industry ID
    - company_size: filter by company size
    - created_after: filter by created date (YYYY-MM-DD)
    - created_before: filter by created date (YYYY-MM-DD)
    - search: search by name, email, or company_name
    - ordering: sort field (prefix with - for descending)
    - page: page number (default 1)
    - page_size: results per page (default 20, max 100)
    """
    from .models import Lead
    from .serializers import LeadListSerializer
    from django.core.paginator import Paginator, EmptyPage

    # Only Admin or Recruiter can view leads
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Only administrators and recruiters can view leads'},
            status=status.HTTP_403_FORBIDDEN
        )

    leads = Lead.objects.select_related(
        'onboarding_stage', 'industry'
    ).prefetch_related('assigned_to').all()

    # Apply filters
    stage = request.query_params.get('stage')
    if stage:
        leads = leads.filter(onboarding_stage__id=stage)

    source = request.query_params.get('source')
    if source:
        leads = leads.filter(source=source)

    assigned_to_filter = request.query_params.get('assigned_to')
    if assigned_to_filter:
        leads = leads.filter(assigned_to__id=assigned_to_filter)

    converted = request.query_params.get('converted')
    if converted == 'true':
        leads = leads.filter(converted_at__isnull=False)
    elif converted == 'false':
        leads = leads.filter(converted_at__isnull=True)

    industry = request.query_params.get('industry')
    if industry:
        leads = leads.filter(industry__id=industry)

    company_size = request.query_params.get('company_size')
    if company_size:
        leads = leads.filter(company_size=company_size)

    created_after = request.query_params.get('created_after')
    if created_after:
        leads = leads.filter(created_at__date__gte=created_after)

    created_before = request.query_params.get('created_before')
    if created_before:
        leads = leads.filter(created_at__date__lte=created_before)

    search = request.query_params.get('search')
    if search:
        leads = leads.filter(
            Q(name__icontains=search) |
            Q(email__icontains=search) |
            Q(company_name__icontains=search)
        )

    # Ordering
    ordering = request.query_params.get('ordering', '-created_at')
    valid_orderings = ['created_at', '-created_at', 'name', '-name', 'company_name', '-company_name']
    if ordering in valid_orderings:
        leads = leads.order_by(ordering)
    else:
        leads = leads.order_by('-created_at')

    # Pagination
    page = int(request.query_params.get('page', 1))
    page_size = min(int(request.query_params.get('page_size', 20)), 100)

    paginator = Paginator(leads, page_size)
    try:
        page_obj = paginator.page(page)
    except EmptyPage:
        page_obj = paginator.page(paginator.num_pages)

    serializer = LeadListSerializer(page_obj.object_list, many=True)
    return Response({
        'results': serializer.data,
        'count': paginator.count,
        'page': page_obj.number,
        'page_size': page_size,
        'total_pages': paginator.num_pages,
        'has_next': page_obj.has_next(),
        'has_previous': page_obj.has_previous(),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_lead(request):
    """
    Create a new prospecting lead.

    Sets the lead's onboarding_stage to "Lead" automatically.
    """
    from core.models import OnboardingStage, OnboardingHistory, OnboardingEntityType
    from .models import Lead
    from .serializers import LeadCreateSerializer, LeadDetailSerializer

    # Only Admin or Recruiter can create leads
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Only administrators and recruiters can create leads'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = LeadCreateSerializer(data=request.data)
    if serializer.is_valid():
        # Get the "Lead" stage from the lead pipeline
        try:
            lead_stage = OnboardingStage.objects.get(
                entity_type=OnboardingEntityType.LEAD,
                slug='lead',
                is_active=True
            )
        except OnboardingStage.DoesNotExist:
            return Response(
                {'error': 'Lead stage not configured. Please check onboarding stages settings.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Create the lead with Lead stage
        lead = serializer.save(
            onboarding_stage=lead_stage,
            created_by=request.user,
        )

        # Create history record
        OnboardingHistory.objects.create(
            entity_type=OnboardingEntityType.LEAD,
            entity_id=str(lead.id),
            from_stage=None,
            to_stage=lead_stage,
            changed_by=request.user,
        )

        return Response(
            LeadDetailSerializer(lead).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_lead(request, lead_id):
    """Get a single lead by ID."""
    from .models import Lead
    from .serializers import LeadDetailSerializer

    # Only Admin or Recruiter can view leads
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Only administrators and recruiters can view leads'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        lead = Lead.objects.select_related(
            'onboarding_stage', 'industry',
            'created_by', 'converted_to_company', 'converted_to_user'
        ).prefetch_related('assigned_to', 'invitations').get(id=lead_id)
    except Lead.DoesNotExist:
        return Response({'error': 'Lead not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = LeadDetailSerializer(lead)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_lead(request, lead_id):
    """Update a lead."""
    from .models import Lead
    from .serializers import LeadUpdateSerializer, LeadDetailSerializer

    # Only Admin or Recruiter can update leads
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Only administrators and recruiters can update leads'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        lead = Lead.objects.get(id=lead_id)
    except Lead.DoesNotExist:
        return Response({'error': 'Lead not found'}, status=status.HTTP_404_NOT_FOUND)

    partial = request.method == 'PATCH'
    serializer = LeadUpdateSerializer(lead, data=request.data, partial=partial)
    if serializer.is_valid():
        lead = serializer.save()
        return Response(LeadDetailSerializer(lead).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_lead(request, lead_id):
    """Delete a lead (only if not converted)."""
    from .models import Lead

    # Only Admin can delete leads
    if request.user.role != UserRole.ADMIN:
        return Response(
            {'error': 'Only administrators can delete leads'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        lead = Lead.objects.get(id=lead_id)
    except Lead.DoesNotExist:
        return Response({'error': 'Lead not found'}, status=status.HTTP_404_NOT_FOUND)

    if lead.is_converted:
        return Response(
            {'error': 'Cannot delete a converted lead'},
            status=status.HTTP_400_BAD_REQUEST
        )

    lead.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_lead_stage(request, lead_id):
    """Update a lead's onboarding stage."""
    from core.models import OnboardingStage, OnboardingEntityType
    from .models import Lead, LeadActivity, LeadActivityType
    from .serializers import LeadUpdateStageSerializer, LeadDetailSerializer

    # Only Admin or Recruiter can update lead stages
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Only administrators and recruiters can update lead stages'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        lead = Lead.objects.select_related('onboarding_stage').get(id=lead_id)
    except Lead.DoesNotExist:
        return Response({'error': 'Lead not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = LeadUpdateStageSerializer(data=request.data)
    if serializer.is_valid():
        stage_id = serializer.validated_data['stage_id']

        try:
            new_stage = OnboardingStage.objects.get(
                id=stage_id,
                entity_type=OnboardingEntityType.LEAD,
                is_active=True
            )
        except OnboardingStage.DoesNotExist:
            return Response(
                {'error': 'Invalid stage'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_stage = lead.onboarding_stage
        if old_stage != new_stage:
            lead.onboarding_stage = new_stage
            lead.save(update_fields=['onboarding_stage', 'updated_at'])

            # Create activity record for stage change
            # (LeadActivity handles history for leads since OnboardingHistory uses integer IDs)
            LeadActivity.objects.create(
                lead=lead,
                performed_by=request.user,
                activity_type=LeadActivityType.STAGE_CHANGED,
                previous_stage=old_stage,
                new_stage=new_stage,
            )

        return Response(LeadDetailSerializer(lead).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def lead_activities(request, lead_id):
    """
    List or create activities for a lead.

    GET: List all activities for a lead, ordered by most recent first.
    POST: Create a new activity (note, call logged, email sent).
    """
    from .models import Lead, LeadActivity, LeadActivityType
    from .serializers import LeadActivitySerializer, LeadActivityCreateSerializer

    # Only Admin or Recruiter can access lead activities
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        return Response(
            {'error': 'Only administrators and recruiters can access lead activities'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        lead = Lead.objects.get(id=lead_id)
    except Lead.DoesNotExist:
        return Response({'error': 'Lead not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        activities = LeadActivity.objects.filter(lead=lead).select_related(
            'performed_by', 'previous_stage', 'new_stage'
        ).order_by('-created_at')

        serializer = LeadActivitySerializer(activities, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = LeadActivityCreateSerializer(data=request.data)
        if serializer.is_valid():
            activity = serializer.save(
                lead=lead,
                performed_by=request.user,
            )
            return Response(
                LeadActivitySerializer(activity).data,
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

    # Prefetch jobs for each company (applications_count is already a field on Job model)
    from jobs.models import Job
    from django.db.models import Prefetch

    jobs_queryset = Job.objects.order_by('-created_at')

    companies = companies.prefetch_related(
        Prefetch('jobs', queryset=jobs_queryset, to_attr='prefetched_jobs')
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
        serializer = CompanyDetailSerializer(company, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'PATCH':
        serializer = CompanyUpdateSerializer(company, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(CompanyDetailSerializer(company, context={'request': request}).data)
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


# ============================================================================
# Shortlist Question Templates (Company-Level)
# ============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def list_create_shortlist_templates(request):
    """
    List or create shortlist screening templates for a company.

    GET: List all shortlist templates for the user's company (or specified company for admins).
    POST: Create a new shortlist template.
    """
    from jobs.models import ShortlistQuestionTemplate
    from jobs.serializers import (
        ShortlistQuestionTemplateListSerializer,
        ShortlistQuestionTemplateDetailSerializer,
        ShortlistQuestionTemplateCreateSerializer,
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
        templates = ShortlistQuestionTemplate.objects.filter(company=company)

        # Filter by active status
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            templates = templates.filter(is_active=is_active.lower() == 'true')

        serializer = ShortlistQuestionTemplateListSerializer(templates, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = ShortlistQuestionTemplateCreateSerializer(data=request.data)
        if serializer.is_valid():
            template = serializer.save(company=company, created_by=request.user)
            return Response(
                ShortlistQuestionTemplateDetailSerializer(template).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def shortlist_template_detail(request, template_id):
    """
    Get, update, or delete a shortlist screening template.
    """
    from jobs.models import ShortlistQuestionTemplate
    from jobs.serializers import (
        ShortlistQuestionTemplateDetailSerializer,
        ShortlistQuestionTemplateUpdateSerializer,
    )

    is_platform_admin = request.user.role in [UserRole.ADMIN, UserRole.RECRUITER]

    # Platform admins can access any template
    if is_platform_admin:
        try:
            template = ShortlistQuestionTemplate.objects.get(id=template_id)
        except ShortlistQuestionTemplate.DoesNotExist:
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
            template = ShortlistQuestionTemplate.objects.get(id=template_id, company=company)
        except ShortlistQuestionTemplate.DoesNotExist:
            return Response(
                {'error': 'Template not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    if request.method == 'GET':
        serializer = ShortlistQuestionTemplateDetailSerializer(template)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        serializer = ShortlistQuestionTemplateUpdateSerializer(template, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(ShortlistQuestionTemplateDetailSerializer(template).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Client Onboarding Wizard Endpoints
# =============================================================================

ONBOARDING_STEPS = ['contract', 'profile', 'billing', 'team', 'booking']
REQUIRED_STEPS = ['contract', 'profile', 'billing', 'booking']

# Map wizard steps to onboarding stage slugs
STEP_TO_STAGE_SLUG = {
    'contract': 'onboarding-contract',
    'profile': 'onboarding-profile',
    'billing': 'onboarding-billing',
    'team': 'onboarding-team',
    'booking': 'onboarding-call-booked',
}


def update_company_onboarding_stage(company, stage_slug, user=None):
    """
    Update a company's onboarding stage and create history record.

    Args:
        company: The Company instance to update
        stage_slug: The slug of the target OnboardingStage
        user: The user performing the action (for audit)
    """
    from core.models import OnboardingStage, OnboardingHistory, OnboardingEntityType

    try:
        new_stage = OnboardingStage.objects.get(
            entity_type=OnboardingEntityType.COMPANY,
            slug=stage_slug,
            is_active=True
        )
    except OnboardingStage.DoesNotExist:
        # Stage not found - skip update
        return

    old_stage = company.onboarding_stage

    # Only update if moving forward (higher order) or no current stage
    if old_stage and old_stage.order >= new_stage.order:
        return

    # Update the stage
    company.onboarding_stage = new_stage
    company.save(update_fields=['onboarding_stage'])

    # Create history record
    OnboardingHistory.objects.create(
        entity_type=OnboardingEntityType.COMPANY,
        entity_id=str(company.id),
        from_stage=old_stage,
        to_stage=new_stage,
        changed_by=user,
    )


def get_onboarding_status_for_user(user):
    """
    Build onboarding status for a user.
    Returns dict with is_complete, current_step, steps_completed, etc.
    """
    from authentication.models import ClientInvitation

    # Get user's company
    company = get_user_company(user)

    # Check if onboarding is already complete
    if company and company.onboarding_completed_at:
        # Get inviter info even for completed onboarding
        invitation = ClientInvitation.objects.select_related(
            'created_by', 'created_by__recruiter_profile'
        ).filter(used_by=user).first()

        inviter_info = None
        if invitation and invitation.created_by:
            inviter = invitation.created_by
            booking_slug = None
            if hasattr(inviter, 'recruiter_profile') and inviter.recruiter_profile:
                booking_slug = inviter.recruiter_profile.booking_slug
            inviter_info = {
                'id': inviter.id,
                'name': inviter.full_name,
                'email': inviter.email,
                'booking_slug': booking_slug,
            }

        # Fallback: If no inviter or no booking_slug, find an admin with a booking slug
        if not inviter_info or not inviter_info.get('booking_slug'):
            from users.models import User, UserRole
            admin_with_booking = User.objects.filter(
                role=UserRole.ADMIN,
                is_active=True,
                recruiter_profile__booking_slug__isnull=False,
            ).exclude(
                recruiter_profile__booking_slug=''
            ).select_related('recruiter_profile').first()

            if admin_with_booking:
                inviter_info = {
                    'id': admin_with_booking.id,
                    'name': admin_with_booking.full_name,
                    'email': admin_with_booking.email,
                    'booking_slug': admin_with_booking.recruiter_profile.booking_slug,
                }

        return {
            'is_complete': True,
            'current_step': None,
            'steps_completed': company.onboarding_steps_completed or {},
            'company_id': company.id if company else None,
            'has_contract_offer': False,
            'contract_offer': None,
            'inviter': inviter_info,
        }

    # Get steps completed
    steps_completed = {}
    if company:
        steps_completed = company.onboarding_steps_completed or {}

    # Determine current step
    current_step = None
    for step in ONBOARDING_STEPS:
        if not steps_completed.get(step):
            current_step = step
            break

    # Check for contract offer from invitation
    contract_offer = None
    has_contract_offer = False

    # Find the invitation used by this user
    invitation = ClientInvitation.objects.select_related(
        'created_by', 'created_by__recruiter_profile'
    ).filter(used_by=user).first()

    if invitation and invitation.offered_service_type:
        has_contract_offer = True
        contract_offer = {
            'service_type': invitation.offered_service_type,
            'monthly_retainer': invitation.offered_monthly_retainer,
            'placement_fee': invitation.offered_placement_fee,
            'csuite_placement_fee': invitation.offered_csuite_placement_fee,
        }

    # Get inviter's booking info for the booking step
    inviter_info = None
    if invitation and invitation.created_by:
        inviter = invitation.created_by
        booking_slug = None
        if hasattr(inviter, 'recruiter_profile') and inviter.recruiter_profile:
            booking_slug = inviter.recruiter_profile.booking_slug

        inviter_info = {
            'id': inviter.id,
            'name': inviter.full_name,
            'email': inviter.email,
            'booking_slug': booking_slug,
        }

    # Fallback: If no inviter or no booking_slug, find an admin with a booking slug
    if not inviter_info or not inviter_info.get('booking_slug'):
        from users.models import User, UserRole
        admin_with_booking = User.objects.filter(
            role=UserRole.ADMIN,
            is_active=True,
            recruiter_profile__booking_slug__isnull=False,
        ).exclude(
            recruiter_profile__booking_slug=''
        ).select_related('recruiter_profile').first()

        if admin_with_booking:
            inviter_info = {
                'id': admin_with_booking.id,
                'name': admin_with_booking.full_name,
                'email': admin_with_booking.email,
                'booking_slug': admin_with_booking.recruiter_profile.booking_slug,
            }

    # Onboarding is complete when ALL steps are done (including optional ones)
    # or when explicitly marked complete via onboarding_completed_at
    all_steps_done = all(steps_completed.get(step) for step in ONBOARDING_STEPS)

    return {
        'is_complete': all_steps_done,
        'current_step': current_step,
        'steps_completed': steps_completed,
        'company_id': company.id if company else None,
        'has_contract_offer': has_contract_offer,
        'contract_offer': contract_offer,
        'inviter': inviter_info,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_onboarding_status(request):
    """
    Get the current user's onboarding status.
    Returns completion state, current step, and contract offer if any.
    """
    if request.user.role != UserRole.CLIENT:
        return Response(
            {'error': 'Only client users have onboarding'},
            status=status.HTTP_400_BAD_REQUEST
        )

    status_data = get_onboarding_status_for_user(request.user)
    return Response(status_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_onboarding_step(request, step):
    """
    Complete an onboarding step with the provided data.

    Steps:
    - profile: Company name, logo, description, industry
    - billing: Legal name, VAT, billing address
    - contract: Service type selection, T&C acceptance
    - team: Invite team members (optional)
    - job: Post first job (optional)
    """
    from subscriptions.models import Subscription, SubscriptionServiceType, SubscriptionStatus as SubStatus, CompanyPricing
    from datetime import date
    from dateutil.relativedelta import relativedelta
    from authentication.models import ClientInvitation
    from django.utils import timezone

    if request.user.role != UserRole.CLIENT:
        return Response(
            {'error': 'Only client users have onboarding'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if step not in ONBOARDING_STEPS:
        return Response(
            {'error': f'Invalid step. Must be one of: {ONBOARDING_STEPS}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    company = get_user_company(request.user)

    # Handle profile step (updates company created in contract step)
    if step == 'profile':
        if not company:
            return Response(
                {'error': 'Complete the contract step first'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = OnboardingProfileStepSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Update existing company with profile data
        if data.get('tagline'):
            company.tagline = data['tagline']
        if data.get('description'):
            company.description = data['description']
        if data.get('industry_id'):
            company.industry_id = data['industry_id']
        if data.get('company_size'):
            company.company_size = data['company_size']

        steps = company.onboarding_steps_completed or {}
        steps['profile'] = True
        company.onboarding_steps_completed = steps
        company.save()

        # Update onboarding stage
        update_company_onboarding_stage(company, STEP_TO_STAGE_SLUG['profile'], request.user)

        # Handle logo separately if provided
        if 'logo' in request.FILES:
            company.logo = request.FILES['logo']
            company.save()

    # Handle billing step
    elif step == 'billing':
        if not company:
            return Response(
                {'error': 'Complete the contract step first'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = OnboardingBillingStepSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Update billing info
        company.legal_name = data.get('legal_name', company.legal_name)
        company.vat_number = data.get('vat_number', company.vat_number)
        company.registration_number = data.get('registration_number', company.registration_number)
        company.billing_address = data.get('billing_address', company.billing_address)
        company.billing_city = data.get('billing_city', company.billing_city)
        if data.get('billing_country_id'):
            company.billing_country_id = data['billing_country_id']
        company.billing_postal_code = data.get('billing_postal_code', company.billing_postal_code)
        company.billing_contact_name = data.get('billing_contact_name', company.billing_contact_name)
        company.billing_contact_email = data.get('billing_contact_email', company.billing_contact_email)
        company.billing_contact_phone = data.get('billing_contact_phone', company.billing_contact_phone)

        steps = company.onboarding_steps_completed or {}
        steps['billing'] = True
        company.onboarding_steps_completed = steps
        company.save()

        # Update onboarding stage
        update_company_onboarding_stage(company, STEP_TO_STAGE_SLUG['billing'], request.user)

    # Handle contract step (creates company if needed)
    elif step == 'contract':
        from core.models import OnboardingStage

        serializer = OnboardingContractStepSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        service_type = data['service_type']
        company_name = data['company_name']

        # Create company if it doesn't exist
        if not company:
            # Get "Client SignUp" stage - initial stage when company is created
            client_signup_stage = OnboardingStage.objects.filter(
                entity_type='company',
                slug='client-signup',
                is_active=True
            ).first()

            company = Company.objects.create(
                name=company_name,
                service_type=service_type,
                can_view_all_candidates=(service_type == ServiceType.RETAINED),
                onboarding_steps_completed={'contract': True},
                onboarding_stage=client_signup_stage,
            )
            # Make user a company admin
            CompanyUser.objects.create(
                user=request.user,
                company=company,
                role=CompanyUserRole.ADMIN,
            )

            # Link company back to lead if user signed up via lead invitation
            invitation = ClientInvitation.objects.filter(used_by=request.user).select_related('lead').first()
            if invitation and invitation.lead:
                lead = invitation.lead
                lead.converted_to_company = company
                lead.save(update_fields=['converted_to_company', 'updated_at'])
        else:
            # Update existing company
            company.name = company_name
            company.service_type = service_type
            company.can_view_all_candidates = (service_type == ServiceType.RETAINED)

        # Create subscription
        subscription_service_type = (
            SubscriptionServiceType.RETAINED
            if service_type == ServiceType.RETAINED
            else SubscriptionServiceType.HEADHUNTING
        )

        today = date.today()
        end_date = today + relativedelta(years=1)

        # Check if subscription already exists
        subscription = Subscription.objects.filter(
            company=company,
            service_type=subscription_service_type
        ).first()

        if not subscription:
            subscription = Subscription.objects.create(
                company=company,
                service_type=subscription_service_type,
                contract_start_date=today,
                contract_end_date=end_date,
                billing_day_of_month=today.day,
                auto_renew=True,
                status=SubStatus.ACTIVE,  # Active after T&C acceptance
            )

            # Create CompanyPricing with offered values if available
            invitation = ClientInvitation.objects.filter(used_by=request.user).first()
            pricing_data = {'company': company}
            if invitation and invitation.offered_service_type:
                if invitation.offered_monthly_retainer:
                    pricing_data['monthly_retainer'] = invitation.offered_monthly_retainer
                if invitation.offered_placement_fee:
                    pricing_data['placement_fee'] = invitation.offered_placement_fee
                if invitation.offered_csuite_placement_fee:
                    pricing_data['csuite_placement_fee'] = invitation.offered_csuite_placement_fee

            CompanyPricing.objects.get_or_create(company=company, defaults=pricing_data)

        # Record terms acceptance
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        TermsAcceptance.objects.create(
            company=company,
            accepted_by=request.user,
            subscription=subscription,
            document_slug=data['terms_document_slug'],
            document_title=data.get('terms_document_title', ''),
            document_version=data.get('terms_document_version', ''),
            context=TermsAcceptanceContext.COMPANY_CREATION,
            service_type=service_type,
            ip_address=ip_address,
            user_agent=user_agent[:1000] if user_agent else '',
        )

        steps = company.onboarding_steps_completed or {}
        steps['contract'] = True
        company.onboarding_steps_completed = steps
        company.save()

        # Update onboarding stage
        update_company_onboarding_stage(company, STEP_TO_STAGE_SLUG['contract'], request.user)

    # Handle team invite step (optional)
    elif step == 'team':
        if not company:
            return Response(
                {'error': 'Complete the contract step first'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Team invites are handled separately via the invite endpoint
        # Just mark step as complete
        steps = company.onboarding_steps_completed or {}
        steps['team'] = True
        company.onboarding_steps_completed = steps
        company.save()

        # Update onboarding stage
        update_company_onboarding_stage(company, STEP_TO_STAGE_SLUG['team'], request.user)

    # Handle booking step
    elif step == 'booking':
        if not company:
            return Response(
                {'error': 'Complete the contract step first'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Booking is done externally via the recruiter's booking page
        # Just mark step as complete
        steps = company.onboarding_steps_completed or {}
        steps['booking'] = True
        company.onboarding_steps_completed = steps
        company.save()

        # Update onboarding stage
        update_company_onboarding_stage(company, STEP_TO_STAGE_SLUG['booking'], request.user)

    # Check if all required steps are complete
    if company:
        steps = company.onboarding_steps_completed or {}
        if all(steps.get(s) for s in REQUIRED_STEPS):
            company.onboarding_completed_at = timezone.now()
            company.save()

    # Return updated status
    status_data = get_onboarding_status_for_user(request.user)
    return Response(status_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def skip_onboarding_step(request, step):
    """
    Skip an optional onboarding step.
    Only the team step can be skipped.
    """
    from django.utils import timezone

    if request.user.role != UserRole.CLIENT:
        return Response(
            {'error': 'Only client users have onboarding'},
            status=status.HTTP_400_BAD_REQUEST
        )

    optional_steps = ['team']
    if step not in optional_steps:
        return Response(
            {'error': f'Only optional steps can be skipped: {optional_steps}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    company = get_user_company(request.user)
    if not company:
        return Response(
            {'error': 'Complete the contract step first'},
            status=status.HTTP_400_BAD_REQUEST
        )

    steps = company.onboarding_steps_completed or {}
    steps[step] = True
    company.onboarding_steps_completed = steps

    # Check if all required steps are complete
    if all(steps.get(s) for s in REQUIRED_STEPS):
        company.onboarding_completed_at = timezone.now()

    company.save()

    # Update onboarding stage
    if step in STEP_TO_STAGE_SLUG:
        update_company_onboarding_stage(company, STEP_TO_STAGE_SLUG[step], request.user)

    status_data = get_onboarding_status_for_user(request.user)
    return Response(status_data)
