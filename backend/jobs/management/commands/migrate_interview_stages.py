"""
Management command to migrate existing interview_stages JSON to InterviewStageTemplate records.

This command:
1. Iterates through all jobs with interview_stages JSON
2. Infers the stage_type from the stage name using keyword matching
3. Creates InterviewStageTemplate records for each stage
4. Optionally creates ApplicationStageInstance records for existing applications

Usage:
    python manage.py migrate_interview_stages
    python manage.py migrate_interview_stages --dry-run
    python manage.py migrate_interview_stages --include-applications
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from jobs.models import Job, InterviewStageTemplate, Application, ApplicationStageInstance, StageType, StageInstanceStatus


# Keywords to infer stage type from stage name
STAGE_TYPE_KEYWORDS = {
    StageType.APPLICATION_SCREEN: [
        'application', 'review', 'screen', 'screening', 'resume', 'cv', 'initial'
    ],
    StageType.PHONE_SCREENING: [
        'phone', 'call', 'telephone', 'intro call', 'discovery'
    ],
    StageType.VIDEO_CALL: [
        'video', 'zoom', 'teams', 'meet', 'virtual', 'online interview', 'remote interview'
    ],
    StageType.IN_PERSON_INTERVIEW: [
        'in-person', 'in person', 'onsite', 'on-site', 'office', 'face to face', 'f2f', 'final interview', 'panel'
    ],
    StageType.TAKE_HOME_ASSESSMENT: [
        'take home', 'take-home', 'assignment', 'project', 'coding challenge', 'homework'
    ],
    StageType.IN_PERSON_ASSESSMENT: [
        'in-person assessment', 'onsite assessment', 'whiteboard', 'live coding', 'pair programming'
    ],
}

# Default durations by stage type
DEFAULT_DURATIONS = {
    StageType.APPLICATION_SCREEN: None,
    StageType.PHONE_SCREENING: 30,
    StageType.VIDEO_CALL: 45,
    StageType.IN_PERSON_INTERVIEW: 60,
    StageType.TAKE_HOME_ASSESSMENT: None,
    StageType.IN_PERSON_ASSESSMENT: 90,
    StageType.CUSTOM: 60,
}


def infer_stage_type(stage_name: str) -> StageType:
    """Infer the stage type from the stage name using keyword matching."""
    name_lower = stage_name.lower()

    # Check each stage type's keywords
    for stage_type, keywords in STAGE_TYPE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in name_lower:
                return stage_type

    # Check for generic interview/technical keywords
    if 'technical' in name_lower or 'tech' in name_lower:
        if 'assessment' in name_lower or 'test' in name_lower:
            return StageType.TAKE_HOME_ASSESSMENT
        return StageType.VIDEO_CALL

    if 'interview' in name_lower:
        return StageType.VIDEO_CALL

    # Default to custom for unrecognized stages
    return StageType.CUSTOM


class Command(BaseCommand):
    help = 'Migrate interview_stages JSON to InterviewStageTemplate records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be migrated without making changes',
        )
        parser.add_argument(
            '--include-applications',
            action='store_true',
            help='Also create ApplicationStageInstance records for existing applications',
        )
        parser.add_argument(
            '--job-id',
            type=str,
            help='Only migrate a specific job by ID',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        include_applications = options['include_applications']
        job_id = options.get('job_id')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes will be made'))

        # Get jobs to migrate
        jobs_qs = Job.objects.all()
        if job_id:
            jobs_qs = jobs_qs.filter(id=job_id)

        # Filter to jobs that have interview_stages but no InterviewStageTemplate records
        jobs_to_migrate = []
        for job in jobs_qs:
            has_json_stages = job.interview_stages and len(job.interview_stages) > 0
            has_template_stages = InterviewStageTemplate.objects.filter(job=job).exists()

            if has_json_stages and not has_template_stages:
                jobs_to_migrate.append(job)

        if not jobs_to_migrate:
            self.stdout.write(self.style.SUCCESS('No jobs need migration'))
            return

        self.stdout.write(f'Found {len(jobs_to_migrate)} jobs to migrate')

        templates_created = 0
        instances_created = 0

        for job in jobs_to_migrate:
            self.stdout.write(f'\nMigrating job: {job.title} (ID: {job.id})')

            stages = job.interview_stages or []
            self.stdout.write(f'  Found {len(stages)} stages in JSON')

            if dry_run:
                for stage in stages:
                    stage_type = infer_stage_type(stage.get('name', ''))
                    self.stdout.write(
                        f"    - '{stage.get('name')}' -> {stage_type}"
                    )
                continue

            with transaction.atomic():
                # Create InterviewStageTemplate records
                created_templates = []
                for stage in stages:
                    stage_name = stage.get('name', 'Unnamed Stage')
                    stage_type = infer_stage_type(stage_name)

                    template = InterviewStageTemplate.objects.create(
                        job=job,
                        stage_type=stage_type,
                        name=stage_name,
                        order=stage.get('order', 1),
                        description=stage.get('description', ''),
                        default_duration_minutes=DEFAULT_DURATIONS.get(stage_type),
                        assessment_external_url=stage.get('assessment_url', ''),
                        assessment_provider_name=stage.get('assessment_name', ''),
                        use_company_address=True,
                    )
                    created_templates.append(template)
                    templates_created += 1

                    self.stdout.write(
                        f"    Created: '{stage_name}' as {stage_type}"
                    )

                # Create ApplicationStageInstance records if requested
                if include_applications:
                    applications = Application.objects.filter(job=job)
                    for application in applications:
                        for template in created_templates:
                            # Check if instance already exists
                            if not ApplicationStageInstance.objects.filter(
                                application=application,
                                stage_template=template
                            ).exists():
                                # Determine initial status based on application progress
                                status = StageInstanceStatus.NOT_STARTED
                                if application.current_stage_order > template.order:
                                    status = StageInstanceStatus.COMPLETED
                                elif application.current_stage_order == template.order:
                                    status = StageInstanceStatus.IN_PROGRESS

                                ApplicationStageInstance.objects.create(
                                    application=application,
                                    stage_template=template,
                                    status=status,
                                )
                                instances_created += 1

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Migration complete: {templates_created} templates created'
        ))
        if include_applications:
            self.stdout.write(self.style.SUCCESS(
                f'                   {instances_created} stage instances created'
            ))
