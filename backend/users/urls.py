from django.urls import path
from . import views

urlpatterns = [
    # Staff users (for assignment dropdowns)
    path('staff/', views.list_staff_users, name='list_staff_users'),
    path('staff/profiles/', views.list_staff_with_profiles, name='list_staff_with_profiles'),
    path('staff/<int:user_id>/', views.update_staff_user, name='update_staff_user'),
    path('staff/<int:user_id>/profile/', views.admin_update_recruiter_profile, name='admin_update_recruiter_profile'),
    path('staff/<int:user_id>/deactivate/', views.deactivate_staff_user, name='deactivate_staff_user'),
    path('staff/<int:user_id>/reactivate/', views.reactivate_staff_user, name='reactivate_staff_user'),

    # Recruiter profile endpoints
    path('recruiter/profile/', views.get_my_recruiter_profile, name='my_recruiter_profile'),
    path('recruiter/profile/update/', views.update_my_recruiter_profile, name='update_recruiter_profile'),
    path('recruiters/<int:user_id>/', views.get_recruiter_profile, name='get_recruiter_profile'),
]
