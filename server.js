// server.js - Complete Backend for CPC Application with Supabase
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const registerWhatsAppWebhook = require("./whatsappWebhook");
registerWhatsAppWebhook(app);


// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

console.log('✅ Supabase client initialized');

// Email Configuration (using Gmail as example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Email Templates
const sendWelcomeEmail = async (business) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: business.email,
    subject: 'Welcome to CPC - Your WhatsApp Automation Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Welcome to CPC!</h2>
        <p>Hi ${business.ownerName},</p>
        <p>Thank you for registering <strong>${business.businessName}</strong> with Chat Product Company.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Selected Automations:</h3>
          <ul>
            ${business.automations.map(auto => `<li>${auto}</li>`).join('')}
          </ul>
        </div>
        
        <h3>What's Next?</h3>
        <ol>
          <li>Test our demo bot at: <strong>+92XXXXXXXXX</strong></li>
          <li>Our team will contact you within 24 hours via WhatsApp</li>
          <li>We'll set up your custom automation system</li>
        </ol>
        
        <p>If you have any questions, feel free to reach out!</p>
        
        <p>Best regards,<br><strong>CPC Team</strong></p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to:', business.email);
  } catch (error) {
    console.error('❌ Email error:', error);
  }
};

// ROUTES

// 1. Register New Business
app.post('/api/businesses', async (req, res) => {
  try {
    const { businessName, businessType, ownerName, whatsapp, email, automations } = req.body;

    // Validation
    if (!businessName || !businessType || !ownerName || !whatsapp || !email || !automations || automations.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required and at least one automation must be selected' 
      });
    }

    // Check if email already exists
    const { data: existingBusiness } = await supabase
      .from('businesses')
      .select('*')
      .eq('email', email)
      .single();

    if (existingBusiness) {
      return res.status(400).json({ 
        success: false, 
        message: 'A business with this email is already registered' 
      });
    }

    // Insert new business
    const { data, error } = await supabase
      .from('businesses')
      .insert([
        {
          businessName,
          businessType,
          ownerName,
          whatsapp,
          email,
          automations
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error. Please try again.' 
      });
    }

    // Send welcome email (async, don't wait)
    sendWelcomeEmail(data);

    res.status(201).json({ 
      success: true, 
      message: 'Business registered successfully',
      data: data 
    });

  } catch (error) {
    console.error('Error registering business:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

// 2. Get All Businesses (Admin)
app.get('/api/businesses', async (req, res) => {
  try {
    const { businessType, sortBy = 'created_at', order = 'desc', page = 1, limit = 50 } = req.query;

    let query = supabase
      .from('businesses')
      .select('*', { count: 'exact' });

    // Apply filters
    if (businessType) {
      query = query.eq('businessType', businessType);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: order === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }

    res.json({
      success: true,
      data: data,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });

  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// 3. Get Single Business
app.get('/api/businesses/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Business not found' 
      });
    }

    res.json({ 
      success: true, 
      data: data 
    });

  } catch (error) {
    console.error('Error fetching business:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// 4. Update Business
app.put('/api/businesses/:id', async (req, res) => {
  try {
    const updates = req.body;

    const { data, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Business not found or update failed' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Business updated successfully',
      data: data 
    });

  } catch (error) {
    console.error('Error updating business:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// 5. Delete Business
app.delete('/api/businesses/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Business not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Business deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting business:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// 6. Get Analytics/Stats
app.get('/api/analytics', async (req, res) => {
  try {
    // Get all businesses for analytics
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*');

    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }

    const totalBusinesses = businesses.length;

    // Business type distribution
    const typeStats = businesses.reduce((acc, business) => {
      const type = business.businessType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const typeStatsArray = Object.entries(typeStats)
      .map(([type, count]) => ({ _id: type, count }))
      .sort((a, b) => b.count - a.count);

    // Automation popularity
    const automationStats = {};
    businesses.forEach(business => {
      business.automations.forEach(auto => {
        automationStats[auto] = (automationStats[auto] || 0) + 1;
      });
    });

    const automationStatsArray = Object.entries(automationStats)
      .map(([automation, count]) => ({ _id: automation, count }))
      .sort((a, b) => b.count - a.count);

    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCount = businesses.filter(b => 
      new Date(b.created_at) >= thirtyDaysAgo
    ).length;

    res.json({
      success: true,
      data: {
        totalBusinesses,
        recentRegistrations: recentCount,
        businessTypes: typeStatsArray,
        automations: automationStatsArray
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// 7. Search Businesses
app.get('/api/businesses/search/:query', async (req, res) => {
  try {
    const query = req.params.query.toLowerCase();
    
    // Supabase doesn't support OR with ilike directly, so we fetch all and filter
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*');

    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }

    // Filter businesses based on search query
    const filtered = businesses.filter(b => 
      b.businessName?.toLowerCase().includes(query) ||
      b.ownerName?.toLowerCase().includes(query) ||
      b.email?.toLowerCase().includes(query) ||
      b.whatsapp?.includes(query)
    ).slice(0, 20);

    res.json({ 
      success: true, 
      data: filtered 
    });

  } catch (error) {
    console.error('Error searching businesses:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// 8. Get Businesses by Type
app.get('/api/businesses/type/:type', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('businessType', req.params.type)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }

    res.json({ 
      success: true, 
      data: data 
    });

  } catch (error) {
    console.error('Error fetching businesses by type:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CPC API is running with Supabase',
    timestamp: new Date().toISOString()
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!' 
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);
  console.log(`🗄️  Connected to Supabase`);
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
}

module.exports = app;

