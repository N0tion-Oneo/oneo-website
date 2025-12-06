from django.urls import path
from . import views
from . import export_views

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
    path('candidates/export/csv/', export_views.export_candidates_csv, name='export-candidates-csv'),
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

    # Admin Skills Management
    path('admin/skills/', views.admin_list_skills, name='admin-list-skills'),
    path('admin/skills/create/', views.admin_create_skill, name='admin-create-skill'),
    path('admin/skills/<int:skill_id>/', views.admin_update_skill, name='admin-update-skill'),
    path('admin/skills/<int:skill_id>/delete/', views.admin_delete_skill, name='admin-delete-skill'),
    path('admin/skills/<int:skill_id>/merge/', views.admin_merge_skill, name='admin-merge-skill'),

    # Admin Technologies Management
    path('admin/technologies/', views.admin_list_technologies, name='admin-list-technologies'),
    path('admin/technologies/create/', views.admin_create_technology, name='admin-create-technology'),
    path('admin/technologies/<int:technology_id>/', views.admin_update_technology, name='admin-update-technology'),
    path('admin/technologies/<int:technology_id>/delete/', views.admin_delete_technology, name='admin-delete-technology'),
    path('admin/technologies/<int:technology_id>/merge/', views.admin_merge_technology, name='admin-merge-technology'),

    # Candidate Activity (Admin)
    path('admin/candidates/<int:candidate_id>/activity/', views.candidate_activity, name='candidate-activity'),
    path('admin/candidates/<int:candidate_id>/activity/<uuid:activity_id>/notes/', views.add_candidate_activity_note, name='add-candidate-activity-note'),
    path('admin/candidates/<int:candidate_id>/view/', views.record_profile_view, name='record-profile-view'),

    # Profile Suggestions (Admin)
    path('admin/candidates/<int:candidate_id>/suggestions/', views.admin_list_suggestions, name='admin-list-suggestions'),
    path('admin/candidates/<int:candidate_id>/suggestions/create/', views.admin_create_suggestion, name='admin-create-suggestion'),
    path('admin/candidates/<int:candidate_id>/suggestions/<uuid:suggestion_id>/reopen/', views.admin_reopen_suggestion, name='admin-reopen-suggestion'),
    path('admin/candidates/<int:candidate_id>/suggestions/<uuid:suggestion_id>/close/', views.admin_close_suggestion, name='admin-close-suggestion'),

    # Profile Suggestions (Candidate)
    path('candidates/me/suggestions/', views.candidate_list_suggestions, name='candidate-list-suggestions'),
    path('candidates/me/suggestions/<uuid:suggestion_id>/resolve/', views.candidate_resolve_suggestion, name='candidate-resolve-suggestion'),
    path('candidates/me/suggestions/<uuid:suggestion_id>/decline/', views.candidate_decline_suggestion, name='candidate-decline-suggestion'),
]
