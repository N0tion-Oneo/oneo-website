"""
Gmail API Email Backend for Django

Uses a Google Cloud Service Account with Domain-Wide Delegation
to send emails via the Gmail API.
"""

import base64
import json
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

from google.oauth2 import service_account
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send']


class GmailAPIBackend(BaseEmailBackend):
    """
    Django email backend that sends emails via Gmail API using a service account.

    Required settings:
        GMAIL_SERVICE_ACCOUNT_FILE: Path to service account JSON key file
        GMAIL_DELEGATED_USER: Email address to send from (e.g., notifications@yourdomain.com)

    Optional settings:
        GMAIL_SERVICE_ACCOUNT_INFO: Dict of service account credentials (alternative to file)
    """

    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.service = None
        self._init_service()

    def _init_service(self):
        """Initialize the Gmail API service with service account credentials."""
        try:
            # Get delegated user (the email address to send from)
            delegated_user = getattr(settings, 'GMAIL_DELEGATED_USER', None)
            if not delegated_user:
                raise ValueError("GMAIL_DELEGATED_USER setting is required")

            # Try to get credentials from file or dict
            service_account_file = getattr(settings, 'GMAIL_SERVICE_ACCOUNT_FILE', None)
            service_account_info = getattr(settings, 'GMAIL_SERVICE_ACCOUNT_INFO', None)

            if service_account_file:
                credentials = service_account.Credentials.from_service_account_file(
                    service_account_file,
                    scopes=GMAIL_SCOPES,
                    subject=delegated_user
                )
            elif service_account_info:
                # Handle JSON string or dict
                if isinstance(service_account_info, str):
                    service_account_info = json.loads(service_account_info)
                credentials = service_account.Credentials.from_service_account_info(
                    service_account_info,
                    scopes=GMAIL_SCOPES,
                    subject=delegated_user
                )
            else:
                raise ValueError(
                    "Either GMAIL_SERVICE_ACCOUNT_FILE or GMAIL_SERVICE_ACCOUNT_INFO is required"
                )

            self.service = build('gmail', 'v1', credentials=credentials)
            logger.info(f"Gmail API service initialized for {delegated_user}")

        except Exception as e:
            logger.error(f"Failed to initialize Gmail API service: {e}")
            if not self.fail_silently:
                raise

    def send_messages(self, email_messages):
        """Send one or more EmailMessage objects and return the number sent."""
        if not self.service:
            if not self.fail_silently:
                raise RuntimeError("Gmail API service not initialized")
            return 0

        sent_count = 0
        for message in email_messages:
            try:
                self._send(message)
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send email to {message.to}: {e}")
                if not self.fail_silently:
                    raise

        return sent_count

    def _send(self, message):
        """Send a single EmailMessage via Gmail API."""
        # Build MIME message
        if message.content_subtype == 'html' or (hasattr(message, 'alternatives') and message.alternatives):
            # HTML email
            mime_message = MIMEMultipart('alternative')
            mime_message.attach(MIMEText(message.body, 'plain'))

            # Add HTML alternative if present
            if hasattr(message, 'alternatives'):
                for content, mimetype in message.alternatives:
                    if mimetype == 'text/html':
                        mime_message.attach(MIMEText(content, 'html'))
            elif message.content_subtype == 'html':
                mime_message = MIMEText(message.body, 'html')
        else:
            # Plain text email
            mime_message = MIMEText(message.body, 'plain')

        # Set headers
        mime_message['to'] = ', '.join(message.to)
        mime_message['from'] = message.from_email or settings.DEFAULT_FROM_EMAIL
        mime_message['subject'] = message.subject

        if message.cc:
            mime_message['cc'] = ', '.join(message.cc)
        if message.bcc:
            mime_message['bcc'] = ', '.join(message.bcc)
        if message.reply_to:
            mime_message['reply-to'] = ', '.join(message.reply_to)

        # Handle attachments
        if message.attachments:
            # Convert to multipart if not already
            if not isinstance(mime_message, MIMEMultipart):
                text_content = mime_message
                mime_message = MIMEMultipart()
                mime_message.attach(text_content)

            for attachment in message.attachments:
                if isinstance(attachment, tuple):
                    filename, content, mimetype = attachment
                    part = MIMEBase(*mimetype.split('/'))
                    part.set_payload(content if isinstance(content, bytes) else content.encode())
                    encoders.encode_base64(part)
                    part.add_header('Content-Disposition', f'attachment; filename="{filename}"')
                    mime_message.attach(part)

        # Encode and send
        raw_message = base64.urlsafe_b64encode(mime_message.as_bytes()).decode('utf-8')

        self.service.users().messages().send(
            userId='me',
            body={'raw': raw_message}
        ).execute()

        logger.info(f"Email sent to {message.to} via Gmail API")
