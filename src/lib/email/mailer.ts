/**
 * METHABAU Email Service — Dynamic Nodemailer import
 *
 * IMPORTANT: Uses dynamic import() for nodemailer to avoid Edge Runtime conflicts.
 * Nodemailer uses Node.js stream/crypto modules not available in Edge Runtime.
 * This file must only be imported in Node.js API routes (not middleware, not client).
 *
 * ENV VARS required:
 *   SMTP_HOST     — SMTP server hostname
 *   SMTP_PORT     — SMTP port (465 TLS / 587 STARTTLS)
 *   SMTP_SECURE   — 'true' for port 465 TLS
 *   SMTP_USER     — SMTP username / email
 *   SMTP_PASS     — SMTP password or API key
 *   SMTP_FROM     — Sender address (e.g. 'METHADesk Pro <noreply@methabau.ch>')
 *   NEXT_PUBLIC_APP_URL — Public URL base for confirmation links
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function confirmationTemplate(vorname: string, token: string): { subject: string; html: string; text: string } {
    const confirmUrl = `${APP_URL}/auth/set-password?token=${token}`;
    const subject = 'METHADesk Pro — E-Mail-Adresse bestätigen';
    const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #334155; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #ff6b35 0%, #e85a2a 100%); padding: 40px 40px 32px; text-align: center; }
    .logo-letter { font-size: 28px; font-weight: 900; color: #ffffff; line-height: 56px; width: 56px; height: 56px; margin: 0 auto 16px; background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.4); border-radius: 14px; display: block; text-align: center; }
    .brand-title { font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
    .brand-sub { font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 4px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; }
    .content { padding: 40px; }
    h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    p { font-size: 15px; line-height: 1.7; color: #475569; margin-bottom: 16px; }
    .cta-block { text-align: center; margin: 32px 0; }
    .cta-btn { display: inline-block; background: #ff6b35; color: #ffffff; font-size: 15px; font-weight: 700; padding: 16px 36px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 12px rgba(255,107,53,0.3); }
    .link-fallback { font-size: 13px; color: #94a3b8; margin-top: 8px; }
    .link-fallback a { color: #ff6b35; word-break: break-all; }
    .divider { height: 1px; background: #e2e8f0; margin: 32px 0; }
    .footer { padding: 24px 40px; background: #f8fafc; text-align: center; }
    .footer p { font-size: 12px; color: #94a3b8; line-height: 1.6; }
    .expiry-note { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #c2410c; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="logo-letter">M</span>
      <div class="brand-title">METHADesk <span style="font-weight:300; font-size:16px; opacity:0.8">pro</span></div>
      <div class="brand-sub">METHABAU AG &middot; Baumanagement</div>
    </div>
    <div class="content">
      <h1>Willkommen, ${vorname}!</h1>
      <p>Vielen Dank für Ihre Registrierung bei <strong>METHADesk Pro</strong>. Um Ihren Zugang zu aktivieren, bestätigen Sie bitte Ihre E-Mail-Adresse und legen Sie Ihr Passwort fest.</p>
      <div class="cta-block">
        <a href="${confirmUrl}" class="cta-btn">E-Mail bestätigen &amp; Passwort festlegen</a>
        <p class="link-fallback">Falls der Button nicht funktioniert: <a href="${confirmUrl}">${confirmUrl}</a></p>
      </div>
      <div class="expiry-note">
        &#9200; Dieser Link ist <strong>72 Stunden</strong> gültig.
      </div>
      <div class="divider"></div>
      <p style="font-size:13px; color:#94a3b8">Falls Sie sich nicht registriert haben, können Sie diese E-Mail ignorieren.</p>
    </div>
    <div class="footer">
      <p><strong>METHABAU AG</strong><br>METHADesk Pro &middot; Interne Baudokumentationsplattform<br>
      <span style="color:#cbd5e1">&copy; ${new Date().getFullYear()} METHABAU AG. Alle Rechte vorbehalten.</span></p>
    </div>
  </div>
</body>
</html>`;
    const text = `Willkommen, ${vorname}!\n\nBestätigen Sie Ihre E-Mail-Adresse:\n${confirmUrl}\n\nDieser Link ist 72 Stunden gültig.\n\n-- METHABAU AG`;
    return { subject, html, text };
}

export async function sendConfirmationEmail(
    to: string,
    vorname: string,
    confirmToken: string
): Promise<void> {
    const {
        SMTP_HOST,
        SMTP_PORT,
        SMTP_SECURE,
        SMTP_USER,
        SMTP_PASS,
        SMTP_FROM,
    } = process.env;

    const from = SMTP_FROM || '"METHADesk Pro" <noreply@methabau.ch>';
    const { subject, html, text } = confirmationTemplate(vorname, confirmToken);

    // Console fallback when SMTP is not configured
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        console.log('\n══════════════════════════════════════════');
        console.log('  📧 EMAIL (console fallback — SMTP not configured)');
        console.log(`  An:       ${to}`);
        console.log(`  Betreff:  ${subject}`);
        console.log(`  Link:     ${APP_URL}/auth/set-password?token=${confirmToken}`);
        console.log('══════════════════════════════════════════\n');
        return;
    }

    // Dynamic import — avoids Edge Runtime conflict with Node.js stream/crypto modules
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT || '587'),
        secure: SMTP_SECURE === 'true',
        auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transport.sendMail({ from, to, subject, html, text });
    console.log(`[Mailer] Confirmation email sent to ${to}`);
}
