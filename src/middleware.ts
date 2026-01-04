import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Handle CORS for API routes
    if (request.nextUrl.pathname.startsWith('/api/sync/')) {
        const response = NextResponse.next()

        // Allow requests from both main app and campus store
        const origin = request.headers.get('origin')
        const allowedOrigins = [
            'https://www.studiq.fun',
            'https://studiq.fun',
            'https://store.studiq.fun',
            'http://localhost:3000',
            'http://localhost:3001'
        ]

        if (origin && allowedOrigins.includes(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin)
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Sync-API-Key')
            response.headers.set('Access-Control-Allow-Credentials', 'true')
        }

        // Handle OPTIONS preflight
        if (request.method === 'OPTIONS') {
            return new NextResponse(null, {
                status: 200,
                headers: response.headers
            })
        }

        return response
    }

    return NextResponse.next()
}

export const config = {
    matcher: '/api/sync/:path*'
}
