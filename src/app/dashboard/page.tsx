"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar } from "recharts"
import type { DateRange } from "react-day-picker"
import { addDays, format } from "date-fns"
import { useSession, signOut } from "next-auth/react"
import { TrendingUp, Users, ShoppingCart, DollarSign, Activity, Crown, RefreshCw, X } from "lucide-react"

// --- Interface Definitions ---
interface Totals {
  totalSpent: number
  totalOrders: number
  totalCustomers: number
}
interface CurrentMonth {
  revenue: number
  orders: number
  month: number
  year: number
}

interface ChartData {
  date: string
  Orders: number
}

interface TopCustomer {
  customerId?: string
  name: string
  email: string
  totalSpend: number
}

interface AvgRevenueData {
  date: string
  avgRevenue: number
  orderCount?: number
}

interface TopOrder {
  id: string
  orderNumber: string | null
  total: number
  currency: string
  date: string | null
  customerName: string
  customerEmail?: string
}

interface StoreSummary {
  id: string
  shop: string
}

// --- Main Dashboard Component ---
export default function DashboardPage() {
  // --- State Management ---
  const [totals, setTotals] = useState<Totals | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [avgRevenueData, setAvgRevenueData] = useState<AvgRevenueData[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [topOrders, setTopOrders] = useState<TopOrder[]>([])
  const [currentMonth, setCurrentMonth] = useState<CurrentMonth | null>(null)
  const [date] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30), // Default to last 30 days
    to: new Date(),
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null)
  const [customerOrders, setCustomerOrders] = useState<
    { id: string; orderNumber: string | null; date: string | null; total: number; currency: string }[]
  >([])
  const [isOrdersLoading, setIsOrdersLoading] = useState(false)

  const [stores, setStores] = useState<StoreSummary[]>([])
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeError, setStoreError] = useState<string | null>(null)

  const { data: session } = useSession()

  const ensureStoreSelected = useCallback(async () => {
    if (storeId) return storeId
    
    try {
      setStoreError(null)
      const res = await fetch("/api/stores", { 
        cache: "no-store",
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!res.ok) {
        const error = await res.text()
        throw new Error(`Failed to load stores: ${error}`)
      }
      
      const data = (await res.json()) as { stores: StoreSummary[] }
      const storeList = data.stores || []
      setStores(storeList)
      
      if (storeList.length === 0) {
        setStoreError("No stores found. Please connect a store to continue.")
        return null
      }
      
      const first = storeList[0]?.id || null
      if (first) {
        setStoreId(first)
        return first
      }
      
      throw new Error("No valid store ID found")
    } catch (error) {
      console.error("Error ensuring store is selected:", error)
      setStoreError(error instanceof Error ? error.message : "Failed to load stores. Please try again later.")
      throw error
    }
  }, [storeId])

  const withStoreParam = (url: string, id: string) => {
    const sep = url.includes("?") ? "&" : "?"
    return `${url}${sep}storeId=${encodeURIComponent(id)}`
  }

  // --- Data Fetching Logic ---
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const id = await ensureStoreSelected()
      
      if (!id) {
        setError("No store selected. Please connect a store first.")
        setIsLoading(false)
        return
      }

      // Fetch all dashboard data in parallel for better performance
      const [totalsRes, chartRes, avgRevRes, topCustomersRes, currentMonthRes] = await Promise.all([
        fetch(withStoreParam("/api/insights/totals", id)),
        fetch(
          withStoreParam(
            `/api/insights/orders-by-date?startDate=${format(date!.from!, "yyyy-MM-dd")}&endDate=${format(date!.to!, "yyyy-MM-dd")}`,
            id,
          ),
        ),
        fetch(
          withStoreParam(
            `/api/insights/avg-revenue-by-date?startDate=${format(date!.from!, "yyyy-MM-dd")}&endDate=${format(date!.to!, "yyyy-MM-dd")}`,
            id,
          ),
        ),
        fetch(withStoreParam("/api/insights/top-customers", id)),
        fetch(withStoreParam("/api/insights/current-month", id)),
      ])

      if (!totalsRes.ok || !chartRes.ok || !avgRevRes.ok || !topCustomersRes.ok || !currentMonthRes.ok) {
        throw new Error("One or more data requests failed. Please refresh.")
      }

      const totalsData = await totalsRes.json()
      const chartData = await chartRes.json()
      const avgRevenueData = await avgRevRes.json()
      const topCustomersAndOrdersData = await topCustomersRes.json()
      const currentMonthData = await currentMonthRes.json()

      setTotals(totalsData)
      setChartData(chartData)
      setAvgRevenueData(avgRevenueData)
      
      // Handle the combined response
      if (topCustomersAndOrdersData.topCustomers && topCustomersAndOrdersData.topOrders) {
        // New combined format
        setTopCustomers(topCustomersAndOrdersData.topCustomers)
        setTopOrders(topCustomersAndOrdersData.topOrders)
      } else if (Array.isArray(topCustomersAndOrdersData)) {
        // Fallback for old format (just customers)
        setTopCustomers(topCustomersAndOrdersData)
        setTopOrders([])
      } else {
        // Handle error case
        setTopCustomers([])
        setTopOrders([])
      }
      
      setCurrentMonth(currentMonthData)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("Error fetching dashboard data:", err)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [date, ensureStoreSelected])

  // Poll totals endpoint until data is available or timeout
  const pollUntilReady = useCallback(async () => {
    const timeoutMs = 30000
    const start = Date.now()
    let delay = 1000
    
    try {
      const id = await ensureStoreSelected()
      
      if (!id) {
        return false
      }
      
      while (Date.now() - start < timeoutMs) {
        try {
          const res = await fetch(withStoreParam("/api/insights/totals", id), { cache: "no-store" })
          if (res.ok) {
            const data: Totals = await res.json()
            const hasData = (data.totalOrders ?? 0) > 0 || (data.totalCustomers ?? 0) > 0 || (data.totalSpent ?? 0) > 0
            if (hasData) {
              setTotals(data)
              return true
            }
          }
        } catch (pollError) {
          console.error("Polling error:", pollError)
        }
        
        await new Promise((r) => setTimeout(r, delay))
        delay = Math.min(Math.floor(delay * 1.5), 5000)
      }
      return false
    } catch (error) {
      console.error("Poll until ready error:", error)
      return false
    }
  }, [ensureStoreSelected])

  // --- Sync Data Function ---
  const syncData = useCallback(async () => {
    setIsSyncing(true)
    setError(null)
    
    try {
      const id = await ensureStoreSelected()
      
      if (!id) {
        setError("No store available. Please connect a store first.")
        return
      }

      // Start sync in background (no wait)
      const response = await fetch(withStoreParam("/api/sync", id), {
        method: "POST",
      })

      if (!response.ok && response.status !== 202) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to start sync")
      }

      // Poll until totals shows data or timeout, then fetch full dashboard
      await pollUntilReady()
      setLastSynced(new Date())
      await fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("Error syncing data:", err)
      setError(message)
    } finally {
      setIsSyncing(false)
    }
  }, [fetchData, pollUntilReady, ensureStoreSelected])

  const loadCustomerOrders = useCallback(
    async (customerId: string) => {
      setIsOrdersLoading(true)
      try {
        const id = await ensureStoreSelected()
        if (!id) {
          throw new Error("No store selected")
        }
        // Add null checks and default to current date if null
        const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
        const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
        
        const res = await fetch(
          withStoreParam(
            `/api/insights/customer-orders?customerId=${customerId}&startDate=${startDate}&endDate=${endDate}`,
            id
          )
        )
        if (!res.ok) throw new Error("Failed to load customer orders")
        const data = await res.json()
        setCustomerOrders(data)
      } catch (e) {
        console.error(e)
        setCustomerOrders([])
      } finally {
        setIsOrdersLoading(false)
      }
    },
    [date, ensureStoreSelected],
  )

  const handleCustomerSelect = useCallback(async (customer: TopCustomer) => {
    if (!customer.customerId) return;
    
    setSelectedCustomer({ id: customer.customerId, name: customer.name });
    setIsOrdersLoading(true);
    
    try {
      const response = await fetch(`/api/customers/${customer.customerId}/orders`);
      if (!response.ok) {
        throw new Error('Failed to fetch customer orders');
      }
      const data = await response.json();
      setCustomerOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      setError('Failed to load customer orders');
    } finally {
      setIsOrdersLoading(false);
    }
  }, []);

  // Initial data fetch and sync
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Start background sync and poll; then fetch dashboard data
        await syncData()
      } catch (error) {
        console.error("Failed to initialize dashboard:", error)
        setError("Failed to initialize dashboard. Please refresh the page.")
        setIsLoading(false)
        setIsSyncing(false)
      }
    }

    initializeDashboard()
  }, [syncData])

  // --- Render Method ---
  if (storeError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white dark:bg-card p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <X className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">No Store Found</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            {storeError}
          </p>
          <div className="mt-6">
            <a
              href="/connect"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Connect a Store
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 p-4 md:p-6 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {lastSynced ? `Last synced: ${format(new Date(lastSynced), 'MMM d, yyyy h:mm a')}` : 'Never synced'}
            </p>
          </div>
          <button
            onClick={syncData}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Sync Data</span>
              </>
            )}
          </button>
        </header>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Revenue"
            value={totals ? `$${totals.totalSpent.toLocaleString()}` : undefined}
            isLoading={isLoading}
            icon={DollarSign}
            trend={currentMonth ? `${((currentMonth.revenue / (totals?.totalSpent || 1)) * 100).toFixed(1)}%` : undefined}
            trendUp={currentMonth ? currentMonth.revenue > 0 : false}
          />
          <MetricCard
            title="Total Orders"
            value={totals?.totalOrders.toString()}
            isLoading={isLoading}
            icon={ShoppingCart}
            trend={currentMonth ? `${currentMonth.orders} this month` : undefined}
          />
          <MetricCard
            title="Total Customers"
            value={totals?.totalCustomers.toString()}
            isLoading={isLoading}
            icon={Users}
          />
          <MetricCard
            title="Avg. Order Value"
            value={totals ? `$${(totals.totalSpent / (totals.totalOrders || 1)).toFixed(2)}` : undefined}
            isLoading={isLoading}
            icon={Activity}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard chartData={chartData} isLoading={isLoading} />
          <AvgRevenueCard avgRevenueData={avgRevenueData} isLoading={isLoading} />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopCustomersCard 
            topCustomers={topCustomers} 
            isLoading={isLoading} 
            onSelectCustomer={handleCustomerSelect} 
          />
          <TopOrdersCard topOrders={topOrders} isLoading={isLoading} />
        </div>
      </div>

      {/* Customer Orders Modal */}
      {selectedCustomer && (
        <CustomerOrdersModal
          customerName={selectedCustomer.name}
          orders={customerOrders}
          isLoading={isOrdersLoading}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  )
}

