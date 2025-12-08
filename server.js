// server.js - Node.js Backend with Express + Supabase
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test Supabase Connection
(async () => {
  try {
    const { data, error } = await supabase.from('businesses').select('count');
    if (error) throw error;
    console.log('✅ Supabase Connected Successfully');
  } catch (error) {
    console.error('❌ Supabase Connection Error:', error.message);
  }
})();

// ==================== API ROUTES ====================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    database: 'supabase'
  });
});

// Get all businesses
app.get('/api/businesses', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ 
      success: true, 
      data: data || [], 
      count: data?.length || 0 
    });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single business
app.get('/api/businesses/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        error: 'Business not found' 
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new business
app.post('/api/businesses', async (req, res) => {
  try {
    const { businessName, businessType, ownerName, whatsapp, email, automations } = req.body;

    // Validation
    if (!businessName || !businessType || !ownerName || !whatsapp || !email || !automations?.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required and at least one automation must be selected' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('businesses')
      .insert([{
        businessName,
        businessType,
        ownerName,
        whatsapp,
        email,
        automations
      }])
      .select()
      .single();

    if (error) throw error;

    // Notify via WhatsApp (connect to your Railway bot)
    await notifyNewRegistration(data);

    res.status(201).json({ 
      success: true, 
      data,
      message: 'Business registered successfully' 
    });
  } catch (error) {
    console.error('Error creating business:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update business
app.put('/api/businesses/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        error: 'Business not found' 
      });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete business
app.delete('/api/businesses/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ 
      success: true, 
      message: 'Business deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    // Get total businesses
    const { count: totalBusinesses, error: countError } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // Get all businesses for aggregations
    const { data: allBusinesses, error: dataError } = await supabase
      .from('businesses')
      .select('businessType, automations, created_at');

    if (dataError) throw dataError;

    // Calculate type distribution
    const typeStats = allBusinesses.reduce((acc, business) => {
      acc[business.businessType] = (acc[business.businessType] || 0) + 1;
      return acc;
    }, {});

    const typeDistribution = Object.entries(typeStats)
      .map(([type, count]) => ({ _id: type, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate automation popularity
    const autoStats = {};
    allBusinesses.forEach(business => {
      business.automations.forEach(auto => {
        autoStats[auto] = (autoStats[auto] || 0) + 1;
      });
    });

    const automationPopularity = Object.entries(autoStats)
      .map(([automation, count]) => ({ _id: automation, count }))
      .sort((a, b) => b.count - a.count);

    // Recent registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentRegistrations = allBusinesses.filter(
      business => new Date(business.created_at) >= sevenDaysAgo
    ).length;

    res.json({
      success: true,
      data: {
        totalBusinesses: totalBusinesses || 0,
        activeBusinesses: totalBusinesses || 0,
        totalMessages: 0, // Will be implemented with message_logs table
        recentRegistrations,
        typeDistribution,
        automationPopularity
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search businesses
app.get('/api/businesses/search/:query', async (req, res) => {
  try {
    const query = req.params.query.toLowerCase();

    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .or(`businessName.ilike.%${query}%,ownerName.ilike.%${query}%,email.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ 
      success: true, 
      data: data || [], 
      count: data?.length || 0 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get businesses by type
app.get('/api/businesses/type/:type', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('businessType', req.params.type)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ 
      success: true, 
      data: data || [], 
      count: data?.length || 0 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== WHATSAPP BOT INTEGRATION ====================

// Send message via Railway bot
async function sendWhatsAppMessage(to, message) {
  try {
    const RAILWAY_BOT_URL = process.env.RAILWAY_BOT_URL;
    
    if (!RAILWAY_BOT_URL) {
      console.warn('Railway bot URL not configured');
      return null;
    }

    const response = await axios.post(`${RAILWAY_BOT_URL}/send-message`, {
      to: to.replace(/[^0-9]/g, ''),
      message: message
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.BOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.message);
    return null;
  }
}

// Notify admin about new registration
async function notifyNewRegistration(business) {
  const adminNumber = process.env.ADMIN_WHATSAPP || '+92XXXXXXXXX';
  
  const message = `🎉 *New Business Registration*

📋 *Business:* ${business.businessName}
🏢 *Type:* ${business.businessType}
👤 *Owner:* ${business.ownerName}
📱 *WhatsApp:* ${business.whatsapp}
📧 *Email:* ${business.email}

🤖 *Automations Selected:*
${business.automations.map(a => `• ${a}`).join('\n')}

⏰ *Registered:* ${new Date(business.created_at).toLocaleString()}
🆔 *ID:* ${business.id}

🔗 Dashboard: ${process.env.FRONTEND_URL}/admin`;

  await sendWhatsAppMessage(adminNumber, message);
}

// Webhook to receive messages from Railway bot
app.post('/api/webhook/whatsapp', async (req, res) => {
  try {
    const { from, to, message, messageType, timestamp } = req.body;

    // Find business by WhatsApp number
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('whatsapp', to)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (business) {
      // Log message (you can create a message_logs table later)
      console.log(`Message logged for business ${business.id}:`, message);
      
      // Future: Insert into message_logs table
      // await supabase.from('message_logs').insert([{...}])
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Activate bot for a business
app.post('/api/businesses/:id/activate-bot', async (req, res) => {
  try {
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;

    if (!business) {
      return res.status(404).json({ 
        success: false, 
        error: 'Business not found' 
      });
    }

    // Send activation request to Railway bot
    const RAILWAY_BOT_URL = process.env.RAILWAY_BOT_URL;
    
    if (RAILWAY_BOT_URL) {
      await axios.post(`${RAILWAY_BOT_URL}/activate`, {
        businessId: business.id,
        whatsapp: business.whatsapp,
        automations: business.automations,
        businessName: business.businessName,
        businessType: business.businessType
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.BOT_API_KEY}`
        }
      });
    }

    // Send confirmation to business owner
    const confirmMessage = `✅ *Automation Activated!*

Hello ${business.ownerName}! 👋

Your WhatsApp automation for *${business.businessName}* is now active! 🚀

*Active Features:*
${business.automations.map(a => `✓ ${a}`).join('\n')}

Your customers can now interact with your automated assistant 24/7.

Need help? Contact our support team anytime.

- CPC Team`;

    await sendWhatsAppMessage(business.whatsapp, confirmMessage);

    res.json({ success: true, data: business });
  } catch (error) {
    console.error('Error activating bot:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get analytics for a business
app.get('/api/businesses/:id/analytics', async (req, res) => {
  try {
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;

    if (!business) {
      return res.status(404).json({ 
        success: false, 
        error: 'Business not found' 
      });
    }

    // Future: Get message counts from message_logs table
    const messageCount = 0;
    const recentMessages = 0;

    res.json({
      success: true,
      data: {
        totalMessages: messageCount,
        messagesLast24h: recentMessages,
        botActive: true,
        lastActivity: business.created_at,
        automations: business.automations,
        businessInfo: business
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk operations
app.post('/api/businesses/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid ids array' 
      });
    }

    const { error } = await supabase
      .from('businesses')
      .delete()
      .in('id', ids);

    if (error) throw error;

    res.json({ 
      success: true, 
      message: `${ids.length} businesses deleted successfully` 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export businesses as CSV
app.get('/api/businesses/export/csv', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Convert to CSV
    const headers = ['ID', 'Business Name', 'Type', 'Owner', 'WhatsApp', 'Email', 'Automations', 'Created At'];
    const csvRows = [headers.join(',')];

    data.forEach(business => {
      const row = [
        business.id,
        `"${business.businessName}"`,
        business.businessType,
        `"${business.ownerName}"`,
        business.whatsapp,
        business.email,
        `"${business.automations.join(', ')}"`,
        new Date(business.created_at).toISOString()
      ];
      csvRows.push(row.join(','));
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=businesses.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   CPC Backend Server Running          ║
║   Port: ${PORT}                        ║
║   Database: Supabase PostgreSQL       ║
║   Environment: ${process.env.NODE_ENV || 'development'}        ║
╚═══════════════════════════════════════╝
  `);
});

module.exports = app;
