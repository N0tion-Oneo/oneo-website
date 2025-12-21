"""
Django signals for the integrations app.

Handles automatic syncing of company billing details to Xero when updated.
"""

import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)

# Fields that trigger a Xero contact sync when changed
XERO_BILLING_FIELDS = [
    'legal_name',
    'registration_number',
    'vat_number',
    'billing_address',
    'billing_city',
    'billing_country',
    'billing_postal_code',
    'billing_contact_name',
    'billing_contact_email',
    'billing_contact_phone',
]


@receiver(pre_save, sender='companies.Company')
def track_billing_changes(sender, instance, **kwargs):
    """
    Track which billing fields changed before save.

    Stores the changed fields on the instance for use in post_save.
    """
    if not instance.pk:
        # New company, no previous values to compare
        instance._billing_fields_changed = False
        return

    try:
        old_instance = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        instance._billing_fields_changed = False
        return

    # Check if any billing fields changed
    changed = False
    for field in XERO_BILLING_FIELDS:
        old_value = getattr(old_instance, field, None)
        new_value = getattr(instance, field, None)

        # Handle ForeignKey fields (compare IDs)
        if hasattr(old_value, 'pk'):
            old_value = old_value.pk
        if hasattr(new_value, 'pk'):
            new_value = new_value.pk

        if old_value != new_value:
            changed = True
            logger.debug(f"Company {instance.pk}: {field} changed from {old_value} to {new_value}")
            break

    instance._billing_fields_changed = changed


@receiver(post_save, sender='companies.Company')
def sync_company_to_xero(sender, instance, created, **kwargs):
    """
    Trigger Xero contact sync when billing fields are updated.

    Only triggers if:
    - The company already has a Xero contact mapping
    - Billing fields actually changed (not just any save)
    - This is an update (not a new company creation)
    """
    # Skip new companies - they'll sync when their first invoice is sent
    if created:
        return

    # Check if billing fields changed
    billing_changed = getattr(instance, '_billing_fields_changed', False)
    if not billing_changed:
        return

    # Import here to avoid circular imports
    from integrations.models import XeroContactMapping

    # Only sync if company already has a Xero contact
    if not XeroContactMapping.objects.filter(company=instance).exists():
        logger.debug(f"Company {instance.pk} has no Xero contact mapping, skipping sync")
        return

    # Queue the sync task
    logger.info(f"Queueing Xero contact sync for company {instance.pk}")

    try:
        from integrations.tasks import sync_company_contact, CELERY_AVAILABLE

        if CELERY_AVAILABLE:
            sync_company_contact.delay(str(instance.pk))
        else:
            # Run synchronously if Celery not available
            sync_company_contact(str(instance.pk))
    except Exception as e:
        logger.error(f"Failed to queue Xero sync for company {instance.pk}: {e}")