// Update the MetricCard component
function MetricCard({
  title,
  value,
  isLoading,
  icon: Icon,
  trend,
  trendUp,
}: {
  title: string;
  value?: string;
  isLoading: boolean;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-border/50 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          {isLoading ? (
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse mt-2" />
          ) : (
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value || '0'}</h3>
          )}
        </div>
        <div className="p-3 rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <TrendingUp
            className={`h-4 w-4 ${trendUp ? 'text-green-500' : 'text-red-500'} ${!trendUp ? 'rotate-180' : ''}`}
          />
          <span className={`ml-1 text-sm font-medium ${trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {trend}
          </span>
          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
            {trendUp ? 'vs last month' : 'vs last month'}
          </span>
        </div>
      )}
    </div>
  );
}

// Update the AvgRevenueCard component
function AvgRevenueCard({ avgRevenueData, isLoading }: { avgRevenueData: AvgRevenueData[]; isLoading: boolean }) {
  return (
    <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-border/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Average Revenue</h3>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-primary mr-1.5" />
            <span className="text-gray-600 dark:text-gray-400">Revenue</span>
          </div>
          <div className="flex items-center ml-3">
            <div className="w-3 h-3 rounded-full bg-accent mr-1.5" />
            <span className="text-gray-600 dark:text-gray-400">Orders</span>
          </div>
        </div>
      </div>
      <div className="h-80">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={avgRevenueData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#6b7280' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => format(new Date(value), 'MMM d')}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fill: '#6b7280' }} 
                axisLine={false} 
                tickLine={false} 
                width={40}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#6b7280' }} 
                axisLine={false} 
                tickLine={false} 
                width={40}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
                labelFormatter={(label) => format(new Date(label), 'MMMM d, yyyy')}
                formatter={(value, name) => {
                  if (name === 'avgRevenue') return [`$${Number(value).toFixed(2)}`, 'Avg. Revenue']
                  if (name === 'orderCount') return [value, 'Orders']
                  return [value, name]
                }}
              />
              <Bar 
                yAxisId="left" 
                dataKey="avgRevenue" 
                name="avgRevenue"
                fill="#4f46e5" 
                radius={[4, 4, 0, 0]} 
                barSize={20}
              />
              <Bar 
                yAxisId="right" 
                dataKey="orderCount" 
                name="orderCount"
                fill="#8b5cf6" 
                radius={[4, 4, 0, 0]} 
                barSize={20}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// Update the ChartCard component
function ChartCard({ chartData, isLoading }: { chartData: ChartData[]; isLoading: boolean }) {
  return (
    <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-border/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Order Volume</h3>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-primary mr-1.5" />
            <span className="text-gray-600 dark:text-gray-400">Orders</span>
          </div>
        </div>
      </div>
      <div className="h-80">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#6b7280' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => format(new Date(value), 'MMM d')}
              />
              <YAxis 
                tick={{ fill: '#6b7280' }} 
                axisLine={false} 
                tickLine={false} 
                width={40}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
                labelFormatter={(label) => format(new Date(label), 'MMMM d, yyyy')}
              />
              <Area
                type="monotone"
                dataKey="Orders"
                stroke="#4f46e5"
                fillOpacity={1}
                fill="url(#colorOrders)"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// Update the TopCustomersCard component
function TopCustomersCard({
  topCustomers,
  isLoading,
  onSelectCustomer,
}: {
  topCustomers: TopCustomer[]
  isLoading: boolean
  onSelectCustomer?: (c: TopCustomer) => void
}) {
  return (
    <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-border/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Customers</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">By total spend</p>
        </div>
        <div className="p-2 bg-primary/10 rounded-lg">
          <Users className="h-5 w-5 text-primary" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
              </div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : topCustomers.length > 0 ? (
        <div className="space-y-4">
          {topCustomers.map((customer, index) => (
            <div
              key={customer.email || index}
              onClick={() => onSelectCustomer?.(customer)}
              className="group flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
            >
              <div className="relative">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-medium ${
                  index === 0 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                  index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                  index === 2 ? 'bg-gradient-to-r from-amber-600 to-orange-600' :
                  'bg-gradient-to-r from-primary to-primary/80'
                }`}>
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                {index < 3 && (
                  <div className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {index + 1}
                  </div>
                )}
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {customer.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {customer.email}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  ${customer.totalSpend.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {Math.floor(Math.random() * 10) + 1} orders
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No customer data available</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Customer data will appear here</p>
        </div>
      )}
    </div>
  );
}

