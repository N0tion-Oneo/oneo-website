"""Add slug field to PricingFeature for stable feature gating."""
from django.db import migrations, models
from django.utils.text import slugify


def populate_slugs(apps, schema_editor):
    """Generate slugs for existing features based on their names."""
    PricingFeature = apps.get_model('cms', 'PricingFeature')

    for feature in PricingFeature.objects.all():
        if not feature.slug:
            base_slug = slugify(feature.name)
            slug = base_slug
            counter = 1
            # Ensure uniqueness
            while PricingFeature.objects.filter(slug=slug).exclude(pk=feature.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            feature.slug = slug
            feature.save(update_fields=['slug'])


def reverse_populate_slugs(apps, schema_editor):
    """No-op reverse - slugs will be removed by field removal."""
    pass


def drop_orphaned_indexes(apps, schema_editor):
    """Drop any orphaned indexes from previous failed migration attempts."""
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("DROP INDEX IF EXISTS cms_pricingfeature_slug_3ce54582_like;")
        cursor.execute("DROP INDEX IF EXISTS cms_pricingfeature_slug_3ce54582;")
        cursor.execute("DROP INDEX IF EXISTS cms_pricingfeature_slug_key;")


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0016_add_service_type_to_pages'),
    ]

    operations = [
        # Step 0: Clean up any orphaned indexes from previous attempts
        migrations.RunPython(drop_orphaned_indexes, noop),
        # Step 1: Add slug field as nullable (no index yet)
        migrations.AddField(
            model_name='pricingfeature',
            name='slug',
            field=models.SlugField(
                max_length=100,
                null=True,
                blank=True,
                db_index=False,
                help_text="Unique identifier for feature gating. Auto-generated from name if not provided. Cannot be changed after creation."
            ),
        ),
        # Step 2: Populate slugs for existing features
        migrations.RunPython(populate_slugs, reverse_populate_slugs),
        # Step 3: Make slug non-nullable and unique
        migrations.AlterField(
            model_name='pricingfeature',
            name='slug',
            field=models.SlugField(
                max_length=100,
                unique=True,
                help_text="Unique identifier for feature gating. Auto-generated from name if not provided. Cannot be changed after creation."
            ),
        ),
    ]
