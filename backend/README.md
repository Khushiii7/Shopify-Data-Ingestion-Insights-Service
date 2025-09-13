# Backend - Shopify Insights API

Express.js backend service for multi-tenant Shopify data ingestion and insights.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp env.example .env
# Edit .env with your configuration

# Setup database
npx prisma generate
npx prisma migrate dev --name init

# Start development server
npm run dev
```

## 📁 Project Structure

```
backend/
├── src/
│   └── index.js          # Main server file
├── prisma/
│   └── schema.prisma     # Database schema
├── package.json
├── env.example
└── README.md
```

## 🔧 Environment Variables

```env
PORT=4000
DATABASE_URL="mysql://username:password@localhost:3306/shopify_insights"
JWT_SECRET="your-super-secret-jwt-key"
SHOPIFY_API_KEY="your_shopify_api_key"
SHOPIFY_API_SECRET="your_shopify_api_secret"
SHOPIFY_SCOPES="read_products,read_orders,read_customers,read_checkouts"
APP_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:3000"
```

## 🗄️ Database Schema

The backend uses Prisma with MySQL and implements multi-tenant architecture:

- **Tenant**: Shopify store information and access tokens
- **User**: Application users with tenant association
- **Customer**: Shopify customers (tenant-isolated)
- **Product**: Shopify products (tenant-isolated)
- **Order**: Shopify orders (tenant-isolated)
- **AbandonedCheckout**: Tracked abandoned checkouts

## 🔌 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/install?shop=store.myshopify.com` - Shopify OAuth install
- `GET /auth/callback` - Shopify OAuth callback

### Metrics
- `GET /api/metrics/summary/:tenantId` - Summary metrics
- `GET /api/metrics/orders-by-date/:tenantId` - Orders by date
- `GET /api/metrics/top-customers/:tenantId` - Top customers
- `GET /api/metrics/products/:tenantId` - Products overview

### Admin
- `POST /api/admin/full-sync/:tenantId` - Full data sync
- `GET /api/tenants` - List tenants

### Webhooks
- `POST /webhooks/receive` - Shopify webhook receiver

## 🔄 Data Sync

### Real-time (Webhooks)
- Products create/update
- Customers create/update
- Orders create/update
- Checkouts create

### Scheduled (Every 15 minutes)
- Abandoned checkouts polling

### Manual
- Full sync via API endpoint

## 🛡️ Security

- JWT authentication
- HMAC webhook verification
- Multi-tenant data isolation
- Password hashing with bcrypt
- CORS protection

## 📊 Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run db:generate # Generate Prisma client
npm run db:migrate  # Run database migrations
npm run db:deploy   # Deploy migrations to production
npm run db:studio   # Open Prisma Studio
```

## 🚀 Deployment

1. Set environment variables
2. Run database migrations: `npx prisma migrate deploy`
3. Start the server: `npm start`

## 🧪 Testing

Test the API endpoints using curl or Postman:

```bash
# Health check
curl http://localhost:4000/health

# Register user
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🔍 Monitoring

- Health check endpoint: `GET /health`
- Console logging for webhook events
- Error logging for failed operations