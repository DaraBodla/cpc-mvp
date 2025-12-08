import crypto from 'crypto'
import { createServerClient } from './supabase'

// Configuration
const config = {
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'cpc',
  appSecret: process.env.WHATSAPP_APP_SECRET || '',
  rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '30'),
  rateLimitWindowSeconds: parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60'),
}

// Button IDs
export const BTN_MENU = 'BTN_MENU'
export const BTN_ORDER = 'BTN_ORDER'
export const BTN_MORE = 'BTN_MORE'
export const BTN_BACK_HOME = 'BTN_BACK_HOME'
export const BTN_CONTACT = 'BTN_CONTACT'
export const BTN_HISTORY = 'BTN_HISTORY'
export const BTN_DEMO = 'BTN_DEMO'
export const BTN_FAQ = 'BTN_FAQ'
export const BTN_CATALOGUE = 'BTN_CATALOGUE'
export const BTN_BOOKING = 'BTN_BOOKING'
export const BTN_LEAD = 'BTN_LEAD'

// Item IDs
export const ITEM_ZINGER = 'ITEM_ZINGER'
export const ITEM_PIZZA = 'ITEM_PIZZA'
export const ITEM_FRIES = 'ITEM_FRIES'

// Verify webhook signature
export function verifySignature(payload: string, signature: string): boolean {
  if (!config.appSecret) {
    console.warn('WHATSAPP_APP_SECRET not set, skipping signature verification')
    return true
  }

  const expectedSignature = crypto
    .createHmac('sha256', config.appSecret)
    .update(payload)
    .digest('hex')

  const providedSig = signature.startsWith('sha256=') ? signature.slice(7) : signature

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(providedSig)
  )
}

// WhatsApp API wrapper
export class WhatsAppAPI {
  private static BASE_URL = 'https://graph.facebook.com/v21.0'

  private static getUrl(path: string): string {
    return `${this.BASE_URL}/${config.phoneNumberId}/${path}`
  }

  static async send(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!config.accessToken) {
      throw new Error('WHATSAPP_ACCESS_TOKEN is not set')
    }

    const response = await fetch(this.getUrl('messages'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`WhatsApp API error: ${response.status} - ${error}`)
      throw new Error(`WhatsApp API error: ${response.status}`)
    }

    return response.json()
  }

  static async sendText(to: string, text: string): Promise<Record<string, unknown>> {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }
    const result = await this.send(payload)
    await this.logMessage(to, 'outbound', 'text', { body: text })
    return result
  }

  static async sendButtons(
    to: string,
    bodyText: string,
    buttons: { id: string; title: string }[]
  ): Promise<Record<string, unknown>> {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.slice(0, 3).map((b) => ({
            type: 'reply',
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    }
    const result = await this.send(payload)
    await this.logMessage(to, 'outbound', 'buttons', payload.interactive)
    return result
  }

  static async sendList(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
  ): Promise<Record<string, unknown>> {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText },
        action: {
          button: buttonText,
          sections,
        },
      },
    }
    const result = await this.send(payload)
    await this.logMessage(to, 'outbound', 'list', payload.interactive)
    return result
  }

  static async logMessage(
    waId: string,
    direction: 'inbound' | 'outbound',
    messageType: string,
    content: Record<string, unknown>,
    status: string = 'success',
    error?: string
  ): Promise<void> {
    try {
      const supabase = createServerClient()
      await supabase.from('message_logs').insert({
        wa_id: waId,
        direction,
        message_type: messageType,
        content,
        status,
        error_message: error,
        created_at: new Date().toISOString(),
      })
    } catch (e) {
      console.error('Failed to log message:', e)
    }
  }
}

// Database operations
export class Database {
  static async getOrCreateUser(waId: string, phone?: string) {
    const supabase = createServerClient()
    
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('wa_id', waId)
      .single()

    if (existing) {
      await supabase
        .from('users')
        .update({ last_active_at: new Date().toISOString() })
        .eq('wa_id', waId)
      return existing
    }

    const newUser = {
      wa_id: waId,
      phone: phone || waId,
      first_seen_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    }
    
    const { data } = await supabase.from('users').insert(newUser).select().single()
    console.log(`New user created: ${waId}`)
    return data || newUser
  }

