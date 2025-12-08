import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const screenshot = formData.get('screenshot') as File
    const businessId = formData.get('business_id') as string
    const amount = formData.get('amount') as string

    if (!screenshot || !businessId) {
      return NextResponse.json(
        { error: 'Screenshot and business ID are required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Convert file to base64 for storage
    const arrayBuffer = await screenshot.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = screenshot.type
    const dataUrl = `data:${mimeType};base64,${base64}`

    // Store payment record with screenshot
    const { data, error } = await supabase
      .from('payments')
      .insert({
        business_id: parseInt(businessId),
        amount: parseInt(amount) || 0,
        screenshot_data: dataUrl,
        screenshot_filename: screenshot.name,
        screenshot_size: screenshot.size,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to save payment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update business status to indicate payment pending
    await supabase
      .from('businesses')
      .update({ 
        payment_status: 'pending',
        payment_amount: parseInt(amount) || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    // Track analytics event
    await supabase.from('analytics_events').insert({
      event: 'payment_screenshot_uploaded',
      business_id: parseInt(businessId),
      metadata: { 
        amount: parseInt(amount) || 0,
        filename: screenshot.name,
        size: screenshot.size
      },
      created_at: new Date().toISOString()
    })

    return NextResponse.json({ 
      success: true, 
      payment: data,
      message: 'Payment screenshot uploaded successfully' 
    })

  } catch (error) {
    console.error('Payment upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload payment screenshot' },
      { status: 500 }
    )
  }
}

// GET - Retrieve payments for admin
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const businessId = searchParams.get('business_id')

    const supabase = createServerClient()
    
    let query = supabase
      .from('payments')
      .select(`
        *,
        businesses (
          business_name,
          owner_name,
          whatsapp,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (businessId) {
      query = query.eq('business_id', businessId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch payments:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ payments: data || [] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
