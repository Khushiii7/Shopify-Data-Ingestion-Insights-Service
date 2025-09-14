require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fetch = require('node-fetch');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const nodeCron = require('node-cron');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(cookieParser());

const PORT = process.env.PORT || 4000;
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES || 'read_products,read_orders,read_customers,read_checkouts';
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET;

// -------------------
// Authentication Middleware
// -------------------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// -------------------
// Helper: verify webhook HMAC
// -------------------
function verifyHmac(req, res, rawBody) {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
  if (!hmacHeader) return false;
  
  const digest = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64');
  return crypto.timingSafeEqual(Buffer.from(hmacHeader), Buffer.from(digest));
}

// -------------------
// User Authentication Routes
// -------------------
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, tenantId } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        tenantId: tenantId ? parseInt(tenantId) : null
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, tenantId: user.tenantId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, tenantId: user.tenantId } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, tenantId: user.tenantId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, tenantId: user.tenantId } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// -------------------
// Shopify OAuth Install
// -------------------
app.get('/auth/install', (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).send('Missing shop param.');
  
  const nonce = crypto.randomBytes(12).toString('hex');
  const redirect = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${encodeURIComponent(SHOPIFY_SCOPES)}&redirect_uri=${encodeURIComponent(APP_URL + '/auth/callback')}&state=${nonce}`;
  
  res.cookie('shopify_nonce', nonce, { httpOnly: true, secure: false });
  res.redirect(redirect);
});

// -------------------
// Shopify OAuth callback
// -------------------
app.get('/auth/callback', async (req, res) => {
  try {
    const { shop, code, state } = req.query;
    const cookieNonce = req.cookies.shopify_nonce;
    
    if (!state || !cookieNonce || state !== cookieNonce) {
      return res.status(400).send('Invalid state');
    }

    // Exchange code for an access token
    const resp = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        client_id: SHOPIFY_API_KEY, 
        client_secret: SHOPIFY_API_SECRET, 
        code 
      }),
    });
    
    const tokenData = await resp.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(400).send('Failed to get access token');
    }

    // Save tenant in DB (upsert)
    const tenant = await prisma.tenant.upsert({
      where: { shopDomain: shop },
      update: { accessToken, installedAt: new Date() },
      create: { shopDomain: shop, accessToken, installedAt: new Date() },
    });

    // Register required webhooks for real-time updates
    await registerWebhooksForTenant(shop, accessToken);

    // Perform initial data sync
    try {
      await fetchAndStoreAll(shop, accessToken, tenant.id);
    } catch (syncError) {
      console.error('Initial sync error:', syncError);
    }

    // Redirect to frontend with tenant info
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?tenant=${tenant.id}&shop=${shop}`);
  } catch (err) {
    console.error('Auth callback error', err);
    res.status(500).send('Auth failed');
  }
});

// -------------------
// Register webhooks utility
// -------------------
async function registerWebhooksForTenant(shop, accessToken) {
  const topics = [
    'products/create',
    'products/update',
    'customers/create',
    'customers/update',
    'orders/create',
    'orders/updated',
    'checkouts/create'
  ];
  
  for (const topic of topics) {
    try {
      const resp = await fetch(`https://${shop}/admin/api/2025-01/webhooks.json`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Shopify-Access-Token': accessToken 
        },
        body: JSON.stringify({
          webhook: {
            topic,
            address: `${APP_URL}/webhooks/receive`,
            format: 'json',
          },
        }),
      });
      
      if (resp.ok) {
        console.log(`Webhook registered for ${topic}`);
      } else {
        console.warn(`Failed to register webhook for ${topic}:`, await resp.text());
      }
    } catch (e) {
      console.warn('Webhook registration failed', topic, e.message);
    }
  }
}

// -------------------
// Webhook receiver (single endpoint)
// -------------------
app.post('/webhooks/receive', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const raw = req.body.toString('utf8');
    
    if (!verifyHmac(req, res, raw)) {
      return res.status(401).send('HMAC mismatch');
    }

    const topic = req.get('X-Shopify-Topic');
    const shop = req.get('X-Shopify-Shop-Domain');
    const payload = JSON.parse(raw);

    // Find tenant
    const tenant = await prisma.tenant.findUnique({ where: { shopDomain: shop } });
    if (!tenant) {
      return res.status(404).send('Tenant not found');
    }

    // Handle relevant event topics
    if (topic.startsWith('products/')) {
      await upsertProduct(tenant.id, payload);
    } else if (topic.startsWith('customers/')) {
      await upsertCustomer(tenant.id, payload);
    } else if (topic.startsWith('orders/')) {
      await upsertOrder(tenant.id, payload);
    } else if (topic === 'checkouts/create') {
      await upsertAbandonedCheckout(tenant.id, payload);
    }

    res.status(200).send('ok');
  } catch (err) {
    console.error('Webhook handler error', err);
    res.status(500).send('err');
  }
});

