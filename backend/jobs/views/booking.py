import logging
from datetime import timedelta

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.utils import timezone

from ..models import (
    ActivityType,
    StageInstanceStatus,
)
from scheduling.models import UserCalendarConnection, BookingToken
from scheduling.services.calendar_service import CalendarService, CalendarServiceError
from notifications.services.notification_service import NotificationService
from .activity import log_activity

logger = logging.getLogger(__name__)


# =============================================================================
# Public Booking Endpoints
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_booking_info(request, token):
    """
    Get booking info and available slots for a booking token.
    Public endpoint - no authentication required.
    """
    try:
        booking = BookingToken.objects.select_related(
            'stage_instance__application__job__company',
            'stage_instance__application__candidate__user',
            'stage_instance__stage_template',
            'stage_instance__interviewer',
        ).get(token=token)
    except BookingToken.DoesNotExist:
        return Response({'error': 'Booking link not found or expired'}, status=status.HTTP_404_NOT_FOUND)

    # Check if token is valid
    if not booking.is_valid:
        return Response({
            'error': 'This booking link has expired or already been used'
        }, status=status.HTTP_410_GONE)

    instance = booking.stage_instance
    application = instance.application
    job = application.job
    company = job.company
    template = instance.stage_template

    # Get interviewer availability
    available_slots = []
    calendar_error = None
    interviewer_timezone = None
    if instance.interviewer:
        try:
            # Get interviewer's calendar connection for settings
            connection = UserCalendarConnection.objects.filter(
                user=instance.interviewer,
                is_active=True
            ).first()

            # Use interviewer's booking settings or defaults
            days_ahead = connection.booking_days_ahead if connection else 14
            interviewer_timezone = connection.timezone if connection else None

            start_date = timezone.now()
            end_date = start_date + timedelta(days=days_ahead)

            available_slots = CalendarService.get_free_busy(
                user=instance.interviewer,
                start_date=start_date,
                end_date=end_date,
                duration_minutes=template.default_duration_minutes or 60,
            )
        except CalendarServiceError as e:
            logger.warning(f"Calendar service error for booking {token}: {e}")
            calendar_error = str(e)
        except Exception as e:
            logger.error(f"Unexpected error getting availability for booking {token}: {e}")
            calendar_error = "Failed to load calendar availability"

    # If no slots returned but interviewer has calendar, log it for debugging
    if instance.interviewer and not available_slots:
        # Check if interviewer has a calendar connection
        has_connection = UserCalendarConnection.objects.filter(
            user=instance.interviewer,
            is_active=True
        ).exists()
        logger.info(
            f"Booking {token}: interviewer={instance.interviewer.id}, "
            f"has_connection={has_connection}, slots_count={len(available_slots)}, "
            f"error={calendar_error}"
        )

    # Build location string
    location = instance.location or template.custom_location or ''
    if not location and template.use_company_address:
        address_parts = [
            company.billing_address or '',
            str(company.billing_city) if company.billing_city else '',
            str(company.billing_country) if company.billing_country else '',
        ]
        location = ', '.join(filter(None, address_parts))

    response_data = {
        'company_name': company.name,
        'company_logo': company.logo.url if company.logo else None,
        'job_title': job.title,
        'stage_name': template.name,
        'stage_type': template.stage_type,
        'duration_minutes': template.default_duration_minutes or 60,
        'interviewer_name': instance.interviewer.full_name if instance.interviewer else None,
        'location': location,
        'available_slots': available_slots,
        'expires_at': booking.expires_at.isoformat(),
        'interviewer_timezone': interviewer_timezone,
    }

    # Include calendar error if any (for debugging)
    if calendar_error:
        response_data['calendar_error'] = calendar_error

    return Response(response_data)


@api_view(['POST'])
@permission_classes([AllowAny])
def book_slot(request, token):
    """
    Candidate books a specific time slot.
    Public endpoint - no authentication required.
    """
    try:
        booking = BookingToken.objects.select_related(
            'stage_instance__application__job__company',
            'stage_instance__application__candidate__user',
            'stage_instance__stage_template',
            'stage_instance__interviewer',
        ).get(token=token)
    except BookingToken.DoesNotExist:
        return Response({'error': 'Booking link not found or expired'}, status=status.HTTP_404_NOT_FOUND)

    # Check if token is valid
    if not booking.is_valid:
        return Response({
            'error': 'This booking link has expired or already been used'
        }, status=status.HTTP_410_GONE)

    scheduled_at = request.data.get('scheduled_at')
    if not scheduled_at:
        return Response({'error': 'scheduled_at is required'}, status=status.HTTP_400_BAD_REQUEST)

    from django.utils.dateparse import parse_datetime
    scheduled_datetime = parse_datetime(scheduled_at)
    if not scheduled_datetime:
        return Response({'error': 'Invalid datetime format'}, status=status.HTTP_400_BAD_REQUEST)

    instance = booking.stage_instance
    application = instance.application
    template = instance.stage_template
    company = application.job.company

    # Determine location for in-person interviews
    location = ''
    if template.requires_location:
        if template.use_company_address:
            # Get company address
            address_parts = [
                company.billing_address or '',
                str(company.billing_city) if company.billing_city else '',
                str(company.billing_country) if company.billing_country else '',
            ]
            location = ', '.join(filter(None, address_parts))
        elif template.custom_location:
            location = template.custom_location

    # Update the stage instance
    instance.scheduled_at = scheduled_datetime
    instance.duration_minutes = template.default_duration_minutes or 60
    instance.status = StageInstanceStatus.SCHEDULED
    instance.location = location
    instance.save()

    # Create calendar event with auto-generated meeting link
    if instance.interviewer:
        try:
            connection = UserCalendarConnection.objects.filter(
                user=instance.interviewer,
                is_active=True
            ).first()

            if connection:
                attendees = [application.candidate.user.email]
                for participant in instance.participants.all():
                    if participant.email and participant.email not in attendees:
                        attendees.append(participant.email)

                CalendarService.create_event_with_meeting_link(
                    connection=connection,
                    stage_instance=instance,
                    attendees=attendees,
                )
                instance.refresh_from_db()
        except CalendarServiceError as e:
            logger.warning(f"Failed to create calendar event during booking: {e}")

    # Mark token as used
    booking.mark_as_used()

    # Log activity (performed by candidate via booking link)
    log_activity(
        application=application,
        user=application.candidate.user,  # The candidate
        activity_type=ActivityType.INTERVIEW_BOOKED,
        new_stage=template.order,
        stage_name=template.name,
        metadata={
            'stage_name': template.name,
            'stage_type': template.stage_type,
            'scheduled_at': scheduled_datetime.isoformat(),
            'duration_minutes': instance.duration_minutes,
            'interviewer_name': instance.interviewer.full_name if instance.interviewer else None,
            'meeting_link': instance.meeting_link or None,
            'location': instance.location or None,
        }
    )

    # Send booking confirmation notification (self-scheduled)
    try:
        NotificationService.notify_booking_confirmed(instance)
    except Exception as e:
        logger.warning(f"Failed to send booking confirmation: {e}")

    return Response({
        'success': True,
        'scheduled_at': instance.scheduled_at.isoformat(),
        'duration_minutes': instance.duration_minutes,
        'meeting_link': instance.meeting_link or None,
        'location': instance.location or None,
        'message': 'Your interview has been scheduled! Check your email for confirmation.',
    })
