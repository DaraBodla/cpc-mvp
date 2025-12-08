// WhatsApp Bot Webhook for CPC Demo
// This server handles incoming WhatsApp messages and responds with automated demos

const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// Configuration - Add these to your .env file
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // Your Meta WhatsApp API token
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID; // Your WhatsApp Phone Number ID
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'CPC_VERIFY_TOKEN_2025'; // Your custom verify token

// Store user conversation state (in production, use Redis or database)
const userStates = new Map();

// Main menu options
const MAIN_MENU = {
  text: `🤖 *Welcome to CPC Demo Bot!*

Choose what you want to test:

1️⃣ FAQ Automation
2️⃣ Catalogue Demo  
3️⃣ Booking/Order Demo
4️⃣ Lead Capture Demo
5️⃣ Follow-up Messages Demo

Reply with a number (1-5) or type 'menu' anytime to return here.`,
  buttons: [
    { id: '1', title: '💬 FAQ Demo' },
    { id: '2', title: '📦 Catalogue' },
    { id: '3', title: '📅 Booking' }
  ]
};

// FAQ Demo responses
const FAQ_RESPONSES = {
  menu: `📋 *FAQ Automation Demo*

This bot can answer common questions instantly!

Try asking:
• What are your hours?
• Where are you located?
• What services do you offer?
• What are your prices?

Or type 'menu' to go back.`,
  
  hours: `⏰ *Business Hours*

We're open:
Monday - Friday: 9:00 AM - 6:00 PM
Saturday: 10:00 AM - 4:00 PM
Sunday: Closed

Would you like to book an appointment? Reply 'booking' to schedule!`,
  
  location: `📍 *Our Location*

123 Main Street
Islamabad, Pakistan

🗺️ Google Maps: maps.google.com/example

Need directions? Just let me know!`,
  
  services: `✨ *Our Services*

We offer:
• WhatsApp Automation Setup
• Custom Chatbot Development  
• FAQ Management
• Booking Systems
• Lead Generation Tools
• Analytics Dashboard

Want to know more about any service? Just ask!`,
  
  prices: `💰 *Pricing Plans*

🌟 Starter: Rs. 15,000/month
   • Up to 1,000 messages
   • Basic automation
   
🚀 Business: Rs. 30,000/month
   • Up to 5,000 messages
   • Advanced features
   
⭐ Enterprise: Custom pricing
   • Unlimited messages
   • Full customization

Ready to get started? Type 'contact' to reach our team!`
};

// Catalogue Demo
const CATALOGUE_ITEMS = [
  {
    id: '1',
    name: 'Automation Starter Pack',
    price: 'Rs. 15,000',
    description: 'Perfect for small businesses. Includes FAQ bot and basic automation.'
  },
  {
    id: '2', 
    name: 'Business Growth Package',
    price: 'Rs. 30,000',
    description: 'For growing businesses. Includes booking, catalogue, and lead capture.'
  },
  {
    id: '3',
    name: 'Enterprise Solution',
    price: 'Custom',
    description: 'Fully customized automation with unlimited messages and features.'
  }
];

// Booking Demo slots
const BOOKING_SLOTS = {
  today: ['10:00 AM', '2:00 PM', '4:00 PM'],
  tomorrow: ['9:00 AM', '11:00 AM', '3:00 PM', '5:00 PM']
};

// Helper function to send WhatsApp message
async function sendWhatsAppMessage(to, message) {
  try {
    const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
    
    const data = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: message }
    };

    await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Message sent successfully to:', to);
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
  }
}

// Helper function to send message with buttons (interactive message)
async function sendWhatsAppButtons(to, bodyText, buttons) {
  try {
    const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
    
    const data = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.map((btn, idx) => ({
            type: 'reply',
            reply: {
              id: btn.id || `btn_${idx}`,
              title: btn.title.substring(0, 20) // Max 20 chars for button title
            }
          }))
        }
      }
    };

    await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Interactive message sent to:', to);
  } catch (error) {
    console.error('Error sending interactive message:', error.response?.data || error.message);
    // Fallback to text message if buttons fail
    await sendWhatsAppMessage(to, bodyText);
  }
}

