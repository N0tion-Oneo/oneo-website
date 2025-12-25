from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import UserCalendarConnection, MeetingType, Booking, BookingStatus, MeetingCategory, StageChangeBehavior
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
    GET: List meeting types accessible to the current user.
         - Admins see all meeting types
         - Recruiters see meeting types they have been granted access to
    POST: Create a new meeting type (admins only).
    """
    user = request.user

    if request.method == 'GET':
        if user.role == 'admin':
            # Admins see all meeting types
            meeting_types = MeetingType.objects.all()
        else:
            # Recruiters see only meeting types they have access to
            meeting_types = MeetingType.objects.filter(allowed_users=user)
        serializer = MeetingTypeSerializer(meeting_types, many=True)
        return Response(serializer.data)

    # POST - Create (admins only)
    if user.role != 'admin':
        return Response(
            {'error': 'Only admins can create meeting types'},
            status=status.HTTP_403_FORBIDDEN
        )

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
         - Admins can view any meeting type
         - Recruiters can view meeting types they have access to
    PATCH: Update a meeting type (admins only).
    DELETE: Delete a meeting type (admins only).
    """
    user = request.user
    meeting_type = get_object_or_404(MeetingType, id=meeting_type_id)

    # Check access
    if user.role == 'admin':
        has_access = True
    else:
        has_access = meeting_type.allowed_users.filter(pk=user.pk).exists()

    if not has_access:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = MeetingTypeSerializer(meeting_type)
        return Response(serializer.data)

    # PATCH and DELETE require admin role
    if user.role != 'admin':
        return Response(
            {'error': 'Only admins can modify meeting types'},
            status=status.HTTP_403_FORBIDDEN
        )

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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_meeting_type(request, category):
    """
    Get the meeting type that should be shown on dashboards for a given category.
    Returns the first active meeting type with show_on_dashboard=True for the category.

    Used by candidates (recruitment category) and clients (sales category) to get
    the meeting type they can use to book with their assigned contacts.
    """
    if category not in ['recruitment', 'sales']:
        return Response({'error': 'Invalid category'}, status=status.HTTP_400_BAD_REQUEST)

    meeting_type = MeetingType.objects.filter(
        category=category,
        is_active=True,
        show_on_dashboard=True
    ).first()

    if not meeting_type:
        return Response({'meeting_type': None})

    return Response({
        'meeting_type': MeetingTypePublicSerializer(meeting_type).data
    })


# ============================================================================
# Public Booking Page Views
# ============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def public_recruiter_booking_page(request, booking_slug):
    """
    Get recruiter's public booking page info and available meeting types.
    Meeting types shown are those the user has been granted access to (via allowed_users).
    Admins automatically have access to all meeting types.

    Query parameters:
    - onboarding: If provided ('client' or 'candidate'), filter to meeting types
      marked for onboarding with the appropriate category (sales/recruitment).
    """
    profile = get_object_or_404(
        RecruiterProfile.objects.select_related('user'),
        booking_slug=booking_slug,
        user__role__in=['admin', 'recruiter']
    )
    user = profile.user

    # Get meeting types this user has access to
    if user.role == 'admin':
        meeting_types = MeetingType.objects.filter(is_active=True)
    else:
        meeting_types = MeetingType.objects.filter(allowed_users=user, is_active=True)

    # Apply onboarding filter if requested
    onboarding_type = request.query_params.get('onboarding')
    if onboarding_type:
        meeting_types = meeting_types.filter(use_for_onboarding=True)
        if onboarding_type == 'client':
            # Accept both 'sales' and 'onboarding' categories for client onboarding
            meeting_types = meeting_types.filter(category__in=['sales', 'onboarding'])
        elif onboarding_type == 'candidate':
            meeting_types = meeting_types.filter(category='recruitment')

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

    # Get meeting type and verify user has access
    meeting_type = get_object_or_404(MeetingType, slug=meeting_type_slug, is_active=True)

    # Check user has access to this meeting type
    if user.role != 'admin' and not meeting_type.allowed_users.filter(pk=user.pk).exists():
        return Response({'error': 'Meeting type not available'}, status=status.HTTP_404_NOT_FOUND)

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


