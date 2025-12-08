import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Hash password using SHA-256 with salt
function hashPassword(password: string, salt: string): string {
  return crypto
    .createHash('sha256')
    .update(password + salt)
    .digest('hex')
}

// Generate a random salt
function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex')
}

// POST - Set up admin passwords (only works if no passwords exist)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password1, password2, setupKey } = body

    // Require a setup key for initial setup (change this or set in env)
    const validSetupKey = process.env.ADMIN_SETUP_KEY || 'cpc-initial-setup-2025'
    
    if (setupKey !== validSetupKey) {
      return NextResponse.json(
        { error: 'Invalid setup key' },
        { status: 403 }
      )
    }

    if (!password1 || !password2) {
      return NextResponse.json(
        { error: 'Both passwords are required' },
        { status: 400 }
      )
    }

    if (password1.length < 8 || password2.length < 8) {
      return NextResponse.json(
        { error: 'Passwords must be at least 8 characters long' },
        { status: 400 }
      )
    }

    if (password1 === password2) {
      return NextResponse.json(
        { error: 'Both passwords must be different for security' },
        { status: 400 }
      )
    }

    // Check if passwords already exist
    const { data: existing } = await supabase
      .from('admin_config')
      .select('id')
      .eq('key', 'admin_passwords')
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Admin passwords already configured. Delete existing config to reset.' },
        { status: 409 }
      )
    }

    // Generate salts and hash passwords
    const salt1 = generateSalt()
    const salt2 = generateSalt()
    const hash1 = hashPassword(password1, salt1)
    const hash2 = hashPassword(password2, salt2)

    // Store encrypted passwords
    const { error } = await supabase.from('admin_config').insert({
      key: 'admin_passwords',
      value: {
        password1_hash: hash1,
        password1_salt: salt1,
        password2_hash: hash2,
        password2_salt: salt2
      },
      created_at: new Date().toISOString()
    })

    if (error) {
      console.error('Failed to save admin passwords:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Admin passwords configured successfully! You can now login to the dashboard.' 
    })

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Failed to set up admin passwords' },
      { status: 500 }
    )
  }
}