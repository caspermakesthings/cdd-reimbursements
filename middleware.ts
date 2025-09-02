import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle large file uploads for batch reimbursement API
  if (request.nextUrl.pathname === '/api/reimburse/batch' && request.method === 'POST') {
    // Set headers to allow larger uploads
    const response = NextResponse.next()
    
    // Increase timeout for large uploads
    response.headers.set('Connection', 'keep-alive')
    
    return response
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/reimburse/batch',
}
