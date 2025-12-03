from django.urls import path
from . import views

urlpatterns = [
    # Skills
    path('skills/', views.list_skills, name='list-skills'),

    # Industries
    path('industries/', views.list_industries, name='list-industries'),

    # Technologies
    path('technologies/', views.list_technologies, name='list-technologies'),

    # Candidate profile - own profile
    path('candidates/me/', views.get_my_profile, name='get-my-profile'),
    path('candidates/me/update/', views.update_my_profile, name='update-my-profile'),

    # Candidate profiles - public
    path('candidates/', views.list_candidates, name='list-candidates'),
    path('candidates/all/', views.list_all_candidates, name='list-all-candidates'),
    path('candidates/<slug:slug>/', views.get_candidate, name='get-candidate'),

    # Experience - CRUD for authenticated candidates
    path('candidates/me/experiences/', views.list_experiences, name='list-experiences'),
    path('candidates/me/experiences/create/', views.create_experience, name='create-experience'),
    path('candidates/me/experiences/<uuid:experience_id>/', views.update_experience, name='update-experience'),
    path('candidates/me/experiences/<uuid:experience_id>/delete/', views.delete_experience, name='delete-experience'),
    path('candidates/me/experiences/reorder/', views.reorder_experiences, name='reorder-experiences'),

    # Education - CRUD for authenticated candidates
    path('candidates/me/education/', views.list_education, name='list-education'),
    path('candidates/me/education/create/', views.create_education, name='create-education'),
    path('candidates/me/education/<uuid:education_id>/', views.update_education, name='update-education'),
    path('candidates/me/education/<uuid:education_id>/delete/', views.delete_education, name='delete-education'),
    path('candidates/me/education/reorder/', views.reorder_education, name='reorder-education'),

    # Admin Experience - CRUD for admin/recruiter editing any candidate
    path('candidates/<slug:slug>/experiences/', views.list_experiences, name='admin-list-experiences'),
    path('candidates/<slug:slug>/experiences/create/', views.create_experience, name='admin-create-experience'),
    path('candidates/<slug:slug>/experiences/<uuid:experience_id>/', views.update_experience, name='admin-update-experience'),
    path('candidates/<slug:slug>/experiences/<uuid:experience_id>/delete/', views.delete_experience, name='admin-delete-experience'),
    path('candidates/<slug:slug>/experiences/reorder/', views.reorder_experiences, name='admin-reorder-experiences'),

    # Admin Education - CRUD for admin/recruiter editing any candidate
    path('candidates/<slug:slug>/education/', views.list_education, name='admin-list-education'),
    path('candidates/<slug:slug>/education/create/', views.create_education, name='admin-create-education'),
    path('candidates/<slug:slug>/education/<uuid:education_id>/', views.update_education, name='admin-update-education'),
    path('candidates/<slug:slug>/education/<uuid:education_id>/delete/', views.delete_education, name='admin-delete-education'),
    path('candidates/<slug:slug>/education/reorder/', views.reorder_education, name='admin-reorder-education'),
]
