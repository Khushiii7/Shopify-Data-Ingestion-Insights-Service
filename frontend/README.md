# Frontend - Shopify Insights Dashboard

React-based dashboard for visualizing Shopify store data and insights.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── ProtectedRoute.jsx    # Route protection component
│   ├── contexts/
│   │   └── AuthContext.jsx       # Authentication context
│   ├── pages/
│   │   ├── Login.jsx             # Login/Register page
│   │   └── Dashboard.jsx         # Main dashboard
│   ├── App.jsx                   # Main app component
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Global styles
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 🎨 Features

- **Authentication**: Login/Register with JWT
- **Multi-tenant Support**: Switch between connected stores
- **Real-time Dashboard**: Live metrics and charts
- **Data Visualization**: Revenue charts, customer rankings
- **Date Filtering**: Custom date range selection
- **Responsive Design**: Mobile-friendly interface

## 📊 Dashboard Components

### Summary Cards
- Total Customers
- Total Orders
- Total Revenue
- Abandoned Carts

### Charts
- Revenue Over Time (Bar Chart)
- Top Customers by Spend
- Products Overview

### Interactive Features
- Date range filtering
- Store selection dropdown
- Manual refresh button
- Real-time data updates

## 🎯 Usage

### 1. Authentication
- Register a new account or login
- Connect Shopify store via OAuth

### 2. Dashboard Navigation
- Select store from dropdown
- Filter data by date range
- Refresh data manually
- View real-time metrics

### 3. Data Visualization
- Revenue trends over time
- Top performing customers
- Recent products added
- Store performance metrics

## 🛠️ Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Lucide React** - Icons

## 🔧 Configuration

The frontend is configured to proxy API requests to the backend:

```javascript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
      '/auth': 'http://localhost:4000',
      '/webhooks': 'http://localhost:4000'
    }
  }
})
```

## 📱 Responsive Design

The dashboard is fully responsive and works on:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🎨 Styling

Uses Tailwind CSS with custom components:
- `.card` - Card container
- `.btn` - Button styles
- `.btn-primary` - Primary button
- `.btn-secondary` - Secondary button
- `.input` - Form input
- `.loading` - Loading spinner

## 🚀 Build & Deploy

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔌 API Integration

The frontend communicates with the backend through:

- **Authentication**: JWT tokens stored in localStorage
- **API Calls**: Axios with automatic token attachment
- **Error Handling**: User-friendly error messages
- **Loading States**: Visual feedback during API calls

## 🧪 Testing

### Manual Testing Checklist

- [ ] User registration and login
- [ ] Shopify store connection
- [ ] Dashboard data display
- [ ] Date range filtering
- [ ] Store switching
- [ ] Manual refresh
- [ ] Responsive design
- [ ] Error handling

### Test Scenarios

1. **New User Flow**:
   - Register account
   - Connect Shopify store
   - View dashboard with data

2. **Existing User Flow**:
   - Login with credentials
   - Select connected store
   - View metrics and charts

3. **Data Updates**:
   - Create product in Shopify
   - Verify webhook updates dashboard
   - Test manual refresh

## 🐛 Troubleshooting

### Common Issues

1. **API Connection Errors**:
   - Check backend server is running
   - Verify proxy configuration
   - Check CORS settings

2. **Authentication Issues**:
   - Clear localStorage
   - Check JWT token validity
   - Verify backend authentication

3. **Data Not Loading**:
   - Check tenant ID selection
   - Verify Shopify store connection
   - Check browser console for errors

## 🔄 State Management

Uses React Context for:
- User authentication state
- API token management
- Global application state

## 📈 Performance

- Lazy loading for route components
- Optimized re-renders with React hooks
- Efficient API calls with proper loading states
- Responsive images and charts

## 🚀 Future Enhancements

- Real-time updates with WebSocket
- Advanced filtering and search
- Export functionality for reports
- Mobile app version
- Offline support with service workers