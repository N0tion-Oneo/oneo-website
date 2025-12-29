"""
Signal handlers for automation event capture.

This module captures model events (create, update, delete, stage_changed)
for all models registered with the @automatable decorator and triggers
corresponding automation workflows.
"""
import logging
from django.db.models.signals import post_save, post_delete, pre_save
from django.contrib.contenttypes.models import ContentType

from .registry import AutomatableModelRegistry

logger = logging.getLogger(__name__)


def capture_pre_save_state(sender, instance, **kwargs):
    """
    Capture state before save for change detection.

    Stores the old values of automatable fields so we can detect
    what changed after the save completes.
    """
    if not instance.pk:
        # New instance - no old values
        instance._automation_is_new = True
        instance._automation_old_values = {}
        instance._automation_old_status = None
        return

    instance._automation_is_new = False

    try:
        old = sender.objects.get(pk=instance.pk)
        config = AutomatableModelRegistry.get_model_config(
            sender._meta.app_label,
            sender._meta.model_name
        )
        if config:
            # Capture all automatable field values
            instance._automation_old_values = {}
            for field in config.get('fields', []):
                try:
                    value = getattr(old, field, None)
                    # Handle foreign key fields - get the ID
                    if hasattr(value, 'pk'):
                        value = str(value.pk) if value.pk else None
                    instance._automation_old_values[field] = value
                except Exception as e:
                    logger.debug(f"Could not capture field {field}: {e}")

            # Capture status field specifically for stage_changed events
            status_field = config.get('status_field')
            if status_field:
                try:
                    old_status = getattr(old, status_field, None)
                    # Handle foreign key status fields (like OnboardingStage)
                    if hasattr(old_status, 'pk'):
                        instance._automation_old_status = str(old_status.pk) if old_status else None
                        instance._automation_old_status_display = str(old_status) if old_status else None
                    else:
                        instance._automation_old_status = str(old_status) if old_status else None
                        instance._automation_old_status_display = old_status
                except Exception as e:
                    logger.debug(f"Could not capture status field {status_field}: {e}")
                    instance._automation_old_status = None
                    instance._automation_old_status_display = None
            else:
                instance._automation_old_status = None
                instance._automation_old_status_display = None

    except sender.DoesNotExist:
        # Object doesn't exist yet (rare race condition)
        instance._automation_old_values = {}
        instance._automation_old_status = None
        instance._automation_old_status_display = None


def handle_post_save(sender, instance, created, **kwargs):
    """
    Handle post-save and trigger automations.

    Fires events:
    - model_created: When a new record is created
    - model_updated: When an existing record is updated
    - stage_changed: When the status/stage field changes (separate event)
    """
    config = AutomatableModelRegistry.get_model_config(
        sender._meta.app_label,
        sender._meta.model_name
    )
    if not config:
        return

    model_key = f"{sender._meta.app_label}.{sender._meta.model_name}"
    logger.info(f"[AUTOMATION SIGNAL] post_save fired for {model_key}, pk={instance.pk}, created={created}")

    ct = ContentType.objects.get_for_model(sender)

    # Get old and new values for comparison
    old_values = getattr(instance, '_automation_old_values', {})
    new_values = _get_current_values(instance, config)

    # Determine event type
    if created:
        event_type = 'model_created'
    else:
        event_type = 'model_updated'

    # Check for stage/status change
    status_field = config.get('status_field')
    if status_field and not created:
        old_status = getattr(instance, '_automation_old_status', None)
        new_status_value = getattr(instance, status_field, None)

        # Handle foreign key status fields
        if hasattr(new_status_value, 'pk'):
            new_status = str(new_status_value.pk) if new_status_value else None
            new_status_display = str(new_status_value) if new_status_value else None
        else:
            new_status = str(new_status_value) if new_status_value else None
            new_status_display = new_status_value

        old_status_display = getattr(instance, '_automation_old_status_display', old_status)

        if old_status and new_status and old_status != new_status:
            logger.info(f"[AUTOMATION SIGNAL] Status/stage changed for {model_key}: {old_status_display} -> {new_status_display}")

            # Fire stage_changed event
            _queue_automation_event(
                content_type_id=ct.id,
                object_id=str(instance.pk),
                event_type='stage_changed',
                old_values={'stage': old_status, 'stage_display': old_status_display},
                new_values={'stage': new_status, 'stage_display': new_status_display},
            )

            # Also fire status_changed event (alias for stage_changed)
            _queue_automation_event(
                content_type_id=ct.id,
                object_id=str(instance.pk),
                event_type='status_changed',
                old_values={'status': old_status, 'status_display': old_status_display},
                new_values={'status': new_status, 'status_display': new_status_display},
            )

    # Fire created/updated event
    _queue_automation_event(
        content_type_id=ct.id,
        object_id=str(instance.pk),
        event_type=event_type,
        old_values=old_values,
        new_values=new_values,
    )


