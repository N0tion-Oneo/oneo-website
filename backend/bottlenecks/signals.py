"""
Signals for auto-resolving bottleneck detections when underlying issues are fixed.

When an entity is updated, we check if any unresolved detections for that entity
should be auto-resolved because the bottleneck condition no longer applies.
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

logger = logging.getLogger(__name__)


def check_and_resolve_detections_for_entity(entity_type: str, entity_id: str):
    """
    Check all unresolved detections for an entity and auto-resolve if condition no longer applies.

    Args:
        entity_type: The bottleneck entity type (lead, company, candidate, application, stage_instance, task)
        entity_id: The entity's primary key as string
    """
    from .models import BottleneckDetection
    from .services import BottleneckDetectionService

    # Find unresolved detections for this entity
    detections = BottleneckDetection.objects.filter(
        entity_type=entity_type,
        entity_id=entity_id,
        is_resolved=False,
    ).select_related('rule')

    if not detections.exists():
        return

    resolved_count = 0

    for detection in detections:
        rule = detection.rule

        # Skip if rule is no longer active
        if not rule.is_active:
            continue

        # Re-evaluate if entity still matches the rule
        still_matches = BottleneckDetectionService.entity_matches_rule(rule, entity_id)

        if not still_matches:
            # Auto-resolve the detection
            detection.is_resolved = True
            detection.resolved_at = timezone.now()
            detection.resolution_notes = "Auto-resolved: condition no longer applies"
            detection.save(update_fields=['is_resolved', 'resolved_at', 'resolution_notes'])
            resolved_count += 1
            logger.info(f"[BOTTLENECK] Auto-resolved detection {detection.id} for {entity_type}/{entity_id}")

    if resolved_count > 0:
        logger.info(f"[BOTTLENECK] Auto-resolved {resolved_count} detections for {entity_type}/{entity_id}")


# =============================================================================
# Signal Handlers
# =============================================================================

@receiver(post_save, sender='companies.Lead')
def handle_lead_save(sender, instance, **kwargs):
    """Auto-resolve lead bottleneck detections when lead is updated."""
    check_and_resolve_detections_for_entity('lead', str(instance.id))


@receiver(post_save, sender='companies.Company')
def handle_company_save(sender, instance, **kwargs):
    """Auto-resolve company bottleneck detections when company is updated."""
    check_and_resolve_detections_for_entity('company', str(instance.id))


@receiver(post_save, sender='candidates.CandidateProfile')
def handle_candidate_save(sender, instance, **kwargs):
    """Auto-resolve candidate bottleneck detections when candidate is updated."""
    check_and_resolve_detections_for_entity('candidate', str(instance.id))


@receiver(post_save, sender='jobs.Application')
def handle_application_save(sender, instance, **kwargs):
    """Auto-resolve application bottleneck detections when application is updated."""
    check_and_resolve_detections_for_entity('application', str(instance.id))


@receiver(post_save, sender='jobs.ApplicationStageInstance')
def handle_stage_instance_save(sender, instance, **kwargs):
    """Auto-resolve stage_instance bottleneck detections when stage instance is updated."""
    check_and_resolve_detections_for_entity('stage_instance', str(instance.id))


@receiver(post_save, sender='core.Task')
def handle_task_save(sender, instance, **kwargs):
    """Auto-resolve task bottleneck detections when task is updated."""
    check_and_resolve_detections_for_entity('task', str(instance.id))
