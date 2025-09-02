import { useState, useEffect } from 'react'

interface ExchangeRatesResponse {
  rates: Record<string, number>
  date: string
  cached: boolean
  fallback?: boolean
  error?: string
}

interface ExchangeRatesHook {
  rates: Record<string, number>
  loading: boolean
  error: string | null
  lastUpdated: string | null
  isUsingFallback: boolean
  refetch: () => Promise<void>
}

export function useExchangeRates(): ExchangeRatesHook {
  const [rates, setRates] = useState<Record<string, number>>({
    CAD: 1.35,
    EUR: 0.85,
    GBP: 0.75,
    USD: 1.0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [isUsingFallback, setIsUsingFallback] = useState(true)

  const fetchRates = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/exchange-rates')
      const data: ExchangeRatesResponse = await response.json()
      
      if (response.ok) {
        setRates(data.rates)
        setLastUpdated(data.date)
        setIsUsingFallback(data.fallback || false)
        
        if (data.fallback) {
          setError('Using fallback exchange rates - API unavailable')
        }
      } else {
        throw new Error(data.error || 'Failed to fetch exchange rates')
      }
    } catch (err: any) {
      console.error('Exchange rates fetch error:', err)
      setError(err.message)
      setIsUsingFallback(true)
      
      // Keep using fallback rates
      setRates({
        CAD: 1.35,
        EUR: 0.85,
        GBP: 0.75,
        USD: 1.0
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRates()
  }, [])

  return {
    rates,
    loading,
    error,
    lastUpdated,
    isUsingFallback,
    refetch: fetchRates
  }
}

// Utility function to get exchange rate to USD
export function getExchangeRateToUSD(fromCurrency: string, rates: Record<string, number>): number {
  if (fromCurrency === 'USD') return 1.0
  
  const rate = rates[fromCurrency]
  return rate ? (1 / rate) : 1.0 // Invert rate since API gives USD->Currency, we want Currency->USD
}

// Utility function to format exchange rate display
export function formatExchangeRate(fromCurrency: string, toUSD: number): string {
  return `1 ${fromCurrency} = ${toUSD.toFixed(4)} USD`
}