def handle_post_delete(sender, instance, **kwargs):
    """
    Handle post-delete and trigger automations.

    Fires model_deleted event with the final values before deletion.
    """
    config = AutomatableModelRegistry.get_model_config(
        sender._meta.app_label,
        sender._meta.model_name
    )
    if not config:
        return

    ct = ContentType.objects.get_for_model(sender)

    # Capture final values
    final_values = _get_current_values(instance, config)

    _queue_automation_event(
        content_type_id=ct.id,
        object_id=str(instance.pk),
        event_type='model_deleted',
        old_values=final_values,
        new_values={},
    )


def _get_current_values(instance, config):
    """Extract current values for automatable fields."""
    values = {}
    for field in config.get('fields', []):
        try:
            value = getattr(instance, field, None)
            # Handle foreign key fields - get the ID and also traverse relations
            if hasattr(value, 'pk'):
                values[field] = str(value.pk) if value.pk else None
                # Also capture common nested fields for related objects
                _add_related_fields(values, field, value)
            elif value is not None:
                values[field] = str(value)
            else:
                values[field] = None
        except Exception as e:
            logger.debug(f"Could not get field {field}: {e}")
    return values


def _add_related_fields(values, field_name, related_obj):
    """
    Add commonly needed fields from related objects.

    This allows conditions like 'stage_template__stage_type' to work.
    """
    if related_obj is None:
        return

    # Common fields to capture from related objects
    common_fields = ['name', 'stage_type', 'status', 'type', 'category', 'role']

    for attr in common_fields:
        if hasattr(related_obj, attr):
            try:
                value = getattr(related_obj, attr, None)
                if value is not None:
                    key = f"{field_name}__{attr}"
                    values[key] = str(value)
            except Exception:
                pass


def _queue_automation_event(content_type_id, object_id, event_type, old_values, new_values):
    """
    Queue an automation event for processing.

    Uses Celery if available, otherwise processes synchronously.
    """
    try:
        from .tasks import process_automation_event

        # Check if Celery is properly configured
        try:
            from celery import current_app
            if current_app.conf.broker_url:
                # Celery is configured - use async
                process_automation_event.delay(
                    content_type_id=content_type_id,
                    object_id=object_id,
                    event_type=event_type,
                    old_values=old_values,
                    new_values=new_values,
                )
                return
        except Exception:
            pass

        # Fallback to sync execution
        process_automation_event(
            content_type_id=content_type_id,
            object_id=object_id,
            event_type=event_type,
            old_values=old_values,
            new_values=new_values,
        )
    except Exception as e:
        logger.error(f"Failed to queue automation event: {e}")


# Track connected models to avoid double-connecting
_connected_models = set()


