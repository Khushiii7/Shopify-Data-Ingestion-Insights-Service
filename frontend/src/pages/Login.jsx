import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Store, User, Lock } from 'lucide-react'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // Check if we have tenant info from Shopify OAuth
  const tenantFromUrl = searchParams.get('tenant')
  const shopFromUrl = searchParams.get('shop')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let result
      if (isRegister) {
        result = await register(email, password, tenantId || tenantFromUrl)
      } else {
        result = await login(email, password)
      }

      if (result.success) {
        navigate('/dashboard')
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleShopifyInstall = () => {
    const shop = prompt('Enter your Shopify store domain (e.g., your-store.myshopify.com):')
    if (shop) {
      window.location.href = `/auth/install?shop=${shop}`
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <Store className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isRegister ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isRegister ? 'Get started with Shopify Insights' : 'Welcome back to Shopify Insights'}
          </p>
        </div>

        {shopFromUrl && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-sm text-green-800">
              ✅ Successfully connected to <strong>{shopFromUrl}</strong>
            </p>
            <p className="text-xs text-green-600 mt-1">
              Create an account or sign in to view your store insights
            </p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input pl-10"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                  className="input pl-10"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700">
                  Tenant ID (optional)
                </label>
                <input
                  id="tenantId"
                  name="tenantId"
                  type="number"
                  className="input mt-1"
                  placeholder="Enter tenant ID if you have one"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                />
                {tenantFromUrl && (
                  <p className="text-xs text-gray-500 mt-1">
                    Will use tenant ID {tenantFromUrl} from Shopify connection
                  </p>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full flex justify-center py-2 px-4 disabled:opacity-50"
            >
              {loading ? (
                <div className="loading"></div>
              ) : (
                isRegister ? 'Create Account' : 'Sign In'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              {isRegister 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Or connect your Shopify store</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleShopifyInstall}
              className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Store className="h-5 w-5 mr-2" />
              Connect Shopify Store
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login