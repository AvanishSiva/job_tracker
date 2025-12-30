import { NextRequest, NextResponse } from 'next/server';

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes - excluded to avoid issues with webhooks/callbacks like Google OAuth)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};

export function middleware(req: NextRequest) {
    // 1. Check if Auth environment variables are set
    const authUser = process.env.AUTH_USER;
    const authPass = process.env.AUTH_PASSWORD;

    // If not configured, allow access (or strictly block, but for ease of use we allow if unset)
    if (!authUser || !authPass) {
        return NextResponse.next();
    }

    // 2. Check Authorization header
    const basicAuth = req.headers.get('authorization');

    if (basicAuth) {
        const authValue = basicAuth.split(' ')[1];
        const [user, pwd] = atob(authValue).split(':');

        if (user === authUser && pwd === authPass) {
            return NextResponse.next();
        }
    }

    // 3. Request Auth
    return new NextResponse('Auth Required', {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="Secure Area"',
        },
    });
}
