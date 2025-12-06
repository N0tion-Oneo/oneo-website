import logging
from typing import Optional, Tuple
from rapidfuzz import fuzz, process
from django.db import transaction
from django.utils.text import slugify
from candidates.models import (
    CandidateProfile, Experience, Education,
    Technology, Skill, TechnologyCategory, SkillCategory
)
from companies.models import Country, City

logger = logging.getLogger(__name__)

# Minimum similarity score for fuzzy matching (0-100)
FUZZY_MATCH_THRESHOLD = 80


def fuzzy_match_or_create_technology(name: str, create_if_not_found: bool = True) -> Tuple[Optional[Technology], bool]:
    """
    Find a Technology by fuzzy matching against existing records.
    If not found and create_if_not_found is True, creates a new Technology.

    Returns: (Technology or None, was_created: bool)
    """
    technologies = list(Technology.objects.values_list('id', 'name'))

    if technologies:
        choices = {t[0]: t[1] for t in technologies}
        result = process.extractOne(
            name,
            choices,
            scorer=fuzz.WRatio,
            score_cutoff=FUZZY_MATCH_THRESHOLD
        )

        if result:
            matched_name, score, tech_id = result
            logger.debug(f"Fuzzy matched technology '{name}' -> '{matched_name}' (score: {score})")
            return Technology.objects.get(id=tech_id), False

    # Not found - create if requested
    if create_if_not_found:
        # Generate unique slug
        base_slug = slugify(name)[:100]
        slug = base_slug
        counter = 1
        while Technology.objects.filter(slug=slug).exists():
            slug = f"{base_slug[:95]}-{counter}"
            counter += 1

        tech = Technology.objects.create(
            name=name[:100],
            slug=slug,
            category=TechnologyCategory.OTHER,
            is_active=True,
            needs_review=True
        )
        logger.info(f"Created new technology (needs review): '{name}'")
        return tech, True

    return None, False


def fuzzy_match_or_create_skill(name: str, create_if_not_found: bool = True) -> Tuple[Optional[Skill], bool]:
    """
    Find a Skill by fuzzy matching against existing records.
    If not found and create_if_not_found is True, creates a new Skill.

    Returns: (Skill or None, was_created: bool)
    """
    skills = list(Skill.objects.values_list('id', 'name'))

    if skills:
        choices = {s[0]: s[1] for s in skills}
        result = process.extractOne(
            name,
            choices,
            scorer=fuzz.WRatio,
            score_cutoff=FUZZY_MATCH_THRESHOLD
        )

        if result:
            matched_name, score, skill_id = result
            logger.debug(f"Fuzzy matched skill '{name}' -> '{matched_name}' (score: {score})")
            return Skill.objects.get(id=skill_id), False

    # Not found - create if requested
    if create_if_not_found:
        # Generate unique slug
        base_slug = slugify(name)[:100]
        slug = base_slug
        counter = 1
        while Skill.objects.filter(slug=slug).exists():
            slug = f"{base_slug[:95]}-{counter}"
            counter += 1

        skill = Skill.objects.create(
            name=name[:100],
            slug=slug,
            category=SkillCategory.OTHER,
            is_active=True,
            needs_review=True
        )
        logger.info(f"Created new skill (needs review): '{name}'")
        return skill, True

    return None, False


def find_country_by_name(name: str) -> Optional[Country]:
    """Find a Country by exact or case-insensitive match."""
    if not name:
        return None

    # Try exact match first
    country = Country.objects.filter(name__iexact=name).first()
    if country:
        return country

    # Try partial match
    country = Country.objects.filter(name__icontains=name).first()
    return country


def find_city_by_name(name: str, country: Optional[Country] = None) -> Optional[City]:
    """Find a City by name, optionally filtered by country."""
    if not name:
        return None

    queryset = City.objects.all()
    if country:
        queryset = queryset.filter(country=country)

    # Try exact match first
    city = queryset.filter(name__iexact=name).first()
    if city:
        return city

    # Try partial match
    city = queryset.filter(name__icontains=name).first()
    return city


