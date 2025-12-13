// CMS API Service
import api from './api';
import type {
  CMSPage,
  CMSPageInput,
  CMSPageListItem,
  CMSBlogPost,
  CMSBlogPostInput,
  CMSBlogPostListItem,
  CMSFAQCategory,
  CMSFAQCategoryInput,
  CMSFAQ,
  CMSFAQInput,
  CMSFAQCategoryWithFAQs,
  CMSGlossaryTerm,
  CMSGlossaryTermInput,
  CMSGlossaryTermListItem,
  CMSCaseStudy,
  CMSCaseStudyInput,
  CMSCaseStudyListItem,
  CMSContactSubmission,
  CMSContactSubmissionInput,
  CMSContactSubmissionUpdate,
  CMSNewsletterSubscriber,
  CMSNewsletterSubscribeInput,
  CMSSiteSettings,
  CMSAnalyticsSettings,
  CMSRobotsTxtSettings,
  CMSLLMsTxtSettings,
  CMSSitemapSettings,
  CMSRedirect,
  CMSRedirectInput,
  CMSMetaTagDefaults,
  CMSMetaTagDefaultsInput,
} from '@/types';

const CMS_BASE = '/cms';

// ============================================================================
// Helper for multipart form data
// ============================================================================

function toFormData(data: Record<string, unknown>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (value instanceof File) {
      formData.append(key, value);
    } else if (typeof value === 'object') {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  });
  return formData;
}

// ============================================================================
// Pages
// ============================================================================

