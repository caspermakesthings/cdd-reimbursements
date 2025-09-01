import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isConnected } from "@/lib/onedrive"
import { DriveStatusResponse } from "@/types"

export async function GET(request: NextRequest): Promise<NextResponse<DriveStatusResponse>> {
  try {
    const session = await getServerSession(authOptions)
    const connected = await isConnected(session)
    
    return NextResponse.json({ connected })
  } catch (error) {
    console.error("Error checking drive status:", error)
    return NextResponse.json({ connected: false })
  }
}