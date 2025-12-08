import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch businesses:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ businesses: data || [] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { businessName, businessType, ownerName, whatsapp, email, automations } = body
    
    if (!businessName || !businessType || !ownerName || !whatsapp || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!automations || automations.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one automation' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Check for duplicate email or whatsapp
    const { data: existing } = await supabase
      .from('businesses')
      .select('id')
      .or(`email.eq.${email},whatsapp.eq.${whatsapp}`)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'A business with this email or WhatsApp number already exists' },
        { status: 409 }
      )
    }

    // Insert new business
    const { data, error } = await supabase
      .from('businesses')
      .insert({
        business_name: businessName,
        business_type: businessType,
        owner_name: ownerName,
        whatsapp,
        email,
        automations,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create business:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ business: data, message: 'Business registered successfully' })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
