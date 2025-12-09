from django.urls import path
from . import views

urlpatterns = [
    # Onboarding stages CRUD
    path('onboarding-stages/', views.list_onboarding_stages, name='list_onboarding_stages'),
    path('onboarding-stages/create/', views.create_onboarding_stage, name='create_onboarding_stage'),
    path('onboarding-stages/<int:stage_id>/', views.update_onboarding_stage, name='update_onboarding_stage'),
    path('onboarding-stages/<int:stage_id>/delete/', views.delete_onboarding_stage, name='delete_onboarding_stage'),
    path('onboarding-stages/reorder/', views.reorder_onboarding_stages, name='reorder_onboarding_stages'),

    # Onboarding history
    path('onboarding-history/<str:entity_type>/<int:entity_id>/', views.get_onboarding_history, name='get_onboarding_history'),
]
