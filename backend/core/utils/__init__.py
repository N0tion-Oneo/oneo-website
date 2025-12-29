"""
Core utilities for the application.

Provides shared functionality used across multiple apps:
- Template rendering with {variable} syntax
- Recipient resolution for notifications/automations
"""
from .templating import TemplateRenderer, ContextBuilder
from .recipients import RecipientResolver, ExternalRecipient, resolve_recipients

__all__ = [
    'TemplateRenderer',
    'ContextBuilder',
    'RecipientResolver',
    'ExternalRecipient',
    'resolve_recipients',
]
