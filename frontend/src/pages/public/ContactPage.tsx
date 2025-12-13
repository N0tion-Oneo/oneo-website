// Public Contact Page
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { cmsContact } from '@/services/cms'
import { SEO } from '@/components/seo'
import Navbar from '@/components/layout/Navbar'
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

interface ContactFormData {
  name: string
  email: string
  phone: string
  company: string
  subject: string
  message: string
}

const initialFormData: ContactFormData = {
  name: '',
  email: '',
  phone: '',
  company: '',
  subject: '',
  message: '',
}

export default function ContactPage() {
  const [formData, setFormData] = useState<ContactFormData>(initialFormData)
  const [submitted, setSubmitted] = useState(false)

  const submitMutation = useMutation({
    mutationFn: (data: ContactFormData) =>
      cmsContact.submit({
        ...data,
        source_page: window.location.pathname,
      }),
    onSuccess: () => {
      setSubmitted(true)
      setFormData(initialFormData)
    },
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitMutation.mutate(formData)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-xl mx-auto px-6 py-24">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-[28px] font-bold text-gray-900 mb-3">
              Message Sent!
            </h1>
            <p className="text-[15px] text-gray-500 mb-8">
              Thank you for reaching out. We'll get back to you within 24-48 hours.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="text-[14px] font-medium text-gray-900 hover:text-gray-700"
            >
              Send another message
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
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
              <h2 className="text-[18px] font-semibold text-gray-900 mb-4">
                Get in Touch
              </h2>
              <p className="text-[14px] text-gray-500 leading-relaxed">
                Fill out the form and our team will get back to you within 24-48 hours.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-[13px] text-gray-500 mb-1">Email</p>
                  <a
                    href="mailto:hello@oneo.com"
                    className="text-[14px] font-medium text-gray-900 hover:text-gray-700"
                  >
                    hello@oneo.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-[13px] text-gray-500 mb-1">Phone</p>
                  <a
                    href="tel:+27123456789"
                    className="text-[14px] font-medium text-gray-900 hover:text-gray-700"
                  >
                    +27 12 345 6789
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-[13px] text-gray-500 mb-1">Office</p>
                  <p className="text-[14px] font-medium text-gray-900">
                    Cape Town, South Africa
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-[13px] text-gray-600">
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
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-[14px] text-red-700">
                    Failed to send message. Please try again or email us directly.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-[13px] font-medium text-gray-700 mb-2"
                  >
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-[13px] font-medium text-gray-700 mb-2"
                  >
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                    placeholder="john@company.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-[13px] font-medium text-gray-700 mb-2"
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                    placeholder="+27 12 345 6789"
                  />
                </div>

                <div>
                  <label
                    htmlFor="company"
                    className="block text-[13px] font-medium text-gray-700 mb-2"
                  >
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                    placeholder="Your Company"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="block text-[13px] font-medium text-gray-700 mb-2"
                >
                  Subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                >
                  <option value="">Select a subject</option>
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Hiring Services">Hiring Services</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Support">Support</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-[13px] font-medium text-gray-700 mb-2"
                >
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 text-[14px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 resize-none"
                  placeholder="How can we help you?"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[12px] text-gray-400">
                  * Required fields
                </p>
                <button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="flex items-center gap-2 px-6 py-3 text-[14px] font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
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
