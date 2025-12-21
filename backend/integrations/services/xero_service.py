"""
Xero integration service for OAuth, invoice sync, and payment reconciliation.
"""

import logging
import re
from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal
from typing import Optional
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def parse_xero_date(date_str: str) -> datetime:
    """
    Parse Xero's .NET JSON date format.

    Xero returns dates like '/Date(1761523200000+0000)/' which is
    milliseconds since epoch with timezone offset.
    """
    if not date_str:
        return None

    # Handle ISO format
    if 'T' in date_str or date_str.count('-') >= 2:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))

    # Handle .NET JSON date format: /Date(1234567890000+0000)/
    match = re.search(r'/Date\((\d+)([+-]\d{4})?\)/', date_str)
    if match:
        timestamp_ms = int(match.group(1))
        return datetime.fromtimestamp(timestamp_ms / 1000, tz=dt_timezone.utc)

    raise ValueError(f"Cannot parse date: {date_str}")

XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize'
XERO_TOKEN_URL = 'https://identity.xero.com/connect/token'
XERO_API_URL = 'https://api.xero.com/api.xro/2.0'
XERO_CONNECTIONS_URL = 'https://api.xero.com/connections'


class XeroError(Exception):
    """Base exception for Xero-related errors."""
    pass


class XeroAuthError(XeroError):
    """Authentication/authorization error."""
    pass


class XeroAPIError(XeroError):
    """API call error."""
    pass


