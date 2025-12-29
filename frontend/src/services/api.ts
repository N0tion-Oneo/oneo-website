import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Extract base URL (without /api/v1) for media files
export const getBackendBaseUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  // Remove /api/v1 suffix to get the base URL
  return apiUrl.replace(/\/api\/v1\/?$/, '');
};

/**
 * Convert a relative media URL to an absolute URL.
 * Handles URLs like "/media/branding/logo.png" by prepending the backend base URL.
 */
export const getMediaUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  // If already absolute, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Prepend backend base URL for relative paths
  const baseUrl = getBackendBaseUrl();
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Token management functions
export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors and token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        // No refresh token, clear tokens and reject
        clearTokens();
        processQueue(error, null);
        isRefreshing = false;
        // Dispatch logout event for AuthContext to handle
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(error);
      }

      try {
        // Attempt to refresh the token
        const response = await axios.post(`${API_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });

        const { access, refresh } = response.data;
        setTokens(access, refresh);

        processQueue(null, access);
        isRefreshing = false;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and logout
        clearTokens();
        processQueue(refreshError as AxiosError, null);
        isRefreshing = false;
        // Dispatch logout event for AuthContext to handle
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(refreshError);
      }
    }

    // Handle other error codes
    if (error.response) {
      switch (error.response.status) {
        case 403:
          console.error('Forbidden access');
          break;
        case 404:
          console.error('Resource not found');
          break;
        case 500:
          console.error('Server error');
          break;
        default:
          console.error('An error occurred:', error.response.data);
      }
    }

    return Promise.reject(error);
  }
);

// Resume parsing
export const parseResume = async (file: File): Promise<import('@/types').ParsedResumeData> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/resume/parse/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Resume import
export interface ResumeImportResult {
  success: boolean;
  message: string;
  results: {
    profile_updated: boolean;
    user_updated: boolean;
    experiences_created: number;
    education_created: number;
    technologies_matched: string[];
    technologies_created: string[];
    skills_matched: string[];
    skills_created: string[];
  };
}

export const importResume = async (data: import('@/types').ParsedResumeData): Promise<ResumeImportResult> => {
  const response = await api.post('/resume/import/', data);
  return response.data;
};

// Admin Skills API
export interface AdminSkill {
  id: number;
  name: string;
  slug: string;
  category: string;
  is_active?: boolean;
  needs_review?: boolean;
}

export const adminGetSkills = async (params?: {
  include_inactive?: boolean;
  category?: string;
  search?: string;
  needs_review?: boolean;
}): Promise<AdminSkill[]> => {
  const response = await api.get('/admin/skills/', { params });
  return response.data;
};

export const adminCreateSkill = async (data: { name: string; category: string }): Promise<AdminSkill> => {
  const response = await api.post('/admin/skills/create/', data);
  return response.data;
};

export const adminUpdateSkill = async (
  skillId: number,
  data: { name?: string; category?: string; is_active?: boolean; needs_review?: boolean }
): Promise<AdminSkill> => {
  const response = await api.patch(`/admin/skills/${skillId}/`, data);
  return response.data;
};

export const adminDeleteSkill = async (skillId: number): Promise<void> => {
  await api.delete(`/admin/skills/${skillId}/delete/`);
};

export const adminMergeSkill = async (skillId: number, targetId: number): Promise<AdminSkill> => {
  const response = await api.post(`/admin/skills/${skillId}/merge/`, { target_id: targetId });
  return response.data;
};

// Admin Technologies API
export interface AdminTechnology {
  id: number;
  name: string;
  slug: string;
  category: string;
  is_active?: boolean;
  needs_review?: boolean;
}

export const adminGetTechnologies = async (params?: {
  include_inactive?: boolean;
  category?: string;
  search?: string;
  needs_review?: boolean;
}): Promise<AdminTechnology[]> => {
  const response = await api.get('/admin/technologies/', { params });
  return response.data;
};

export const adminCreateTechnology = async (data: { name: string; category: string }): Promise<AdminTechnology> => {
  const response = await api.post('/admin/technologies/create/', data);
  return response.data;
};

export const adminUpdateTechnology = async (
  technologyId: number,
  data: { name?: string; category?: string; is_active?: boolean; needs_review?: boolean }
): Promise<AdminTechnology> => {
  const response = await api.patch(`/admin/technologies/${technologyId}/`, data);
  return response.data;
};

export const adminDeleteTechnology = async (technologyId: number): Promise<void> => {
  await api.delete(`/admin/technologies/${technologyId}/delete/`);
};

export const adminMergeTechnology = async (technologyId: number, targetId: number): Promise<AdminTechnology> => {
  const response = await api.post(`/admin/technologies/${technologyId}/merge/`, { target_id: targetId });
  return response.data;
};

// Candidate Activity API
export interface CandidateActivityItem {
  id: string;
  type: 'application' | 'status_change' | 'note' | 'interview' | 'email' | 'profile_view' | 'profile_update';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: {
    job_title?: string;
    company_name?: string;
    old_status?: string;
    new_status?: string;
    user_name?: string;
  };
}

export const getCandidateActivity = async (candidateId: number): Promise<CandidateActivityItem[]> => {
  const response = await api.get(`/admin/candidates/${candidateId}/activity/`);
  return response.data;
};

// ============================================================================
// Company Update API
// ============================================================================

export const updateCompany = async (
  companyId: string,
  data: { onboarding_stage_id?: number | null; assigned_to_ids?: number[] }
): Promise<void> => {
  await api.patch(`/companies/${companyId}/detail/`, data);
};

// ============================================================================
// Candidate Update API
// ============================================================================

export const updateCandidate = async (
  candidateSlug: string,
  data: { onboarding_stage_id?: number | null; assigned_to_ids?: number[] }
): Promise<void> => {
  await api.patch(`/candidates/${candidateSlug}/`, data);
};

// ============================================================================
// Onboarding Stages API
// ============================================================================

import type { OnboardingStage, OnboardingEntityType, OnboardingStageInput, OnboardingStageUpdateInput, OnboardingHistory, StageIntegration } from '@/types';

export const getOnboardingStages = async (params?: {
  entity_type?: OnboardingEntityType;
  include_inactive?: boolean;
}): Promise<OnboardingStage[]> => {
  const response = await api.get('/onboarding-stages/', { params });
  return response.data;
};

export const createOnboardingStage = async (data: OnboardingStageInput): Promise<OnboardingStage> => {
  const response = await api.post('/onboarding-stages/create/', data);
  return response.data;
};

export const updateOnboardingStage = async (
  stageId: number,
  data: OnboardingStageUpdateInput
): Promise<OnboardingStage> => {
  const response = await api.patch(`/onboarding-stages/${stageId}/`, data);
  return response.data;
};

export const deleteOnboardingStage = async (stageId: number): Promise<void> => {
  await api.delete(`/onboarding-stages/${stageId}/delete/`);
};

export const reorderOnboardingStages = async (
  entityType: OnboardingEntityType,
  stageIds: number[]
): Promise<OnboardingStage[]> => {
  const response = await api.post('/onboarding-stages/reorder/', {
    entity_type: entityType,
    stage_ids: stageIds,
  });
  return response.data;
};

export const getOnboardingHistory = async (
  entityType: OnboardingEntityType,
  entityId: number
): Promise<OnboardingHistory[]> => {
  const response = await api.get(`/onboarding-history/${entityType}/${entityId}/`);
  return response.data;
};

export const getStageIntegrations = async (stageId: number): Promise<StageIntegration> => {
  const response = await api.get(`/onboarding-stages/${stageId}/integrations/`);
  return response.data;
};

// ============================================================================
// Client Onboarding Wizard API
// ============================================================================

export interface OnboardingContractOffer {
  service_type: string;
  monthly_retainer: string | null;
  placement_fee: string | null;
  csuite_placement_fee: string | null;
}

export interface OnboardingInviter {
  id: number;
  name: string;
  email: string;
  booking_slug: string | null;
}

export interface OnboardingStatus {
  is_complete: boolean;
  current_step: string | null;
  steps_completed: Record<string, boolean>;
  company_id: string | null;
  has_contract_offer: boolean;
  contract_offer: OnboardingContractOffer | null;
  inviter: OnboardingInviter | null;
}

export interface OnboardingProfileStepData {
  logo?: File;
  tagline?: string;
  description?: string;
  industry_id?: number | null;
  company_size?: string;
}

export interface OnboardingBillingStepData {
  legal_name?: string;
  vat_number?: string;
  registration_number?: string;
  billing_address?: string;
  billing_city?: string;
  billing_country_id?: number | null;
  billing_postal_code?: string;
  billing_contact_name?: string;
  billing_contact_email?: string;
  billing_contact_phone?: string;
}

export interface OnboardingContractStepData {
  company_name: string;
  service_type: 'headhunting' | 'retained';
  terms_accepted: boolean;
  terms_document_slug: string;
  terms_document_title?: string;
  terms_document_version?: string;
}

export const getOnboardingStatus = async (): Promise<OnboardingStatus> => {
  const response = await api.get('/companies/onboarding/status/');
  return response.data;
};

export const completeOnboardingStep = async (
  step: string,
  data: OnboardingProfileStepData | OnboardingBillingStepData | OnboardingContractStepData | Record<string, unknown>
): Promise<OnboardingStatus> => {
  // For profile step with logo, use FormData
  if (step === 'profile' && 'logo' in data && data.logo instanceof File) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value as string | Blob);
      }
    });
    const response = await api.post(`/companies/onboarding/step/${step}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  const response = await api.post(`/companies/onboarding/step/${step}/`, data);
  return response.data;
};

export const skipOnboardingStep = async (step: string): Promise<OnboardingStatus> => {
  const response = await api.post(`/companies/onboarding/skip/${step}/`);
  return response.data;
};

export default api;
