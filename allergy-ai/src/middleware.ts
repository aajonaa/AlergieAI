import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to login page
        if (req.nextUrl.pathname === '/login') {
          return true
        }
        // Require authentication for /chat
        if (req.nextUrl.pathname.startsWith('/chat')) {
          return !!token
        }
        return true
      },
    },
  }
)

export const config = {
  matcher: ['/chat/:path*', '/login'],
}

