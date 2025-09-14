import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  BarChart3, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Package, 
  TrendingUp,
  RefreshCw,
  Store,
  Calendar,
  User
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import axios from 'axios'

const Dashboard = () => {
  const [searchParams] = useSearchParams()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tenantId, setTenantId] = useState(null)
  const [shopDomain, setShopDomain] = useState('')
  
  // Metrics state
  const [summary, setSummary] = useState(null)
  const [ordersByDate, setOrdersByDate] = useState([])
  const [topCustomers, setTopCustomers] = useState([])
  const [products, setProducts] = useState(null)
  const [tenants, setTenants] = useState([])

  // Date range state
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    to: new Date().toISOString().split('T')[0] // today
  })

  useEffect(() => {
    const tenantFromUrl = searchParams.get('tenant')
    const shopFromUrl = searchParams.get('shop')
    
    if (tenantFromUrl) {
      setTenantId(parseInt(tenantFromUrl))
    }
    if (shopFromUrl) {
      setShopDomain(shopFromUrl)
    }
    
    loadTenants()
  }, [searchParams])

  useEffect(() => {
    if (tenantId) {
      loadMetrics()
    }
  }, [tenantId, dateRange])

  const loadTenants = async () => {
    try {
      const response = await axios.get('/api/tenants')
      setTenants(response.data)
      
      // If no tenant selected and we have tenants, select the first one
      if (!tenantId && response.data.length > 0) {
        setTenantId(response.data[0].id)
        setShopDomain(response.data[0].shopDomain)
      }
    } catch (error) {
      console.error('Error loading tenants:', error)
    }
  }

  const loadMetrics = async () => {
    if (!tenantId) return
    
    setLoading(true)
    try {
      const [summaryRes, ordersRes, customersRes, productsRes] = await Promise.all([
        axios.get(`/api/metrics/summary/${tenantId}`),
        axios.get(`/api/metrics/orders-by-date/${tenantId}?from=${dateRange.from}&to=${dateRange.to}`),
        axios.get(`/api/metrics/top-customers/${tenantId}`),
        axios.get(`/api/metrics/products/${tenantId}`)
      ])
      
      setSummary(summaryRes.data)
      setOrdersByDate(ordersRes.data)
      setTopCustomers(customersRes.data)
      setProducts(productsRes.data)
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      if (tenantId) {
        await axios.post(`/api/admin/full-sync/${tenantId}`)
        await loadMetrics()
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleTenantChange = (newTenantId) => {
    const tenant = tenants.find(t => t.id === newTenantId)
    setTenantId(newTenantId)
    setShopDomain(tenant?.shopDomain || '')
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Store className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Shopify Insights</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {tenants.length > 0 && (
                <select
                  value={tenantId || ''}
                  onChange={(e) => handleTenantChange(parseInt(e.target.value))}
                  className="input w-64"
                >
                  <option value="">Select a store</option>
                  {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.shopDomain}
                    </option>
                  ))}
                </select>
              )}
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn btn-secondary flex items-center"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <button
                onClick={logout}
                className="btn btn-secondary"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!tenantId ? (
          <div className="text-center py-12">
            <Store className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No store selected</h3>
            <p className="mt-1 text-sm text-gray-500">
              Please connect a Shopify store to view insights
            </p>
          </div>
        ) : (
          <>
            {/* Store Info */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {shopDomain ? `${shopDomain} Dashboard` : 'Store Dashboard'}
              </h2>
              <p className="text-gray-600">Real-time insights and analytics</p>
            </div>

            {/* Date Range Filter */}
            <div className="mb-6 flex items-center space-x-4">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="input"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="input"
                />
              </div>
            </div>

            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Customers</p>
                      <p className="text-2xl font-bold text-gray-900">{summary.customers}</p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center">
                    <ShoppingCart className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold text-gray-900">{summary.orders}</p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-yellow-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.revenue)}</p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center">
                    <Package className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Abandoned Carts</p>
                      <p className="text-2xl font-bold text-gray-900">{summary.abandonedCheckouts}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Revenue Over Time */}
              <div className="card">
                <div className="flex items-center mb-4">
                  <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Revenue Over Time</h3>
                </div>
                {ordersByDate.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ordersByDate}>
                        <Bar dataKey="total" fill="#3B82F6" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [formatCurrency(value), 'Revenue']}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    No data available for the selected date range
                  </div>
                )}
              </div>

              {/* Top Customers */}
              <div className="card">
                <div className="flex items-center mb-4">
                  <User className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Top Customers by Spend</h3>
                </div>
                {topCustomers.length > 0 ? (
                  <div className="space-y-3">
                    {topCustomers.map((customer, index) => (
                      <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                            {index + 1}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {customer.firstName} {customer.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{customer.email}</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(customer.totalSpent)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    No customer data available
                  </div>
                )}
              </div>
            </div>

            {/* Products Section */}
            {products && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-purple-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Products Overview</h3>
                  </div>
                  <span className="text-sm text-gray-500">Total: {products.count}</span>
                </div>
                
                {products.recent.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Recent Products</h4>
                    {products.recent.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{product.title}</p>
                          <p className="text-xs text-gray-500">Handle: {product.handle}</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(product.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No products available
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default Dashboard