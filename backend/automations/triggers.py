"""
Helper functions for triggering non-model-based automations.

This module provides utilities for:
- Signal-based triggers (Django signals like password_reset, etc.)
- View action triggers (explicit calls from views)
- Manual triggers (admin-initiated)
"""

import logging
from typing import Any, Dict, Optional, List
from django.contrib.contenttypes.models import ContentType

from .models import AutomationRule

logger = logging.getLogger(__name__)


def trigger_signal_automations(
    signal_name: str,
    instance: Any = None,
    context: Optional[Dict[str, Any]] = None,
) -> List[str]:
    """
    Trigger all automations registered for a specific signal.

    Args:
        signal_name: The signal name (e.g., 'password_reset', 'email_verification')
        instance: Optional model instance related to the signal (e.g., User)
        context: Optional additional context for template rendering

    Returns:
        List of rule IDs that were triggered
    """
    from .tasks import execute_automation_rule

    rules = AutomationRule.objects.filter(
        trigger_type='signal',
        signal_name=signal_name,
        is_active=True,
    )

    triggered = []
    for rule in rules:
        try:
            logger.info(f"Triggering signal automation: {rule.name} (signal={signal_name})")
            execute_automation_rule.delay(
                rule_id=str(rule.id),
                instance_id=str(instance.pk) if instance and hasattr(instance, 'pk') else None,
                instance_model=f"{instance._meta.app_label}.{instance._meta.model_name}" if instance else None,
                old_values={},
                new_values=context or {},
            )
            triggered.append(str(rule.id))
        except Exception as e:
            logger.error(f"Error triggering signal automation {rule.name}: {e}")

    return triggered


def trigger_view_action(
    action_name: str,
    instance: Any = None,
    context: Optional[Dict[str, Any]] = None,
) -> List[str]:
    """
    Trigger automations for a specific view action.

    Use this in views when a specific action occurs that should trigger automations.

    Args:
        action_name: The action name (e.g., 'booking_link_sent', 'admin_broadcast')
        instance: Optional model instance related to the action
        context: Optional additional context for template rendering

    Returns:
        List of rule IDs that were triggered

    Example:
        from automations.triggers import trigger_view_action

        # In a view after sending a booking link:
        trigger_view_action('booking_link_sent', booking, {'recipient_email': email})
    """
    from .tasks import execute_automation_rule

    rules = AutomationRule.objects.filter(
        trigger_type='view_action',
        signal_name=action_name,
        is_active=True,
    )

    triggered = []
    for rule in rules:
        try:
            logger.info(f"Triggering view action automation: {rule.name} (action={action_name})")
            execute_automation_rule.delay(
                rule_id=str(rule.id),
                instance_id=str(instance.pk) if instance and hasattr(instance, 'pk') else None,
                instance_model=f"{instance._meta.app_label}.{instance._meta.model_name}" if instance else None,
                old_values={},
                new_values=context or {},
            )
            triggered.append(str(rule.id))
        except Exception as e:
            logger.error(f"Error triggering view action automation {rule.name}: {e}")

    return triggered


def trigger_manual_automation(
    rule_id: str,
    recipients: Optional[List[str]] = None,
    context: Optional[Dict[str, Any]] = None,
) -> bool:
    """
    Manually trigger a specific automation rule.

    This is used for admin-initiated triggers like broadcasts.

    Args:
        rule_id: The automation rule ID to trigger
        recipients: Optional list of recipient user IDs or emails
        context: Context variables for template rendering (e.g., title, body for broadcasts)

    Returns:
        True if triggered successfully, False otherwise
    """
    from .tasks import execute_manual_automation

    try:
        rule = AutomationRule.objects.get(id=rule_id, trigger_type='manual', is_active=True)
    except AutomationRule.DoesNotExist:
        logger.warning(f"Manual automation rule not found or not active: {rule_id}")
        return False

    try:
        logger.info(f"Triggering manual automation: {rule.name}")
        execute_manual_automation.delay(
            rule_id=str(rule.id),
            recipients=recipients or [],
            context=context or {},
        )
        return True
    except Exception as e:
        logger.error(f"Error triggering manual automation {rule.name}: {e}")
        return False


# Signal name constants for consistency
class SignalNames:
    """Constants for signal names used in automations."""
    PASSWORD_RESET = 'password_reset'
    PASSWORD_CHANGED = 'password_changed'
    EMAIL_VERIFICATION = 'email_verification'
    USER_LOGGED_IN = 'user_logged_in'
    USER_LOGGED_OUT = 'user_logged_out'


class ViewActionNames:
    """Constants for view action names used in automations."""
    BOOKING_LINK_SENT = 'booking_link_sent'
    ADMIN_BROADCAST = 'admin_broadcast'
