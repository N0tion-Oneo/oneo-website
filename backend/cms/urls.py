"""CMS URL Configuration."""
from django.urls import path
from . import views

urlpatterns = [
    # ==========================================================================
    # Admin/Staff Endpoints (require authentication)
    # ==========================================================================

    # Pages
    path('admin/pages/', views.list_pages, name='cms-admin-pages-list'),
    path('admin/pages/create/', views.create_page, name='cms-admin-pages-create'),
    path('admin/pages/<uuid:page_id>/', views.get_page, name='cms-admin-pages-detail'),
    path('admin/pages/<uuid:page_id>/update/', views.update_page, name='cms-admin-pages-update'),
    path('admin/pages/<uuid:page_id>/delete/', views.delete_page, name='cms-admin-pages-delete'),

    # Blog Posts
    path('admin/blog/', views.list_blog_posts, name='cms-admin-blog-list'),
    path('admin/blog/create/', views.create_blog_post, name='cms-admin-blog-create'),
    path('admin/blog/<uuid:post_id>/', views.get_blog_post, name='cms-admin-blog-detail'),
    path('admin/blog/<uuid:post_id>/update/', views.update_blog_post, name='cms-admin-blog-update'),
    path('admin/blog/<uuid:post_id>/delete/', views.delete_blog_post, name='cms-admin-blog-delete'),

    # FAQ Categories
    path('admin/faq-categories/', views.list_faq_categories, name='cms-admin-faq-categories-list'),
    path('admin/faq-categories/create/', views.create_faq_category, name='cms-admin-faq-categories-create'),
    path('admin/faq-categories/<uuid:category_id>/update/', views.update_faq_category, name='cms-admin-faq-categories-update'),
    path('admin/faq-categories/<uuid:category_id>/delete/', views.delete_faq_category, name='cms-admin-faq-categories-delete'),

    # FAQs
    path('admin/faqs/', views.list_faqs, name='cms-admin-faqs-list'),
    path('admin/faqs/create/', views.create_faq, name='cms-admin-faqs-create'),
    path('admin/faqs/<uuid:faq_id>/', views.get_faq, name='cms-admin-faqs-detail'),
    path('admin/faqs/<uuid:faq_id>/update/', views.update_faq, name='cms-admin-faqs-update'),
    path('admin/faqs/<uuid:faq_id>/delete/', views.delete_faq, name='cms-admin-faqs-delete'),

    # Glossary Terms
    path('admin/glossary/', views.list_glossary_terms, name='cms-admin-glossary-list'),
    path('admin/glossary/create/', views.create_glossary_term, name='cms-admin-glossary-create'),
    path('admin/glossary/<uuid:term_id>/', views.get_glossary_term, name='cms-admin-glossary-detail'),
    path('admin/glossary/<uuid:term_id>/update/', views.update_glossary_term, name='cms-admin-glossary-update'),
    path('admin/glossary/<uuid:term_id>/delete/', views.delete_glossary_term, name='cms-admin-glossary-delete'),

    # Case Studies
    path('admin/case-studies/', views.list_case_studies, name='cms-admin-case-studies-list'),
    path('admin/case-studies/create/', views.create_case_study, name='cms-admin-case-studies-create'),
    path('admin/case-studies/<uuid:study_id>/', views.get_case_study, name='cms-admin-case-studies-detail'),
    path('admin/case-studies/<uuid:study_id>/update/', views.update_case_study, name='cms-admin-case-studies-update'),
    path('admin/case-studies/<uuid:study_id>/delete/', views.delete_case_study, name='cms-admin-case-studies-delete'),

    # Contact Submissions
    path('admin/contact/', views.list_contact_submissions, name='cms-admin-contact-list'),
    path('admin/contact/<uuid:submission_id>/', views.get_contact_submission, name='cms-admin-contact-detail'),
    path('admin/contact/<uuid:submission_id>/update/', views.update_contact_submission, name='cms-admin-contact-update'),
    path('admin/contact/<uuid:submission_id>/delete/', views.delete_contact_submission, name='cms-admin-contact-delete'),

    # Newsletter Subscribers
    path('admin/newsletter/', views.list_newsletter_subscribers, name='cms-admin-newsletter-list'),
    path('admin/newsletter/<uuid:subscriber_id>/delete/', views.delete_newsletter_subscriber, name='cms-admin-newsletter-delete'),

    # Site Settings (Admin)
    path('admin/settings/', views.get_site_settings, name='cms-admin-settings'),
    path('admin/settings/update/', views.update_site_settings, name='cms-admin-settings-update'),
    path('admin/settings/analytics/', views.analytics_settings, name='cms-admin-settings-analytics'),
    path('admin/settings/robots-txt/', views.robots_txt_settings, name='cms-admin-settings-robots'),
    path('admin/settings/llms-txt/', views.llms_txt_settings, name='cms-admin-settings-llms'),
    path('admin/settings/sitemap/', views.sitemap_settings, name='cms-admin-settings-sitemap'),

    # SEO - Redirects
    path('admin/seo/redirects/', views.list_redirects, name='cms-admin-seo-redirects'),
    path('admin/seo/redirects/<uuid:pk>/', views.redirect_detail, name='cms-admin-seo-redirect-detail'),
    path('admin/seo/redirects/bulk-delete/', views.bulk_delete_redirects, name='cms-admin-seo-redirects-bulk-delete'),

    # SEO - Meta Tag Defaults
    path('admin/seo/meta-defaults/', views.meta_tag_defaults, name='cms-admin-seo-meta-defaults'),

    # SEO - Page SEO Settings
    path('admin/seo/pages/', views.list_page_seo, name='cms-admin-seo-pages'),
    path('admin/seo/pages/sync/', views.sync_system_pages, name='cms-admin-seo-pages-sync'),
    path('admin/seo/pages/<uuid:pk>/', views.page_seo_detail, name='cms-admin-seo-page-detail'),

    # Pricing Configuration (Admin)
    path('admin/pricing/config/', views.get_pricing_config, name='cms-admin-pricing-config'),
    path('admin/pricing/config/update/', views.update_pricing_config, name='cms-admin-pricing-config-update'),
    path('admin/pricing/features/', views.list_pricing_features, name='cms-admin-pricing-features'),
    path('admin/pricing/features/<uuid:feature_id>/', views.pricing_feature_detail, name='cms-admin-pricing-feature-detail'),
    path('admin/pricing/features/reorder/', views.reorder_pricing_features, name='cms-admin-pricing-features-reorder'),

    # Billing Configuration (Admin)
    path('admin/billing/config/', views.get_billing_config, name='cms-admin-billing-config'),
    path('admin/billing/config/update/', views.update_billing_config, name='cms-admin-billing-config-update'),

    # ==========================================================================
    # Public Endpoints
    # ==========================================================================

    # Pages
    path('pages/', views.list_public_pages, name='cms-public-pages-list'),
    path('pages/<slug:slug>/', views.get_public_page, name='cms-public-page'),

    # Blog
    path('blog/', views.list_public_blog_posts, name='cms-public-blog-list'),
    path('blog/categories/', views.get_blog_categories, name='cms-public-blog-categories'),
    path('blog/<slug:slug>/', views.get_public_blog_post, name='cms-public-blog-detail'),

    # FAQs
    path('faqs/', views.get_public_faqs, name='cms-public-faqs'),
    path('faqs/featured/', views.get_featured_faqs, name='cms-public-faqs-featured'),

    # Glossary
    path('glossary/', views.list_public_glossary_terms, name='cms-public-glossary-list'),
    path('glossary/alphabet/', views.get_glossary_alphabet, name='cms-public-glossary-alphabet'),
    path('glossary/<slug:slug>/', views.get_public_glossary_term, name='cms-public-glossary-detail'),

    # Case Studies
    path('case-studies/', views.list_public_case_studies, name='cms-public-case-studies-list'),
    path('case-studies/industries/', views.get_case_study_industries, name='cms-public-case-studies-industries'),
    path('case-studies/<slug:slug>/', views.get_public_case_study, name='cms-public-case-studies-detail'),

    # Contact Form
    path('contact/', views.submit_contact_form, name='cms-public-contact'),

    # Newsletter
    path('newsletter/subscribe/', views.subscribe_to_newsletter, name='cms-public-newsletter-subscribe'),

    # Sitemap
    path('sitemap.xml', views.sitemap_xml, name='sitemap'),

    # Robots.txt and LLMs.txt (served from CMS)
    path('robots.txt', views.robots_txt, name='robots-txt'),
    path('llms.txt', views.llms_txt, name='llms-txt'),

    # Public Analytics Settings (for frontend to load GA) - DEPRECATED, use seo-defaults
    path('analytics/', views.get_public_analytics_settings, name='cms-public-analytics'),

    # Public SEO Defaults (title suffix, description, OG image, verification codes, analytics)
    path('seo-defaults/', views.get_public_seo_defaults, name='cms-public-seo-defaults'),

    # Public Page SEO (for frontend to fetch SEO by route)
    path('page-seo/', views.get_page_seo_by_path, name='cms-public-page-seo'),
    path('page-seo/all/', views.get_all_page_seo_public, name='cms-public-page-seo-all'),

    # Pricing (Public)
    path('pricing/config/', views.get_public_pricing_config, name='cms-public-pricing-config'),
    path('pricing/features/', views.list_public_pricing_features, name='cms-public-pricing-features'),

    # Billing (Public)
    path('billing/payment-terms/', views.get_public_payment_terms, name='cms-public-payment-terms'),
]
