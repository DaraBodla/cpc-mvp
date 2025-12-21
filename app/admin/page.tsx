'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  BarChart3, Users, Package, TrendingUp, 
  RefreshCw, Search, Eye, Clock, ArrowLeft,
  Mail, Phone, X, Percent, MousePointer, PieChart, CreditCard,
  Lock, KeyRound, Shield, LogOut, AlertCircle, Image, CheckCircle,
  XCircle, ExternalLink
} from 'lucide-react'

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
  has_subscription?: boolean
  subscription_amount?: number
  total_amount?: number
  created_at: string
  notes?: string
}

interface Payment {
  id: number
  business_id: number
  amount: number
  screenshot_url?: string
  screenshot_path?: string
  screenshot_data?: string
  status: string
  created_at: string
}

interface Stats {
  totalBusinesses: number
  totalOrders: number
  totalLeads: number
  totalMessages: number
  todayOrders: number
  todayLeads: number
  businessesByType: Record<string, number>
  automationPopularity: Record<string, number>
  totalPayments: number
  pendingPayments: number
  verifiedPayments: number
}

interface Metrics {
  conversionRate: number
  demoBotTriggerRate: number
  paymentUploadRate: number
  automationDistribution: Record<string, number>
  totalVisitors: number
  totalSubmissions: number
  totalDemoClicks: number
  totalPaymentUploads: number
  uniqueDemoEngagements: number
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  contacted: 'bg-blue-100 text-blue-800',
  onboarded: 'bg-purple-100 text-purple-800',
  active: 'bg-emerald-100 text-emerald-800'
}

const paymentStatusColors: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800',
  verified: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800'
}

