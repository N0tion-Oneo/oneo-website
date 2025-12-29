"""
Celery tasks for the jobs app.

These tasks handle:
- Sending interview reminders
- Sending assessment deadline reminders

Note: These tasks require Celery to be installed. If Celery is not available,
the functions can still be called directly (e.g., from a management command).

# TODO: Celery Setup for Production
# ==================================
# These background tasks send automated reminder notifications:
#
# 1. send_interview_reminders - Finds interviews scheduled for tomorrow and sends
#    reminder emails/notifications to both candidates and interviewers
#
# 2. send_assessment_deadline_reminders - Finds assessments due tomorrow and
#    reminds candidates to submit before the deadline
#
# To enable Celery:
#   1. Install: pip install celery redis
#   2. Start Redis: brew services start redis (macOS) or docker run -p 6379:6379 redis
#   3. Start worker: celery -A config worker -l info
#   4. Start beat scheduler: celery -A config beat -l info
#
# Alternative without Celery:
#   Create a management command and run via cron:
#   python manage.py send_reminders  (run daily at 9 AM)
#
# The tasks are configured in config/settings.py under CELERY_BEAT_SCHEDULE
"""

from jobs.services import NotificationService

# Try to import Celery, but make it optional
try:
    from celery import shared_task
    CELERY_AVAILABLE = True
except ImportError:
    CELERY_AVAILABLE = False
    # Create a no-op decorator if Celery isn't installed
    def shared_task(*args, **kwargs):
        def decorator(func):
            return func
        return decorator


@shared_task(name="jobs.send_interview_reminders")
def send_interview_reminders():
    """
    DEPRECATED: Now handled by automation rules:
    - [Auto] Interview Reminder - 24h Before (Candidate)
    - [Auto] Interview Reminder - 24h Before (Interviewer)
    """
    return "Skipped - handled by automation rules"


@shared_task(name="jobs.send_assessment_deadline_reminders")
def send_assessment_deadline_reminders():
    """
    DEPRECATED: Now handled by automation rule:
    - [Auto] Assessment Deadline Reminder - 24h Before
    """
    return "Skipped - handled by automation rules"


@shared_task(name="jobs.send_booking_reminders")
def send_booking_reminders():
    """
    DEPRECATED: Now handled by automation rule:
    - [Auto] Booking Reminder - 24h Before (Attendee)
    """
    return "Skipped - handled by automation rules"
