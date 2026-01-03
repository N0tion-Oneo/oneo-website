from django.urls import path
from . import views

app_name = 'bottlenecks'

urlpatterns = [
    # Bottleneck Rules CRUD
    path('rules/', views.rule_list_create, name='rule-list'),
    path('rules/run-all/', views.run_all_rules, name='run-all-rules'),
    path('rules/preview/', views.rule_preview_adhoc, name='rule-preview-adhoc'),
    path('rules/<uuid:rule_id>/', views.rule_detail, name='rule-detail'),
    path('rules/<uuid:rule_id>/quick-update/', views.rule_quick_update, name='rule-quick-update'),
    path('rules/<uuid:rule_id>/run/', views.rule_run, name='rule-run'),
    path('rules/<uuid:rule_id>/preview/', views.rule_preview, name='rule-preview'),
    path('rules/<uuid:rule_id>/executions/', views.rule_executions, name='rule-executions'),

    # Rules by entity type (for analytics quick-edit)
    path('rules/entity/<str:entity_type>/', views.rules_by_entity_type, name='rules-by-entity'),

    # Executions
    path('executions/', views.recent_executions, name='recent-executions'),
    path('executions/<uuid:execution_id>/', views.execution_detail, name='execution-detail'),
    path('executions/<uuid:execution_id>/compare/', views.execution_compare, name='execution-compare'),

    # Detections
    path('detections/', views.detection_list, name='detection-list'),
    path('detections/<uuid:detection_id>/resolve/', views.detection_resolve, name='detection-resolve'),

    # Analytics
    path('analytics/summary/', views.analytics_summary, name='analytics-summary'),

    # Model introspection for rule builder
    path('models/', views.available_models, name='available-models'),
    path('models/<str:entity_type>/fields/', views.model_fields, name='model-fields'),
    path('models/<str:entity_type>/stages/', views.available_stages, name='available-stages'),
]
