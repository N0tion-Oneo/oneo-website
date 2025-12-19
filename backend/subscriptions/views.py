"""Views for subscription management API."""
from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter

from users.models import UserRole
from companies.models import Company
from cms.models.pricing import PricingFeature, PricingConfig
from jobs.models import Application, ApplicationStatus

from .models import (
    Subscription,
    SubscriptionStatus,
    TerminationType,
    CompanyPricing,
    CompanyFeatureOverride,
    Invoice,
    InvoiceStatus,
    InvoiceType,
    BillingMode,
    InvoiceLineItem,
    Payment,
    SubscriptionActivityLog,
    SubscriptionActivityType,
)
from .serializers import (
    SubscriptionListSerializer,
    SubscriptionDetailSerializer,
    SubscriptionCreateSerializer,
    SubscriptionUpdateSerializer,
    SubscriptionPauseSerializer,
    SubscriptionTerminateSerializer,
    TerminationFeeCalculationSerializer,
    CompanyPricingSerializer,
    CompanyPricingUpdateSerializer,
    EffectivePricingSerializer,
    CompanyFeatureOverrideSerializer,
    FeatureWithOverrideSerializer,
    FeatureOverrideUpdateSerializer,
    InvoiceListSerializer,
    InvoiceDetailSerializer,
    InvoiceCreateSerializer,
    InvoiceUpdateSerializer,
    PaymentSerializer,
    PaymentCreateSerializer,
    SubscriptionActivityLogSerializer,
    SubscriptionAlertSerializer,
    SubscriptionSummarySerializer,
)


# =============================================================================
# Permission Helpers
# =============================================================================


def is_staff_user(user):
    """Check if user is admin or recruiter."""
    return user.role in [UserRole.ADMIN, UserRole.RECRUITER]


def is_company_member(user, company_id):
    """Check if user is a member of the specified company."""
    from companies.models import CompanyUser
    return CompanyUser.objects.filter(
        user=user,
        company_id=company_id,
        is_active=True
    ).exists()


def can_view_company_subscription(user, company_id):
    """Check if user can view a company's subscription (staff or company member)."""
    return is_staff_user(user) or is_company_member(user, company_id)


