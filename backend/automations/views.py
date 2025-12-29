"""
API Views for Automations.
"""

import time
import hashlib
import hmac
from django.utils import timezone
from django.core.cache import cache
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from api.permissions import IsAdmin
from .models import (
    Workflow,
    WebhookEndpoint,
    WebhookDelivery,
    WebhookReceipt,
    WorkflowExecution,
)
from .models import AutomationRule
from .serializers import (
    WorkflowSerializer,
    WorkflowListSerializer,
    AutomationRuleSerializer,
    AutomationRuleListSerializer,
    AutomationRuleCreateSerializer,
    WebhookDeliverySerializer,
    WebhookReceiptSerializer,
    WorkflowExecutionSerializer,
    AutomatableModelSerializer,
    WebhookEndpointSerializer,
    WebhookEndpointListSerializer,
    WebhookEndpointCreateSerializer,
)
from .registry import AutomatableModelRegistry


# =============================================================================
# Workflow CRUD
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def list_workflows(request):
    """List all workflows."""
    workflows = Workflow.objects.all()

    # Optional filters
    is_active = request.query_params.get('is_active')
    if is_active is not None:
        workflows = workflows.filter(is_active=is_active.lower() == 'true')

    search = request.query_params.get('search')
    if search:
        workflows = workflows.filter(name__icontains=search)

    serializer = WorkflowListSerializer(workflows, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def create_workflow(request):
    """Create a new workflow."""
    serializer = WorkflowSerializer(data=request.data)
    if serializer.is_valid():
        workflow = serializer.save(created_by=request.user)
        # Process nodes to create WebhookEndpoints and AutomationRules
        _process_workflow_nodes(workflow)
        return Response(WorkflowSerializer(workflow).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def get_workflow(request, workflow_id):
    """Get a single workflow."""
    try:
        workflow = Workflow.objects.get(id=workflow_id)
    except Workflow.DoesNotExist:
        return Response({'error': 'Workflow not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = WorkflowSerializer(workflow)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdmin])
def update_workflow(request, workflow_id):
    """Update a workflow."""
    try:
        workflow = Workflow.objects.get(id=workflow_id)
    except Workflow.DoesNotExist:
        return Response({'error': 'Workflow not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = WorkflowSerializer(workflow, data=request.data, partial=True)
    if serializer.is_valid():
        workflow = serializer.save()
        # Re-process nodes if they were updated
        if 'nodes' in request.data or 'edges' in request.data:
            _process_workflow_nodes(workflow)
        return Response(WorkflowSerializer(workflow).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def delete_workflow(request, workflow_id):
    """Delete a workflow."""
    try:
        workflow = Workflow.objects.get(id=workflow_id)
    except Workflow.DoesNotExist:
        return Response({'error': 'Workflow not found'}, status=status.HTTP_404_NOT_FOUND)

    workflow.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def toggle_workflow(request, workflow_id):
    """Toggle workflow active status."""
    try:
        workflow = Workflow.objects.get(id=workflow_id)
    except Workflow.DoesNotExist:
        return Response({'error': 'Workflow not found'}, status=status.HTTP_404_NOT_FOUND)

    workflow.is_active = not workflow.is_active
    workflow.save(update_fields=['is_active', 'updated_at'])
    return Response({'is_active': workflow.is_active})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def test_workflow(request, workflow_id):
    """Test a workflow with sample data."""
    try:
        workflow = Workflow.objects.get(id=workflow_id)
    except Workflow.DoesNotExist:
        return Response({'error': 'Workflow not found'}, status=status.HTTP_404_NOT_FOUND)

    # Create a test execution
    execution = WorkflowExecution.objects.create(
        workflow=workflow,
        trigger_type='test',
        trigger_data=request.data.get('test_data', {}),
        is_test=True,
        triggered_by=request.user,
    )

    # TODO: Actually execute the workflow nodes
    # For now, just mark as success
    execution.status = WorkflowExecution.Status.SUCCESS
    execution.completed_at = timezone.now()
    execution.save()

    return Response(WorkflowExecutionSerializer(execution).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def workflow_executions(request, workflow_id):
    """List executions for a workflow."""
    try:
        workflow = Workflow.objects.get(id=workflow_id)
    except Workflow.DoesNotExist:
        return Response({'error': 'Workflow not found'}, status=status.HTTP_404_NOT_FOUND)

    executions = WorkflowExecution.objects.filter(workflow=workflow)[:100]
    serializer = WorkflowExecutionSerializer(executions, many=True)
    return Response(serializer.data)


# =============================================================================
# Inbound Webhook Receiver
# =============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def receive_webhook(request, slug):
    """
    Receive data from external webhook.

    This is the public endpoint that external systems call to send data.
    """
    start_time = time.time()

    try:
        endpoint = WebhookEndpoint.objects.get(slug=slug, is_active=True)
    except WebhookEndpoint.DoesNotExist:
        return Response({'error': 'Endpoint not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check rate limit
    if _is_rate_limited(endpoint, request):
        WebhookReceipt.objects.create(
            endpoint=endpoint,
            headers=dict(request.headers),
            payload=request.data,
            ip_address=_get_client_ip(request),
            status=WebhookReceipt.Status.RATE_LIMITED,
        )
        return Response({'error': 'Rate limit exceeded'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    # Verify authentication
    if not _verify_webhook_auth(endpoint, request):
        WebhookReceipt.objects.create(
            endpoint=endpoint,
            headers=dict(request.headers),
            payload=request.data,
            ip_address=_get_client_ip(request),
            status=WebhookReceipt.Status.INVALID_AUTH,
        )
        return Response({'error': 'Invalid authentication'}, status=status.HTTP_401_UNAUTHORIZED)

    # Process webhook
    result = _process_inbound_webhook(endpoint, request.data)

    processing_time = int((time.time() - start_time) * 1000)

    # Log receipt
    WebhookReceipt.objects.create(
        endpoint=endpoint,
        headers=dict(request.headers),
        payload=request.data,
        ip_address=_get_client_ip(request),
        status=result['status'],
        error_message=result.get('error', ''),
        created_object_id=result.get('object_id', ''),
        processing_time_ms=processing_time,
    )

    # Update endpoint stats
    endpoint.last_received_at = timezone.now()
    endpoint.total_received += 1
    if result['status'] == 'success':
        endpoint.total_success += 1
    else:
        endpoint.total_failed += 1
    endpoint.save(update_fields=['last_received_at', 'total_received', 'total_success', 'total_failed'])

    return Response(result, status=status.HTTP_201_CREATED if result['status'] == 'success' else status.HTTP_400_BAD_REQUEST)


# =============================================================================
# Metadata Endpoints
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def list_automatable_models(request):
    """List all models that can be used in automations."""
    models = []
    for key, config in AutomatableModelRegistry.get_all().items():
        models.append({
            'key': key,
            'display_name': config['display_name'],
            'fields': config['fields'],
            'events': config['events'],
            'status_field': config.get('status_field'),
        })
    return Response(models)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def get_model_fields(request, model_key):
    """Get fields for a specific model."""
    config = AutomatableModelRegistry.get_by_key(model_key)
    if not config:
        return Response({'error': 'Model not found'}, status=status.HTTP_404_NOT_FOUND)

    model_class = config['model']
    fields = []

    for field in model_class._meta.get_fields():
        if hasattr(field, 'name') and not field.name.startswith('_'):
            field_info = {
                'name': field.name,
                'type': field.__class__.__name__,
                'required': not getattr(field, 'blank', True) and not getattr(field, 'null', True),
            }
            # Add choices if available
            if hasattr(field, 'choices') and field.choices:
                field_info['choices'] = [
                    {'value': c[0], 'label': c[1]} for c in field.choices
                ]
            fields.append(field_info)

    return Response({
        'key': model_key,
        'display_name': config['display_name'],
        'fields': fields,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def list_automation_templates(request):
    """
    List notification templates available for automation rules.
    Returns only active templates that can be selected when configuring
    a send_notification action.
    """
    from notifications.models import NotificationTemplate

    templates = NotificationTemplate.objects.filter(is_active=True).order_by('name')

    return Response([{
        'id': str(t.id),
        'name': t.name,
        'description': t.description,
        'template_type': t.template_type,
        'template_type_display': t.get_template_type_display() if t.template_type else 'Custom',
        'recipient_type': t.recipient_type,
        'recipient_type_display': t.get_recipient_type_display(),
        'default_channel': t.default_channel,
        'default_channel_display': t.get_default_channel_display(),
        'title_template': t.title_template,
        'body_template': t.body_template[:200] + '...' if len(t.body_template) > 200 else t.body_template,
        'is_custom': t.is_custom,
    } for t in templates])


# =============================================================================
# Logs Endpoints
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def list_deliveries(request):
    """List webhook deliveries."""
    deliveries = WebhookDelivery.objects.all()

    # Optional filters
    workflow_id = request.query_params.get('workflow')
    if workflow_id:
        deliveries = deliveries.filter(workflow_id=workflow_id)

    status_filter = request.query_params.get('status')
    if status_filter:
        deliveries = deliveries.filter(status=status_filter)

    deliveries = deliveries[:100]
    serializer = WebhookDeliverySerializer(deliveries, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def list_receipts(request):
    """List webhook receipts."""
    receipts = WebhookReceipt.objects.all()

    # Optional filters
    endpoint_id = request.query_params.get('endpoint')
    if endpoint_id:
        receipts = receipts.filter(endpoint_id=endpoint_id)

    status_filter = request.query_params.get('status')
    if status_filter:
        receipts = receipts.filter(status=status_filter)

    receipts = receipts[:100]
    serializer = WebhookReceiptSerializer(receipts, many=True)
    return Response(serializer.data)


# =============================================================================
# Helper Functions
# =============================================================================

def _get_client_ip(request):
    """Get client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


def _is_rate_limited(endpoint, request):
    """Check if the request is rate limited."""
    cache_key = f"webhook_rate:{endpoint.id}:{_get_client_ip(request)}"
    count = cache.get(cache_key, 0)

    if count >= endpoint.rate_limit_per_minute:
        return True

    cache.set(cache_key, count + 1, 60)  # 60 seconds TTL
    return False


def _verify_webhook_auth(endpoint, request):
    """Verify webhook authentication."""
    if endpoint.auth_type == WebhookEndpoint.AuthType.NONE:
        return True

    if endpoint.auth_type == WebhookEndpoint.AuthType.API_KEY:
        # Check X-API-Key header or api_key query param
        api_key = request.headers.get('X-API-Key') or request.query_params.get('api_key')
        return api_key == endpoint.api_key

    if endpoint.auth_type == WebhookEndpoint.AuthType.HMAC:
        # Verify HMAC signature
        from .encryption import decrypt_value
        secret = decrypt_value(endpoint.hmac_secret_encrypted)
        if not secret:
            return False

        signature = request.headers.get('X-Signature') or request.headers.get('X-Hub-Signature-256')
        if not signature:
            return False

        # Calculate expected signature
        import json
        body = json.dumps(request.data, separators=(',', ':')).encode()
        expected = 'sha256=' + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature, expected)

    return False


def _process_inbound_webhook(endpoint, payload):
    """Process an inbound webhook and create/update records."""
    from django.contrib.contenttypes.models import ContentType

    try:
        model_class = endpoint.target_content_type.model_class()

        # Map fields from payload to model fields
        data = {}
        for external_field, internal_field in endpoint.field_mapping.items():
            if external_field in payload:
                data[internal_field] = payload[external_field]

        # Apply default values
        for field, value in endpoint.default_values.items():
            if field not in data:
                data[field] = value

        # Handle deduplication
        if endpoint.dedupe_field and endpoint.dedupe_field in data:
            existing = model_class.objects.filter(**{endpoint.dedupe_field: data[endpoint.dedupe_field]}).first()
            if existing:
                if endpoint.target_action == WebhookEndpoint.TargetAction.CREATE:
                    return {'status': 'failed', 'error': 'Duplicate record exists'}
                elif endpoint.target_action in [WebhookEndpoint.TargetAction.UPDATE, WebhookEndpoint.TargetAction.UPSERT]:
                    for field, value in data.items():
                        setattr(existing, field, value)
                    existing.save()
                    return {'status': 'success', 'object_id': str(existing.pk), 'action': 'updated'}

        # Create new record
        instance = model_class.objects.create(**data)
        return {'status': 'success', 'object_id': str(instance.pk), 'action': 'created'}

    except Exception as e:
        return {'status': 'failed', 'error': str(e)}


def _process_workflow_nodes(workflow):
    """
    Process workflow nodes and create corresponding records.

    This parses the React Flow nodes and creates:
    - WebhookEndpoint for 'webhook_receive' trigger nodes
    - AutomationRule for trigger->action connections
    """
    from django.contrib.contenttypes.models import ContentType
    from .models import AutomationRule

    # Clear existing endpoints and rules for this workflow
    workflow.webhook_endpoints.all().delete()
    workflow.automation_rules.all().delete()

    # Process each node
    for node in workflow.nodes:
        node_id = node.get('id')
        node_type = node.get('type')
        node_subtype = node.get('data', {}).get('node_type')
        config = node.get('data', {}).get('config', {})

        if node_type == 'trigger':
            if node_subtype == 'webhook_receive':
                # Create WebhookEndpoint
                ct = ContentType.objects.get(
                    app_label=config.get('model', '').split('.')[0],
                    model=config.get('model', '').split('.')[-1]
                ) if config.get('model') else None

                if ct:
                    from django.utils.text import slugify
                    base_slug = slugify(config.get('name', workflow.name))[:40]
                    slug = base_slug
                    counter = 1
                    while WebhookEndpoint.objects.filter(slug=slug).exists():
                        slug = f"{base_slug}-{counter}"
                        counter += 1

                    WebhookEndpoint.objects.create(
                        workflow=workflow,
                        node_id=node_id,
                        name=config.get('name', workflow.name),
                        slug=slug,
                        auth_type=config.get('auth_type', 'api_key'),
                        target_content_type=ct,
                        target_action=config.get('target_action', 'create'),
                        field_mapping=config.get('field_mapping', {}),
                        default_values=config.get('default_values', {}),
                        dedupe_field=config.get('dedupe_field', ''),
                        is_active=workflow.is_active,
                        created_by=workflow.created_by,
                    )

    # Process edges to create AutomationRules
    for edge in workflow.edges:
        source_id = edge.get('source')
        target_id = edge.get('target')

        source_node = next((n for n in workflow.nodes if n.get('id') == source_id), None)
        target_node = next((n for n in workflow.nodes if n.get('id') == target_id), None)

        if source_node and target_node:
            source_type = source_node.get('type')
            target_type = target_node.get('type')

            if source_type == 'trigger' and target_type == 'action':
                source_config = source_node.get('data', {}).get('config', {})
                target_config = target_node.get('data', {}).get('config', {})
                source_subtype = source_node.get('data', {}).get('node_type')
                target_subtype = target_node.get('data', {}).get('node_type')

                # Skip webhook_receive triggers (handled separately)
                if source_subtype == 'webhook_receive':
                    continue

                # Get trigger content type
                model_key = source_config.get('model', '')
                if not model_key:
                    continue

                try:
                    ct = ContentType.objects.get(
                        app_label=model_key.split('.')[0],
                        model=model_key.split('.')[-1]
                    )
                except ContentType.DoesNotExist:
                    continue

                # Map node types to trigger/action types
                trigger_type_map = {
                    'model_created': AutomationRule.TriggerType.MODEL_CREATED,
                    'model_updated': AutomationRule.TriggerType.MODEL_UPDATED,
                    'stage_changed': AutomationRule.TriggerType.STAGE_CHANGED,
                    'field_changed': AutomationRule.TriggerType.FIELD_CHANGED,
                }
                action_type_map = {
                    'send_webhook': AutomationRule.ActionType.SEND_WEBHOOK,
                    'send_email': AutomationRule.ActionType.SEND_EMAIL,
                    'create_activity': AutomationRule.ActionType.CREATE_ACTIVITY,
                }

                trigger_type = trigger_type_map.get(source_subtype, AutomationRule.TriggerType.MODEL_CREATED)
                action_type = action_type_map.get(target_subtype, AutomationRule.ActionType.SEND_WEBHOOK)

                AutomationRule.objects.create(
                    workflow=workflow,
                    name=f"{workflow.name} - {source_subtype} -> {target_subtype}",
                    trigger_type=trigger_type,
                    trigger_content_type=ct,
                    trigger_conditions=source_config.get('conditions', []),
                    action_type=action_type,
                    action_config=target_config,
                    is_active=workflow.is_active,
                    created_by=workflow.created_by,
                )


# =============================================================================
# Automation Rules CRUD (Standalone rules without React Flow)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def list_automation_rules(request):
    """List all automation rules (standalone, not attached to workflows)."""
    rules = AutomationRule.objects.filter(workflow__isnull=True)

    # Optional filters
    is_active = request.query_params.get('is_active')
    if is_active is not None:
        rules = rules.filter(is_active=is_active.lower() == 'true')

    action_type = request.query_params.get('action_type')
    if action_type:
        rules = rules.filter(action_type=action_type)

    trigger_type = request.query_params.get('trigger_type')
    if trigger_type:
        rules = rules.filter(trigger_type=trigger_type)

    search = request.query_params.get('search')
    if search:
        rules = rules.filter(name__icontains=search)

    serializer = AutomationRuleListSerializer(rules, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def create_automation_rule(request):
    """Create a new standalone automation rule."""
    serializer = AutomationRuleCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        rule = serializer.save()
        return Response(AutomationRuleSerializer(rule).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def get_automation_rule(request, rule_id):
    """Get a single automation rule."""
    try:
        rule = AutomationRule.objects.get(id=rule_id)
    except AutomationRule.DoesNotExist:
        return Response({'error': 'Rule not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = AutomationRuleSerializer(rule)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdmin])
def update_automation_rule(request, rule_id):
    """Update an automation rule."""
    try:
        rule = AutomationRule.objects.get(id=rule_id)
    except AutomationRule.DoesNotExist:
        return Response({'error': 'Rule not found'}, status=status.HTTP_404_NOT_FOUND)

    # Handle trigger_model conversion if provided
    data = request.data.copy()
    if 'trigger_model' in data:
        from django.contrib.contenttypes.models import ContentType
        try:
            app_label, model = data['trigger_model'].split('.')
            ct = ContentType.objects.get(app_label=app_label, model=model)
            data['trigger_content_type'] = ct.id
            del data['trigger_model']
        except (ValueError, ContentType.DoesNotExist):
            return Response({'error': f"Invalid model: {data['trigger_model']}"}, status=status.HTTP_400_BAD_REQUEST)

    serializer = AutomationRuleSerializer(rule, data=data, partial=True)
    if serializer.is_valid():
        rule = serializer.save()
        return Response(AutomationRuleSerializer(rule).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def delete_automation_rule(request, rule_id):
    """Delete an automation rule."""
    try:
        rule = AutomationRule.objects.get(id=rule_id)
    except AutomationRule.DoesNotExist:
        return Response({'error': 'Rule not found'}, status=status.HTTP_404_NOT_FOUND)

    rule.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def toggle_automation_rule(request, rule_id):
    """Toggle automation rule active status."""
    try:
        rule = AutomationRule.objects.get(id=rule_id)
    except AutomationRule.DoesNotExist:
        return Response({'error': 'Rule not found'}, status=status.HTTP_404_NOT_FOUND)

    rule.is_active = not rule.is_active
    rule.save(update_fields=['is_active', 'updated_at'])
    return Response({'is_active': rule.is_active})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def get_sample_records(request, model_key):
    """Get sample records from a model for testing."""
    from .registry import AutomatableModelRegistry

    config = AutomatableModelRegistry.get_by_key(model_key)
    if not config:
        return Response({'error': 'Model not found'}, status=status.HTTP_404_NOT_FOUND)

    model_class = config['model']
    limit = int(request.query_params.get('limit', 10))

    # Get recent records
    records = model_class.objects.all().order_by('-pk')[:limit]

    # Serialize records with basic fields
    result = []
    for record in records:
        record_data = {
            'id': str(record.pk),
            'display': str(record),
            'fields': {}
        }
        # Get field values
        for field_info in config.get('fields', []):
            field_name = field_info['name']
            try:
                value = getattr(record, field_name, None)
                # Handle foreign keys - get the string representation
                if hasattr(value, 'pk'):
                    record_data['fields'][field_name] = {
                        'value': str(value.pk),
                        'display': str(value)
                    }
                else:
                    record_data['fields'][field_name] = {
                        'value': value,
                        'display': str(value) if value is not None else None
                    }
            except Exception:
                record_data['fields'][field_name] = {'value': None, 'display': None}
        result.append(record_data)

    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def test_automation_rule(request, rule_id):
    """Test an automation rule with sample data."""
    import re
    import traceback
    from .registry import AutomatableModelRegistry

    try:
        rule = AutomationRule.objects.get(id=rule_id)
    except AutomationRule.DoesNotExist:
        return Response({'error': 'Rule not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        record_id = request.data.get('record_id')
        dry_run = request.data.get('dry_run', True)

        # Get the model key from ContentType
        ct = rule.trigger_content_type
        model_key = f"{ct.app_label}.{ct.model}"

        # Get the model and record
        config = AutomatableModelRegistry.get_by_key(model_key)
        if not config:
            return Response({'error': f'Trigger model not found: {model_key}'}, status=status.HTTP_400_BAD_REQUEST)

        model_class = config['model']
        record = None
        record_data = {}

        if record_id:
            try:
                record = model_class.objects.get(pk=record_id)
                # Build record data for template rendering
                for field_info in config.get('fields', []):
                    field_name = field_info['name']
                    try:
                        value = getattr(record, field_name, None)
                        if hasattr(value, 'pk'):
                            record_data[field_name] = str(value)
                        else:
                            record_data[field_name] = value
                    except Exception:
                        record_data[field_name] = None
            except model_class.DoesNotExist:
                return Response({'error': 'Record not found'}, status=status.HTTP_404_NOT_FOUND)

        # Generate preview based on action type
        action_config = rule.action_config or {}
        preview = {'action_type': rule.action_type}

        def format_value(value):
            """Format a value for display in templates."""
            if value is None:
                return ''
            if isinstance(value, str):
                return value
            # Handle lists of dicts (serialized related objects)
            if isinstance(value, list):
                if not value:
                    return ''
                if isinstance(value[0], dict):
                    names = []
                    for item in value:
                        if 'name' in item:
                            names.append(item['name'])
                        elif 'title' in item:
                            names.append(item['title'])
                        else:
                            names.append(str(item))
                    return ', '.join(names)
                return ', '.join(str(v) for v in value)
            # Handle dicts
            if isinstance(value, dict):
                if 'name' in value:
                    return value['name']
                if 'title' in value:
                    return value['title']
            return str(value)

        def render_template(template_str, data):
            """Simple template rendering - replace {{field}} with values."""
            if not template_str:
                return template_str
            def replace_var(match):
                var_name = match.group(1)
                value = data.get(var_name, '')
                return format_value(value)
            return re.sub(r'\{\{(\w+)\}\}', replace_var, str(template_str))

        def render_template_obj(obj, data):
            """Recursively render templates in a dict/list structure."""
            if isinstance(obj, str):
                return render_template(obj, data)
            elif isinstance(obj, dict):
                return {k: render_template_obj(v, data) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [render_template_obj(item, data) for item in obj]
            return obj

        if rule.action_type == 'send_webhook':
            preview['url'] = action_config.get('url', '')
            preview['method'] = action_config.get('method', 'POST')
            preview['headers'] = action_config.get('headers', {})
            preview['payload'] = render_template_obj(
                action_config.get('payload_template', {}),
                record_data
            )

        elif rule.action_type == 'send_notification':
            preview['channel'] = action_config.get('channel', 'email')
            preview['recipient_type'] = action_config.get('recipient_type', 'recruiter')

            # Check if using a NotificationTemplate
            if rule.notification_template:
                template = rule.notification_template
                preview['channel'] = action_config.get('channel') or template.default_channel
                preview['recipient_type'] = action_config.get('recipient_type') or template.recipient_type
                preview['using_template'] = True
                preview['template_name'] = template.name

                # Build context using the same method as execution
                from .tasks import _build_template_context
                template_context = _build_template_context(record, {}, record_data)

                # Render the template
                try:
                    rendered = template.render(template_context)
                    preview['title'] = rendered['title']
                    preview['body'] = rendered['body']
                    preview['email_subject'] = rendered.get('email_subject', rendered['title'])
                    preview['email_body'] = rendered.get('email_body', rendered['body'])
                except Exception as e:
                    preview['title'] = f'(Error rendering: {str(e)})'
                    preview['body'] = template.body_template
                    preview['email_subject'] = template.email_subject_template or template.title_template
                    preview['email_body'] = template.email_body_template or template.body_template
            else:
                # Inline template mode - use {{variable}} syntax
                preview['title'] = render_template(
                    action_config.get('title_template', ''),
                    record_data
                )
                preview['body'] = render_template(
                    action_config.get('body_template', ''),
                    record_data
                )

        elif rule.action_type == 'update_field':
            preview['target'] = action_config.get('target', 'self')
            preview['field'] = action_config.get('field', '')
            preview['value_type'] = action_config.get('value_type', 'static')

            value = action_config.get('value', '')
            if action_config.get('value_type') == 'template':
                preview['value'] = render_template(value, record_data)
            elif action_config.get('value_type') == 'copy_field':
                preview['value'] = record_data.get(value, '') if record_data else f'(value of {value})'
            else:
                preview['value'] = value

            if action_config.get('target') == 'related':
                preview['related_model'] = action_config.get('related_model', '')
                preview['relation_field'] = action_config.get('relation_field', '')

        elif rule.action_type == 'create_activity':
            preview['activity_type'] = action_config.get('activity_type', 'note')
            preview['content'] = render_template(
                action_config.get('content_template', ''),
                record_data
            )

        # If not dry run and we have a record, actually execute the action
        executed = False
        execution_result = None

        if not dry_run and record:
            from .tasks import _execute_rule
            from django.contrib.contenttypes.models import ContentType

            try:
                ct = ContentType.objects.get_for_model(record)

                # Build old_values and new_values from record
                old_values = {}
                new_values = record_data.copy()

                # Execute the rule
                execution_result = _execute_rule(
                    rule=rule,
                    content_type=ct,
                    object_id=str(record.pk),
                    old_values=old_values,
                    new_values=new_values,
                )
                executed = True

                # Update rule stats
                rule.last_triggered_at = timezone.now()
                rule.total_executions += 1
                rule.total_success += 1
                rule.save(update_fields=['last_triggered_at', 'total_executions', 'total_success'])

            except Exception as e:
                executed = False
                execution_result = {'error': str(e)}
                rule.total_executions += 1
                rule.total_failed += 1
                rule.save(update_fields=['total_executions', 'total_failed'])

        return Response({
            'status': 'success',
            'rule_id': str(rule.id),
            'rule_name': rule.name,
            'record_id': record_id,
            'record_display': str(record) if record else None,
            'dry_run': dry_run,
            'executed': executed,
            'execution_result': execution_result,
            'preview': preview,
        })
    except Exception as e:
        import traceback
        return Response({
            'status': 'error',
            'error': str(e),
            'traceback': traceback.format_exc(),
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def rule_executions(request, rule_id):
    """List executions for an automation rule."""
    from .models import RuleExecution
    from .serializers import RuleExecutionListSerializer, RuleExecutionSerializer

    try:
        rule = AutomationRule.objects.get(id=rule_id)
    except AutomationRule.DoesNotExist:
        return Response({'error': 'Rule not found'}, status=status.HTTP_404_NOT_FOUND)

    # Get executions for this rule
    executions = RuleExecution.objects.filter(rule=rule).select_related(
        'rule', 'trigger_content_type', 'triggered_by'
    ).prefetch_related(
        'notifications'
    )[:100]
    serializer = RuleExecutionListSerializer(executions, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def all_rule_executions(request):
    """List all rule executions across all rules."""
    from .models import RuleExecution
    from .serializers import RuleExecutionListSerializer

    # Optional filters
    rule_id = request.query_params.get('rule_id')
    status_filter = request.query_params.get('status')
    limit = min(int(request.query_params.get('limit', 100)), 500)

    executions = RuleExecution.objects.select_related(
        'rule', 'trigger_content_type', 'triggered_by'
    ).prefetch_related(
        'notifications'
    )

    if rule_id:
        executions = executions.filter(rule_id=rule_id)
    if status_filter:
        executions = executions.filter(status=status_filter)

    executions = executions[:limit]
    serializer = RuleExecutionListSerializer(executions, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def rule_execution_detail(request, execution_id):
    """Get detailed execution record."""
    from .models import RuleExecution
    from .serializers import RuleExecutionSerializer

    try:
        execution = RuleExecution.objects.select_related(
            'rule', 'trigger_content_type', 'triggered_by'
        ).prefetch_related(
            'notifications'
        ).get(id=execution_id)
    except RuleExecution.DoesNotExist:
        return Response({'error': 'Execution not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = RuleExecutionSerializer(execution)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def replay_rule_execution(request, execution_id):
    """
    Replay a failed rule execution.

    Re-runs the same rule with the same trigger data, creating a new execution record.
    """
    import traceback
    from .models import RuleExecution
    from .tasks import _execute_rule

    new_execution = None
    rule = None
    start_time = time.time()

    try:
        # Fetch original execution
        try:
            original_execution = RuleExecution.objects.select_related(
                'rule', 'rule__trigger_content_type', 'trigger_content_type'
            ).get(id=execution_id)
        except RuleExecution.DoesNotExist:
            return Response({'error': 'Execution not found'}, status=status.HTTP_404_NOT_FOUND)

        rule = original_execution.rule
        if not rule:
            return Response({'error': 'Rule no longer exists'}, status=status.HTTP_400_BAD_REQUEST)

        if not rule.is_active:
            return Response({'error': 'Rule is not active'}, status=status.HTTP_400_BAD_REQUEST)

        # Get the content type - prefer from execution, fall back to rule
        content_type = original_execution.trigger_content_type or rule.trigger_content_type
        if not content_type:
            return Response(
                {'error': 'Cannot replay: no trigger content type available'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extract trigger data from original execution
        trigger_data = original_execution.trigger_data or {}
        old_values = trigger_data.get('old_values', {})
        new_values = trigger_data.get('new_values', {})

        # Create new execution record
        # Store replay info in trigger_data
        replay_trigger_data = trigger_data.copy()
        replay_trigger_data['_replay'] = {
            'replayed_from': str(original_execution.id),
            'replayed_by': request.user.email,
        }

        new_execution = RuleExecution.objects.create(
            rule=rule,
            trigger_type=original_execution.trigger_type,
            trigger_content_type=content_type,
            trigger_object_id=original_execution.trigger_object_id,
            trigger_data=replay_trigger_data,
            status=RuleExecution.Status.RUNNING,
            action_type=rule.action_type,
            triggered_by=request.user,
        )

        # Execute the rule
        result = _execute_rule(
            rule=rule,
            content_type=content_type,
            object_id=original_execution.trigger_object_id or '',
            old_values=old_values,
            new_values=new_values,
            execution=new_execution,
        )

        # Update execution record
        new_execution.status = RuleExecution.Status.SUCCESS
        new_execution.action_result = result
        new_execution.execution_time_ms = int((time.time() - start_time) * 1000)
        new_execution.completed_at = timezone.now()
        new_execution.save()

        # Update rule stats
        rule.last_triggered_at = timezone.now()
        rule.total_executions += 1
        rule.total_success += 1
        rule.save(update_fields=['last_triggered_at', 'total_executions', 'total_success'])

        return Response({
            'status': 'success',
            'execution_id': str(new_execution.id),
            'result': result,
        })

    except Exception as e:
        error_tb = traceback.format_exc()

        # Update execution record with error if it was created
        if new_execution:
            new_execution.status = RuleExecution.Status.FAILED
            new_execution.error_message = f"{str(e)}\n\n{error_tb}"
            new_execution.execution_time_ms = int((time.time() - start_time) * 1000)
            new_execution.completed_at = timezone.now()
            new_execution.save()

            if rule:
                rule.total_executions += 1
                rule.total_failed += 1
                rule.save(update_fields=['total_executions', 'total_failed'])

        return Response({
            'status': 'failed',
            'execution_id': str(new_execution.id) if new_execution else None,
            'error': str(e),
            'traceback': error_tb,
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# Manual/Signal/View Action Triggers
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def trigger_manual_rule(request, rule_id):
    """
    Manually trigger an automation rule.

    Used for manual triggers like admin broadcasts.

    Request body:
    {
        "recipients": ["user-id-1", "user@example.com"],  // Optional
        "context": {"title": "Hello", "body": "World"}   // Template variables
    }
    """
    from .triggers import trigger_manual_automation

    try:
        rule = AutomationRule.objects.get(id=rule_id)
    except AutomationRule.DoesNotExist:
        return Response({'error': 'Rule not found'}, status=status.HTTP_404_NOT_FOUND)

    if rule.trigger_type != 'manual':
        return Response(
            {'error': 'This rule is not a manual trigger type'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not rule.is_active:
        return Response(
            {'error': 'This rule is not active'},
            status=status.HTTP_400_BAD_REQUEST
        )

    recipients = request.data.get('recipients', [])
    context = request.data.get('context', {})

    success = trigger_manual_automation(
        rule_id=str(rule_id),
        recipients=recipients,
        context=context,
    )

    if success:
        return Response({'status': 'triggered', 'rule_id': str(rule_id)})
    else:
        return Response(
            {'error': 'Failed to trigger automation'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def list_manual_rules(request):
    """List all manual trigger rules available for triggering."""
    rules = AutomationRule.objects.filter(
        trigger_type='manual',
        is_active=True,
    ).select_related('notification_template')

    return Response([{
        'id': str(rule.id),
        'name': rule.name,
        'description': rule.description,
        'template_name': rule.notification_template.name if rule.notification_template else None,
        'action_config': rule.action_config,
    } for rule in rules])


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def list_signal_rules(request):
    """List all signal-based trigger rules."""
    rules = AutomationRule.objects.filter(
        trigger_type='signal',
    ).select_related('notification_template')

    return Response([{
        'id': str(rule.id),
        'name': rule.name,
        'description': rule.description,
        'signal_name': rule.signal_name,
        'is_active': rule.is_active,
        'template_name': rule.notification_template.name if rule.notification_template else None,
    } for rule in rules])


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def list_view_action_rules(request):
    """List all view action trigger rules."""
    rules = AutomationRule.objects.filter(
        trigger_type='view_action',
    ).select_related('notification_template')

    return Response([{
        'id': str(rule.id),
        'name': rule.name,
        'description': rule.description,
        'signal_name': rule.signal_name,  # Used as action name
        'is_active': rule.is_active,
        'template_name': rule.notification_template.name if rule.notification_template else None,
    } for rule in rules])


# =============================================================================
# Webhook Endpoint CRUD
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def list_webhook_endpoints(request):
    """List all webhook endpoints."""
    endpoints = WebhookEndpoint.objects.select_related(
        'target_content_type', 'created_by'
    ).order_by('-created_at')

    # Optional filters
    is_active = request.query_params.get('is_active')
    if is_active is not None:
        endpoints = endpoints.filter(is_active=is_active.lower() == 'true')

    target_model = request.query_params.get('target_model')
    if target_model:
        try:
            app_label, model = target_model.split('.')
            from django.contrib.contenttypes.models import ContentType
            ct = ContentType.objects.get(app_label=app_label, model=model)
            endpoints = endpoints.filter(target_content_type=ct)
        except (ValueError, ContentType.DoesNotExist):
            pass

    search = request.query_params.get('search')
    if search:
        endpoints = endpoints.filter(name__icontains=search)

    serializer = WebhookEndpointListSerializer(endpoints, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def create_webhook_endpoint(request):
    """Create a new webhook endpoint."""
    serializer = WebhookEndpointCreateSerializer(
        data=request.data,
        context={'request': request}
    )
    if serializer.is_valid():
        endpoint = serializer.save()
        return Response(
            WebhookEndpointSerializer(endpoint).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def get_webhook_endpoint(request, endpoint_id):
    """Get a single webhook endpoint."""
    try:
        endpoint = WebhookEndpoint.objects.select_related(
            'target_content_type', 'created_by'
        ).get(id=endpoint_id)
    except WebhookEndpoint.DoesNotExist:
        return Response(
            {'error': 'Webhook endpoint not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = WebhookEndpointSerializer(endpoint)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdmin])
def update_webhook_endpoint(request, endpoint_id):
    """Update a webhook endpoint."""
    try:
        endpoint = WebhookEndpoint.objects.get(id=endpoint_id)
    except WebhookEndpoint.DoesNotExist:
        return Response(
            {'error': 'Webhook endpoint not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = WebhookEndpointCreateSerializer(
        endpoint,
        data=request.data,
        partial=True,
        context={'request': request}
    )
    if serializer.is_valid():
        endpoint = serializer.save()
        return Response(WebhookEndpointSerializer(endpoint).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def delete_webhook_endpoint(request, endpoint_id):
    """Delete a webhook endpoint."""
    try:
        endpoint = WebhookEndpoint.objects.get(id=endpoint_id)
    except WebhookEndpoint.DoesNotExist:
        return Response(
            {'error': 'Webhook endpoint not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    endpoint.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def toggle_webhook_endpoint(request, endpoint_id):
    """Toggle webhook endpoint active status."""
    try:
        endpoint = WebhookEndpoint.objects.get(id=endpoint_id)
    except WebhookEndpoint.DoesNotExist:
        return Response(
            {'error': 'Webhook endpoint not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    endpoint.is_active = not endpoint.is_active
    endpoint.save(update_fields=['is_active', 'updated_at'])
    return Response({'is_active': endpoint.is_active})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def regenerate_webhook_api_key(request, endpoint_id):
    """Regenerate the API key for a webhook endpoint."""
    import secrets

    try:
        endpoint = WebhookEndpoint.objects.get(id=endpoint_id)
    except WebhookEndpoint.DoesNotExist:
        return Response(
            {'error': 'Webhook endpoint not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Generate new API key
    endpoint.api_key = secrets.token_urlsafe(32)
    endpoint.save(update_fields=['api_key', 'updated_at'])

    return Response({
        'api_key': endpoint.api_key,
        'message': 'API key regenerated successfully'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def test_webhook_endpoint(request, endpoint_id):
    """
    Test a webhook endpoint with sample payload.

    Request body:
    {
        "payload": {"name": "Test Lead", "email": "test@example.com"},
        "dry_run": true  // If true, validate but don't create record
    }
    """
    try:
        endpoint = WebhookEndpoint.objects.select_related(
            'target_content_type'
        ).get(id=endpoint_id)
    except WebhookEndpoint.DoesNotExist:
        return Response(
            {'error': 'Webhook endpoint not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    payload = request.data.get('payload', {})
    dry_run = request.data.get('dry_run', True)

    # Validate field mapping
    model_class = endpoint.target_content_type.model_class()
    mapped_data = {}
    mapping_errors = []

    for external_field, internal_field in endpoint.field_mapping.items():
        if external_field in payload:
            value = payload[external_field]
            # Check if internal field exists on model
            try:
                model_class._meta.get_field(internal_field)
                mapped_data[internal_field] = value
            except Exception:
                mapping_errors.append(
                    f"Field '{internal_field}' does not exist on {model_class.__name__}"
                )
        else:
            mapping_errors.append(
                f"Expected field '{external_field}' not found in payload"
            )

    # Apply default values
    for field, value in endpoint.default_values.items():
        if field not in mapped_data:
            mapped_data[field] = value

    # Build preview
    preview = {
        'endpoint': {
            'name': endpoint.name,
            'slug': endpoint.slug,
            'webhook_url': endpoint.webhook_url,
            'target_model': f"{endpoint.target_content_type.app_label}.{endpoint.target_content_type.model}",
            'target_action': endpoint.target_action,
        },
        'payload_received': payload,
        'field_mapping': endpoint.field_mapping,
        'mapped_data': mapped_data,
        'default_values': endpoint.default_values,
        'mapping_errors': mapping_errors,
        'dry_run': dry_run,
    }

    if mapping_errors:
        preview['status'] = 'validation_error'
        preview['message'] = 'Field mapping has errors'
        return Response(preview, status=status.HTTP_400_BAD_REQUEST)

    # If not dry run, actually create the record
    if not dry_run:
        try:
            # Check deduplication
            if endpoint.dedupe_field and endpoint.dedupe_field in mapped_data:
                existing = model_class.objects.filter(
                    **{endpoint.dedupe_field: mapped_data[endpoint.dedupe_field]}
                ).first()

                if existing:
                    if endpoint.target_action == 'create':
                        preview['status'] = 'duplicate'
                        preview['message'] = f"Record with {endpoint.dedupe_field}='{mapped_data[endpoint.dedupe_field]}' already exists"
                        preview['existing_id'] = str(existing.pk)
                        return Response(preview)
                    else:
                        # Update existing
                        for field, value in mapped_data.items():
                            setattr(existing, field, value)
                        existing.save()
                        preview['status'] = 'updated'
                        preview['message'] = 'Existing record updated'
                        preview['object_id'] = str(existing.pk)
                        return Response(preview)

            # Create new record
            instance = model_class.objects.create(**mapped_data)
            preview['status'] = 'created'
            preview['message'] = 'Record created successfully'
            preview['object_id'] = str(instance.pk)

        except Exception as e:
            preview['status'] = 'error'
            preview['message'] = str(e)
            return Response(preview, status=status.HTTP_400_BAD_REQUEST)
    else:
        preview['status'] = 'valid'
        preview['message'] = 'Payload is valid and would create a record'

    return Response(preview)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def webhook_endpoint_receipts(request, endpoint_id):
    """Get receipts (logs) for a specific webhook endpoint."""
    try:
        endpoint = WebhookEndpoint.objects.get(id=endpoint_id)
    except WebhookEndpoint.DoesNotExist:
        return Response(
            {'error': 'Webhook endpoint not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    receipts = WebhookReceipt.objects.filter(endpoint=endpoint).order_by('-created_at')

    # Optional filters
    status_filter = request.query_params.get('status')
    if status_filter:
        receipts = receipts.filter(status=status_filter)

    limit = min(int(request.query_params.get('limit', 50)), 200)
    receipts = receipts[:limit]

    serializer = WebhookReceiptSerializer(receipts, many=True)
    return Response(serializer.data)