export const cmsPages = {
  // Admin
  list: async (params?: { page_type?: string; status?: string }): Promise<CMSPageListItem[]> => {
    const { data } = await api.get(`${CMS_BASE}/admin/pages/`, { params });
    return data;
  },
  get: async (id: string): Promise<CMSPage> => {
    const { data } = await api.get(`${CMS_BASE}/admin/pages/${id}/`);
    return data;
  },
  create: async (input: CMSPageInput): Promise<CMSPage> => {
    const hasFile = input.og_image instanceof File;
    if (hasFile) {
      const { data } = await api.post(`${CMS_BASE}/admin/pages/create/`, toFormData(input as Record<string, unknown>), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await api.post(`${CMS_BASE}/admin/pages/create/`, input);
    return data;
  },
  update: async (id: string, input: Partial<CMSPageInput>): Promise<CMSPage> => {
    const hasFile = input.og_image instanceof File;
    if (hasFile) {
      const { data } = await api.patch(`${CMS_BASE}/admin/pages/${id}/update/`, toFormData(input as Record<string, unknown>), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await api.patch(`${CMS_BASE}/admin/pages/${id}/update/`, input);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`${CMS_BASE}/admin/pages/${id}/delete/`);
  },
  // Public
  getBySlug: async (slug: string): Promise<CMSPage> => {
    const { data } = await api.get(`${CMS_BASE}/pages/${slug}/`);
    return data;
  },
};

// ============================================================================
// Blog Posts
// ============================================================================

export const cmsBlog = {
  // Admin
  list: async (params?: { category?: string; status?: string; is_featured?: boolean }): Promise<CMSBlogPostListItem[]> => {
    const { data } = await api.get(`${CMS_BASE}/admin/blog/`, { params });
    return data;
  },
  get: async (id: string): Promise<CMSBlogPost> => {
    const { data } = await api.get(`${CMS_BASE}/admin/blog/${id}/`);
    return data;
  },
  create: async (input: CMSBlogPostInput): Promise<CMSBlogPost> => {
    const hasFile = input.featured_image instanceof File || input.og_image instanceof File;
    if (hasFile) {
      const { data } = await api.post(`${CMS_BASE}/admin/blog/create/`, toFormData(input as Record<string, unknown>), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await api.post(`${CMS_BASE}/admin/blog/create/`, input);
    return data;
  },
  update: async (id: string, input: Partial<CMSBlogPostInput>): Promise<CMSBlogPost> => {
    const hasFile = input.featured_image instanceof File || input.og_image instanceof File;
    if (hasFile) {
      const { data } = await api.patch(`${CMS_BASE}/admin/blog/${id}/update/`, toFormData(input as Record<string, unknown>), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await api.patch(`${CMS_BASE}/admin/blog/${id}/update/`, input);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`${CMS_BASE}/admin/blog/${id}/delete/`);
  },
  // Public
  listPublic: async (params?: { category?: string; tag?: string; featured?: boolean }): Promise<CMSBlogPostListItem[]> => {
    const { data } = await api.get(`${CMS_BASE}/blog/`, { params });
    return data;
  },
  getBySlug: async (slug: string, preview?: boolean): Promise<CMSBlogPost> => {
    const { data } = await api.get(`${CMS_BASE}/blog/${slug}/`, { params: preview ? { preview: 'true' } : {} });
    return data;
  },
  getCategories: async (): Promise<{ name: string; count: number }[]> => {
    const { data } = await api.get(`${CMS_BASE}/blog/categories/`);
    return data;
  },
};

// ============================================================================
// FAQs
// ============================================================================

export const cmsFAQs = {
  // Categories - Admin
  listCategories: async (): Promise<CMSFAQCategory[]> => {
    const { data } = await api.get(`${CMS_BASE}/admin/faq-categories/`);
    return data;
  },
  createCategory: async (input: CMSFAQCategoryInput): Promise<CMSFAQCategory> => {
    const { data } = await api.post(`${CMS_BASE}/admin/faq-categories/create/`, input);
    return data;
  },
  updateCategory: async (id: string, input: Partial<CMSFAQCategoryInput>): Promise<CMSFAQCategory> => {
    const { data } = await api.patch(`${CMS_BASE}/admin/faq-categories/${id}/update/`, input);
    return data;
  },
  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`${CMS_BASE}/admin/faq-categories/${id}/delete/`);
  },
  // FAQs - Admin
  list: async (params?: { category?: string; is_active?: boolean }): Promise<CMSFAQ[]> => {
    const { data } = await api.get(`${CMS_BASE}/admin/faqs/`, { params });
    return data;
  },
  get: async (id: string): Promise<CMSFAQ> => {
    const { data } = await api.get(`${CMS_BASE}/admin/faqs/${id}/`);
    return data;
  },
  create: async (input: CMSFAQInput): Promise<CMSFAQ> => {
    const { data } = await api.post(`${CMS_BASE}/admin/faqs/create/`, input);
    return data;
  },
  update: async (id: string, input: Partial<CMSFAQInput>): Promise<CMSFAQ> => {
    const { data } = await api.patch(`${CMS_BASE}/admin/faqs/${id}/update/`, input);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`${CMS_BASE}/admin/faqs/${id}/delete/`);
  },
  // Public
  getPublicFAQs: async (): Promise<CMSFAQCategoryWithFAQs[]> => {
    const { data } = await api.get(`${CMS_BASE}/faqs/`);
    return data;
  },
  getFeatured: async (): Promise<CMSFAQ[]> => {
    const { data } = await api.get(`${CMS_BASE}/faqs/featured/`);
    return data;
  },
};

// ============================================================================
// Glossary
// ============================================================================

export const cmsGlossary = {
  // Admin
  list: async (params?: { is_active?: boolean; search?: string }): Promise<CMSGlossaryTermListItem[]> => {
    const { data } = await api.get(`${CMS_BASE}/admin/glossary/`, { params });
    return data;
  },
  get: async (id: string): Promise<CMSGlossaryTerm> => {
    const { data } = await api.get(`${CMS_BASE}/admin/glossary/${id}/`);
    return data;
  },
  create: async (input: CMSGlossaryTermInput): Promise<CMSGlossaryTerm> => {
    const hasFile = input.og_image instanceof File;
    if (hasFile) {
      const { data } = await api.post(`${CMS_BASE}/admin/glossary/create/`, toFormData(input as Record<string, unknown>), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await api.post(`${CMS_BASE}/admin/glossary/create/`, input);
    return data;
  },
  update: async (id: string, input: Partial<CMSGlossaryTermInput>): Promise<CMSGlossaryTerm> => {
    const hasFile = input.og_image instanceof File;
    if (hasFile) {
      const { data } = await api.patch(`${CMS_BASE}/admin/glossary/${id}/update/`, toFormData(input as Record<string, unknown>), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await api.patch(`${CMS_BASE}/admin/glossary/${id}/update/`, input);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`${CMS_BASE}/admin/glossary/${id}/delete/`);
  },
  // Public
  listPublic: async (params?: { letter?: string }): Promise<CMSGlossaryTermListItem[]> => {
    const { data } = await api.get(`${CMS_BASE}/glossary/`, { params });
    return data;
  },
  getBySlug: async (slug: string): Promise<CMSGlossaryTerm> => {
    const { data } = await api.get(`${CMS_BASE}/glossary/${slug}/`);
    return data;
  },
  getAlphabet: async (): Promise<{ letters: string[] }> => {
    const { data } = await api.get(`${CMS_BASE}/glossary/alphabet/`);
    return data;
  },
};

// ============================================================================
// Case Studies
// ============================================================================

export const cmsCaseStudies = {
  // Admin
  list: async (params?: { industry?: string; status?: string; is_featured?: boolean }): Promise<CMSCaseStudyListItem[]> => {
    const { data } = await api.get(`${CMS_BASE}/admin/case-studies/`, { params });
    return data;
  },
  get: async (id: string): Promise<CMSCaseStudy> => {
    const { data } = await api.get(`${CMS_BASE}/admin/case-studies/${id}/`);
    return data;
  },
  create: async (input: CMSCaseStudyInput): Promise<CMSCaseStudy> => {
    const hasFile = input.featured_image instanceof File || input.client_logo instanceof File || input.og_image instanceof File;
    if (hasFile) {
      const { data } = await api.post(`${CMS_BASE}/admin/case-studies/create/`, toFormData(input as Record<string, unknown>), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await api.post(`${CMS_BASE}/admin/case-studies/create/`, input);
    return data;
  },
  update: async (id: string, input: Partial<CMSCaseStudyInput>): Promise<CMSCaseStudy> => {
    const hasFile = input.featured_image instanceof File || input.client_logo instanceof File || input.og_image instanceof File;
    if (hasFile) {
      const { data } = await api.patch(`${CMS_BASE}/admin/case-studies/${id}/update/`, toFormData(input as Record<string, unknown>), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await api.patch(`${CMS_BASE}/admin/case-studies/${id}/update/`, input);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`${CMS_BASE}/admin/case-studies/${id}/delete/`);
  },
  // Public
  listPublic: async (params?: { industry?: string; featured?: boolean }): Promise<CMSCaseStudyListItem[]> => {
    const { data } = await api.get(`${CMS_BASE}/case-studies/`, { params });
    return data;
  },
  getBySlug: async (slug: string): Promise<CMSCaseStudy> => {
    const { data } = await api.get(`${CMS_BASE}/case-studies/${slug}/`);
    return data;
  },
  getIndustries: async (): Promise<{ name: string; count: number }[]> => {
    const { data } = await api.get(`${CMS_BASE}/case-studies/industries/`);
    return data;
  },
};

// ============================================================================
// Contact Submissions
// ============================================================================

export const cmsContact = {
  // Admin
  list: async (params?: { is_read?: boolean; is_replied?: boolean }): Promise<CMSContactSubmission[]> => {
    const { data } = await api.get(`${CMS_BASE}/admin/contact/`, { params });
    return data;
  },
  get: async (id: string): Promise<CMSContactSubmission> => {
    const { data } = await api.get(`${CMS_BASE}/admin/contact/${id}/`);
    return data;
  },
  update: async (id: string, input: CMSContactSubmissionUpdate): Promise<CMSContactSubmission> => {
    const { data } = await api.patch(`${CMS_BASE}/admin/contact/${id}/update/`, input);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`${CMS_BASE}/admin/contact/${id}/delete/`);
  },
  // Public
  submit: async (input: CMSContactSubmissionInput): Promise<{ message: string }> => {
    const { data } = await api.post(`${CMS_BASE}/contact/`, input);
    return data;
  },
};

// ============================================================================
// Newsletter
// ============================================================================

export const cmsNewsletter = {
  // Admin
  list: async (params?: { is_active?: boolean }): Promise<CMSNewsletterSubscriber[]> => {
    const { data } = await api.get(`${CMS_BASE}/admin/newsletter/`, { params });
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`${CMS_BASE}/admin/newsletter/${id}/delete/`);
  },
  // Public
  subscribe: async (input: CMSNewsletterSubscribeInput): Promise<{ message: string }> => {
    const { data } = await api.post(`${CMS_BASE}/newsletter/subscribe/`, input);
    return data;
  },
};

// ============================================================================
// Site Settings
// ============================================================================

export const cmsSiteSettings = {
  // Get all settings
  get: async (): Promise<CMSSiteSettings> => {
    const { data } = await api.get(`${CMS_BASE}/admin/settings/`);
    return data;
  },
  // Update all settings
  update: async (input: Partial<CMSSiteSettings>): Promise<CMSSiteSettings> => {
    const { data } = await api.patch(`${CMS_BASE}/admin/settings/update/`, input);
    return data;
  },
  // Analytics settings
  getAnalytics: async (): Promise<CMSAnalyticsSettings> => {
    const { data } = await api.get(`${CMS_BASE}/admin/settings/analytics/`);
    return data;
  },
  updateAnalytics: async (input: Partial<CMSAnalyticsSettings>): Promise<CMSAnalyticsSettings> => {
    const { data } = await api.patch(`${CMS_BASE}/admin/settings/analytics/`, input);
    return data;
  },
  // Robots.txt settings
  getRobotsTxt: async (): Promise<CMSRobotsTxtSettings> => {
    const { data } = await api.get(`${CMS_BASE}/admin/settings/robots-txt/`);
    return data;
  },
  updateRobotsTxt: async (input: CMSRobotsTxtSettings): Promise<CMSRobotsTxtSettings> => {
    const { data } = await api.patch(`${CMS_BASE}/admin/settings/robots-txt/`, input);
    return data;
  },
  // LLMs.txt settings
  getLLMsTxt: async (): Promise<CMSLLMsTxtSettings> => {
    const { data } = await api.get(`${CMS_BASE}/admin/settings/llms-txt/`);
    return data;
  },
  updateLLMsTxt: async (input: CMSLLMsTxtSettings): Promise<CMSLLMsTxtSettings> => {
    const { data } = await api.patch(`${CMS_BASE}/admin/settings/llms-txt/`, input);
    return data;
  },
  // Sitemap settings
  getSitemap: async (): Promise<CMSSitemapSettings> => {
    const { data } = await api.get(`${CMS_BASE}/admin/settings/sitemap/`);
    return data;
  },
  updateSitemap: async (input: Partial<CMSSitemapSettings>): Promise<CMSSitemapSettings> => {
    const { data } = await api.patch(`${CMS_BASE}/admin/settings/sitemap/`, input);
    return data;
  },
  // Public analytics settings (for frontend GA initialization)
  getPublicAnalytics: async (): Promise<CMSAnalyticsSettings> => {
    const { data } = await api.get(`${CMS_BASE}/analytics/`);
    return data;
  },
};

// ============================================================================
// Public SEO Files (robots.txt, llms.txt, sitemap.xml)
// ============================================================================

export const cmsPublicSeo = {
  getRobotsTxt: async (): Promise<string> => {
    const { data } = await api.get(`${CMS_BASE}/robots.txt`, {
      transformResponse: [(data) => data], // Return raw text
    });
    return data;
  },
  getLLMsTxt: async (): Promise<string> => {
    const { data } = await api.get(`${CMS_BASE}/llms.txt`, {
      transformResponse: [(data) => data], // Return raw text
    });
    return data;
  },
  getSitemapXml: async (): Promise<string> => {
    const { data } = await api.get(`${CMS_BASE}/sitemap.xml`, {
      transformResponse: [(data) => data], // Return raw XML
    });
    return data;
  },
};

// ============================================================================
// SEO - Redirects
// ============================================================================

export const cmsSeoRedirects = {
  list: async (params?: { is_active?: boolean; search?: string }): Promise<CMSRedirect[]> => {
    const { data } = await api.get(`${CMS_BASE}/admin/seo/redirects/`, { params });
    return data;
  },
  get: async (id: string): Promise<CMSRedirect> => {
    const { data } = await api.get(`${CMS_BASE}/admin/seo/redirects/${id}/`);
    return data;
  },
  create: async (input: CMSRedirectInput): Promise<CMSRedirect> => {
    const { data } = await api.post(`${CMS_BASE}/admin/seo/redirects/`, input);
    return data;
  },
  update: async (id: string, input: Partial<CMSRedirectInput>): Promise<CMSRedirect> => {
    const { data } = await api.put(`${CMS_BASE}/admin/seo/redirects/${id}/`, input);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`${CMS_BASE}/admin/seo/redirects/${id}/`);
  },
  bulkDelete: async (ids: string[]): Promise<{ deleted: number }> => {
    const { data } = await api.post(`${CMS_BASE}/admin/seo/redirects/bulk-delete/`, { ids });
    return data;
  },
};

// ============================================================================
// SEO - Meta Tag Defaults
// ============================================================================

export const cmsSeoMetaDefaults = {
  get: async (): Promise<CMSMetaTagDefaults> => {
    const { data } = await api.get(`${CMS_BASE}/admin/seo/meta-defaults/`);
    return data;
  },
  update: async (input: CMSMetaTagDefaultsInput): Promise<CMSMetaTagDefaults> => {
    const hasFile = input.default_og_image instanceof File;
    if (hasFile) {
      const { data } = await api.put(`${CMS_BASE}/admin/seo/meta-defaults/`, toFormData(input as Record<string, unknown>), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await api.put(`${CMS_BASE}/admin/seo/meta-defaults/`, input);
    return data;
  },
  // Public endpoint (no auth required)
  getPublic: async (): Promise<CMSMetaTagDefaults> => {
    const { data } = await api.get(`${CMS_BASE}/seo-defaults/`);
    return data;
  },
};

// ============================================================================
// Page SEO Settings
// ============================================================================

import type { CMSPageSEO, CMSPageSEOInput, CMSPageSEOPublic } from '@/types';

export const cmsPageSeo = {
  // Admin endpoints
  list: async (params?: { is_active?: boolean; search?: string }): Promise<CMSPageSEO[]> => {
    const { data } = await api.get(`${CMS_BASE}/admin/seo/pages/`, { params });
    return data;
  },
  get: async (id: string): Promise<CMSPageSEO> => {
    const { data } = await api.get(`${CMS_BASE}/admin/seo/pages/${id}/`);
    return data;
  },
  create: async (input: CMSPageSEOInput): Promise<CMSPageSEO> => {
    const hasFile = input.og_image instanceof File;
    if (hasFile) {
      const { data } = await api.post(`${CMS_BASE}/admin/seo/pages/`, toFormData(input as Record<string, unknown>), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await api.post(`${CMS_BASE}/admin/seo/pages/`, input);
    return data;
  },
  update: async (id: string, input: Partial<CMSPageSEOInput>): Promise<CMSPageSEO> => {
    const hasFile = input.og_image instanceof File;
    if (hasFile) {
      const { data } = await api.put(`${CMS_BASE}/admin/seo/pages/${id}/`, toFormData(input as Record<string, unknown>), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await api.put(`${CMS_BASE}/admin/seo/pages/${id}/`, input);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`${CMS_BASE}/admin/seo/pages/${id}/`);
  },
  // Sync system pages (auto-populate from registry)
  syncSystemPages: async (): Promise<{ message: string; created: number; existing: number }> => {
    const { data } = await api.post(`${CMS_BASE}/admin/seo/pages/sync/`);
    return data;
  },
  // Public endpoints (no auth required)
  getByPath: async (path: string): Promise<CMSPageSEOPublic | null> => {
    try {
      const { data } = await api.get(`${CMS_BASE}/page-seo/`, { params: { path } });
      return data;
    } catch {
      return null;
    }
  },
  getAll: async (): Promise<CMSPageSEOPublic[]> => {
    const { data } = await api.get(`${CMS_BASE}/page-seo/all/`);
    return data;
  },
};

// ============================================================================
// Pricing Configuration
// ============================================================================

export interface CMSPricingConfig {
  id: string;
  // Enterprise pricing
  enterprise_markup_year1: string;
  enterprise_markup_year2: string;
  enterprise_markup_year3: string;
  enterprise_markup_year4_plus: string;
  enterprise_additionals_fee: string;
  enterprise_assets_fee: string;
  // EOR pricing
  eor_monthly_fee: string;
  eor_additionals_fee: string;
  eor_assets_fee: string;
  // Retained pricing
  retained_monthly_retainer: string;
  retained_placement_fee: string;
  // Headhunting pricing
  headhunting_placement_fee: string;
  // Default calculator values
  default_salary: string;
  default_desk_fee: string;
  default_lunch_fee: string;
  default_event_cost: string;
  default_party_cost: string;
  default_asset_cost: string;
  // Audit
  updated_at: string;
  updated_by_name: string | null;
}

export interface CMSPricingConfigUpdate {
  enterprise_markup_year1?: string;
  enterprise_markup_year2?: string;
  enterprise_markup_year3?: string;
  enterprise_markup_year4_plus?: string;
  enterprise_additionals_fee?: string;
  enterprise_assets_fee?: string;
  eor_monthly_fee?: string;
  eor_additionals_fee?: string;
  eor_assets_fee?: string;
  retained_monthly_retainer?: string;
  retained_placement_fee?: string;
  headhunting_placement_fee?: string;
  default_salary?: string;
  default_desk_fee?: string;
  default_lunch_fee?: string;
  default_event_cost?: string;
  default_party_cost?: string;
  default_asset_cost?: string;
}

export interface CMSPricingFeature {
  id: string;
  name: string;
  category: 'recruitment' | 'retained' | 'employment' | 'additional';
  order: number;
  is_active: boolean;
  included_in_enterprise: boolean;
  included_in_eor: boolean;
  included_in_retained: boolean;
  included_in_headhunting: boolean;
  created_at: string;
  updated_at: string;
}

export interface CMSPricingFeatureInput {
  name: string;
  category: 'recruitment' | 'retained' | 'employment' | 'additional';
  order?: number;
  is_active?: boolean;
  included_in_enterprise?: boolean;
  included_in_eor?: boolean;
  included_in_retained?: boolean;
  included_in_headhunting?: boolean;
}

export const cmsPricing = {
  // Public endpoints
  getConfigPublic: async (): Promise<CMSPricingConfig> => {
    const { data } = await api.get(`${CMS_BASE}/pricing/config/`);
    return data;
  },
  getFeaturesPublic: async (): Promise<CMSPricingFeature[]> => {
    const { data } = await api.get(`${CMS_BASE}/pricing/features/`);
    return data;
  },
  // Admin endpoints
  getConfig: async (): Promise<CMSPricingConfig> => {
    const { data } = await api.get(`${CMS_BASE}/admin/pricing/config/`);
    return data;
  },
  updateConfig: async (input: CMSPricingConfigUpdate): Promise<CMSPricingConfig> => {
    const { data } = await api.patch(`${CMS_BASE}/admin/pricing/config/update/`, input);
    return data;
  },
  listFeatures: async (): Promise<CMSPricingFeature[]> => {
    const { data } = await api.get(`${CMS_BASE}/admin/pricing/features/`);
    return data;
  },
  createFeature: async (input: CMSPricingFeatureInput): Promise<CMSPricingFeature> => {
    const { data } = await api.post(`${CMS_BASE}/admin/pricing/features/`, input);
    return data;
  },
  getFeature: async (id: string): Promise<CMSPricingFeature> => {
    const { data } = await api.get(`${CMS_BASE}/admin/pricing/features/${id}/`);
    return data;
  },
  updateFeature: async (id: string, input: Partial<CMSPricingFeatureInput>): Promise<CMSPricingFeature> => {
    const { data } = await api.patch(`${CMS_BASE}/admin/pricing/features/${id}/`, input);
    return data;
  },
  deleteFeature: async (id: string): Promise<void> => {
    await api.delete(`${CMS_BASE}/admin/pricing/features/${id}/`);
  },
  reorderFeatures: async (featureIds: string[]): Promise<CMSPricingFeature[]> => {
    const { data } = await api.post(`${CMS_BASE}/admin/pricing/features/reorder/`, { feature_ids: featureIds });
    return data;
  },
};

