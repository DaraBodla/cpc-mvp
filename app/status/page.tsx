'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  MessageSquare, ArrowLeft, Search, Phone, Mail, CheckCircle, 
  Clock, AlertCircle, CreditCard, Package, RefreshCw, Gift,
  Copy, Upload, Image, Building, Loader2, XCircle, UserCheck,
  Zap, Calendar
} from 'lucide-react'

const PRICE_PER_FEATURE = 2000
const ADVANCE_PAYMENT = 2000
const SUBSCRIPTION_MONTHLY = 1000

const BANK_DETAILS = {
  bankName: 'Sadapay',
  accountTitle: 'Dara Shioh Bodla',
  accountNumber: '03216320882'
}

interface Business {
  id: number
  business_name: string
  business_type: string
  owner_name: string
  whatsapp: string
  email: string
  automations: string[]
  status: string
  payment_status?: string
  total_amount?: number
  has_subscription?: boolean
  subscription_amount?: number
  created_at: string
}

interface Payment {
  id: number
  business_id: number
  amount: number
  status: string
  created_at: string
}

interface StatusConfigItem {
  color: string
  bg: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  description: string
}

interface PaymentStatusConfigItem {
  color: string
  bg: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
}

const statusConfig: Record<string, StatusConfigItem> = {
  pending: { 
    color: 'text-amber-700', 
    bg: 'bg-amber-50 border-amber-200', 
    icon: Clock, 
    label: 'Pending Review',
    description: 'Your application is in our queue. We\'ll contact you soon.'
  },
  contacted: { 
    color: 'text-blue-700', 
    bg: 'bg-blue-50 border-blue-200', 
    icon: Phone, 
    label: 'Contacted',
    description: 'Our team has reached out to you. Please check your WhatsApp.'
  },
  onboarded: { 
    color: 'text-purple-700', 
    bg: 'bg-purple-50 border-purple-200', 
    icon: UserCheck, 
    label: 'Onboarded',
    description: 'You\'re onboarded! We\'re setting up your automation.'
  },
  active: { 
    color: 'text-emerald-700', 
    bg: 'bg-emerald-50 border-emerald-200', 
    icon: CheckCircle, 
    label: 'Active',
    description: 'Your automation is live and running!'
  }
}

const paymentStatusConfig: Record<string, PaymentStatusConfigItem> = {
  unpaid: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: XCircle, label: 'Payment Required' },
  pending: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock, label: 'Verifying Payment' },
  verified: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle, label: 'Payment Verified' },
  rejected: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: XCircle, label: 'Payment Rejected' }
}

