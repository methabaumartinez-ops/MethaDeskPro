import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const driveUrl = searchParams.get('url');

    if (!driveUrl) {
        return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
    }

    try {
        const parsedUrl = new URL(driveUrl);
        const allowedDomains = [
            'drive.google.com',
            'lh3.googleusercontent.com',
            'docs.google.com',
            'googleapis.com'
        ];

        const isAllowed = allowedDomains.some(domain =>
            parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
        );

        if (!isAllowed) {
            console.warn(`[SSRF Prevention] Blocked suspicious proxy request to: ${parsedUrl.hostname}`);
            return NextResponse.json({ error: 'Forbidden: Domain not whitelisted' }, { status: 403 });
        }

        // Fetch the image from Google Drive
        const response = await fetch(driveUrl, {
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0',
            },
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400', // Cache for 24h
            },
        });
    } catch (error) {
        console.error('Image proxy error:', error);
        return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
    }
}
