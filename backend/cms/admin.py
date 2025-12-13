from django.contrib import admin
from .models import (
    Page, BlogPost, FAQ, FAQCategory,
    GlossaryTerm, CaseStudy, ContactSubmission, NewsletterSubscriber
)


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ['title', 'slug', 'document_type', 'status', 'version', 'effective_date', 'updated_at']
    list_filter = ['document_type', 'status']
    search_fields = ['title', 'slug']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['created_at', 'updated_at']


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'category', 'status', 'is_featured', 'published_at']
    list_filter = ['status', 'is_featured', 'category']
    search_fields = ['title', 'slug', 'excerpt']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['created_at', 'updated_at', 'view_count']


@admin.register(FAQCategory)
class FAQCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'order', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ['question', 'category', 'order', 'is_active', 'is_featured']
    list_filter = ['is_active', 'is_featured', 'category']
    search_fields = ['question', 'answer_plain']


@admin.register(GlossaryTerm)
class GlossaryTermAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_active', 'updated_at']
    list_filter = ['is_active']
    search_fields = ['title', 'definition_plain']
    prepopulated_fields = {'slug': ('title',)}


@admin.register(CaseStudy)
class CaseStudyAdmin(admin.ModelAdmin):
    list_display = ['title', 'client_name', 'industry', 'status', 'is_featured']
    list_filter = ['status', 'is_featured', 'industry']
    search_fields = ['title', 'client_name', 'excerpt']
    prepopulated_fields = {'slug': ('title',)}


@admin.register(ContactSubmission)
class ContactSubmissionAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'subject', 'is_read', 'is_replied', 'created_at']
    list_filter = ['is_read', 'is_replied']
    search_fields = ['name', 'email', 'subject', 'message']
    readonly_fields = ['created_at']


@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display = ['email', 'name', 'is_active', 'source', 'created_at']
    list_filter = ['is_active', 'source']
    search_fields = ['email', 'name']
    readonly_fields = ['created_at']
