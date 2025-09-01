'use client'

import { useState, useEffect } from 'react'
import { signIn, getProviders, getCsrfToken } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export default function DebugAuthPage() {
  const [providers, setProviders] = useState<any>(null)
  const [csrfToken, setCsrfToken] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`])
  }

  useEffect(() => {
    async function loadData() {
      try {
        addLog('Loading providers and CSRF token...')
        
        const [providersData, token] = await Promise.all([
          getProviders(),
          getCsrfToken()
        ])
        
        addLog(`Providers loaded: ${JSON.stringify(providersData)}`)
        addLog(`CSRF token: ${token}`)
        
        setProviders(providersData)
        setCsrfToken(token || '')
      } catch (err: any) {
        addLog(`Error loading data: ${err.message}`)
        setError(err.message)
      }
    }
    loadData()
  }, [])

  const testDirectSignIn = async () => {
    try {
      addLog('Testing direct sign in...')
      
      // Check current URL and origin
      addLog(`Current URL: ${window.location.href}`)
      addLog(`Current origin: ${window.location.origin}`)
      
      const result = await signIn('azure-ad', {
        redirect: false,
        callbackUrl: `${window.location.origin}/debug-auth`
      })
      
      addLog(`Sign in result: ${JSON.stringify(result)}`)
      
      if (result?.error) {
        setError(`Sign in error: ${result.error}`)
        addLog(`Sign in error: ${result.error}`)
      }
      
    } catch (err: any) {
      addLog(`Sign in exception: ${err.message}`)
      setError(err.message)
    }
  }

  const testPopupSignIn = async () => {
    try {
      addLog('Testing popup sign in...')
      
      // Get the authorization URL manually
      const authUrl = `/api/auth/signin/azure-ad`
      addLog(`Auth URL: ${authUrl}`)
      
      // Try to open in popup
      const popup = window.open(authUrl, 'auth-popup', 'width=500,height=600')
      
      if (!popup) {
        addLog('Popup blocked by browser')
        setError('Popup blocked by browser')
        return
      }
      
      addLog('Popup opened successfully')
      
      // Monitor popup
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          addLog('Popup was closed')
        }
      }, 1000)
      
    } catch (err: any) {
      addLog(`Popup sign in error: ${err.message}`)
      setError(err.message)
    }
  }

  const testDirectNavigation = () => {
    addLog('Testing direct navigation...')
    const authUrl = `/api/auth/signin/azure-ad?callbackUrl=${encodeURIComponent(window.location.origin + '/debug-auth')}`
    addLog(`Navigating to: ${authUrl}`)
    window.location.href = authUrl
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-center">Azure AD Debug Tool</h1>
          <p className="text-center text-gray-600 mt-2">Comprehensive OAuth debugging</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <h3 className="font-semibold text-red-800">Error:</h3>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Configuration Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Configuration</h2>
            
            <div className="space-y-2 text-sm">
              <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
              <p><strong>Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'Loading...'}</p>
              <p><strong>CSRF Token:</strong> {csrfToken ? 'Present' : 'Missing'}</p>
            </div>

            <div className="mt-4">
              <h3 className="font-medium mb-2">Expected Azure AD Redirect URI:</h3>
              <code className="bg-gray-100 p-2 rounded text-xs block break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback/azure-ad` : 'Loading...'}
              </code>
            </div>

            <div className="mt-4">
              <h3 className="font-medium mb-2">Providers:</h3>
              {providers ? (
                <div className="space-y-2">
                  {Object.values(providers).map((provider: any) => (
                    <div key={provider.id} className="bg-gray-50 p-2 rounded text-xs">
                      <p><strong>ID:</strong> {provider.id}</p>
                      <p><strong>Name:</strong> {provider.name}</p>
                      <p><strong>Type:</strong> {provider.type}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Loading providers...</p>
              )}
            </div>
          </div>

          {/* Test Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
            
            <div className="space-y-4">
              <Button onClick={testDirectSignIn} className="w-full">
                Test Direct Sign In (No Redirect)
              </Button>
              
              <Button onClick={testPopupSignIn} className="w-full" variant="outline">
                Test Popup Sign In
              </Button>
              
              <Button onClick={testDirectNavigation} className="w-full" variant="outline">
                Test Direct Navigation
              </Button>
            </div>

            <div className="mt-6">
              <h3 className="font-medium mb-2">Instructions:</h3>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Copy the "Expected Azure AD Redirect URI" above</li>
                <li>2. Go to Azure Portal → App registrations → Your app</li>
                <li>3. Add the redirect URI to Authentication settings</li>
                <li>4. Try the test buttons above</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Debug Logs */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
          <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
            {logs.length > 0 ? (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono text-gray-700">
                    {log}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No logs yet...</p>
            )}
          </div>
          <Button 
            onClick={() => setLogs([])} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            Clear Logs
          </Button>
        </div>
      </div>
    </div>
  )
}