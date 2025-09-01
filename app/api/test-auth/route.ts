import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Basic test to see if auth options are accessible
    const hasProviders = authOptions.providers && authOptions.providers.length > 0
    const firstProvider = authOptions.providers?.[0]
    
    return NextResponse.json({
      message: "NextAuth test",
      hasProviders,
      providerType: firstProvider?.type,
      providerId: firstProvider?.id,
      debug: authOptions.debug,
      timestamp: new Date().toISOString(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        hasClientId: !!process.env.AZURE_AD_CLIENT_ID,
        hasTenantId: !!process.env.AZURE_AD_TENANT_ID
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: "Failed to access auth configuration",
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}