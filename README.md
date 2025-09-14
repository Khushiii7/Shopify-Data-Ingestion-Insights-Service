<<<<<<< HEAD
# Shopify Insights Dashboard

This project is a multi-tenant Shopify Data Ingestion & Insights Service. The application allows users to securely connect their Shopify store, ingest their core business data, and visualize key performance indicators on a polished, interactive dashboard.

### **Live Demo**

**https://xeno-fde-assignment.vercel.app/**

<img width="1800" height="865" alt="image" src="https://github.com/user-attachments/assets/84a7918e-997b-4d2f-8313-20ee5e406af0" />  
<img width="1800" height="865" alt="image" src="https://github.com/user-attachments/assets/cb50d431-ae0f-4e35-b023-86b115b83a74" />
<img width="1800" height="865" alt="image" src="https://github.com/user-attachments/assets/55b2c74e-4dbf-4059-a3a6-c8c9252c66c0" />




### **Features**

* **Secure User Authentication:** Seamless and secure user sign-up and login flow powered by Clerk, including social sign-on with Google.
* **Real-Time Data Ingestion:** Utilizes Shopify Webhooks for \`orders/create\` events to ensure the dashboard reflects new orders in real-time.
* **Historical Data Sync:** An on-demand manual sync feature to pull the latest 100 customers and orders, allowing users to refresh their data at any time.
* **Multi-Tenant Architecture:** A secure, multi-tenant design that strictly isolates data between different stores using a \`storeId\` foreign key on all relevant database models and enforced at the API level.
* **Interactive Insights Dashboard:** A polished and responsive dashboard featuring:
    * Key Performance Indicators (Total Revenue, Orders, Customers).
    * An interactive Sales Performance chart with date-range filtering.
    * A list of the Top 5 Customers by total spend.
    * A list of the Top 5 Orders by spend.
    * A drill-down modal to view the order history for a specific customer.
    * A bar chart showing average revenue according to date.

### **Tech Stack**

* **Framework: Next.js (App Router)** - For its powerful full-stack capabilities in a single codebase.
* **Language: TypeScript** - To ensure type safety and long-term maintainability.
* **Authentication: Clerk** - For a complete, production-ready user management solution.
* **Database: Supabase (PostgreSQL)** - For a robust and scalable managed SQL database.
* **ORM: Prisma** - For its best-in-class TypeScript support and type-safe database client.
* **UI: React, Tailwind CSS** - For building a modern and responsive user interface efficiently.
* **Charting: Recharts** - For its simplicity in creating interactive and declarative charts.
* **Deployment: Vercel** - For its seamless, Git-based integration with Next.js.

### **Architecture Diagram**

This diagram illustrates the flow of data and user interactions within the system.

<img width="963" height="634" alt="image" src="https://github.com/user-attachments/assets/8d86b240-1b77-4c8e-a6af-bb1d16537e26" />


### **Database Schema**

The schema is designed for multi-tenancy, linking all store-specific data back to a \`Store\` and a \`User\`.

<img width="963" height="637" alt="image" src="https://github.com/user-attachments/assets/c7167c7f-6a54-478e-a85f-8ac07db74694" />


### **API Endpoints**

All API endpoints are protected and require an authenticated session.

| **Endpoint** | **Method** | **Description** |
| ------------------------------ | ---------- | ------------------------------------------------------------ |
| \`/api/auth/shopify\`            | \`GET\`    | Initiates the Shopify OAuth2 flow.                           |
| \`/api/auth/callback/shopify\`   | \`GET\`    | Handles the OAuth callback and saves the store.              |
| \`/api/webhooks/orders-create\`  | \`POST\`   | Receives real-time order webhooks from Shopify.              |
| \`/api/sync\`                    | \`POST\`   | Triggers a manual historical data sync.                      |
| \`/api/stores\`                  | \`GET\`    | **(Secure)** Returns stores connected by the current user.   |
| \`/api/insights/*\`              | \`GET\`    | **(Secure)** Fetches various aggregated insights for the dashboard. |

### **Local Setup Instructions**

1.   **Clone the repository**
       ```bash
       git clone https://github.com/HarishKumaarD/Xeno_FDE_Assignment.git
       cd xeno-shopify-app
       npm install 
       ```

2.  **Set up .env :**
    Create the file and add your credentials for Supabase, Shopify, and Clerk.

3.  **Run Database Migrations:**

       ```bash
       npx prisma migrate dev 
       ```

4.  **Run Development Server:**

    ```bash
    npm run dev
    ```

### **Known Limitations & Assumptions**

* **Historical Sync Batch Size:** The manual sync fetches the latest 100 records. For larger stores, this would be re-architected as a paginated background job.
* **Single Webhook:** The application currently only registers a webhook for \`orders/create\`. A production system would also subscribe to update and delete events for all relevant models.

### **Future Improvements**

* **Robust Background Jobs:** For the historical sync, migrate from a single serverless function to a dedicated queue system (e.g., RabbitMQ, BullMQ). This would allow for robust, paginated fetching of all historical data without timeouts, and would provide better error handling and retry mechanisms.
* **Comprehensive Webhook Coverage:** Expand the webhook integration to subscribe to \`update\` and \`delete\` events for all core models (Orders, Products, Customers). This would ensure the data in our system remains a perfect mirror of the Shopify store over time.
* **Advanced Caching & Analytics:** For larger datasets, dashboard queries could become slow. I would implement a caching layer (e.g., Redis) for frequently accessed data. Additionally, I would build a pre-aggregation system (e.g., a nightly cron job) to compute key metrics in advance, making the dashboard load instantly.
* **Enhanced Monitoring & Error Handling:** Integrate a third-party logging and error monitoring service (like Sentry or Logtail). This would provide real-time alerts for API errors and webhook failures, allowing for proactive debugging. I would also add a UI for the user to see the status of their data syncs.
* **Multi-Store UI:** The current UI is designed for a user with a single store. The next iteration would include a store-switcher component in the UI, allowing users who own multiple Shopify stores to easily navigate between their respective dashboards.
EOF
=======
# Shopify Data Ingestion & Insights Service

A multi-tenant Shopify Data Ingestion & Insights Service that simulates how Xeno helps enterprise retailers onboard, integrate, and analyze their customer data.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Web Browser (React SPA)  │  Mobile App  │  Third-party APIs  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS/REST API
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React)        │  Backend (Express.js)               │
│  - Dashboard UI          │  - REST API Endpoints               │
│  - Authentication        │  - Authentication & Authorization    │
│  - Data Visualization    │  - Business Logic                    │
│  - State Management      │  - Data Processing                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ Database Queries
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  MySQL Database (Multi-tenant)  │  Redis Cache (Optional)      │
│  - Tenant Isolation             │  - Session Storage            │
│  - Data Persistence             │  - API Response Caching       │
│  - ACID Compliance              │  - Rate Limiting              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ External API Calls
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                           │
├─────────────────────────────────────────────────────────────────┤
│  Shopify Admin API      │  Shopify Webhooks    │  Other APIs    │
│  - Data Ingestion       │  - Real-time Updates │  - Integrations│
│  - OAuth Authentication │  - Event Processing  │  - Notifications│
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **Prisma ORM** with MySQL database
- **JWT** for authentication
- **node-cron** for scheduled tasks
- **Shopify Admin API** integration

### Frontend
- **React 18** with Vite
- **React Router** for navigation
- **Recharts** for data visualization
- **Tailwind CSS** for styling
- **Axios** for API calls

### Database
- **MySQL** with multi-tenant data isolation
- **Prisma** for type-safe database operations

## 📋 Prerequisites

- Node.js 18+ (LTS)
- MySQL 8.0+
- npm or yarn
- Shopify Partner account and development store
- ngrok (for local webhook testing) or deployed service

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd xeno-assignment
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy environment variables
cp env.example .env

# Edit .env with your configuration
# DATABASE_URL="mysql://username:password@localhost:3306/shopify_insights"
# SHOPIFY_API_KEY="your_shopify_api_key"
# SHOPIFY_API_SECRET="your_shopify_api_secret"
# JWT_SECRET="your-super-secret-jwt-key"

# Setup database
npx prisma generate
npx prisma migrate dev --name init

# Start backend server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Start frontend development server
npm run dev
```

