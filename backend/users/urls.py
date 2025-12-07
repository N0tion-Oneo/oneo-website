from django.urls import path
from . import views

urlpatterns = [
    # Recruiter profile endpoints
    path('recruiter/profile/', views.get_my_recruiter_profile, name='my_recruiter_profile'),
    path('recruiter/profile/update/', views.update_my_recruiter_profile, name='update_recruiter_profile'),
    path('recruiters/<int:user_id>/', views.get_recruiter_profile, name='get_recruiter_profile'),
]
