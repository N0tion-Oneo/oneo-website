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
]