  static async isUserBlocked(waId: string): Promise<boolean> {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('users')
      .select('is_blocked')
      .eq('wa_id', waId)
      .single()
    return data?.is_blocked || false
  }

  static async alreadyProcessed(messageId: string): Promise<boolean> {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('processed_messages')
      .select('id')
      .eq('message_id', messageId)
    return (data?.length || 0) > 0
  }

  static async markProcessed(messageId: string, waId: string, messageType?: string) {
    const supabase = createServerClient()
    await supabase.from('processed_messages').insert({
      message_id: messageId,
      wa_id: waId,
      message_type: messageType,
      processed_at: new Date().toISOString(),
    })
  }

  static async createOrder(
    waId: string,
    customerPhone: string,
    itemId: string,
    itemName: string,
    itemPrice?: number
  ) {
    const supabase = createServerClient()
    
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wa_id', waId)
      .single()

    const orderData = {
      user_id: user?.id,
      wa_id: waId,
      customer_phone: customerPhone,
      item_id: itemId,
      item_name: itemName,
      item_price: itemPrice,
      status: 'placed',
      created_at: new Date().toISOString(),
    }
    
    const { data } = await supabase.from('orders').insert(orderData).select().single()
    console.log(`Order created for ${waId}: ${itemName}`)
    return data || orderData
  }

  static async getOrderHistory(waId: string, limit: number = 10) {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('orders')
      .select('order_number, item_name, status, created_at')
      .eq('wa_id', waId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return data || []
  }

  static async getMenuItems() {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .order('sort_order')
    return data || []
  }

  static async captureLead(waId: string, phone: string, name?: string, source: string = 'whatsapp') {
    const supabase = createServerClient()
    
    // Check if lead already exists
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('wa_id', waId)
      .single()

    if (existing) {
      // Update existing lead
      await supabase
        .from('leads')
        .update({ 
          last_interaction: new Date().toISOString(),
          name: name || undefined 
        })
        .eq('wa_id', waId)
      return existing
    }

    const leadData = {
      wa_id: waId,
      phone,
      name,
      source,
      captured_at: new Date().toISOString(),
      status: 'new',
    }
    
    const { data } = await supabase.from('leads').insert(leadData).select().single()
    console.log(`Lead captured: ${waId}`)
    return data || leadData
  }
}

// Rate limiter
export class RateLimiter {
  static async checkRateLimit(waId: string): Promise<{ allowed: boolean; remaining: number }> {
    const supabase = createServerClient()
    const windowStart = new Date()
    windowStart.setSeconds(0, 0)
    const windowStartStr = windowStart.toISOString()

    const { data: existing } = await supabase
      .from('rate_limits')
      .select('request_count')
      .eq('wa_id', waId)
      .eq('window_start', windowStartStr)
      .single()

    if (existing) {
      if (existing.request_count >= config.rateLimitRequests) {
        return { allowed: false, remaining: 0 }
      }

      await supabase
        .from('rate_limits')
        .update({ request_count: existing.request_count + 1 })
        .eq('wa_id', waId)
        .eq('window_start', windowStartStr)

      return { allowed: true, remaining: config.rateLimitRequests - existing.request_count - 1 }
    }

    try {
      await supabase.from('rate_limits').insert({
        wa_id: waId,
        window_start: windowStartStr,
        request_count: 1,
      })
    } catch {
      // Handle race condition
    }

    return { allowed: true, remaining: config.rateLimitRequests - 1 }
  }
}

// Bot flows
export class BotFlows {
  static async showHome(to: string) {
    await WhatsAppAPI.sendButtons(
      to,
      '👋 Welcome to CPC Demo Bot!\n\nExperience our WhatsApp automation features:',
      [
        { id: BTN_FAQ, title: '❓ FAQ Demo' },
        { id: BTN_CATALOGUE, title: '📦 Catalogue' },
        { id: BTN_MORE, title: '⚙️ More Options' },
      ]
    )
  }

