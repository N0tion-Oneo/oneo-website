"""Views for Contact (via Lead model) and NewsletterSubscriber models."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter

from users.models import UserRole
from companies.models import Lead, LeadSource
from companies.serializers import (
    LeadListSerializer,
    LeadDetailSerializer,
    ContactFormSerializer,
    LeadContactUpdateSerializer,
)
from core.models import OnboardingStage
from ..models import NewsletterSubscriber
from ..serializers import (
    NewsletterSubscriberSerializer,
    NewsletterSubscribeSerializer,
)


def is_staff_user(user):
    return user.role in [UserRole.ADMIN, UserRole.RECRUITER]


# =============================================================================
# Contact Submission Admin Endpoints (Now using Lead model with source='inbound')
# =============================================================================

@extend_schema(
    responses={200: LeadListSerializer(many=True)},
    tags=['CMS - Contact (Admin)'],
    parameters=[
        OpenApiParameter(name='is_read', description='Filter by read status', required=False, type=bool),
        OpenApiParameter(name='is_replied', description='Filter by replied status', required=False, type=bool),
    ],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_contact_submissions(request):
    """List all contact submissions / inbound leads (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    # Filter to only show inbound leads (from contact form)
    leads = Lead.objects.filter(source=LeadSource.INBOUND).select_related(
        'onboarding_stage', 'assigned_to', 'industry'
    ).order_by('-created_at')

    is_read = request.query_params.get('is_read')
    if is_read is not None:
        leads = leads.filter(is_read=is_read.lower() == 'true')

    is_replied = request.query_params.get('is_replied')
    if is_replied is not None:
        leads = leads.filter(is_replied=is_replied.lower() == 'true')

    serializer = LeadListSerializer(leads, many=True)
    return Response(serializer.data)


@extend_schema(
    responses={200: LeadDetailSerializer},
    tags=['CMS - Contact (Admin)'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_contact_submission(request, submission_id):
    """Get contact submission / inbound lead by ID (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        lead = Lead.objects.select_related(
            'onboarding_stage', 'assigned_to', 'industry',
            'created_by', 'converted_to_company', 'converted_to_user'
        ).prefetch_related('invitations').get(id=submission_id)
    except Lead.DoesNotExist:
        return Response({'error': 'Submission not found'}, status=status.HTTP_404_NOT_FOUND)

    # Auto-mark as read when viewed
    if not lead.is_read:
        lead.is_read = True
        lead.save(update_fields=['is_read'])

    serializer = LeadDetailSerializer(lead)
    return Response(serializer.data)


@extend_schema(
    request=LeadContactUpdateSerializer,
    responses={200: LeadDetailSerializer},
    tags=['CMS - Contact (Admin)'],
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_contact_submission(request, submission_id):
    """Update contact submission / inbound lead status (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        lead = Lead.objects.get(id=submission_id)
    except Lead.DoesNotExist:
        return Response({'error': 'Submission not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = LeadContactUpdateSerializer(lead, data=request.data, partial=True)
    if serializer.is_valid():
        lead = serializer.save()
        return Response(LeadDetailSerializer(lead).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={204: None},
    tags=['CMS - Contact (Admin)'],
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_contact_submission(request, submission_id):
    """Delete a contact submission / inbound lead (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        lead = Lead.objects.get(id=submission_id)
    except Lead.DoesNotExist:
        return Response({'error': 'Submission not found'}, status=status.HTTP_404_NOT_FOUND)

    lead.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Contact Form Public Endpoint
# =============================================================================

@extend_schema(
    request=ContactFormSerializer,
    responses={201: dict},
    tags=['CMS - Contact (Public)'],
)
@api_view(['POST'])
@permission_classes([AllowAny])
def submit_contact_form(request):
    """Submit contact form (public). Creates a Lead with source='inbound'."""
    serializer = ContactFormSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data

        # Get the initial onboarding stage for leads
        initial_stage = OnboardingStage.objects.filter(
            entity_type='lead',
            is_active=True
        ).order_by('order').first()

        # Create a Lead with source='inbound'
        Lead.objects.create(
            name=data['name'],
            email=data['email'],
            phone=data.get('phone', ''),
            company_name=data.get('company', '') or 'Not provided',
            subject=data.get('subject', ''),
            notes=data['message'],  # Message goes into notes
            source=LeadSource.INBOUND,
            source_page=data.get('source_page', ''),
            onboarding_stage=initial_stage,
        )

        return Response(
            {'message': 'Thank you for your message. We will get back to you soon.'},
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Newsletter Admin Endpoints
# =============================================================================

@extend_schema(
    responses={200: NewsletterSubscriberSerializer(many=True)},
    tags=['CMS - Newsletter (Admin)'],
    parameters=[
        OpenApiParameter(name='is_active', description='Filter by active status', required=False, type=bool),
    ],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_newsletter_subscribers(request):
    """List all newsletter subscribers (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    subscribers = NewsletterSubscriber.objects.all()

    is_active = request.query_params.get('is_active')
    if is_active is not None:
        subscribers = subscribers.filter(is_active=is_active.lower() == 'true')

    serializer = NewsletterSubscriberSerializer(subscribers, many=True)
    return Response(serializer.data)


@extend_schema(
    responses={204: None},
    tags=['CMS - Newsletter (Admin)'],
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_newsletter_subscriber(request, subscriber_id):
    """Delete a newsletter subscriber (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        subscriber = NewsletterSubscriber.objects.get(id=subscriber_id)
    except NewsletterSubscriber.DoesNotExist:
        return Response({'error': 'Subscriber not found'}, status=status.HTTP_404_NOT_FOUND)

    subscriber.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Newsletter Public Endpoint
# =============================================================================

@extend_schema(
    request=NewsletterSubscribeSerializer,
    responses={201: dict},
    tags=['CMS - Newsletter (Public)'],
)
@api_view(['POST'])
@permission_classes([AllowAny])
def subscribe_to_newsletter(request):
    """Subscribe to newsletter (public)."""
    serializer = NewsletterSubscribeSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(
            {'message': 'Thank you for subscribing to our newsletter!'},
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
