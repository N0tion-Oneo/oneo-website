"""
Export views for candidate data.
Provides CSV export functionality for admin/recruiter users.
"""
import csv
from django.http import StreamingHttpResponse
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter

from users.models import UserRole
from .models import CandidateProfile


class Echo:
    """An object that implements just the write method of the file-like interface."""
    def write(self, value):
        return value


def get_filtered_candidates(request):
    """Apply the same filters as list_all_candidates to get queryset."""
    candidates = CandidateProfile.objects.select_related(
        'user', 'city_rel', 'country_rel'
    ).prefetch_related('industries', 'experiences', 'education')

    # Filter by seniority
    seniority = request.query_params.get('seniority')
    if seniority:
        candidates = candidates.filter(seniority=seniority)

    # Filter by work preference
    work_preference = request.query_params.get('work_preference')
    if work_preference:
        candidates = candidates.filter(work_preference=work_preference)

    # Filter by visibility
    visibility = request.query_params.get('visibility')
    if visibility:
        candidates = candidates.filter(visibility=visibility)

    # Filter by country
    country = request.query_params.get('country')
    if country:
        candidates = candidates.filter(
            Q(country__icontains=country) | Q(country_rel__name__icontains=country)
        )

    # Filter by city
    city = request.query_params.get('city')
    if city:
        candidates = candidates.filter(
            Q(city__icontains=city) | Q(city_rel__name__icontains=city)
        )

    # Filter by industries
    industries = request.query_params.get('industries')
    if industries:
        industry_ids = [int(i) for i in industries.split(',') if i.isdigit()]
        if industry_ids:
            candidates = candidates.filter(industries__id__in=industry_ids).distinct()

    # Filter by years of experience
    min_experience = request.query_params.get('min_experience')
    if min_experience:
        candidates = candidates.filter(years_of_experience__gte=int(min_experience))

    max_experience = request.query_params.get('max_experience')
    if max_experience:
        candidates = candidates.filter(years_of_experience__lte=int(max_experience))

    # Filter by profile completeness
    min_completeness = request.query_params.get('min_completeness')
    if min_completeness:
        candidates = candidates.filter(profile_completeness__gte=int(min_completeness))

    # Filter by salary expectations
    min_salary = request.query_params.get('min_salary')
    if min_salary:
        candidates = candidates.filter(salary_expectation_min__gte=int(min_salary))

    max_salary = request.query_params.get('max_salary')
    if max_salary:
        candidates = candidates.filter(salary_expectation_max__lte=int(max_salary))

    salary_currency = request.query_params.get('salary_currency')
    if salary_currency:
        candidates = candidates.filter(salary_currency=salary_currency.upper())

    # Filter by notice period
    notice_period_min = request.query_params.get('notice_period_min')
    if notice_period_min:
        candidates = candidates.filter(notice_period_days__gte=int(notice_period_min))

    notice_period_max = request.query_params.get('notice_period_max')
    if notice_period_max:
        candidates = candidates.filter(notice_period_days__lte=int(notice_period_max))

    # Filter by created date range
    created_after = request.query_params.get('created_after')
    if created_after:
        candidates = candidates.filter(created_at__gte=created_after)

    created_before = request.query_params.get('created_before')
    if created_before:
        candidates = candidates.filter(created_at__lte=created_before)

    # Filter by willingness to relocate
    willing_to_relocate = request.query_params.get('willing_to_relocate')
    if willing_to_relocate is not None:
        if willing_to_relocate.lower() == 'true':
            candidates = candidates.filter(willing_to_relocate=True)
        elif willing_to_relocate.lower() == 'false':
            candidates = candidates.filter(willing_to_relocate=False)

    # Filter by resume presence
    has_resume = request.query_params.get('has_resume')
    if has_resume is not None:
        if has_resume.lower() == 'true':
            candidates = candidates.exclude(Q(resume_url__isnull=True) | Q(resume_url=''))
        elif has_resume.lower() == 'false':
            candidates = candidates.filter(Q(resume_url__isnull=True) | Q(resume_url=''))

    # Search
    search = request.query_params.get('search')
    if search:
        candidates = candidates.filter(
            Q(user__first_name__icontains=search) |
            Q(user__last_name__icontains=search) |
            Q(user__email__icontains=search) |
            Q(professional_title__icontains=search) |
            Q(headline__icontains=search)
        ).distinct()

    # Ordering
    ordering = request.query_params.get('ordering', '-created_at')
    valid_orderings = [
        'created_at', '-created_at',
        'updated_at', '-updated_at',
        'profile_completeness', '-profile_completeness',
        'years_of_experience', '-years_of_experience',
        'user__first_name', '-user__first_name',
        'professional_title', '-professional_title',
        'headline', '-headline',
        'seniority', '-seniority',
        'city', '-city',
        'work_preference', '-work_preference',
        'willing_to_relocate', '-willing_to_relocate',
        'notice_period_days', '-notice_period_days',
        'has_resume', '-has_resume',
        'visibility', '-visibility',
    ]
    if ordering in valid_orderings:
        candidates = candidates.order_by(ordering)
    else:
        candidates = candidates.order_by('-created_at')

    return candidates