// Process incoming messages
function processMessage(from, messageText) {
  const text = messageText.toLowerCase().trim();
  const userState = userStates.get(from) || { state: 'main' };
  
  // Always respond to "menu" or "demo cpc"
  if (text === 'menu' || text === 'demo cpc' || text === 'start') {
    userStates.set(from, { state: 'main' });
    return MAIN_MENU.text;
  }

  // Main menu selection
  if (userState.state === 'main') {
    if (text === '1' || text.includes('faq')) {
      userStates.set(from, { state: 'faq' });
      return FAQ_RESPONSES.menu;
    }
    
    if (text === '2' || text.includes('catalogue') || text.includes('catalog')) {
      userStates.set(from, { state: 'catalogue' });
      return `📦 *Product Catalogue Demo*

Here are our automation packages:

${CATALOGUE_ITEMS.map((item, idx) => 
  `${idx + 1}. *${item.name}* - ${item.price}\n   ${item.description}`
).join('\n\n')}

Reply with a number (1-3) to learn more, or 'menu' to go back.`;
    }
    
    if (text === '3' || text.includes('booking') || text.includes('order')) {
      userStates.set(from, { state: 'booking' });
      return `📅 *Booking System Demo*

I can help you schedule an appointment!

Available slots:

*Today:*
${BOOKING_SLOTS.today.map((slot, idx) => `${idx + 1}. ${slot}`).join('\n')}

*Tomorrow:*
${BOOKING_SLOTS.tomorrow.map((slot, idx) => `${idx + 4}. ${slot}`).join('\n')}

Reply with a number to book, or 'menu' to go back.`;
    }
    
    if (text === '4' || text.includes('lead')) {
      userStates.set(from, { state: 'lead_name' });
      return `📊 *Lead Capture Demo*

Great! I'll collect some basic information.

First, what's your full name?`;
    }
    
    if (text === '5' || text.includes('follow')) {
      userStates.set(from, { state: 'main' });
      return `🔔 *Follow-up Messages Demo*

Our system can automatically send:

✅ Appointment reminders (24hrs before)
✅ Thank you messages after purchase
✅ Feedback requests
✅ Special offers & promotions
✅ Order status updates

Example: "Hi! This is a reminder about your appointment tomorrow at 2:00 PM. Looking forward to seeing you! 😊"

Type 'menu' to return to main menu.`;
    }
  }

  // FAQ State - check for common questions
  if (userState.state === 'faq') {
    if (text.includes('hour') || text.includes('time') || text.includes('open') || text.includes('close')) {
      return FAQ_RESPONSES.hours;
    }
    if (text.includes('location') || text.includes('address') || text.includes('where')) {
      return FAQ_RESPONSES.location;
    }
    if (text.includes('service') || text.includes('offer') || text.includes('do you')) {
      return FAQ_RESPONSES.services;
    }
    if (text.includes('price') || text.includes('cost') || text.includes('how much')) {
      return FAQ_RESPONSES.prices;
    }
    
    return `I can answer questions about:
• Hours
• Location  
• Services
• Prices

Or type 'menu' to see all demos!`;
  }

  // Catalogue State
  if (userState.state === 'catalogue') {
    const itemNum = parseInt(text);
    if (itemNum >= 1 && itemNum <= 3) {
      const item = CATALOGUE_ITEMS[itemNum - 1];
      userStates.set(from, { state: 'main' });
      return `✨ *${item.name}*

💰 Price: ${item.price}

${item.description}

Want to purchase? Contact our team:
📱 WhatsApp: +92XXXXXXXXX
📧 Email: hello@cpc.com

Type 'menu' for more demos!`;
    }
  }

  // Booking State
  if (userState.state === 'booking') {
    const slotNum = parseInt(text);
    if (slotNum >= 1 && slotNum <= 7) {
      const allSlots = [...BOOKING_SLOTS.today, ...BOOKING_SLOTS.tomorrow];
      const selectedSlot = allSlots[slotNum - 1];
      const day = slotNum <= 3 ? 'today' : 'tomorrow';
      
      userStates.set(from, { state: 'booking_confirm', slot: selectedSlot, day: day });
      return `✅ Great! I've reserved ${selectedSlot} ${day} for you.

Please confirm:
Reply 'yes' to confirm
Reply 'no' to cancel`;
    }
  }

  // Booking Confirmation
  if (userState.state === 'booking_confirm') {
    if (text.includes('yes') || text.includes('confirm')) {
      const { slot, day } = userState;
      userStates.set(from, { state: 'main' });
      return `🎉 *Booking Confirmed!*

📅 Date: ${day === 'today' ? 'Today' : 'Tomorrow'}
⏰ Time: ${slot}

You'll receive a reminder 1 hour before your appointment.

Type 'menu' to explore more features!`;
    }
    if (text.includes('no') || text.includes('cancel')) {
      userStates.set(from, { state: 'main' });
      return `Booking cancelled. Type 'menu' to return to main menu.`;
    }
  }

  // Lead Capture Flow
  if (userState.state === 'lead_name') {
    userStates.set(from, { state: 'lead_email', name: messageText });
    return `Thanks ${messageText}! 

What's your email address?`;
  }

  if (userState.state === 'lead_email') {
    userStates.set(from, { state: 'lead_business', email: messageText, name: userState.name });
    return `Perfect! One last question:

What type of business do you have?`;
  }

  if (userState.state === 'lead_business') {
    const { name, email } = userState;
    userStates.set(from, { state: 'main' });
    
    // In production, save this to your database
    console.log('New Lead Captured:', { name, email, business: messageText, phone: from });
    
    return `✅ *Information Saved!*

Name: ${name}
Email: ${email}
Business: ${messageText}
Phone: ${from}

Our team will contact you within 24 hours!

This is how lead capture works - all information automatically saved to your CRM.

Type 'menu' to see more demos!`;
  }

  // Default response
  return `I didn't quite understand that. Type 'menu' to see all available demos!`;
}

// Webhook verification (required by Meta)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully!');
    res.status(200).send(challenge);
  } else {
    console.log('Webhook verification failed');
    res.sendStatus(403);
  }
});

// Webhook endpoint to receive messages
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    // Check if it's a WhatsApp message
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (value?.messages) {
        const message = value.messages[0];
        const from = message.from; // User's phone number
        const messageText = message.text?.body;

        if (messageText) {
          console.log(`Message from ${from}: ${messageText}`);
          
          // Process message and get response
          const response = processMessage(from, messageText);
          
          // Send response back
          await sendWhatsAppMessage(from, response);
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.sendStatus(500);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'CPC WhatsApp Bot'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 CPC WhatsApp Bot Webhook running on port ${PORT}`);
  console.log(`📱 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`🔐 Verify Token: ${VERIFY_TOKEN}`);
});

module.exports = app;