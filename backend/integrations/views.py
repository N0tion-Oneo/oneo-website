"""
API views for the integrations app.
"""

import secrets
import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter

from api.permissions import IsAdmin
from .models import XeroConnection, XeroInvoiceMapping, XeroInvoiceMappingSyncStatus
from .serializers import (
    XeroConnectionSerializer,
    XeroAuthResponseSerializer,
    XeroCallbackSerializer,
    XeroSyncResultSerializer,
    XeroInvoiceMappingSerializer,
)
from .services.xero_service import XeroService, XeroError

logger = logging.getLogger(__name__)


# -------------------------------------------------------------------------
# OAuth Endpoints
# -------------------------------------------------------------------------

@extend_schema(
    summary="Initiate Xero OAuth",
    description="Start the OAuth authorization flow with Xero. Returns an authorization URL to redirect the user to.",
    responses={200: XeroAuthResponseSerializer},
    tags=['Integrations'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def xero_auth_initiate(request):
    """
    Initiate Xero OAuth authorization flow.

    Returns an authorization URL and state token.
    The frontend should redirect the user to the auth_url.
    """
    # Generate state token for CSRF protection
    state = secrets.token_urlsafe(32)

    # Store state in session for verification
    request.session['xero_oauth_state'] = state
    request.session.modified = True

    service = XeroService()
    auth_url = service.get_auth_url(state)

    return Response({
        'auth_url': auth_url,
        'state': state,
    })


@extend_schema(
    summary="Handle Xero OAuth callback",
    description="Exchange authorization code for tokens and create Xero connection.",
    request=XeroCallbackSerializer,
    responses={
        200: XeroConnectionSerializer,
        400: {'description': 'Invalid state or code'},
    },
    tags=['Integrations'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def xero_auth_callback(request):
    """
    Handle Xero OAuth callback.

    Exchanges the authorization code for tokens and creates the connection.
    """
    serializer = XeroCallbackSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    code = serializer.validated_data['code']
    state = serializer.validated_data['state']

    # Verify state token
    stored_state = request.session.get('xero_oauth_state')
    if not stored_state or stored_state != state:
        return Response(
            {'error': 'Invalid state token'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Clear state from session
    del request.session['xero_oauth_state']
    request.session.modified = True

    try:
        service = XeroService()

        # Exchange code for tokens
        tokens = service.exchange_code(code)

        # Get connected tenants
        connections = service.get_connections(tokens['access_token'])

        if not connections:
            return Response(
                {'error': 'No Xero organizations found'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Use first tenant (could allow selection in future)
        tenant = connections[0]

        # Deactivate any existing connections
        XeroConnection.objects.filter(is_active=True).update(is_active=False)

        # Create or update connection
        connection, created = XeroConnection.objects.update_or_create(
            tenant_id=tenant['tenantId'],
            defaults={
                'access_token': tokens['access_token'],
                'refresh_token': tokens['refresh_token'],
                'token_expires_at': timezone.now() + timedelta(seconds=tokens['expires_in']),
                'tenant_name': tenant['tenantName'],
                'is_active': True,
                'connected_by': request.user,
            },
        )

        logger.info(
            f"Xero connection {'created' if created else 'updated'} for tenant {tenant['tenantName']} "
            f"by user {request.user.id}"
        )

        return Response(XeroConnectionSerializer(connection).data)

    except XeroError as e:
        logger.error(f"Xero OAuth error: {e}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )


@extend_schema(
    summary="Get Xero connection status",
    description="Get the current Xero connection status and details.",
    responses={
        200: XeroConnectionSerializer,
        404: {'description': 'No active connection'},
    },
    tags=['Integrations'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def xero_status(request):
    """
    Get current Xero connection status.
    """
    try:
        connection = XeroConnection.objects.get(is_active=True)
        return Response(XeroConnectionSerializer(connection).data)
    except XeroConnection.DoesNotExist:
        return Response(
            {'connected': False, 'message': 'No active Xero connection'},
            status=status.HTTP_404_NOT_FOUND,
        )


@extend_schema(
    summary="Disconnect Xero",
    description="Disconnect the current Xero integration.",
    responses={200: {'description': 'Successfully disconnected'}},
    tags=['Integrations'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def xero_disconnect(request):
    """
    Disconnect Xero integration.
    """
    updated = XeroConnection.objects.filter(is_active=True).update(is_active=False)

    if updated:
        logger.info(f"Xero disconnected by user {request.user.id}")
        return Response({'message': 'Xero disconnected successfully'})
    else:
        return Response(
            {'message': 'No active connection to disconnect'},
            status=status.HTTP_404_NOT_FOUND,
        )


# -------------------------------------------------------------------------
# Sync Endpoints
# -------------------------------------------------------------------------

@extend_schema(
    summary="Sync invoices to Xero",
    description="Manually trigger invoice sync to Xero. Syncs all pending invoices.",
    responses={200: XeroSyncResultSerializer},
    tags=['Integrations'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def xero_sync_invoices(request):
    """
    Manually sync pending invoices to Xero.
    """
    try:
        connection = XeroConnection.objects.get(is_active=True)
    except XeroConnection.DoesNotExist:
        return Response(
            {'error': 'No active Xero connection'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from subscriptions.models import Invoice, InvoiceStatus

    # Find invoices that need syncing
    pending_mappings = XeroInvoiceMapping.objects.filter(
        sync_status=XeroInvoiceMappingSyncStatus.PENDING,
    ).select_related('invoice')

    error_mappings = XeroInvoiceMapping.objects.filter(
        sync_status=XeroInvoiceMappingSyncStatus.ERROR,
    ).select_related('invoice')

    # Also find sent invoices without any mapping
    synced_invoice_ids = XeroInvoiceMapping.objects.values_list('invoice_id', flat=True)
    unsynced_invoices = Invoice.objects.filter(
        status=InvoiceStatus.SENT,
    ).exclude(id__in=synced_invoice_ids)

    service = XeroService()
    synced = 0
    skipped = 0
    errors = 0

    # Sync pending mappings
    for mapping in pending_mappings:
        try:
            service.sync_invoice(connection, mapping.invoice)
            synced += 1
        except XeroError as e:
            logger.error(f"Failed to sync invoice {mapping.invoice.id}: {e}")
            errors += 1

    # Retry error mappings
    for mapping in error_mappings:
        try:
            service.sync_invoice(connection, mapping.invoice)
            synced += 1
        except XeroError as e:
            logger.error(f"Failed to sync invoice {mapping.invoice.id}: {e}")
            errors += 1

    # Sync unsynced invoices
    for invoice in unsynced_invoices:
        try:
            service.sync_invoice(connection, invoice)
            synced += 1
        except XeroError as e:
            logger.error(f"Failed to sync invoice {invoice.id}: {e}")
            errors += 1

    return Response({
        'synced': synced,
        'skipped': skipped,
        'errors': errors,
        'message': f'Synced {synced} invoice(s) to Xero',
    })


@extend_schema(
    summary="Sync payments from Xero",
    description="Manually trigger payment sync from Xero. Pulls payments and reconciles with invoices.",
    responses={200: XeroSyncResultSerializer},
    tags=['Integrations'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def xero_sync_payments(request):
    """
    Manually sync payments from Xero.
    """
    try:
        connection = XeroConnection.objects.get(is_active=True)
    except XeroConnection.DoesNotExist:
        return Response(
            {'error': 'No active Xero connection'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    service = XeroService()

    try:
        result = service.sync_all_payments(connection)
        result['message'] = f"Synced {result['synced']} payment(s) from Xero"
        return Response(result)
    except XeroError as e:
        logger.error(f"Failed to sync payments: {e}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@extend_schema(
    summary="Get invoice sync status",
    description="Get the sync status of invoices with Xero.",
    parameters=[
        OpenApiParameter(
            name='status',
            description='Filter by sync status',
            required=False,
            type=str,
            enum=['pending', 'synced', 'error'],
        ),
    ],
    responses={200: XeroInvoiceMappingSerializer(many=True)},
    tags=['Integrations'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def xero_invoice_status(request):
    """
    Get invoice sync status list.
    """
    queryset = XeroInvoiceMapping.objects.select_related(
        'invoice', 'invoice__company'
    ).order_by('-created_at')

    status_filter = request.query_params.get('status')
    if status_filter:
        queryset = queryset.filter(sync_status=status_filter)

    # Paginate results
    page_size = 20
    mappings = queryset[:page_size]

    return Response(XeroInvoiceMappingSerializer(mappings, many=True).data)