  static async showFAQ(to: string) {
    await WhatsAppAPI.sendText(
      to,
      '❓ *Frequently Asked Questions*\n\n' +
      '*Q: What is CPC?*\n' +
      'CPC (Chat Product Company) provides WhatsApp automation solutions for businesses.\n\n' +
      '*Q: How does it work?*\n' +
      'We set up an AI-powered bot on your WhatsApp Business number that handles customer queries 24/7.\n\n' +
      '*Q: What features are available?*\n' +
      '• FAQ Automation\n' +
      '• Product Catalogues\n' +
      '• Appointment Booking\n' +
      '• Lead Capture\n' +
      '• Order Management\n\n' +
      '*Q: How long does setup take?*\n' +
      'Most businesses are up and running within 24 hours!'
    )
    await WhatsAppAPI.sendButtons(
      to,
      'Want to see more features?',
      [
        { id: BTN_CATALOGUE, title: '📦 View Catalogue' },
        { id: BTN_LEAD, title: '📝 Get Started' },
        { id: BTN_BACK_HOME, title: '🔙 Back' },
      ]
    )
  }

  static async showCatalogue(to: string) {
    const items = await Database.getMenuItems()
    
    if (items.length > 0) {
      const rows = items.map((item) => ({
        id: item.item_id,
        title: item.name,
        description: `Rs ${item.price / 100}`,
      }))

      await WhatsAppAPI.sendList(
        to,
        '📦 *Product Catalogue Demo*\n\nBrowse our sample products:',
        'View Products',
        [{ title: 'Available Items', rows }]
      )
    } else {
      // Fallback demo items
      await WhatsAppAPI.sendList(
        to,
        '📦 *Product Catalogue Demo*\n\nBrowse our sample products:',
        'View Products',
        [{
          title: 'Sample Products',
          rows: [
            { id: ITEM_ZINGER, title: 'Zinger Burger', description: 'Rs 450' },
            { id: ITEM_PIZZA, title: 'Pizza Slice', description: 'Rs 350' },
            { id: ITEM_FRIES, title: 'Fries', description: 'Rs 200' },
          ]
        }]
      )
    }
  }

  static async showBooking(to: string) {
    await WhatsAppAPI.sendText(
      to,
      '📅 *Appointment Booking Demo*\n\n' +
      'In a live implementation, customers can:\n\n' +
      '• View available time slots\n' +
      '• Select their preferred date & time\n' +
      '• Receive confirmation messages\n' +
      '• Get automated reminders\n\n' +
      'This feature integrates with your existing calendar system!'
    )
    await WhatsAppAPI.sendButtons(
      to,
      'Would you like to explore other features?',
      [
        { id: BTN_LEAD, title: '📝 Get Started' },
        { id: BTN_FAQ, title: '❓ FAQ Demo' },
        { id: BTN_BACK_HOME, title: '🔙 Back' },
      ]
    )
  }

  static async showLeadCapture(to: string, waId: string) {
    // Capture lead
    await Database.captureLead(waId, to, undefined, 'whatsapp_demo')
    
    await WhatsAppAPI.sendText(
      to,
      '📝 *Lead Captured!*\n\n' +
      'This demonstrates our lead capture feature.\n\n' +
      'In a live implementation:\n' +
      '• Customer details are automatically saved\n' +
      '• You receive instant notifications\n' +
      '• Leads are organized in your dashboard\n' +
      '• Follow-up messages are automated\n\n' +
      '✅ Your interest has been recorded. Our team will contact you within 24 hours!'
    )
    await BotFlows.showHome(to)
  }

  static async showMore(to: string) {
    await WhatsAppAPI.sendButtons(
      to,
      '⚙️ *More Options*\n\nExplore additional features:',
      [
        { id: BTN_BOOKING, title: '📅 Booking Demo' },
        { id: BTN_HISTORY, title: '📜 Order History' },
        { id: BTN_BACK_HOME, title: '🔙 Back' },
      ]
    )
  }

