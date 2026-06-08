/* ============================================
   FahrDoc — E-Mail Service (Resend)
   ============================================ */
require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'FahrDoc <noreply@fahrdoc.app>';

// ============================================
// Send verification email (link + 6-digit code)
// ============================================
async function sendVerificationEmail(to, name, code, verifyToken, userId, role) {
  try {
    const baseUrl = process.env.APP_BASE_URL || 'https://www.fahrdoc.app';
    const verifyLink = verifyToken
      ? baseUrl + '/verify.html?token=' + encodeURIComponent(verifyToken) + '&uid=' + encodeURIComponent(userId || '') + '&role=' + encodeURIComponent(role || '')
      : '';

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'FahrDoc — E-Mail bestätigen',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; color: #1a1a1a; margin: 0;">🚗 FahrDoc</h1>
          </div>
          <p style="font-size: 16px; color: #333; line-height: 1.5;">Hallo ${name},</p>
          <p style="font-size: 16px; color: #333; line-height: 1.5;">Willkommen bei FahrDoc! Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.</p>
          ${verifyLink ? `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyLink}" style="display: inline-block; background: #0d9488; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 36px; border-radius: 10px; text-decoration: none;">E-Mail jetzt bestätigen</a>
          </div>
          <p style="font-size: 13px; color: #666; line-height: 1.5; text-align: center;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br><a href="${verifyLink}" style="color: #0d9488; word-break: break-all;">${verifyLink}</a></p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;">
          <p style="font-size: 14px; color: #666; line-height: 1.5; text-align: center;">Oder gib diesen Code in der App ein:</p>
          ` : `<p style="font-size: 16px; color: #333; line-height: 1.5;">Dein Verifizierungscode lautet:</p>`}
          <div style="text-align: center; margin: 20px 0 28px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a; background: #f0f4f8; padding: 14px 28px; border-radius: 12px; display: inline-block;">${code}</span>
          </div>
          <p style="font-size: 14px; color: #666; line-height: 1.5;">Link und Code sind 15 Minuten gültig. Falls du dich nicht bei FahrDoc registriert hast, ignoriere diese E-Mail.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">FahrDoc — Digitale Fahrstunden-Dokumentation</p>
        </div>
      `
    });

    if (error) {
      console.error('[EMAIL] Verification send error:', error);
      return false;
    }
    console.log(`[EMAIL] Verification email sent to ${to} (id: ${data?.id})`);
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

// ============================================
// Subscription Emails (Abo-Bestaetigung, Kuendigung, Zahlung fehlgeschlagen)
// ============================================
function emailLayout(title, bodyHtml) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; color: #1a1a1a; margin: 0;">\ud83d\ude97 FahrDoc</h1>
      </div>
      ${bodyHtml}
      <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;">
      <p style="font-size: 12px; color: #999; text-align: center;">FahrDoc \u2014 Digitale Fahrstunden-Dokumentation<br><a href="https://www.fahrdoc.app" style="color:#0d9488;text-decoration:none;">www.fahrdoc.app</a></p>
    </div>
  `;
}

async function sendSubscriptionWelcomeEmail(to, schoolName, plan, amount) {
  try {
    const planName = plan === 'ki' ? 'FahrDoc KI' : 'FahrDoc Classic';
    const priceText = amount ? (Number(amount).toFixed(2) + ' \u20ac / Monat') : (plan === 'ki' ? '39,99 \u20ac / Monat' : '29,99 \u20ac / Monat');
    const html = emailLayout('Abo aktiviert', `
      <p style="font-size: 16px; color: #333; line-height: 1.5;">Hallo ${schoolName || 'Fahrschule'},</p>
      <p style="font-size: 16px; color: #333; line-height: 1.5;">vielen Dank f\u00fcr deinen Abschluss! Dein <strong>${planName}</strong>-Abo ist jetzt aktiv.</p>
      <div style="background:#f0f9ff;border-left:4px solid #0d9488;padding:16px 20px;margin:24px 0;border-radius:6px;">
        <div style="font-size:14px;color:#666;margin-bottom:4px;">Dein Tarif</div>
        <div style="font-size:18px;font-weight:600;color:#0d9488;">${planName}</div>
        <div style="font-size:14px;color:#666;margin-top:8px;">${priceText}</div>
      </div>
      ${plan === 'ki' ? '<p style="font-size: 15px; color: #333; line-height: 1.5;">\u2728 Mit FahrDoc KI kannst du ab sofort <strong>KI-Briefings</strong> f\u00fcr jeden Sch\u00fcler generieren \u2014 perfekt vor jeder Fahrstunde.</p>' : '<p style="font-size: 15px; color: #333; line-height: 1.5;">Falls du sp\u00e4ter auf FahrDoc KI upgraden m\u00f6chtest \u2014 du kannst jederzeit in der App wechseln.</p>'}
      <div style="text-align:center;margin:28px 0;"><a href="https://www.fahrdoc.app" style="display:inline-block;background:#0d9488;color:#fff;font-size:16px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">Zur App</a></div>
      <p style="font-size:14px;color:#666;line-height:1.5;">Du kannst dein Abo jederzeit in den Einstellungen verwalten oder k\u00fcndigen.</p>
    `);
    const { data, error } = await resend.emails.send({ from: FROM_EMAIL, to: [to], subject: 'FahrDoc \u2014 Abo aktiviert: ' + planName, html });
    if (error) { console.error('[EMAIL] Welcome send error:', error); return false; }
    console.log('[EMAIL] Welcome sent to ' + to + ' (id: ' + (data && data.id) + ')');
    return true;
  } catch (err) { console.error('[EMAIL] Welcome send failed:', err.message); return false; }
}

async function sendSubscriptionCancelledEmail(to, schoolName, endDate) {
  try {
    const endText = endDate ? new Date(endDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
    const html = emailLayout('Abo gek\u00fcndigt', `
      <p style="font-size: 16px; color: #333; line-height: 1.5;">Hallo ${schoolName || 'Fahrschule'},</p>
      <p style="font-size: 16px; color: #333; line-height: 1.5;">dein FahrDoc-Abo wurde gek\u00fcndigt. ${endText ? 'Du kannst FahrDoc noch bis zum <strong>' + endText + '</strong> nutzen.' : 'Dein Zugang endet zum n\u00e4chsten Abrechnungstermin.'}</p>
      <p style="font-size: 15px; color: #333; line-height: 1.5;">Schade, dass du gehst! Falls du Feedback hast, antworte einfach auf diese E-Mail \u2014 wir freuen uns \u00fcber jede R\u00fcckmeldung.</p>
      <div style="text-align:center;margin:28px 0;"><a href="https://www.fahrdoc.app" style="display:inline-block;background:#0d9488;color:#fff;font-size:16px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">Wieder abonnieren</a></div>
      <p style="font-size:14px;color:#666;line-height:1.5;">Deine Daten bleiben gespeichert. Du kannst jederzeit zur\u00fcckkommen \u2014 alles ist noch da.</p>
    `);
    const { data, error } = await resend.emails.send({ from: FROM_EMAIL, to: [to], subject: 'FahrDoc \u2014 Abo gek\u00fcndigt', html });
    if (error) { console.error('[EMAIL] Cancel send error:', error); return false; }
    console.log('[EMAIL] Cancel sent to ' + to);
    return true;
  } catch (err) { console.error('[EMAIL] Cancel send failed:', err.message); return false; }
}

async function sendPaymentFailedEmail(to, schoolName, amount) {
  try {
    const priceText = amount ? (Number(amount).toFixed(2) + ' \u20ac') : '';
    const html = emailLayout('Zahlung fehlgeschlagen', `
      <p style="font-size: 16px; color: #333; line-height: 1.5;">Hallo ${schoolName || 'Fahrschule'},</p>
      <p style="font-size: 16px; color: #333; line-height: 1.5;">leider konnte deine Zahlung ${priceText ? '\u00fcber <strong>' + priceText + '</strong> ' : ''}nicht abgebucht werden.</p>
      <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px 20px;margin:24px 0;border-radius:6px;">
        <div style="font-size:14px;color:#991b1b;font-weight:600;margin-bottom:8px;">\u26a0\ufe0f Was du jetzt tun solltest:</div>
        <ul style="margin:0;padding-left:18px;color:#333;line-height:1.6;font-size:14px;">
          <li>Pr\u00fcfe deine Zahlungsmethode (Karte abgelaufen? Deckung?)</li>
          <li>Aktualisiere deine Zahlungsdaten in den Einstellungen</li>
          <li>Stripe versucht es in den n\u00e4chsten Tagen erneut</li>
        </ul>
      </div>
      <p style="font-size: 15px; color: #333; line-height: 1.5;">Solange die Zahlung offen ist, bleibt dein Zugang aktiv. Wenn nach mehreren Versuchen keine Zahlung gelingt, wird dein Abo automatisch pausiert.</p>
      <div style="text-align:center;margin:28px 0;"><a href="https://www.fahrdoc.app" style="display:inline-block;background:#0d9488;color:#fff;font-size:16px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">Zahlungsdaten aktualisieren</a></div>
    `);
    const { data, error } = await resend.emails.send({ from: FROM_EMAIL, to: [to], subject: 'FahrDoc \u2014 Zahlung fehlgeschlagen', html });
    if (error) { console.error('[EMAIL] Payment-failed send error:', error); return false; }
    console.log('[EMAIL] Payment-failed sent to ' + to);
    return true;
  } catch (err) { console.error('[EMAIL] Payment-failed send failed:', err.message); return false; }
}

// ============================================
// Feedback-Mail an info@fahrdoc.app
// ============================================
async function sendFeedbackEmail(payload) {
  try {
    const FEEDBACK_TO = process.env.FEEDBACK_TO_EMAIL || 'info@fahrdoc.app';
    const userName = payload.userName || '(ohne Name)';
    const userEmail = payload.userEmail || '(ohne E-Mail)';
    const userRole = payload.userRole || '';
    const category = payload.category || 'feedback';
    const message = payload.message || '';

    // HTML-Escape gegen XSS in Mail
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const messageHtml = esc(message).replace(/\n/g, '<br>');

    const categoryColors = {
      bug: '#ef4444',
      feature: '#0d9488',
      feedback: '#3b82f6',
      frage: '#f59e0b',
      sonstiges: '#6b7280'
    };
    const catColor = categoryColors[category] || '#6b7280';

    const html = emailLayout('Neues Feedback', `
      <p style="font-size: 16px; color: #333; line-height: 1.5;">Es ist neues Feedback in der FahrDoc-App eingegangen.</p>
      <div style="background:#f8fafc;border-left:4px solid ${catColor};padding:16px 20px;margin:24px 0;border-radius:6px;">
        <table style="width:100%;font-size:14px;color:#333;border-collapse:collapse;">
          <tr><td style="padding:4px 0;color:#666;width:120px;">Kategorie:</td><td style="padding:4px 0;font-weight:600;">${esc(category)}</td></tr>
          <tr><td style="padding:4px 0;color:#666;">Von:</td><td style="padding:4px 0;">${esc(userName)}</td></tr>
          <tr><td style="padding:4px 0;color:#666;">E-Mail:</td><td style="padding:4px 0;"><a href="mailto:${esc(userEmail)}" style="color:#0d9488;text-decoration:none;">${esc(userEmail)}</a></td></tr>
          <tr><td style="padding:4px 0;color:#666;">Rolle:</td><td style="padding:4px 0;">${esc(userRole)}</td></tr>
        </table>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;padding:18px 20px;margin:20px 0;border-radius:8px;">
        <div style="font-size:13px;color:#666;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Nachricht</div>
        <div style="font-size:15px;color:#1a1a1a;line-height:1.6;">${messageHtml}</div>
      </div>
      <p style="font-size:13px;color:#666;line-height:1.5;">Antworte direkt auf diese E-Mail, um dem Nutzer zu antworten.</p>
    `);

    const subject = 'FahrDoc Feedback [' + category + '] \u2014 ' + (userName || userEmail);
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [FEEDBACK_TO],
      reply_to: userEmail && userEmail.indexOf('@') > -1 ? userEmail : undefined,
      subject: subject,
      html: html
    });
    if (error) { console.error('[EMAIL] Feedback send error:', error); return false; }
    console.log('[EMAIL] Feedback sent to ' + FEEDBACK_TO + ' (id: ' + (data && data.id) + ')');
    return true;
  } catch (err) {
    console.error('[EMAIL] Feedback send failed:', err.message);
    return false;
  }
}

