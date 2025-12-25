import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { SEOProvider } from '@/contexts/SEOContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { ProtectedRoute, PublicRoute } from '@/components/auth';
import { BrandingProvider } from '@/components/branding';
import {
  LoginPage,
  SignupPage,
  ClientSignupPage,
  CompanySignupPage,
  RecruiterSignupPage,
  CandidateSignupPage,
  DashboardPage,
  ProfilePage,
  InvitationsPage,
  JobsPage,
  NewJobPage,
  EditJobPage,
  ApplicationsPage,
  AdminCompaniesPage,
  AdminCompanyEditPage,
  LeadsPage,
  AdminCandidatesPage,
  AdminCandidateEditPage,
  CandidatesPage,
  AdminApplicationsPage,
  AdminJobsPage,
  AdminNewJobPage,
  PlatformTeamPage,
  PlatformCompanyPage,
  AdminSkillsTechnologiesPage,
  OnboardingStagesSettingsPage,
  DashboardSettingsPage,
  NotificationsAdminPage,
  SendNotificationPage,
  NotificationTemplatesPage,
  NotificationTemplateEditPage,
  BrandingSettingsPage,
  HomePage,
  CandidatesDirectoryPage,
  CandidateProfilePage,
  CompaniesDirectoryPage,
  CompanyProfilePage,
  CompanyEditorPage,
  JobsListingPage,
  JobDetailPage,
  CalendarOAuthCallback,
  XeroOAuthCallback,
  ProfileSettingsPage,
  CalendarSettingsPage,
  IntegrationsPage,
  RecruiterProfilePage,
  BookingManagementPage,
  AnalyticsPage,
  FeedPage,
  FeedArticleEditorPage,
  FeedPostDetailPage,
  SubscriptionsPage,
  // CMS Dashboard Pages
  CMSOverviewPage,
  CMSPagesListPage,
  CMSPageEditorPage,
  CMSLegalListPage,
  CMSLegalEditorPage,
  CMSBlogListPage,
  CMSBlogEditorPage,
  CMSFAQsPage,
  CMSGlossaryPage,
  CMSGlossaryEditorPage,
  CMSCaseStudiesPage,
  CMSCaseStudyEditorPage,
  CMSContactSubmissionsPage,
  CMSNewsletterPage,
  CMSSitemapSettingsPage,
  CMSRobotsTxtPage,
  CMSLLMsTxtPage,
  CMSRedirectsPage,
  CMSSeoMetaPage,
  CMSPageSeoPage,
  CMSPricingPage,
  // Public CMS Pages
  CMSPageView,
  BlogListPage,
  BlogPostPage,
  CaseStudyListPage,
  CaseStudyPage,
  ContactPage,
  FAQPage,
  GlossaryListPage,
  GlossaryTermPage,
  // SEO Files
  SitemapXmlPage,
  RobotsTxtPage,
  LLMsTxtPage,
  // Service Pages
  EORPage,
  RetainedRecruitmentPage,
  HeadhuntingPage,
  EnterprisePage,
  PricingCalculatorPage,
} from '@/pages';
import { BookingPage, RecruiterBookingPage } from '@/pages/booking';
import { CandidateDashboardLayout, SettingsLayout, CMSLayout } from '@/layouts';
import { GoogleAnalytics } from '@/components/analytics';
import { ScrollToTop } from '@/components/ScrollToTop';
import './App.css';

// Redirect component for old job applications route
function JobApplicationsRedirect() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (jobId) {
      navigate(`/dashboard/applications?job=${jobId}`, { replace: true })
    } else {
      navigate('/dashboard/applications', { replace: true })
    }
  }, [jobId, navigate])

  return null
}