  static async showHistory(to: string, waId: string) {
    const orders = await Database.getOrderHistory(waId, 5)
    
    if (!orders.length) {
      await WhatsAppAPI.sendText(
        to,
        '📜 *Order History*\n\nNo orders yet! Try ordering from our catalogue demo.'
      )
      await BotFlows.showHome(to)
      return
    }

    const statusEmoji: Record<string, string> = {
      placed: '🆕',
      confirmed: '✅',
      preparing: '👨‍🍳',
      ready: '📦',
      delivered: '✔️',
      cancelled: '❌',
    }

    const lines = ['📜 *Your Recent Orders*\n']
    for (const order of orders) {
      const emoji = statusEmoji[order.status] || '❓'
      lines.push(`${emoji} #${order.order_number || 'N/A'} ${order.item_name} — ${order.status}`)
    }

    await WhatsAppAPI.sendText(to, lines.join('\n'))
    await BotFlows.showHome(to)
  }

  static async showRateLimited(to: string) {
    await WhatsAppAPI.sendText(
      to,
      '⏳ You\'re sending messages too quickly. Please wait a moment and try again.'
    )
  }

  static async handleOrder(to: string, waId: string, itemId: string, itemTitle: string) {
    const items = await Database.getMenuItems()
    const itemMap: Record<string, { name: string; price: number; item_id: string }> = {}
    
    for (const item of items) {
      itemMap[item.item_id] = item
    }

    // Fallback items
    if (Object.keys(itemMap).length === 0) {
      itemMap[ITEM_ZINGER] = { name: 'Zinger Burger', price: 45000, item_id: ITEM_ZINGER }
      itemMap[ITEM_PIZZA] = { name: 'Pizza Slice', price: 35000, item_id: ITEM_PIZZA }
      itemMap[ITEM_FRIES] = { name: 'Fries', price: 20000, item_id: ITEM_FRIES }
    }

    const item = itemMap[itemId]
    if (item) {
      const priceDisplay = `Rs ${item.price / 100}`
      const itemDisplay = `${item.name} — ${priceDisplay}`

      await Database.createOrder(waId, to, itemId, itemDisplay, item.price)

      await WhatsAppAPI.sendText(
        to,
        `✅ *Order Placed!*\n\n` +
        `Item: *${itemDisplay}*\n\n` +
        `This is a demo order. In a live implementation:\n` +
        `• You'd receive order confirmation\n` +
        `• Track order status in real-time\n` +
        `• Get delivery updates\n\n` +
        `We'll notify you when it's ready! 📦`
      )
      await BotFlows.showHome(to)
    } else {
      await WhatsAppAPI.sendText(to, '❓ Item not recognized. Please try again.')
      await BotFlows.showCatalogue(to)
    }
  }
}

// Message extraction
export function extractMessage(data: Record<string, unknown>): Record<string, unknown> | null {
  try {
    const entry = (data.entry as unknown[])?.[0] as Record<string, unknown>
    const changes = (entry?.changes as unknown[])?.[0] as Record<string, unknown>
    const value = changes?.value as Record<string, unknown>
    const messages = value?.messages as unknown[]

    if (!messages?.length) return null

    const msg = messages[0] as Record<string, unknown>
    const from = msg.from as string
    const msgId = msg.id as string
    const msgType = msg.type as string

    const result: Record<string, unknown> = {
      from,
      id: msgId,
      type: msgType,
    }

    if (msgType === 'interactive') {
      const interactive = msg.interactive as Record<string, unknown>
      const itype = interactive?.type as string

      if (itype === 'button_reply') {
        const buttonReply = interactive.button_reply as Record<string, unknown>
        result.kind = 'button'
        result.reply_id = buttonReply.id
        result.title = buttonReply.title
      } else if (itype === 'list_reply') {
        const listReply = interactive.list_reply as Record<string, unknown>
        result.kind = 'list'
        result.reply_id = listReply.id
        result.title = listReply.title
      } else {
        result.kind = 'interactive_other'
      }
      return result
    }

    if (msgType === 'text') {
      const text = msg.text as Record<string, unknown>
      result.kind = 'text'
      result.text = text?.body || ''
      return result
    }

    result.kind = 'other'
    return result
  } catch (e) {
    console.error('Error extracting message:', e)
    return null
  }
}

export { config }
