import { createServerClient } from './supabase'

// Analytics event types
export type AnalyticsEvent = 
  | 'page_view'
  | 'form_start'
  | 'form_submit'
  | 'demo_bot_click'
  | 'demo_bot_message'
  | 'automation_selected'
  | 'payment_screenshot_uploaded'

export interface AnalyticsData {
  event: AnalyticsEvent
  page?: string
  automation_type?: string
  source?: string
  session_id?: string
  business_id?: number
  metadata?: Record<string, unknown>
}

// Server-side analytics tracking
export class Analytics {
  
  // Track any analytics event
  static async track(data: AnalyticsData): Promise<void> {
    try {
      const supabase = createServerClient()
      await supabase.from('analytics_events').insert({
        event: data.event,
        page: data.page,
        automation_type: data.automation_type,
        source: data.source,
        session_id: data.session_id,
        business_id: data.business_id,
        metadata: data.metadata || {},
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Analytics tracking error:', error)
    }
  }

  // Track page view
  static async trackPageView(page: string, sessionId: string): Promise<void> {
    await this.track({
      event: 'page_view',
      page,
      session_id: sessionId
    })
  }

  // Track form start (user begins filling form)
  static async trackFormStart(sessionId: string): Promise<void> {
    await this.track({
      event: 'form_start',
      page: 'landing',
      session_id: sessionId
    })
  }

  // Track successful form submission
  static async trackFormSubmit(sessionId: string, businessId: number, automations: string[]): Promise<void> {
    await this.track({
      event: 'form_submit',
      page: 'landing',
      session_id: sessionId,
      business_id: businessId,
      metadata: { automations }
    })
    
    // Also track each automation selection
    for (const automation of automations) {
      await this.track({
        event: 'automation_selected',
        automation_type: automation,
        session_id: sessionId,
        business_id: businessId
      })
    }
  }

  // Track demo bot click (from website)
  static async trackDemoBotClick(sessionId: string, source: string, businessId?: number): Promise<void> {
    await this.track({
      event: 'demo_bot_click',
      source,
      session_id: sessionId,
      business_id: businessId
    })
  }

  // Track demo bot message (from WhatsApp webhook)
  static async trackDemoBotMessage(waId: string): Promise<void> {
    await this.track({
      event: 'demo_bot_message',
      source: 'whatsapp',
      metadata: { wa_id: waId }
    })
  }

  // Get metrics for dashboard
  static async getMetrics(startDate?: string, endDate?: string) {
    const supabase = createServerClient()
    
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const end = endDate || new Date().toISOString()

    // Get all events in date range
    const { data: events } = await supabase
      .from('analytics_events')
      .select('*')
      .gte('created_at', start)
      .lte('created_at', end)

    if (!events) {
      return {
        conversionRate: 0,
        demoBotTriggerRate: 0,
        paymentUploadRate: 0,
        automationDistribution: {},
        totalVisitors: 0,
        totalSubmissions: 0,
        totalDemoClicks: 0,
        totalDemoMessages: 0,
        totalPaymentUploads: 0
      }
    }

    // Calculate metrics
    const pageViews = events.filter(e => e.event === 'page_view' && e.page === 'landing')
    const uniqueVisitors = new Set(pageViews.map(e => e.session_id)).size
    
    const formSubmits = events.filter(e => e.event === 'form_submit')
    const totalSubmissions = formSubmits.length

    const demoClicks = events.filter(e => e.event === 'demo_bot_click')
    const demoMessages = events.filter(e => e.event === 'demo_bot_message')
    
    // Count actual payment uploads from storage bucket instead of analytics events
    const { data: paymentFiles, error: storageError } = await supabase.storage
      .from('cpc')
      .list('payments/', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    const totalPaymentUploads = storageError ? 0 : (paymentFiles?.length || 0)
    
    // Unique businesses that clicked demo after submitting
    const submittedBusinessIds = new Set(formSubmits.map(e => e.business_id).filter(Boolean))
    const demoClicksAfterSubmit = demoClicks.filter(e => e.business_id && submittedBusinessIds.has(e.business_id))
    const uniqueDemoEngagements = new Set(demoClicksAfterSubmit.map(e => e.business_id)).size

    // Automation distribution
    const automationEvents = events.filter(e => e.event === 'automation_selected')
    const automationDistribution: Record<string, number> = {}
    for (const event of automationEvents) {
      const type = event.automation_type || 'unknown'
      automationDistribution[type] = (automationDistribution[type] || 0) + 1
    }

    // Calculate rates
    const conversionRate = uniqueVisitors > 0 
      ? (totalSubmissions / uniqueVisitors) * 100 
      : 0

    const demoBotTriggerRate = totalSubmissions > 0 
      ? (uniqueDemoEngagements / totalSubmissions) * 100 
      : 0

    const paymentUploadRate = totalSubmissions > 0 
      ? (totalPaymentUploads / totalSubmissions) * 100 
      : 0

    return {
      // Metric 1: Conversion Rate
      conversionRate: Math.round(conversionRate * 100) / 100,
      
      // Metric 2: Demo Bot Trigger Rate
      demoBotTriggerRate: Math.round(demoBotTriggerRate * 100) / 100,
      
      // Metric 3: Automation Distribution
      automationDistribution,
      
      // Metric 4: Payment Upload Rate
      paymentUploadRate: Math.round(paymentUploadRate * 100) / 100,
      
      // Raw numbers
      totalVisitors: uniqueVisitors,
      totalSubmissions,
      totalDemoClicks: demoClicks.length,
      totalDemoMessages: demoMessages.length,
      totalPaymentUploads,
      uniqueDemoEngagements,
      
      // Time range
      startDate: start,
      endDate: end
    }
  }

  // Get daily metrics for charts
  static async getDailyMetrics(days: number = 30) {
    const supabase = createServerClient()
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data: events } = await supabase
      .from('analytics_events')
      .select('event, created_at, session_id, business_id')
      .gte('created_at', startDate)
      .order('created_at', { ascending: true })

    if (!events) return []

    // Group by day
    const dailyData: Record<string, {
      date: string
      visitors: Set<string>
      submissions: number
      demoClicks: number
    }> = {}

    for (const event of events) {
      const date = event.created_at.split('T')[0]
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          visitors: new Set(),
          submissions: 0,
          demoClicks: 0
        }
      }

      if (event.event === 'page_view' && event.session_id) {
        dailyData[date].visitors.add(event.session_id)
      }
      if (event.event === 'form_submit') {
        dailyData[date].submissions++
      }
      if (event.event === 'demo_bot_click') {
        dailyData[date].demoClicks++
      }
    }

    return Object.values(dailyData).map(day => ({
      date: day.date,
      visitors: day.visitors.size,
      submissions: day.submissions,
      demoClicks: day.demoClicks,
      conversionRate: day.visitors.size > 0 
        ? Math.round((day.submissions / day.visitors.size) * 100 * 100) / 100 
        : 0
    }))
  }
}
