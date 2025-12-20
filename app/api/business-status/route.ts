import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// GET - Search for business by email or phone
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'email' or 'phone'
    const value = searchParams.get('value')

    if (!type || !value) {
      return NextResponse.json(
        { error: 'Search type and value are required' },
        { status: 400 }
      )
    }

    // Search for business
    let query = supabase.from('businesses').select('*')

    if (type === 'email') {
      query = query.eq('email', value.toLowerCase().trim())
    } else if (type === 'phone') {
      // Clean phone number - remove spaces, dashes, etc.
      const cleanPhone = value.replace(/[^0-9+]/g, '')
      query = query.eq('whatsapp', cleanPhone)
    } else {
      return NextResponse.json(
        { error: 'Invalid search type. Use "email" or "phone"' },
        { status: 400 }
      )
    }

    const { data: businesses, error: businessError } = await query.limit(1)

    if (businessError) {
      console.error('Business search error:', businessError)
      return NextResponse.json({ error: businessError.message }, { status: 500 })
    }

    if (!businesses || businesses.length === 0) {
      return NextResponse.json(
        { error: 'No business found with this information. Please check your details or register first.' },
        { status: 404 }
      )
    }

    const business = businesses[0]

    // Get latest payment for this business
    const { data: payments, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (paymentError) {
      console.error('Payment search error:', paymentError)
      // Don't fail if payments table doesn't exist or has issues
    }

    const payment = payments && payments.length > 0 ? payments[0] : null

    return NextResponse.json({
      business: {
        id: business.id,
        business_name: business.business_name,
        business_type: business.business_type,
        owner_name: business.owner_name,
        whatsapp: business.whatsapp,
        email: business.email,
        automations: business.automations || [],
        status: business.status || 'pending',
        payment_status: business.payment_status || (payment?.status || 'unpaid'),
        total_amount: business.total_amount || 0,
        has_subscription: business.has_subscription || false,
        subscription_amount: business.subscription_amount || 0,
        created_at: business.created_at
      },
      payment: payment ? {
        id: payment.id,
        business_id: payment.business_id,
        amount: payment.amount,
        status: payment.status,
        created_at: payment.created_at
      } : null
    })

  } catch (error) {
    console.error('Business status API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch business status' },
      { status: 500 }
    )
  }
}