// -------------------
// Upsert helpers
// -------------------
async function upsertProduct(tenantId, productPayload) {
  try {
    const shopifyId = String(productPayload.id);
    await prisma.product.upsert({
      where: { shopifyProductId: shopifyId },
      create: {
        tenantId,
        shopifyProductId: shopifyId,
        title: productPayload.title || 'Untitled',
        handle: productPayload.handle,
        variants: productPayload.variants || [],
        raw: productPayload,
      },
      update: {
        title: productPayload.title,
        handle: productPayload.handle,
        variants: productPayload.variants || [],
        raw: productPayload,
      },
    });
    console.log(`Product upserted: ${productPayload.title}`);
  } catch (e) {
    console.error('upsertProduct error', e.message);
  }
}

async function upsertCustomer(tenantId, customerPayload) {
  try {
    const shopifyId = String(customerPayload.id);
    await prisma.customer.upsert({
      where: { shopifyCustomerId: shopifyId },
      create: {
        tenantId,
        shopifyCustomerId: shopifyId,
        email: customerPayload.email,
        firstName: customerPayload.first_name,
        lastName: customerPayload.last_name,
        phone: customerPayload.phone,
        totalSpent: customerPayload.total_spent ? parseFloat(customerPayload.total_spent) : null,
        raw: customerPayload,
      },
      update: {
        email: customerPayload.email,
        firstName: customerPayload.first_name,
        lastName: customerPayload.last_name,
        phone: customerPayload.phone,
        totalSpent: customerPayload.total_spent ? parseFloat(customerPayload.total_spent) : null,
        raw: customerPayload,
      },
    });
    console.log(`Customer upserted: ${customerPayload.email}`);
  } catch (e) {
    console.error('upsertCustomer error', e.message);
  }
}

async function upsertOrder(tenantId, orderPayload) {
  try {
    const shopifyId = String(orderPayload.id);
    await prisma.order.upsert({
      where: { shopifyOrderId: shopifyId },
      create: {
        tenantId,
        shopifyOrderId: shopifyId,
        orderNumber: orderPayload.order_number ? String(orderPayload.order_number) : null,
        createdAt: orderPayload.created_at ? new Date(orderPayload.created_at) : null,
        totalPrice: orderPayload.total_price ? parseFloat(orderPayload.total_price) : null,
        currency: orderPayload.currency,
        raw: orderPayload,
      },
      update: {
        orderNumber: orderPayload.order_number ? String(orderPayload.order_number) : null,
        createdAt: orderPayload.created_at ? new Date(orderPayload.created_at) : null,
        totalPrice: orderPayload.total_price ? parseFloat(orderPayload.total_price) : null,
        currency: orderPayload.currency,
        raw: orderPayload,
      },
    });
    console.log(`Order upserted: ${orderPayload.order_number}`);
  } catch (e) {
    console.error('upsertOrder error', e.message);
  }
}

async function upsertAbandonedCheckout(tenantId, payload) {
  try {
    const id = String(payload.id || payload.token);
    await prisma.abandonedCheckout.upsert({
      where: { checkoutId: id },
      create: {
        tenantId,
        checkoutId: id,
        email: payload.email,
        lineItems: payload.line_items || [],
        createdAt: payload.created_at ? new Date(payload.created_at) : null,
        raw: payload,
      },
      update: {
        email: payload.email,
        lineItems: payload.line_items || [],
        raw: payload,
      },
    });
    console.log(`Abandoned checkout upserted: ${payload.email}`);
  } catch (e) {
    console.error('upsertAbandonedCheckout error', e.message);
  }
}

// -------------------
// Metrics endpoints
// -------------------

