from django.urls import path
from .views import ResumeParseView, ResumeImportView

urlpatterns = [
    path('parse/', ResumeParseView.as_view(), name='resume-parse'),
    path('import/', ResumeImportView.as_view(), name='resume-import'),
]
