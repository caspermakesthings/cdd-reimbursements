'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

export default function ConnectOneDrive() {
  const { data: session, status } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch('/api/drive/status')
        const data = await response.json()
        setIsConnected(data.connected)
      } catch (error) {
        console.error('Failed to check OneDrive status:', error)
        setIsConnected(false)
      } finally {
        setIsLoading(false)
      }
    }

    if (status !== 'loading') {
      checkStatus()
    }
  }, [session, status])

  if (status === 'loading' || isLoading) {
    return (
      <Button disabled>
        Checking connection...
      </Button>
    )
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-green-700">Connected to OneDrive</span>
        </div>
        <Button
          variant="outline"
          onClick={() => signOut()}
        >
          Disconnect
        </Button>
      </div>
    )
  }

  // Check for token refresh errors
  if (session && session.error === "RefreshAccessTokenError") {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <span className="text-sm text-yellow-700">Connection expired - please reconnect</span>
        </div>
        <Button
          onClick={() => signIn('azure-ad')}
        >
          Reconnect OneDrive
        </Button>
      </div>
    )
  }

  const handleConnect = () => {
    console.log('Starting OneDrive connection...')
    signIn('azure-ad')
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-sm text-gray-600">Not connected to OneDrive</span>
      </div>
      <Button onClick={handleConnect}>
        Connect OneDrive
      </Button>
    </div>
  )
}