"""Utility functions for subscription and feature management."""


def company_has_feature(company, feature_slug):
    """
    Check if a company has access to a specific feature.

    This respects the feature gating system:
    1. Check if the PricingFeature exists and is active
    2. Check service type default (included_in_headhunting or included_in_retained)
    3. Apply company-specific override if one exists

    Args:
        company: Company instance
        feature_slug: Slug of the feature (e.g., 'talent-directory')

    Returns:
        bool: True if the company has access to the feature
    """
    if not company or not company.service_type:
        return False

    from cms.models.pricing import PricingFeature
    from subscriptions.models import CompanyFeatureOverride

    # Get the feature by slug
    try:
        feature = PricingFeature.objects.get(slug=feature_slug, is_active=True)
    except PricingFeature.DoesNotExist:
        return False

    # Check for company-specific override first
    try:
        override = CompanyFeatureOverride.objects.get(company=company, feature=feature)
        return override.is_enabled
    except CompanyFeatureOverride.DoesNotExist:
        pass

    # Fall back to service type default
    if company.service_type == 'headhunting':
        return feature.included_in_headhunting
    elif company.service_type == 'retained':
        return feature.included_in_retained

    return False


def user_has_feature(user, feature_slug):
    """
    Check if a user's company has access to a specific feature.

    Args:
        user: User instance
        feature_slug: Slug of the feature (e.g., 'talent-directory')

    Returns:
        bool: True if the user's company has access to the feature
    """
    from companies.models import CompanyUser

    # Get user's company
    membership = CompanyUser.objects.filter(user=user, is_active=True).select_related('company').first()
    if not membership:
        return False

    return company_has_feature(membership.company, feature_slug)