### 4. Shopify App Setup

1. Create a Shopify Partner account at [partners.shopify.com](https://partners.shopify.com)
2. Create a new development store
3. Create a custom app in your development store
4. Note down the API key and API secret
5. Set redirect URLs:
   - For local development: `http://localhost:4000/auth/callback`
   - For production: `https://your-domain.com/auth/callback`
6. Set webhook URLs:
   - For local development: `https://your-ngrok-url.ngrok.io/webhooks/receive`
   - For production: `https://your-domain.com/webhooks/receive`

### 5. Local Development with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 4000

# Use the HTTPS URL for Shopify app configuration
```

## 📊 Database Schema

The application uses a multi-tenant architecture with the following key models:

- **Tenant**: Stores Shopify store information and access tokens
- **User**: Application users with optional tenant association
- **Customer**: Shopify customers with tenant isolation
- **Product**: Shopify products with tenant isolation
- **Order**: Shopify orders with tenant isolation
- **AbandonedCheckout**: Tracked abandoned checkouts

## 🔌 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/install?shop=store.myshopify.com` - Shopify OAuth install
- `GET /auth/callback` - Shopify OAuth callback

### Metrics
- `GET /api/metrics/summary/:tenantId` - Summary metrics (customers, orders, revenue)
- `GET /api/metrics/orders-by-date/:tenantId` - Orders by date with filtering
- `GET /api/metrics/top-customers/:tenantId` - Top customers by spend
- `GET /api/metrics/products/:tenantId` - Products overview

### Admin
- `POST /api/admin/full-sync/:tenantId` - Trigger full data sync
- `GET /api/tenants` - List available tenants

### Webhooks
- `POST /webhooks/receive` - Shopify webhook receiver

## Usage

### 1. Install Shopify App
Visit: `http://localhost:4000/auth/install?shop=your-store.myshopify.com`

### 2. Access Dashboard
- Open: `http://localhost:3000`
- Register/Login with your credentials
- Select your connected store
- View real-time metrics and charts

### 3. Data Sync
- **Real-time**: Webhooks automatically sync new data
- **Manual**: Use the "Refresh" button in the dashboard
- **Scheduled**: Abandoned checkouts are synced every 15 minutes

## 📈 Dashboard Features

- **Summary Cards**: Total customers, orders, revenue, abandoned carts
- **Revenue Chart**: Daily revenue over time with date filtering
- **Top Customers**: Top 5 customers by total spend
- **Products Overview**: Recent products and total count
- **Date Range Filter**: Filter data by custom date ranges
- **Store Selection**: Switch between multiple connected stores


##  Deployment

### Using Render (Recommended)

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set environment variables
4. Deploy both backend and frontend

### Using Railway

1. Connect your GitHub repository
2. Create new services for backend and frontend
3. Add MySQL database service
4. Configure environment variables

### Environment Variables for Production

```env
NODE_ENV=production
PORT=4000
DATABASE_URL="mysql://user:password@host:port/database"
JWT_SECRET="your-production-jwt-secret"
SHOPIFY_API_KEY="your_shopify_api_key"
SHOPIFY_API_SECRET="your_shopify_api_secret"
SHOPIFY_SCOPES="read_products,read_orders,read_customers,read_checkouts"
APP_URL="https://your-backend-domain.com"
FRONTEND_URL="https://your-frontend-domain.com"
```

## Testing

### Manual Testing Checklist

- [ ] Shopify app installation flow
- [ ] User registration and login
- [ ] Dashboard data display
- [ ] Webhook data sync (create product/order in Shopify)
- [ ] Date range filtering
- [ ] Store switching (if multiple stores)
- [ ] Manual refresh functionality

### Test Data Creation

1. Create products in your Shopify store
2. Create test customers
3. Place test orders
4. Verify data appears in dashboard

## Known Limitations

1. **Token Storage**: Access tokens are stored in plain text (encrypt in production)
2. **Rate Limiting**: No built-in Shopify API rate limiting (add retry logic)
3. **Error Handling**: Basic error handling (add comprehensive error management)
4. **Scalability**: Single database instance (consider separate DBs per tenant for large scale)
5. **Security**: Basic authentication (add role-based access control)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request
>>>>>>> dd9bd0d79f82f473b606ebd54c33ce8aa03d5a90
