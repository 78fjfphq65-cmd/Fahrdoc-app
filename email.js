/* ============================================
   FahrDoc — E-Mail Service (Resend)
   ============================================ */
require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'FahrDoc <noreply@fahrdoc.app>';

// ============================================
// Send verification code email
// ============================================
async function sendVerificationEmail(to, name, code) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'FahrDoc — Dein Verifizierungscode',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; color: #1a1a1a; margin: 0;">🚗 FahrDoc</h1>
          </div>
          <p style="font-size: 16px; color: #333; line-height: 1.5;">Hallo ${name},</p>
          <p style="font-size: 16px; color: #333; line-height: 1.5;">Willkommen bei FahrDoc! Dein Verifizierungscode lautet:</p>
          <div style="text-align: center; margin: 28px 0;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a; background: #f0f4f8; padding: 16px 32px; border-radius: 12px; display: inline-block;">${code}</span>
          </div>
          <p style="font-size: 14px; color: #666; line-height: 1.5;">Der Code ist 15 Minuten gültig. Falls du dich nicht bei FahrDoc registriert hast, ignoriere diese E-Mail.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">FahrDoc — Digitale Fahrstunden-Dokumentation</p>
        </div>
      `
    });

    if (error) {
      console.error('[EMAIL] Verification send error:', error);
      return false;
    }
    console.log(`[EMAIL] Verification code sent to ${to} (id: ${data?.id})`);
    return true;
  } catch (err) {
    console.error('[EMAIL] Verification send failed:', err.message);
    return false;
  }
}

// ============================================
// Send password reset email
// ============================================
async function sendPasswordResetEmail(to, name, code) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'FahrDoc — Passwort zurücksetzen',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; color: #1a1a1a; margin: 0;">🚗 FahrDoc</h1>
          </div>
          <p style="font-size: 16px; color: #333; line-height: 1.5;">Hallo ${name},</p>
          <p style="font-size: 16px; color: #333; line-height: 1.5;">Du hast angefordert, dein Passwort zurückzusetzen. Dein Code lautet:</p>
          <div style="text-align: center; margin: 28px 0;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a; background: #f0f4f8; padding: 16px 32px; border-radius: 12px; display: inline-block;">${code}</span>
          </div>
          <p style="font-size: 14px; color: #666; line-height: 1.5;">Der Code ist 15 Minuten gültig. Falls du kein Passwort-Reset angefordert hast, ignoriere diese E-Mail.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">FahrDoc — Digitale Fahrstunden-Dokumentation</p>
        </div>
      `
    });

    if (error) {
      console.error('[EMAIL] Reset send error:', error);
      return false;
    }
    console.log(`[EMAIL] Password reset code sent to ${to} (id: ${data?.id})`);
    return true;
  } catch (err) {
    console.error('[EMAIL] Reset send failed:', err.message);
    return false;
  }
}

// ============================================
// Generate 6-digit code
// ============================================
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================
// Send invite code email (for instructors or students)
// ============================================
async function sendInviteEmail({ to, code, type, schoolName, senderName, senderRole }) {
  try {
    const isInstructor = type === 'instructor';
    const roleLabel = isInstructor ? 'Fahrlehrer' : 'Fahrschüler';
    const registerUrl = 'https://www.fahrdoc.app?code=' + encodeURIComponent(code);
    const inviterLine = senderRole === 'school'
      ? schoolName + ' hat dich als ' + roleLabel + ' eingeladen'
      : senderName + ' (' + schoolName + ') hat dich eingeladen';

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Einladung zu FahrDoc — ' + schoolName,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; color: #1a1a1a; margin: 0;">🚗 FahrDoc</h1>
          </div>

          <p style="font-size: 16px; color: #333; line-height: 1.6;">Hallo,</p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">${inviterLine}.</p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">Mit FahrDoc kannst du deine Fahrstunden digital dokumentieren und deinen Fortschritt verfolgen.</p>

          <div style="text-align: center; margin: 28px 0;">
            <p style="font-size: 14px; color: #666; margin-bottom: 8px;">Dein Einladungscode:</p>
            <span style="font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #1a1a1a; background: #f0f4f8; padding: 14px 28px; border-radius: 12px; display: inline-block;">${code}</span>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${registerUrl}" style="display: inline-block; background: #0d9488; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 36px; border-radius: 10px; text-decoration: none;">Jetzt registrieren</a>
          </div>

          <div style="background: #f8fafb; border-radius: 12px; padding: 20px; margin: 28px 0;">
            <p style="font-size: 14px; font-weight: 600; color: #333; margin: 0 0 12px 0;">📱 App zum Startbildschirm hinzufügen:</p>
            <p style="font-size: 13px; color: #555; line-height: 1.6; margin: 0 0 8px 0;"><strong>iPhone/iPad (Safari):</strong><br>Öffne den Link in Safari → tippe auf das Teilen-Symbol (□↑) → "Zum Home-Bildschirm"</p>
            <p style="font-size: 13px; color: #555; line-height: 1.6; margin: 0;"><strong>Android (Chrome):</strong><br>Öffne den Link in Chrome → tippe auf ⋮ (Menü) → "Zum Startbildschirm hinzufügen"</p>
          </div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">FahrDoc — Digitale Fahrstunden-Dokumentation<br><a href="https://www.fahrdoc.app" style="color: #999;">www.fahrdoc.app</a></p>
        </div>
      `
    });

    if (error) {
      console.error('[EMAIL] Invite send error:', error);
      return { success: false, error: error.message };
    }
    console.log(`[EMAIL] Invite sent to ${to} (code: ${code}, id: ${data?.id})`);
    return { success: true };
  } catch (err) {
    console.error('[EMAIL] Invite send failed:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendInviteEmail, generateCode };
