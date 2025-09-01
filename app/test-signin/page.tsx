'use client'

import { signIn, getProviders } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

export default function TestSignInPage() {
  const [providers, setProviders] = useState<any>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    async function loadProviders() {
      try {
        const providers = await getProviders()
        console.log('Available providers:', providers)
        setProviders(providers)
      } catch (err: any) {
        console.error('Failed to get providers:', err)
        setError(err.message)
      }
    }
    loadProviders()
  }, [])

  const handleTestSignIn = async () => {
    try {
      console.log('Attempting sign in...')
      const result = await signIn('azure-ad', { 
        redirect: false,
        callbackUrl: '/test-signin'
      })
      console.log('Sign in result:', result)
    } catch (err: any) {
      console.error('Sign in error:', err)
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-center">NextAuth Test</h2>
          <p className="text-center text-gray-600 mt-2">Testing OneDrive Connection</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Available Providers:</h3>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <p className="text-red-600 text-sm">Error: {error}</p>
            </div>
          )}
          
          {providers ? (
            <div className="space-y-2 mb-4">
              {Object.values(providers).map((provider: any) => (
                <div key={provider.id} className="bg-gray-50 p-2 rounded">
                  <p><strong>ID:</strong> {provider.id}</p>
                  <p><strong>Name:</strong> {provider.name}</p>
                  <p><strong>Type:</strong> {provider.type}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 mb-4">Loading providers...</p>
          )}
          
          <Button onClick={handleTestSignIn} className="w-full">
            Test OneDrive Sign In
          </Button>
        </div>
      </div>
    </div>
  )
}