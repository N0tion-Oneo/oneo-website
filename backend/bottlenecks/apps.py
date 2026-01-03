from django.apps import AppConfig


class BottlenecksConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'bottlenecks'

    def ready(self):
        # Import signals to register them
        from . import signals  # noqa: F401