def _handle_booking_assignment_and_stage(booking, meeting_type, organizer, candidate_profile=None, company=None, lead=None, is_authenticated=False):
    """
    Handle auto-assignment of organizer and onboarding stage changes.
    Called after a booking is created.

    Args:
        candidate_profile: For RECRUITMENT meetings
        company: For ONBOARDING meetings
        lead: For LEADS meetings
        is_authenticated: Whether the booking was made by an authenticated user.
                         Used to determine which target stage to use.
    """
    from core.models import OnboardingHistory

    # Determine entity and entity type based on what's provided
    if lead:
        entity = lead
        expected_entity_type = 'lead'
    elif candidate_profile:
        entity = candidate_profile
        expected_entity_type = 'candidate'
    elif company:
        entity = company
        expected_entity_type = 'company'
    else:
        return

    # 1. Auto-assign the organizer to the entity
    if hasattr(entity, 'assigned_to') and organizer not in entity.assigned_to.all():
        entity.assigned_to.add(organizer)

    # 2. Handle onboarding stage change if configured
    # Use authenticated stage if user is authenticated, otherwise use default stage
    if is_authenticated:
        target_stage = meeting_type.target_onboarding_stage_authenticated or meeting_type.target_onboarding_stage
    else:
        target_stage = meeting_type.target_onboarding_stage

    if not target_stage:
        return

    # Validate stage entity type matches
    if target_stage.entity_type != expected_entity_type:
        return

    current_stage = entity.onboarding_stage
    should_change = False

    if meeting_type.stage_change_behavior == StageChangeBehavior.ALWAYS:
        should_change = True
    elif meeting_type.stage_change_behavior == StageChangeBehavior.ONLY_IF_NOT_SET:
        should_change = current_stage is None
    elif meeting_type.stage_change_behavior == StageChangeBehavior.ONLY_FORWARD:
        if current_stage is None:
            should_change = True
        else:
            # Only change if target stage is further in the pipeline
            should_change = target_stage.order > current_stage.order

    if should_change and entity.onboarding_stage != target_stage:
        old_stage = entity.onboarding_stage
        entity.onboarding_stage = target_stage
        entity.save(update_fields=['onboarding_stage'])

        # Record in OnboardingHistory
        OnboardingHistory.objects.create(
            entity_type=expected_entity_type,
            entity_id=str(entity.id),
            from_stage=old_stage,
            to_stage=target_stage,
            changed_by=None,  # System change
            notes=f'Automatically set when booking "{meeting_type.name}" was created',
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def public_create_booking(request, booking_slug, meeting_type_slug):
    """
    Create a booking for a public meeting type.
    No authentication required - anyone can book.

    For RECRUITMENT meetings:
    - Links to existing candidate profile if found
    - Creates CandidateInvitation if no user exists

    For ONBOARDING meetings:
    - Links to existing company user if found
    - Creates a pending CLIENT user if no user exists (for later invitation)

    For LEADS meetings:
    - Creates or finds a Lead record by email
    - Updates lead's onboarding stage if configured

    All types:
    - Auto-assigns the organizer to the entity (candidate/company/lead)
    - Changes onboarding stage based on meeting type configuration
    """
    from .services.calendar_service import CalendarService
    from authentication.models import CandidateInvitation
    from candidates.models import CandidateProfile
    from companies.models import Company
    from users.models import UserRole
    from datetime import timedelta
    from django.utils import timezone
    import uuid

    profile = get_object_or_404(
        RecruiterProfile.objects.select_related('user'),
        booking_slug=booking_slug,
        user__role__in=['admin', 'recruiter']
    )
    organizer = profile.user

    # Get meeting type and verify organizer has access
    meeting_type = get_object_or_404(MeetingType, slug=meeting_type_slug, is_active=True)

    # Check organizer has access to this meeting type
    if organizer.role != 'admin' and not meeting_type.allowed_users.filter(pk=organizer.pk).exists():
        return Response({'error': 'Meeting type not available'}, status=status.HTTP_404_NOT_FOUND)

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

    # Track state for response
    attendee_email = booking.attendee_email.lower()
    invitation_created = False
    invitation_token = None
    candidate_profile = None
    company = None
    lead = None

    is_recruitment = meeting_type.category == MeetingCategory.RECRUITMENT
    is_leads = meeting_type.category == MeetingCategory.LEADS
    is_onboarding = meeting_type.category == MeetingCategory.ONBOARDING

    # Check if user is already authenticated (serializer links them)
    # or if attendee email matches an existing user
    existing_user = booking.attendee_user

    if not existing_user:
        try:
            existing_user = User.objects.get(email__iexact=attendee_email)
            booking.attendee_user = existing_user
        except User.DoesNotExist:
            existing_user = None

    if existing_user:
        # User exists - link their profile
        if is_recruitment:
            candidate_profile = getattr(existing_user, 'candidate_profile', None)
            if candidate_profile:
                booking.candidate_profile = candidate_profile

        elif is_onboarding:
            if existing_user.role == UserRole.CLIENT:
                company_membership = existing_user.company_memberships.first()
                if company_membership:
                    company = company_membership.company

        elif is_leads:
            # For leads, try to find an existing lead by email
            from companies.models import Lead
            lead = Lead.objects.filter(email__iexact=attendee_email).first()
            if not lead:
                # Create a new lead
                lead = Lead.objects.create(
                    name=booking.attendee_name,
                    email=attendee_email,
                    phone=booking.attendee_phone or '',
                    company_name=booking.attendee_company or '',
                )

        booking.save(update_fields=['attendee_user', 'candidate_profile'])

    else:
        # No existing user - handle differently based on meeting type
        meeting_time = booking.scheduled_at
        days_until_meeting = (meeting_time - timezone.now()).days

        if days_until_meeting > 7:
            expires_at = timezone.now() + timedelta(days=7)
        else:
            expires_at = min(
                meeting_time - timedelta(hours=24),
                timezone.now() + timedelta(days=7)
            )
            if expires_at < timezone.now() + timedelta(hours=24):
                expires_at = timezone.now() + timedelta(hours=24)

        if is_recruitment:
            # Create a pending CANDIDATE user (similar to how sales creates pending CLIENT)
            from candidates.models import CandidateProfile

            name_parts = booking.attendee_name.split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ''

            pending_user = User.objects.create(
                email=attendee_email,
                username=f"pending_{uuid.uuid4().hex[:8]}",
                first_name=first_name,
                last_name=last_name,
                role=UserRole.CANDIDATE,
                is_active=False,  # Cannot login until completing signup
                is_pending_signup=True,
            )
            pending_user.set_unusable_password()
            pending_user.save()

            # Create candidate profile with info from booking form
            candidate_profile = CandidateProfile.objects.create(
                user=pending_user,
                phone=booking.attendee_phone or '',
            )

            # Link booking to pending user and candidate profile
            booking.attendee_user = pending_user
            booking.candidate_profile = candidate_profile
            booking.save(update_fields=['attendee_user', 'candidate_profile'])

            # Create CandidateInvitation linked to the pending user
            invitation = CandidateInvitation.objects.create(
                email=attendee_email,
                name=booking.attendee_name,
                created_by=organizer,
                booking=booking,
                pending_user=pending_user,
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
                print(f"Failed to send candidate invitation email: {e}")

        elif is_onboarding:
            # Create a pending CLIENT user for onboarding meetings
            # This user will be linked when a CompanyInvitation is sent later
            name_parts = booking.attendee_name.split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ''

            pending_user = User.objects.create(
                email=attendee_email,
                username=f"pending_{uuid.uuid4().hex[:8]}",
                first_name=first_name,
                last_name=last_name,
                role=UserRole.CLIENT,
                is_active=False,  # Cannot login until completing signup
                is_pending_signup=True,
            )
            # Set unusable password - they'll set it when accepting invitation
            pending_user.set_unusable_password()
            pending_user.save()

            booking.attendee_user = pending_user
            booking.save(update_fields=['attendee_user'])

        elif is_leads:
            # For leads meetings, create a Lead record
            from companies.models import Lead
            lead = Lead.objects.filter(email__iexact=attendee_email).first()
            if not lead:
                lead = Lead.objects.create(
                    name=booking.attendee_name,
                    email=attendee_email,
                    phone=booking.attendee_phone or '',
                    company_name=booking.attendee_company or '',
                )

    # Handle assignment and stage changes
    # Pass is_authenticated to determine which target stage to use
    is_authenticated = request.user.is_authenticated
    _handle_booking_assignment_and_stage(
        booking=booking,
        meeting_type=meeting_type,
        organizer=organizer,
        candidate_profile=candidate_profile,
        company=company,
        lead=lead,
        is_authenticated=is_authenticated,
    )

    # Try to create calendar event with auto-generated meeting link
    try:
        event_result = CalendarService.create_booking_event(
            booking=booking,
            attendee_email=booking.attendee_email,
            attendee_name=booking.attendee_name,
        )
    except Exception as e:
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
    attendee_email = request.query_params.get('attendee_email')

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
    if attendee_email:
        bookings = bookings.filter(attendee_email__iexact=attendee_email)

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
            'duration_minutes': stage.duration_minutes or (template.default_duration_minutes if template else 30),
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
