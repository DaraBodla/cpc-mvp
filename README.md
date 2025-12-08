# CPC MVP - WhatsApp Business Automation Platform

A full-stack web application for WhatsApp business automation featuring:
- **Landing Page**: Business onboarding with automation feature selection
- **Admin Dashboard**: View registrations, analytics, and manage leads
- **WhatsApp Bot**: Automated FAQ, catalogue, booking demos, and lead capture

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account (free tier works)
- Meta Business account with WhatsApp API access
- Vercel account (for deployment)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd cpc-mvp
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase-schema.sql`
3. Copy your project URL and service role key from Settings > API

### 3. Configure Environment Variables

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# WhatsApp API (Meta Business)
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_VERIFY_TOKEN=cpc
WHATSAPP_APP_SECRET=your-app-secret

# Demo WhatsApp number (shown on landing page)
NEXT_PUBLIC_DEMO_WHATSAPP=+92XXXXXXXXXX
```

### 4. Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000`

## 📦 Deployment to Vercel

### Option 1: Vercel CLI

```bash
npm i -g vercel
vercel
```

### Option 2: GitHub Integration

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables in Vercel settings
4. Deploy

### Environment Variables in Vercel

Add these in your Vercel project settings:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification token (default: `cpc`) |
| `WHATSAPP_APP_SECRET` | Meta App secret for signature verification |
| `NEXT_PUBLIC_DEMO_WHATSAPP` | Demo WhatsApp number for landing page |

## 🔗 WhatsApp Webhook Setup

After deploying to Vercel:

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Select your app > WhatsApp > Configuration
3. Set webhook URL: `https://your-vercel-domain.vercel.app/api/webhook/whatsapp`
4. Set verify token: `cpc` (or your custom token)
5. Subscribe to `messages` webhook field

## 📁 Project Structure

```
cpc-mvp/
├── app/
│   ├── api/
│   │   ├── businesses/      # Business CRUD endpoints
│   │   ├── stats/           # Analytics endpoint
│   │   └── webhook/
│   │       └── whatsapp/    # WhatsApp webhook handler
│   ├── admin/
│   │   └── page.tsx         # Admin dashboard
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── lib/
│   ├── supabase.ts          # Supabase client & types
│   └── whatsapp.ts          # WhatsApp API utilities
├── supabase-schema.sql      # Database schema
├── .env.example             # Environment template
├── package.json
├── tailwind.config.js
└── README.md
```

## 🤖 WhatsApp Bot Features

The demo bot showcases:

| Feature | Command/Button | Description |
|---------|---------------|-------------|
| FAQ | "faq", "help" | Common questions answered |
| Catalogue | "catalogue", "products" | Interactive product list |
| Booking | "book", "appointment" | Appointment scheduling demo |
| Lead Capture | "demo", "contact" | Captures user as lead |
| Order History | "history", "orders" | Shows past orders |

## 🎨 Customization

### Changing Colors

Edit `tailwind.config.js` to modify the brand colors:

```js
colors: {
  brand: {
    500: '#10b981', // Primary
    600: '#059669', // Darker
  }
}
```

### Adding Menu Items

Insert into Supabase `menu_items` table:

```sql
INSERT INTO menu_items (item_id, name, description, price, category, sort_order)
VALUES ('ITEM_NEW', 'New Item', 'Description', 50000, 'Category', 4);
```

### Customizing Bot Responses

Edit `lib/whatsapp.ts` > `BotFlows` class to modify bot messages and flows.

## 📊 Database Tables

| Table | Purpose |
|-------|---------|
| `businesses` | Landing page registrations |
| `users` | WhatsApp bot users |
| `orders` | Orders placed via bot |
| `menu_items` | Product catalogue |
| `leads` | Captured leads |
| `message_logs` | Message history |
| `processed_messages` | Deduplication |
| `rate_limits` | Rate limiting |

## 🔒 Security

- Webhook signature verification enabled
- Rate limiting (30 requests/minute per user)
- Row-level security enabled in Supabase
- Service role key never exposed to client

## 🐛 Troubleshooting

### Webhook not receiving messages
- Verify webhook URL is correct
- Check verify token matches
- Ensure `messages` subscription is active

### Database errors
- Run the schema SQL in Supabase
- Check service role key is correct
- Verify RLS policies are set

### Bot not responding
- Check WhatsApp API credentials
- Verify phone number ID
- Check Vercel function logs

## 📄 License

MIT License - feel free to use for commercial projects.

## 🤝 Support

For issues or questions, open a GitHub issue or contact support.
