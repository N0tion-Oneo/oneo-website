"""
Celery tasks for bottleneck detection.

These tasks handle periodic detection scans that identify
entities matching configurable bottleneck rules.
"""
import logging
from datetime import timedelta
from typing import Dict, Any

from django.utils import timezone
from django.db.models import Q

# Try to import Celery - if not available, provide fallback
try:
    from celery import shared_task
    CELERY_AVAILABLE = True
except ImportError:
    CELERY_AVAILABLE = False

    def shared_task(*args, **kwargs):
        """Fallback decorator when Celery is not installed."""
        def decorator(func):
            return func
        return decorator


logger = logging.getLogger(__name__)


@shared_task(name="bottlenecks.run_detection_scan")
def run_detection_scan() -> Dict[str, Any]:
    """
    Run detection scan for all active bottleneck rules that are due to run.

    This task runs frequently (every 5 minutes via Celery Beat) and:
    1. Finds all active rules where next_run_at <= now (or is null for first run)
    2. Executes each due rule to detect matching entities
    3. Updates next_run_at based on each rule's schedule_interval_minutes
    4. Creates detection records and triggers actions (notifications, tasks)
    5. Returns a summary of the scan results

    Returns:
        Summary of rules executed and detections created
    """
    from .models import BottleneckRule
    from .services import BottleneckDetectionService

    now = timezone.now()
    logger.info(f"[BOTTLENECK] Starting detection scan at {now}")

    results = {
        'rules_checked': 0,
        'rules_executed': 0,
        'rules_skipped': 0,
        'total_scanned': 0,
        'total_detected': 0,
        'notifications_sent': 0,
        'tasks_created': 0,
        'errors': [],
    }

    # Get all active rules scheduled to run that are due
    # A rule is due if: next_run_at is null (never run) OR next_run_at <= now
    active_rules = BottleneckRule.objects.filter(
        is_active=True,
        run_on_schedule=True
    ).filter(
        Q(next_run_at__isnull=True) | Q(next_run_at__lte=now)
    )

    results['rules_checked'] = active_rules.count()
    logger.info(f"[BOTTLENECK] Found {results['rules_checked']} rules due to run")

    for rule in active_rules:
        try:
            logger.info(
                f"[BOTTLENECK] Executing rule: {rule.name} "
                f"(entity_type={rule.entity_type}, interval={rule.schedule_interval_minutes}min)"
            )

            # Execute the rule (scheduled trigger)
            from .models import ExecutionTrigger
            rule_result = BottleneckDetectionService.execute_rule(
                rule,
                trigger=ExecutionTrigger.SCHEDULED
            )

            # Update next_run_at based on the rule's schedule
            rule.next_run_at = now + timedelta(minutes=rule.schedule_interval_minutes)
            rule.save(update_fields=['next_run_at', 'last_run_at'])

            results['rules_executed'] += 1
            results['total_scanned'] += rule_result.get('scanned', 0)
            results['total_detected'] += rule_result.get('detected', 0)
            results['notifications_sent'] += rule_result.get('notifications', 0)
            results['tasks_created'] += rule_result.get('tasks', 0)

            logger.info(
                f"[BOTTLENECK] Rule {rule.name}: "
                f"scanned={rule_result.get('scanned', 0)}, "
                f"detected={rule_result.get('detected', 0)}, "
                f"next_run={rule.next_run_at}"
            )

        except Exception as e:
            logger.error(f"[BOTTLENECK] Error executing rule {rule.name}: {e}")
            results['errors'].append({
                'rule_id': str(rule.id),
                'rule_name': rule.name,
                'error': str(e),
            })

    # Count rules that were active but not due
    total_active = BottleneckRule.objects.filter(
        is_active=True,
        run_on_schedule=True
    ).count()
    results['rules_skipped'] = total_active - results['rules_checked']

    logger.info(
        f"[BOTTLENECK] Scan completed: "
        f"executed={results['rules_executed']}/{results['rules_checked']} due, "
        f"skipped={results['rules_skipped']} not due, "
        f"scanned={results['total_scanned']}, "
        f"detected={results['total_detected']}, "
        f"errors={len(results['errors'])}"
    )

    return results


@shared_task(name="bottlenecks.execute_single_rule")
def execute_single_rule(rule_id: str) -> Dict[str, Any]:
    """
    Execute a single bottleneck rule by ID.

    This task is used for manual rule execution or on-demand detection.
    Does NOT update next_run_at (manual runs don't affect schedule).

    Args:
        rule_id: UUID of the BottleneckRule to execute

    Returns:
        Execution result with counts of detections and actions
    """
    from .models import BottleneckRule, ExecutionTrigger
    from .services import BottleneckDetectionService

    logger.info(f"[BOTTLENECK] Manual execution of rule: {rule_id}")

    try:
        rule = BottleneckRule.objects.get(id=rule_id)
    except BottleneckRule.DoesNotExist:
        logger.error(f"[BOTTLENECK] Rule not found: {rule_id}")
        return {'success': False, 'error': 'Rule not found'}

    if not rule.is_active:
        logger.warning(f"[BOTTLENECK] Rule {rule.name} is not active")
        return {'success': False, 'error': 'Rule is not active'}

    try:
        result = BottleneckDetectionService.execute_rule(
            rule,
            trigger=ExecutionTrigger.API  # Triggered via Celery task
        )
        result['success'] = True
        result['rule_id'] = str(rule.id)
        result['rule_name'] = rule.name

        logger.info(f"[BOTTLENECK] Rule {rule.name} executed successfully: {result}")
        return result

    except Exception as e:
        logger.error(f"[BOTTLENECK] Error executing rule {rule.name}: {e}")
        return {
            'success': False,
            'rule_id': str(rule.id),
            'rule_name': rule.name,
            'error': str(e),
        }


@shared_task(name="bottlenecks.resolve_stale_detections")
def resolve_stale_detections(days_old: int = 30) -> Dict[str, Any]:
    """
    Auto-resolve old unresolved detections.

    This task can run daily to clean up old detection records
    that were never manually resolved.

    Args:
        days_old: Number of days after which to auto-resolve detections

    Returns:
        Count of resolved detections
    """
    from .models import BottleneckDetection

    logger.info(f"[BOTTLENECK] Resolving stale detections older than {days_old} days")

    cutoff_date = timezone.now() - timedelta(days=days_old)

    stale_detections = BottleneckDetection.objects.filter(
        is_resolved=False,
        detected_at__lt=cutoff_date
    )

    count = stale_detections.count()

    if count > 0:
        stale_detections.update(
            is_resolved=True,
            resolved_at=timezone.now()
        )
        logger.info(f"[BOTTLENECK] Auto-resolved {count} stale detections")

    return {
        'resolved_count': count,
        'cutoff_days': days_old,
    }


@shared_task(name="bottlenecks.reset_rule_schedule")
def reset_rule_schedule(rule_id: str) -> Dict[str, Any]:
    """
    Reset a rule's schedule to run immediately on next scan.

    Args:
        rule_id: UUID of the BottleneckRule to reset

    Returns:
        Success status
    """
    from .models import BottleneckRule

    try:
        rule = BottleneckRule.objects.get(id=rule_id)
        rule.next_run_at = None
        rule.save(update_fields=['next_run_at'])

        logger.info(f"[BOTTLENECK] Reset schedule for rule: {rule.name}")
        return {'success': True, 'rule_id': str(rule.id), 'rule_name': rule.name}

    except BottleneckRule.DoesNotExist:
        return {'success': False, 'error': 'Rule not found'}