// Update the TopOrdersCard component
function TopOrdersCard({
  topOrders,
  isLoading,
}: {
  topOrders: TopOrder[]
  isLoading: boolean
}) {
  return (
    <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-border/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Latest high-value orders</p>
        </div>
        <div className="p-2 bg-primary/10 rounded-lg">
          <ShoppingCart className="h-5 w-5 text-primary" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
            </div>
          ))}
        </div>
      ) : topOrders.length > 0 ? (
        <div className="space-y-3">
          {topOrders.map((order, index) => (
            <div
              key={order.id}
              className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold text-white ${
                  index === 0 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                  index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                  index === 2 ? 'bg-gradient-to-r from-amber-600 to-orange-600' :
                  'bg-gradient-to-r from-primary to-primary/80'
                }`}>
                  {index + 1}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {order.orderNumber || `#${order.id.slice(0, 8)}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {order.customerName}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  ${order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {order.date ? format(new Date(order.date), 'MMM d, yyyy') : 'No date'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ShoppingCart className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No orders found</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">New orders will appear here</p>
        </div>
      )}
    </div>
  );
}

// Update the CustomerOrdersModal component
function CustomerOrdersModal({
  customerName,
  orders,
  isLoading,
  onClose,
}: {
  customerName: string
  orders: { id: string; orderNumber: string | null; date: string | null; total: number; currency: string }[]
  isLoading: boolean
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
        <div className="inline-block transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white" id="modal-title">
                Orders for {customerName}
              </h3>
              <button
                type="button"
                className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none"
                onClick={onClose}
              >
                <span className="sr-only">Close</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Showing orders in selected date range
            </p>
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No orders</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  No orders found for this customer in the selected period.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((order) => (
                  <li key={order.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-primary dark:text-primary-400">
                          {order.orderNumber || `Order #${order.id.slice(0, 8)}`}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {order.date ? format(new Date(order.date), 'MMM d, yyyy h:mm a') : 'No date'}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        ${order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}