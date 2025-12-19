"""
URL Configuration for Subscriptions App

Provides routes for:
- Subscription CRUD and actions (pause, resume, terminate, renew)
- Company pricing management
- Feature overrides
- Invoice management
- Payment recording
- Dashboard alerts and summary
"""

from django.urls import path
from . import views

app_name = 'subscriptions'

urlpatterns = [
    # ==========================================================================
    # Subscription Endpoints
    # ==========================================================================
    path(
        'subscriptions/',
        views.list_subscriptions,
        name='subscription-list'
    ),
    path(
        'subscriptions/create/',
        views.create_subscription,
        name='subscription-create'
    ),
    path(
        'subscriptions/<uuid:subscription_id>/',
        views.get_subscription,
        name='subscription-detail'
    ),
    path(
        'subscriptions/<uuid:subscription_id>/update/',
        views.update_subscription,
        name='subscription-update'
    ),
    path(
        'subscriptions/<uuid:subscription_id>/pause/',
        views.pause_subscription,
        name='subscription-pause'
    ),
    path(
        'subscriptions/<uuid:subscription_id>/resume/',
        views.resume_subscription,
        name='subscription-resume'
    ),
    path(
        'subscriptions/<uuid:subscription_id>/terminate/',
        views.terminate_subscription,
        name='subscription-terminate'
    ),
    path(
        'subscriptions/<uuid:subscription_id>/renew/',
        views.renew_subscription,
        name='subscription-renew'
    ),
    path(
        'subscriptions/<uuid:subscription_id>/calculate-termination-fee/',
        views.calculate_termination_fee,
        name='subscription-calculate-fee'
    ),
    path(
        'subscriptions/<uuid:subscription_id>/activity/',
        views.get_subscription_activity,
        name='subscription-activity'
    ),

    # ==========================================================================
    # Company-scoped Subscription Endpoints
    # ==========================================================================
    path(
        'companies/<uuid:company_id>/subscription/',
        views.get_company_subscription,
        name='company-subscription-get'
    ),
    path(
        'companies/<uuid:company_id>/subscription/create/',
        views.create_company_subscription,
        name='company-subscription-create'
    ),
    path(
        'companies/<uuid:company_id>/service-type/',
        views.change_service_type,
        name='company-service-type-change'
    ),

    # ==========================================================================
    # Company Pricing Endpoints
    # ==========================================================================
    path(
        'companies/<uuid:company_id>/pricing/',
        views.get_company_pricing,
        name='company-pricing'
    ),
    path(
        'companies/<uuid:company_id>/pricing/update/',
        views.update_company_pricing,
        name='company-pricing-update'
    ),
    path(
        'companies/<uuid:company_id>/pricing/effective/',
        views.get_effective_pricing,
        name='effective-pricing'
    ),

    # ==========================================================================
    # Feature Override Endpoints
    # ==========================================================================
    path(
        'companies/<uuid:company_id>/features/',
        views.get_company_features_with_overrides,
        name='company-features'
    ),
    path(
        'companies/<uuid:company_id>/features/<uuid:feature_id>/',
        views.update_feature_override,
        name='feature-override'
    ),

    # ==========================================================================
    # Company Activity Endpoint
    # ==========================================================================
    path(
        'companies/<uuid:company_id>/activity/',
        views.get_company_activity,
        name='company-activity'
    ),

    # ==========================================================================
    # Invoice Endpoints
    # ==========================================================================
    path(
        'invoices/',
        views.list_invoices,
        name='invoice-list'
    ),
    path(
        'invoices/create/',
        views.create_invoice,
        name='invoice-create'
    ),
    path(
        'invoices/<uuid:invoice_id>/',
        views.get_invoice,
        name='invoice-detail'
    ),
    path(
        'invoices/<uuid:invoice_id>/update/',
        views.update_invoice,
        name='invoice-update'
    ),
    path(
        'invoices/<uuid:invoice_id>/send/',
        views.send_invoice,
        name='invoice-send'
    ),
    path(
        'invoices/<uuid:invoice_id>/cancel/',
        views.cancel_invoice,
        name='invoice-cancel'
    ),

    # Company invoices
    path(
        'companies/<uuid:company_id>/invoices/',
        views.get_company_invoices,
        name='company-invoices'
    ),
    path(
        'companies/<uuid:company_id>/invoices/generate-retainer/',
        views.generate_retainer_invoice,
        name='generate-retainer-invoice'
    ),
    # Company placements (applications with accepted offers) for invoice creation
    path(
        'companies/<uuid:company_id>/placements/',
        views.get_company_placements,
        name='company-placements'
    ),

    # ==========================================================================
    # Payment Endpoints
    # ==========================================================================
    path(
        'invoices/<uuid:invoice_id>/payments/',
        views.list_invoice_payments,
        name='invoice-payments-list'
    ),
    path(
        'invoices/<uuid:invoice_id>/payments/record/',
        views.record_payment,
        name='payment-record'
    ),
    path(
        'payments/<uuid:payment_id>/delete/',
        views.delete_payment,
        name='payment-delete'
    ),

    # ==========================================================================
    # Dashboard Endpoints
    # ==========================================================================
    path(
        'dashboard/alerts/',
        views.get_subscription_alerts,
        name='subscription-alerts'
    ),
    path(
        'dashboard/summary/',
        views.get_subscription_summary,
        name='subscription-summary'
    ),
]
