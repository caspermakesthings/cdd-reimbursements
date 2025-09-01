import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const config = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID,
    AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID,
    AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET ? '[SET]' : '[NOT SET]',
    wellKnownURL: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0/.well-known/openid_configuration`,
    expectedRedirectURI: `${process.env.NEXTAUTH_URL}/api/auth/callback/azure-ad`
  }
  
  return NextResponse.json({
    message: "Auth configuration check",
    config,
    timestamp: new Date().toISOString()
  })
}