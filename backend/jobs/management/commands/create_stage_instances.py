"""
Management command to create stage instances for existing applications.

Usage:
    python manage.py create_stage_instances
    python manage.py create_stage_instances --dry-run
    python manage.py create_stage_instances --application-id <id>
"""

from django.core.management.base import BaseCommand
from jobs.models import Application, InterviewStageTemplate, ApplicationStageInstance, StageInstanceStatus


class Command(BaseCommand):
    help = 'Create stage instances for existing applications that have job stage templates'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without making changes',
        )
        parser.add_argument(
            '--application-id',
            type=str,
            help='Only process a specific application',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        application_id = options.get('application_id')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes will be made'))

        # Get applications
        applications = Application.objects.all()
        if application_id:
            applications = applications.filter(id=application_id)

        total_created = 0

        for application in applications:
            # Get stage templates for the job
            stage_templates = InterviewStageTemplate.objects.filter(
                job=application.job
            ).order_by('order')

            if not stage_templates.exists():
                continue

            # Get existing stage instance template IDs
            existing_template_ids = set(
                ApplicationStageInstance.objects.filter(
                    application=application
                ).values_list('stage_template_id', flat=True)
            )

            # Create missing instances
            created_count = 0
            for template in stage_templates:
                if template.id not in existing_template_ids:
                    if not dry_run:
                        ApplicationStageInstance.objects.create(
                            application=application,
                            stage_template=template,
                            status=StageInstanceStatus.NOT_STARTED,
                        )
                    created_count += 1
                    total_created += 1

            if created_count > 0:
                self.stdout.write(
                    f"  Application {application.id} ({application.candidate.full_name} → {application.job.title}): "
                    f"{created_count} stage(s) {'would be ' if dry_run else ''}created"
                )

        if total_created > 0:
            self.stdout.write(self.style.SUCCESS(
                f"\n{'Would create' if dry_run else 'Created'} {total_created} stage instance(s)"
            ))
        else:
            self.stdout.write(self.style.SUCCESS('\nNo stage instances needed'))
