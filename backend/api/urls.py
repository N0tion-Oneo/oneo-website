from django.urls import path, include
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('hello/', views.hello_world, name='hello_world'),

    # Authentication endpoints
    path('auth/', include('authentication.urls')),

    # Candidates endpoints (skills, industries, profiles)
    path('', include('candidates.urls')),
]