// ============================================
// Schueler-Setup-Mail (Magic Link nach manueller Anlage durch Fahrschule)
// ============================================
async function sendStudentSetupEmail({ to, name, schoolName, setupUrl }) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Dein FahrDoc-Zugang \u2014 ' + schoolName,
      html: emailLayout('FahrDoc Zugang', `
        <p style="font-size: 16px; color: #333; line-height: 1.6;">Hallo${name ? ' ' + name : ''},</p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">${schoolName} hat dich als Fahrsch\u00fcler bei FahrDoc angelegt.</p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">Setze jetzt dein Passwort und log dich ein, um deine Fahrstunden, Termine und deinen Fortschritt zu sehen.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${setupUrl}" style="display: inline-block; background: #0d9488; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 36px; border-radius: 10px; text-decoration: none;">Passwort jetzt setzen</a>
        </div>
        <p style="font-size: 13px; color: #777; line-height: 1.6;">Der Link ist 7 Tage g\u00fcltig.</p>
        <div style="background: #f8fafb; border-radius: 12px; padding: 20px; margin: 28px 0;">
          <p style="font-size: 14px; font-weight: 600; color: #333; margin: 0 0 12px 0;">\ud83d\udcf1 App zum Startbildschirm hinzuf\u00fcgen:</p>
          <p style="font-size: 13px; color: #555; line-height: 1.6; margin: 0 0 8px 0;"><strong>iPhone/iPad (Safari):</strong><br>Link in Safari \u00f6ffnen \u2192 Teilen-Symbol (\u25fb\u2191) \u2192 "Zum Home-Bildschirm"</p>
          <p style="font-size: 13px; color: #555; line-height: 1.6; margin: 0;"><strong>Android (Chrome):</strong><br>Link in Chrome \u00f6ffnen \u2192 \u22ee (Men\u00fc) \u2192 "Zum Startbildschirm hinzuf\u00fcgen"</p>
        </div>
      `)
    });
    if (error) {
      console.error('[EMAIL] Student setup send error:', error);
      return { success: false, error: error.message };
    }
    console.log(`[EMAIL] Student setup sent to ${to} (id: ${data?.id})`);
    return { success: true };
  } catch (err) {
    console.error('[EMAIL] Student setup send failed:', err.message);
    return { success: false, error: err.message };
  }
}

