import { NextResponse } from 'next/server';
import { google } from 'googleapis';

/**
 * GET /api/auth/google
 * Redirects user to Google OAuth consent screen to authorize Drive access.
 */
export async function GET() {
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google';

    if (!CLIENT_ID || !CLIENT_SECRET) {
        return NextResponse.json({ error: 'Google OAuth credentials missing in .env' }, { status: 500 });
    }

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/drive.file',
        ],
    });

    return NextResponse.redirect(authUrl);
}