@extend_schema(
    tags=['Candidates'],
    parameters=[
        OpenApiParameter(name='seniority', description='Filter by seniority level', required=False, type=str),
        OpenApiParameter(name='work_preference', description='Filter by work preference', required=False, type=str),
        OpenApiParameter(name='visibility', description='Filter by profile visibility', required=False, type=str),
        OpenApiParameter(name='search', description='Search in name, title, headline', required=False, type=str),
    ],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_candidates_csv(request):
    """
    Export filtered candidates to CSV format.
    Uses streaming response for large datasets.
    """
    # Check if user is admin or recruiter
    if request.user.role not in [UserRole.ADMIN, UserRole.RECRUITER]:
        from rest_framework.response import Response
        from rest_framework import status
        return Response(
            {'error': 'Permission denied. Admin or Recruiter access required.'},
            status=status.HTTP_403_FORBIDDEN
        )

    candidates = get_filtered_candidates(request)

    # Define headers
    headers = [
        'ID',
        'Slug',
        'Full Name',
        'Email',
        'Phone',
        'Professional Title',
        'Headline',
        'Seniority',
        'Years of Experience',
        'City',
        'Country',
        'Location',
        'Work Preference',
        'Willing to Relocate',
        'Preferred Locations',
        'Salary Min',
        'Salary Max',
        'Salary Currency',
        'Notice Period (Days)',
        'Has Resume',
        'Industries',
        'Experience Count',
        'Experience Summary',
        'Education Count',
        'Education Summary',
        'Profile Completeness',
        'Visibility',
        'Created At',
        'Updated At',
    ]

    def generate_rows():
        # Yield header row
        pseudo_buffer = Echo()
        writer = csv.writer(pseudo_buffer)
        yield writer.writerow(headers)

        # Yield data rows
        for candidate in candidates.iterator():
            # Build location
            location_parts = []
            if candidate.city:
                location_parts.append(candidate.city)
            elif candidate.city_rel:
                location_parts.append(candidate.city_rel.name)
            if candidate.country:
                location_parts.append(candidate.country)
            elif candidate.country_rel:
                location_parts.append(candidate.country_rel.name)
            location = ', '.join(location_parts)

            # Get industries
            industries = ', '.join([i.name for i in candidate.industries.all()])

            # Get preferred locations
            preferred_locs = ', '.join(candidate.preferred_locations or [])

            # Get experience summary
            experiences = list(candidate.experiences.all())
            exp_count = len(experiences)
            exp_summary = '; '.join([
                f"{exp.job_title} at {exp.company_name}" + (" (Current)" if exp.is_current else "")
                for exp in experiences[:3]  # Limit to 3 for readability
            ])
            if exp_count > 3:
                exp_summary += f"; +{exp_count - 3} more"

            # Get education summary
            educations = list(candidate.education.all())
            edu_count = len(educations)
            edu_summary = '; '.join([
                f"{edu.degree} in {edu.field_of_study} at {edu.institution}" if edu.field_of_study else f"{edu.degree} at {edu.institution}"
                for edu in educations[:3]  # Limit to 3 for readability
            ])
            if edu_count > 3:
                edu_summary += f"; +{edu_count - 3} more"

            row = [
                candidate.id,
                candidate.slug,
                f"{candidate.user.first_name} {candidate.user.last_name}".strip(),
                candidate.user.email,
                candidate.user.phone or '',
                candidate.professional_title or '',
                candidate.headline or '',
                candidate.seniority or '',
                candidate.years_of_experience if candidate.years_of_experience is not None else '',
                candidate.city or (candidate.city_rel.name if candidate.city_rel else ''),
                candidate.country or (candidate.country_rel.name if candidate.country_rel else ''),
                location,
                candidate.work_preference or '',
                'Yes' if candidate.willing_to_relocate else 'No',
                preferred_locs,
                candidate.salary_expectation_min if candidate.salary_expectation_min is not None else '',
                candidate.salary_expectation_max if candidate.salary_expectation_max is not None else '',
                candidate.salary_currency or '',
                candidate.notice_period_days if candidate.notice_period_days is not None else '',
                'Yes' if candidate.resume_url else 'No',
                industries,
                exp_count,
                exp_summary,
                edu_count,
                edu_summary,
                candidate.profile_completeness,
                candidate.visibility,
                candidate.created_at.strftime('%Y-%m-%d %H:%M:%S') if candidate.created_at else '',
                candidate.updated_at.strftime('%Y-%m-%d %H:%M:%S') if candidate.updated_at else '',
            ]
            yield writer.writerow(row)

    response = StreamingHttpResponse(
        generate_rows(),
        content_type='text/csv'
    )
    response['Content-Disposition'] = 'attachment; filename="candidates_export.csv"'
    return response
