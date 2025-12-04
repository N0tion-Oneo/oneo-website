"""
Calendar service for Google and Microsoft 365 integration.

This service handles:
- OAuth flows for calendar providers
- Creating/updating/deleting calendar events
- Token refresh management
"""

from django.conf import settings
from django.utils import timezone
from datetime import datetime, timedelta, time
from typing import Optional, Dict, Any, Tuple, List
from urllib.parse import urlencode
import requests
import json
import uuid

# Import models from scheduling app
from scheduling.models import (
    UserCalendarConnection,
    CalendarProvider,
)
# ApplicationStageInstance stays in jobs app
from jobs.models import ApplicationStageInstance


class CalendarServiceError(Exception):
    """Custom exception for calendar service errors."""
    pass


class CalendarService:
    """Service for calendar integration with Google and Microsoft."""

    # OAuth configuration
    GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"
    GOOGLE_SCOPES = [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.freebusy",
        "https://www.googleapis.com/auth/userinfo.email",
    ]

    MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
    MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    MICROSOFT_GRAPH_API = "https://graph.microsoft.com/v1.0"
    MICROSOFT_SCOPES = [
        "https://graph.microsoft.com/Calendars.ReadWrite",
        "https://graph.microsoft.com/User.Read",
        "offline_access",
    ]

    # =========================================================================
    # OAuth Flow Methods
    # =========================================================================

    @classmethod
    def get_google_auth_url(cls, user_id: str, redirect_uri: str) -> str:
        """Generate Google OAuth authorization URL."""
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(cls.GOOGLE_SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": user_id,
        }
        return f"{cls.GOOGLE_AUTH_URL}?{urlencode(params)}"

    @classmethod
    def get_microsoft_auth_url(cls, user_id: str, redirect_uri: str) -> str:
        """Generate Microsoft OAuth authorization URL."""
        params = {
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(cls.MICROSOFT_SCOPES),
            "state": user_id,
        }
        return f"{cls.MICROSOFT_AUTH_URL}?{urlencode(params)}"

    @classmethod
    def exchange_google_code(
        cls,
        code: str,
        redirect_uri: str,
        user,
    ) -> UserCalendarConnection:
        """
        Exchange Google authorization code for tokens and create connection.

        Args:
            code: Authorization code from OAuth callback
            redirect_uri: The redirect URI used in the initial auth request
            user: User object to associate the connection with

        Returns:
            UserCalendarConnection object
        """
        # Exchange code for tokens
        response = requests.post(
            cls.GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
        )

        if response.status_code != 200:
            raise CalendarServiceError(f"Failed to exchange code: {response.text}")

        token_data = response.json()

        # Get user email
        user_info_response = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )

        if user_info_response.status_code != 200:
            raise CalendarServiceError("Failed to get user info")

        user_info = user_info_response.json()

        # Calculate token expiry
        expires_at = timezone.now() + timedelta(seconds=token_data.get("expires_in", 3600))

        # Create or update connection
        connection, _ = UserCalendarConnection.objects.update_or_create(
            user=user,
            provider=CalendarProvider.GOOGLE,
            defaults={
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token", ""),
                "token_expires_at": expires_at,
                "provider_email": user_info.get("email", ""),
                "calendar_id": "primary",
                "is_active": True,
            },
        )

        return connection

    @classmethod
    def exchange_microsoft_code(
        cls,
        code: str,
        redirect_uri: str,
        user,
    ) -> UserCalendarConnection:
        """
        Exchange Microsoft authorization code for tokens and create connection.

        Args:
            code: Authorization code from OAuth callback
            redirect_uri: The redirect URI used in the initial auth request
            user: User object to associate the connection with

        Returns:
            UserCalendarConnection object
        """
        # Exchange code for tokens
        response = requests.post(
            cls.MICROSOFT_TOKEN_URL,
            data={
                "client_id": settings.MICROSOFT_CLIENT_ID,
                "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
                "scope": " ".join(cls.MICROSOFT_SCOPES),
            },
        )

        if response.status_code != 200:
            raise CalendarServiceError(f"Failed to exchange code: {response.text}")

        token_data = response.json()

        # Get user email from Microsoft Graph
        user_info_response = requests.get(
            f"{cls.MICROSOFT_GRAPH_API}/me",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )

        if user_info_response.status_code != 200:
            raise CalendarServiceError("Failed to get user info")

        user_info = user_info_response.json()

        # Calculate token expiry
        expires_at = timezone.now() + timedelta(seconds=token_data.get("expires_in", 3600))

        # Create or update connection
        connection, _ = UserCalendarConnection.objects.update_or_create(
            user=user,
            provider=CalendarProvider.MICROSOFT,
            defaults={
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token", ""),
                "token_expires_at": expires_at,
                "provider_email": user_info.get("mail") or user_info.get("userPrincipalName", ""),
                "calendar_id": "primary",
                "is_active": True,
            },
        )

        return connection

    @classmethod
    def refresh_token(cls, connection: UserCalendarConnection) -> bool:
        """
        Refresh an expired access token.

        Args:
            connection: The calendar connection to refresh

        Returns:
            True if refresh was successful
        """
        if not connection.refresh_token:
            return False

        if connection.provider == CalendarProvider.GOOGLE:
            response = requests.post(
                cls.GOOGLE_TOKEN_URL,
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "refresh_token": connection.refresh_token,
                    "grant_type": "refresh_token",
                },
            )
        else:
            response = requests.post(
                cls.MICROSOFT_TOKEN_URL,
                data={
                    "client_id": settings.MICROSOFT_CLIENT_ID,
                    "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                    "refresh_token": connection.refresh_token,
                    "grant_type": "refresh_token",
                    "scope": " ".join(cls.MICROSOFT_SCOPES),
                },
            )

        if response.status_code != 200:
            connection.is_active = False
            connection.save(update_fields=["is_active"])
            return False

        token_data = response.json()
        connection.access_token = token_data["access_token"]
        connection.token_expires_at = timezone.now() + timedelta(
            seconds=token_data.get("expires_in", 3600)
        )

        # Microsoft may return a new refresh token
        if "refresh_token" in token_data:
            connection.refresh_token = token_data["refresh_token"]

        connection.save(update_fields=["access_token", "refresh_token", "token_expires_at"])
        return True

    @classmethod
    def _get_valid_token(cls, connection: UserCalendarConnection) -> str:
        """
        Get a valid access token, refreshing if necessary.

        Args:
            connection: The calendar connection

        Returns:
            Valid access token

        Raises:
            CalendarServiceError: If unable to get a valid token
        """
        # Check if token is expired (with 5 minute buffer)
        if connection.token_expires_at and connection.token_expires_at <= timezone.now() + timedelta(minutes=5):
            if not cls.refresh_token(connection):
                raise CalendarServiceError("Unable to refresh expired token")
            connection.refresh_from_db()

        return connection.access_token

    # =========================================================================
    # Calendar List Methods
    # =========================================================================

    @classmethod
    def list_calendars(cls, connection: UserCalendarConnection) -> List[Dict[str, str]]:
        """
        List available calendars for a connection.

        Returns:
            List of calendars: [{"id": "...", "name": "...", "primary": bool}, ...]
        """
        if connection.provider == CalendarProvider.GOOGLE:
            return cls._list_google_calendars(connection)
        else:
            return cls._list_microsoft_calendars(connection)

    @classmethod
    def _list_google_calendars(cls, connection: UserCalendarConnection) -> List[Dict[str, str]]:
        """List calendars from Google Calendar."""
        access_token = cls._get_valid_token(connection)

        response = requests.get(
            f"{cls.GOOGLE_CALENDAR_API}/users/me/calendarList",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"minAccessRole": "owner"},  # Only calendars user owns
        )

        if response.status_code != 200:
            raise CalendarServiceError(f"Failed to list calendars: {response.text}")

        calendars = response.json().get("items", [])
        return [
            {
                "id": cal["id"],
                "name": cal.get("summary", cal["id"]),
                "primary": cal.get("primary", False),
            }
            for cal in calendars
            if cal.get("accessRole") in ["owner", "writer"]
        ]

    @classmethod
    def _list_microsoft_calendars(cls, connection: UserCalendarConnection) -> List[Dict[str, str]]:
        """List calendars from Microsoft 365."""
        access_token = cls._get_valid_token(connection)

        response = requests.get(
            f"{cls.MICROSOFT_GRAPH_API}/me/calendars",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if response.status_code != 200:
            raise CalendarServiceError(f"Failed to list calendars: {response.text}")

        calendars = response.json().get("value", [])
        return [
            {
                "id": cal["id"],
                "name": cal.get("name", cal["id"]),
                "primary": cal.get("isDefaultCalendar", False),
            }
            for cal in calendars
            if cal.get("canEdit", True)
        ]

    # =========================================================================
    # Calendar Event Methods
    # =========================================================================

    @classmethod
    def create_calendar_event(
        cls,
        connection: UserCalendarConnection,
        stage_instance: ApplicationStageInstance,
        attendees: list = None,
    ) -> str:
        """
        Create a calendar event for an interview.

        Args:
            connection: The calendar connection to use
            stage_instance: The stage instance to create an event for
            attendees: List of email addresses to invite

        Returns:
            The created event ID
        """
        access_token = cls._get_valid_token(connection)

        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job

        # Build event data
        start_time = stage_instance.scheduled_at
        end_time = start_time + timedelta(minutes=stage_instance.duration_minutes or 60)

        title = f"Interview: {application.candidate.full_name} - {template.name} ({job.title})"
        description = f"""
Interview Details:
- Position: {job.title}
- Company: {job.company.name}
- Stage: {template.name}
- Candidate: {application.candidate.full_name}

{f"Meeting Link: {stage_instance.meeting_link}" if stage_instance.meeting_link else ""}
{f"Location: {stage_instance.location}" if stage_instance.location else ""}
""".strip()

        if connection.provider == CalendarProvider.GOOGLE:
            event_id = cls._create_google_event(
                access_token=access_token,
                calendar_id=connection.calendar_id or "primary",
                title=title,
                description=description,
                start_time=start_time,
                end_time=end_time,
                location=stage_instance.location,
                meeting_link=stage_instance.meeting_link,
                attendees=attendees or [],
            )
            stage_instance.google_calendar_event_id = event_id
        else:
            event_id = cls._create_microsoft_event(
                access_token=access_token,
                title=title,
                description=description,
                start_time=start_time,
                end_time=end_time,
                location=stage_instance.location,
                meeting_link=stage_instance.meeting_link,
                attendees=attendees or [],
            )
            stage_instance.microsoft_calendar_event_id = event_id

        stage_instance.calendar_invite_sent = True
        stage_instance.save(update_fields=[
            "google_calendar_event_id",
            "microsoft_calendar_event_id",
            "calendar_invite_sent",
        ])

        return event_id

    @classmethod
    def _create_google_event(
        cls,
        access_token: str,
        calendar_id: str,
        title: str,
        description: str,
        start_time: datetime,
        end_time: datetime,
        location: str = "",
        meeting_link: str = "",
        attendees: list = None,
    ) -> str:
        """Create a Google Calendar event."""
        event_data = {
            "summary": title,
            "description": description,
            "start": {
                "dateTime": start_time.isoformat(),
                "timeZone": str(timezone.get_current_timezone()),
            },
            "end": {
                "dateTime": end_time.isoformat(),
                "timeZone": str(timezone.get_current_timezone()),
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "email", "minutes": 24 * 60},
                    {"method": "popup", "minutes": 30},
                ],
            },
        }

        if location:
            event_data["location"] = location

        if meeting_link:
            event_data["description"] += f"\n\nJoin: {meeting_link}"

        if attendees:
            event_data["attendees"] = [{"email": email} for email in attendees]
            event_data["guestsCanSeeOtherGuests"] = True

        response = requests.post(
            f"{cls.GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=event_data,
            params={"sendUpdates": "all"} if attendees else {},
        )

        if response.status_code not in (200, 201):
            raise CalendarServiceError(f"Failed to create Google event: {response.text}")

        return response.json()["id"]

    @classmethod
    def _create_microsoft_event(
        cls,
        access_token: str,
        title: str,
        description: str,
        start_time: datetime,
        end_time: datetime,
        location: str = "",
        meeting_link: str = "",
        attendees: list = None,
    ) -> str:
        """Create a Microsoft 365 calendar event."""
        event_data = {
            "subject": title,
            "body": {
                "contentType": "text",
                "content": description + (f"\n\nJoin: {meeting_link}" if meeting_link else ""),
            },
            "start": {
                "dateTime": start_time.strftime("%Y-%m-%dT%H:%M:%S"),
                "timeZone": str(timezone.get_current_timezone()),
            },
            "end": {
                "dateTime": end_time.strftime("%Y-%m-%dT%H:%M:%S"),
                "timeZone": str(timezone.get_current_timezone()),
            },
            "reminderMinutesBeforeStart": 30,
        }

        if location:
            event_data["location"] = {"displayName": location}

        if attendees:
            event_data["attendees"] = [
                {"emailAddress": {"address": email}, "type": "required"}
                for email in attendees
            ]

        response = requests.post(
            f"{cls.MICROSOFT_GRAPH_API}/me/events",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=event_data,
        )

        if response.status_code not in (200, 201):
            raise CalendarServiceError(f"Failed to create Microsoft event: {response.text}")

        return response.json()["id"]

    @classmethod
    def update_calendar_event(
        cls,
        connection: UserCalendarConnection,
        stage_instance: ApplicationStageInstance,
        attendees: list = None,
    ) -> bool:
        """
        Update an existing calendar event.

        Args:
            connection: The calendar connection to use
            stage_instance: The stage instance with updated details
            attendees: List of email addresses to invite

        Returns:
            True if update was successful
        """
        access_token = cls._get_valid_token(connection)

        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job

        start_time = stage_instance.scheduled_at
        end_time = start_time + timedelta(minutes=stage_instance.duration_minutes or 60)

        title = f"Interview: {application.candidate.full_name} - {template.name} ({job.title})"
        description = f"""
Interview Details:
- Position: {job.title}
- Company: {job.company.name}
- Stage: {template.name}
- Candidate: {application.candidate.full_name}

{f"Meeting Link: {stage_instance.meeting_link}" if stage_instance.meeting_link else ""}
{f"Location: {stage_instance.location}" if stage_instance.location else ""}
""".strip()

        if connection.provider == CalendarProvider.GOOGLE:
            event_id = stage_instance.google_calendar_event_id
            if not event_id:
                return False
            return cls._update_google_event(
                access_token=access_token,
                calendar_id=connection.calendar_id or "primary",
                event_id=event_id,
                title=title,
                description=description,
                start_time=start_time,
                end_time=end_time,
                location=stage_instance.location,
                meeting_link=stage_instance.meeting_link,
                attendees=attendees or [],
            )
        else:
            event_id = stage_instance.microsoft_calendar_event_id
            if not event_id:
                return False
            return cls._update_microsoft_event(
                access_token=access_token,
                event_id=event_id,
                title=title,
                description=description,
                start_time=start_time,
                end_time=end_time,
                location=stage_instance.location,
                meeting_link=stage_instance.meeting_link,
                attendees=attendees or [],
            )

    @classmethod
    def _update_google_event(
        cls,
        access_token: str,
        calendar_id: str,
        event_id: str,
        title: str,
        description: str,
        start_time: datetime,
        end_time: datetime,
        location: str = "",
        meeting_link: str = "",
        attendees: list = None,
    ) -> bool:
        """Update a Google Calendar event."""
        event_data = {
            "summary": title,
            "description": description + (f"\n\nJoin: {meeting_link}" if meeting_link else ""),
            "start": {
                "dateTime": start_time.isoformat(),
                "timeZone": str(timezone.get_current_timezone()),
            },
            "end": {
                "dateTime": end_time.isoformat(),
                "timeZone": str(timezone.get_current_timezone()),
            },
        }

        if location:
            event_data["location"] = location

        if attendees:
            event_data["attendees"] = [{"email": email} for email in attendees]

        response = requests.patch(
            f"{cls.GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events/{event_id}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=event_data,
            params={"sendUpdates": "all"} if attendees else {},
        )

        return response.status_code == 200

    @classmethod
    def _update_microsoft_event(
        cls,
        access_token: str,
        event_id: str,
        title: str,
        description: str,
        start_time: datetime,
        end_time: datetime,
        location: str = "",
        meeting_link: str = "",
        attendees: list = None,
    ) -> bool:
        """Update a Microsoft 365 calendar event."""
        event_data = {
            "subject": title,
            "body": {
                "contentType": "text",
                "content": description + (f"\n\nJoin: {meeting_link}" if meeting_link else ""),
            },
            "start": {
                "dateTime": start_time.strftime("%Y-%m-%dT%H:%M:%S"),
                "timeZone": str(timezone.get_current_timezone()),
            },
            "end": {
                "dateTime": end_time.strftime("%Y-%m-%dT%H:%M:%S"),
                "timeZone": str(timezone.get_current_timezone()),
            },
        }

        if location:
            event_data["location"] = {"displayName": location}

        if attendees:
            event_data["attendees"] = [
                {"emailAddress": {"address": email}, "type": "required"}
                for email in attendees
            ]

        response = requests.patch(
            f"{cls.MICROSOFT_GRAPH_API}/me/events/{event_id}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=event_data,
        )

        return response.status_code == 200

    @classmethod
    def delete_calendar_event(
        cls,
        connection: UserCalendarConnection,
        stage_instance: ApplicationStageInstance,
    ) -> bool:
        """
        Delete a calendar event.

        Args:
            connection: The calendar connection to use
            stage_instance: The stage instance with the event to delete

        Returns:
            True if deletion was successful
        """
        access_token = cls._get_valid_token(connection)

        if connection.provider == CalendarProvider.GOOGLE:
            event_id = stage_instance.google_calendar_event_id
            if not event_id:
                return True

            response = requests.delete(
                f"{cls.GOOGLE_CALENDAR_API}/calendars/{connection.calendar_id or 'primary'}/events/{event_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"sendUpdates": "all"},
            )

            if response.status_code in (200, 204, 404):
                stage_instance.google_calendar_event_id = ""
                stage_instance.save(update_fields=["google_calendar_event_id"])
                return True

        else:
            event_id = stage_instance.microsoft_calendar_event_id
            if not event_id:
                return True

            response = requests.delete(
                f"{cls.MICROSOFT_GRAPH_API}/me/events/{event_id}",
                headers={"Authorization": f"Bearer {access_token}"},
            )

            if response.status_code in (200, 204, 404):
                stage_instance.microsoft_calendar_event_id = ""
                stage_instance.save(update_fields=["microsoft_calendar_event_id"])
                return True

        return False

    @classmethod
    def disconnect(cls, user, provider: CalendarProvider) -> bool:
        """
        Disconnect a calendar provider for a user.

        Args:
            user: The user to disconnect
            provider: The calendar provider to disconnect

        Returns:
            True if disconnection was successful
        """
        try:
            connection = UserCalendarConnection.objects.get(
                user=user,
                provider=provider,
            )
            connection.delete()
            return True
        except UserCalendarConnection.DoesNotExist:
            return True

    # =========================================================================
    # Free/Busy Methods (for Calendly-like availability)
    # =========================================================================

    # Default business hours for availability
    BUSINESS_HOURS_START = 9  # 9 AM
    BUSINESS_HOURS_END = 18   # 6 PM

    @classmethod
    def get_free_busy(
        cls,
        user,
        start_date: datetime,
        end_date: datetime,
        duration_minutes: int,
        business_hours_start: int = None,
        business_hours_end: int = None,
    ) -> List[Dict[str, str]]:
        """
        Get available time slots for a user based on their calendar availability.
        Uses the interviewer's booking settings from their calendar connection.

        Args:
            user: The user whose calendar to check
            start_date: Start of the date range to check
            end_date: End of the date range to check
            duration_minutes: Length of the meeting slot needed
            business_hours_start: Override start hour (uses connection settings if None)
            business_hours_end: Override end hour (uses connection settings if None)

        Returns:
            List of available time slots: [{"start": "ISO datetime", "end": "ISO datetime"}, ...]
        """
        connection = UserCalendarConnection.objects.filter(
            user=user,
            is_active=True,
        ).first()

        if not connection:
            # No calendar connected, return empty (or could return all business hours)
            return []

        # Use connection settings, falling back to defaults
        business_start = business_hours_start or connection.business_hours_start or cls.BUSINESS_HOURS_START
        business_end = business_hours_end or connection.business_hours_end or cls.BUSINESS_HOURS_END
        buffer_minutes = connection.buffer_minutes or 0
        min_notice_hours = connection.min_notice_hours or 0

        # Parse available days from connection (comma-separated day numbers)
        available_days = None
        if connection.available_days:
            try:
                available_days = [int(d) for d in connection.available_days.split(',') if d.strip()]
            except ValueError:
                available_days = None

        if connection.provider == CalendarProvider.GOOGLE:
            busy_periods = cls._google_free_busy(connection, start_date, end_date)
        else:
            busy_periods = cls._microsoft_free_busy(connection, start_date, end_date)

        # Convert busy periods to available slots
        return cls._calculate_available_slots(
            busy_periods=busy_periods,
            start_date=start_date,
            end_date=end_date,
            duration_minutes=duration_minutes,
            business_hours_start=business_start,
            business_hours_end=business_end,
            buffer_minutes=buffer_minutes,
            min_notice_hours=min_notice_hours,
            available_days=available_days,
        )

    @classmethod
    def _google_free_busy(
        cls,
        connection: UserCalendarConnection,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Tuple[datetime, datetime]]:
        """
        Query Google Calendar for busy periods.

        Returns list of (start, end) tuples for busy times.
        """
        access_token = cls._get_valid_token(connection)

        request_body = {
            "timeMin": start_date.isoformat(),
            "timeMax": end_date.isoformat(),
            "items": [{"id": connection.calendar_id or "primary"}],
        }

        response = requests.post(
            f"{cls.GOOGLE_CALENDAR_API}/freeBusy",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=request_body,
        )

        if response.status_code != 200:
            raise CalendarServiceError(f"Failed to get free/busy: {response.text}")

        result = response.json()
        calendar_id = connection.calendar_id or "primary"
        busy_list = result.get("calendars", {}).get(calendar_id, {}).get("busy", [])

        return [
            (
                datetime.fromisoformat(period["start"].replace("Z", "+00:00")),
                datetime.fromisoformat(period["end"].replace("Z", "+00:00")),
            )
            for period in busy_list
        ]

    @classmethod
    def _microsoft_free_busy(
        cls,
        connection: UserCalendarConnection,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Tuple[datetime, datetime]]:
        """
        Query Microsoft Graph for busy periods.

        Returns list of (start, end) tuples for busy times.
        """
        access_token = cls._get_valid_token(connection)

        # Microsoft uses calendar view endpoint for free/busy
        response = requests.get(
            f"{cls.MICROSOFT_GRAPH_API}/me/calendar/calendarView",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Prefer": 'outlook.timezone="UTC"',
            },
            params={
                "startDateTime": start_date.isoformat(),
                "endDateTime": end_date.isoformat(),
                "$select": "start,end,showAs",
            },
        )

        if response.status_code != 200:
            raise CalendarServiceError(f"Failed to get calendar view: {response.text}")

        events = response.json().get("value", [])

        # Only include events that show as busy or tentative
        busy_periods = []
        for event in events:
            show_as = event.get("showAs", "busy")
            if show_as in ["busy", "tentative", "oof"]:
                start = datetime.fromisoformat(event["start"]["dateTime"].replace("Z", "+00:00"))
                end = datetime.fromisoformat(event["end"]["dateTime"].replace("Z", "+00:00"))
                busy_periods.append((start, end))

        return busy_periods

    @classmethod
    def _calculate_available_slots(
        cls,
        busy_periods: List[Tuple[datetime, datetime]],
        start_date: datetime,
        end_date: datetime,
        duration_minutes: int,
        business_hours_start: int,
        business_hours_end: int,
        buffer_minutes: int = 0,
        min_notice_hours: int = 0,
        available_days: List[int] = None,
    ) -> List[Dict[str, str]]:
        """
        Calculate available time slots given busy periods.

        Args:
            busy_periods: List of (start, end) datetime tuples for busy times
            start_date: Start of the range to check
            end_date: End of the range to check
            duration_minutes: Required meeting duration
            business_hours_start: Start hour of business hours
            business_hours_end: End hour of business hours
            buffer_minutes: Buffer time between meetings
            min_notice_hours: Minimum hours notice required
            available_days: List of available weekdays (0=Mon, 6=Sun). None means Mon-Fri.

        Returns:
            List of available slots as {"start": ISO, "end": ISO} dicts
        """
        available_slots = []
        slot_duration = timedelta(minutes=duration_minutes)
        buffer_duration = timedelta(minutes=buffer_minutes) if buffer_minutes > 0 else timedelta(0)

        # Default to Monday-Friday if no available_days specified
        if available_days is None:
            available_days = [0, 1, 2, 3, 4]

        # Sort busy periods by start time
        busy_periods = sorted(busy_periods, key=lambda x: x[0])

        # Calculate minimum booking time (now + min_notice_hours)
        now = timezone.now()
        min_booking_time = now + timedelta(hours=min_notice_hours)

        # Iterate through each day in the range
        current_date = start_date.date()
        end_date_only = end_date.date()

        while current_date <= end_date_only:
            # Skip days not in available_days
            if current_date.weekday() not in available_days:
                current_date += timedelta(days=1)
                continue

            # Business hours for this day
            day_start = datetime.combine(
                current_date,
                time(hour=business_hours_start),
                tzinfo=start_date.tzinfo or timezone.utc,
            )
            day_end = datetime.combine(
                current_date,
                time(hour=business_hours_end),
                tzinfo=start_date.tzinfo or timezone.utc,
            )

            # Apply minimum notice requirement
            if day_start < min_booking_time:
                # Round up to next 30min after min_booking_time
                day_start = min_booking_time + timedelta(minutes=30 - min_booking_time.minute % 30)
                if day_start.minute == 0 and min_booking_time.minute > 0:
                    pass  # Already on the hour
                elif day_start < min_booking_time:
                    day_start += timedelta(minutes=30)

            # Skip if day is entirely in the past or before min notice
            if day_end <= min_booking_time:
                current_date += timedelta(days=1)
                continue

            # Get busy periods for this day (with buffer added)
            day_busy = []
            for start, end in busy_periods:
                if start < day_end and end > day_start:
                    # Add buffer before and after busy periods
                    buffered_start = max(start - buffer_duration, day_start)
                    buffered_end = min(end + buffer_duration, day_end)
                    day_busy.append((buffered_start, buffered_end))

            # Find free slots
            current_time = day_start
            for busy_start, busy_end in sorted(day_busy):
                # Add slots before this busy period
                while current_time + slot_duration <= busy_start:
                    available_slots.append({
                        "start": current_time.isoformat(),
                        "end": (current_time + slot_duration).isoformat(),
                    })
                    current_time += timedelta(minutes=30)  # 30-minute increments

                # Move past the busy period
                if busy_end > current_time:
                    current_time = busy_end
                    # Round up to next 30-minute boundary
                    if current_time.minute % 30 != 0:
                        current_time = current_time.replace(
                            minute=(current_time.minute // 30 + 1) * 30 % 60,
                            second=0,
                            microsecond=0,
                        )
                        if current_time.minute == 0:
                            current_time += timedelta(hours=1)

            # Add remaining slots until end of business hours
            while current_time + slot_duration <= day_end:
                available_slots.append({
                    "start": current_time.isoformat(),
                    "end": (current_time + slot_duration).isoformat(),
                })
                current_time += timedelta(minutes=30)

            current_date += timedelta(days=1)

        return available_slots

    # =========================================================================
    # Auto-generated Meeting Links
    # =========================================================================

    # In-person stage types that should NOT have video meeting links
    IN_PERSON_STAGE_TYPES = ['in_person_interview', 'in_person_assessment']

    @classmethod
    def create_event_with_meeting_link(
        cls,
        connection: UserCalendarConnection,
        stage_instance: ApplicationStageInstance,
        attendees: list = None,
    ) -> Dict[str, Any]:
        """
        Create a calendar event, with an auto-generated meeting link for virtual interviews.

        For in-person interviews: Creates event with location only (no video link)
        For virtual interviews:
            - Google: Generates a Google Meet link
            - Microsoft: Generates a Teams meeting link

        Args:
            connection: The calendar connection to use
            stage_instance: The stage instance to create an event for
            attendees: List of email addresses to invite

        Returns:
            Dict with event details including:
            - event_id: The calendar event ID
            - meeting_link: Auto-generated meeting link (empty for in-person)
            - provider: The calendar provider used
        """
        access_token = cls._get_valid_token(connection)

        application = stage_instance.application
        template = stage_instance.stage_template
        job = application.job

        # Check if this is an in-person interview (no video link needed)
        is_in_person = template.stage_type in cls.IN_PERSON_STAGE_TYPES

        start_time = stage_instance.scheduled_at
        end_time = start_time + timedelta(minutes=stage_instance.duration_minutes or 60)

        title = f"Interview: {application.candidate.full_name} - {template.name} ({job.title})"
        description = f"""
Interview Details:
- Position: {job.title}
- Company: {job.company.name}
- Stage: {template.name}
- Candidate: {application.candidate.full_name}
{f"- Location: {stage_instance.location}" if stage_instance.location else ""}
""".strip()

        if is_in_person:
            # For in-person interviews, create event WITHOUT video meeting link
            if connection.provider == CalendarProvider.GOOGLE:
                event_id = cls._create_google_event(
                    access_token=access_token,
                    calendar_id=connection.calendar_id or "primary",
                    title=title,
                    description=description,
                    start_time=start_time,
                    end_time=end_time,
                    location=stage_instance.location,
                    meeting_link="",  # No meeting link for in-person
                    attendees=attendees or [],
                )
                stage_instance.google_calendar_event_id = event_id
                result = {"event_id": event_id, "meeting_link": ""}
            else:
                event_id = cls._create_microsoft_event(
                    access_token=access_token,
                    title=title,
                    description=description,
                    start_time=start_time,
                    end_time=end_time,
                    location=stage_instance.location,
                    meeting_link="",  # No meeting link for in-person
                    attendees=attendees or [],
                )
                stage_instance.microsoft_calendar_event_id = event_id
                result = {"event_id": event_id, "meeting_link": ""}

            # Clear any existing meeting link for in-person interviews
            stage_instance.meeting_link = ""
        else:
            # For virtual interviews, create event WITH auto-generated video link
            if connection.provider == CalendarProvider.GOOGLE:
                result = cls._create_google_event_with_meet(
                    access_token=access_token,
                    calendar_id=connection.calendar_id or "primary",
                    title=title,
                    description=description,
                    start_time=start_time,
                    end_time=end_time,
                    location=stage_instance.location,
                    attendees=attendees or [],
                )
                stage_instance.google_calendar_event_id = result["event_id"]
                stage_instance.meeting_link = result["meeting_link"]
            else:
                result = cls._create_microsoft_event_with_teams(
                    access_token=access_token,
                    title=title,
                    description=description,
                    start_time=start_time,
                    end_time=end_time,
                    location=stage_instance.location,
                    attendees=attendees or [],
                )
                stage_instance.microsoft_calendar_event_id = result["event_id"]
                stage_instance.meeting_link = result["meeting_link"]

        stage_instance.calendar_invite_sent = True
        stage_instance.save(update_fields=[
            "google_calendar_event_id",
            "microsoft_calendar_event_id",
            "meeting_link",
            "calendar_invite_sent",
        ])

        return {
            "event_id": result["event_id"],
            "meeting_link": result["meeting_link"],
            "provider": connection.provider,
        }

    @classmethod
    def _create_google_event_with_meet(
        cls,
        access_token: str,
        calendar_id: str,
        title: str,
        description: str,
        start_time: datetime,
        end_time: datetime,
        location: str = "",
        attendees: list = None,
    ) -> Dict[str, str]:
        """
        Create a Google Calendar event with auto-generated Google Meet link.
        """
        event_data = {
            "summary": title,
            "description": description,
            "start": {
                "dateTime": start_time.isoformat(),
                "timeZone": str(timezone.get_current_timezone()),
            },
            "end": {
                "dateTime": end_time.isoformat(),
                "timeZone": str(timezone.get_current_timezone()),
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "email", "minutes": 24 * 60},
                    {"method": "popup", "minutes": 30},
                ],
            },
            # Auto-generate Google Meet link
            "conferenceData": {
                "createRequest": {
                    "requestId": str(uuid.uuid4()),
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                }
            },
        }

        if location:
            event_data["location"] = location

        if attendees:
            event_data["attendees"] = [{"email": email} for email in attendees]
            event_data["guestsCanSeeOtherGuests"] = True

        response = requests.post(
            f"{cls.GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=event_data,
            params={
                "conferenceDataVersion": 1,  # Required for Meet link generation
                "sendUpdates": "all" if attendees else "none",
            },
        )

        if response.status_code not in (200, 201):
            raise CalendarServiceError(f"Failed to create Google event: {response.text}")

        result = response.json()
        meeting_link = result.get("conferenceData", {}).get("entryPoints", [{}])[0].get("uri", "")

        return {
            "event_id": result["id"],
            "meeting_link": meeting_link,
        }

    @classmethod
    def _create_microsoft_event_with_teams(
        cls,
        access_token: str,
        title: str,
        description: str,
        start_time: datetime,
        end_time: datetime,
        location: str = "",
        attendees: list = None,
    ) -> Dict[str, str]:
        """
        Create a Microsoft 365 calendar event with auto-generated Teams meeting link.
        """
        event_data = {
            "subject": title,
            "body": {
                "contentType": "text",
                "content": description,
            },
            "start": {
                "dateTime": start_time.strftime("%Y-%m-%dT%H:%M:%S"),
                "timeZone": str(timezone.get_current_timezone()),
            },
            "end": {
                "dateTime": end_time.strftime("%Y-%m-%dT%H:%M:%S"),
                "timeZone": str(timezone.get_current_timezone()),
            },
            "reminderMinutesBeforeStart": 30,
            # Auto-generate Teams meeting link
            "isOnlineMeeting": True,
            "onlineMeetingProvider": "teamsForBusiness",
        }

        if location:
            event_data["location"] = {"displayName": location}

        if attendees:
            event_data["attendees"] = [
                {"emailAddress": {"address": email}, "type": "required"}
                for email in attendees
            ]

        response = requests.post(
            f"{cls.MICROSOFT_GRAPH_API}/me/events",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=event_data,
        )

        if response.status_code not in (200, 201):
            raise CalendarServiceError(f"Failed to create Microsoft event: {response.text}")

        result = response.json()
        meeting_link = result.get("onlineMeeting", {}).get("joinUrl", "")

        return {
            "event_id": result["id"],
            "meeting_link": meeting_link,
        }
