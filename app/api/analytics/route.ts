import { NextRequest, NextResponse } from 'next/server'
import { Analytics } from '@/lib/analytics'

// GET - Retrieve metrics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start') || undefined
    const endDate = searchParams.get('end') || undefined
    const daily = searchParams.get('daily') === 'true'
    const days = parseInt(searchParams.get('days') || '30')

    if (daily) {
      const dailyMetrics = await Analytics.getDailyMetrics(days)
      return NextResponse.json({ daily: dailyMetrics })
    }

    const metrics = await Analytics.getMetrics(startDate, endDate)
    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

// POST - Track an event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, page, source, session_id, business_id, automation_type, metadata } = body

    if (!event) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      )
    }

    await Analytics.track({
      event,
      page,
      source,
      session_id,
      business_id,
      automation_type,
      metadata
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}
