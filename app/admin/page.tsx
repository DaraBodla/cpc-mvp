'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  BarChart3, Users, Package, MessageSquare, TrendingUp, 
  RefreshCw, Search, Eye, CheckCircle, Clock, ArrowLeft, Zap, Target,
  Mail, Phone, X, Percent, MousePointer, PieChart
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
  created_at: string
  notes?: string
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
}

interface Metrics {
  conversionRate: number
  demoBotTriggerRate: number
  automationDistribution: Record<string, number>
  totalVisitors: number
  totalSubmissions: number
  totalDemoClicks: number
  totalDemoMessages: number
  uniqueDemoEngagements: number
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  contacted: 'bg-blue-100 text-blue-800',
  onboarded: 'bg-purple-100 text-purple-800',
  active: 'bg-emerald-100 text-emerald-800'
}

export default function AdminDashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [activeTab, setActiveTab] = useState<'businesses' | 'metrics'>('businesses')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [businessesRes, statsRes, metricsRes] = await Promise.all([
        fetch('/api/businesses'),
        fetch('/api/stats'),
        fetch('/api/analytics')
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
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            {/* Raw Numbers */}
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
                <p className="text-2xl font-bold text-gray-900">{metrics?.totalDemoMessages || 0}</p>
                <p className="text-sm text-gray-600">WhatsApp Messages</p>
              </div>
            </div>
          </div>
        )}

        {/* Businesses Tab */}
        {activeTab === 'businesses' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 lg:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-emerald-100 p-2 lg:p-3 rounded-xl">
                    <Users className="text-emerald-600" size={20} />
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stats?.totalBusinesses || businesses.length}</p>
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
                    <MessageSquare className="text-amber-600" size={20} />
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900">{stats?.totalMessages || 0}</p>
                <p className="text-gray-500 text-xs lg:text-sm mt-1">Messages</p>
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
                              onClick={() => setSelectedBusiness(business)}
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

      {/* Detail Modal */}
      {selectedBusiness && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
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
    </div>
  )
}
