# Complete Setup Guide

This guide will walk you through setting up the entire Shopify Data Ingestion & Insights Service from scratch.

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js 18+ installed
- [ ] MySQL 8.0+ installed and running
- [ ] A code editor (VS Code recommended)
- [ ] Git installed
- [ ] A Shopify Partner account
- [ ] ngrok installed (for local webhook testing)

## 🚀 Step-by-Step Setup

### 1. Database Setup

#### Install MySQL
- **Windows**: Download from [mysql.com](https://dev.mysql.com/downloads/mysql/)
- **macOS**: `brew install mysql` or download from mysql.com
- **Linux**: `sudo apt-get install mysql-server` (Ubuntu/Debian)

#### Create Database
```sql
-- Connect to MySQL
mysql -u root -p

-- Create database
CREATE DATABASE shopify_insights;

-- Create user (optional, for security)
CREATE USER 'shopify_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON shopify_insights.* TO 'shopify_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Shopify App Setup

#### Create Shopify Partner Account
1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Sign up for a Partner account
3. Verify your email

#### Create Development Store
1. In Partner Dashboard, go to "Stores"
2. Click "Create store"
3. Choose "Development store"
4. Fill in store details
5. Note your store domain (e.g., `your-store.myshopify.com`)

#### Create Custom App
1. In your development store admin, go to "Apps"
2. Click "Develop apps for your store"
3. Click "Create an app"
4. Give it a name (e.g., "Insights Dashboard")
5. Click "Create app"
6. Go to "Configuration" tab
7. Note down:
   - **API key** (Client ID)
   - **API secret key** (Client Secret)

#### Configure App Settings
1. In app configuration, set:
   - **App URL**: `http://localhost:4000` (for local dev)
   - **Allowed redirection URL(s)**: `http://localhost:4000/auth/callback`
2. In "Webhooks" section, add:
   - **Webhook endpoint URL**: `https://your-ngrok-url.ngrok.io/webhooks/receive`
   - **API version**: 2025-01
   - **Events**: Select all relevant events (products, customers, orders, checkouts)

### 3. Backend Setup

#### Navigate to Backend Directory
```bash
cd backend
```

#### Install Dependencies
```bash
npm install
```

#### Configure Environment
```bash
# Copy environment template
cp env.example .env

# Edit .env file with your configuration
```

**Edit `.env` file:**
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="mysql://root:your_password@localhost:3306/shopify_insights"
SHADOW_DATABASE_URL="mysql://root:your_password@localhost:3306/shopify_insights_shadow"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
SHOPIFY_API_KEY="your_shopify_api_key_from_app"
SHOPIFY_API_SECRET="your_shopify_api_secret_from_app"
SHOPIFY_SCOPES="read_products,read_orders,read_customers,read_checkouts"
APP_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:3000"
```

#### Setup Database
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

#### Start Backend Server
```bash
npm run dev
```

You should see:
```
🚀 Server running on port 4000
📊 Health check: http://localhost:4000/health
🔗 Install URL: http://localhost:4000/auth/install?shop=your-store.myshopify.com
```

### 4. Frontend Setup

#### Navigate to Frontend Directory
```bash
cd ../frontend
```

#### Install Dependencies
```bash
npm install
```

#### Start Frontend Server
```bash
npm run dev
```

You should see:
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### 5. ngrok Setup (for Webhooks)

#### Install ngrok
```bash
# Using npm
npm install -g ngrok

# Or download from ngrok.com
```

#### Start ngrok Tunnel
```bash
# In a new terminal
ngrok http 4000
```

You'll see output like:
```
Session Status                online
Account                       your-account
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:4000
```

#### Update Shopify App Configuration
1. Copy the HTTPS URL from ngrok (e.g., `https://abc123.ngrok.io`)
2. Update your Shopify app webhook URL to: `https://abc123.ngrok.io/webhooks/receive`
3. Update redirect URL to: `https://abc123.ngrok.io/auth/callback`

### 6. Test the Complete Flow

#### 1. Install Shopify App
Visit: `http://localhost:4000/auth/install?shop=your-store.myshopify.com`

#### 2. Complete OAuth Flow
1. You'll be redirected to Shopify
2. Click "Install app"
3. You'll be redirected back to the frontend dashboard

#### 3. Access Dashboard
1. Open: `http://localhost:3000`
2. Register a new account or login
3. You should see your store data

#### 4. Test Data Sync
1. Create a product in your Shopify store
2. Check if it appears in the dashboard
3. Create a test order
4. Verify it shows up in metrics

## 🧪 Testing Checklist

### Backend API Tests
- [ ] Health check: `curl http://localhost:4000/health`
- [ ] User registration works
- [ ] User login works
- [ ] Shopify OAuth flow works
- [ ] Webhooks receive data
- [ ] Metrics endpoints return data

### Frontend Tests
- [ ] Login page loads
- [ ] Registration works
- [ ] Dashboard displays data
- [ ] Charts render correctly
- [ ] Date filtering works
- [ ] Store switching works

### Integration Tests
- [ ] Shopify app installation
- [ ] Data sync from Shopify
- [ ] Real-time webhook updates
- [ ] Dashboard updates with new data

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Error
```
Error: Can't connect to MySQL server
```
**Solution**: Check MySQL is running and credentials are correct

#### Shopify OAuth Error
```
Error: Invalid redirect_uri
```
**Solution**: Ensure redirect URL in Shopify app matches exactly

#### Webhook Not Receiving Data
```
Webhook endpoint not called
```
**Solution**: 
1. Check ngrok is running
2. Verify webhook URL in Shopify app
3. Check webhook events are enabled

#### Frontend Can't Connect to Backend
```
Network Error: Failed to fetch
```
**Solution**: 
1. Check backend is running on port 4000
2. Verify proxy configuration in vite.config.js
3. Check CORS settings

### Debug Commands

```bash
# Check if ports are in use
netstat -tulpn | grep :4000
netstat -tulpn | grep :3000

# Check MySQL status
sudo systemctl status mysql  # Linux
brew services list | grep mysql  # macOS

# Check ngrok status
curl http://localhost:4040/api/tunnels
```

## 🚀 Production Deployment

### Using Render (Recommended)

1. **Backend Deployment**:
   - Connect GitHub repo to Render
   - Create new Web Service
   - Set build command: `cd backend && npm install && npx prisma generate`
   - Set start command: `cd backend && npm start`
   - Add environment variables

2. **Frontend Deployment**:
   - Create new Static Site
   - Set build command: `cd frontend && npm install && npm run build`
   - Set publish directory: `frontend/dist`

3. **Database**:
   - Use Render's PostgreSQL (or external MySQL)
   - Update DATABASE_URL in environment variables

### Using Railway

1. Connect GitHub repository
2. Create new services for backend and frontend
3. Add MySQL database service
4. Configure environment variables
5. Deploy

## 📚 Next Steps

1. **Add Test Data**: Create products, customers, and orders in Shopify
2. **Explore Dashboard**: Use all features and filters
3. **Test Webhooks**: Create/update data in Shopify and watch dashboard
4. **Customize**: Modify charts, add new metrics
5. **Deploy**: Follow production deployment guide

## 🆘 Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review console logs for errors
3. Verify all environment variables are set
4. Ensure all services are running
5. Check Shopify app configuration

## 🎉 Success!

Once everything is working, you should have:
- ✅ A running backend API
- ✅ A functional React dashboard
- ✅ Connected Shopify store
- ✅ Real-time data sync
- ✅ Interactive charts and metrics

Congratulations! You've successfully set up the complete Shopify Data Ingestion & Insights Service.