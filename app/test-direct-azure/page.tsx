'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'

export default function TestDirectAzurePage() {
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`])
  }

  const testDirectAzureAuth = () => {
    addLog('Testing direct Azure AD authentication...')
    
    // Get environment variables (these would be set on the client side for testing)
    const clientId = '821b363f-de04-415c-b65b-e6c02eed4adb' // Your client ID
    const tenantId = '6d86fa6d-c5cc-4792-a524-c760a5ff3596' // Your tenant ID
    const redirectUri = `${window.location.origin}/api/auth/callback/azure-ad`
    
    addLog(`Client ID: ${clientId}`)
    addLog(`Tenant ID: ${tenantId}`)
    addLog(`Redirect URI: ${redirectUri}`)
    
    // Build Azure AD authorization URL
    const authParams = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'openid email profile https://graph.microsoft.com/Files.ReadWrite offline_access',
      state: 'test-state-' + Math.random().toString(36).substring(7),
      nonce: 'test-nonce-' + Math.random().toString(36).substring(7),
      response_mode: 'query'
    })
    
    const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${authParams.toString()}`
    
    addLog(`Authorization URL: ${authUrl}`)
    
    // Test the URL
    addLog('Opening Azure AD authorization URL...')
    window.open(authUrl, 'azure-test', 'width=600,height=700')
  }

  const getCallbackInfo = () => {
    const currentUrl = window.location.href
    const origin = window.location.origin
    const callbackUrl = `${origin}/api/auth/callback/azure-ad`
    
    return {
      currentUrl,
      origin,
      callbackUrl,
      expectedInAzure: callbackUrl
    }
  }

  const info = typeof window !== 'undefined' ? getCallbackInfo() : null

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-center">Direct Azure AD Test</h1>
          <p className="text-center text-gray-600 mt-2">Test Azure AD authentication directly</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Azure AD Configuration Check</h2>
          
          {info && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700">Current Environment:</h3>
                <div className="bg-gray-50 p-3 rounded mt-2 text-sm space-y-1">
                  <p><strong>Current URL:</strong> <code>{info.currentUrl}</code></p>
                  <p><strong>Origin:</strong> <code>{info.origin}</code></p>
                  <p><strong>Callback URL:</strong> <code>{info.callbackUrl}</code></p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-700">Azure AD App Registration Requirements:</h3>
                <div className="bg-blue-50 border border-blue-200 p-3 rounded mt-2">
                  <p className="text-blue-800 font-medium mb-2">Add this redirect URI to your Azure AD app:</p>
                  <code className="bg-white p-2 rounded border text-sm block break-all">
                    {info.expectedInAzure}
                  </code>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">Steps to fix Azure AD:</h3>
                <ol className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>1. Go to <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Azure Portal</a></li>
                  <li>2. Navigate to Azure Active Directory → App registrations</li>
                  <li>3. Select "CDD Reimbursements" app</li>
                  <li>4. Go to "Authentication" in the left menu</li>
                  <li>5. Under "Redirect URIs", click "Add a platform" → "Web"</li>
                  <li>6. Add the callback URL shown above</li>
                  <li>7. Save the changes</li>
                  <li>8. Come back and test the button below</li>
                </ol>
              </div>

              <Button onClick={testDirectAzureAuth} className="w-full">
                Test Direct Azure AD Authentication
              </Button>
            </div>
          )}
        </div>

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
              <p className="text-gray-500 text-sm">Click the test button to see logs...</p>
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