import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// GET - Fetch all businesses
export async function GET() {
  try {
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch businesses:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ businesses: businesses || [] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new business
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { 
      businessName, 
      businessType, 
      ownerName, 
      whatsapp, 
      email, 
      automations, 
      totalAmount,
      hasSubscription,
      subscriptionAmount 
    } = body
    
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

    // Check for duplicate email
    const { data: existingEmail } = await supabase
      .from('businesses')
      .select('id')
      .eq('email', email)
      .limit(1)

    // Check for duplicate whatsapp
    const { data: existingPhone } = await supabase
      .from('businesses')
      .select('id')
      .eq('whatsapp', whatsapp)
      .limit(1)

    if ((existingEmail && existingEmail.length > 0) || (existingPhone && existingPhone.length > 0)) {
      return NextResponse.json(
        { error: 'A business with this email or WhatsApp number already exists' },
        { status: 409 }
      )
    }

    // Insert new business
    const insertData: Record<string, unknown> = {
      business_name: businessName,
      business_type: businessType,
      owner_name: ownerName,
      whatsapp,
      email,
      automations,
      status: 'signed up',
      created_at: new Date().toISOString()
    }

    // Add optional fields if provided
    if (totalAmount !== undefined) {
      insertData.total_amount = totalAmount
    }

    if (hasSubscription !== undefined) {
      insertData.has_subscription = hasSubscription
    }

    if (subscriptionAmount !== undefined) {
      insertData.subscription_amount = subscriptionAmount
    }

    const { data, error } = await supabase
      .from('businesses')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Failed to create business:', error)
      
      // If error is about missing columns, try without optional fields
      if (error.message?.includes('column')) {
        const basicInsertData = {
          business_name: businessName,
          business_type: businessType,
          owner_name: ownerName,
          whatsapp,
          email,
          automations,
          status: 'signed up',
          created_at: new Date().toISOString()
        }
        
        const { data: retryData, error: retryError } = await supabase
          .from('businesses')
          .insert(basicInsertData)
          .select()
          .single()
        
        if (retryError) {
          return NextResponse.json({ error: retryError.message }, { status: 500 })
        }
        return NextResponse.json({ business: retryData, message: 'Business registered successfully' })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ business: data, message: 'Business registered successfully' })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}