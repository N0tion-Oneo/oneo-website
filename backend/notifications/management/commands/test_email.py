"""
Management command to test email configuration.

Usage:
    python manage.py test_email recipient@example.com
"""

from django.core.management.base import BaseCommand
from django.core.mail import EmailMessage
from django.conf import settings


class Command(BaseCommand):
    help = 'Send a test email to verify email configuration'

    def add_arguments(self, parser):
        parser.add_argument(
            'recipient',
            type=str,
            help='Email address to send the test email to'
        )
        parser.add_argument(
            '--subject',
            type=str,
            default='Test Email from Django',
            help='Email subject (default: "Test Email from Django")'
        )

    def handle(self, *args, **options):
        recipient = options['recipient']
        subject = options['subject']

        self.stdout.write(f"\nEmail Configuration:")
        self.stdout.write(f"  Backend: {settings.EMAIL_BACKEND}")
        self.stdout.write(f"  From: {settings.DEFAULT_FROM_EMAIL}")

        if hasattr(settings, 'GMAIL_DELEGATED_USER') and settings.GMAIL_DELEGATED_USER:
            self.stdout.write(f"  Gmail Delegated User: {settings.GMAIL_DELEGATED_USER}")
        if hasattr(settings, 'GMAIL_SERVICE_ACCOUNT_FILE') and settings.GMAIL_SERVICE_ACCOUNT_FILE:
            self.stdout.write(f"  Service Account File: {settings.GMAIL_SERVICE_ACCOUNT_FILE}")

        # Build CC and Reply-To from settings
        cc = []
        reply_to = []
        if hasattr(settings, 'EMAIL_CC') and settings.EMAIL_CC:
            cc = [addr.strip() for addr in settings.EMAIL_CC.split(',') if addr.strip()]
            self.stdout.write(f"  CC: {', '.join(cc)}")
        if hasattr(settings, 'EMAIL_REPLY_TO') and settings.EMAIL_REPLY_TO:
            reply_to = [settings.EMAIL_REPLY_TO.strip()]
            self.stdout.write(f"  Reply-To: {settings.EMAIL_REPLY_TO}")

        self.stdout.write(f"\nSending test email to: {recipient}")
        self.stdout.write("-" * 50)

        try:
            html_content = (
                "<html><body>"
                "<h2>Test Email</h2>"
                "<p>This is a test email from your Django application.</p>"
                "<p>If you're reading this, your email configuration is working correctly!</p>"
                f"<p><strong>Sent from:</strong> {settings.DEFAULT_FROM_EMAIL}</p>"
                f"<p><strong>Backend:</strong> {settings.EMAIL_BACKEND}</p>"
                + (f"<p><strong>CC:</strong> {', '.join(cc)}</p>" if cc else "")
                + (f"<p><strong>Reply-To:</strong> {', '.join(reply_to)}</p>" if reply_to else "")
                + "</body></html>"
            )

            email = EmailMessage(
                subject=subject,
                body=html_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient],
                cc=cc,
                reply_to=reply_to,
            )
            email.content_subtype = 'html'
            email.send(fail_silently=False)

            self.stdout.write(
                self.style.SUCCESS(f"\nSuccess! Test email sent to {recipient}")
            )
            if cc:
                self.stdout.write(self.style.SUCCESS(f"  CC'd to: {', '.join(cc)}"))
            if reply_to:
                self.stdout.write(self.style.SUCCESS(f"  Reply-To set to: {', '.join(reply_to)}"))
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"\nFailed to send email: {e}")
            )
            raise
