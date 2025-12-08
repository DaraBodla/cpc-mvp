import { NextRequest, NextResponse } from 'next/server'
import { 
  verifySignature, 
  extractMessage, 
  Database, 
  RateLimiter, 
  BotFlows, 
  WhatsAppAPI,
  BTN_MENU, BTN_ORDER, BTN_MORE, BTN_BACK_HOME, BTN_CONTACT, BTN_HISTORY,
  BTN_FAQ, BTN_CATALOGUE, BTN_BOOKING, BTN_LEAD,
  config
} from '@/lib/whatsapp'

// Webhook verification (GET)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === config.verifyToken) {
    console.log('Webhook verified successfully')
    return new NextResponse(challenge, { status: 200 })
  }

  console.warn(`Webhook verification failed: mode=${mode}, token=${token}`)
  return new NextResponse('Verification failed', { status: 403 })
}

// Handle incoming messages (POST)
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text()
    
    // Verify signature
    const signature = request.headers.get('x-hub-signature-256') || ''
    if (config.appSecret && !verifySignature(body, signature)) {
      console.warn('Invalid webhook signature')
      return NextResponse.json({ status: 'invalid_signature' }, { status: 401 })
    }

    // Parse JSON
    let data: Record<string, unknown>
    try {
      data = JSON.parse(body)
    } catch {
      return NextResponse.json({ status: 'invalid_json' }, { status: 400 })
    }

    // Extract message
    const msg = extractMessage(data)

    // Always return 200 to Meta to avoid redelivery storms
    if (!msg || !msg.id || !msg.from) {
      return NextResponse.json({ status: 'ignored' }, { status: 200 })
    }

    const to = msg.from as string
    const waId = msg.from as string
    const msgId = msg.id as string

    // Log inbound message
    await WhatsAppAPI.logMessage(waId, 'inbound', msg.kind as string || 'unknown', msg as Record<string, unknown>)

    // Deduplication check
    if (await Database.alreadyProcessed(msgId)) {
      console.log(`Duplicate message ignored: ${msgId}`)
      return NextResponse.json({ status: 'duplicate' }, { status: 200 })
    }

    await Database.markProcessed(msgId, waId, msg.kind as string)

    // Check if user is blocked
    if (await Database.isUserBlocked(waId)) {
      console.log(`Blocked user attempted contact: ${waId}`)
      return NextResponse.json({ status: 'blocked' }, { status: 200 })
    }

    // Rate limiting
    const { allowed, remaining } = await RateLimiter.checkRateLimit(waId)
    if (!allowed) {
      console.warn(`Rate limit exceeded for ${waId}`)
      await BotFlows.showRateLimited(to)
      return NextResponse.json({ status: 'rate_limited' }, { status: 200 })
    }

    // Get or create user
    await Database.getOrCreateUser(waId, to)

    // Handle message based on type
    const kind = msg.kind as string

    // Handle text messages
    if (kind === 'text') {
      const text = ((msg.text as string) || '').trim().toLowerCase()

      if (['hi', 'hello', 'start', 'hey', 'hola', 'menu'].includes(text)) {
        await BotFlows.showHome(to)
      } else if (text === 'faq' || text === 'help') {
        await BotFlows.showFAQ(to)
      } else if (['catalogue', 'catalog', 'products', 'order'].includes(text)) {
        await BotFlows.showCatalogue(to)
      } else if (['book', 'booking', 'appointment'].includes(text)) {
        await BotFlows.showBooking(to)
      } else if (['lead', 'contact', 'interest', 'demo'].includes(text)) {
        await BotFlows.showLeadCapture(to, waId)
      } else if (text === 'more') {
        await BotFlows.showMore(to)
      } else if (['history', 'orders'].includes(text)) {
        await BotFlows.showHistory(to, waId)
      } else {
        // Default: show home
        await BotFlows.showHome(to)
      }

      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    // Handle button clicks
    if (kind === 'button') {
      const rid = msg.reply_id as string

      const handlers: Record<string, () => Promise<void>> = {
        [BTN_MENU]: () => BotFlows.showHome(to),
        [BTN_ORDER]: () => BotFlows.showCatalogue(to),
        [BTN_MORE]: () => BotFlows.showMore(to),
        [BTN_HISTORY]: () => BotFlows.showHistory(to, waId),
        [BTN_CONTACT]: () => BotFlows.showLeadCapture(to, waId),
        [BTN_BACK_HOME]: () => BotFlows.showHome(to),
        [BTN_FAQ]: () => BotFlows.showFAQ(to),
        [BTN_CATALOGUE]: () => BotFlows.showCatalogue(to),
        [BTN_BOOKING]: () => BotFlows.showBooking(to),
        [BTN_LEAD]: () => BotFlows.showLeadCapture(to, waId),
      }

      const handler = handlers[rid]
      if (handler) {
        await handler()
      } else {
        await BotFlows.showHome(to)
      }

      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    // Handle list selection (ordering)
    if (kind === 'list') {
      const rid = msg.reply_id as string
      const title = (msg.title as string) || 'Item'
      
      await BotFlows.handleOrder(to, waId, rid, title)
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    // Handle other message types
    await WhatsAppAPI.sendText(
      to,
      'I can only process text messages and button selections right now. ' +
      'Please use the menu options below! 👇'
    )
    await BotFlows.showHome(to)

    return NextResponse.json({ status: 'ok' }, { status: 200 })

  } catch (error) {
    console.error('Webhook error:', error)
    // Still return 200 to avoid Meta retries
    return NextResponse.json({ status: 'error' }, { status: 200 })
  }
}
