import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// POST - Upload payment screenshot and create payment record
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const screenshot = formData.get('screenshot') as File
    const businessId = formData.get('business_id') as string
    const amount = formData.get('amount') as string

    if (!screenshot || !businessId) {
      return NextResponse.json(
        { error: 'Screenshot and business_id are required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!screenshot.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    if (screenshot.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = screenshot.name.split('.').pop() || 'png'
    const timestamp = Date.now()
    const fileName = `payment_${businessId}_${timestamp}.${fileExt}`
    const filePath = `payments/${fileName}`

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await screenshot.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage bucket 'cpc'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('cpc')
      .upload(filePath, buffer, {
        contentType: screenshot.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload screenshot: ' + uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('cpc')
      .getPublicUrl(filePath)

    const screenshotUrl = urlData.publicUrl

    // Create payment record in database
    const { data: payment, error: dbError } = await supabase
      .from('payments')
      .insert({
        business_id: parseInt(businessId),
        amount: parseInt(amount) || 0,
        screenshot_url: screenshotUrl,
        screenshot_path: filePath,
        screenshot_filename: fileName,
        screenshot_size: screenshot.size,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      // Try to delete the uploaded file if DB insert fails
      await supabase.storage.from('cpc').remove([filePath])
      return NextResponse.json(
        { error: 'Failed to create payment record: ' + dbError.message },
        { status: 500 }
      )
    }

    // Update business payment status
    await supabase
      .from('businesses')
      .update({ 
        payment_status: 'pending',
        payment_amount: parseInt(amount) || 0
      })
      .eq('id', parseInt(businessId))

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        screenshot_url: screenshotUrl,
        status: 'pending'
      },
      message: 'Payment screenshot uploaded successfully'
    })

  } catch (error) {
    console.error('Payment upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Fetch payments (for admin dashboard)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('business_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })

    if (businessId) {
      query = query.eq('business_id', parseInt(businessId))
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: payments, error } = await query

    if (error) {
      console.error('Payments fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ payments: payments || [] })

  } catch (error) {
    console.error('Payments API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update payment status (for admin)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId, status, notes } = body

    if (!paymentId || !status) {
      return NextResponse.json(
        { error: 'Payment ID and status are required' },
        { status: 400 }
      )
    }

    const validStatuses = ['pending', 'verified', 'rejected', 'refunded']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: ' + validStatuses.join(', ') },
        { status: 400 }
      )
    }

    // Update payment record
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'verified') {
      updateData.verified_at = new Date().toISOString()
    }

    if (notes) {
      updateData.notes = notes
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', paymentId)
      .select()
      .single()

    if (error) {
      console.error('Payment update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update business payment status
    if (payment?.business_id) {
      const businessStatus = status === 'verified' ? 'paid' : 
                            status === 'rejected' ? 'unpaid' : 'pending'
      
      await supabase
        .from('businesses')
        .update({ payment_status: businessStatus })
        .eq('id', payment.business_id)
    }

    return NextResponse.json({
      success: true,
      payment,
      message: `Payment ${status}`
    })

  } catch (error) {
    console.error('Payment update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}