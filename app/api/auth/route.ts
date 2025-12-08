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

// Generate a session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// POST - Verify passwords and create session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password1, password2 } = body

    if (!password1 || !password2) {
      return NextResponse.json(
        { error: 'Both passwords are required' },
        { status: 400 }
      )
    }

    // Get admin passwords from database
    const { data: adminConfig, error } = await supabase
      .from('admin_config')
      .select('*')
      .eq('key', 'admin_passwords')
      .single()

    if (error || !adminConfig) {
      console.error('Failed to fetch admin config:', error)
      return NextResponse.json(
        { error: 'Admin configuration not found. Please set up admin passwords first.' },
        { status: 500 }
      )
    }

    const config = adminConfig.value as {
      password1_hash: string
      password1_salt: string
      password2_hash: string
      password2_salt: string
    }

    // Verify both passwords
    const hash1 = hashPassword(password1, config.password1_salt)
    const hash2 = hashPassword(password2, config.password2_salt)

    const isPassword1Valid = hash1 === config.password1_hash
    const isPassword2Valid = hash2 === config.password2_hash

    if (!isPassword1Valid || !isPassword2Valid) {
      // Log failed attempt
      await supabase.from('admin_login_attempts').insert({
        success: false,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        created_at: new Date().toISOString()
      })

      return NextResponse.json(
        { error: 'Invalid passwords' },
        { status: 401 }
      )
    }

    // Generate session token
    const sessionToken = generateSessionToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store session in database (store hashed token)
    const hashedSessionToken = hashPassword(sessionToken, 'session_salt')
    await supabase.from('admin_sessions').insert({
      token: hashedSessionToken,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    })

    // Log successful login
    await supabase.from('admin_login_attempts').insert({
      success: true,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString()
    })

    // Create response with session cookie
    const response = NextResponse.json({ success: true })
    
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

// GET - Check if session is valid
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('admin_session')?.value

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const hashedToken = hashPassword(sessionToken, 'session_salt')

    // Check if session exists and is not expired
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('token', hashedToken)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    return NextResponse.json({ authenticated: true })

  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}

// DELETE - Logout (clear session)
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('admin_session')?.value

    if (sessionToken) {
      const hashedToken = hashPassword(sessionToken, 'session_salt')

      // Delete session from database
      await supabase
        .from('admin_sessions')
        .delete()
        .eq('token', hashedToken)
    }

    const response = NextResponse.json({ success: true })
    response.cookies.delete('admin_session')
    
    return response

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}