function App() {
  return (
    <BrandingProvider>
      <SEOProvider>
        <AuthProvider>
          <SubscriptionProvider>
          <ToastProvider>
          <GoogleAnalytics />
          <ScrollToTop />
        <Routes>
        {/* Home page - accessible to all */}
        <Route path="/" element={<HomePage />} />

        {/* Public routes - redirect to dashboard if already logged in */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          }
        />

        {/* Client signup via invitation link - no auth required */}
        <Route path="/signup/client/:token" element={<ClientSignupPage />} />

        {/* Company team member signup via invitation link - no auth required */}
        <Route path="/signup/company/:token" element={<CompanySignupPage />} />

        {/* Recruiter signup via invitation link - no auth required */}
        <Route path="/signup/recruiter/:token" element={<RecruiterSignupPage />} />

        {/* Candidate signup via booking invitation link - no auth required */}
        <Route path="/signup/candidate/:token" element={<CandidateSignupPage />} />

        {/* Protected dashboard routes with sidebar layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <CandidateDashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
                    <Route path="company" element={<CompanyEditorPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/new" element={<NewJobPage />} />
          <Route path="jobs/:jobId" element={<EditJobPage />} />
          <Route path="jobs/:jobId/applications" element={<JobApplicationsRedirect />} />
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="applications" element={<AdminApplicationsPage />} />
          <Route path="my-applications" element={<ApplicationsPage />} />
          <Route path="bookings" element={<BookingManagementPage />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="feed/create/article" element={<FeedArticleEditorPage />} />
          <Route path="feed/:postId" element={<FeedPostDetailPage />} />
          {/* Settings routes with sidebar */}
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<ProfileSettingsPage />} />
            <Route path="recruiter-profile" element={<RecruiterProfilePage />} />
            <Route path="bookings" element={<BookingManagementPage />} />
            <Route path="calendar" element={<CalendarSettingsPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="invitations" element={<InvitationsPage />} />
            <Route path="notifications" element={<NotificationsAdminPage />} />
            <Route path="notifications/send" element={<SendNotificationPage />} />
            <Route path="notifications/templates" element={<NotificationTemplatesPage />} />
            <Route path="notifications/templates/new" element={<NotificationTemplateEditPage />} />
            <Route path="notifications/templates/:templateId" element={<NotificationTemplateEditPage />} />
            <Route path="skills-technologies" element={<AdminSkillsTechnologiesPage />} />
            <Route path="onboarding-stages" element={<OnboardingStagesSettingsPage />} />
            <Route path="branding" element={<BrandingSettingsPage />} />
            <Route path="platform-company" element={<PlatformCompanyPage />} />
            <Route path="team" element={<PlatformTeamPage />} />
            <Route path="dashboard" element={<DashboardSettingsPage />} />
          </Route>
          {/* Admin/Recruiter routes */}
          <Route path="admin/companies" element={<AdminCompaniesPage />} />
          <Route path="admin/companies/:companyId" element={<AdminCompanyEditPage />} />
          <Route path="admin/leads" element={<LeadsPage />} />
          <Route path="admin/candidates" element={<AdminCandidatesPage />} />
          <Route path="admin/candidates/:slug" element={<AdminCandidateEditPage />} />
          <Route path="admin/jobs" element={<AdminJobsPage />} />
          <Route path="admin/jobs/new" element={<AdminNewJobPage />} />
          <Route path="admin/analytics" element={<AnalyticsPage />} />
          <Route path="admin/subscriptions" element={<SubscriptionsPage />} />
          {/* Redirect old admin/applications URL */}
          <Route path="admin/applications" element={<Navigate to="/dashboard/applications" replace />} />
          {/* CMS Dashboard routes with CMSLayout */}
          <Route path="cms" element={<CMSLayout />}>
            <Route index element={<CMSOverviewPage />} />
            {/* Legal Documents */}
            <Route path="legal" element={<CMSLegalListPage />} />
            <Route path="legal/new" element={<CMSLegalEditorPage />} />
            <Route path="legal/:docId" element={<CMSLegalEditorPage />} />
            {/* Legacy pages routes - redirect to legal */}
            <Route path="pages" element={<CMSPagesListPage />} />
            <Route path="pages/new" element={<CMSPageEditorPage />} />
            <Route path="pages/:pageId" element={<CMSPageEditorPage />} />
            <Route path="blog" element={<CMSBlogListPage />} />
            <Route path="blog/new" element={<CMSBlogEditorPage />} />
            <Route path="blog/:postId" element={<CMSBlogEditorPage />} />
            <Route path="faqs" element={<CMSFAQsPage />} />
            <Route path="glossary" element={<CMSGlossaryPage />} />
            <Route path="glossary/new" element={<CMSGlossaryEditorPage />} />
            <Route path="glossary/:termId" element={<CMSGlossaryEditorPage />} />
            <Route path="case-studies" element={<CMSCaseStudiesPage />} />
            <Route path="case-studies/new" element={<CMSCaseStudyEditorPage />} />
            <Route path="case-studies/:studyId" element={<CMSCaseStudyEditorPage />} />
            <Route path="contact" element={<CMSContactSubmissionsPage />} />
            <Route path="newsletter" element={<CMSNewsletterPage />} />
            {/* CMS Settings */}
            <Route path="settings/sitemap" element={<CMSSitemapSettingsPage />} />
            <Route path="settings/robots" element={<CMSRobotsTxtPage />} />
            <Route path="settings/llms" element={<CMSLLMsTxtPage />} />
            {/* SEO Management */}
            <Route path="seo/meta" element={<CMSSeoMetaPage />} />
            <Route path="seo/pages" element={<CMSPageSeoPage />} />
            <Route path="seo/redirects" element={<CMSRedirectsPage />} />
            {/* Pricing */}
            <Route path="pricing" element={<CMSPricingPage />} />
          </Route>
        </Route>

        {/* Public candidates directory */}
        <Route path="/candidates" element={<CandidatesDirectoryPage />} />
        <Route path="/candidates/:slug" element={<CandidateProfilePage />} />

        {/* Public companies directory */}
        <Route path="/companies" element={<CompaniesDirectoryPage />} />
        <Route path="/companies/:slug" element={<CompanyProfilePage />} />

        {/* Public jobs board */}
        <Route path="/jobs" element={<JobsListingPage />} />
        <Route path="/jobs/:slug" element={<JobDetailPage />} />

        <Route path="/blog" element={<BlogListPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/case-studies" element={<CaseStudyListPage />} />
        <Route path="/case-studies/:slug" element={<CaseStudyPage />} />
        <Route path="/faqs" element={<FAQPage />} />
        <Route path="/glossary" element={<GlossaryListPage />} />
        <Route path="/glossary/:slug" element={<GlossaryTermPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Service Pages */}
        <Route path="/eor" element={<EORPage />} />
        <Route path="/retained-recruitment" element={<RetainedRecruitmentPage />} />
        <Route path="/headhunting" element={<HeadhuntingPage />} />
        <Route path="/enterprise" element={<EnterprisePage />} />
        <Route path="/pricing" element={<PricingCalculatorPage />} />

        {/* Public booking page (Calendly-like self-scheduling for interviews) */}
        <Route path="/book/:token" element={<BookingPage />} />

        {/* Public recruiter booking pages (for sales/recruitment meetings) */}
        <Route path="/meet/:bookingSlug" element={<RecruiterBookingPage />} />
        <Route path="/meet/:bookingSlug/:meetingTypeSlug" element={<RecruiterBookingPage />} />

        {/* OAuth callback routes (for calendar integration) */}
        <Route
          path="/settings/calendar/:provider/callback"
          element={
            <ProtectedRoute>
              <CalendarOAuthCallback />
            </ProtectedRoute>
          }
        />

        {/* Xero OAuth callback */}
        <Route
          path="/settings/integrations/xero/callback"
          element={
            <ProtectedRoute>
              <XeroOAuthCallback />
            </ProtectedRoute>
          }
        />

        {/* SEO Files - served as clean URLs */}
        <Route path="/sitemap.xml" element={<SitemapXmlPage />} />
        <Route path="/robots.txt" element={<RobotsTxtPage />} />
        <Route path="/llms.txt" element={<LLMsTxtPage />} />

        {/* CMS Pages - catch-all for dynamic pages at root level (e.g., /privacy-policy) */}
        <Route path="/:slug" element={<CMSPageView />} />

        {/* 404 - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
          </ToastProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </SEOProvider>
    </BrandingProvider>
  );
}

export default App;
