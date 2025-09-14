import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import { NextRequestWithAuth } from 'next-auth/middleware';

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/api/webhooks/(.*)',
  '/favicon.ico'
];

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    
    // Skip middleware for public routes
    const isPublicRoute = publicRoutes.some(route => {
      if (route.includes('(.*)')) {
        return pathname.startsWith(route.replace('(.*)', ''));
      }
      return pathname === route;
    });

    if (isPublicRoute) {
      return NextResponse.next();
    }

    // If user is not authenticated, redirect to login
    if (!req.nextauth?.token) {
      const url = new URL('/login', req.url);
      url.searchParams.set('callbackUrl', req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => true
    }
  }
);

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};