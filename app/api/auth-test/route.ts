import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const config = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID,
    AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID,
    AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET ? '[SET]' : '[NOT SET]',
    wellKnownURL: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0/.well-known/openid_configuration`,
    expectedRedirectURI: `${process.env.NEXTAUTH_URL}/api/auth/callback/azure-ad`,
    authProviders: 'Check /api/auth/providers',
    authSignin: 'Check /api/auth/signin',
    requestURL: request.url,
    requestHeaders: Object.fromEntries(request.headers.entries())
  }
  
  // Test if we can access the auth configuration
  try {
    const providersResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/providers`, {
      headers: {
        'Accept': 'application/json'
      }
    })
    
    const providers = await providersResponse.text()
    
    return NextResponse.json({
      message: "Auth configuration check",
      config,
      providersStatus: providersResponse.status,
      providersResponse: providers,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({
      message: "Auth configuration check - ERROR",
      config,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}