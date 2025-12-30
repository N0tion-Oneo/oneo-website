// Public Contact Page
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { cmsContact } from '@/services/cms'
import { SEO } from '@/components/seo'
import Navbar from '@/components/layout/Navbar'
import { LeadForm, emptyLeadFormData, isLeadFormValid } from '@/components/forms'
import type { LeadFormData } from '@/components/forms'
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

export default function ContactPage() {
  const [formData, setFormData] = useState<LeadFormData>(emptyLeadFormData)
  const [submitted, setSubmitted] = useState(false)

  const submitMutation = useMutation({
    mutationFn: (data: LeadFormData) =>
      cmsContact.submit({
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company_name,
        source_page: window.location.pathname,
      }),
    onSuccess: () => {
      setSubmitted(true)
      setFormData(emptyLeadFormData)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isLeadFormValid(formData)) {
      submitMutation.mutate(formData)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <Navbar />
        <div className="max-w-xl mx-auto px-6 py-24">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-[28px] font-bold text-gray-900 dark:text-gray-100 mb-3">
              Thanks for reaching out!
            </h1>
            <p className="text-[15px] text-gray-500 dark:text-gray-400 mb-8">
              We've received your details and will get back to you within 24-48 hours.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="text-[14px] font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Submit another inquiry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <SEO />
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h1 className="text-[36px] font-bold mb-4">Contact Us</h1>
          <p className="text-[16px] text-gray-300 max-w-2xl">
            Have questions about our services? Want to learn how we can help your business?
            We'd love to hear from you.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-[18px] font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Get in Touch
              </h2>
              <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Fill out the form and our team will get back to you within 24-48 hours.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">Email</p>
                  <a
                    href="mailto:hello@oneo.com"
                    className="text-[14px] font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    hello@oneo.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">Phone</p>
                  <a
                    href="tel:+27123456789"
                    className="text-[14px] font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    +27 12 345 6789
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">Office</p>
                  <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
                    Cape Town, South Africa
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-[13px] text-gray-600 dark:text-gray-400">
                <span className="font-medium">Business Hours:</span>
                <br />
                Monday - Friday: 9:00 AM - 5:00 PM SAST
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {submitMutation.isError && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
                  <p className="text-[14px] text-red-700 dark:text-red-400">
                    Failed to send message. Please try again or email us directly.
                  </p>
                </div>
              )}

              <LeadForm
                value={formData}
                onChange={setFormData}
              />

              <div className="flex items-center justify-between pt-2">
                <p className="text-[12px] text-gray-400 dark:text-gray-500">
                  * Required fields
                </p>
                <button
                  type="submit"
                  disabled={submitMutation.isPending || !isLeadFormValid(formData)}
                  className="flex items-center gap-2 px-6 py-3 text-[14px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Get in Touch
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