// ============================================
// Send school welcome email (nach erfolgreicher Email-Bestätigung)
// ============================================
async function sendSchoolWelcomeEmail({ to, schoolName, adminName }) {
  try {
    const baseUrl = process.env.APP_BASE_URL || 'https://www.fahrdoc.app';
    const dashboardUrl = baseUrl + '/app/';
    const supportEmail = 'support@fahrdoc.app';

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Willkommen bei FahrDoc, ${schoolName}! 🚗`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 0; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 40px 24px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; font-size: 32px; margin: 0 0 8px 0; font-weight: 700;">🚗 Willkommen bei FahrDoc</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0;">Deine Fahrschule, digital organisiert.</p>
          </div>

          <!-- Body -->
          <div style="padding: 36px 28px;">
            <p style="font-size: 17px; color: #1a1a1a; line-height: 1.55; margin: 0 0 16px 0;">Hallo ${adminName || ''},</p>
            <p style="font-size: 16px; color: #333; line-height: 1.6; margin: 0 0 20px 0;">Schön, dass <strong>${schoolName}</strong> jetzt bei FahrDoc dabei ist! Dein Konto ist aktiviert und du kannst direkt loslegen.</p>

            <!-- Trial Badge -->
            <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 10px; padding: 16px 20px; margin: 24px 0; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #0f766e; font-weight: 600;">🎁 14 Tage kostenlos testen — keine Kreditkarte nötig</p>
            </div>

            <!-- Steps -->
            <h2 style="font-size: 18px; color: #1a1a1a; margin: 32px 0 16px 0;">So legst du los:</h2>

            <div style="margin: 16px 0;">
              <div style="display: flex; align-items: flex-start; margin-bottom: 18px;">
                <div style="flex-shrink: 0; width: 32px; height: 32px; background: #0d9488; color: #ffffff; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; margin-right: 14px;">1</div>
                <div style="flex: 1;">
                  <strong style="font-size: 15px; color: #1a1a1a;">Fahrlehrer einladen</strong><br>
                  <span style="font-size: 14px; color: #666; line-height: 1.5;">Im Dashboard unter „Profil → Fahrlehrer-Code" findest du den Einladungscode für deine Fahrlehrer.</span>
                </div>
              </div>

              <div style="display: flex; align-items: flex-start; margin-bottom: 18px;">
                <div style="flex-shrink: 0; width: 32px; height: 32px; background: #0d9488; color: #ffffff; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; margin-right: 14px;">2</div>
                <div style="flex: 1;">
                  <strong style="font-size: 15px; color: #1a1a1a;">Fahrschüler anlegen</strong><br>
                  <span style="font-size: 14px; color: #666; line-height: 1.5;">Über das Dashboard kannst du Schüler direkt anlegen — auf Wunsch mit automatischer Einladung per Magic-Link.</span>
                </div>
              </div>

              <div style="display: flex; align-items: flex-start; margin-bottom: 18px;">
                <div style="flex-shrink: 0; width: 32px; height: 32px; background: #0d9488; color: #ffffff; border-radius: 50%; text-align: center; line-height: 32px; font-weight: 700; margin-right: 14px;">3</div>
                <div style="flex: 1;">
                  <strong style="font-size: 15px; color: #1a1a1a;">Erste Fahrstunde dokumentieren</strong><br>
                  <span style="font-size: 14px; color: #666; line-height: 1.5;">Deine Fahrlehrer können in der App eine Fahrstunde starten — mit GPS-Tracking, Markierungen und KI-Briefing.</span>
                </div>
              </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 36px 0 24px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background: #0d9488; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 40px; border-radius: 10px; text-decoration: none;">Zum Dashboard</a>
            </div>

            <!-- Daten-Übernahme-Service -->
            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 10px; padding: 18px 20px; margin: 28px 0;">
              <p style="margin: 0 0 8px 0; font-size: 15px; color: #92400e; font-weight: 700;">📦 Wechsel von einem anderen System?</p>
              <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.55;">Wir helfen dir kostenfrei bei der Übernahme deiner bestehenden Schüler- und Fahrlehrer-Daten aus deinem alten Fahrschulmanager. Schreib uns einfach mit deinem Export (CSV/Excel) an <a href="mailto:${supportEmail}" style="color: #92400e; font-weight: 600;">${supportEmail}</a> — wir machen den Rest.</p>
            </div>

            <!-- Support -->
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 24px 0;">
            <p style="font-size: 14px; color: #666; line-height: 1.6; margin: 0;">Fragen oder Feedback? Schreib uns einfach an <a href="mailto:${supportEmail}" style="color: #0d9488; text-decoration: none;">${supportEmail}</a> — wir helfen gerne weiter.</p>
            <p style="font-size: 14px; color: #666; line-height: 1.6; margin: 16px 0 0 0;">Viel Erfolg mit FahrDoc!<br>Dein FahrDoc-Team</p>
          </div>

          <!-- Footer -->
          <div style="background: #f9fafb; padding: 20px 24px; text-align: center; border-radius: 0 0 12px 12px;">
            <p style="font-size: 12px; color: #999; margin: 0;">FahrDoc — Digitale Fahrstunden-Dokumentation</p>
          </div>
        </div>
      `
    });

    if (error) { console.error('[EMAIL] School welcome send error:', error); return false; }
    console.log(`[EMAIL] School welcome email sent to ${to} (id: ${data?.id})`);
    return true;
  } catch (err) {
    console.error('[EMAIL] School welcome send failed:', err.message);
    return false;
  }
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendInviteEmail, generateCode, sendSubscriptionWelcomeEmail, sendSubscriptionCancelledEmail, sendPaymentFailedEmail, sendFeedbackEmail, sendStudentSetupEmail, sendSchoolWelcomeEmail };
