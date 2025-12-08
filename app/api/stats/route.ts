import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // Get today's date for filtering
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Fetch all statistics in parallel
    const [
      businessesResult,
      ordersResult,
      leadsResult,
      messagesResult,
      todayOrdersResult,
      todayLeadsResult
    ] = await Promise.all([
      supabase.from('businesses').select('id, business_type, automations', { count: 'exact' }),
      supabase.from('orders').select('id', { count: 'exact' }),
      supabase.from('leads').select('id', { count: 'exact' }),
      supabase.from('message_logs').select('id', { count: 'exact' }),
      supabase.from('orders').select('id', { count: 'exact' }).gte('created_at', todayISO),
      supabase.from('leads').select('id', { count: 'exact' }).gte('captured_at', todayISO)
    ])

    // Calculate business type distribution
    const businessesByType: Record<string, number> = {}
    const automationPopularity: Record<string, number> = {}
    
    if (businessesResult.data) {
      for (const business of businessesResult.data) {
        // Count by type
        const type = business.business_type || 'other'
        businessesByType[type] = (businessesByType[type] || 0) + 1
        
        // Count automations
        if (business.automations && Array.isArray(business.automations)) {
          for (const automation of business.automations) {
            automationPopularity[automation] = (automationPopularity[automation] || 0) + 1
          }
        }
      }
    }

    const stats = {
      totalBusinesses: businessesResult.count || 0,
      totalOrders: ordersResult.count || 0,
      totalLeads: leadsResult.count || 0,
      totalMessages: messagesResult.count || 0,
      todayOrders: todayOrdersResult.count || 0,
      todayLeads: todayLeadsResult.count || 0,
      businessesByType,
      automationPopularity
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
