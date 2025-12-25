# Generated manually to fix onboarding stages data

from django.db import migrations


def fix_onboarding_stages(apps, schema_editor):
    """
    Fix onboarding stages to match the correct pipeline.

    This migration:
    1. Removes all existing company and candidate onboarding stages
    2. Re-creates them with correct names, slugs, and order
    3. Preserves any company references by mapping old slugs to new ones
    """
    OnboardingStage = apps.get_model('core', 'OnboardingStage')
    Company = apps.get_model('companies', 'Company')

    # Map old slugs to new slugs for company stage references
    company_slug_mapping = {
        # Old seed migration slugs
        'meeting-booked': 'sales-meeting-booked',
        'tcs-sent': 'invitation-sent',
        'tcs-signed': 'onboarding-contract',
        'profile-completed': 'onboarding-profile',
        'billing-completed': 'onboarding-billing',
        'team-added': 'onboarding-team',
        # Manually added slugs that might exist
        'sourced': 'lead',
        'onboarding-step-1-contract': 'onboarding-contract',
        'onboarding-step-2-profile': 'onboarding-profile',
        'onboarding-step-3-billing': 'onboarding-billing',
        'onboarding-step-4-team-added': 'onboarding-team',
        'onboarding-step-4-onboarding-call-booked': 'onboarding-call-booked',
        'onboarding-step-5-onboarding-call-booked': 'onboarding-call-booked',
    }

    # Store current company stage assignments before deleting
    company_stages_backup = {}
    for company in Company.objects.filter(onboarding_stage__isnull=False):
        old_slug = company.onboarding_stage.slug
        company_stages_backup[company.id] = company_slug_mapping.get(old_slug, old_slug)

    # Delete all existing stages
    OnboardingStage.objects.all().delete()

    # Company stages - Full pipeline
    company_stages = [
        ('Lead', 'lead', '#9CA3AF', False),
        ('Qualified', 'qualified', '#F59E0B', False),
        ('Sales Meeting Booked', 'sales-meeting-booked', '#3B82F6', False),
        ('Invitation Sent', 'invitation-sent', '#8B5CF6', False),
        ('Onboarding: Contract', 'onboarding-contract', '#6366F1', False),
        ('Onboarding: Profile', 'onboarding-profile', '#10B981', False),
        ('Onboarding: Billing', 'onboarding-billing', '#14B8A6', False),
        ('Onboarding: Team', 'onboarding-team', '#06B6D4', False),
        ('Onboarding: Call Booked', 'onboarding-call-booked', '#0EA5E9', False),
        ('Onboarding Call', 'onboarding-call', '#A855F7', False),
        ('Onboarded', 'onboarded', '#22C55E', True),
        ('Not Onboarded', 'not-onboarded', '#EF4444', True),
    ]

    # Candidate stages
    candidate_stages = [
        ('Lead', 'lead', '#9CA3AF', False),
        ('Meeting Booked', 'meeting-booked', '#3B82F6', False),
        ('Profile Review', 'profile-review', '#8B5CF6', False),
        ('Onboarded', 'onboarded', '#22C55E', True),
        ('Not Onboarded', 'not-onboarded', '#EF4444', True),
    ]

    # Create new stages
    new_company_stages = {}
    for i, (name, slug, color, is_terminal) in enumerate(company_stages):
        stage = OnboardingStage.objects.create(
            name=name,
            slug=slug,
            entity_type='company',
            order=i,
            color=color,
            is_terminal=is_terminal,
            is_active=True,
        )
        new_company_stages[slug] = stage

    for i, (name, slug, color, is_terminal) in enumerate(candidate_stages):
        OnboardingStage.objects.create(
            name=name,
            slug=slug,
            entity_type='candidate',
            order=i,
            color=color,
            is_terminal=is_terminal,
            is_active=True,
        )

    # Restore company stage assignments
    for company_id, new_slug in company_stages_backup.items():
        if new_slug in new_company_stages:
            Company.objects.filter(id=company_id).update(
                onboarding_stage=new_company_stages[new_slug]
            )


def reverse_fix(apps, schema_editor):
    """Reverse is a no-op - manual intervention required."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_remove_clients_can_view_all_candidates'),
        ('companies', '0001_initial'),  # Ensure Company model is available
    ]

    operations = [
        migrations.RunPython(fix_onboarding_stages, reverse_fix),
    ]
