import { NextResponse } from 'next/server';

export function middleware(request) {
  // Allow public access to Farcaster webhook endpoints
  if (request.nextUrl.pathname.startsWith('/api/farcaster-webhook') ||
      request.nextUrl.pathname.startsWith('/api/webhook/farcaster') ||
      request.nextUrl.pathname.startsWith('/api/webhook-test') ||
      request.nextUrl.pathname.startsWith('/api/manifest')) {
    
    // Add headers to bypass Vercel protection
    const response = NextResponse.next();
    response.headers.set('x-middleware-override-headers', 'x-vercel-protection-bypass');
    response.headers.set('x-vercel-protection-bypass', process.env.VERCEL_PROTECTION_BYPASS || 'true');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/farcaster-webhook',
    '/api/webhook/farcaster', 
    '/api/webhook-test',
    '/api/manifest'
  ]
};