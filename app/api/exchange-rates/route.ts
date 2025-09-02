import { NextRequest, NextResponse } from "next/server"

// Cache for exchange rates (in production, use Redis or similar)
let exchangeRatesCache: {
  data: Record<string, number> | null
  lastUpdated: string | null
} = {
  data: null,
  lastUpdated: null
}

// Free API service for exchange rates
const EXCHANGE_API_URL = "https://api.exchangerate-api.com/v4/latest/USD"

async function fetchExchangeRates(): Promise<Record<string, number>> {
  try {
    const response = await fetch(EXCHANGE_API_URL, {
      next: { revalidate: 3600 } // Cache for 1 hour
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Convert to format we need (from USD to other currencies)
    const rates = data.rates
    
    return {
      CAD: rates.CAD || 1.35,
      EUR: rates.EUR || 0.85,
      GBP: rates.GBP || 0.75,
      USD: 1.0
    }
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error)
    
    // Fallback rates if API fails
    return {
      CAD: 1.35,
      EUR: 0.85,
      GBP: 0.75,
      USD: 1.0
    }
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Check if we have cached data from today
    if (exchangeRatesCache.data && exchangeRatesCache.lastUpdated === today) {
      return NextResponse.json({
        rates: exchangeRatesCache.data,
        date: today,
        cached: true
      })
    }
    
    // Fetch fresh rates
    const rates = await fetchExchangeRates()
    
    // Update cache
    exchangeRatesCache = {
      data: rates,
      lastUpdated: today
    }
    
    return NextResponse.json({
      rates,
      date: today,
      cached: false
    })
    
  } catch (error: any) {
    console.error("Exchange rates API error:", error)
    
    return NextResponse.json(
      { 
        error: "Failed to fetch exchange rates",
        rates: {
          CAD: 1.35,
          EUR: 0.85,
          GBP: 0.75,
          USD: 1.0
        },
        date: new Date().toISOString().split('T')[0],
        cached: false,
        fallback: true
      },
      { status: 200 } // Return 200 with fallback data rather than error
    )
  }
}