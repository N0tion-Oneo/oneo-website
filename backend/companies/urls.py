from django.urls import path
from . import views

urlpatterns = [
    # Public company endpoints
    path('', views.list_companies, name='list-companies'),

    # Create company (must come before slug pattern)
    path('create/', views.create_company, name='create-company'),

    # Lead management (admin/recruiter only)
    path('leads/', views.list_leads, name='list-leads'),
    path('leads/create/', views.create_lead, name='create-lead'),
    path('leads/<uuid:lead_id>/', views.get_lead, name='get-lead'),
    path('leads/<uuid:lead_id>/update/', views.update_lead, name='update-lead'),
    path('leads/<uuid:lead_id>/delete/', views.delete_lead, name='delete-lead'),
    path('leads/<uuid:lead_id>/stage/', views.update_lead_stage, name='update-lead-stage'),
    path('leads/<uuid:lead_id>/activities/', views.lead_activities, name='lead-activities'),

    # Client onboarding wizard endpoints
    path('onboarding/status/', views.get_onboarding_status, name='onboarding-status'),
    path('onboarding/step/<str:step>/', views.complete_onboarding_step, name='complete-onboarding-step'),
    path('onboarding/skip/<str:step>/', views.skip_onboarding_step, name='skip-onboarding-step'),

    # My company endpoints
    path('my/', views.get_my_company, name='get-my-company'),
    path('my/update/', views.update_my_company, name='update-my-company'),
    path('my/features/', views.get_company_features, name='get-company-features'),

    # Company users management
    path('my/users/', views.list_company_users, name='list-company-users'),
    path('my/users/invite/', views.invite_company_user, name='invite-company-user'),
    path('my/users/<uuid:user_id>/', views.update_company_user, name='update-company-user'),
    path('my/users/<uuid:user_id>/remove/', views.remove_company_user, name='remove-company-user'),

    # Company invitations management
    path('my/invitations/', views.list_company_invitations, name='list-company-invitations'),
    path('my/invitations/<uuid:invitation_id>/cancel/', views.cancel_company_invitation, name='cancel-company-invitation'),

    # Question templates
    path('my/question-templates/', views.list_create_question_templates, name='list-create-question-templates'),
    path('my/question-templates/<uuid:template_id>/', views.question_template_detail, name='question-template-detail'),

    # Shortlist screening templates
    path('my/shortlist-templates/', views.list_create_shortlist_templates, name='list-create-shortlist-templates'),
    path('my/shortlist-templates/<uuid:template_id>/', views.shortlist_template_detail, name='shortlist-template-detail'),

    # Location endpoints
    path('countries/', views.list_countries, name='list-countries'),
    path('cities/', views.list_cities, name='list-cities'),
    path('countries/<int:country_id>/cities/', views.list_cities, name='list-cities-by-country'),

    # Admin/Recruiter endpoints (access to ALL companies)
    path('all/', views.list_all_companies, name='list-all-companies'),
    path('<uuid:company_id>/detail/', views.company_detail_by_id, name='company-detail-by-id'),

    # Company detail (slug pattern at the end to avoid conflicts)
    path('<slug:slug>/', views.get_company, name='get-company'),
]
