"""
Model Registry for Automations

This module provides a registry for models that can be used in automations.
Models can be registered using the @automatable decorator.
"""

from typing import Any, Dict, List, Optional, Type
from django.db import models
from django.db.models import Field
from django.db.models.fields.related import ForeignKey, OneToOneField, ManyToManyField


# Field types to exclude from automation
EXCLUDED_FIELD_TYPES = (
    ManyToManyField,  # Too complex for simple field updates
)

# Field names to exclude (internal Django fields, passwords, etc.)
EXCLUDED_FIELD_NAMES = {
    'id', 'pk', 'password', 'last_login', 'date_joined',
    'created_at', 'updated_at', 'created_by', 'updated_by',
    'deleted_at', 'is_deleted',
}

# Reverse relation types to exclude
EXCLUDED_RELATION_TYPES = {
    'ManyToOneRel',
    'ManyToManyRel',
    'OneToOneRel',
}


def get_model_fields(model_class: Type[models.Model]) -> List[Dict[str, Any]]:
    """
    Dynamically discover all fields from a model.
    Returns a list of field info dicts with name, type, and metadata.
    """
    fields = []

    for field in model_class._meta.get_fields():
        # Skip reverse relations and excluded types
        if not hasattr(field, 'name'):
            continue
        if field.name in EXCLUDED_FIELD_NAMES:
            continue
        if field.name.startswith('_'):
            continue
        if isinstance(field, EXCLUDED_FIELD_TYPES):
            continue
        # Skip reverse relations
        if field.__class__.__name__ in EXCLUDED_RELATION_TYPES:
            continue

        # Get field info
        field_info = {
            'name': field.name,
            'type': field.__class__.__name__,
            'verbose_name': getattr(field, 'verbose_name', field.name).replace('_', ' ').title(),
        }

        # Add choices if available
        if hasattr(field, 'choices') and field.choices:
            field_info['choices'] = [
                {'value': c[0], 'label': str(c[1])} for c in field.choices
            ]

        # Mark foreign keys
        if isinstance(field, (ForeignKey, OneToOneField)):
            field_info['is_relation'] = True
            field_info['related_model'] = f"{field.related_model._meta.app_label}.{field.related_model._meta.model_name}"

        # Check if required
        if hasattr(field, 'blank') and hasattr(field, 'null'):
            field_info['required'] = not field.blank and not field.null

        fields.append(field_info)

    return fields


class AutomatableModelRegistry:
    """Registry of models that can be used in automations."""

    _registry: Dict[str, Dict[str, Any]] = {}
    _fields_cache: Dict[str, List[Dict[str, Any]]] = {}

    @classmethod
    def register(cls, model_class: Type[models.Model], config: Dict[str, Any]) -> None:
        """Register a model for automation."""
        key = f"{model_class._meta.app_label}.{model_class._meta.model_name}"

        # Store model class and config, but defer field discovery
        cls._registry[key] = {
            'model': model_class,
            'display_name': config.get('display_name', model_class._meta.verbose_name.title()),
            'events': config.get('events', ['created', 'updated', 'deleted']),
            'status_field': config.get('status_field'),
            'exclude_fields': config.get('exclude_fields', []),
            '_fields_loaded': False,
        }

    @classmethod
    def _ensure_fields_loaded(cls, key: str) -> None:
        """Lazily load fields for a model (called after Django app loading)."""
        config = cls._registry.get(key)
        if not config or config.get('_fields_loaded'):
            return

        model_class = config['model']
        discovered_fields = get_model_fields(model_class)

        # Filter out excluded fields if specified
        exclude_fields = set(config.get('exclude_fields', []))
        if exclude_fields:
            discovered_fields = [f for f in discovered_fields if f['name'] not in exclude_fields]

        config['fields'] = discovered_fields
        config['field_names'] = [f['name'] for f in discovered_fields]
        config['_fields_loaded'] = True

    @classmethod
    def get_all(cls) -> Dict[str, Dict[str, Any]]:
        """Get all registered models."""
        # Ensure all fields are loaded
        for key in cls._registry:
            cls._ensure_fields_loaded(key)
        return cls._registry

    @classmethod
    def get_model_config(cls, app_label: str, model_name: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific model."""
        key = f"{app_label}.{model_name}"
        cls._ensure_fields_loaded(key)
        return cls._registry.get(key)

    @classmethod
    def get_by_key(cls, key: str) -> Optional[Dict[str, Any]]:
        """Get configuration by registry key."""
        cls._ensure_fields_loaded(key)
        return cls._registry.get(key)

    @classmethod
    def get_model_fields(cls, key: str) -> List[Dict[str, Any]]:
        """Get list of automatable fields for a model (full field info)."""
        cls._ensure_fields_loaded(key)
        config = cls._registry.get(key)
        if config:
            return config.get('fields', [])
        return []

    @classmethod
    def get_model_field_names(cls, key: str) -> List[str]:
        """Get list of field names for a model (simple list)."""
        cls._ensure_fields_loaded(key)
        config = cls._registry.get(key)
        if config:
            return config.get('field_names', [])
        return []

    @classmethod
    def get_model_events(cls, key: str) -> List[str]:
        """Get list of events for a model."""
        config = cls._registry.get(key)
        if config:
            return config.get('events', [])
        return []


def automatable(
    display_name: Optional[str] = None,
    events: Optional[List[str]] = None,
    status_field: Optional[str] = None,
    exclude_fields: Optional[List[str]] = None,
):
    """
    Decorator to register a model for use in automations.
    Fields are automatically discovered from the model.

    Usage:
        @automatable(
            display_name='Lead',
            events=['created', 'updated', 'deleted', 'stage_changed'],
            status_field='onboarding_stage',
            exclude_fields=['internal_notes'],  # Optional: exclude specific fields
        )
        class Lead(models.Model):
            ...
    """
    def decorator(model_class: Type[models.Model]) -> Type[models.Model]:
        AutomatableModelRegistry.register(model_class, {
            'display_name': display_name,
            'events': events or ['created', 'updated', 'deleted'],
            'status_field': status_field,
            'exclude_fields': exclude_fields or [],
        })
        return model_class
    return decorator
