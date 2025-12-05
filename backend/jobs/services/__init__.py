# NotificationService moved to notifications app
from notifications.services.notification_service import NotificationService
# CalendarService moved to scheduling app
from scheduling.services.calendar_service import CalendarService, CalendarServiceError

__all__ = [
    'NotificationService',
    'CalendarService',
    'CalendarServiceError',
]