def require_staff(view_func):
    """Decorator to require staff permissions."""
    def wrapper(request, *args, **kwargs):
        if not is_staff_user(request.user):
            return Response(
                {'error': 'Permission denied. Staff access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return view_func(request, *args, **kwargs)
    return wrapper


# =============================================================================
# Activity Logging Helper
# =============================================================================


def log_activity(
    company,
    activity_type,
    performed_by,
    subscription=None,
    invoice=None,
    previous_status='',
    new_status='',
    metadata=None,
):
    """Create a subscription activity log entry."""
    SubscriptionActivityLog.objects.create(
        company=company,
        subscription=subscription,
        invoice=invoice,
        performed_by=performed_by,
        activity_type=activity_type,
        previous_status=previous_status,
        new_status=new_status,
        metadata=metadata or {},
    )


# =============================================================================
# Subscription Endpoints
# =============================================================================


@extend_schema(
    responses={200: SubscriptionListSerializer(many=True)},
    tags=['Subscriptions'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_subscriptions(request):
    """List all subscriptions (staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    subscriptions = Subscription.objects.select_related('company').all()

    # Filter by status
    status_filter = request.query_params.get('status')
    if status_filter:
        subscriptions = subscriptions.filter(status=status_filter)

    serializer = SubscriptionListSerializer(subscriptions, many=True)
    return Response(serializer.data)


@extend_schema(
    request=SubscriptionCreateSerializer,
    responses={201: SubscriptionDetailSerializer},
    tags=['Subscriptions'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_subscription(request):
    """Create a new subscription (staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = SubscriptionCreateSerializer(data=request.data)
    if serializer.is_valid():
        subscription = serializer.save()

        log_activity(
            company=subscription.company,
            activity_type=SubscriptionActivityType.SUBSCRIPTION_CREATED,
            performed_by=request.user,
            subscription=subscription,
            new_status=subscription.status,
            metadata={
                'contract_start_date': str(subscription.contract_start_date),
                'contract_end_date': str(subscription.contract_end_date),
            },
        )

        return Response(
            SubscriptionDetailSerializer(subscription).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={200: SubscriptionDetailSerializer},
    tags=['Subscriptions'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subscription(request, subscription_id):
    """Get subscription details."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        subscription = Subscription.objects.select_related(
            'company', 'terminated_by', 'paused_by'
        ).get(id=subscription_id)
    except Subscription.DoesNotExist:
        return Response({'error': 'Subscription not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = SubscriptionDetailSerializer(subscription)
    return Response(serializer.data)


@extend_schema(
    request=SubscriptionUpdateSerializer,
    responses={200: SubscriptionDetailSerializer},
    tags=['Subscriptions'],
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_subscription(request, subscription_id):
    """Update subscription details."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        subscription = Subscription.objects.get(id=subscription_id)
    except Subscription.DoesNotExist:
        return Response({'error': 'Subscription not found'}, status=status.HTTP_404_NOT_FOUND)

    old_auto_renew = subscription.auto_renew

    serializer = SubscriptionUpdateSerializer(subscription, data=request.data, partial=True)
    if serializer.is_valid():
        subscription = serializer.save()

        # Log auto-renew change
        if 'auto_renew' in request.data and old_auto_renew != subscription.auto_renew:
            log_activity(
                company=subscription.company,
                activity_type=SubscriptionActivityType.AUTO_RENEW_CHANGED,
                performed_by=request.user,
                subscription=subscription,
                metadata={
                    'old_value': old_auto_renew,
                    'new_value': subscription.auto_renew,
                },
            )

        return Response(SubscriptionDetailSerializer(subscription).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=SubscriptionPauseSerializer,
    responses={200: SubscriptionDetailSerializer},
    tags=['Subscriptions'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pause_subscription(request, subscription_id):
    """Pause a subscription."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        subscription = Subscription.objects.get(id=subscription_id)
    except Subscription.DoesNotExist:
        return Response({'error': 'Subscription not found'}, status=status.HTTP_404_NOT_FOUND)

    if subscription.status != SubscriptionStatus.ACTIVE:
        return Response(
            {'error': 'Only active subscriptions can be paused'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = SubscriptionPauseSerializer(data=request.data)
    if serializer.is_valid():
        old_status = subscription.status
        subscription.status = SubscriptionStatus.PAUSED
        subscription.paused_at = timezone.now()
        subscription.paused_by = request.user
        subscription.pause_reason = serializer.validated_data['pause_reason']
        subscription.save()

        log_activity(
            company=subscription.company,
            activity_type=SubscriptionActivityType.SUBSCRIPTION_PAUSED,
            performed_by=request.user,
            subscription=subscription,
            previous_status=old_status,
            new_status=subscription.status,
            metadata={'pause_reason': subscription.pause_reason},
        )

        return Response(SubscriptionDetailSerializer(subscription).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={200: SubscriptionDetailSerializer},
    tags=['Subscriptions'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resume_subscription(request, subscription_id):
    """Resume a paused subscription."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        subscription = Subscription.objects.get(id=subscription_id)
    except Subscription.DoesNotExist:
        return Response({'error': 'Subscription not found'}, status=status.HTTP_404_NOT_FOUND)

    if subscription.status != SubscriptionStatus.PAUSED:
        return Response(
            {'error': 'Only paused subscriptions can be resumed'},
            status=status.HTTP_400_BAD_REQUEST
        )

    old_status = subscription.status
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.paused_at = None
    subscription.paused_by = None
    subscription.pause_reason = ''
    subscription.save()

    log_activity(
        company=subscription.company,
        activity_type=SubscriptionActivityType.SUBSCRIPTION_RESUMED,
        performed_by=request.user,
        subscription=subscription,
        previous_status=old_status,
        new_status=subscription.status,
    )

    return Response(SubscriptionDetailSerializer(subscription).data)


@extend_schema(
    responses={200: TerminationFeeCalculationSerializer},
    tags=['Subscriptions'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_termination_fee(request, subscription_id):
    """Calculate the early termination fee for a subscription."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        subscription = Subscription.objects.select_related('company').get(id=subscription_id)
    except Subscription.DoesNotExist:
        return Response({'error': 'Subscription not found'}, status=status.HTTP_404_NOT_FOUND)

    # Get effective monthly retainer
    try:
        pricing = CompanyPricing.objects.get(company=subscription.company)
        monthly_retainer = pricing.get_effective_retainer()
    except CompanyPricing.DoesNotExist:
        config = PricingConfig.get_config()
        monthly_retainer = Decimal(str(config.retained_monthly_retainer))

    months_remaining = subscription.months_remaining
    remaining_term_fee = months_remaining * monthly_retainer
    three_month_fee = 3 * monthly_retainer
    early_termination_fee = min(remaining_term_fee, three_month_fee)

    data = {
        'monthly_retainer': monthly_retainer,
        'months_remaining': months_remaining,
        'remaining_term_fee': remaining_term_fee,
        'three_month_fee': three_month_fee,
        'early_termination_fee': early_termination_fee,
        'is_within_lockout_period': subscription.is_within_lockout_period,
        'can_terminate_without_cause': not subscription.is_within_lockout_period,
    }

    serializer = TerminationFeeCalculationSerializer(data)
    return Response(serializer.data)


@extend_schema(
    request=SubscriptionTerminateSerializer,
    responses={200: SubscriptionDetailSerializer},
    tags=['Subscriptions'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def terminate_subscription(request, subscription_id):
    """Terminate a subscription."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        subscription = Subscription.objects.select_related('company').get(id=subscription_id)
    except Subscription.DoesNotExist:
        return Response({'error': 'Subscription not found'}, status=status.HTTP_404_NOT_FOUND)

    if subscription.status == SubscriptionStatus.TERMINATED:
        return Response(
            {'error': 'Subscription is already terminated'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = SubscriptionTerminateSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data
        termination_type = data['termination_type']

        # Check lockout period for without-cause termination
        if termination_type == TerminationType.WITHOUT_CAUSE:
            if subscription.is_within_lockout_period:
                return Response(
                    {'error': 'Cannot terminate without cause within the first 6 months'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Calculate termination fee for without-cause
        early_termination_fee = None
        if termination_type == TerminationType.WITHOUT_CAUSE:
            try:
                pricing = CompanyPricing.objects.get(company=subscription.company)
                monthly_retainer = pricing.get_effective_retainer()
            except CompanyPricing.DoesNotExist:
                config = PricingConfig.get_config()
                monthly_retainer = Decimal(str(config.retained_monthly_retainer))

            months_remaining = subscription.months_remaining
            remaining_term_fee = months_remaining * monthly_retainer
            three_month_fee = 3 * monthly_retainer
            early_termination_fee = min(remaining_term_fee, three_month_fee)

        # Set effective date
        effective_date = data.get('termination_effective_date')
        if not effective_date:
            if termination_type == TerminationType.FOR_CAUSE:
                effective_date = date.today()
            else:
                effective_date = date.today()

        # Set access expiry
        access_expires_days = data.get('access_expires_days', 7)
        access_expires_at = timezone.now() + timedelta(days=access_expires_days)

        old_status = subscription.status
        subscription.status = SubscriptionStatus.TERMINATED
        subscription.terminated_at = timezone.now()
        subscription.terminated_by = request.user
        subscription.termination_type = termination_type
        subscription.termination_reason = data['termination_reason']
        subscription.termination_notes = data.get('termination_notes', '')
        subscription.termination_effective_date = effective_date
        subscription.early_termination_fee = early_termination_fee
        subscription.access_expires_at = access_expires_at
        subscription.save()

        log_activity(
            company=subscription.company,
            activity_type=SubscriptionActivityType.SUBSCRIPTION_TERMINATED,
            performed_by=request.user,
            subscription=subscription,
            previous_status=old_status,
            new_status=subscription.status,
            metadata={
                'termination_type': termination_type,
                'termination_reason': data['termination_reason'],
                'early_termination_fee': str(early_termination_fee) if early_termination_fee else None,
                'effective_date': str(effective_date),
            },
        )

        # Create termination fee invoice if applicable
        if early_termination_fee and early_termination_fee > 0:
            invoice = Invoice.objects.create(
                company=subscription.company,
                subscription=subscription,
                invoice_number=Invoice.generate_invoice_number(),
                invoice_type=InvoiceType.TERMINATION,
                billing_mode=BillingMode.IN_SYSTEM,
                invoice_date=date.today(),
                due_date=date.today() + timedelta(days=30),
                subtotal=early_termination_fee,
                vat_rate=Decimal('0.15'),
                vat_amount=early_termination_fee * Decimal('0.15'),
                total_amount=early_termination_fee * Decimal('1.15'),
                status=InvoiceStatus.DRAFT,
                description=f'Early termination fee for subscription ending {effective_date}',
                created_by=request.user,
            )
            InvoiceLineItem.objects.create(
                invoice=invoice,
                description='Early Termination Fee',
                quantity=Decimal('1'),
                unit_price=early_termination_fee,
                amount=early_termination_fee,
            )

            log_activity(
                company=subscription.company,
                activity_type=SubscriptionActivityType.INVOICE_CREATED,
                performed_by=request.user,
                subscription=subscription,
                invoice=invoice,
                metadata={'invoice_type': InvoiceType.TERMINATION},
            )

        return Response(SubscriptionDetailSerializer(subscription).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={200: SubscriptionDetailSerializer},
    tags=['Subscriptions'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def renew_subscription(request, subscription_id):
    """Adjust a subscription contract end date (extend or reduce)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        subscription = Subscription.objects.get(id=subscription_id)
    except Subscription.DoesNotExist:
        return Response({'error': 'Subscription not found'}, status=status.HTTP_404_NOT_FOUND)

    if subscription.status not in [SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRED, SubscriptionStatus.PAUSED]:
        return Response(
            {'error': 'Cannot adjust terminated subscriptions'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get new end date from request
    new_end_date_str = request.data.get('new_end_date')
    if not new_end_date_str:
        return Response(
            {'error': 'new_end_date is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    from datetime import datetime, date

    try:
        new_end_date = datetime.strptime(new_end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response(
            {'error': 'Invalid date format. Use YYYY-MM-DD'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate new end date is not in the past
    if new_end_date < date.today():
        return Response(
            {'error': 'New end date cannot be in the past'},
            status=status.HTTP_400_BAD_REQUEST
        )

    old_end_date = subscription.contract_end_date
    adjustment_type = 'extended' if new_end_date > old_end_date else 'reduced'

    subscription.contract_end_date = new_end_date
    subscription.renewal_reminder_sent = False
    if subscription.status == SubscriptionStatus.EXPIRED:
        subscription.status = SubscriptionStatus.ACTIVE
    subscription.save()

    log_activity(
        company=subscription.company,
        activity_type=SubscriptionActivityType.SUBSCRIPTION_RENEWED,
        performed_by=request.user,
        subscription=subscription,
        metadata={
            'old_end_date': str(old_end_date),
            'new_end_date': str(new_end_date),
            'adjustment_type': adjustment_type,
        },
    )

    return Response(SubscriptionDetailSerializer(subscription).data)


@extend_schema(
    responses={200: SubscriptionActivityLogSerializer(many=True)},
    tags=['Subscriptions'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subscription_activity(request, subscription_id):
    """Get activity log for a subscription."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        subscription = Subscription.objects.get(id=subscription_id)
    except Subscription.DoesNotExist:
        return Response({'error': 'Subscription not found'}, status=status.HTTP_404_NOT_FOUND)

    activities = SubscriptionActivityLog.objects.filter(
        subscription=subscription
    ).select_related('performed_by').order_by('-created_at')

    serializer = SubscriptionActivityLogSerializer(activities, many=True)
    return Response(serializer.data)


# =============================================================================
# Company Subscription Endpoints
# =============================================================================


@extend_schema(
    responses={200: SubscriptionDetailSerializer},
    tags=['Company Subscription'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_company_subscription(request, company_id):
    """Get subscription for a specific company. Staff or company members can view."""
    if not can_view_company_subscription(request.user, company_id):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        subscription = Subscription.objects.select_related(
            'company', 'terminated_by', 'paused_by'
        ).get(company_id=company_id)
    except Subscription.DoesNotExist:
        return Response({'error': 'Company does not have a subscription'}, status=status.HTTP_404_NOT_FOUND)

    serializer = SubscriptionDetailSerializer(subscription)
    return Response(serializer.data)


@extend_schema(
    request=SubscriptionCreateSerializer,
    responses={201: SubscriptionDetailSerializer},
    tags=['Company Subscription'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_company_subscription(request, company_id):
    """Create subscription for a specific company."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

    if Subscription.objects.filter(company=company).exists():
        return Response(
            {'error': 'Company already has a subscription'},
            status=status.HTTP_400_BAD_REQUEST
        )

    data = request.data.copy()
    data['company'] = company_id

    serializer = SubscriptionCreateSerializer(data=data)
    if serializer.is_valid():
        subscription = serializer.save()

        log_activity(
            company=company,
            activity_type=SubscriptionActivityType.SUBSCRIPTION_CREATED,
            performed_by=request.user,
            subscription=subscription,
            new_status=subscription.status,
        )

        return Response(
            SubscriptionDetailSerializer(subscription).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request={'application/json': {'type': 'object', 'properties': {'service_type': {'type': 'string', 'enum': ['retained', 'headhunting']}}}},
    responses={200: {'type': 'object', 'properties': {'success': {'type': 'boolean'}, 'service_type': {'type': 'string'}}}},
    tags=['Company Subscription'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_service_type(request, company_id):
    """Change the service type for a company. Staff or company admins can change."""
    from companies.models import Company, CompanyUser

    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission: staff or company admin
    is_staff = is_staff_user(request.user)
    is_company_admin = CompanyUser.objects.filter(
        user=request.user,
        company=company,
        is_active=True,
        role='admin'
    ).exists()

    if not is_staff and not is_company_admin:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    new_service_type = request.data.get('service_type')
    if new_service_type not in ['retained', 'headhunting']:
        return Response(
            {'error': 'Invalid service type. Must be "retained" or "headhunting"'},
            status=status.HTTP_400_BAD_REQUEST
        )

    old_service_type = company.service_type

    if old_service_type == new_service_type:
        return Response(
            {'error': f'Company is already on {new_service_type} service'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get subscription if exists
    subscription = Subscription.objects.filter(company=company).first()

    # Handle retained -> headhunting change (requires termination fee)
    if old_service_type == 'retained' and new_service_type == 'headhunting' and subscription:
        # Check lockout period
        if subscription.is_within_lockout_period:
            return Response(
                {'error': 'Cannot change service type within the 6-month lockout period'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Calculate termination fee
        try:
            pricing = CompanyPricing.objects.get(company=company)
            monthly_retainer = pricing.get_effective_retainer()
        except CompanyPricing.DoesNotExist:
            config = PricingConfig.get_config()
            monthly_retainer = Decimal(str(config.retained_monthly_retainer))

        months_remaining = subscription.months_remaining
        remaining_term_fee = months_remaining * monthly_retainer
        three_month_fee = 3 * monthly_retainer
        early_termination_fee = min(remaining_term_fee, three_month_fee)

        if early_termination_fee > 0:
            # Check for existing unpaid termination invoice for service type change
            existing_invoice = Invoice.objects.filter(
                company=company,
                invoice_type=InvoiceType.TERMINATION,
                status__in=[InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIALLY_PAID],
                description__icontains='service type change'
            ).first()

            if existing_invoice:
                # Return payment required with existing invoice
                return Response({
                    'payment_required': True,
                    'invoice_id': str(existing_invoice.id),
                    'invoice_number': existing_invoice.invoice_number,
                    'termination_fee': str(early_termination_fee),
                    'total_amount': str(existing_invoice.total_amount),
                    'status': existing_invoice.status,
                    'message': 'Payment required before changing service type. An invoice has already been generated.',
                }, status=status.HTTP_402_PAYMENT_REQUIRED)

            # Check if there's a paid invoice for this change
            paid_invoice = Invoice.objects.filter(
                company=company,
                invoice_type=InvoiceType.TERMINATION,
                status=InvoiceStatus.PAID,
                description__icontains='service type change'
            ).first()

            if not paid_invoice:
                # Create new termination fee invoice
                invoice = Invoice.objects.create(
                    company=company,
                    subscription=subscription,
                    invoice_number=Invoice.generate_invoice_number(),
                    invoice_type=InvoiceType.TERMINATION,
                    billing_mode=BillingMode.IN_SYSTEM,
                    invoice_date=date.today(),
                    due_date=date.today() + timedelta(days=7),  # 7 days to pay
                    subtotal=early_termination_fee,
                    vat_rate=Decimal('0.15'),
                    vat_amount=early_termination_fee * Decimal('0.15'),
                    total_amount=early_termination_fee * Decimal('1.15'),
                    status=InvoiceStatus.SENT,
                    description=f'Early termination fee for service type change from Retained to Headhunting',
                    created_by=request.user,
                    sent_at=timezone.now(),
                )
                InvoiceLineItem.objects.create(
                    invoice=invoice,
                    description='Early Termination Fee - Service Type Change',
                    quantity=Decimal('1'),
                    unit_price=early_termination_fee,
                    amount=early_termination_fee,
                )

                log_activity(
                    company=company,
                    activity_type=SubscriptionActivityType.INVOICE_CREATED,
                    performed_by=request.user,
                    subscription=subscription,
                    invoice=invoice,
                    metadata={
                        'invoice_type': InvoiceType.TERMINATION,
                        'reason': 'service_type_change',
                    },
                )

                return Response({
                    'payment_required': True,
                    'invoice_id': str(invoice.id),
                    'invoice_number': invoice.invoice_number,
                    'termination_fee': str(early_termination_fee),
                    'total_amount': str(invoice.total_amount),
                    'status': invoice.status,
                    'message': 'Payment required before changing service type. An invoice has been generated.',
                }, status=status.HTTP_402_PAYMENT_REQUIRED)

    # Update company service type
    company.service_type = new_service_type
    company.save()

    # Log the activity
    log_activity(
        company=company,
        activity_type=SubscriptionActivityType.SERVICE_TYPE_CHANGED,
        performed_by=request.user,
        subscription=subscription,
        metadata={
            'old_service_type': old_service_type,
            'new_service_type': new_service_type,
            'changed_by': 'staff' if is_staff else 'company_admin',
        },
    )

    return Response({
        'success': True,
        'service_type': new_service_type,
        'old_service_type': old_service_type,
    })


# =============================================================================
# Company Pricing Endpoints
# =============================================================================


@extend_schema(
    responses={200: CompanyPricingSerializer},
    tags=['Company Pricing'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_company_pricing(request, company_id):
    """Get custom pricing for a company. Staff or company members can view."""
    if not can_view_company_subscription(request.user, company_id):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

    pricing, created = CompanyPricing.objects.get_or_create(company=company)
    serializer = CompanyPricingSerializer(pricing)
    return Response(serializer.data)


@extend_schema(
    request=CompanyPricingUpdateSerializer,
    responses={200: CompanyPricingSerializer},
    tags=['Company Pricing'],
)
@api_view(['POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_company_pricing(request, company_id):
    """Create or update custom pricing for a company."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

    pricing, created = CompanyPricing.objects.get_or_create(company=company)
    old_retainer = pricing.monthly_retainer
    old_placement = pricing.placement_fee
    old_csuite = pricing.csuite_placement_fee

    serializer = CompanyPricingUpdateSerializer(pricing, data=request.data, partial=True)
    if serializer.is_valid():
        pricing = serializer.save(updated_by=request.user)

        # Log pricing change
        changes = {}
        if old_retainer != pricing.monthly_retainer:
            changes['monthly_retainer'] = {
                'old': str(old_retainer) if old_retainer else None,
                'new': str(pricing.monthly_retainer) if pricing.monthly_retainer else None,
            }
        if old_placement != pricing.placement_fee:
            changes['placement_fee'] = {
                'old': str(old_placement) if old_placement else None,
                'new': str(pricing.placement_fee) if pricing.placement_fee else None,
            }
        if old_csuite != pricing.csuite_placement_fee:
            changes['csuite_placement_fee'] = {
                'old': str(old_csuite) if old_csuite else None,
                'new': str(pricing.csuite_placement_fee) if pricing.csuite_placement_fee else None,
            }

        if changes:
            log_activity(
                company=company,
                activity_type=SubscriptionActivityType.PRICING_CHANGED,
                performed_by=request.user,
                metadata={'changes': changes},
            )

        return Response(CompanyPricingSerializer(pricing).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={200: EffectivePricingSerializer},
    tags=['Company Pricing'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_effective_pricing(request, company_id):
    """Get effective pricing for a company (custom values or defaults). Staff or company members can view."""
    if not can_view_company_subscription(request.user, company_id):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

    pricing, _ = CompanyPricing.objects.get_or_create(company=company)

    data = {
        'monthly_retainer': pricing.get_effective_retainer(),
        'placement_fee': pricing.get_effective_placement_fee(),
        'csuite_placement_fee': pricing.get_effective_csuite_fee(),
        'is_custom_retainer': pricing.monthly_retainer is not None,
        'is_custom_placement': pricing.placement_fee is not None,
        'is_custom_csuite': pricing.csuite_placement_fee is not None,
    }

    serializer = EffectivePricingSerializer(data)
    return Response(serializer.data)


# =============================================================================
# Feature Override Endpoints
# =============================================================================


@extend_schema(
    responses={200: FeatureWithOverrideSerializer(many=True)},
    tags=['Company Features'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_company_features_with_overrides(request, company_id):
    """Get all features with override status for a company. Staff or company members can view."""
    if not can_view_company_subscription(request.user, company_id):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

    # Get all active features
    features = PricingFeature.objects.filter(is_active=True).order_by('order', 'name')

    # Get overrides for this company
    overrides = {
        o.feature_id: o.is_enabled
        for o in CompanyFeatureOverride.objects.filter(company=company)
    }

    result = []
    for feature in features:
        # Determine default based on service type
        if company.service_type == 'headhunting':
            default_enabled = feature.included_in_headhunting
        elif company.service_type == 'retained':
            default_enabled = feature.included_in_retained
        else:
            default_enabled = False

        # Check for override
        is_overridden = feature.id in overrides
        override_enabled = overrides.get(feature.id)
        effective_enabled = override_enabled if is_overridden else default_enabled

        result.append({
            'id': feature.id,
            'name': feature.name,
            'category': feature.category,
            'default_enabled': default_enabled,
            'is_overridden': is_overridden,
            'override_enabled': override_enabled,
            'effective_enabled': effective_enabled,
        })

    serializer = FeatureWithOverrideSerializer(result, many=True)
    return Response(serializer.data)


@extend_schema(
    request=FeatureOverrideUpdateSerializer,
    responses={200: FeatureWithOverrideSerializer},
    tags=['Company Features'],
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_feature_override(request, company_id, feature_id):
    """Update or remove a feature override for a company."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        feature = PricingFeature.objects.get(id=feature_id, is_active=True)
    except PricingFeature.DoesNotExist:
        return Response({'error': 'Feature not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = FeatureOverrideUpdateSerializer(data=request.data)
    if serializer.is_valid():
        is_enabled = serializer.validated_data.get('is_enabled')

        if is_enabled is None:
            # Remove override
            deleted, _ = CompanyFeatureOverride.objects.filter(
                company=company, feature=feature
            ).delete()
            if deleted:
                log_activity(
                    company=company,
                    activity_type=SubscriptionActivityType.FEATURE_OVERRIDE_REMOVED,
                    performed_by=request.user,
                    metadata={'feature_name': feature.name},
                )
        else:
            # Create or update override
            override, created = CompanyFeatureOverride.objects.update_or_create(
                company=company,
                feature=feature,
                defaults={
                    'is_enabled': is_enabled,
                    'updated_by': request.user,
                },
            )
            activity_type = (
                SubscriptionActivityType.FEATURE_OVERRIDE_ADDED if created
                else SubscriptionActivityType.FEATURE_OVERRIDE_CHANGED
            )
            log_activity(
                company=company,
                activity_type=activity_type,
                performed_by=request.user,
                metadata={
                    'feature_name': feature.name,
                    'is_enabled': is_enabled,
                },
            )

        # Return updated feature status
        if company.service_type == 'headhunting':
            default_enabled = feature.included_in_headhunting
        elif company.service_type == 'retained':
            default_enabled = feature.included_in_retained
        else:
            default_enabled = False

        override = CompanyFeatureOverride.objects.filter(
            company=company, feature=feature
        ).first()

        result = {
            'id': feature.id,
            'name': feature.name,
            'category': feature.category,
            'default_enabled': default_enabled,
            'is_overridden': override is not None,
            'override_enabled': override.is_enabled if override else None,
            'effective_enabled': override.is_enabled if override else default_enabled,
        }

        return Response(FeatureWithOverrideSerializer(result).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Invoice Endpoints
# =============================================================================


@extend_schema(
    parameters=[
        OpenApiParameter(name='company_id', description='Filter by company', type=str),
        OpenApiParameter(name='status', description='Filter by status', type=str),
    ],
    responses={200: InvoiceListSerializer(many=True)},
    tags=['Invoices'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_invoices(request):
    """List all invoices (staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    invoices = Invoice.objects.select_related('company').all()

    company_id = request.query_params.get('company_id')
    if company_id:
        invoices = invoices.filter(company_id=company_id)

    status_filter = request.query_params.get('status')
    if status_filter:
        invoices = invoices.filter(status=status_filter)

    invoices = invoices.order_by('-invoice_date', '-created_at')

    serializer = InvoiceListSerializer(invoices, many=True)
    return Response(serializer.data)


@extend_schema(
    request=InvoiceCreateSerializer,
    responses={201: InvoiceDetailSerializer},
    tags=['Invoices'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_invoice(request):
    """Create a new invoice."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = InvoiceCreateSerializer(data=request.data)
    if serializer.is_valid():
        invoice = serializer.save(created_by=request.user)

        log_activity(
            company=invoice.company,
            activity_type=SubscriptionActivityType.INVOICE_CREATED,
            performed_by=request.user,
            invoice=invoice,
            subscription=invoice.subscription,
            metadata={
                'invoice_number': invoice.invoice_number,
                'invoice_type': invoice.invoice_type,
                'total_amount': str(invoice.total_amount),
            },
        )

        return Response(
            InvoiceDetailSerializer(invoice).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={200: InvoiceDetailSerializer},
    tags=['Invoices'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_invoice(request, invoice_id):
    """Get invoice details. Staff or company members can view."""
    try:
        invoice = Invoice.objects.select_related(
            'company', 'subscription', 'created_by'
        ).prefetch_related('line_items').get(id=invoice_id)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission: staff or company member
    if not can_view_company_subscription(request.user, invoice.company_id):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = InvoiceDetailSerializer(invoice)
    return Response(serializer.data)


@extend_schema(
    request=InvoiceUpdateSerializer,
    responses={200: InvoiceDetailSerializer},
    tags=['Invoices'],
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_invoice(request, invoice_id):
    """Update invoice details."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        invoice = Invoice.objects.get(id=invoice_id)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

    if invoice.status == InvoiceStatus.PAID:
        return Response(
            {'error': 'Cannot update a paid invoice'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = InvoiceUpdateSerializer(invoice, data=request.data, partial=True)
    if serializer.is_valid():
        invoice = serializer.save()
        return Response(InvoiceDetailSerializer(invoice).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={200: InvoiceDetailSerializer},
    tags=['Invoices'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_invoice(request, invoice_id):
    """Mark invoice as sent."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        invoice = Invoice.objects.get(id=invoice_id)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

    if invoice.status not in [InvoiceStatus.DRAFT]:
        return Response(
            {'error': 'Only draft invoices can be sent'},
            status=status.HTTP_400_BAD_REQUEST
        )

    old_status = invoice.status
    invoice.status = InvoiceStatus.SENT
    invoice.sent_at = timezone.now()
    invoice.save()

    log_activity(
        company=invoice.company,
        activity_type=SubscriptionActivityType.INVOICE_SENT,
        performed_by=request.user,
        invoice=invoice,
        previous_status=old_status,
        new_status=invoice.status,
    )

    return Response(InvoiceDetailSerializer(invoice).data)


@extend_schema(
    responses={200: InvoiceDetailSerializer},
    tags=['Invoices'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_invoice(request, invoice_id):
    """Cancel an invoice."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        invoice = Invoice.objects.get(id=invoice_id)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

    if invoice.status == InvoiceStatus.PAID:
        return Response(
            {'error': 'Cannot cancel a paid invoice'},
            status=status.HTTP_400_BAD_REQUEST
        )

    old_status = invoice.status
    invoice.status = InvoiceStatus.CANCELLED
    invoice.cancelled_at = timezone.now()
    invoice.save()

    log_activity(
        company=invoice.company,
        activity_type=SubscriptionActivityType.INVOICE_CANCELLED,
        performed_by=request.user,
        invoice=invoice,
        previous_status=old_status,
        new_status=invoice.status,
    )

    return Response(InvoiceDetailSerializer(invoice).data)


@extend_schema(
    responses={200: InvoiceListSerializer(many=True)},
    tags=['Invoices'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_company_invoices(request, company_id):
    """Get all invoices for a company. Staff or company members can view."""
    if not can_view_company_subscription(request.user, company_id):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

    invoices = Invoice.objects.filter(company=company).order_by('-invoice_date')
    serializer = InvoiceListSerializer(invoices, many=True)
    return Response(serializer.data)


@extend_schema(
    responses={200: list},
    tags=['Invoices'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_company_placements(request, company_id):
    """
    Get all placements (applications with accepted offers) for a company.
    Used for creating placement invoices.
    """
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

    # Get applications with accepted offers for this company
    placements = Application.objects.filter(
        job__company=company,
        status=ApplicationStatus.OFFER_ACCEPTED,
    ).select_related(
        'job',
        'candidate',
        'candidate__user',
    ).order_by('-offer_accepted_at')

    # Build response data
    placement_data = []
    for app in placements:
        # Get offer details - merge final with original, final takes priority
        base_offer = app.offer_details or {}
        final_offer = app.final_offer_details or {}
        offer = {**base_offer}
        for key, value in final_offer.items():
            if value is not None and value != '' and value != []:
                offer[key] = value

        annual_salary = offer.get('annual_salary')
        offer_currency = offer.get('currency', 'ZAR')
        benefits = offer.get('benefits', [])
        equity = offer.get('equity')

        # Calculate totals
        total_benefits_cost = sum(
            b.get('annual_cost', 0) for b in benefits if isinstance(b, dict)
        ) if benefits else 0

        year_1_equity_value = 0
        if equity and isinstance(equity, dict):
            shares = equity.get('shares', 0)
            share_value = equity.get('share_value', 0)
            vesting_years = equity.get('vesting_years', 1)
            if shares and share_value and vesting_years:
                year_1_equity_value = (shares * share_value) / vesting_years

        total_cost_to_company = (annual_salary or 0) + total_benefits_cost + year_1_equity_value

        # Check if there's already a placement invoice for this application
        has_placement_invoice = Invoice.objects.filter(
            placement=app,
            invoice_type=InvoiceType.PLACEMENT,
        ).exclude(status=InvoiceStatus.CANCELLED).exists()

        placement_data.append({
            'id': str(app.id),
            'candidate_id': str(app.candidate.id),
            'candidate_name': app.candidate.user.get_full_name() or app.candidate.user.email,
            'candidate_email': app.candidate.user.email,
            'job_id': str(app.job.id),
            'job_title': app.job.title,
            'is_csuite': app.job.is_csuite,
            'offer_currency': offer_currency,
            'offer_accepted_at': app.offer_accepted_at.isoformat() if app.offer_accepted_at else None,
            'company_id': str(company.id),
            'company_name': company.name,
            'has_placement_invoice': has_placement_invoice,
            # Full offer details
            'annual_salary': annual_salary,
            'benefits': benefits,
            'equity': equity,
            'total_benefits_cost': total_benefits_cost,
            'year_1_equity_value': year_1_equity_value,
            'total_cost_to_company': total_cost_to_company,
        })

    return Response(placement_data)


@extend_schema(
    responses={201: InvoiceDetailSerializer},
    tags=['Invoices'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_retainer_invoice(request, company_id):
    """Generate a monthly retainer invoice for a company."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        subscription = Subscription.objects.get(company=company)
    except Subscription.DoesNotExist:
        return Response(
            {'error': 'Company does not have an active subscription'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if subscription.status != SubscriptionStatus.ACTIVE:
        return Response(
            {'error': 'Subscription is not active'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get effective retainer
    pricing, _ = CompanyPricing.objects.get_or_create(company=company)
    monthly_retainer = pricing.get_effective_retainer()

    # Calculate billing period (current month)
    today = date.today()
    billing_period_start = today.replace(day=1)
    if today.month == 12:
        billing_period_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        billing_period_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)

    # Create invoice
    invoice = Invoice.objects.create(
        company=company,
        subscription=subscription,
        invoice_number=Invoice.generate_invoice_number(),
        invoice_type=InvoiceType.RETAINER,
        billing_mode=BillingMode.IN_SYSTEM,
        invoice_date=today,
        due_date=today + timedelta(days=30),
        billing_period_start=billing_period_start,
        billing_period_end=billing_period_end,
        subtotal=monthly_retainer,
        vat_rate=Decimal('0.15'),
        vat_amount=monthly_retainer * Decimal('0.15'),
        total_amount=monthly_retainer * Decimal('1.15'),
        status=InvoiceStatus.DRAFT,
        description=f'Monthly retainer for {billing_period_start.strftime("%B %Y")}',
        created_by=request.user,
    )

    InvoiceLineItem.objects.create(
        invoice=invoice,
        description=f'Monthly Retainer Fee - {billing_period_start.strftime("%B %Y")}',
        quantity=Decimal('1'),
        unit_price=monthly_retainer,
        amount=monthly_retainer,
    )

    log_activity(
        company=company,
        activity_type=SubscriptionActivityType.INVOICE_CREATED,
        performed_by=request.user,
        subscription=subscription,
        invoice=invoice,
        metadata={
            'invoice_type': InvoiceType.RETAINER,
            'billing_period': f'{billing_period_start} to {billing_period_end}',
        },
    )

    return Response(
        InvoiceDetailSerializer(invoice).data,
        status=status.HTTP_201_CREATED
    )


# =============================================================================
# Payment Endpoints
# =============================================================================


@extend_schema(
    responses={200: PaymentSerializer(many=True)},
    tags=['Payments'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_invoice_payments(request, invoice_id):
    """List all payments for an invoice. Staff or company members can view."""
    try:
        invoice = Invoice.objects.get(id=invoice_id)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permission: staff or company member
    if not can_view_company_subscription(request.user, invoice.company_id):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    payments = Payment.objects.filter(invoice=invoice).order_by('-payment_date')
    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)


@extend_schema(
    request=PaymentCreateSerializer,
    responses={201: PaymentSerializer},
    tags=['Payments'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_payment(request, invoice_id):
    """Record a payment against an invoice."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        invoice = Invoice.objects.get(id=invoice_id)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

    if invoice.status in [InvoiceStatus.CANCELLED, InvoiceStatus.PAID]:
        return Response(
            {'error': f'Cannot record payment on {invoice.status} invoice'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = PaymentCreateSerializer(data=request.data)
    if serializer.is_valid():
        payment = Payment.objects.create(
            invoice=invoice,
            recorded_by=request.user,
            **serializer.validated_data
        )

        # Update invoice amount_paid
        invoice.amount_paid = invoice.payments.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')

        # Update invoice status
        old_status = invoice.status
        if invoice.amount_paid >= invoice.total_amount:
            invoice.status = InvoiceStatus.PAID
            invoice.paid_at = timezone.now()
            activity_type = SubscriptionActivityType.INVOICE_PAID
        elif invoice.amount_paid > 0:
            invoice.status = InvoiceStatus.PARTIALLY_PAID
            activity_type = SubscriptionActivityType.INVOICE_PARTIALLY_PAID
        else:
            activity_type = SubscriptionActivityType.PAYMENT_RECORDED

        invoice.save()

        log_activity(
            company=invoice.company,
            activity_type=SubscriptionActivityType.PAYMENT_RECORDED,
            performed_by=request.user,
            invoice=invoice,
            metadata={
                'payment_amount': str(payment.amount),
                'payment_method': payment.payment_method,
            },
        )

        if old_status != invoice.status:
            log_activity(
                company=invoice.company,
                activity_type=activity_type,
                performed_by=request.user,
                invoice=invoice,
                previous_status=old_status,
                new_status=invoice.status,
            )

        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={204: None},
    tags=['Payments'],
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_payment(request, payment_id):
    """Delete a payment."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        payment = Payment.objects.select_related('invoice').get(id=payment_id)
    except Payment.DoesNotExist:
        return Response({'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)

    invoice = payment.invoice
    if invoice.status == InvoiceStatus.PAID:
        return Response(
            {'error': 'Cannot delete payment from a fully paid invoice'},
            status=status.HTTP_400_BAD_REQUEST
        )

    deleted_amount = payment.amount
    payment.delete()

    # Update invoice
    invoice.amount_paid = invoice.payments.aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')

    old_status = invoice.status
    if invoice.amount_paid == 0 and invoice.status == InvoiceStatus.PARTIALLY_PAID:
        invoice.status = InvoiceStatus.SENT
    invoice.save()

    log_activity(
        company=invoice.company,
        activity_type=SubscriptionActivityType.PAYMENT_DELETED,
        performed_by=request.user,
        invoice=invoice,
        metadata={'deleted_amount': str(deleted_amount)},
    )

    return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Dashboard/Alert Endpoints
# =============================================================================


@extend_schema(
    responses={200: SubscriptionAlertSerializer(many=True)},
    tags=['Dashboard'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subscription_alerts(request):
    """Get subscription alerts (renewals due, overdue invoices, etc.)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    alerts = []
    today = date.today()

    # Renewals due in next 30 days
    renewal_threshold = today + timedelta(days=30)
    expiring_subs = Subscription.objects.filter(
        status=SubscriptionStatus.ACTIVE,
        contract_end_date__lte=renewal_threshold,
        contract_end_date__gte=today,
    ).select_related('company')

    for sub in expiring_subs:
        days_left = (sub.contract_end_date - today).days
        severity = 'critical' if days_left <= 7 else 'warning' if days_left <= 14 else 'info'
        alerts.append({
            'type': 'renewal_due',
            'company_id': sub.company.id,
            'company_name': sub.company.name,
            'message': f'Subscription expires in {days_left} days',
            'severity': severity,
            'subscription_id': sub.id,
            'due_date': sub.contract_end_date,
        })

    # Overdue invoices
    overdue_invoices = Invoice.objects.filter(
        status__in=[InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID],
        due_date__lt=today,
    ).select_related('company')

    for inv in overdue_invoices:
        days_overdue = (today - inv.due_date).days
        severity = 'critical' if days_overdue >= 30 else 'warning'
        alerts.append({
            'type': 'overdue_invoice',
            'company_id': inv.company.id,
            'company_name': inv.company.name,
            'message': f'Invoice {inv.invoice_number} is {days_overdue} days overdue',
            'severity': severity,
            'invoice_id': inv.id,
            'due_date': inv.due_date,
            'amount': inv.balance_due,
        })

    serializer = SubscriptionAlertSerializer(alerts, many=True)
    return Response(serializer.data)


@extend_schema(
    responses={200: SubscriptionSummarySerializer},
    tags=['Dashboard'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subscription_summary(request):
    """Get subscription summary statistics."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    today = date.today()
    month_end = (today.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)

    # Subscription counts
    total = Subscription.objects.count()
    active = Subscription.objects.filter(status=SubscriptionStatus.ACTIVE).count()
    paused = Subscription.objects.filter(status=SubscriptionStatus.PAUSED).count()
    terminated = Subscription.objects.filter(status=SubscriptionStatus.TERMINATED).count()

    # Expiring this month
    expiring = Subscription.objects.filter(
        status=SubscriptionStatus.ACTIVE,
        contract_end_date__gte=today,
        contract_end_date__lte=month_end,
    ).count()

    # MRR calculation (sum of effective retainers for active subscriptions)
    active_subs = Subscription.objects.filter(
        status=SubscriptionStatus.ACTIVE
    ).select_related('company')

    total_mrr = Decimal('0')
    for sub in active_subs:
        try:
            pricing = CompanyPricing.objects.get(company=sub.company)
            total_mrr += pricing.get_effective_retainer()
        except CompanyPricing.DoesNotExist:
            config = PricingConfig.get_config()
            total_mrr += Decimal(str(config.retained_monthly_retainer))

    # Overdue invoices
    overdue_invoices = Invoice.objects.filter(
        status__in=[InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID],
        due_date__lt=today,
    )
    overdue_count = overdue_invoices.count()
    overdue_amount = overdue_invoices.aggregate(
        total=Sum('total_amount')
    )['total'] or Decimal('0')

    # Subtract amount paid
    overdue_paid = overdue_invoices.aggregate(
        total=Sum('amount_paid')
    )['total'] or Decimal('0')
    overdue_amount = overdue_amount - overdue_paid

    data = {
        'total_subscriptions': total,
        'active_subscriptions': active,
        'paused_subscriptions': paused,
        'terminated_subscriptions': terminated,
        'expiring_this_month': expiring,
        'total_mrr': total_mrr,
        'overdue_invoices_count': overdue_count,
        'overdue_invoices_amount': overdue_amount,
    }

    serializer = SubscriptionSummarySerializer(data)
    return Response(serializer.data)


# =============================================================================
# Company Activity Endpoint
# =============================================================================


@extend_schema(
    responses={200: SubscriptionActivityLogSerializer(many=True)},
    tags=['Company Activity'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_company_activity(request, company_id):
    """Get all subscription activity for a company. Staff or company members can view."""
    if not can_view_company_subscription(request.user, company_id):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)

    activities = SubscriptionActivityLog.objects.filter(
        company=company
    ).select_related('performed_by', 'subscription', 'invoice').order_by('-created_at')

    # Optional filter by activity type
    activity_type = request.query_params.get('activity_type')
    if activity_type:
        activities = activities.filter(activity_type=activity_type)

    serializer = SubscriptionActivityLogSerializer(activities, many=True)
    return Response(serializer.data)