export default function AdminDashboard() {
  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [password1, setPassword1] = useState('')
  const [password2, setPassword2] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  // Dashboard states
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [activeTab, setActiveTab] = useState<'businesses' | 'metrics'>('businesses')
  
  // Payment states
  const [businessPayments, setBusinessPayments] = useState<Payment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [totalPaymentsCount, setTotalPaymentsCount] = useState(0)

  // Check authentication on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth')
      if (response.ok) {
        const data = await response.json()
        setIsAuthenticated(data.authenticated)
        if (data.authenticated) {
          fetchData()
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoggingIn(true)

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password1, password2 })
      })

      const data = await response.json()

      if (response.ok) {
        setIsAuthenticated(true)
        setPassword1('')
        setPassword2('')
        fetchData()
      } else {
        setLoginError(data.error || 'Authentication failed')
      }
    } catch {
      setLoginError('Network error. Please try again.')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' })
      setIsAuthenticated(false)
      setBusinesses([])
      setStats(null)
      setMetrics(null)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [businessesRes, statsRes, metricsRes, paymentsRes] = await Promise.all([
        fetch('/api/businesses'),
        fetch('/api/stats'),
        fetch('/api/analytics'),
        fetch('/api/payments')
      ])

      if (businessesRes.ok) {
        const data = await businessesRes.json()
        setBusinesses(data.businesses || [])
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json()
        setMetrics(data)
      }

      if (paymentsRes.ok) {
        const data = await paymentsRes.json()
        setTotalPaymentsCount(data.payments?.length || 0)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch payments for a specific business
  const fetchBusinessPayments = async (businessId: number) => {
    setLoadingPayments(true)
    try {
      const response = await fetch(`/api/payments?business_id=${businessId}`)
      if (response.ok) {
        const data = await response.json()
        setBusinessPayments(data.payments || [])
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error)
    } finally {
      setLoadingPayments(false)
    }
  }

  // Update payment status
  const updatePaymentStatus = async (paymentId: number, status: string) => {
    try {
      const response = await fetch('/api/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, status })
      })

      if (response.ok) {
        // Refresh payments
        if (selectedBusiness) {
          fetchBusinessPayments(selectedBusiness.id)
        }
        // Refresh stats
        fetchData()
      }
    } catch (error) {
      console.error('Failed to update payment:', error)
    }
  }

  const updateBusinessStatus = async (id: number, status: string) => {
    try {
      const response = await fetch(`/api/businesses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        setBusinesses(prev => 
          prev.map(b => b.id === id ? { ...b, status } : b)
        )
        if (selectedBusiness?.id === id) {
          setSelectedBusiness({ ...selectedBusiness, status })
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  // When selecting a business, also fetch their payments
  const handleSelectBusiness = (business: Business) => {
    setSelectedBusiness(business)
    setBusinessPayments([])
    fetchBusinessPayments(business.id)
  }

  const filteredBusinesses = businesses.filter(b => {
    const matchesSearch = 
      b.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !filterType || b.business_type === filterType
    const matchesStatus = !filterStatus || b.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const uniqueTypes = Array.from(new Set(businesses.map(b => b.business_type)))

  // Payment upload metrics (now counting actual files in storage bucket)
  const paymentUploads = metrics?.totalPaymentUploads || 0
  const paymentUploadRate = metrics?.totalSubmissions
    ? ((paymentUploads / metrics.totalSubmissions) * 100)
    : 0

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin text-emerald-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-4 rounded-2xl w-20 h-20 mx-auto mb-4 shadow-lg shadow-emerald-500/30">
              <Shield className="text-white w-full h-full" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Access</h1>
            <p className="text-gray-400">Enter both passwords to continue</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="bg-white rounded-3xl shadow-2xl p-8">
            {loginError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                <AlertCircle size={20} />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Lock size={16} />
                    Password 1
                  </div>
                </label>
                <input
                  type="password"
                  value={password1}
                  onChange={(e) => setPassword1(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="Enter first password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <KeyRound size={16} />
                    Password 2
                  </div>
                </label>
                <input
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder="Enter second password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loggingIn || !password1 || !password2}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loggingIn ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Lock size={20} />
                    Access Dashboard
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <Link href="/" className="text-gray-500 hover:text-emerald-600 text-sm flex items-center justify-center gap-2">
                <ArrowLeft size={16} />
                Back to Website
              </Link>
            </div>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            🔒 Protected by dual-password authentication
          </p>
        </div>
      </div>
    )
  }

  // Dashboard loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin text-emerald-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Dashboard content
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-2 rounded-xl">
                <BarChart3 className="text-white" size={28} />
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-800">CPC Dashboard</span>
                <p className="text-sm text-gray-500">Business Analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={fetchData}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition p-2 rounded-lg hover:bg-gray-100"
              >
                <RefreshCw size={18} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <Link 
                href="/" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition"
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">Back to Site</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition p-2 rounded-lg hover:bg-red-50"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('businesses')}
            className={`pb-4 px-2 font-semibold transition-colors ${
              activeTab === 'businesses'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Business Management
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`pb-4 px-2 font-semibold transition-colors ${
              activeTab === 'metrics'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Product Metrics
          </button>
        </div>

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-8">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Metric 1: Conversion Rate */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-emerald-100 p-3 rounded-xl">
                    <Percent className="text-emerald-600" size={24} />
                  </div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Metric 1</span>
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-1">
                  {metrics?.conversionRate?.toFixed(1) || '0'}%
                </p>
                <p className="text-gray-600 font-medium">Onboarding Conversion Rate</p>
                <p className="text-sm text-gray-500 mt-2">
                  {metrics?.totalSubmissions || 0} submissions / {metrics?.totalVisitors || 0} visitors
                </p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">% of visitors who complete the onboarding form</p>
                </div>
              </div>

              {/* Metric 2: Demo Bot Trigger Rate */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <MousePointer className="text-blue-600" size={24} />
                  </div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Metric 2</span>
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-1">
                  {metrics?.demoBotTriggerRate?.toFixed(1) || '0'}%
                </p>
                <p className="text-gray-600 font-medium">Demo Bot Trigger Rate</p>
                <p className="text-sm text-gray-500 mt-2">
                  {metrics?.uniqueDemoEngagements || 0} engaged / {metrics?.totalSubmissions || 0} onboarded
                </p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">% of businesses that test the demo bot after onboarding</p>
                </div>
              </div>

              {/* Metric 3: Top Automation */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-purple-100 p-3 rounded-xl">
                    <PieChart className="text-purple-600" size={24} />
                  </div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Metric 3</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {metrics?.automationDistribution && Object.keys(metrics.automationDistribution).length > 0
                    ? Object.entries(metrics.automationDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
                    : 'N/A'}
                </p>
                <p className="text-gray-600 font-medium">Most Demanded Automation</p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">Most frequently selected automation type</p>
                </div>
              </div>

              {/* Metric 4: Payment Upload Rate - FIXED */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-amber-100 p-3 rounded-xl">
                    <CreditCard className="text-amber-600" size={24} />
                  </div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Metric 4</span>
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-1">
                  {paymentUploadRate.toFixed(1)}%
                </p>
                <p className="text-gray-600 font-medium">Payment Upload Rate</p>
                <p className="text-sm text-gray-500 mt-2">
                  {paymentUploads} uploads / {metrics?.totalSubmissions || 0} submissions
                </p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">% of businesses that upload payment screenshot</p>
                </div>
              </div>
            </div>

            {/* Automation Distribution */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                <PieChart size={20} className="text-emerald-600" />
                Automation Use-Case Distribution
              </h3>
              {metrics?.automationDistribution && Object.keys(metrics.automationDistribution).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(metrics.automationDistribution)
                    .sort((a, b) => b[1] - a[1])
                    .map(([automation, count]) => {
                      const total = Object.values(metrics.automationDistribution).reduce((sum, val) => sum + val, 0)
                      const percentage = Math.round((count / total) * 100)
                      return (
                        <div key={automation}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-700 font-medium">{automation}</span>
                            <span className="text-gray-500">{count} selections ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3">
                            <div 
                              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No data yet</p>
              )}
            </div>

            {/* Raw Numbers - REMOVED WhatsApp Messages */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{metrics?.totalVisitors || 0}</p>
                <p className="text-sm text-gray-600">Total Visitors</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{metrics?.totalSubmissions || 0}</p>
                <p className="text-sm text-gray-600">Form Submissions</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{metrics?.totalDemoClicks || 0}</p>
                <p className="text-sm text-gray-600">Demo Bot Clicks</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{paymentUploads}</p>
                <p className="text-sm text-gray-600">Payment Uploads</p>
              </div>
            </div>
          </div>
        )}

        {/* Businesses Tab */}
        {activeTab === 'businesses' && (
          <>
            {/* Stats Cards - FIXED to use businesses.length */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 lg:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-emerald-100 p-2 lg:p-3 rounded-xl">
                    <Users className="text-emerald-600" size={20} />
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900">{businesses.length}</p>
                <p className="text-gray-500 text-xs lg:text-sm mt-1">Businesses</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 lg:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-blue-100 p-2 lg:p-3 rounded-xl">
                    <Package className="text-blue-600" size={20} />
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stats?.totalOrders || 0}</p>
                <p className="text-gray-500 text-xs lg:text-sm mt-1">Orders</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 lg:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-purple-100 p-2 lg:p-3 rounded-xl">
                    <TrendingUp className="text-purple-600" size={20} />
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stats?.totalLeads || 0}</p>
                <p className="text-gray-500 text-xs lg:text-sm mt-1">Leads</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 lg:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-amber-100 p-2 lg:p-3 rounded-xl">
                    <CreditCard className="text-amber-600" size={20} />
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900">{totalPaymentsCount}</p>
                <p className="text-gray-500 text-xs lg:text-sm mt-1">Payments</p>
              </div>
            </div>

            {/* Businesses Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 lg:p-6 border-b border-gray-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <h2 className="text-xl font-bold text-gray-900">Business Registrations</h2>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-full"
                      />
                    </div>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-4 py-2 border border-gray-200 rounded-xl"
                    >
                      <option value="">All Types</option>
                      {uniqueTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-4 py-2 border border-gray-200 rounded-xl"
                    >
                      <option value="">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="contacted">Contacted</option>
                      <option value="onboarded">Onboarded</option>
                      <option value="active">Active</option>
                    </select>
                  </div>
                </div>
              </div>

              {filteredBusinesses.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="mx-auto text-gray-300 mb-4" size={64} />
                  <p className="text-gray-500">No businesses found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Business</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Type</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Automations</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredBusinesses.map(business => (
                        <tr key={business.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-900">{business.business_name}</p>
                            <p className="text-sm text-gray-500">{business.owner_name}</p>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize">
                              {business.business_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {business.automations.slice(0, 2).map((auto, idx) => (
                                <span key={idx} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs">
                                  {auto.split(' ')[0]}
                                </span>
                              ))}
                              {business.automations.length > 2 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  +{business.automations.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={business.status}
                              onChange={(e) => updateBusinessStatus(business.id, e.target.value)}
                              className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statusColors[business.status]}`}
                            >
                              <option value="pending">Pending</option>
                              <option value="contacted">Contacted</option>
                              <option value="onboarded">Onboarded</option>
                              <option value="active">Active</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleSelectBusiness(business)}
                              className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            >
                              <Eye size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Detail Modal with Payment Screenshots */}
      {selectedBusiness && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedBusiness.business_name}</h3>
                <p className="text-gray-500 capitalize">{selectedBusiness.business_type}</p>
              </div>
              <button onClick={() => setSelectedBusiness(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Owner</p>
                  <p className="font-medium text-gray-900">{selectedBusiness.owner_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[selectedBusiness.status]} capitalize`}>
                    {selectedBusiness.status}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Contact</p>
                <div className="space-y-2">
                  <a href={`tel:${selectedBusiness.whatsapp}`} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600">
                    <Phone size={16} />
                    {selectedBusiness.whatsapp}
                  </a>
                  <a href={`mailto:${selectedBusiness.email}`} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600">
                    <Mail size={16} />
                    {selectedBusiness.email}
                  </a>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-2">Automations</p>
                <div className="flex flex-wrap gap-2">
                  {selectedBusiness.automations.map((auto, idx) => (
                    <span key={idx} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
                      {auto}
                    </span>
                  ))}
                </div>
              </div>

              {/* Subscription Info */}
              {selectedBusiness.has_subscription && (
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-600 uppercase mb-1">Subscription</p>
                  <p className="font-medium text-purple-700">
                    Premium Support - Rs {selectedBusiness.subscription_amount?.toLocaleString()}/mo
                  </p>
                  <p className="text-xs text-purple-600 mt-1">First month FREE</p>
                </div>
              )}

              {/* Payment Screenshots Section */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500 uppercase mb-3 flex items-center gap-2">
                  <CreditCard size={14} />
                  Payment Proofs
                </p>
                
                {loadingPayments ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="animate-spin text-gray-400" size={24} />
                  </div>
                ) : businessPayments.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-xl">
                    <Image className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="text-sm text-gray-500">No payment screenshots uploaded</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {businessPayments.map(payment => {
                      // Get screenshot URL - use API endpoint for authenticated access
                      let screenshotUrl: string | null = null

                      if (payment.screenshot_path) {
                        // Use our API endpoint to fetch the image with authentication
                        screenshotUrl = `/api/payments/image?path=${encodeURIComponent(payment.screenshot_path)}`
                      } else if (payment.screenshot_url) {
                        // Fallback to direct URL if available
                        screenshotUrl = payment.screenshot_url
                      } else if (payment.screenshot_data) {
                        // Handle base64 data (legacy)
                        screenshotUrl = payment.screenshot_data.startsWith('data:')
                          ? payment.screenshot_data
                          : `data:image/png;base64,${payment.screenshot_data}`
                      }
                      
                      return (
                        <div key={payment.id} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-medium text-gray-900">Rs {payment.amount.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(payment.created_at).toLocaleString()}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${paymentStatusColors[payment.status]}`}>
                              {payment.status}
                            </span>
                          </div>
                          
                          {/* Screenshot Preview */}
                          {screenshotUrl ? (
                            <div className="mb-3">
                              <div
                                className="relative cursor-pointer group"
                                onClick={() => setSelectedImage(screenshotUrl)}
                              >
                                <img
                                  src={screenshotUrl}
                                  alt="Payment Screenshot"
                                  className="w-full max-h-48 object-cover rounded-lg border border-gray-200"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    console.error('Failed to load image:', screenshotUrl)
                                    target.style.display = 'none'
                                    const errorDiv = document.createElement('div')
                                    errorDiv.className = 'p-4 bg-red-50 text-red-600 text-sm rounded-lg'
                                    errorDiv.innerHTML = `
                                      <p class="font-medium mb-1">Failed to load image</p>
                                      <p class="text-xs text-red-500 break-all">${screenshotUrl}</p>
                                      <p class="text-xs text-red-400 mt-2">The bucket might not be public or the file may have been deleted.</p>
                                    `
                                    target.parentElement!.appendChild(errorDiv)
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                  <ExternalLink className="text-white" size={24} />
                                </div>
                              </div>
                              {/* File path info */}
                              <div className="mt-2 text-xs">
                                <p className="text-gray-500">
                                  <span className="font-medium">Path:</span> {payment.screenshot_path || 'N/A'}
                                </p>
                                {screenshotUrl && (
                                  <a
                                    href={screenshotUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-700 flex items-center gap-1 mt-1"
                                  >
                                    <ExternalLink size={12} />
                                    Open in new tab
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="mb-3 p-3 bg-gray-50 rounded-lg text-center">
                              <Image className="mx-auto text-gray-300 mb-1" size={24} />
                              <p className="text-xs text-gray-500">No screenshot available</p>
                            </div>
                          )}
                          
                          {/* Payment Actions */}
                          {payment.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => updatePaymentStatus(payment.id, 'verified')}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                              >
                                <CheckCircle size={16} />
                                Verify
                              </button>
                              <button
                                onClick={() => updatePaymentStatus(payment.id, 'rejected')}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                              >
                                <XCircle size={16} />
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Registered</p>
                <p className="text-gray-700">{new Date(selectedBusiness.created_at).toLocaleDateString()}</p>
              </div>
              <div className="pt-4 flex gap-3">
                <a
                  href={`https://wa.me/${selectedBusiness.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-emerald-600 text-white text-center py-2 rounded-xl font-medium hover:bg-emerald-700"
                >
                  WhatsApp
                </a>
                <a
                  href={`mailto:${selectedBusiness.email}`}
                  className="flex-1 border border-gray-300 text-gray-700 text-center py-2 rounded-xl font-medium hover:bg-gray-50"
                >
                  Email
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Viewer */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setSelectedImage(null)}
          >
            <X size={32} />
          </button>
          <img 
            src={selectedImage} 
            alt="Payment Screenshot Full"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}