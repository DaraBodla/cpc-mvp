'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  Send, MessageSquare, CheckCircle, BarChart3, Users, Zap, Clock, 
  Smartphone, TrendingUp, Bot, Package, Calendar, MessageCircle, 
  ArrowRight, Menu, X, Shield, Award, Target, Sparkles
} from 'lucide-react'

const DEMO_WHATSAPP = process.env.NEXT_PUBLIC_DEMO_WHATSAPP || '+92XXXXXXXXXX'

// Generate or retrieve session ID for analytics
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = sessionStorage.getItem('cpc_session_id')
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('cpc_session_id', sessionId)
  }
  return sessionId
}

// Analytics tracking helper
async function trackEvent(event: string, data: Record<string, unknown> = {}) {
  try {
    const sessionId = getSessionId()
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        session_id: sessionId,
        ...data
      })
    })
  } catch (error) {
    console.error('Analytics error:', error)
  }
}

interface FormData {
  businessName: string
  businessType: string
  ownerName: string
  whatsapp: string
  email: string
  automations: string[]
}

const automationOptions = [
  { id: 'FAQ bot', icon: '💬', label: 'FAQ Automation', desc: 'Instant answers to common questions' },
  { id: 'Order/Booking automation', icon: '📅', label: 'Booking System', desc: 'Automated appointment scheduling' },
  { id: 'Catalogue bot', icon: '📦', label: 'Product Catalog', desc: 'Interactive product showcase' },
  { id: 'Lead capture', icon: '📊', label: 'Lead Capture', desc: 'Automated lead collection' },
  { id: 'Follow-up messages', icon: '🔔', label: 'Follow-up System', desc: 'Scheduled reminders & updates' }
]

