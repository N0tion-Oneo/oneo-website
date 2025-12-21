"""
URL configuration for the integrations app.
"""

from django.urls import path

from . import views

app_name = 'integrations'

urlpatterns = [
    # Xero OAuth
    path('xero/auth/', views.xero_auth_initiate, name='xero-auth'),
    path('xero/callback/', views.xero_auth_callback, name='xero-callback'),
    path('xero/status/', views.xero_status, name='xero-status'),
    path('xero/disconnect/', views.xero_disconnect, name='xero-disconnect'),

    # Xero Sync
    path('xero/sync/invoices/', views.xero_sync_invoices, name='xero-sync-invoices'),
    path('xero/sync/payments/', views.xero_sync_payments, name='xero-sync-payments'),
    path('xero/invoices/', views.xero_invoice_status, name='xero-invoice-status'),
]