export default function BusinessStatusPage() {
  const [searchType, setSearchType] = useState<'email' | 'phone'>('email')
  const [searchValue, setSearchValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [business, setBusiness] = useState<Business | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  
  const [showPaymentUpload, setShowPaymentUpload] = useState(false)
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null)
  const [paymentPreview, setPaymentPreview] = useState<string | null>(null)
  const [uploadingPayment, setUploadingPayment] = useState(false)

  const totalAmount = business ? (business.total_amount || business.automations.length * PRICE_PER_FEATURE) : 0
  const paymentStatus = payment?.status || 'unpaid'
  const businessStatus = business?.status || 'pending'

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusiness(null)
    setPayment(null)
    setShowPaymentUpload(false)

    if (!searchValue.trim()) {
      setError('Please enter your email or phone number')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/business-status?type=${searchType}&value=${encodeURIComponent(searchValue.trim())}`)
      const data = await response.json()

      if (response.ok && data.business) {
        setBusiness(data.business)
        setPayment(data.payment || null)
        
        if (!data.payment || data.payment.status === 'rejected') {
          setShowPaymentUpload(true)
        }
      } else {
        setError(data.error || 'Business not found. Please check your details.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      setPaymentScreenshot(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPaymentPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePaymentUpload = async () => {
    if (!paymentScreenshot || !business) {
      alert('Please select a payment screenshot')
      return
    }

    setUploadingPayment(true)
    try {
      const formData = new FormData()
      formData.append('screenshot', paymentScreenshot)
      formData.append('business_id', business.id.toString())
      formData.append('amount', ADVANCE_PAYMENT.toString())

      const response = await fetch('/api/payments', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        alert('Payment screenshot uploaded successfully! We\'ll verify it within 24 hours.')
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent
        handleSearch(fakeEvent)
        setShowPaymentUpload(false)
        setPaymentScreenshot(null)
        setPaymentPreview(null)
      } else {
        const errorData = await response.json()
        alert(errorData.message || 'Upload failed. Please try again.')
      }
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setUploadingPayment(false)
    }
  }

  const currentStatusConfig = statusConfig[businessStatus] || statusConfig.pending
  const currentPaymentConfig = paymentStatusConfig[paymentStatus] || paymentStatusConfig.unpaid
  const StatusIcon = currentStatusConfig.icon
  const PaymentIcon = currentPaymentConfig.icon

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-2 rounded-xl">
                <MessageSquare className="text-white" size={24} />
              </div>
              <span className="text-xl font-bold text-gray-900">CPC</span>
            </Link>
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
              <ArrowLeft size={18} />
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {!business && (
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-200">
            <div className="text-center mb-8">
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-emerald-600" size={32} />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Check Your Status</h1>
              <p className="text-gray-600">Enter your registered email or WhatsApp number</p>
            </div>

            <form onSubmit={handleSearch}>
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setSearchType('email')}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
                    searchType === 'email'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Mail size={18} />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setSearchType('phone')}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
                    searchType === 'phone'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Phone size={18} />
                  WhatsApp
                </button>
              </div>

              <input
                type={searchType === 'email' ? 'email' : 'tel'}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={searchType === 'email' ? 'Enter your email address' : 'Enter your WhatsApp number'}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg"
              />

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    Check Status
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {business && (
          <div className="space-y-6">
            <button
              onClick={() => {
                setBusiness(null)
                setPayment(null)
                setSearchValue('')
                setShowPaymentUpload(false)
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
            >
              <ArrowLeft size={18} />
              Search Again
            </button>

            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-200">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{business.business_name}</h2>
                  <p className="text-gray-500 capitalize">{business.business_type}</p>
                </div>
                <div className={`px-4 py-2 rounded-full border ${currentStatusConfig.bg}`}>
                  <div className="flex items-center gap-2">
                    <StatusIcon size={16} className={currentStatusConfig.color} />
                    <span className={`font-semibold ${currentStatusConfig.color}`}>
                      {currentStatusConfig.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-xl border mb-6 ${currentStatusConfig.bg}`}>
                <p className={currentStatusConfig.color}>{currentStatusConfig.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase mb-1">Owner</p>
                  <p className="font-medium text-gray-900">{business.owner_name}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase mb-1">Registered</p>
                  <p className="font-medium text-gray-900">
                    {new Date(business.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package size={18} />
                  Selected Features
                </h3>
                <div className="flex flex-wrap gap-2">
                  {business.automations.map((auto, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
                      {auto}
                    </span>
                  ))}
                </div>
                {business.has_subscription && (
                  <div className="mt-3 flex items-center gap-2 text-purple-700 bg-purple-50 px-3 py-2 rounded-lg w-fit">
                    <RefreshCw size={16} />
                    <span className="text-sm font-medium">Premium Subscription</span>
                    <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Gift size={10} />
                      1st Month Free
                    </span>
                  </div>
                )}
              </div>

              <div className={`p-4 rounded-xl border ${currentPaymentConfig.bg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PaymentIcon size={24} className={currentPaymentConfig.color} />
                    <div>
                      <p className={`font-semibold ${currentPaymentConfig.color}`}>
                        {currentPaymentConfig.label}
                      </p>
                      <p className="text-sm text-gray-500">
                        {paymentStatus === 'verified' 
                          ? `Rs ${payment?.amount?.toLocaleString()} verified`
                          : paymentStatus === 'pending'
                          ? 'We\'re verifying your payment'
                          : `Advance: Rs ${ADVANCE_PAYMENT.toLocaleString()} required`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Bill</p>
                    <p className="text-xl font-bold text-gray-900">Rs {totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {showPaymentUpload && (paymentStatus === 'unpaid' || paymentStatus === 'rejected') && (
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-200">
                <div className="text-center mb-6">
                  <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="text-blue-600" size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Payment</h3>
                  <p className="text-gray-600">
                    {paymentStatus === 'rejected' 
                      ? 'Your previous payment was rejected. Please upload a new screenshot.'
                      : 'Pay the advance to secure your spot on the waitlist.'
                    }
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Total Bill</span>
                    <span className="font-medium">Rs {totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="font-bold text-gray-900">Pay Now (Advance)</span>
                    <span className="text-xl font-bold text-emerald-600">Rs {ADVANCE_PAYMENT.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 mb-6 border border-emerald-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Building size={18} className="text-emerald-600" />
                    Bank Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bank</span>
                      <span className="font-medium">{BANK_DETAILS.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Title</span>
                      <span className="font-medium">{BANK_DETAILS.accountTitle}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Account Number</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium font-mono">{BANK_DETAILS.accountNumber}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(BANK_DETAILS.accountNumber)
                            alert('Copied!')
                          }}
                          className="p-1 hover:bg-emerald-100 rounded"
                        >
                          <Copy size={14} className="text-emerald-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700">
                      <strong>Reference:</strong> Include &quot;{business.business_name}&quot; in payment reference
                    </p>
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors mb-6">
                  {paymentPreview ? (
                    <div className="space-y-4">
                      <img 
                        src={paymentPreview} 
                        alt="Payment screenshot" 
                        className="max-h-48 mx-auto rounded-lg shadow-md"
                      />
                      <p className="text-sm text-gray-600">{paymentScreenshot?.name}</p>
                      <button
                        onClick={() => {
                          setPaymentScreenshot(null)
                          setPaymentPreview(null)
                        }}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotChange}
                        className="hidden"
                      />
                      <div className="space-y-2">
                        <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                          <Image size={24} className="text-gray-400" />
                        </div>
                        <p className="font-medium text-gray-700">Upload payment screenshot</p>
                        <p className="text-sm text-gray-500">PNG, JPG up to 5MB</p>
                      </div>
                    </label>
                  )}
                </div>

                <button
                  onClick={handlePaymentUpload}
                  disabled={!paymentScreenshot || uploadingPayment}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploadingPayment ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      Submit Payment Proof
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Calendar size={20} />
                Your Journey
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-500 text-white">
                    <CheckCircle size={16} />
                  </div>
                  <div className="flex-1 pb-4 border-b border-gray-100">
                    <p className="font-semibold text-gray-900">Registration Complete</p>
                    <p className="text-sm text-gray-500">Your application was submitted</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    paymentStatus === 'verified' ? 'bg-emerald-500 text-white' 
                    : paymentStatus === 'pending' ? 'bg-amber-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                  }`}>
                    {paymentStatus === 'verified' ? <CheckCircle size={16} /> 
                     : paymentStatus === 'pending' ? <Clock size={16} />
                     : <CreditCard size={16} />}
                  </div>
                  <div className="flex-1 pb-4 border-b border-gray-100">
                    <p className="font-semibold text-gray-900">Advance Payment</p>
                    <p className="text-sm text-gray-500">
                      {paymentStatus === 'verified' ? 'Payment verified ✓'
                       : paymentStatus === 'pending' ? 'Verification in progress...'
                       : 'Awaiting payment'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    ['contacted', 'onboarded', 'active'].includes(businessStatus) 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {['contacted', 'onboarded', 'active'].includes(businessStatus) 
                      ? <CheckCircle size={16} /> 
                      : <Phone size={16} />}
                  </div>
                  <div className="flex-1 pb-4 border-b border-gray-100">
                    <p className="font-semibold text-gray-900">Team Contact</p>
                    <p className="text-sm text-gray-500">
                      {['contacted', 'onboarded', 'active'].includes(businessStatus)
                        ? 'You\'ve been contacted ✓'
                        : 'We\'ll reach out via WhatsApp'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    ['onboarded', 'active'].includes(businessStatus) 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {['onboarded', 'active'].includes(businessStatus) 
                      ? <CheckCircle size={16} /> 
                      : <Zap size={16} />}
                  </div>
                  <div className="flex-1 pb-4 border-b border-gray-100">
                    <p className="font-semibold text-gray-900">Custom Setup</p>
                    <p className="text-sm text-gray-500">
                      {['onboarded', 'active'].includes(businessStatus)
                        ? 'Setup completed ✓'
                        : 'Your automation will be configured'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    businessStatus === 'active' 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {businessStatus === 'active' 
                      ? <CheckCircle size={16} /> 
                      : <MessageSquare size={16} />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Go Live!</p>
                    <p className="text-sm text-gray-500">
                      {businessStatus === 'active'
                        ? 'Your bot is live! 🎉'
                        : 'Your automation goes live'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}