const features = [
  { icon: MessageCircle, title: 'Intelligent FAQ System', desc: 'AI-powered responses to customer questions, available 24/7 with context awareness' },
  { icon: Calendar, title: 'Appointment Scheduling', desc: 'Automated booking system with calendar integration and reminder notifications' },
  { icon: Package, title: 'Product Catalog', desc: 'Interactive product showcase with pricing, availability, and ordering capabilities' },
  { icon: TrendingUp, title: 'Lead Management', desc: 'Capture and qualify leads automatically with intelligent conversation flows' },
  { icon: Clock, title: 'Smart Follow-ups', desc: 'Scheduled messages and reminders to keep customers engaged' },
  { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Real-time insights on engagement, conversions, and customer behavior' }
]

const stats = [
  { value: '500+', label: 'Active Businesses' },
  { value: '50K+', label: 'Messages Automated' },
  { value: '98%', label: 'Client Satisfaction' },
  { value: '24hrs', label: 'Setup Time' }
]

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedBusinessId, setSubmittedBusinessId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [formStarted, setFormStarted] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    businessType: '',
    ownerName: '',
    whatsapp: '',
    email: '',
    automations: []
  })

  // Track page view on mount
  useEffect(() => {
    trackEvent('page_view', { page: 'landing' })
  }, [])

  // Track form start when user begins typing
  const handleFormStart = useCallback(() => {
    if (!formStarted) {
      setFormStarted(true)
      trackEvent('form_start', { page: 'landing' })
    }
  }, [formStarted])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    handleFormStart()
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAutomationToggle = (automation: string) => {
    handleFormStart()
    setFormData(prev => ({
      ...prev,
      automations: prev.automations.includes(automation)
        ? prev.automations.filter(a => a !== automation)
        : [...prev.automations, automation]
    }))
  }

  const handleSubmit = async () => {
    if (!formData.businessName || !formData.businessType || !formData.ownerName || 
        !formData.whatsapp || !formData.email || formData.automations.length === 0) {
      alert('Please fill all required fields and select at least one automation')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        const businessId = data.business?.id
        setSubmittedBusinessId(businessId)
        
        // Track successful form submission with automations
        trackEvent('form_submit', { 
          page: 'landing',
          business_id: businessId,
          metadata: { automations: formData.automations }
        })
        
        // Track each automation selection
        for (const automation of formData.automations) {
          trackEvent('automation_selected', {
            automation_type: automation,
            business_id: businessId
          })
        }
        
        setSubmitted(true)
      } else {
        const error = await response.json()
        alert(error.message || 'Submission failed. Please try again.')
      }
    } catch (error) {
      console.error('Submission error:', error)
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Track demo bot clicks
  const handleDemoClick = (source: string) => {
    trackEvent('demo_bot_click', {
      source,
      business_id: submittedBusinessId
    })
  }

  const resetForm = () => {
    setFormData({
      businessName: '',
      businessType: '',
      ownerName: '',
      whatsapp: '',
      email: '',
      automations: []
    })
    setSubmitted(false)
    setSubmittedBusinessId(null)
    setFormStarted(false)
  }

  const scrollToForm = () => {
    document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  if (submitted) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12 text-center border border-gray-100">
            <div className="mb-8">
              <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg pulse-glow">
                <CheckCircle className="text-emerald-600" size={56} />
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                Request Received!
              </h2>
              <p className="text-xl text-gray-600">
                Thank you, <span className="font-bold text-emerald-600">{formData.businessName}</span>
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-8 mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Bot className="text-blue-600" size={36} />
                <h3 className="text-2xl font-bold text-blue-900">Try Our Demo Bot</h3>
              </div>
              <p className="text-blue-800 mb-6 text-lg">
                Experience automation in action
              </p>
              <a
                href={`https://wa.me/${DEMO_WHATSAPP.replace(/[^0-9]/g, '')}?text=Hi!%20I%20just%20signed%20up%20for%20CPC.`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleDemoClick('success_page_main')}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all"
              >
                <Smartphone size={24} />
                Open Demo Bot
              </a>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 mb-8 text-left">
              <h4 className="font-bold text-gray-900 mb-6 text-xl text-center">Next Steps</h4>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-100 rounded-full p-2 mt-1 flex-shrink-0">
                    <CheckCircle className="text-emerald-600" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">1. Test the Demo</p>
                    <p className="text-gray-600">Experience our automation capabilities firsthand</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 rounded-full p-2 mt-1 flex-shrink-0">
                    <Clock className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">2. We&apos;ll Contact You (24 hours)</p>
                    <p className="text-gray-600">Our team will reach out via WhatsApp to discuss your needs</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 rounded-full p-2 mt-1 flex-shrink-0">
                    <Zap className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">3. Custom Setup</p>
                    <p className="text-gray-600">We&apos;ll configure your personalized automation system</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={resetForm}
                className="flex-1 btn-secondary"
              >
                Back to Home
              </button>
              <a
                href={`https://wa.me/${DEMO_WHATSAPP.replace(/[^0-9]/g, '')}?text=Demo%20Request`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleDemoClick('success_page_footer')}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <MessageSquare size={20} />
                Open WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-2.5 rounded-xl shadow-lg">
                <MessageSquare className="text-white" size={26} />
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-900">CPC</span>
                <p className="text-xs text-gray-500 font-medium">Chat Product Company</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <button onClick={scrollToForm} className="text-gray-700 hover:text-gray-900 font-medium transition-colors">
                Get Started
              </button>
              <Link href="/admin" className="text-gray-700 hover:text-gray-900 font-medium transition-colors">
                Dashboard
              </Link>
              <a
                href={`https://wa.me/${DEMO_WHATSAPP.replace(/[^0-9]/g, '')}?text=Demo%20Request`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleDemoClick('nav_button')}
                className="btn-primary flex items-center gap-2"
              >
                <Bot size={18} />
                Request Demo
              </a>
            </div>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2 border-t border-gray-100 pt-4 animate-fade-in">
              <button 
                onClick={() => { scrollToForm(); setMobileMenuOpen(false) }} 
                className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition"
              >
                Get Started
              </button>
              <Link 
                href="/admin" 
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition"
              >
                Dashboard
              </Link>
              <a 
                href={`https://wa.me/${DEMO_WHATSAPP.replace(/[^0-9]/g, '')}?text=Demo%20Request`} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={() => handleDemoClick('mobile_nav')}
                className="block w-full text-center bg-emerald-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
              >
                Request Demo
              </a>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-8 border border-emerald-100">
              <Sparkles size={16} />
              Enterprise-Grade Automation
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Transform Your Business with
              <span className="block mt-2 gradient-text">
                WhatsApp AI Automation
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Deploy intelligent WhatsApp automation that scales with your business. 
              Reduce response time by 90% and increase customer satisfaction effortlessly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <button 
                onClick={scrollToForm} 
                className="btn-primary flex items-center justify-center gap-2 text-lg group"
              >
                Get Started
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <a 
                href={`https://wa.me/${DEMO_WHATSAPP.replace(/[^0-9]/g, '')}?text=Demo%20Request`} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={() => handleDemoClick('hero_button')}
                className="btn-secondary flex items-center justify-center gap-2 text-lg"
              >
                <Bot size={20} />
                View Demo
              </a>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200">
              {[
                { icon: Shield, label: 'Secure & Reliable' },
                { icon: Award, label: '24/7 Support' },
                { icon: Target, label: 'Easy Setup' }
              ].map((item, idx) => (
                <div key={idx} className="animate-slide-up" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className="flex items-center gap-2 text-emerald-600 mb-1">
                    <item.icon size={20} />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Demo Card */}
          <div className="relative animate-slide-up animate-delay-200">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-1 shadow-2xl">
              <div className="bg-white rounded-3xl p-8">
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-100 p-3 rounded-xl">
                      <MessageCircle className="text-gray-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">Customer Inquiry</p>
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                        What are your business hours and services?
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-emerald-100 to-teal-100 p-3 rounded-xl">
                      <Bot className="text-emerald-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">AI Assistant</p>
                      <p className="text-sm text-gray-700 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-100">
                        We&apos;re open Mon-Sat, 9AM-6PM. We offer consultation, booking, and product catalog. How can I assist you today?
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button className="bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-sm font-medium transition-colors border border-gray-200">
                      📅 Book Appointment
                    </button>
                    <button className="bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-sm font-medium transition-colors border border-gray-200">
                      📦 View Catalog
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 bg-gradient-to-r from-amber-400 to-orange-400 text-white px-6 py-3 rounded-xl font-bold shadow-xl animate-bounce-gentle">
              ⚡ Instant Response
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Complete Automation Suite
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to automate customer interactions and grow your business
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div 
                key={idx} 
                className="card group hover:border-emerald-200 animate-slide-up"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl w-fit mb-5 group-hover:scale-110 transition-transform">
                  <feature.icon className="text-emerald-600" size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center text-white">
            {stats.map((stat, idx) => (
              <div key={idx} className="animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                <p className="text-5xl font-bold mb-2">{stat.value}</p>
                <p className="text-emerald-100 text-lg">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Registration Form */}
      <div id="registration-form" className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-600">
              Fill out the form below and we&apos;ll set up your automation within 24 hours
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-8 lg:p-12">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Enter your business name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Business Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  className="input"
                >
                  <option value="">Select type</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="retail">Retail / Boutique</option>
                  <option value="salon">Salon / Spa</option>
                  <option value="services">Professional Services</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="education">Education</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Owner / Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  WhatsApp Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="+92 XXX XXXXXXX"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="mt-8">
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Select Automation Features <span className="text-red-500">*</span>
              </label>
              <div className="grid sm:grid-cols-2 gap-4">
                {automationOptions.map(automation => (
                  <button
                    key={automation.id}
                    type="button"
                    onClick={() => handleAutomationToggle(automation.id)}
                    className={`relative flex items-start gap-4 p-5 rounded-xl border-2 transition-all text-left ${
                      formData.automations.includes(automation.id)
                        ? 'border-emerald-500 bg-emerald-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm'
                    }`}
                  >
                    <span className="text-2xl">{automation.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-0.5">{automation.label}</p>
                      <p className="text-sm text-gray-600">{automation.desc}</p>
                    </div>
                    {formData.automations.includes(automation.id) && (
                      <CheckCircle className="text-emerald-600 absolute top-4 right-4" size={20} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleSubmit}
                disabled={formData.automations.length === 0 || loading}
                className="flex-1 btn-primary flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <>
                    <Send size={20} className="group-hover:translate-x-1 transition-transform" />
                    Submit Request
                  </>
                )}
              </button>
              <a
                href={`https://wa.me/${DEMO_WHATSAPP.replace(/[^0-9]/g, '')}?text=Demo%20Request`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleDemoClick('form_section')}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                <Bot size={20} />
                View Demo
              </a>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Shield size={16} />
              <span>Your information is secure and will never be shared</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-2 rounded-xl">
              <MessageSquare size={28} />
            </div>
            <span className="text-2xl font-bold">CPC</span>
          </div>
          <p className="text-gray-400 mb-2">Professional WhatsApp Automation Solutions</p>
          <p className="text-gray-500 text-sm">© 2025 Chat Product Company. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
