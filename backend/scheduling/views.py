from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import UserCalendarConnection, MeetingType, Booking, BookingStatus
from .serializers import (
    UserCalendarConnectionSerializer,
    CalendarConnectionUpdateSerializer,
    MeetingTypeSerializer,
    MeetingTypeCreateUpdateSerializer,
    MeetingTypePublicSerializer,
    BookingSerializer,
    BookingCreateSerializer,
    BookingUpdateSerializer,
    BookingCancelSerializer,
)
from users.models import User, RecruiterProfile


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_calendar_connections(request):
    """
    List the current user's calendar connections.
    """
    connections = UserCalendarConnection.objects.filter(user=request.user)
    serializer = UserCalendarConnectionSerializer(connections, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def initiate_calendar_oauth(request, provider):
    """
    Initiate OAuth flow for a calendar provider.
    Returns the OAuth authorization URL.
    """
    from .services.calendar_service import CalendarService

    if provider not in ['google', 'microsoft']:
        return Response({'error': 'Invalid provider'}, status=status.HTTP_400_BAD_REQUEST)

    # Build redirect URI for OAuth callback
    if provider == 'google':
        redirect_uri = settings.GOOGLE_CALENDAR_REDIRECT_URI
        if not settings.GOOGLE_CLIENT_ID:
            return Response({'error': 'Google Calendar not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        auth_url = CalendarService.get_google_auth_url(
            user_id=str(request.user.id),
            redirect_uri=redirect_uri
        )
    else:
        redirect_uri = settings.MICROSOFT_CALENDAR_REDIRECT_URI
        if not settings.MICROSOFT_CLIENT_ID:
            return Response({'error': 'Microsoft Calendar not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        auth_url = CalendarService.get_microsoft_auth_url(
            user_id=str(request.user.id),
            redirect_uri=redirect_uri
        )

    return Response({'auth_url': auth_url})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calendar_oauth_callback(request, provider):
    """
    Handle OAuth callback from calendar provider.
    Exchange authorization code for tokens.
    """
    from .services.calendar_service import CalendarService, CalendarServiceError

    if provider not in ['google', 'microsoft']:
        return Response({'error': 'Invalid provider'}, status=status.HTTP_400_BAD_REQUEST)

    code = request.data.get('code')
    if not code:
        return Response({'error': 'Authorization code not provided'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        if provider == 'google':
            redirect_uri = settings.GOOGLE_CALENDAR_REDIRECT_URI
            connection = CalendarService.exchange_google_code(
                code=code,
                redirect_uri=redirect_uri,
                user=request.user
            )
        else:
            redirect_uri = settings.MICROSOFT_CALENDAR_REDIRECT_URI
            connection = CalendarService.exchange_microsoft_code(
                code=code,
                redirect_uri=redirect_uri,
                user=request.user
            )

        return Response({
            'message': f'{provider} calendar connected successfully',
            'provider': provider,
            'email': connection.provider_email,
        })
    except CalendarServiceError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': 'Failed to connect calendar'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def disconnect_calendar(request, provider):
    """
    Disconnect a calendar provider.
    """
    if provider not in ['google', 'microsoft']:
        return Response({'error': 'Invalid provider'}, status=status.HTTP_400_BAD_REQUEST)

    deleted, _ = UserCalendarConnection.objects.filter(
        user=request.user,
        provider=provider
    ).delete()

    if deleted:
        return Response({'message': f'{provider} calendar disconnected'})
    return Response({'error': 'No connection found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_available_calendars(request, provider):
    """
    List available calendars for a provider connection.
    Used to let users select which calendar to use for availability.
    """
    if provider not in ['google', 'microsoft']:
        return Response({'error': 'Invalid provider'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        connection = UserCalendarConnection.objects.get(
            user=request.user,
            provider=provider,
            is_active=True
        )
    except UserCalendarConnection.DoesNotExist:
        return Response({'error': 'No active connection found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        from .services.calendar_service import CalendarService
        calendars = CalendarService.list_calendars(connection)
        return Response({
            'calendars': calendars,
            'current_calendar_id': connection.calendar_id,
        })
    except Exception as e:
        return Response({
            'error': f'Failed to list calendars: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_calendar_settings(request, provider):
    """
    Update calendar connection settings (selected calendar, booking settings).
    """
    if provider not in ['google', 'microsoft']:
        return Response({'error': 'Invalid provider'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        connection = UserCalendarConnection.objects.get(
            user=request.user,
            provider=provider,
            is_active=True
        )
    except UserCalendarConnection.DoesNotExist:
        return Response({'error': 'No active connection found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = CalendarConnectionUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    # Update fields if provided
    if 'calendar_id' in data:
        connection.calendar_id = data['calendar_id']
    if 'calendar_name' in data:
        connection.calendar_name = data['calendar_name']
    if 'booking_days_ahead' in data:
        connection.booking_days_ahead = data['booking_days_ahead']
    if 'business_hours_start' in data:
        connection.business_hours_start = data['business_hours_start']
    if 'business_hours_end' in data:
        connection.business_hours_end = data['business_hours_end']
    if 'min_notice_hours' in data:
        connection.min_notice_hours = data['min_notice_hours']
    if 'buffer_minutes' in data:
        connection.buffer_minutes = data['buffer_minutes']
    if 'available_days' in data:
        # Convert list to comma-separated string
        connection.available_days = ','.join(str(d) for d in data['available_days'])
    if 'timezone' in data:
        connection.timezone = data['timezone']

    connection.save()

    return Response(UserCalendarConnectionSerializer(connection).data)


# ============================================================================
# Meeting Type Views
# ============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def meeting_types_list_create(request):
    """
    GET: List the current user's meeting types.
    POST: Create a new meeting type.
    """
    if request.method == 'GET':
        meeting_types = MeetingType.objects.filter(owner=request.user)
        serializer = MeetingTypeSerializer(meeting_types, many=True)
        return Response(serializer.data)

    # POST - Create
    serializer = MeetingTypeCreateUpdateSerializer(
        data=request.data,
        context={'request': request}
    )
    if serializer.is_valid():
        meeting_type = serializer.save()
        return Response(
            MeetingTypeSerializer(meeting_type).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def meeting_type_detail(request, meeting_type_id):
    """
    GET: Retrieve a meeting type.
    PATCH: Update a meeting type.
    DELETE: Delete a meeting type.
    """
    meeting_type = get_object_or_404(MeetingType, id=meeting_type_id, owner=request.user)

    if request.method == 'GET':
        serializer = MeetingTypeSerializer(meeting_type)
        return Response(serializer.data)

    if request.method == 'PATCH':
        serializer = MeetingTypeCreateUpdateSerializer(
            meeting_type,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        if serializer.is_valid():
            meeting_type = serializer.save()
            return Response(MeetingTypeSerializer(meeting_type).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE
    meeting_type.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# Public Booking Page Views
# ============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def public_recruiter_booking_page(request, booking_slug):
    """
    Get recruiter's public booking page info and available meeting types.
    """
    profile = get_object_or_404(
        RecruiterProfile.objects.select_related('user'),
        booking_slug=booking_slug,
        user__role__in=['admin', 'recruiter']
    )
    user = profile.user

    # Get user's active meeting types
    meeting_types = MeetingType.objects.filter(owner=user, is_active=True)

    # Get recruiter profile info if available
    recruiter_profile = getattr(user, 'recruiter_profile', None)

    return Response({
        'user': {
            'id': user.id,
            'booking_slug': profile.booking_slug,
            'name': user.full_name,
            'email': user.email,
            'avatar': user.avatar.url if user.avatar else None,
            'professional_title': profile.professional_title,
            'bio': profile.bio,
        },
        'meeting_types': MeetingTypePublicSerializer(meeting_types, many=True).data,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def public_meeting_type_availability(request, booking_slug, meeting_type_slug):
    """
    Get available time slots for a specific meeting type.
    Uses the organizer's calendar to calculate availability.
    """
    from .services.calendar_service import CalendarService
    from datetime import datetime, timedelta
    from django.utils import timezone as dj_timezone

    profile = get_object_or_404(
        RecruiterProfile.objects.select_related('user'),
        booking_slug=booking_slug,
        user__role__in=['admin', 'recruiter']
    )
    user = profile.user
    meeting_type = get_object_or_404(
        MeetingType,
        owner=user,
        slug=meeting_type_slug,
        is_active=True
    )

    # Get user's calendar connection for availability
    try:
        connection = UserCalendarConnection.objects.filter(
            user=user,
            is_active=True
        ).first()

        if not connection:
            return Response({
                'error': 'Organizer has no calendar connected'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Calculate date range based on booking_days_ahead setting
        now = dj_timezone.now()
        start_date = now
        end_date = now + timedelta(days=connection.booking_days_ahead or 14)

        # Calculate availability
        slots = CalendarService.get_free_busy(
            user=user,
            start_date=start_date,
            end_date=end_date,
            duration_minutes=meeting_type.duration_minutes,
        )

        return Response({
            'meeting_type': MeetingTypePublicSerializer(meeting_type).data,
            'available_slots': slots,
            'timezone': connection.timezone,
        })

    except Exception as e:
        return Response({
            'error': f'Failed to get availability: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def public_create_booking(request, booking_slug, meeting_type_slug):
    """
    Create a booking for a public meeting type.
    No authentication required - anyone can book.

    If the attendee email matches an existing user with a candidate profile,
    the booking is linked to that candidate. If no user exists, a candidate
    invitation is created and sent.
    """
    from .services.calendar_service import CalendarService
    from authentication.models import CandidateInvitation
    from candidates.models import CandidateProfile
    from datetime import timedelta
    from django.utils import timezone

    profile = get_object_or_404(
        RecruiterProfile.objects.select_related('user'),
        booking_slug=booking_slug,
        user__role__in=['admin', 'recruiter']
    )
    organizer = profile.user
    meeting_type = get_object_or_404(
        MeetingType,
        owner=organizer,
        slug=meeting_type_slug,
        is_active=True
    )

    # Add meeting_type to request data
    data = request.data.copy()
    data['meeting_type'] = meeting_type.id

    serializer = BookingCreateSerializer(
        data=data,
        context={'request': request}
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    booking = serializer.save()

    # Check if attendee email matches an existing user
    attendee_email = booking.attendee_email.lower()
    invitation_created = False
    invitation_token = None

    try:
        existing_user = User.objects.get(email__iexact=attendee_email)
        # Link to existing user
        booking.attendee_user = existing_user

        # Check if user has a candidate profile
        candidate_profile = getattr(existing_user, 'candidate_profile', None)
        if candidate_profile:
            booking.candidate_profile = candidate_profile

        booking.save(update_fields=['attendee_user', 'candidate_profile'])

    except User.DoesNotExist:
        # No existing user - create invitation for them to sign up
        # Set expiration to 7 days before the meeting (or 24 hours minimum)
        meeting_time = booking.scheduled_at
        days_until_meeting = (meeting_time - timezone.now()).days

        if days_until_meeting > 7:
            expires_at = timezone.now() + timedelta(days=7)
        else:
            # At least 24 hours before meeting, or 24 hours from now if meeting is sooner
            expires_at = min(
                meeting_time - timedelta(hours=24),
                timezone.now() + timedelta(days=7)
            )
            # Ensure at least 24 hours from now
            if expires_at < timezone.now() + timedelta(hours=24):
                expires_at = timezone.now() + timedelta(hours=24)

        invitation = CandidateInvitation.objects.create(
            email=attendee_email,
            name=booking.attendee_name,
            created_by=organizer,
            booking=booking,
            expires_at=expires_at,
        )
        invitation_created = True
        invitation_token = str(invitation.token)

        # Send invitation email with meeting context
        try:
            from notifications.services import NotificationService
            from django.conf import settings as django_settings
            frontend_url = getattr(django_settings, 'FRONTEND_URL', 'http://localhost:5173')
            signup_url = f"{frontend_url}/signup/candidate/{invitation_token}"

            NotificationService.notify_candidate_booking_invite(
                email=attendee_email,
                name=booking.attendee_name,
                recruiter=organizer,
                meeting_type_name=meeting_type.name,
                scheduled_at=booking.scheduled_at,
                duration_minutes=booking.duration_minutes,
                signup_url=signup_url,
            )
        except Exception as e:
            # Log but don't fail the booking
            print(f"Failed to send candidate invitation email: {e}")

    # Try to create calendar event with auto-generated meeting link
    try:
        event_result = CalendarService.create_booking_event(
            booking=booking,
            attendee_email=booking.attendee_email,
            attendee_name=booking.attendee_name,
        )
        # create_booking_event handles updating the booking model
    except Exception as e:
        # Log but don't fail the booking
        print(f"Failed to create calendar event: {e}")

    # Return booking with redirect URL and invitation info
    response_data = BookingSerializer(booking).data
    response_data['redirect_url'] = meeting_type.redirect_url or None
    response_data['confirmation_message'] = meeting_type.confirmation_message
    response_data['invitation_created'] = invitation_created
    if invitation_token:
        response_data['signup_url'] = f"/signup/candidate/{invitation_token}"

    return Response(response_data, status=status.HTTP_201_CREATED)


# ============================================================================
# Booking Management Views (for recruiters/admins)
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bookings_list(request):
    """
    List all meetings for the current user including:
    - Booking objects (recruiter booking system)
    - ApplicationStageInstance objects (application interviews/meetings)

    Returns a unified format for both types.
    """
    from django.db.models import Q
    from django.utils import timezone
    from jobs.models import ApplicationStageInstance

    user = request.user
    results = []

    # Get filter params
    status_filter = request.query_params.get('status')
    category = request.query_params.get('category')
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    upcoming = request.query_params.get('upcoming')

    # =========================================================================
    # 1. Get Booking objects
    # =========================================================================
    if user.role == 'admin':
        # Admins see ALL bookings
        bookings = Booking.objects.all()
    elif user.role == 'recruiter':
        # Recruiters see only their own bookings
        bookings = Booking.objects.filter(organizer=user)
    else:
        q_filter = Q(attendee_user=user)
        if hasattr(user, 'candidate_profile') and user.candidate_profile:
            q_filter |= Q(candidate_profile=user.candidate_profile)
        bookings = Booking.objects.filter(q_filter)

    # Apply filters to bookings
    if status_filter:
        bookings = bookings.filter(status=status_filter)
    if category:
        bookings = bookings.filter(meeting_type__category=category)
    if start_date:
        bookings = bookings.filter(scheduled_at__gte=start_date)
    if end_date:
        bookings = bookings.filter(scheduled_at__lte=end_date)
    if upcoming == 'true':
        bookings = bookings.filter(
            scheduled_at__gte=timezone.now(),
            status=BookingStatus.CONFIRMED
        )

    # Add bookings to results
    booking_data = BookingSerializer(bookings, many=True).data
    for item in booking_data:
        item['booking_type'] = 'booking'
    results.extend(booking_data)

    # =========================================================================
    # 2. Get ApplicationStageInstance objects (interviews/meetings)
    # =========================================================================
    # Only include scheduled stages (those with scheduled_at set)
    if user.role == 'admin':
        # Admins see ALL scheduled stages
        stages = ApplicationStageInstance.objects.filter(
            scheduled_at__isnull=False
        ).select_related(
            'application__candidate__user',
            'application__job',
            'application__job__company',
            'stage_template',
            'interviewer'
        ).prefetch_related('participants').distinct()
    elif user.role == 'recruiter':
        # Recruiters see stages where they are directly involved:
        # - The interviewer, OR
        # - A participant in the interview
        stage_q = (
            Q(interviewer=user) |
            Q(participants=user)
        )
        stages = ApplicationStageInstance.objects.filter(stage_q).filter(
            scheduled_at__isnull=False
        ).select_related(
            'application__candidate__user',
            'application__job',
            'application__job__company',
            'stage_template',
            'interviewer'
        ).prefetch_related('participants').distinct()
    elif user.role == 'client':
        # Clients see stages for applications to their company's jobs
        if hasattr(user, 'company_memberships'):
            company_ids = user.company_memberships.values_list('company_id', flat=True)
            stages = ApplicationStageInstance.objects.filter(
                application__job__company_id__in=company_ids,
                scheduled_at__isnull=False
            ).select_related(
                'application__candidate__user',
                'application__job',
                'application__job__company',
                'stage_template',
                'interviewer'
            ).prefetch_related('participants')
        else:
            stages = ApplicationStageInstance.objects.none()
    else:
        # Candidates see stages from their own applications
        if hasattr(user, 'candidate_profile') and user.candidate_profile:
            stages = ApplicationStageInstance.objects.filter(
                application__candidate=user.candidate_profile,
                scheduled_at__isnull=False
            ).select_related(
                'application__job',
                'application__job__company',
                'stage_template',
                'interviewer'
            ).prefetch_related('participants')
        else:
            stages = ApplicationStageInstance.objects.none()

    # Apply date filters to stages
    if start_date:
        stages = stages.filter(scheduled_at__gte=start_date)
    if end_date:
        stages = stages.filter(scheduled_at__lte=end_date)
    if upcoming == 'true':
        stages = stages.filter(
            scheduled_at__gte=timezone.now(),
            status__in=['scheduled', 'pending_booking', 'not_started']
        )

    # Map stage status to booking status
    def map_stage_status(stage_status):
        status_map = {
            'not_started': 'pending',
            'pending_booking': 'pending',
            'scheduled': 'confirmed',
            'in_progress': 'confirmed',
            'completed': 'completed',
            'cancelled': 'cancelled',
            'skipped': 'cancelled',
            'passed': 'completed',
            'failed': 'completed',
        }
        return status_map.get(stage_status, 'pending')

    # Convert stages to booking-like format
    for stage in stages:
        app = stage.application
        candidate = app.candidate
        job = app.job
        company = job.company if job else None
        template = stage.stage_template
        end_time = None
        if stage.scheduled_at and stage.duration_minutes:
            end_time = stage.scheduled_at + timezone.timedelta(minutes=stage.duration_minutes)

        # Build participants list (interviewer + additional participants)
        participants_list = []
        if stage.interviewer:
            participants_list.append({
                'id': str(stage.interviewer.id),
                'name': stage.interviewer.full_name,
                'email': stage.interviewer.email,
                'role': 'interviewer',
            })
        for participant in stage.participants.all():
            participants_list.append({
                'id': str(participant.id),
                'name': participant.full_name,
                'email': participant.email,
                'role': 'participant',
            })

        stage_data = {
            'id': str(stage.id),
            'booking_type': 'interview',
            'meeting_type': str(template.id) if template else None,
            'meeting_type_name': template.name if template else 'Interview',
            'meeting_type_category': 'recruitment',
            'organizer': str(stage.interviewer.id) if stage.interviewer else None,
            'organizer_name': stage.interviewer.full_name if stage.interviewer else 'TBD',
            'organizer_email': stage.interviewer.email if stage.interviewer else '',
            'attendee_user': str(candidate.user.id) if candidate and candidate.user else None,
            'attendee_name': candidate.user.full_name if candidate and candidate.user else candidate.full_name if candidate else '',
            'attendee_email': candidate.user.email if candidate and candidate.user else candidate.email if candidate else '',
            'attendee_phone': candidate.user.phone if candidate and candidate.user else '',
            'attendee_company': '',
            'candidate_profile': str(candidate.id) if candidate else None,
            'candidate_info': {
                'name': candidate.full_name if candidate else '',
                'slug': candidate.slug if candidate else '',
                'professional_title': candidate.professional_title if candidate else '',
            } if candidate else None,
            'title': f"{template.name if template else 'Interview'} - {job.title if job else 'Application'}",
            'description': f"Interview for {job.title}" if job else 'Application Interview',
            'scheduled_at': stage.scheduled_at.isoformat() if stage.scheduled_at else None,
            'end_time': end_time.isoformat() if end_time else None,
            'duration_minutes': stage.duration_minutes or (template.duration_minutes if template else 30),
            'timezone': 'Africa/Johannesburg',
            'location_type': 'video' if stage.meeting_link else 'in_person',
            'location_type_display': 'Video Call' if stage.meeting_link else 'In Person',
            'meeting_url': stage.meeting_link or '',
            'location': stage.location or '',
            'status': map_stage_status(stage.status),
            'status_display': stage.get_status_display(),
            'is_upcoming': stage.scheduled_at > timezone.now() if stage.scheduled_at else False,
            'is_past': stage.scheduled_at < timezone.now() if stage.scheduled_at else False,
            'notes': stage.meeting_notes or '',
            'source': 'application',
            'created_at': stage.created_at.isoformat() if hasattr(stage, 'created_at') and stage.created_at else None,
            'updated_at': stage.updated_at.isoformat() if hasattr(stage, 'updated_at') and stage.updated_at else None,
            # Extra fields for application context
            'job_title': job.title if job else '',
            'job_id': str(job.id) if job else None,
            'application_id': str(app.id) if app else None,
            'stage_id': str(stage.id),
            # Company info
            'company_name': company.name if company else '',
            'company_id': str(company.id) if company else None,
            # Participants info
            'participants': participants_list,
        }
        results.append(stage_data)

    # Sort all results by scheduled_at
    results.sort(key=lambda x: x.get('scheduled_at') or '', reverse=False)

    return Response(results)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def booking_detail(request, booking_id):
    """
    GET: Retrieve booking details.
    PATCH: Update booking (reschedule, add notes, change status).
    """
    booking = get_object_or_404(Booking, id=booking_id, organizer=request.user)

    if request.method == 'GET':
        return Response(BookingSerializer(booking).data)

    # PATCH
    serializer = BookingUpdateSerializer(
        booking,
        data=request.data,
        partial=True
    )
    if serializer.is_valid():
        booking = serializer.save()
        return Response(BookingSerializer(booking).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def booking_cancel(request, booking_id):
    """
    Cancel a booking.
    """
    booking = get_object_or_404(Booking, id=booking_id, organizer=request.user)

    if booking.status == BookingStatus.CANCELLED:
        return Response(
            {'error': 'Booking is already cancelled'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = BookingCancelSerializer(data=request.data)
    if serializer.is_valid():
        reason = serializer.validated_data.get('reason', '')
        booking.cancel(cancelled_by=request.user, reason=reason)

        # TODO: Delete calendar event if exists
        # TODO: Send cancellation notification

        return Response(BookingSerializer(booking).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def booking_complete(request, booking_id):
    """
    Mark a booking as completed.
    """
    booking = get_object_or_404(Booking, id=booking_id, organizer=request.user)
    booking.mark_completed()
    return Response(BookingSerializer(booking).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def booking_no_show(request, booking_id):
    """
    Mark attendee as no-show.
    """
    booking = get_object_or_404(Booking, id=booking_id, organizer=request.user)
    booking.mark_no_show()
    return Response(BookingSerializer(booking).data)


# ============================================================================
# Interview Stage Status Updates (for interview bookings from applications)
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def interview_cancel(request, stage_id):
    """
    Cancel an interview stage.
    """
    from jobs.models import ApplicationStageInstance, StageInstanceStatus
    from django.db.models import Q

    user = request.user
    stage = get_object_or_404(ApplicationStageInstance, id=stage_id)

    # Permission check: user must be interviewer, job creator, or assigned recruiter
    if user.role in ['admin', 'recruiter']:
        has_access = (
            stage.interviewer == user or
            stage.application.job.created_by == user or
            stage.application.job.assigned_recruiters.filter(pk=user.pk).exists()
        )
    elif user.role == 'client':
        company_ids = list(user.company_memberships.values_list('company_id', flat=True))
        has_access = stage.application.job.company_id in company_ids
    else:
        has_access = False

    if not has_access:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    if stage.status == StageInstanceStatus.CANCELLED:
        return Response({'error': 'Stage is already cancelled'}, status=status.HTTP_400_BAD_REQUEST)

    stage.status = StageInstanceStatus.CANCELLED
    stage.save(update_fields=['status'])

    return Response({'status': 'cancelled', 'message': 'Interview cancelled'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def interview_complete(request, stage_id):
    """
    Mark an interview stage as completed.
    """
    from jobs.models import ApplicationStageInstance, StageInstanceStatus
    from django.utils import timezone

    user = request.user
    stage = get_object_or_404(ApplicationStageInstance, id=stage_id)

    # Permission check
    if user.role in ['admin', 'recruiter']:
        has_access = (
            stage.interviewer == user or
            stage.application.job.created_by == user or
            stage.application.job.assigned_recruiters.filter(pk=user.pk).exists()
        )
    elif user.role == 'client':
        company_ids = list(user.company_memberships.values_list('company_id', flat=True))
        has_access = stage.application.job.company_id in company_ids
    else:
        has_access = False

    if not has_access:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    if stage.status == StageInstanceStatus.COMPLETED:
        return Response({'error': 'Stage is already completed'}, status=status.HTTP_400_BAD_REQUEST)

    stage.status = StageInstanceStatus.COMPLETED
    stage.completed_at = timezone.now()
    stage.save(update_fields=['status', 'completed_at'])

    return Response({'status': 'completed', 'message': 'Interview marked as completed'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def interview_no_show(request, stage_id):
    """
    Mark candidate as no-show for an interview.
    """
    from jobs.models import ApplicationStageInstance, StageInstanceStatus
    from django.utils import timezone

    user = request.user
    stage = get_object_or_404(ApplicationStageInstance, id=stage_id)

    # Permission check
    if user.role in ['admin', 'recruiter']:
        has_access = (
            stage.interviewer == user or
            stage.application.job.created_by == user or
            stage.application.job.assigned_recruiters.filter(pk=user.pk).exists()
        )
    elif user.role == 'client':
        company_ids = list(user.company_memberships.values_list('company_id', flat=True))
        has_access = stage.application.job.company_id in company_ids
    else:
        has_access = False

    if not has_access:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    stage.status = StageInstanceStatus.CANCELLED
    stage.meeting_notes = (stage.meeting_notes or '') + '\n[No-show]'
    stage.save(update_fields=['status', 'meeting_notes'])

    return Response({'status': 'no_show', 'message': 'Candidate marked as no-show'})