// Get all tenants for a user (if they have access)
app.get('/api/tenants', authenticateToken, async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        shopDomain: true,
        installedAt: true
      }
    });
    res.json(tenants);
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Summary metrics: customers, orders, revenue
app.get('/api/metrics/summary/:tenantId', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!tenantId) return res.status(400).json({ error: 'Invalid tenant ID' });

    const customers = await prisma.customer.count({ where: { tenantId } });
    const orders = await prisma.order.count({ where: { tenantId } });
    const revenueObj = await prisma.order.aggregate({
      where: { tenantId },
      _sum: { totalPrice: true },
    });
    const revenue = revenueObj._sum.totalPrice || 0;

    // Get abandoned checkouts count
    const abandonedCheckouts = await prisma.abandonedCheckout.count({ where: { tenantId } });

    res.json({ 
      customers, 
      orders, 
      revenue: parseFloat(revenue.toString()), 
      abandonedCheckouts 
    });
  } catch (error) {
    console.error('Summary metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Orders by date (range)
app.get('/api/metrics/orders-by-date/:tenantId', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);
    const { from, to } = req.query; // ISO dates
    
    const where = { tenantId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    
    const orders = await prisma.order.findMany({ 
      where, 
      orderBy: { createdAt: 'asc' } 
    });
    
    // Reduce to daily buckets
    const buckets = {};
    for (const order of orders) {
      const date = order.createdAt ? 
        new Date(order.createdAt).toISOString().slice(0, 10) : 
        'unknown';
      const total = order.totalPrice ? parseFloat(order.totalPrice.toString()) : 0;
      buckets[date] = (buckets[date] || 0) + total;
    }
    
    const result = Object.entries(buckets)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.json(result);
  } catch (error) {
    console.error('Orders by date error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Top customers by spend
app.get('/api/metrics/top-customers/:tenantId', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);
    const customers = await prisma.customer.findMany({
      where: { 
        tenantId,
        totalSpent: { not: null }
      },
      orderBy: { totalSpent: 'desc' },
      take: 5,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        totalSpent: true
      }
    });
    
    res.json(customers);
  } catch (error) {
    console.error('Top customers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Products count and recent
app.get('/api/metrics/products/:tenantId', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);
    const count = await prisma.product.count({ where: { tenantId } });
    const recent = await prisma.product.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        handle: true,
        createdAt: true
      }
    });
    
    res.json({ count, recent });
  } catch (error) {
    console.error('Products metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------
// Full-sync utility endpoint (manual trigger)
// -------------------
app.post('/api/admin/full-sync/:tenantId', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    // Fetch customers, products, orders (paginated)
    await fetchAndStoreAll(tenant.shopDomain, tenant.accessToken, tenantId);
    res.json({ success: true, message: 'Full sync completed' });
  } catch (error) {
    console.error('Full sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function fetchAndStoreAll(shop, accessToken, tenantId) {
  console.log(`Starting full sync for ${shop}`);
  
  try {
    // Fetch customers
    await fetchPaginatedAndUpsert(shop, accessToken, `/admin/api/2025-01/customers.json`, async (item) => upsertCustomer(tenantId, item));
    
    // Fetch products
    await fetchPaginatedAndUpsert(shop, accessToken, `/admin/api/2025-01/products.json`, async (item) => upsertProduct(tenantId, item));
    
    // Fetch orders
    await fetchPaginatedAndUpsert(shop, accessToken, `/admin/api/2025-01/orders.json?status=any`, async (item) => upsertOrder(tenantId, item));
    
    console.log(`Full sync completed for ${shop}`);
  } catch (error) {
    console.error(`Full sync failed for ${shop}:`, error);
    throw error;
  }
}

async function fetchPaginatedAndUpsert(shop, accessToken, path, itemHandler) {
  let base = `https://${shop}${path}`;
  let url = base;
  let totalProcessed = 0;
  
  while (url) {
    try {
      const resp = await fetch(url, { 
        headers: { 'X-Shopify-Access-Token': accessToken } 
      });
      
      if (!resp.ok) {
        console.error(`API request failed: ${resp.status} ${resp.statusText}`);
        break;
      }
      
      const data = await resp.json();
      
      // Detect root key (customers/products/orders)
      const arrKey = Object.keys(data).find(k => Array.isArray(data[k]));
      if (!arrKey) break;
      
      const arr = data[arrKey];
      for (const item of arr) {
        await itemHandler(item);
        totalProcessed++;
      }
      
      // Simple pagination: Shopify uses Link header for REST
      const link = resp.headers.get('link');
      if (link && link.includes('rel="next"')) {
        const matched = link.match(/<([^>]+)>; rel="next"/);
        url = matched ? matched[1] : null;
      } else {
        url = null;
      }
    } catch (error) {
      console.error('Pagination error:', error);
      break;
    }
  }
  
  console.log(`Processed ${totalProcessed} items from ${path}`);
}

// -------------------
// Scheduler: poll abandoned checkouts periodically
// -------------------
// Every 15 minutes
nodeCron.schedule('*/15 * * * *', async () => {
  console.log('Running scheduled sync for all tenants');
  try {
    const tenants = await prisma.tenant.findMany();
    for (const tenant of tenants) {
      try {
        await fetchAbandonedCheckoutsAndUpsert(tenant.shopDomain, tenant.accessToken, tenant.id);
      } catch (error) {
        console.error('Scheduled sync error for', tenant.shopDomain, error.message);
      }
    }
  } catch (error) {
    console.error('Scheduler error:', error);
  }
});

async function fetchAbandonedCheckoutsAndUpsert(shop, accessToken, tenantId) {
  try {
    const url = `https://${shop}/admin/api/2025-01/checkouts.json?limit=250`;
    const resp = await fetch(url, { 
      headers: { 'X-Shopify-Access-Token': accessToken } 
    });
    
    if (!resp.ok) {
      console.error(`Abandoned checkouts API failed: ${resp.status}`);
      return;
    }
    
    const data = await resp.json();
    if (Array.isArray(data.checkouts)) {
      for (const checkout of data.checkouts) {
        await upsertAbandonedCheckout(tenantId, checkout);
      }
      console.log(`Processed ${data.checkouts.length} abandoned checkouts for ${shop}`);
    }
  } catch (error) {
    console.error('Abandoned checkouts fetch error:', error);
  }
}

// -------------------
// Health check endpoint
// -------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// -------------------
// Start server
// -------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Install URL: http://localhost:${PORT}/auth/install?shop=your-store.myshopify.com`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});