@transaction.atomic
def import_resume_data(candidate_profile: CandidateProfile, parsed_data: dict) -> dict:
    """
    Import parsed resume data into the candidate's profile.

    Returns a summary of what was imported/matched.
    """
    results = {
        'profile_updated': False,
        'user_updated': False,
        'experiences_created': 0,
        'education_created': 0,
        'technologies_matched': [],
        'technologies_created': [],
        'skills_matched': [],
        'skills_created': [],
    }

    profile_data = parsed_data.get('profile', {})
    experiences_data = parsed_data.get('experiences', [])
    education_data = parsed_data.get('education', [])

    # Update User (first_name, last_name)
    user = candidate_profile.user
    if profile_data.get('first_name'):
        user.first_name = profile_data['first_name']
    if profile_data.get('last_name'):
        user.last_name = profile_data['last_name']
    user.save()
    results['user_updated'] = True

    # Update CandidateProfile
    if profile_data.get('professional_title'):
        candidate_profile.professional_title = profile_data['professional_title']
    if profile_data.get('headline'):
        candidate_profile.headline = profile_data['headline']
    if profile_data.get('professional_summary'):
        candidate_profile.professional_summary = profile_data['professional_summary']

    # Match country and city
    country = find_country_by_name(profile_data.get('country'))
    if country:
        candidate_profile.country_rel = country
        city = find_city_by_name(profile_data.get('city'), country)
        if city:
            candidate_profile.city_rel = city

    candidate_profile.save()
    results['profile_updated'] = True

    # Clear existing experiences and education (optional - could be configurable)
    # For now, we'll add to existing rather than replace
    # candidate_profile.experiences.all().delete()
    # candidate_profile.education.all().delete()

    # Import Experiences
    for idx, exp_data in enumerate(experiences_data):
        # Parse dates
        start_date = exp_data.get('start_date')
        end_date = exp_data.get('end_date')

        if not start_date:
            continue  # Skip experiences without start date

        experience = Experience.objects.create(
            candidate=candidate_profile,
            job_title=exp_data.get('job_title', ''),
            company_name=exp_data.get('company_name', ''),
            start_date=start_date,
            end_date=end_date if not exp_data.get('is_current') else None,
            is_current=exp_data.get('is_current', False),
            description=exp_data.get('description', ''),
            order=idx,
        )

        # Match or create technologies
        for tech_name in exp_data.get('technologies', []):
            tech, was_created = fuzzy_match_or_create_technology(tech_name)
            if tech:
                experience.technologies.add(tech)
                if was_created:
                    if tech_name not in results['technologies_created']:
                        results['technologies_created'].append(tech_name)
                else:
                    if tech_name not in results['technologies_matched']:
                        results['technologies_matched'].append(tech_name)

        # Match or create skills
        for skill_name in exp_data.get('skills', []):
            skill, was_created = fuzzy_match_or_create_skill(skill_name)
            if skill:
                experience.skills.add(skill)
                if was_created:
                    if skill_name not in results['skills_created']:
                        results['skills_created'].append(skill_name)
                else:
                    if skill_name not in results['skills_matched']:
                        results['skills_matched'].append(skill_name)

        results['experiences_created'] += 1

    # Import Education
    for idx, edu_data in enumerate(education_data):
        start_date = edu_data.get('start_date')
        end_date = edu_data.get('end_date')

        # Education might not have dates
        if not start_date:
            # Use a default date if not provided
            start_date = '2000-01-01'

        Education.objects.create(
            candidate=candidate_profile,
            institution=edu_data.get('institution', ''),
            degree=edu_data.get('degree', '') or '',
            field_of_study=edu_data.get('field_of_study', '') or '',
            start_date=start_date,
            end_date=end_date if not edu_data.get('is_current') else None,
            is_current=edu_data.get('is_current', False),
            grade=edu_data.get('grade', '') or '',
            order=idx,
        )
        results['education_created'] += 1

    logger.info(f"Imported resume data for candidate {candidate_profile.id}: {results}")
    return results
