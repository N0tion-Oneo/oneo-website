"""
Encryption Service for Automations

Provides Fernet encryption for storing sensitive data like webhook secrets.
"""

import os
from typing import Optional
from django.conf import settings


def get_encryption_key() -> bytes:
    """
    Get the encryption key from settings or environment.

    Returns:
        bytes: The Fernet encryption key.

    Raises:
        ValueError: If the encryption key is not configured.

    Note:
        Generate a key with:
        python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    """
    key = getattr(settings, 'AUTOMATION_ENCRYPTION_KEY', None)
    if not key:
        key = os.environ.get('AUTOMATION_ENCRYPTION_KEY')
    if not key:
        # For development, use a default key (NOT for production!)
        if settings.DEBUG:
            # This is a placeholder key for development only
            key = 'VGhpcyBpcyBhIHBsYWNlaG9sZGVyIGtleSBmb3IgZGV2ZWxvcG1lbnQ='
        else:
            raise ValueError(
                "AUTOMATION_ENCRYPTION_KEY not configured. "
                "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
    return key.encode() if isinstance(key, str) else key


def encrypt_value(value: str) -> str:
    """
    Encrypt a string value using Fernet encryption.

    Args:
        value: The plaintext string to encrypt.

    Returns:
        str: The encrypted value as a base64-encoded string.
    """
    if not value:
        return ''

    try:
        from cryptography.fernet import Fernet
        f = Fernet(get_encryption_key())
        return f.encrypt(value.encode()).decode()
    except ImportError:
        # If cryptography is not installed, return value as-is (development only)
        if settings.DEBUG:
            return value
        raise


def decrypt_value(encrypted: str) -> str:
    """
    Decrypt an encrypted string using Fernet decryption.

    Args:
        encrypted: The encrypted value as a base64-encoded string.

    Returns:
        str: The decrypted plaintext string.
    """
    if not encrypted:
        return ''

    try:
        from cryptography.fernet import Fernet
        f = Fernet(get_encryption_key())
        return f.decrypt(encrypted.encode()).decode()
    except ImportError:
        # If cryptography is not installed, return value as-is (development only)
        if settings.DEBUG:
            return encrypted
        raise
    except Exception:
        # If decryption fails (wrong key, corrupted data), return empty string
        return ''


def is_encryption_available() -> bool:
    """Check if encryption is properly configured and available."""
    try:
        from cryptography.fernet import Fernet
        key = get_encryption_key()
        # Validate key format
        Fernet(key)
        return True
    except (ImportError, ValueError):
        return False