def connect_signals():
    """
    Connect signals for all registered models.

    Should be called once during app initialization (in AppConfig.ready()).
    """
    global _connected_models

    for key, config in AutomatableModelRegistry.get_all().items():
        if key in _connected_models:
            continue

        model = config['model']

        # Connect pre_save for change detection
        pre_save.connect(
            capture_pre_save_state,
            sender=model,
            weak=False,
            dispatch_uid=f"automation_pre_save_{key}"
        )

        # Connect post_save for created/updated events
        post_save.connect(
            handle_post_save,
            sender=model,
            weak=False,
            dispatch_uid=f"automation_post_save_{key}"
        )

        # Connect post_delete for deleted events
        post_delete.connect(
            handle_post_delete,
            sender=model,
            weak=False,
            dispatch_uid=f"automation_post_delete_{key}"
        )

        _connected_models.add(key)
        logger.debug(f"Connected automation signals for {key}")


def disconnect_signals():
    """
    Disconnect signals for all registered models.

    Useful for testing or cleanup.
    """
    global _connected_models

    for key, config in AutomatableModelRegistry.get_all().items():
        model = config['model']

        pre_save.disconnect(
            capture_pre_save_state,
            sender=model,
            dispatch_uid=f"automation_pre_save_{key}"
        )

        post_save.disconnect(
            handle_post_save,
            sender=model,
            dispatch_uid=f"automation_post_save_{key}"
        )

        post_delete.disconnect(
            handle_post_delete,
            sender=model,
            dispatch_uid=f"automation_post_delete_{key}"
        )

    _connected_models.clear()
    logger.debug("Disconnected all automation signals")


# =============================================================================
# Django Auth Signal Handlers
# =============================================================================

_auth_signals_connected = False


def handle_password_reset(sender, request, user, **kwargs):
    """Handle password reset signal - trigger automations."""
    from .triggers import trigger_signal_automations, SignalNames
    trigger_signal_automations(SignalNames.PASSWORD_RESET, instance=user)


def handle_password_changed(sender, request, user, **kwargs):
    """Handle password changed signal - trigger automations."""
    from .triggers import trigger_signal_automations, SignalNames
    trigger_signal_automations(SignalNames.PASSWORD_CHANGED, instance=user)


def handle_user_logged_in(sender, request, user, **kwargs):
    """Handle user login signal - trigger automations."""
    from .triggers import trigger_signal_automations, SignalNames
    trigger_signal_automations(SignalNames.USER_LOGGED_IN, instance=user)


def handle_user_logged_out(sender, request, user, **kwargs):
    """Handle user logout signal - trigger automations."""
    from .triggers import trigger_signal_automations, SignalNames
    if user:  # user can be None for anonymous logout
        trigger_signal_automations(SignalNames.USER_LOGGED_OUT, instance=user)


def connect_auth_signals():
    """
    Connect Django auth signals to automation triggers.

    Should be called once during app initialization (in AppConfig.ready()).
    """
    global _auth_signals_connected

    if _auth_signals_connected:
        return

    try:
        from django.contrib.auth.signals import user_logged_in, user_logged_out
        from django.contrib.auth import get_user_model

        User = get_user_model()

        # Connect login/logout signals
        user_logged_in.connect(
            handle_user_logged_in,
            dispatch_uid="automation_user_logged_in"
        )
        user_logged_out.connect(
            handle_user_logged_out,
            dispatch_uid="automation_user_logged_out"
        )

        logger.debug("Connected Django auth signals for automations")
        _auth_signals_connected = True

    except Exception as e:
        logger.warning(f"Could not connect auth signals: {e}")


def disconnect_auth_signals():
    """Disconnect Django auth signals."""
    global _auth_signals_connected

    try:
        from django.contrib.auth.signals import user_logged_in, user_logged_out

        user_logged_in.disconnect(dispatch_uid="automation_user_logged_in")
        user_logged_out.disconnect(dispatch_uid="automation_user_logged_out")

        _auth_signals_connected = False
        logger.debug("Disconnected Django auth signals")
    except Exception as e:
        logger.warning(f"Could not disconnect auth signals: {e}")
