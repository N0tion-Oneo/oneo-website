from django.apps import AppConfig


class AutomationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'automations'
    verbose_name = 'Automations & Webhooks'

    def ready(self):
        """Connect signals when the app is ready."""
        # Import here to avoid circular imports
        from .signals import connect_signals, connect_auth_signals
        connect_signals()
        connect_auth_signals()
