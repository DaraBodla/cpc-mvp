import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// POST - Track analytics event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, page, automation_type, source, session_id, business_id, metadata } = body

    if (!event) {
      return NextResponse.json({ error: 'Event is required' }, { status: 400 })
    }

    const { error } = await supabase.from('analytics_events').insert({
      event,
      page: page || null,
      automation_type: automation_type || null,
      source: source || null,
      session_id: session_id || null,
      business_id: business_id || null,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    })

    if (error) {
      console.error('Analytics insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 })
  }
}

// GET - Get analytics metrics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const endDate = searchParams.get('end') || new Date().toISOString()

    // Get all events in date range
    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (error) {
      console.error('Analytics fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!events || events.length === 0) {
      return NextResponse.json({
        conversionRate: 0,
        demoBotTriggerRate: 0,
        paymentUploadRate: 0,
        automationDistribution: {},
        totalVisitors: 0,
        totalSubmissions: 0,
        totalDemoClicks: 0,
        totalDemoMessages: 0,
        totalPaymentUploads: 0,
        uniqueDemoEngagements: 0
      })
    }

    // Calculate metrics
    const pageViews = events.filter(e => e.event === 'page_view' && e.page === 'landing')
    const uniqueVisitors = new Set(pageViews.map(e => e.session_id).filter(Boolean)).size
    
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

    return NextResponse.json({
      conversionRate: Math.round(conversionRate * 100) / 100,
      demoBotTriggerRate: Math.round(demoBotTriggerRate * 100) / 100,
      paymentUploadRate: Math.round(paymentUploadRate * 100) / 100,
      automationDistribution,
      totalVisitors: uniqueVisitors,
      totalSubmissions,
      totalDemoClicks: demoClicks.length,
      totalDemoMessages: demoMessages.length,
      totalPaymentUploads,
      uniqueDemoEngagements
    })

  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Failed to get metrics' }, { status: 500 })
  }
}