from django.urls import path
from . import views

app_name = 'authentication'

urlpatterns = [
    # Registration & Authentication
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('refresh/', views.token_refresh, name='token_refresh'),

    # User Profile
    path('me/', views.me, name='me'),
    path('me/update/', views.update_profile, name='update_profile'),
    path('me/change-password/', views.change_password, name='change_password'),

    # Email Verification (stub)
    path('verify-email/', views.verify_email, name='verify_email'),

    # Password Reset (stub)
    path('forgot-password/', views.forgot_password, name='forgot_password'),
    path('reset-password/', views.reset_password, name='reset_password'),

    # Client Invitations
    path('invitations/', views.list_invitations, name='list_invitations'),
    path('invitations/create/', views.create_client_invitation, name='create_invitation'),
    path('invitations/<uuid:token>/validate/', views.validate_invitation, name='validate_invitation'),
    path('invitations/<uuid:token>/signup/', views.signup_with_invitation, name='signup_with_invitation'),

    # Company Team Invitations
    path('company-invitations/<uuid:token>/validate/', views.validate_company_invitation, name='validate_company_invitation'),
    path('company-invitations/<uuid:token>/signup/', views.signup_with_company_invitation, name='signup_with_company_invitation'),

    # Recruiter Invitations (Admin only)
    path('recruiter-invitations/', views.list_recruiter_invitations, name='list_recruiter_invitations'),
    path('recruiter-invitations/create/', views.create_recruiter_invitation, name='create_recruiter_invitation'),
    path('recruiter-invitations/<uuid:token>/validate/', views.validate_recruiter_invitation, name='validate_recruiter_invitation'),
    path('recruiter-invitations/<uuid:token>/signup/', views.signup_with_recruiter_invitation, name='signup_with_recruiter_invitation'),

    # Candidate Invitations (auto-created from bookings)
    path('candidate-invitations/', views.list_candidate_invitations, name='list_candidate_invitations'),
    path('candidate-invitations/<uuid:token>/validate/', views.validate_candidate_invitation, name='validate_candidate_invitation'),
    path('candidate-invitations/<uuid:token>/signup/', views.signup_with_candidate_invitation, name='signup_with_candidate_invitation'),
    path('candidate-invitations/<uuid:token>/resend/', views.resend_candidate_invitation, name='resend_candidate_invitation'),
    path('candidate-invitations/<uuid:token>/delete/', views.delete_candidate_invitation, name='delete_candidate_invitation'),
]
