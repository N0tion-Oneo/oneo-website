from django.urls import path, include
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('hello/', views.hello_world, name='hello_world'),

    # Authentication endpoints
    path('auth/', include('authentication.urls')),

    # Candidates endpoints (skills, industries, profiles)
    path('', include('candidates.urls')),

    # Companies endpoints
    path('companies/', include('companies.urls')),

    # Jobs endpoints
    path('jobs/', include('jobs.urls')),

    # Scheduling endpoints (calendar integration)
    path('scheduling/', include('scheduling.urls')),
]
