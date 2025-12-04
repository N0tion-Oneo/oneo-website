from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings

from .models import UserCalendarConnection
from .serializers import (
    UserCalendarConnectionSerializer,
    CalendarConnectionUpdateSerializer,
)


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