class XeroService:
    """
    Service for Xero integration.

    Handles:
    - OAuth2 authorization flow
    - Token refresh
    - Contact creation/update
    - Invoice sync (push to Xero)
    - Payment fetch (pull from Xero)
    """

    def __init__(self):
        self.client_id = settings.XERO_CLIENT_ID
        self.client_secret = settings.XERO_CLIENT_SECRET
        self.redirect_uri = settings.XERO_REDIRECT_URI
        self.scopes = settings.XERO_SCOPES

    # -------------------------------------------------------------------------
    # OAuth Methods
    # -------------------------------------------------------------------------

    def get_auth_url(self, state: str) -> str:
        """
        Generate Xero OAuth authorization URL.

        Args:
            state: Random state string for CSRF protection

        Returns:
            Authorization URL to redirect user to
        """
        params = {
            'response_type': 'code',
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'scope': ' '.join(self.scopes),
            'state': state,
        }
        return f"{XERO_AUTH_URL}?{urlencode(params)}"

    def exchange_code(self, code: str) -> dict:
        """
        Exchange authorization code for tokens.

        Args:
            code: Authorization code from OAuth callback

        Returns:
            Dict with access_token, refresh_token, expires_in

        Raises:
            XeroAuthError: If token exchange fails
        """
        response = requests.post(
            XERO_TOKEN_URL,
            data={
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': self.redirect_uri,
            },
            auth=(self.client_id, self.client_secret),
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
        )

        if response.status_code != 200:
            logger.error(f"Xero token exchange failed: {response.text}")
            raise XeroAuthError(f"Token exchange failed: {response.text}")

        return response.json()

    def refresh_token(self, refresh_token: str) -> dict:
        """
        Refresh an expired access token.

        Args:
            refresh_token: Current refresh token

        Returns:
            Dict with new access_token, refresh_token, expires_in

        Raises:
            XeroAuthError: If token refresh fails
        """
        response = requests.post(
            XERO_TOKEN_URL,
            data={
                'grant_type': 'refresh_token',
                'refresh_token': refresh_token,
            },
            auth=(self.client_id, self.client_secret),
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
        )

        if response.status_code != 200:
            logger.error(f"Xero token refresh failed: {response.text}")
            raise XeroAuthError(f"Token refresh failed: {response.text}")

        return response.json()

    def get_connections(self, access_token: str) -> list:
        """
        Get connected Xero tenants/organizations.

        Args:
            access_token: Valid access token

        Returns:
            List of connected tenants with tenantId and tenantName
        """
        response = requests.get(
            XERO_CONNECTIONS_URL,
            headers={'Authorization': f'Bearer {access_token}'},
        )

        if response.status_code != 200:
            logger.error(f"Failed to get Xero connections: {response.text}")
            raise XeroAPIError(f"Failed to get connections: {response.text}")

        return response.json()

    def _get_valid_token(self, connection) -> str:
        """
        Get a valid access token, refreshing if necessary.

        Args:
            connection: XeroConnection instance

        Returns:
            Valid access token
        """
        if connection.token_expires_at <= timezone.now():
            logger.info(f"Refreshing Xero token for tenant {connection.tenant_id}")
            tokens = self.refresh_token(connection.refresh_token)

            connection.access_token = tokens['access_token']
            connection.refresh_token = tokens['refresh_token']
            connection.token_expires_at = timezone.now() + timedelta(
                seconds=tokens['expires_in']
            )
            connection.save(update_fields=[
                'access_token', 'refresh_token', 'token_expires_at', 'updated_at'
            ])

        return connection.access_token

    def _make_api_request(
        self,
        connection,
        method: str,
        endpoint: str,
        data: Optional[dict] = None,
    ) -> dict:
        """
        Make an authenticated API request to Xero.

        Args:
            connection: XeroConnection instance
            method: HTTP method (GET, POST, PUT)
            endpoint: API endpoint (e.g., '/Contacts')
            data: Request body data

        Returns:
            API response data
        """
        access_token = self._get_valid_token(connection)

        headers = {
            'Authorization': f'Bearer {access_token}',
            'Xero-Tenant-Id': connection.tenant_id,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }

        url = f"{XERO_API_URL}{endpoint}"

        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            json=data,
        )

        if response.status_code >= 400:
            logger.error(
                f"Xero API error: {method} {endpoint} - {response.status_code}: {response.text}"
            )
            raise XeroAPIError(f"API error: {response.text}")

        return response.json() if response.text else {}

    # -------------------------------------------------------------------------
    # Contact Methods
    # -------------------------------------------------------------------------

    def sync_contact(self, connection, company) -> str:
        """
        Create or update a Xero contact from an Oneo company.

        Args:
            connection: XeroConnection instance
            company: Company instance

        Returns:
            Xero Contact ID
        """
        from integrations.models import XeroContactMapping

        # Check if mapping already exists
        try:
            mapping = XeroContactMapping.objects.get(company=company)
            # Update existing contact
            contact_data = self._build_contact_data(company)
            contact_data['ContactID'] = mapping.xero_contact_id

            response = self._make_api_request(
                connection,
                'POST',
                '/Contacts',
                {'Contacts': [contact_data]},
            )

            logger.info(f"Updated Xero contact for company {company.id}")
            return mapping.xero_contact_id

        except XeroContactMapping.DoesNotExist:
            # Create new contact
            contact_data = self._build_contact_data(company)

            response = self._make_api_request(
                connection,
                'POST',
                '/Contacts',
                {'Contacts': [contact_data]},
            )

            xero_contact_id = response['Contacts'][0]['ContactID']

            # Create mapping
            XeroContactMapping.objects.create(
                company=company,
                xero_contact_id=xero_contact_id,
            )

            logger.info(
                f"Created Xero contact {xero_contact_id} for company {company.id}"
            )
            return xero_contact_id

    def _build_contact_data(self, company) -> dict:
        """
        Build Xero contact data from Oneo company.

        Mapping:
        - Name: Legal name if available, otherwise company display name
        - ContactNumber: Company UUID (internal reference for matching)
        - CompanyNumber: Registration/incorporation number
        - TaxNumber: VAT/Tax ID
        - EmailAddress: Billing contact email
        - FirstName/LastName: Billing contact person (split)
        - Addresses: Billing address (POBOX type for invoicing)
        - Phones: Billing contact phone

        Note: Website field is NOT supported by Xero API for Contacts.
        """
        # Use legal name for Xero if available, otherwise display name
        contact_name = company.legal_name if company.legal_name else company.name

        contact = {
            'Name': contact_name,
            'IsCustomer': True,
            # Store Oneo company ID as ContactNumber for reference
            'ContactNumber': str(company.id),
            # 14-day payment terms for all invoices
            'PaymentTerms': {
                'Sales': {
                    'Day': 14,
                    'Type': 'DAYSAFTERBILLDATE',
                },
            },
        }

        # Legal/Registration details
        if company.registration_number:
            contact['CompanyNumber'] = company.registration_number

        if company.vat_number:
            contact['TaxNumber'] = company.vat_number

        # Billing contact email
        if company.billing_contact_email:
            contact['EmailAddress'] = company.billing_contact_email

        # Note: Website field is not supported by Xero API

        # Billing contact person name (split into first/last)
        if company.billing_contact_name:
            name_parts = company.billing_contact_name.strip().split()
            if name_parts:
                contact['FirstName'] = name_parts[0]
                if len(name_parts) > 1:
                    contact['LastName'] = ' '.join(name_parts[1:])

        # Billing address
        # Xero AddressLine fields are max 500 chars each
        # We'll use AddressLine1 for street, and split if needed
        if company.billing_address or company.billing_city or company.billing_postal_code:
            address = {
                'AddressType': 'POBOX',  # POBOX = Postal/billing address
            }

            # Handle long addresses by splitting into multiple lines
            if company.billing_address:
                addr_lines = company.billing_address.split('\n')
                if len(addr_lines) >= 1:
                    address['AddressLine1'] = addr_lines[0][:500]
                if len(addr_lines) >= 2:
                    address['AddressLine2'] = addr_lines[1][:500]
                if len(addr_lines) >= 3:
                    address['AddressLine3'] = addr_lines[2][:500]
                if len(addr_lines) >= 4:
                    address['AddressLine4'] = addr_lines[3][:500]

            if company.billing_city:
                address['City'] = company.billing_city

            if company.billing_postal_code:
                address['PostalCode'] = company.billing_postal_code

            # Use country code if available for better Xero matching
            if company.billing_country:
                address['Country'] = company.billing_country.name

            contact['Addresses'] = [address]

        # Billing contact phone
        if company.billing_contact_phone:
            contact['Phones'] = [{
                'PhoneType': 'DEFAULT',
                'PhoneNumber': company.billing_contact_phone,
            }]

        return contact

    # -------------------------------------------------------------------------
    # Invoice Methods
    # -------------------------------------------------------------------------

    def sync_invoice(self, connection, invoice) -> str:
        """
        Push an invoice to Xero.

        Args:
            connection: XeroConnection instance
            invoice: Invoice instance

        Returns:
            Xero Invoice ID
        """
        from integrations.models import (
            XeroInvoiceMapping,
            XeroInvoiceMappingSyncStatus,
        )

        # Ensure contact exists in Xero
        xero_contact_id = self.sync_contact(connection, invoice.company)

        # Build invoice data
        invoice_data = self._build_invoice_data(invoice, xero_contact_id)

        # Check if mapping already exists (retry scenario)
        try:
            mapping = XeroInvoiceMapping.objects.get(invoice=invoice)

            if mapping.sync_status == XeroInvoiceMappingSyncStatus.SYNCED:
                logger.info(f"Invoice {invoice.id} already synced to Xero")
                return mapping.xero_invoice_id

            # Retry failed sync
            invoice_data['InvoiceID'] = mapping.xero_invoice_id

        except XeroInvoiceMapping.DoesNotExist:
            mapping = None

        try:
            response = self._make_api_request(
                connection,
                'POST',
                '/Invoices',
                {'Invoices': [invoice_data]},
            )

            xero_invoice = response['Invoices'][0]
            xero_invoice_id = xero_invoice['InvoiceID']
            xero_invoice_number = xero_invoice.get('InvoiceNumber', '')

            if mapping:
                mapping.xero_invoice_id = xero_invoice_id
                mapping.xero_invoice_number = xero_invoice_number
                mapping.sync_status = XeroInvoiceMappingSyncStatus.SYNCED
                mapping.sync_error = ''
                mapping.last_synced_at = timezone.now()
                mapping.save()
            else:
                XeroInvoiceMapping.objects.create(
                    invoice=invoice,
                    xero_invoice_id=xero_invoice_id,
                    xero_invoice_number=xero_invoice_number,
                    sync_status=XeroInvoiceMappingSyncStatus.SYNCED,
                    last_synced_at=timezone.now(),
                )

            # Update invoice with external reference
            invoice.external_invoice_number = xero_invoice_number
            invoice.external_system = 'Xero'
            invoice.save(update_fields=['external_invoice_number', 'external_system', 'updated_at'])

            logger.info(f"Synced invoice {invoice.id} to Xero as {xero_invoice_id}")
            return xero_invoice_id

        except XeroAPIError as e:
            # Record sync error
            if mapping:
                mapping.sync_status = XeroInvoiceMappingSyncStatus.ERROR
                mapping.sync_error = str(e)
                mapping.save()
            else:
                XeroInvoiceMapping.objects.create(
                    invoice=invoice,
                    xero_invoice_id='',
                    xero_invoice_number='',
                    sync_status=XeroInvoiceMappingSyncStatus.ERROR,
                    sync_error=str(e),
                )
            raise

    def _build_invoice_data(self, invoice, xero_contact_id: str) -> dict:
        """Build Xero invoice data from Oneo invoice."""
        from subscriptions.models import InvoiceStatus

        # Map Oneo status to Xero status
        status_map = {
            InvoiceStatus.DRAFT: 'DRAFT',
            InvoiceStatus.SENT: 'AUTHORISED',
            InvoiceStatus.PAID: 'AUTHORISED',
            InvoiceStatus.PARTIALLY_PAID: 'AUTHORISED',
            InvoiceStatus.OVERDUE: 'AUTHORISED',
            InvoiceStatus.CANCELLED: 'VOIDED',
        }

        # TODO: Implement proper VAT/Tax handling when moving to production Xero account
        # ===============================================================================
        # Tax logic to implement:
        # - South African companies (billing_country.code == 'ZA'):
        #   Use standard sales tax code (e.g., 'OUTPUT2' for 15% VAT)
        #   Set LineAmountTypes to 'Exclusive' and add TaxType to each line item
        #
        # - Non-South African companies:
        #   Use Zero Rated tax code (e.g., 'ZERORATED' for exports)
        #   This applies to international clients where no VAT is charged
        #
        # Example implementation:
        #   is_south_african = (
        #       invoice.company.billing_country and
        #       invoice.company.billing_country.code == 'ZA'
        #   )
        #   tax_type = 'OUTPUT2' if is_south_african else 'ZERORATED'
        #   Then add 'TaxType': tax_type to each line_item
        # ===============================================================================

        line_items = []
        for item in invoice.line_items.all():
            line_item = {
                'Description': item.description,
                'Quantity': float(item.quantity),
                'UnitAmount': float(item.unit_price),
                'AccountCode': '200',  # Sales revenue account
                # TODO: Add 'TaxType': tax_type here when implementing VAT
            }
            line_items.append(line_item)

        invoice_data = {
            'Type': 'ACCREC',  # Accounts Receivable (sales invoice)
            'Contact': {'ContactID': xero_contact_id},
            'InvoiceNumber': invoice.invoice_number,
            'Reference': f"Oneo Invoice {invoice.invoice_number}",
            'Date': invoice.invoice_date.isoformat(),
            'DueDate': invoice.due_date.isoformat(),
            'LineItems': line_items,
            'Status': status_map.get(invoice.status, 'AUTHORISED'),
            'LineAmountTypes': 'NoTax',  # TODO: Change to 'Exclusive' when implementing VAT
        }

        return invoice_data

    # -------------------------------------------------------------------------
    # Payment Methods
    # -------------------------------------------------------------------------

    def fetch_payments(self, connection, since_date: Optional[datetime] = None) -> list:
        """
        Fetch payments from Xero since a given date.

        Args:
            connection: XeroConnection instance
            since_date: Fetch payments modified since this date

        Returns:
            List of Xero payment objects
        """
        endpoint = '/Payments'

        if since_date:
            # Xero uses If-Modified-Since header
            pass  # For now, fetch all and filter

        response = self._make_api_request(connection, 'GET', endpoint)
        payments = response.get('Payments', [])

        if since_date:
            payments = [
                p for p in payments
                if parse_xero_date(p['Date']) >= since_date
            ]

        return payments

    def reconcile_payment(self, connection, xero_payment: dict) -> Optional[str]:
        """
        Reconcile a Xero payment with an Oneo invoice.

        Args:
            connection: XeroConnection instance
            xero_payment: Xero payment object

        Returns:
            Payment ID if created, None if already exists or no match
        """
        from integrations.models import XeroInvoiceMapping, XeroPaymentMapping
        from subscriptions.models import (
            Invoice,
            InvoiceStatus,
            Payment,
            PaymentMethod,
            SubscriptionActivityLog,
            SubscriptionActivityType,
        )

        xero_payment_id = xero_payment['PaymentID']

        # Check if payment already recorded
        if XeroPaymentMapping.objects.filter(xero_payment_id=xero_payment_id).exists():
            logger.debug(f"Payment {xero_payment_id} already recorded")
            return None

        # Find matching invoice
        xero_invoice_id = xero_payment.get('Invoice', {}).get('InvoiceID')
        if not xero_invoice_id:
            logger.warning(f"Payment {xero_payment_id} has no invoice reference")
            return None

        try:
            mapping = XeroInvoiceMapping.objects.get(xero_invoice_id=xero_invoice_id)
            invoice = mapping.invoice
        except XeroInvoiceMapping.DoesNotExist:
            logger.warning(
                f"No invoice mapping found for Xero invoice {xero_invoice_id}"
            )
            return None

        # Parse payment amount
        amount = Decimal(str(xero_payment['Amount']))

        # Map payment type
        payment_type = xero_payment.get('PaymentType', 'ACCRECPAYMENT')
        method_map = {
            'ACCRECPAYMENT': PaymentMethod.BANK_TRANSFER,
        }
        payment_method = method_map.get(payment_type, PaymentMethod.BANK_TRANSFER)

        # Parse payment date using Xero date helper
        payment_date = parse_xero_date(xero_payment['Date']).date()

        # Create payment record
        payment = Payment.objects.create(
            invoice=invoice,
            amount=amount,
            payment_date=payment_date,
            payment_method=payment_method,
            reference_number=xero_payment.get('Reference', f"XERO-{xero_payment_id[:8]}"),
            notes=f"Imported from Xero (Payment ID: {xero_payment_id})",
        )

        # Create mapping to prevent duplicates
        XeroPaymentMapping.objects.create(
            payment=payment,
            xero_payment_id=xero_payment_id,
        )

        # Update invoice status
        total_paid = sum(p.amount for p in invoice.payments.all())
        old_status = invoice.status

        if total_paid >= invoice.total_amount:
            invoice.status = InvoiceStatus.PAID
        elif total_paid > 0:
            invoice.status = InvoiceStatus.PARTIALLY_PAID

        if invoice.status != old_status:
            invoice.save(update_fields=['status', 'updated_at'])

            # Log activity
            SubscriptionActivityLog.objects.create(
                company=invoice.company,
                subscription=invoice.subscription,
                invoice=invoice,
                activity_type=SubscriptionActivityType.PAYMENT_RECORDED,
                metadata={
                    'source': 'xero_sync',
                    'xero_payment_id': xero_payment_id,
                    'payment_id': str(payment.id),
                    'amount': str(amount),
                },
            )

        logger.info(
            f"Created payment {payment.id} from Xero payment {xero_payment_id}"
        )
        return str(payment.id)

    def sync_all_payments(self, connection) -> dict:
        """
        Sync all payments from Xero since last sync.

        Args:
            connection: XeroConnection instance

        Returns:
            Dict with counts of synced and skipped payments
        """
        since_date = connection.last_sync_at

        payments = self.fetch_payments(connection, since_date)

        synced = 0
        skipped = 0
        errors = 0

        for xero_payment in payments:
            try:
                result = self.reconcile_payment(connection, xero_payment)
                if result:
                    synced += 1
                else:
                    skipped += 1
            except Exception as e:
                logger.error(
                    f"Error reconciling payment {xero_payment.get('PaymentID')}: {e}"
                )
                errors += 1

        # Update last sync timestamp
        connection.last_sync_at = timezone.now()
        connection.save(update_fields=['last_sync_at', 'updated_at'])

        return {
            'synced': synced,
            'skipped': skipped,
            'errors': errors,
        }
