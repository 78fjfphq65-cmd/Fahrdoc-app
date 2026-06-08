/* ============================================
   FahrDoc — Express Server (Supabase Edition)
   ============================================ */
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { supabase, generateToken, generateId, hashPassword, verifyPassword } = require('./db');
const { sendVerificationEmail, sendPasswordResetEmail, sendInviteEmail, generateCode, sendSubscriptionWelcomeEmail, sendSubscriptionCancelledEmail, sendPaymentFailedEmail, sendFeedbackEmail } = require('./email');
const Stripe = require('stripe');
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Google Gemini (KI-Briefings)
let genAI = null;
try {
  if (process.env.GEMINI_API_KEY) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (e) {
  console.warn('[Gemini] Library nicht geladen:', e.message);
}

// Super-Admin Email (Fallback: admin@fahrschule-weber.de fuer Demo)
const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'admin@fahrschule-weber.de').toLowerCase();

// Hilfsfunktion: Pruefe Trial/Abo-Status einer Schule
// Gibt zurueck: { active: bool, status: 'trial'|'active'|'expired'|'free', daysRemaining, plan, lockReason }
function computeSubscriptionState(sub, schoolCreatedAt) {
  var now = new Date();
  // 1) Gratis-Abo vom Super-Admin
  if (sub && sub.free_subscription) {
    var until = sub.free_subscription_until ? new Date(sub.free_subscription_until) : null;
    if (!until || until > now) {
      return { active: true, status: 'free', plan: sub.plan || 'ki', daysRemaining: until ? Math.ceil((until - now) / 86400000) : 9999, lockReason: null };
    }
  }
  // 2) Aktives Stripe-Abo
  if (sub && sub.stripe_subscription_id && (sub.status === 'active' || sub.status === 'trialing')) {
    return { active: true, status: 'active', plan: sub.plan || 'classic', daysRemaining: null, lockReason: null };
  }
  // 3) Manuelle Trial-Verlaengerung (Bestandsschutz oder Admin)
  if (sub && sub.trial_extended_until) {
    var ext = new Date(sub.trial_extended_until);
    if (ext > now) {
      return { active: true, status: 'trial', plan: 'classic', daysRemaining: Math.ceil((ext - now) / 86400000), lockReason: null };
    }
  }
  // 4) 14-Tage-Free-Trial nach Registrierung
  if (schoolCreatedAt) {
    var created = new Date(schoolCreatedAt);
    var trialEnd = new Date(created.getTime() + 14 * 86400000);
    if (trialEnd > now) {
      return { active: true, status: 'trial', plan: 'classic', daysRemaining: Math.ceil((trialEnd - now) / 86400000), lockReason: null };
    }
  }
  // 5) Stripe-Abo abgelaufen oder gekuendigt
  if (sub && sub.status === 'past_due') {
    return { active: false, status: 'expired', plan: sub.plan || 'classic', daysRemaining: 0, lockReason: 'Zahlung fehlgeschlagen. Bitte Zahlungsmethode aktualisieren.' };
  }
  // 6) Trial abgelaufen, kein Abo
  return { active: false, status: 'expired', plan: null, daysRemaining: 0, lockReason: 'Testphase abgelaufen. Bitte ein Abo abschliessen.' };
}

const app = express();
app.set('trust proxy', 1); // Railway runs behind a proxy
const PORT = process.env.PORT || 5000;

// ============================================
// STRIPE WEBHOOK (needs raw body — before express.json)
// ============================================
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
  let event;
  const sig = req.headers['stripe-signature'];
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  // In test mode without webhook secret, parse directly
  if (!whSecret || whSecret === 'whsec_placeholder') {
    try { event = JSON.parse(req.body); } catch (e) { return res.status(400).send('Invalid JSON'); }
  } else {
    try { event = stripe.webhooks.constructEvent(req.body, sig, whSecret); } catch (e) { return res.status(400).send(`Webhook Error: ${e.message}`); }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const schoolId = session.metadata?.school_id;
        const planFromMeta = session.metadata?.plan || 'classic';
        const subscriptionId = session.subscription;
        if (schoolId && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items.data[0]?.price?.id;
          const detectedPlan = priceId === process.env.STRIPE_PRICE_ID_KI ? 'ki' : (priceId === process.env.STRIPE_PRICE_ID_CLASSIC ? 'classic' : planFromMeta);
          await supabase.from('subscriptions').upsert({
            school_id: schoolId,
            stripe_customer_id: session.customer,
            stripe_subscription_id: subscriptionId,
            status: sub.status,
            plan: detectedPlan,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            instructor_quantity: sub.items.data[0]?.quantity || 1,
            trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'school_id' });
          // Welcome-Email senden
          try {
            const { data: school } = await supabase.from('schools').select('email, name').eq('id', schoolId).single();
            if (school && school.email) {
              const amount = sub.items.data[0]?.price?.unit_amount ? (sub.items.data[0].price.unit_amount / 100) : null;
              await sendSubscriptionWelcomeEmail(school.email, school.name, detectedPlan, amount);
            }
          } catch (e) { console.error('[Webhook] Welcome email error:', e.message); }
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const wasCancelled = event.type === 'customer.subscription.deleted' || sub.status === 'canceled';
        const { data: existing } = await supabase.from('subscriptions')
          .select('school_id').eq('stripe_subscription_id', sub.id).single();
        if (existing) {
          const priceId = sub.items.data[0]?.price?.id;
          const detectedPlan = priceId === process.env.STRIPE_PRICE_ID_KI ? 'ki' : (priceId === process.env.STRIPE_PRICE_ID_CLASSIC ? 'classic' : null);
          const updateData = {
            status: sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            instructor_quantity: sub.items.data[0]?.quantity || 1,
            trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            updated_at: new Date().toISOString()
          };
          if (detectedPlan) updateData.plan = detectedPlan;
          await supabase.from('subscriptions').update(updateData).eq('school_id', existing.school_id);
          // Kuendigungs-Email senden bei Cancel oder cancel_at_period_end=true (erstmaliges Kuendigen)
          if (wasCancelled || sub.cancel_at_period_end) {
            try {
              const { data: school } = await supabase.from('schools').select('email, name').eq('id', existing.school_id).single();
              if (school && school.email) {
                const endDate = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
                await sendSubscriptionCancelledEmail(school.email, school.name, endDate);
              }
            } catch (e) { console.error('[Webhook] Cancel email error:', e.message); }
          }
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const { data: existing } = await supabase.from('subscriptions')
          .select('school_id').eq('stripe_customer_id', invoice.customer).single();
        if (existing) {
          await supabase.from('subscriptions').update({
            status: 'past_due', updated_at: new Date().toISOString()
          }).eq('school_id', existing.school_id);
          // Payment-Failed Email senden
          try {
            const { data: school } = await supabase.from('schools').select('email, name').eq('id', existing.school_id).single();
            if (school && school.email) {
              const amount = invoice.amount_due ? (invoice.amount_due / 100) : null;
              await sendPaymentFailedEmail(school.email, school.name, amount);
            }
          } catch (e) { console.error('[Webhook] Payment-failed email error:', e.message); }
        }
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[Stripe Webhook Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// RATE LIMITING
// ============================================
// Use X-Visitor-Id or X-Forwarded-For for rate limiting in proxy environments
const visitorKeyGenerator = (req) => req.headers['x-visitor-id'] || req.headers['x-forwarded-for'] || req.ip;

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  keyGenerator: visitorKeyGenerator,
  message: { error: 'Zu viele Anfragen. Bitte warte kurz.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: visitorKeyGenerator,
  message: { error: 'Zu viele Anmeldeversuche. Bitte warte 15 Minuten.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
// Log API requests for debugging
app.use('/api/', (req, res, next) => {
  console.log(`[API] ${req.method} ${req.path} (visitor: ${req.headers['x-visitor-id'] || 'none'})`);
  next();
});
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
// App-Assets (JS/CSS/Icons) unter /app/ ausliefern; kein Auto-index.html auf /
app.use('/app', express.static(path.join(__dirname, 'public'), { dotfiles: 'allow', index: false, redirect: false }));
// Bestehende absolute Asset-Pfade der App weiterhin unterstuetzen (z.B. /base.css, /app.js)
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'allow', index: false }));
// Landing-Page-Assets unter / ausliefern (index.html nur ueber Fallback-Route)
app.use(express.static(path.join(__dirname, 'landing'), { dotfiles: 'allow', index: false }));

// ============================================
// AUTH MIDDLEWARE
// ============================================
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Nicht autorisiert' });

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session) return res.status(401).json({ error: 'Sitzung abgelaufen' });

  let user = null;
  if (session.user_role === 'school') {
    const { data } = await supabase.from('schools')
      .select('id, name, admin_name, email, phone, address, verified')
      .eq('id', session.user_id).single();
    if (data) { user = data; user.role = 'school'; }
  } else if (session.user_role === 'instructor') {
    const { data } = await supabase.from('instructors')
      .select('id, name, email, phone, school_id, verified')
      .eq('id', session.user_id).single();
    if (data) { user = data; user.role = 'instructor'; }
  } else if (session.user_role === 'student') {
    const { data } = await supabase.from('students')
      .select('id, name, email, phone, birthdate, address, license_class, school_id, status, verified')
      .eq('id', session.user_id).single();
    if (data) { user = data; user.role = 'student'; }
  }

  if (!user) return res.status(401).json({ error: 'Benutzer nicht gefunden' });
  req.user = user;
  req.sessionToken = token;
  next();
}

// ============================================
// HELPER: Format date as YYYY-MM-DD without timezone shift
// ============================================
function formatDateLocal(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ============================================
// HELPER: Create notification
// ============================================
async function createNotification(userId, userRole, type, title, message, referenceId) {
  await supabase.from('notifications').insert({
    id: generateId(), user_id: userId, user_role: userRole,
    type, title, message, reference_id: referenceId || null
  });
}

// ============================================
// HELPER: Get instructors for a student
// ============================================
async function getStudentInstructors(studentId) {
  const { data } = await supabase
    .from('student_instructors')
    .select('instructor_id, instructors(id, name)')
    .eq('student_id', studentId);
  return (data || []).map(r => r.instructors);
}

// ============================================
// HELPER: Link student to instructor
// ============================================
async function linkStudentInstructor(studentId, instructorId) {
  const { data: existing } = await supabase
    .from('student_instructors')
    .select('student_id')
    .eq('student_id', studentId)
    .eq('instructor_id', instructorId)
    .maybeSingle();
  if (!existing) {
    await supabase.from('student_instructors').insert({
      student_id: studentId, instructor_id: instructorId
    });
  }
}

// ============================================
// AUTH ROUTES
// ============================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });

    // Check all three tables
    let user = null;
    let role = null;

    const { data: school } = await supabase.from('schools')
      .select('id, password_hash, verified').eq('email', email).maybeSingle();
    if (school) { user = school; role = 'school'; }

    if (!user) {
      const { data: inst } = await supabase.from('instructors')
        .select('id, password_hash, verified').eq('email', email).maybeSingle();
      if (inst) { user = inst; role = 'instructor'; }
    }

    if (!user) {
      const { data: stu } = await supabase.from('students')
        .select('id, password_hash, verified').eq('email', email).maybeSingle();
      if (stu) { user = stu; role = 'student'; }
    }

    if (!user) return res.status(401).json({ error: 'Ungültige E-Mail oder Passwort' });
    if (!verifyPassword(password, user.password_hash)) return res.status(401).json({ error: 'Ungültige E-Mail oder Passwort' });

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('sessions').insert({ token, user_id: user.id, user_role: role, expires_at: expiresAt });

    let fullUser = null;
    if (role === 'school') {
      const { data } = await supabase.from('schools')
        .select('id, name, admin_name, email, phone, address, verified').eq('id', user.id).single();
      const { data: sub } = await supabase.from('subscriptions').select('*').eq('school_id', user.id).single();
      fullUser = data;
      fullUser.subscription = sub;
      fullUser.role = 'school';
    } else if (role === 'instructor') {
      const { data } = await supabase.from('instructors')
        .select('id, name, email, phone, school_id, verified').eq('id', user.id).single();
      fullUser = data;
      fullUser.role = 'instructor';
    } else {
      const { data } = await supabase.from('students')
        .select('id, name, email, phone, birthdate, address, license_class, school_id, status, verified').eq('id', user.id).single();
      fullUser = data;
      fullUser.role = 'student';
    }

    res.json({ token, user: fullUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { role, firstName, lastName, email, password, schoolName, schoolAddress, inviteCode } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
    }

    // Check if email exists in any table
    const { data: e1 } = await supabase.from('schools').select('id').eq('email', email).maybeSingle();
    const { data: e2 } = await supabase.from('instructors').select('id').eq('email', email).maybeSingle();
    const { data: e3 } = await supabase.from('students').select('id').eq('email', email).maybeSingle();
    if (e1 || e2 || e3) return res.status(409).json({ error: 'E-Mail ist bereits registriert' });

    const fullName = firstName + ' ' + lastName;
    const pwHash = hashPassword(password);

    if (role === 'school') {
      const id = generateId();
      await supabase.from('schools').insert({
        id, name: schoolName || ('Fahrschule ' + lastName),
        admin_name: fullName, email, password_hash: pwHash,
        address: schoolAddress || '', verified: 0
      });
      await supabase.from('subscriptions').insert({ id: generateId(), school_id: id });

      // Send verification email
      const vCode = generateCode();
      const vToken = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await supabase.from('verification_codes').insert([
        { id: generateId(), user_id: id, user_role: 'school', email, code: vCode, type: 'email_verify', expires_at: expiresAt },
        { id: generateId(), user_id: id, user_role: 'school', email, code: vToken, type: 'email_verify', expires_at: expiresAt }
      ]);
      await sendVerificationEmail(email, fullName, vCode, vToken, id, 'school');

      return res.json({ success: true, userId: id, role: 'school' });
    }

    if (role === 'instructor') {
      if (!inviteCode) return res.status(400).json({ error: 'Fahrschul-Code erforderlich' });
      const { data: code } = await supabase.from('invite_codes')
        .select('*').eq('code', inviteCode).eq('type', 'instructor').eq('status', 'offen').maybeSingle();
      if (!code) return res.status(400).json({ error: 'Ungültiger oder bereits verwendeter Code' });

      const id = generateId();
      await supabase.from('instructors').insert({
        id, name: fullName, email, password_hash: pwHash, school_id: code.school_id, verified: 0
      });
      await supabase.from('invite_codes').update({
        status: 'verwendet', used_by: fullName, used_by_id: id
      }).eq('id', code.id);

      // Auto-Hochbuchung der Stripe-Subscription wenn alle bezahlten Plaetze nun belegt sind
      try {
        if (stripe) {
          const { data: subRow } = await supabase.from('subscriptions')
            .select('stripe_subscription_id').eq('school_id', code.school_id).maybeSingle();
          if (subRow && subRow.stripe_subscription_id) {
            const stripeSub = await stripe.subscriptions.retrieve(subRow.stripe_subscription_id);
            if (stripeSub && (stripeSub.status === 'active' || stripeSub.status === 'trialing')) {
              const currentQty = stripeSub.items.data[0].quantity || 0;
              const { count: usedNow } = await supabase.from('invite_codes')
                .select('id', { count: 'exact', head: true })
                .eq('school_id', code.school_id)
                .eq('type', 'instructor')
                .eq('status', 'verwendet');
              if ((usedNow || 0) > currentQty) {
                const itemId = stripeSub.items.data[0].id;
                await stripe.subscriptions.update(subRow.stripe_subscription_id, {
                  items: [{ id: itemId, quantity: usedNow }],
                  proration_behavior: 'create_prorations'
                });
                console.log('[Auto-Quantity] School ' + code.school_id + ' Subscription auf ' + usedNow + ' Plaetze hochgebucht');
              }
            }
          }
        }
      } catch (qtyErr) {
        console.error('[Auto-Quantity Error] ' + qtyErr.message);
        // Nicht blockierend: Code-Einloesung war erfolgreich
      }

      // Send verification email
      const vCode = generateCode();
      const vToken = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await supabase.from('verification_codes').insert([
        { id: generateId(), user_id: id, user_role: 'instructor', email, code: vCode, type: 'email_verify', expires_at: expiresAt },
        { id: generateId(), user_id: id, user_role: 'instructor', email, code: vToken, type: 'email_verify', expires_at: expiresAt }
      ]);
      await sendVerificationEmail(email, fullName, vCode, vToken, id, 'instructor');

      return res.json({ success: true, userId: id, role: 'instructor' });
    }

    if (role === 'student') {
      if (!inviteCode) return res.status(400).json({ error: 'Einladungscode erforderlich' });
      const { data: code } = await supabase.from('invite_codes')
        .select('*').eq('code', inviteCode).eq('type', 'student').eq('status', 'offen').maybeSingle();
      if (!code) return res.status(400).json({ error: 'Ungültiger oder bereits verwendeter Code' });

      const id = generateId();
      await supabase.from('students').insert({
        id, name: fullName, email, password_hash: pwHash, school_id: code.school_id, verified: 0
      });
      await supabase.from('invite_codes').update({
        status: 'verwendet', used_by: fullName, used_by_id: id
      }).eq('id', code.id);

      // Send verification email
      const vCode = generateCode();
      const vToken = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await supabase.from('verification_codes').insert([
        { id: generateId(), user_id: id, user_role: 'student', email, code: vCode, type: 'email_verify', expires_at: expiresAt },
        { id: generateId(), user_id: id, user_role: 'student', email, code: vToken, type: 'email_verify', expires_at: expiresAt }
      ]);
      await sendVerificationEmail(email, fullName, vCode, vToken, id, 'student');

      return res.json({ success: true, userId: id, role: 'student' });
    }

    res.status(400).json({ error: 'Ungültige Rolle' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Verify email with real code
app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { userId, role, code } = req.body;
    if (!code || code.length < 6) return res.status(400).json({ error: 'Ungültiger Code' });

    // Code path: only accept 6-digit numeric codes via this endpoint (link uses /verify-link)
    if (code.length > 8) return res.status(400).json({ error: 'Ungültiger Code' });

    // Check verification code in database
    const { data: vc } = await supabase.from('verification_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code)
      .eq('type', 'email_verify')
      .eq('used', 0)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!vc) return res.status(400).json({ error: 'Ungültiger oder abgelaufener Code' });

    // Mark code as used
    await supabase.from('verification_codes').update({ used: 1 }).eq('id', vc.id);

    // Verify user
    const table = role === 'school' ? 'schools' : role === 'instructor' ? 'instructors' : 'students';
    await supabase.from(table).update({ verified: 1 }).eq('id', userId);

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('sessions').insert({ token, user_id: userId, user_role: role, expires_at: expiresAt });
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Verify email via link (GET — clicked from email)
app.get('/api/auth/verify-link', async (req, res) => {
  try {
    const { token, uid, role } = req.query;
    if (!token || !uid || !role) return res.status(400).json({ error: 'Ungültiger Verifizierungslink' });

    // Token is stored in code field — must be longer than 6 chars (the 6-digit code path)
    if (String(token).length < 20) return res.status(400).json({ error: 'Ungültiger Token' });

    const { data: vc } = await supabase.from('verification_codes')
      .select('*')
      .eq('user_id', uid)
      .eq('code', token)
      .eq('type', 'email_verify')
      .eq('used', 0)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!vc) return res.status(400).json({ error: 'Link ungültig oder abgelaufen' });

    // Mark all email_verify codes for this user as used (token + 6-digit code)
    await supabase.from('verification_codes')
      .update({ used: 1 })
      .eq('user_id', uid).eq('type', 'email_verify').eq('used', 0);

    // Verify user
    const table = role === 'school' ? 'schools' : role === 'instructor' ? 'instructors' : 'students';
    await supabase.from(table).update({ verified: 1 }).eq('id', uid);

    res.json({ success: true });
  } catch (err) {
    console.error('Verify-link error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Resend verification code
app.post('/api/auth/resend-code', async (req, res) => {
  try {
    const { userId, role, email } = req.body;
    if (!userId || !email) return res.status(400).json({ error: 'Fehlende Daten' });

    // Invalidate old codes
    await supabase.from('verification_codes')
      .update({ used: 1 })
      .eq('user_id', userId).eq('type', 'email_verify').eq('used', 0);

    // Get user name
    const table = role === 'school' ? 'schools' : role === 'instructor' ? 'instructors' : 'students';
    const nameField = role === 'school' ? 'admin_name' : 'name';
    const { data: user } = await supabase.from(table).select(nameField).eq('id', userId).single();
    const name = user ? (user.admin_name || user.name) : '';

    const vCode = generateCode();
    const vToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await supabase.from('verification_codes').insert([
      { id: generateId(), user_id: userId, user_role: role, email, code: vCode, type: 'email_verify', expires_at: expiresAt },
      { id: generateId(), user_id: userId, user_role: role, email, code: vToken, type: 'email_verify', expires_at: expiresAt }
    ]);
    await sendVerificationEmail(email, name, vCode, vToken, userId, role);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Change password (authenticated)
app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Alle Felder erforderlich' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });

    const tableMap = { school: 'schools', instructor: 'instructors', student: 'students' };
    const table = tableMap[req.user.role];
    if (!table) return res.status(400).json({ error: 'Ung\u00fcltige Rolle' });

    const { data: user } = await supabase.from(table).select('password_hash').eq('id', req.user.id).single();
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

    if (!verifyPassword(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
    }

    const newHash = hashPassword(newPassword);
    await supabase.from(table).update({ password_hash: newHash }).eq('id', req.user.id);

    res.json({ success: true });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Request password reset
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-Mail erforderlich' });

    // Find user in any table
    let user = null; let role = null; let name = '';
    const { data: s } = await supabase.from('schools').select('id, admin_name').eq('email', email).maybeSingle();
    if (s) { user = s; role = 'school'; name = s.admin_name; }
    if (!user) {
      const { data: i } = await supabase.from('instructors').select('id, name').eq('email', email).maybeSingle();
      if (i) { user = i; role = 'instructor'; name = i.name; }
    }
    if (!user) {
      const { data: st } = await supabase.from('students').select('id, name').eq('email', email).maybeSingle();
      if (st) { user = st; role = 'student'; name = st.name; }
    }

    // Always return success (don't reveal if email exists)
    if (!user) return res.json({ success: true });

    const vCode = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await supabase.from('verification_codes').insert({
      id: generateId(), user_id: user.id, user_role: role,
      email, code: vCode, type: 'password_reset', expires_at: expiresAt
    });
    await sendPasswordResetEmail(email, name, vCode);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Verify reset code and set new password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ error: 'Alle Felder erforderlich' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' });

    const { data: vc } = await supabase.from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('type', 'password_reset')
      .eq('used', 0)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!vc) return res.status(400).json({ error: 'Ungültiger oder abgelaufener Code' });

    // Mark code as used
    await supabase.from('verification_codes').update({ used: 1 }).eq('id', vc.id);

    // Update password
    const pwHash = hashPassword(newPassword);
    const table = vc.user_role === 'school' ? 'schools' : vc.user_role === 'instructor' ? 'instructors' : 'students';
    await supabase.from(table).update({ password_hash: pwHash }).eq('id', vc.user_id);

    // Invalidate all existing sessions for this user
    await supabase.from('sessions').delete().eq('user_id', vc.user_id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  await supabase.from('sessions').delete().eq('token', req.sessionToken);
  res.json({ success: true });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = req.user;
  if (user.role === 'school') {
    const { data: sub } = await supabase.from('subscriptions').select('*').eq('school_id', user.id).single();
    user.subscription = sub;
  }
  res.json(user);
});

// ============================================
// SCHOOL ROUTES
// ============================================

app.get('/api/school/dashboard', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur für Fahrschulen' });
    const schoolId = req.user.id;

    // New students this week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const mondayStr = monday.toISOString();

    // Alles parallel laden
    const [instRes, studRes, subRes, totalLessonsRes, newStudRes, recentLessonsRes] = await Promise.all([
      supabase.from('instructors').select('id, name, email, phone').eq('school_id', schoolId),
      supabase.from('students').select('id, name, email, license_class, status, created_at').eq('school_id', schoolId),
      supabase.from('subscriptions').select('*').eq('school_id', schoolId).single(),
      supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
      supabase.from('students').select('id, name, created_at').eq('school_id', schoolId).gte('created_at', mondayStr),
      supabase.from('lessons').select('*, students(name)').eq('school_id', schoolId).order('date', { ascending: false }).limit(5)
    ]);

    const recentLessons = recentLessonsRes.data || [];
    const recentLessonIds = recentLessons.map(l => l.id);
    let ratingsByLesson = {};
    if (recentLessonIds.length > 0) {
      const { data: ratings } = await supabase.from('skill_ratings')
        .select('lesson_id, skill_name, rating').in('lesson_id', recentLessonIds);
      (ratings || []).forEach(r => {
        if (!ratingsByLesson[r.lesson_id]) ratingsByLesson[r.lesson_id] = {};
        ratingsByLesson[r.lesson_id][r.skill_name] = r.rating;
      });
    }
    for (const l of recentLessons) {
      l.student_name = l.students?.name || '?';
      delete l.students;
      l.ratings = ratingsByLesson[l.id] || {};
    }

    res.json({
      instructors: instRes.data || [], students: studRes.data || [], subscription: subRes.data,
      stats: { totalLessons: totalLessonsRes.count || 0 },
      recentLessons,
      newStudentsThisWeek: newStudRes.data || []
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.get('/api/school/instructors', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur für Fahrschulen' });
    const schoolId = req.user.id;

    // Parallel: instructors + codes laden
    const [instRes, codesRes] = await Promise.all([
      supabase.from('instructors').select('id, name, email, phone').eq('school_id', schoolId),
      supabase.from('invite_codes').select('*').eq('school_id', schoolId).eq('type', 'instructor').order('created_at', { ascending: false })
    ]);
    const instructors = (instRes.data || []).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de', { sensitivity: 'base' }));

    // Bulk: alle student_instructors-Mappings in EINER Query (statt N)
    if (instructors.length > 0) {
      const instIds = instructors.map(i => i.id);
      const { data: mappings } = await supabase.from('student_instructors')
        .select('instructor_id, student_id').in('instructor_id', instIds);
      const countByInst = {};
      (mappings || []).forEach(m => {
        countByInst[m.instructor_id] = (countByInst[m.instructor_id] || 0) + 1;
      });
      instructors.forEach(inst => { inst.studentCount = countByInst[inst.id] || 0; });
    }

    res.json({ instructors, codes: codesRes.data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.get('/api/school/students', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur für Fahrschulen' });
    const schoolId = req.user.id;

    const { data: studentsData } = await supabase.from('students').select('*').eq('school_id', schoolId);
    const students = studentsData || [];
    if (students.length === 0) return res.json({ students: [] });

    const studentIds = students.map(s => s.id);

    // Alles in einem Rutsch parallel laden (statt 4 Queries pro Schüler)
    const [mappingsRes, lessonsRes, theoryRes, instructorsListRes] = await Promise.all([
      supabase.from('student_instructors').select('student_id, instructor_id').in('student_id', studentIds),
      supabase.from('lessons').select('id, student_id, date').in('student_id', studentIds).order('date', { ascending: false }),
      supabase.from('theory_attendance').select('id, student_id').in('student_id', studentIds).eq('is_present', true),
      supabase.from('instructors').select('id, name').eq('school_id', schoolId)
    ]);

    const instructorById = {};
    (instructorsListRes.data || []).forEach(i => { instructorById[i.id] = i; });

    // Instructor-Namen pro Schüler
    const instructorNamesByStud = {};
    (mappingsRes.data || []).forEach(m => {
      if (!instructorNamesByStud[m.student_id]) instructorNamesByStud[m.student_id] = [];
      const inst = instructorById[m.instructor_id];
      if (inst) instructorNamesByStud[m.student_id].push(inst.name);
    });

    // Lesson-Count + latest-lesson-ID pro Schüler
    const lessonCountByStud = {};
    const latestLessonByStud = {};
    (lessonsRes.data || []).forEach(l => {
      lessonCountByStud[l.student_id] = (lessonCountByStud[l.student_id] || 0) + 1;
      if (!latestLessonByStud[l.student_id]) latestLessonByStud[l.student_id] = l.id;
    });

    // Theory-Count pro Schüler
    const theoryCountByStud = {};
    (theoryRes.data || []).forEach(t => {
      theoryCountByStud[t.student_id] = (theoryCountByStud[t.student_id] || 0) + 1;
    });

    // Bulk: ratings für alle latest-lessons
    const latestLessonIds = Object.values(latestLessonByStud);
    const ratingsByLesson = {};
    if (latestLessonIds.length > 0) {
      const { data: ratings } = await supabase.from('skill_ratings')
        .select('lesson_id, rating').in('lesson_id', latestLessonIds);
      (ratings || []).forEach(r => {
        if (!ratingsByLesson[r.lesson_id]) ratingsByLesson[r.lesson_id] = [];
        ratingsByLesson[r.lesson_id].push(r.rating);
      });
    }

    // Daten zusammenführen
    for (const st of students) {
      const names = instructorNamesByStud[st.id] || [];
      st.instructor_name = names.length > 0 ? names.join(', ') : '—';
      st.lessonCount = lessonCountByStud[st.id] || 0;
      st.theoryCount = theoryCountByStud[st.id] || 0;
      const latestId = latestLessonByStud[st.id];
      if (latestId && ratingsByLesson[latestId]) {
        const rs = ratingsByLesson[latestId];
        st.avgSkill = rs.reduce((a, b) => a + b, 0) / rs.length;
      } else { st.avgSkill = 0; }
    }

    const { data: codes } = await supabase.from('invite_codes')
      .select('*').eq('school_id', req.user.id).eq('type', 'student')
      .order('created_at', { ascending: false });

    const sortedStudents = (students || []).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de', { sensitivity: 'base' }));
    res.json({ students: sortedStudents, codes: codes || [] });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.post('/api/school/codes', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur für Fahrschulen' });
    const { type } = req.body;
    if (!type || !['instructor', 'student'].includes(type)) return res.status(400).json({ error: 'Ungültiger Typ' });

    // Code-Limit in der Testphase: max 2 Fahrlehrer-Codes (Schueler unbegrenzt)
    if (type === 'instructor') {
      const { data: subRow } = await supabase.from('subscriptions').select('*').eq('school_id', req.user.id).single();
      const { data: schoolRow } = await supabase.from('schools').select('created_at').eq('id', req.user.id).single();
      const state = computeSubscriptionState(subRow, schoolRow ? schoolRow.created_at : null);
      if (state.status === 'trial') {
        const { count: instructorCodeCount } = await supabase.from('invite_codes')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', req.user.id)
          .eq('type', 'instructor');
        if ((instructorCodeCount || 0) >= 2) {
          return res.status(402).json({
            error: 'In der Testphase koennen maximal 2 Fahrlehrer-Codes erstellt werden. Bitte schliesse ein Abo ab, um weitere Fahrlehrer hinzuzufuegen.',
            code: 'TRIAL_INSTRUCTOR_LIMIT'
          });
        }
      }
    }

    const prefix = type === 'instructor' ? 'FL' : 'FS';
    const code = prefix + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    await supabase.from('invite_codes').insert({
      id: generateId(), code, school_id: req.user.id, type
    });
    res.json({ code, type, status: 'offen' });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ── Send invite code via email (school or instructor) ──
app.post('/api/invite-email', authMiddleware, async (req, res) => {
  try {
    const { email, code, type } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'E-Mail und Code erforderlich' });

    // Determine sender context
    var schoolName = '';
    var senderName = '';
    var senderRole = req.user.role;

    if (req.user.role === 'school') {
      schoolName = req.user.name || 'Fahrschule';
      senderName = req.user.admin_name || req.user.name;
    } else if (req.user.role === 'instructor') {
      senderName = req.user.name || 'Fahrlehrer';
      // Get school name from instructor's school
      const { data: school } = await supabase.from('schools')
        .select('name').eq('id', req.user.school_id).single();
      schoolName = school ? school.name : 'Fahrschule';
    } else {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    var result = await sendInviteEmail({
      to: email,
      code: code,
      type: type || 'student',
      schoolName: schoolName,
      senderName: senderName,
      senderRole: senderRole
    });

    if (result.success) {
      res.json({ success: true, message: 'Einladung gesendet' });
    } else {
      res.status(500).json({ error: 'E-Mail konnte nicht gesendet werden: ' + (result.error || 'Unbekannter Fehler') });
    }
  } catch (err) {
    console.error('Invite email error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.get('/api/school/subscription', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur für Fahrschulen' });
    const { data: sub } = await supabase.from('subscriptions').select('*').eq('school_id', req.user.id).single();
    const { count: usedSeats } = await supabase.from('students')
      .select('id', { count: 'exact', head: true }).eq('school_id', req.user.id);
    res.json({ ...sub, usedSeats: usedSeats || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ============================================
// INSTRUCTOR ROUTES
// ============================================

app.get('/api/instructor/dashboard', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'instructor') return res.status(403).json({ error: 'Nur für Fahrlehrer' });
    const instId = req.user.id;

    const { data: studentLinks } = await supabase.from('student_instructors')
      .select('students(id, name, license_class, status)')
      .eq('instructor_id', instId);
    const students = (studentLinks || []).map(sl => sl.students).filter(Boolean);

    const { data: allLessons } = await supabase.from('lessons')
      .select('*, students(name)')
      .eq('instructor_id', instId)
      .order('date', { ascending: false });

    for (const l of (allLessons || [])) {
      l.student_name = l.students?.name || '?';
      delete l.students;
      const { data: ratings } = await supabase.from('skill_ratings')
        .select('skill_name, rating').eq('lesson_id', l.id);
      l.ratings = {};
      (ratings || []).forEach(r => { l.ratings[r.skill_name] = r.rating; });
    }

    const { data: school } = await supabase.from('schools')
      .select('id, name').eq('id', req.user.school_id).single();
    const { data: sub } = await supabase.from('subscriptions')
      .select('*').eq('school_id', req.user.school_id).single();
    const isExpired = sub ? (new Date() > new Date(sub.trial_end) && !sub.is_active) : false;

    res.json({ students, lessons: allLessons || [], school, subscription: sub, isExpired });
  } catch (err) {
    console.error('Instructor dashboard error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.get('/api/instructor/school-students', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'instructor') return res.status(403).json({ error: 'Nur für Fahrlehrer' });
    const { data: students } = await supabase.from('students')
      .select('id, name, license_class, status')
      .eq('school_id', req.user.school_id).eq('status', 'active');
    res.json(students || []);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.get('/api/instructor/students', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'instructor') return res.status(403).json({ error: 'Nur für Fahrlehrer' });

    const { data: links } = await supabase.from('student_instructors')
      .select('students(*)').eq('instructor_id', req.user.id);
    const students = (links || []).map(l => l.students).filter(Boolean);

    for (const st of students) {
      const { count } = await supabase.from('lessons')
        .select('id', { count: 'exact', head: true }).eq('student_id', st.id);
      st.lessonCount = count || 0;

      if (st.lessonCount > 0) {
        const { data: latest } = await supabase.from('lessons')
          .select('id').eq('student_id', st.id).order('date', { ascending: false }).limit(1);
        if (latest && latest[0]) {
          const { data: ratings } = await supabase.from('skill_ratings')
            .select('rating').eq('lesson_id', latest[0].id);
          let sum = 0;
          (ratings || []).forEach(r => sum += r.rating);
          st.avgSkill = ratings && ratings.length > 0 ? sum / ratings.length : 0;
        } else { st.avgSkill = 0; }
      } else { st.avgSkill = 0; }
    }

    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.get('/api/instructor/profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'instructor') return res.status(403).json({ error: 'Nur für Fahrlehrer' });
    const { data: school } = await supabase.from('schools')
      .select('name').eq('id', req.user.school_id).single();
    res.json({ ...req.user, schoolName: school ? school.name : '—' });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.put('/api/instructor/profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'instructor') return res.status(403).json({ error: 'Nur für Fahrlehrer' });
    const { name, email, phone } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    await supabase.from('instructors').update(updates).eq('id', req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ============================================
// STUDENT ROUTES
// ============================================

app.get('/api/student/overview', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Nur für Fahrschüler' });
    const stuId = req.user.id;

    // Parallelisiere alle unabhängigen Queries
    const [
      lessonsRes,
      scheduledRes,
      instructors,
      schoolRes,
      subRes
    ] = await Promise.all([
      supabase.from('lessons').select('*, instructors(name)').eq('student_id', stuId).order('date', { ascending: false }),
      supabase.from('scheduled_lessons').select('*, instructors(name)').eq('student_id', stuId).order('date', { ascending: true }),
      getStudentInstructors(stuId),
      supabase.from('schools').select('id, name').eq('id', req.user.school_id).single(),
      supabase.from('subscriptions').select('*').eq('school_id', req.user.school_id).single()
    ]);

    const lessons = lessonsRes.data || [];
    const scheduled = scheduledRes.data || [];
    const school = schoolRes.data;
    const sub = subRes.data;

    // Bulk-load ratings + images für ALLE Lessons in je EINER Query (statt N+N)
    const lessonIds = lessons.map(l => l.id);
    let ratingsByLesson = {};
    let imagesByLesson = {};
    if (lessonIds.length > 0) {
      const [ratingsRes, imagesRes] = await Promise.all([
        supabase.from('skill_ratings').select('lesson_id, skill_name, rating').in('lesson_id', lessonIds),
        supabase.from('lesson_images').select('id, filename, lesson_id').in('lesson_id', lessonIds)
      ]);
      (ratingsRes.data || []).forEach(r => {
        if (!ratingsByLesson[r.lesson_id]) ratingsByLesson[r.lesson_id] = {};
        ratingsByLesson[r.lesson_id][r.skill_name] = r.rating;
      });
      (imagesRes.data || []).forEach(img => {
        if (!imagesByLesson[img.lesson_id]) imagesByLesson[img.lesson_id] = [];
        imagesByLesson[img.lesson_id].push({ id: img.id, filename: img.filename });
      });
    }
    for (const l of lessons) {
      l.instructor_name = l.instructors?.name || '?';
      delete l.instructors;
      l.ratings = ratingsByLesson[l.id] || {};
      l.images = imagesByLesson[l.id] || [];
    }
    for (const s of scheduled) {
      s.instructor_name = s.instructors?.name || '?';
      delete s.instructors;
    }

    const instructorNames = (instructors || []).map(i => i.name).join(', ') || '—';
    const isExpired = sub ? (new Date() > new Date(sub.trial_end) && !sub.is_active) : false;

    res.json({
      lessons,
      scheduledLessons: scheduled,
      instructorName: instructorNames,
      instructors: instructors || [],
      school,
      isExpired
    });
  } catch (err) {
    console.error('[student/overview] error:', err.message);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.put('/api/student/profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Nur für Fahrschüler' });
    const { email, phone, birthdate, address } = req.body;
    const updates = {};
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (birthdate) updates.birthdate = birthdate;
    if (address) updates.address = address;
    await supabase.from('students').update(updates).eq('id', req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ============================================
// LESSON ROUTES
// ============================================

app.get('/api/lessons/:studentId', authMiddleware, async (req, res) => {
  try {
    const { data: lessons } = await supabase.from('lessons')
      .select('*').eq('student_id', req.params.studentId)
      .order('date', { ascending: false });

    const list = lessons || [];
    const lessonIds = list.map(l => l.id);
    let ratingsByLesson = {};
    if (lessonIds.length > 0) {
      const { data: ratings } = await supabase.from('skill_ratings')
        .select('lesson_id, skill_name, rating').in('lesson_id', lessonIds);
      (ratings || []).forEach(r => {
        if (!ratingsByLesson[r.lesson_id]) ratingsByLesson[r.lesson_id] = {};
        ratingsByLesson[r.lesson_id][r.skill_name] = r.rating;
      });
    }
    for (const l of list) {
      l.ratings = ratingsByLesson[l.id] || {};
    }
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.get('/api/lesson/:id', authMiddleware, async (req, res) => {
  try {
    const { data: lesson } = await supabase.from('lessons')
      .select('*').eq('id', req.params.id).single();
    if (!lesson) return res.status(404).json({ error: 'Fahrstunde nicht gefunden' });

    const { data: ratings } = await supabase.from('skill_ratings')
      .select('skill_name, rating').eq('lesson_id', lesson.id);
    lesson.ratings = {};
    (ratings || []).forEach(r => { lesson.ratings[r.skill_name] = r.rating; });

    const { data: student } = await supabase.from('students')
      .select('name').eq('id', lesson.student_id).single();
    lesson.studentName = student ? student.name : '?';

    const { data: images } = await supabase.from('lesson_images')
      .select('id, filename, data').eq('lesson_id', lesson.id);
    lesson.images = images || [];

    const { data: route } = await supabase.from('lesson_routes')
      .select('*').eq('lesson_id', lesson.id).maybeSingle();
    if (route) {
      lesson.route = {
        points: JSON.parse(route.route_data),
        markers: JSON.parse(route.markers || '[]'),
        distanceKm: route.distance_km,
        avgSpeedKmh: route.avg_speed_kmh
      };
    }

    res.json(lesson);
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.post('/api/lessons', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'instructor') return res.status(403).json({ error: 'Nur Fahrlehrer können Fahrstunden erstellen' });
    const { studentId, type, duration, notes, ratings, licenseClass, date, images } = req.body;

    if (!type || !duration) return res.status(400).json({ error: 'Pflichtfelder fehlen' });

    var schoolId = req.user.school_id;
    if (studentId) {
      const { data: student } = await supabase.from('students')
        .select('school_id').eq('id', studentId).eq('school_id', req.user.school_id).single();
      if (!student) return res.status(403).json({ error: 'Schüler nicht in dieser Fahrschule' });
      schoolId = student.school_id;
      await linkStudentInstructor(studentId, req.user.id);
    }

    const id = generateId();
    const lessonDate = date || new Date().toISOString().split('T')[0];

    await supabase.from('lessons').insert({
      id, student_id: studentId || null, instructor_id: req.user.id, school_id: schoolId,
      date: lessonDate, type, duration, notes: notes || '', license_class: licenseClass || 'B'
    });

    if (studentId && ratings && typeof ratings === 'object') {
      const ratingRows = Object.keys(ratings).map(skill => ({
        id: generateId(), lesson_id: id, student_id: studentId,
        skill_name: skill, rating: ratings[skill]
      }));
      if (ratingRows.length > 0) await supabase.from('skill_ratings').insert(ratingRows);
    }

    if (images && Array.isArray(images)) {
      const imageRows = images.map(img => ({
        id: generateId(), lesson_id: id,
        filename: img.filename || 'bild.jpg', data: img.data
      }));
      if (imageRows.length > 0) await supabase.from('lesson_images').insert(imageRows);
    }

    const { routeData, markers, distanceKm, avgSpeedKmh } = req.body;
    if (routeData && Array.isArray(routeData) && routeData.length > 0) {
      await supabase.from('lesson_routes').insert({
        id: generateId(), lesson_id: id,
        route_data: JSON.stringify(routeData), markers: JSON.stringify(markers || []),
        distance_km: distanceKm || 0, avg_speed_kmh: avgSpeedKmh || 0
      });
    }

    // ── BUCHHALTUNG: Auto-Soll-Position erzeugen wenn passendes Template existiert ──
    if (studentId) {
      try {
        await autoCreateChargeFromLesson({
          schoolId: schoolId, studentId: studentId, lessonId: id,
          lessonType: type, lessonDate: lessonDate,
          createdByRole: 'instructor', createdById: req.user.id
        });
      } catch (chargeErr) {
        // Buchhaltungs-Fehler darf Fahrstunden-Speicherung nicht blockieren
        console.warn('[Auto-Charge] Konnte Soll-Position nicht erzeugen:', chargeErr.message);
      }
    }

    res.json({ id, success: true });
  } catch (err) {
    console.error('Create lesson error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.put('/api/lessons/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'instructor') return res.status(403).json({ error: 'Nur Fahrlehrer können Fahrstunden bearbeiten' });
    const { data: lesson } = await supabase.from('lessons')
      .select('*').eq('id', req.params.id).eq('instructor_id', req.user.id).single();
    if (!lesson) return res.status(404).json({ error: 'Fahrstunde nicht gefunden' });

    const { type, notes, ratings, images } = req.body;
    const updates = {};
    if (type) updates.type = type;
    if (notes !== undefined) updates.notes = notes;
    if (Object.keys(updates).length > 0) {
      await supabase.from('lessons').update(updates).eq('id', req.params.id);
    }

    if (ratings && typeof ratings === 'object') {
      await supabase.from('skill_ratings').delete().eq('lesson_id', req.params.id);
      const ratingRows = Object.keys(ratings).map(skill => ({
        id: generateId(), lesson_id: req.params.id, student_id: lesson.student_id,
        skill_name: skill, rating: ratings[skill]
      }));
      if (ratingRows.length > 0) await supabase.from('skill_ratings').insert(ratingRows);
    }

    if (images && Array.isArray(images)) {
      const imageRows = images.map(img => ({
        id: generateId(), lesson_id: req.params.id,
        filename: img.filename || 'bild.jpg', data: img.data
      }));
      if (imageRows.length > 0) await supabase.from('lesson_images').insert(imageRows);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.delete('/api/lesson-image/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'instructor') return res.status(403).json({ error: 'Nur für Fahrlehrer' });
    await supabase.from('lesson_images').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.delete('/api/lessons/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'instructor') return res.status(403).json({ error: 'Nur Fahrlehrer können Fahrstunden löschen' });
    const { data: lesson } = await supabase.from('lessons')
      .select('*').eq('id', req.params.id).eq('instructor_id', req.user.id).single();
    if (!lesson) return res.status(404).json({ error: 'Fahrstunde nicht gefunden' });

    await supabase.from('lesson_images').delete().eq('lesson_id', req.params.id);
    await supabase.from('lesson_routes').delete().eq('lesson_id', req.params.id);
    await supabase.from('skill_ratings').delete().eq('lesson_id', req.params.id);
    await supabase.from('lessons').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.get('/api/student-detail/:id', authMiddleware, async (req, res) => {
  try {
    const { data: student } = await supabase.from('students')
      .select('*').eq('id', req.params.id).single();
    if (!student) return res.status(404).json({ error: 'Schüler nicht gefunden' });

    const userSchoolId = req.user.school_id || req.user.id;
    if (student.school_id !== userSchoolId && req.user.id !== userSchoolId) {
      return res.status(403).json({ error: 'Kein Zugriff' });
    }

    const [lessonsRes, instructors] = await Promise.all([
      supabase.from('lessons').select('*, instructors(name)').eq('student_id', student.id).order('date', { ascending: false }),
      getStudentInstructors(student.id)
    ]);
    const lessons = lessonsRes.data || [];
    const lessonIds = lessons.map(l => l.id);
    let ratingsByLesson = {};
    let imagesByLesson = {};
    if (lessonIds.length > 0) {
      const [ratingsRes, imagesRes] = await Promise.all([
        supabase.from('skill_ratings').select('lesson_id, skill_name, rating').in('lesson_id', lessonIds),
        supabase.from('lesson_images').select('id, filename, lesson_id').in('lesson_id', lessonIds)
      ]);
      (ratingsRes.data || []).forEach(r => {
        if (!ratingsByLesson[r.lesson_id]) ratingsByLesson[r.lesson_id] = {};
        ratingsByLesson[r.lesson_id][r.skill_name] = r.rating;
      });
      (imagesRes.data || []).forEach(img => {
        if (!imagesByLesson[img.lesson_id]) imagesByLesson[img.lesson_id] = [];
        imagesByLesson[img.lesson_id].push({ id: img.id, filename: img.filename });
      });
    }
    for (const l of lessons) {
      l.instructor_name = l.instructors?.name || '?';
      delete l.instructors;
      l.ratings = ratingsByLesson[l.id] || {};
      l.images = imagesByLesson[l.id] || [];
    }

    const instructorNames = (instructors || []).map(i => i.name).join(', ') || '—';

    res.json({ student, lessons, instructorName: instructorNames, instructors: instructors || [] });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.get('/api/share-student/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'instructor') return res.status(403).json({ error: 'Nur für Fahrlehrer' });
    const { data: student } = await supabase.from('students')
      .select('*').eq('id', req.params.id).single();
    if (!student) return res.status(404).json({ error: 'Schüler nicht gefunden' });

    const { data: otherInstructors } = await supabase.from('instructors')
      .select('id, name, email')
      .eq('school_id', req.user.school_id)
      .neq('id', req.user.id);

    res.json({ student, otherInstructors: otherInstructors || [] });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ============================================
// TIME BLOCKS (Zeitsperren) CRUD — must be before /api/schedule/:id routes
// ============================================
app.get('/api/schedule/blocks', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Kein Zugriff' });
    const { weekStart, weekEnd, instructorId } = req.query;
    if (!weekStart || !weekEnd) return res.status(400).json({ error: 'weekStart und weekEnd erforderlich' });

    let schoolId;
    let filterInstructorId = instructorId;
    if (req.user.role === 'school') {
      schoolId = req.user.id;
    } else {
      schoolId = req.user.school_id;
      filterInstructorId = filterInstructorId || req.user.id;
    }

    let query = supabase.from('scheduled_lessons')
      .select('*, instructors(name)')
      .eq('school_id', schoolId)
      .eq('type', 'Zeitsperre')
      .gte('date', weekStart)
      .lte('date', weekEnd);
    if (filterInstructorId) query = query.eq('instructor_id', filterInstructorId);
    query = query.order('date').order('start_time');
    const { data: blocks } = await query;

    for (const b of (blocks || [])) {
      b.instructor_name = b.instructors?.name || null;
      delete b.instructors;
    }
    res.json({ blocks: blocks || [] });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.post('/api/schedule/blocks', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Kein Zugriff' });
    const { instructorId, date, endDate, startTime, endTime, reason, notes, allDay } = req.body;
    if (!date || !startTime || !endTime) return res.status(400).json({ error: 'Datum, Start- und Endzeit erforderlich' });

    let targetInstructorId = instructorId;
    let schoolId;
    if (req.user.role === 'instructor') {
      targetInstructorId = req.user.id;
      schoolId = req.user.school_id;
    } else if (req.user.role === 'school') {
      if (!targetInstructorId) return res.status(400).json({ error: 'Fahrlehrer-ID erforderlich' });
      schoolId = req.user.id;
    }

    // Build list of dates between date and endDate (inclusive)
    const dates = [];
    const startD = new Date(date + 'T00:00:00');
    const endD = endDate ? new Date(endDate + 'T00:00:00') : startD;
    if (endD < startD) return res.status(400).json({ error: 'Bis-Datum darf nicht vor Von-Datum liegen' });
    // Cap to 90 days to prevent abuse
    const dayMs = 24 * 60 * 60 * 1000;
    const span = Math.round((endD - startD) / dayMs) + 1;
    if (span > 90) return res.status(400).json({ error: 'Maximaler Sperr-Zeitraum: 90 Tage' });
    for (let i = 0; i < span; i++) {
      const d = new Date(startD);
      d.setDate(d.getDate() + i);
      dates.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
    }

    // Check overlaps for the entire range in one query
    const { data: overlaps } = await supabase.from('scheduled_lessons')
      .select('id, date, start_time, end_time')
      .eq('instructor_id', targetInstructorId)
      .in('date', dates)
      .lt('start_time', endTime)
      .gt('end_time', startTime);
    if (overlaps && overlaps.length > 0) {
      const conflictDates = [...new Set(overlaps.map(o => o.date))].sort().slice(0, 3).join(', ');
      return res.status(409).json({ error: 'Zeitüberschneidung am ' + conflictDates + (overlaps.length > 3 ? ' (und weitere)' : '') });
    }

    // Build group ID and notes prefix
    const groupId = generateId();
    const reasonStr = reason ? String(reason).trim().slice(0, 40) : '';
    let metaPrefix = '[group:' + groupId + ']';
    if (reasonStr) metaPrefix += '[reason:' + reasonStr + ']';
    const fullNotes = metaPrefix + (notes ? ' ' + String(notes).slice(0, 500) : '');

    const rows = dates.map(d => ({
      id: generateId(),
      instructor_id: targetInstructorId, school_id: schoolId,
      student_id: null, date: d, start_time: startTime, end_time: endTime,
      type: 'Zeitsperre', license_class: null, status: 'bestätigt',
      notes: fullNotes, vehicle_id: null,
      created_by_role: req.user.role, created_by_id: req.user.id
    }));
    await supabase.from('scheduled_lessons').insert(rows);

    // Notify admin when instructor creates a time block
    if (req.user.role === 'instructor' && schoolId) {
      let msg;
      if (dates.length === 1) {
        const dayStr = new Date(date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
        msg = req.user.name + ' hat eine Zeitsperre am ' + dayStr + ' (' + startTime + '–' + endTime + ')' + (reasonStr ? ' — ' + reasonStr : '') + ' erstellt';
      } else {
        const fromStr = new Date(dates[0]).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
        const toStr = new Date(dates[dates.length - 1]).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
        msg = req.user.name + ' hat eine Zeitsperre vom ' + fromStr + ' bis ' + toStr + ' (' + dates.length + ' Tage)' + (reasonStr ? ' — ' + reasonStr : '') + ' erstellt';
      }
      await createNotification(schoolId, 'school', 'timeblock_created',
        'Neue Zeitsperre', msg, rows[0].id);
    }

    res.json({ id: rows[0].id, groupId: groupId, count: rows.length, success: true });
  } catch (err) {
    console.error('Block create error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.delete('/api/schedule/blocks/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Kein Zugriff' });
    const deleteAll = req.query.deleteAll === '1' || req.query.deleteAll === 'true';
    const { data: block } = await supabase.from('scheduled_lessons')
      .select('*').eq('id', req.params.id).eq('type', 'Zeitsperre').single();
    if (!block) return res.status(404).json({ error: 'Zeitsperre nicht gefunden' });

    if (req.user.role === 'instructor' && block.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Kein Zugriff auf diese Zeitsperre' });
    }
    if (req.user.role === 'school' && block.school_id !== req.user.id) {
      return res.status(403).json({ error: 'Kein Zugriff auf diese Zeitsperre' });
    }

    // If deleteAll and block belongs to a group, delete all blocks in that group
    if (deleteAll && block.notes) {
      const groupMatch = String(block.notes).match(/\[group:([a-f0-9]+)\]/);
      if (groupMatch) {
        const groupId = groupMatch[1];
        await supabase.from('scheduled_lessons')
          .delete()
          .eq('type', 'Zeitsperre')
          .eq('instructor_id', block.instructor_id)
          .like('notes', '%[group:' + groupId + ']%');
        return res.json({ success: true, deletedGroup: true });
      }
    }

    await supabase.from('scheduled_lessons').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ============================================
// SCHEDULE ROUTES
// ============================================

app.get('/api/schedule', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Kein Zugriff' });

    const { weekStart, weekEnd, instructorId } = req.query;
    if (!weekStart || !weekEnd) return res.status(400).json({ error: 'weekStart und weekEnd erforderlich' });

    let schoolId;
    let filterInstructorId = instructorId;

    if (req.user.role === 'school') {
      schoolId = req.user.id;
    } else {
      schoolId = req.user.school_id;
      filterInstructorId = filterInstructorId || req.user.id;
    }

    let query = supabase.from('scheduled_lessons')
      .select('*, students(name, license_class), instructors(name), vehicles(brand, license_plate)')
      .eq('school_id', schoolId)
      .gte('date', weekStart)
      .lte('date', weekEnd);

    if (filterInstructorId) {
      query = query.eq('instructor_id', filterInstructorId);
    }

    query = query.order('date').order('start_time');
    const { data: slots } = await query;

    // Flatten joined data
    for (const s of (slots || [])) {
      s.student_name = s.students?.name || null;
      s.student_license_class = s.students?.license_class || null;
      s.instructor_name = s.instructors?.name || null;
      s.vehicle_brand = s.vehicles?.brand || null;
      s.vehicle_plate = s.vehicles?.license_plate || null;
      // Derive slot_type and confirmed from existing DB fields
      s.slot_type = s.type === 'Zeitsperre' ? 'block' : 'lesson';
      // Admin-created slots with status 'geplant' need instructor confirmation
      s.confirmed = !(s.status === 'geplant' && s.created_by_role === 'school');
      delete s.students;
      delete s.instructors;
      delete s.vehicles;
    }

    let instructors = [];
    if (req.user.role === 'school') {
      const { data } = await supabase.from('instructors')
        .select('id, name').eq('school_id', schoolId);
      instructors = data || [];
    }

    // Also include OPEN slot-offer slots so they appear as "pending" in the calendar
    try {
      let offerQuery = supabase.from('slot_offers')
        .select('id, instructor_id, vehicle_id, expires_at, status')
        .eq('school_id', schoolId)
        .eq('status', 'active');
      if (filterInstructorId) offerQuery = offerQuery.eq('instructor_id', filterInstructorId);
      const { data: activeOffers } = await offerQuery;
      const now = new Date();
      const validOfferIds = (activeOffers || [])
        .filter(o => !o.expires_at || new Date(o.expires_at) > now)
        .map(o => o.id);
      const offerById = {};
      (activeOffers || []).forEach(o => { offerById[o.id] = o; });

      if (validOfferIds.length > 0) {
        const { data: openSlots } = await supabase.from('slot_offer_slots')
          .select('id, offer_id, date, start_time, end_time, duration_min, status')
          .in('offer_id', validOfferIds)
          .eq('status', 'open')
          .gte('date', weekStart)
          .lte('date', weekEnd);
        // Load vehicle info for offers that have vehicles
        const vehicleIds = [...new Set((activeOffers || []).map(o => o.vehicle_id).filter(Boolean))];
        const vehicleById = {};
        if (vehicleIds.length > 0) {
          const { data: vehs } = await supabase.from('vehicles')
            .select('id, brand, license_plate').in('id', vehicleIds);
          (vehs || []).forEach(v => { vehicleById[v.id] = v; });
        }
        const instructorById = {};
        (instructors || []).forEach(i => { instructorById[i.id] = i; });
        (openSlots || []).forEach(os => {
          const offer = offerById[os.offer_id];
          if (!offer) return;
          const veh = offer.vehicle_id ? vehicleById[offer.vehicle_id] : null;
          const inst = instructorById[offer.instructor_id];
          slots.push({
            id: 'offer-' + os.id,
            offer_slot_id: os.id,
            offer_id: os.offer_id,
            instructor_id: offer.instructor_id,
            vehicle_id: offer.vehicle_id || null,
            date: os.date,
            start_time: os.start_time,
            end_time: os.end_time,
            type: 'Angebot',
            slot_type: 'offer',
            status: 'angeboten',
            confirmed: false,
            student_name: null,
            instructor_name: inst ? inst.name : null,
            vehicle_brand: veh ? veh.brand : null,
            vehicle_plate: veh ? veh.license_plate : null,
          });
        });
      }
    } catch (offerErr) {
      console.error('[Schedule] offer merge error:', offerErr.message);
    }

    res.json({ slots: slots || [], instructors });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.post('/api/schedule', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Kein Zugriff' });

    const { instructorId, studentId, date, startTime, endTime, type, licenseClass, notes, vehicleId } = req.body;
    if (!date || !startTime || !endTime) return res.status(400).json({ error: 'Datum, Start- und Endzeit erforderlich' });

    let targetInstructorId = instructorId;
    let schoolId;

    if (req.user.role === 'instructor') {
      targetInstructorId = req.user.id;
      schoolId = req.user.school_id;
    } else if (req.user.role === 'school') {
      if (!targetInstructorId) return res.status(400).json({ error: 'Fahrlehrer-ID erforderlich' });
      schoolId = req.user.id;
      const { data: inst } = await supabase.from('instructors')
        .select('id').eq('id', targetInstructorId).eq('school_id', schoolId).single();
      if (!inst) return res.status(403).json({ error: 'Fahrlehrer gehört nicht zu dieser Fahrschule' });
    }

    // Check overlap
    const { data: overlaps } = await supabase.from('scheduled_lessons')
      .select('id')
      .eq('instructor_id', targetInstructorId)
      .eq('date', date)
      .lt('start_time', endTime)
      .gt('end_time', startTime);

    if (overlaps && overlaps.length > 0) return res.status(409).json({ error: 'Zeitüberschneidung mit bestehendem Termin' });

    // 11-hour rest period check (§5 ArbZG)
    const prevDate = new Date(date); prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    const { data: prevSlots } = await supabase.from('scheduled_lessons')
      .select('end_time').eq('instructor_id', targetInstructorId).eq('date', prevDateStr)
      .order('end_time', { ascending: false }).limit(1);
    if (prevSlots && prevSlots.length > 0) {
      const prevEnd = prevSlots[0].end_time.split(':');
      const prevEndMin = parseInt(prevEnd[0]) * 60 + parseInt(prevEnd[1]);
      const newStartMin = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
      const restMinutes = (24 * 60 - prevEndMin) + newStartMin;
      if (restMinutes < 660) {
        const earliest = prevEndMin + 660 - 24*60;
        const eh = Math.floor(earliest/60); const em = earliest%60;
        return res.status(409).json({ error: '11-Stunden-Ruhezeit (§5 ArbZG) nicht eingehalten. Frühester Start: ' + String(eh).padStart(2,'0') + ':' + String(em).padStart(2,'0') });
      }
    }
    const nextDate = new Date(date); nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];
    const { data: nextSlots } = await supabase.from('scheduled_lessons')
      .select('start_time').eq('instructor_id', targetInstructorId).eq('date', nextDateStr)
      .order('start_time', { ascending: true }).limit(1);
    if (nextSlots && nextSlots.length > 0) {
      const thisEndMin = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
      const nextStartParts = nextSlots[0].start_time.split(':');
      const nextStartMin = parseInt(nextStartParts[0]) * 60 + parseInt(nextStartParts[1]);
      const restToNext = (24 * 60 - thisEndMin) + nextStartMin;
      if (restToNext < 660) {
        return res.status(409).json({ error: '11-Stunden-Ruhezeit (§5 ArbZG) zum nächsten Tag wird nicht eingehalten.' });
      }
    }

    const id = generateId();
    // Confirmation logic: instructor self-created = auto-confirmed, admin-created = needs confirmation
    let status;
    if (req.user.role === 'instructor') {
      status = studentId ? 'bestätigt' : 'offen';
    } else {
      // Admin/Büro creates for instructor → status 'geplant' (needs instructor confirmation)
      status = 'geplant';
    }

    const { error: insertErr } = await supabase.from('scheduled_lessons').insert({
      id, instructor_id: targetInstructorId, school_id: schoolId,
      student_id: studentId || null, date, start_time: startTime, end_time: endTime,
      type: type || 'Übungsfahrt', license_class: licenseClass || 'B',
      status, notes: notes || null,
      vehicle_id: vehicleId || null,
      created_by_role: req.user.role, created_by_id: req.user.id
    });
    if (insertErr) { console.error('[Schedule] Insert error:', insertErr.message); return res.status(500).json({ error: insertErr.message }); }

    if (req.user.role === 'school') {
      const dayStr = new Date(date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
      await createNotification(targetInstructorId, 'instructor', 'schedule_created',
        'Neuer Termin', `Büro hat einen Termin am ${dayStr} um ${startTime} erstellt`, id);
    }

    res.json({ id, status, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.put('/api/schedule/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Kein Zugriff' });

    const { data: slot } = await supabase.from('scheduled_lessons')
      .select('*').eq('id', req.params.id).single();
    if (!slot) return res.status(404).json({ error: 'Termin nicht gefunden' });

    if (req.user.role === 'instructor' && slot.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Kein Zugriff auf diesen Termin' });
    }
    if (req.user.role === 'school' && slot.school_id !== req.user.id) {
      return res.status(403).json({ error: 'Kein Zugriff auf diesen Termin' });
    }

    const { studentId, date, startTime, endTime, type, licenseClass, status, notes, vehicleId } = req.body;

    // Check overlap if time changed
    if ((date && date !== slot.date) || (startTime && startTime !== slot.start_time) || (endTime && endTime !== slot.end_time)) {
      const newDate = date || slot.date;
      const newStart = startTime || slot.start_time;
      const newEnd = endTime || slot.end_time;

      const { data: overlaps } = await supabase.from('scheduled_lessons')
        .select('id')
        .eq('instructor_id', slot.instructor_id)
        .eq('date', newDate)
        .neq('id', req.params.id)
        .lt('start_time', newEnd)
        .gt('end_time', newStart);

      if (overlaps && overlaps.length > 0) return res.status(409).json({ error: 'Zeitüberschneidung mit bestehendem Termin' });
    }

    let newStatus = status;
    if (!newStatus && studentId !== undefined) {
      newStatus = studentId ? 'geplant' : 'offen';
    }

    const updates = {};
    if (studentId !== undefined) updates.student_id = studentId || null;
    if (date) updates.date = date;
    if (startTime) updates.start_time = startTime;
    if (endTime) updates.end_time = endTime;
    if (type) updates.type = type;
    if (licenseClass) updates.license_class = licenseClass;
    if (newStatus) updates.status = newStatus;
    if (notes !== undefined) updates.notes = notes;
    if (vehicleId !== undefined) updates.vehicle_id = vehicleId || null;

    if (Object.keys(updates).length > 0) {
      await supabase.from('scheduled_lessons').update(updates).eq('id', req.params.id);
    }

    if (req.user.role === 'school' && slot.instructor_id !== req.user.id) {
      const dayStr = new Date(date || slot.date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
      await createNotification(slot.instructor_id, 'instructor', 'schedule_updated',
        'Termin geändert', `Termin am ${dayStr} um ${startTime || slot.start_time} wurde geändert`, req.params.id);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.delete('/api/schedule/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Kein Zugriff' });

    const { data: slot } = await supabase.from('scheduled_lessons')
      .select('*').eq('id', req.params.id).single();
    if (!slot) return res.status(404).json({ error: 'Termin nicht gefunden' });

    if (req.user.role === 'instructor' && slot.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Kein Zugriff auf diesen Termin' });
    }
    if (req.user.role === 'school' && slot.school_id !== req.user.id) {
      return res.status(403).json({ error: 'Kein Zugriff auf diesen Termin' });
    }

    await supabase.from('scheduled_lessons').delete().eq('id', req.params.id);

    if (req.user.role === 'school' && slot.instructor_id !== req.user.id) {
      const dayStr = new Date(slot.date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
      await createNotification(slot.instructor_id, 'instructor', 'schedule_deleted',
        'Termin gelöscht', `Termin am ${dayStr} um ${slot.start_time} wurde vom Büro gelöscht`, null);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.post('/api/schedule/:id/confirm', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Kein Zugriff' });

    const { data: slot } = await supabase.from('scheduled_lessons')
      .select('*').eq('id', req.params.id).single();
    if (!slot) return res.status(404).json({ error: 'Termin nicht gefunden' });

    // Update status to 'bestätigt'
    await supabase.from('scheduled_lessons')
      .update({ status: 'bestätigt' }).eq('id', req.params.id);

    const dayStr = new Date(slot.date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    if (req.user.role === 'school') {
      await createNotification(slot.instructor_id, 'instructor', 'schedule_confirmed',
        'Termin bestätigt', 'Termin am ' + dayStr + ' um ' + slot.start_time + ' wurde bestätigt', req.params.id);
    }
    if (req.user.role === 'instructor' && slot.status === 'geplant' && slot.created_by_role === 'school') {
      // Notify school that instructor confirmed
      const { data: inst } = await supabase.from('instructors').select('school_id, name').eq('id', req.user.id).single();
      if (inst) {
        await createNotification(inst.school_id, 'school', 'schedule_confirmed',
          'Termin bestätigt', inst.name + ' hat den Termin am ' + dayStr + ' um ' + slot.start_time + ' bestätigt', req.params.id);
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ============================================
// NOTIFICATION ROUTES
// ============================================

// Memory-Cache für Auto-Reminder-Checks — prüft max. 1x pro 10 Min. je User
const _reminderCheckCache = new Map();
async function runSchoolReminderChecks(userId) {
  const lastCheck = _reminderCheckCache.get(userId) || 0;
  if (Date.now() - lastCheck < 10 * 60 * 1000) return; // 10 Min TTL
  _reminderCheckCache.set(userId, Date.now());
  try {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const monthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Parallel: Vehicles + Tomorrow lessons laden
    const [vehiclesRes, tomorrowLessonsRes] = await Promise.all([
      supabase.from('vehicles').select('id, brand, license_plate, hu_au_date').eq('school_id', userId),
      supabase.from('scheduled_lessons').select('id, instructor_id, student_id, start_time, type, students(name)').eq('school_id', userId).eq('date', tomorrowStr)
    ]);
    const vehicles = vehiclesRes.data || [];
    const tomorrowLessons = tomorrowLessonsRes.data || [];

    // Alle potenziellen Reference-IDs sammeln
    const huRefs = [];
    vehicles.forEach(v => {
      if (!v.hu_au_date) return;
      const huDate = new Date(v.hu_au_date);
      if (huDate <= in30 && huDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) {
        huRefs.push({ ref: v.id + '_' + monthKey, v });
      }
    });
    const lessonRefs = tomorrowLessons.filter(l => l.instructor_id).map(l => ({
      ref: l.id + '_reminder_' + tomorrowStr, l
    }));

    // Bulk-Check: existieren diese references bereits?
    const allRefs = huRefs.map(r => r.ref).concat(lessonRefs.map(r => r.ref));
    let existingRefs = new Set();
    if (allRefs.length > 0) {
      const { data: existing } = await supabase.from('notifications')
        .select('reference_id').in('reference_id', allRefs);
      (existing || []).forEach(e => existingRefs.add(e.reference_id));
    }

    // Parallel: Nur fehlende Reminder erstellen
    const creates = [];
    huRefs.forEach(({ ref, v }) => {
      if (existingRefs.has(ref)) return;
      const huStr = new Date(v.hu_au_date).toLocaleDateString('de-DE');
      creates.push(createNotification(userId, 'school', 'hu_reminder',
        'HU/AU fällig: ' + (v.brand || '') + ' ' + (v.license_plate || ''),
        'HU/AU-Termin am ' + huStr + '. Bitte Werkstatttermin vereinbaren.', ref));
    });
    lessonRefs.forEach(({ ref, l }) => {
      if (existingRefs.has(ref)) return;
      const studentName = l.students ? l.students.name : 'Fahrschüler';
      creates.push(createNotification(l.instructor_id, 'instructor', 'lesson_reminder',
        'Fahrstunde morgen',
        l.type + ' mit ' + studentName + ' um ' + l.start_time, ref));
    });
    if (creates.length > 0) await Promise.all(creates);
  } catch (e) { /* ignore reminder errors */ }
}

app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    // Auto-Reminder: läuft async im Hintergrund, blockiert die Response NICHT
    if (req.user.role === 'school') {
      runSchoolReminderChecks(req.user.id).catch(() => {});
    }

    // Parallel: notifications + unread count
    const [notifsRes, unreadRes] = await Promise.all([
      supabase.from('notifications').select('*').eq('user_id', req.user.id).eq('user_role', req.user.role).order('created_at', { ascending: false }).limit(50),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', req.user.id).eq('user_role', req.user.role).eq('is_read', 0)
    ]);

    res.json({ notifications: notifsRes.data || [], unreadCount: unreadRes.count || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.put('/api/notifications/read', authMiddleware, async (req, res) => {
  try {
    const { notificationId } = req.body;
    if (notificationId) {
      await supabase.from('notifications')
        .update({ is_read: 1 }).eq('id', notificationId).eq('user_id', req.user.id);
    } else {
      await supabase.from('notifications')
        .update({ is_read: 1 }).eq('user_id', req.user.id).eq('user_role', req.user.role);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ============================================
// DSGVO CONSENT
// ============================================
app.post('/api/consent', authMiddleware, async (req, res) => {
  try {
    const { consentType } = req.body;
    await supabase.from('consents').insert({
      id: generateId(), user_id: req.user.id, user_role: req.user.role, consent_type: consentType
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ============================================
// FEEDBACK / SUPPORT
// ============================================
app.post('/api/feedback', authMiddleware, async (req, res) => {
  try {
    const { category, message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Nachricht erforderlich' });
    if (req.user.role !== 'instructor' && req.user.role !== 'school') {
      return res.status(403).json({ error: 'Nicht berechtigt' });
    }
    await supabase.from('feedback').insert({
      id: generateId(), user_id: req.user.id, user_role: req.user.role,
      user_name: req.user.name || req.user.admin_name || '',
      user_email: req.user.email, category: category || 'feedback', message: message.trim()
    });
    // Feedback per Mail an info@fahrdoc.app weiterleiten (Fehler nicht hart durchreichen)
    try {
      await sendFeedbackEmail({
        userName: req.user.name || req.user.admin_name || '',
        userEmail: req.user.email,
        userRole: req.user.role,
        category: category || 'feedback',
        message: message.trim()
      });
    } catch (mailErr) {
      console.error('[FEEDBACK] Mail-Versand fehlgeschlagen:', mailErr.message);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/feedback', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschulen' });
    const { data: rows } = await supabase.from('feedback')
      .select('*')
      .in('user_role', ['school', 'instructor'])
      .order('created_at', { ascending: false }).limit(100);
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// STRIPE: Config (publishable key for frontend)
// ============================================
app.get('/api/stripe/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    perSeat: true,
    plans: {
      classic: { priceId: process.env.STRIPE_PRICE_ID_CLASSIC || '', name: 'FahrDoc Classic', price: 29.99, currency: 'EUR', perSeat: true, unit: 'Fahrlehrer', features: ['Pro Fahrlehrer/Monat', 'Unbegrenzte Schüler', 'Kalender & Slot-Buchung', 'Schein-Verwaltung', 'PDF-Bescheinigungen', 'Email-Support'] },
      ki: { priceId: process.env.STRIPE_PRICE_ID_KI || '', name: 'FahrDoc KI', price: 39.99, currency: 'EUR', perSeat: true, unit: 'Fahrlehrer', features: ['Pro Fahrlehrer/Monat', 'Alles aus Classic', 'KI-Briefing vor jeder Fahrstunde', 'Automatische Lernfortschritt-Analyse', 'Unbegrenzte KI-Anfragen', 'Prioritäts-Support'] }
    }
  });
});

// ============================================
// STRIPE: Create Checkout Session
// ============================================
app.post('/api/stripe/create-checkout', authMiddleware, async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe nicht konfiguriert' });
  if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschulen können Abos verwalten' });

  try {
    const { plan, quantity } = req.body;
    var planName = plan === 'ki' ? 'ki' : 'classic';
    var priceId = planName === 'ki' ? process.env.STRIPE_PRICE_ID_KI : process.env.STRIPE_PRICE_ID_CLASSIC;
    if (!priceId) return res.status(500).json({ error: 'Tarif nicht konfiguriert. Bitte Admin kontaktieren.' });

    // Quantity validieren: mindestens so viele Plaetze wie bereits eingeloeste Fahrlehrer-Codes,
    // mindestens 1
    var requestedQty = parseInt(quantity, 10);
    if (!requestedQty || requestedQty < 1) requestedQty = 1;
    if (requestedQty > 100) requestedQty = 100; // sanity cap

    const { count: usedSeats } = await supabase.from('invite_codes')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', req.user.id)
      .eq('type', 'instructor')
      .eq('status', 'verwendet');
    const minSeats = Math.max(1, usedSeats || 0);
    if (requestedQty < minSeats) requestedQty = minSeats;

    // Check if school already has a Stripe customer
    const { data: existingSub } = await supabase.from('subscriptions')
      .select('stripe_customer_id').eq('school_id', req.user.id).single();

    let customerId = existingSub?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name || req.user.admin_name,
        metadata: { school_id: req.user.id, app: 'fahrdoc' }
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      // payment_method_types weglassen -> Stripe waehlt automatisch verfuegbare Methoden (Card, SEPA wenn aktiviert, etc.)
      line_items: [{ price: priceId, quantity: requestedQty, adjustable_quantity: { enabled: true, minimum: minSeats, maximum: 100 } }],
      subscription_data: {
        metadata: { school_id: req.user.id, plan: planName }
      },
      metadata: { school_id: req.user.id, plan: planName, seats: String(requestedQty) },
      success_url: `${req.protocol}://${req.get('host')}/?stripe=success`,
      cancel_url: `${req.protocol}://${req.get('host')}/?stripe=cancel`,
      locale: 'de',
      allow_promotion_codes: true
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe Checkout Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// STRIPE: Quantity aendern (Plaetze hinzufuegen/reduzieren)
// ============================================
app.post('/api/stripe/update-quantity', authMiddleware, async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe nicht konfiguriert' });
  if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschulen' });
  try {
    var newQty = parseInt(req.body && req.body.quantity, 10);
    if (!newQty || newQty < 1) return res.status(400).json({ error: 'Ungueltige Anzahl' });
    if (newQty > 100) return res.status(400).json({ error: 'Maximal 100 Plaetze' });

    // Mindestmenge = bereits eingeloeste Fahrlehrer-Codes
    const { count: usedSeats } = await supabase.from('invite_codes')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', req.user.id)
      .eq('type', 'instructor')
      .eq('status', 'verwendet');
    if (newQty < (usedSeats || 0)) {
      return res.status(400).json({ error: 'Mindestens ' + (usedSeats || 0) + ' Plaetze noetig (aktive Fahrlehrer). Bitte zuerst Fahrlehrer deaktivieren.' });
    }

    const { data: sub } = await supabase.from('subscriptions')
      .select('stripe_subscription_id').eq('school_id', req.user.id).single();
    if (!sub || !sub.stripe_subscription_id) return res.status(404).json({ error: 'Kein aktives Abo gefunden' });

    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const itemId = stripeSub.items.data[0].id;
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [{ id: itemId, quantity: newQty }],
      proration_behavior: 'create_prorations'
    });
    res.json({ success: true, quantity: newQty });
  } catch (err) {
    console.error('[Stripe Update Qty Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// STRIPE: Customer Portal (manage subscription)
// ============================================
app.post('/api/stripe/portal', authMiddleware, async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe nicht konfiguriert' });
  if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschulen' });

  try {
    const { data: sub } = await supabase.from('subscriptions')
      .select('stripe_customer_id').eq('school_id', req.user.id).single();
    if (!sub?.stripe_customer_id) return res.status(404).json({ error: 'Kein Abo gefunden' });

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${req.protocol}://${req.get('host')}/`
    });
    res.json({ url: portalSession.url });
  } catch (err) {
    console.error('[Stripe Portal Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// SUBSCRIPTION: Einheitlicher Status (Trial + Abo + Free + Lock)
// ============================================
app.get('/api/stripe/subscription', authMiddleware, async (req, res) => {
  // Erlaubt fuer school + instructor (Mitarbeiter sehen den Status der Schule)
  if (req.user.role === 'student') return res.status(403).json({ error: 'Nicht verfügbar' });

  try {
    const schoolId = req.user.role === 'school' ? req.user.id : req.user.school_id;
    const { data: sub } = await supabase.from('subscriptions')
      .select('*').eq('school_id', schoolId).maybeSingle();
    const { data: school } = await supabase.from('schools')
      .select('created_at, name').eq('id', schoolId).maybeSingle();

    // Stripe-Sync wenn nutzbar
    var seats = 0;
    var unitPrice = 0;
    if (stripe && sub && sub.stripe_subscription_id) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
        const priceId = stripeSub.items.data[0]?.price?.id;
        const detectedPlan = priceId === process.env.STRIPE_PRICE_ID_KI ? 'ki' : (priceId === process.env.STRIPE_PRICE_ID_CLASSIC ? 'classic' : sub.plan);
        seats = stripeSub.items.data[0]?.quantity || 0;
        unitPrice = (stripeSub.items.data[0]?.price?.unit_amount || 0) / 100;
        const updated = {
          status: stripeSub.status,
          plan: detectedPlan,
          current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: stripeSub.cancel_at_period_end,
          updated_at: new Date().toISOString()
        };
        await supabase.from('subscriptions').update(updated).eq('school_id', schoolId);
        Object.assign(sub, updated);
      } catch (e) { /* offline: cached */ }
    }

    // Eingeloeste Fahrlehrer-Codes (used seats)
    const { count: usedInstructorSeats } = await supabase.from('invite_codes')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('type', 'instructor')
      .eq('status', 'verwendet');

    const state = computeSubscriptionState(sub, school?.created_at);
    res.json({
      active: state.active,
      status: state.status,
      plan: state.plan,
      days_remaining: state.daysRemaining,
      lock_reason: state.lockReason,
      has_stripe: !!(sub && sub.stripe_subscription_id),
      cancel_at_period_end: sub?.cancel_at_period_end || false,
      current_period_end: sub?.current_period_end || null,
      trial_extended_until: sub?.trial_extended_until || null,
      free_subscription: !!(sub && sub.free_subscription),
      school_name: school?.name || '',
      seats: seats,
      used_instructor_seats: usedInstructorSeats || 0,
      unit_price: unitPrice,
      total_price: seats * unitPrice
    });
  } catch (err) {
    console.error('[Stripe Sub Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// SUPER-ADMIN: Schule-Liste
// ============================================
function isSuperAdmin(req) {
  return req.user && req.user.email && req.user.email.toLowerCase() === SUPER_ADMIN_EMAIL;
}

// SUPER-ADMIN: Statistik-Dashboard
app.get('/api/admin/stats', authMiddleware, async (req, res) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Keine Berechtigung' });
  try {
    const { data: schools } = await supabase.from('schools').select('id, created_at');
    const { data: subs } = await supabase.from('subscriptions').select('*');
    const subMap = {};
    (subs || []).forEach(function(s) { subMap[s.school_id] = s; });

    let mrr = 0;
    let activeStripe = 0;
    let activeClassic = 0;
    let activeKi = 0;
    let trialing = 0;
    let trialEndingSoon = 0; // <= 3 Tage
    let freeSubs = 0;
    let expired = 0;
    let cancellationsPending = 0;

    (schools || []).forEach(function(s) {
      const sub = subMap[s.id];
      const state = computeSubscriptionState(sub, s.created_at);
      if (state.status === 'active') {
        activeStripe++;
        if (state.plan === 'ki') { activeKi++; mrr += 39.99; }
        else { activeClassic++; mrr += 29.99; }
        if (sub && sub.cancel_at_period_end) cancellationsPending++;
      } else if (state.status === 'free') {
        freeSubs++;
      } else if (state.status === 'trial') {
        trialing++;
        if (state.daysRemaining !== null && state.daysRemaining <= 3) trialEndingSoon++;
      } else if (state.status === 'expired') {
        expired++;
      }
    });

    // KI-Briefings
    let aiTotal = 0;
    let aiToday = 0;
    let aiThisMonth = 0;
    try {
      const { count: total } = await supabase.from('ai_briefings').select('id', { count: 'exact', head: true });
      aiTotal = total || 0;
      const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
      const { count: today } = await supabase.from('ai_briefings').select('id', { count: 'exact', head: true }).gte('created_at', startToday.toISOString());
      aiToday = today || 0;
      const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);
      const { count: month } = await supabase.from('ai_briefings').select('id', { count: 'exact', head: true }).gte('created_at', startMonth.toISOString());
      aiThisMonth = month || 0;
    } catch (e) { console.warn('[Admin Stats] AI count failed:', e.message); }

    // Neue Schulen (letzte 30 Tage)
    let newSchools30d = 0;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    (schools || []).forEach(function(s) {
      if (s.created_at && new Date(s.created_at) >= cutoff) newSchools30d++;
    });

    res.json({
      schools_total: (schools || []).length,
      schools_new_30d: newSchools30d,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
      active_stripe: activeStripe,
      active_classic: activeClassic,
      active_ki: activeKi,
      cancellations_pending: cancellationsPending,
      trialing: trialing,
      trial_ending_soon: trialEndingSoon,
      free_subscriptions: freeSubs,
      expired: expired,
      ai_briefings_total: aiTotal,
      ai_briefings_today: aiToday,
      ai_briefings_this_month: aiThisMonth
    });
  } catch (err) {
    console.error('[Admin Stats Error]', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/schools', authMiddleware, async (req, res) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Keine Berechtigung' });
  try {
    const { data: schools } = await supabase.from('schools')
      .select('id, name, email, admin_name, created_at').order('created_at', { ascending: false });
    const { data: subs } = await supabase.from('subscriptions').select('*');
    const subMap = {};
    (subs || []).forEach(function(s){ subMap[s.school_id] = s; });
    const result = (schools || []).map(function(s){
      const sub = subMap[s.id];
      const state = computeSubscriptionState(sub, s.created_at);
      return {
        id: s.id, name: s.name, email: s.email, admin_name: s.admin_name, created_at: s.created_at,
        plan: state.plan, status: state.status, active: state.active, days_remaining: state.daysRemaining,
        trial_extended_until: sub?.trial_extended_until || null,
        free_subscription: !!(sub && sub.free_subscription),
        free_subscription_until: sub?.free_subscription_until || null,
        has_stripe: !!(sub && sub.stripe_subscription_id)
      };
    });
    res.json({ schools: result });
  } catch (err) {
    console.error('[Admin Schools Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// SUPER-ADMIN: Trial verlaengern
app.put('/api/admin/schools/:id/extend-trial', authMiddleware, async (req, res) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Keine Berechtigung' });
  try {
    const days = Math.max(1, parseInt(req.body.days) || 14);
    const schoolId = req.params.id;
    // Ensure subscription row exists
    const { data: existing } = await supabase.from('subscriptions').select('id, trial_extended_until').eq('school_id', schoolId).maybeSingle();
    const base = existing?.trial_extended_until ? new Date(existing.trial_extended_until) : new Date();
    const newEnd = new Date(Math.max(base.getTime(), Date.now()) + days * 86400000);
    if (existing) {
      await supabase.from('subscriptions').update({ trial_extended_until: newEnd.toISOString(), updated_at: new Date().toISOString() }).eq('school_id', schoolId);
    } else {
      await supabase.from('subscriptions').insert({ id: generateId(), school_id: schoolId, trial_extended_until: newEnd.toISOString() });
    }
    res.json({ success: true, trial_extended_until: newEnd.toISOString() });
  } catch (err) {
    console.error('[Admin Extend Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// SUPER-ADMIN: Gratis-Abo gewaehren / entziehen
app.put('/api/admin/schools/:id/free-subscription', authMiddleware, async (req, res) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Keine Berechtigung' });
  try {
    const schoolId = req.params.id;
    const enable = req.body.enable !== false;
    const days = req.body.days ? parseInt(req.body.days) : null;
    const plan = req.body.plan === 'classic' ? 'classic' : 'ki';
    const until = (enable && days) ? new Date(Date.now() + days * 86400000).toISOString() : null;
    const { data: existing } = await supabase.from('subscriptions').select('id').eq('school_id', schoolId).maybeSingle();
    const payload = {
      free_subscription: enable,
      free_subscription_until: until,
      plan: enable ? plan : null,
      updated_at: new Date().toISOString()
    };
    if (existing) {
      await supabase.from('subscriptions').update(payload).eq('school_id', schoolId);
    } else {
      payload.id = generateId();
      payload.school_id = schoolId;
      await supabase.from('subscriptions').insert(payload);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[Admin Free Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// KI-BRIEFING: Generiert Schueler-Briefing fuer naechste Fahrstunde (nur ki-Tarif)
// ============================================
app.post('/api/ai/briefing/:studentId', authMiddleware, async (req, res) => {
  if (!genAI) return res.status(503).json({ error: 'KI-Service nicht konfiguriert' });
  if (req.user.role !== 'school' && req.user.role !== 'instructor') {
    return res.status(403).json({ error: 'Nur für Fahrlehrer/Schule' });
  }
  try {
    const schoolId = req.user.role === 'school' ? req.user.id : req.user.school_id;

    // Plan-Check
    const { data: sub } = await supabase.from('subscriptions').select('*').eq('school_id', schoolId).maybeSingle();
    const { data: school } = await supabase.from('schools').select('created_at').eq('id', schoolId).maybeSingle();
    const state = computeSubscriptionState(sub, school?.created_at);
    if (!state.active) return res.status(402).json({ error: 'Testphase abgelaufen', lock: true });
    // Open-Beta: KI-Briefing fuer alle in aktiver Testphase freigeben (per ENV abschaltbar)
    const briefingOpenBeta = process.env.BRIEFING_OPEN_BETA === 'true';
    const briefingAllowed = state.plan === 'ki' || (briefingOpenBeta && state.status === 'trial');
    if (!briefingAllowed) return res.status(402).json({ error: 'KI-Briefing nur im FahrDoc KI Tarif verfügbar', upgrade: true });

    // Schueler-Daten laden
    const studentId = req.params.studentId;
    const { data: student } = await supabase.from('students')
      .select('id, name, license_class, school_id').eq('id', studentId).maybeSingle();
    if (!student || student.school_id !== schoolId) return res.status(404).json({ error: 'Schüler nicht gefunden' });

    // Letzte 10 durchgefuehrte Fahrstunden (eingetragene Lessons) mit Notizen + Bewertungen
    const { data: lessons } = await supabase.from('lessons')
      .select('id, date, type, duration, notes')
      .eq('student_id', studentId)
      .order('date', { ascending: false })
      .limit(10);

    if (!lessons || lessons.length === 0) {
      return res.json({ briefing: 'Noch keine abgeschlossenen Fahrstunden vorhanden. Beim ersten Termin bitte Grundlagen besprechen: Lenkrad, Pedalerie, Spiegel, erste Fahrt.', empty: true });
    }

    // Skill-Bewertungen je Fahrstunde laden (separate Tabelle)
    const lessonIds = lessons.map(function(l){ return l.id; });
    var ratingsByLesson = {};
    try {
      const { data: ratings } = await supabase.from('skill_ratings')
        .select('lesson_id, skill_name, rating')
        .in('lesson_id', lessonIds);
      (ratings || []).forEach(function(r){
        if (!ratingsByLesson[r.lesson_id]) ratingsByLesson[r.lesson_id] = [];
        ratingsByLesson[r.lesson_id].push(r.skill_name + ': ' + r.rating);
      });
    } catch(e){}

    // Prompt zusammenbauen
    var ctx = '';
    lessons.slice().reverse().forEach(function(l, i){
      ctx += '\nFahrstunde ' + (i+1) + ' (' + (l.date || '') + ', ' + (l.type || 'Standard') + ', ' + (l.duration || 45) + ' Min):';
      var rs = ratingsByLesson[l.id];
      if (rs && rs.length) ctx += '\n  Bewertungen: ' + rs.join('; ');
      if (l.notes) ctx += '\n  Notizen: ' + l.notes;
    });

    const prompt = 'Du bist Assistent für einen Fahrlehrer in Deutschland. Erstelle ein kurzes Briefing (max. 150 Wörter) für die nächste Fahrstunde mit ' + student.name + ' (Klasse ' + (student.license_class || 'B') + ').\n\nBisheriger Verlauf:' + ctx + '\n\nSchreibe das Briefing auf Deutsch, direkt an den Fahrlehrer gerichtet. Struktur:\n1. Aktueller Stand (1-2 Sätze)\n2. Was funktioniert gut (Bullet-Points)\n3. Was muss noch geübt werden (Bullet-Points)\n4. Empfehlung für heutige Stunde (1-2 Sätze)\n\nSei konkret und praxisnah.';

    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-flash-latest' });
    const result = await model.generateContent(prompt);
    const briefing = result.response.text();

    // Speichern
    await supabase.from('ai_briefings').insert({
      id: generateId(),
      student_id: studentId,
      school_id: schoolId,
      instructor_id: req.user.role === 'instructor' ? req.user.id : null,
      content: briefing,
      lesson_count: lessons.length
    });

    res.json({ briefing: briefing, lesson_count: lessons.length });
  } catch (err) {
    console.error('[AI Briefing Error]', err);
    res.status(500).json({ error: 'KI-Anfrage fehlgeschlagen: ' + err.message });
  }
});

// ============================================
// VEHICLES
// ============================================
app.get('/api/school/vehicles', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur für Fahrschulen' });
    const schoolId = req.user.id;

    const { data: vehicles } = await supabase.from('vehicles')
      .select('*').eq('school_id', schoolId).order('created_at', { ascending: false });

    // Add defaults for missing columns (before migration)
    const result = (vehicles || []).map(v => ({
      ...v,
      status: v.status || 'Aktiv',
      available_from: v.available_from || null,
      hu_au_date: v.hu_au_date || null,
      next_service_km: v.next_service_km || null,
      current_km: v.current_km || null
    }));

    res.json({ vehicles: result });
  } catch (err) {
    console.error('Vehicles error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.post('/api/school/vehicles', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur für Fahrschulen' });
    const { brand, licensePlate, transmission } = req.body;
    if (!brand || !licensePlate || !transmission) return res.status(400).json({ error: 'Marke, Kennzeichen und Getriebeart erforderlich' });
    if (!['Schaltung', 'Automatik'].includes(transmission)) return res.status(400).json({ error: 'Ungültige Getriebeart' });

    const id = generateId();
    const insertData = { id, school_id: req.user.id, brand, license_plate: licensePlate, transmission };
    // Try with status column first, fallback without it
    let { error } = await supabase.from('vehicles').insert({ ...insertData, status: 'Aktiv' });
    if (error && error.code === '42703') {
      // Column doesn't exist yet, insert without it
      ({ error } = await supabase.from('vehicles').insert(insertData));
    }
    if (error) throw error;
    res.json({ id, success: true });
  } catch (err) {
    console.error('Vehicle create error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.put('/api/school/vehicles/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur für Fahrschulen' });
    const { data: vehicle } = await supabase.from('vehicles')
      .select('id').eq('id', req.params.id).eq('school_id', req.user.id).single();
    if (!vehicle) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });

    const updates = {};
    const { brand, licensePlate, transmission, status, availableFrom, huAuDate, nextServiceKm, currentKm } = req.body;
    if (brand) updates.brand = brand;
    if (licensePlate) updates.license_plate = licensePlate;
    if (transmission) updates.transmission = transmission;
    if (status) {
      if (!['Aktiv', 'Werkstatt', 'Außer Betrieb'].includes(status)) return res.status(400).json({ error: 'Ungültiger Status' });
      updates.status = status;
    }
    if (availableFrom !== undefined) updates.available_from = availableFrom || null;
    if (huAuDate !== undefined) updates.hu_au_date = huAuDate || null;
    if (nextServiceKm !== undefined) updates.next_service_km = nextServiceKm || null;
    if (currentKm !== undefined) updates.current_km = currentKm || null;

    if (Object.keys(updates).length > 0) {
      let { error } = await supabase.from('vehicles').update(updates).eq('id', req.params.id);
      if (error && (error.code === '42703' || error.code === 'PGRST204' || (error.message && error.message.includes('schema cache')))) {
        // Some columns don't exist yet, try with only basic columns
        const basicUpdates = {};
        if (updates.brand) basicUpdates.brand = updates.brand;
        if (updates.license_plate) basicUpdates.license_plate = updates.license_plate;
        if (updates.transmission) basicUpdates.transmission = updates.transmission;
        if (Object.keys(basicUpdates).length > 0) {
          await supabase.from('vehicles').update(basicUpdates).eq('id', req.params.id);
        }
        // Inform client that status columns are not available yet
        return res.json({ success: true, warning: 'Status-Spalten noch nicht in der Datenbank. Bitte SQL-Migration ausführen.' });
      } else if (error) throw error;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Vehicle update error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.delete('/api/school/vehicles/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur für Fahrschulen' });
    const { data: vehicle } = await supabase.from('vehicles')
      .select('id').eq('id', req.params.id).eq('school_id', req.user.id).single();
    if (!vehicle) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });

    await supabase.from('vehicles').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Vehicle delete error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Vehicle detail with utilization stats
app.get('/api/school/vehicles/:id/detail', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur für Fahrschulen' });
    let { data: vehicle } = await supabase.from('vehicles')
      .select('*').eq('id', req.params.id).eq('school_id', req.user.id).single();
    if (!vehicle) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });
    // Add defaults for missing columns
    vehicle = { ...vehicle, status: vehicle.status || 'Aktiv', available_from: vehicle.available_from || null, hu_au_date: vehicle.hu_au_date || null, next_service_km: vehicle.next_service_km || null, current_km: vehicle.current_km || null };

    // Calculate utilization for last 4 weeks
    var now = new Date();
    var dayOfWeek = now.getDay() || 7; // Mon=1
    var thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - dayOfWeek + 1);
    thisMonday.setHours(0,0,0,0);

    var weeks = [];
    for (var w = 3; w >= 0; w--) {
      var weekStart = new Date(thisMonday);
      weekStart.setDate(thisMonday.getDate() - w * 7);
      var weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 4); // Mon-Fri
      var wsStr = weekStart.toISOString().split('T')[0];
      var weStr = weekEnd.toISOString().split('T')[0];
      var kwNum = getISOWeek(weekStart);

      const { data: lessons } = await supabase.from('scheduled_lessons')
        .select('start_time, end_time')
        .eq('vehicle_id', req.params.id)
        .gte('date', wsStr).lte('date', weStr);

      var totalMins = 0;
      (lessons || []).forEach(function(l) {
        var s = l.start_time.split(':'), e = l.end_time.split(':');
        totalMins += (parseInt(e[0])*60 + parseInt(e[1])) - (parseInt(s[0])*60 + parseInt(s[1]));
      });
      var maxMins = 5 * 12 * 60; // 5 days * 12h (07-19)
      weeks.push({ kw: kwNum, hours: Math.round(totalMins / 60 * 10) / 10, pct: Math.round(totalMins / maxMins * 100) });
    }

    // Month total
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    var monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const { data: monthLessons } = await supabase.from('scheduled_lessons')
      .select('start_time, end_time').eq('vehicle_id', req.params.id)
      .gte('date', monthStart).lte('date', monthEnd);
    var monthMins = 0;
    (monthLessons || []).forEach(function(l) {
      var s = l.start_time.split(':'), e = l.end_time.split(':');
      monthMins += (parseInt(e[0])*60 + parseInt(e[1])) - (parseInt(s[0])*60 + parseInt(s[1]));
    });

    // Total hours all time
    const { data: allLessons } = await supabase.from('scheduled_lessons')
      .select('start_time, end_time').eq('vehicle_id', req.params.id);
    var allMins = 0;
    (allLessons || []).forEach(function(l) {
      var s = l.start_time.split(':'), e = l.end_time.split(':');
      allMins += (parseInt(e[0])*60 + parseInt(e[1])) - (parseInt(s[0])*60 + parseInt(s[1]));
    });

    // Recent lessons
    const { data: recent } = await supabase.from('scheduled_lessons')
      .select('id, date, start_time, end_time, type, instructor_id, student_id, instructors(name), students(name)')
      .eq('vehicle_id', req.params.id)
      .order('date', { ascending: false }).order('start_time', { ascending: false })
      .limit(20);

    var history = (recent || []).map(function(l) {
      return {
        id: l.id, date: l.date, start_time: l.start_time, end_time: l.end_time,
        type: l.type, instructor_id: l.instructor_id,
        instructor_name: l.instructors?.name || '?',
        student_name: l.students?.name || '—'
      };
    });

    res.json({
      vehicle: vehicle,
      utilization: {
        currentWeekPct: weeks.length > 0 ? weeks[weeks.length - 1].pct : 0,
        monthHours: Math.round(monthMins / 60 * 10) / 10,
        totalHours: Math.round(allMins / 60 * 10) / 10,
        weeks: weeks
      },
      history: history
    });
  } catch (err) {
    console.error('Vehicle detail error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

function getISOWeek(d) {
  var date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  var week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

app.get('/api/vehicles/availability', authMiddleware, async (req, res) => {
  try {
    const { date, startTime, endTime } = req.query;
    if (!date || !startTime || !endTime) return res.status(400).json({ error: 'date, startTime und endTime erforderlich' });

    let schoolId;
    if (req.user.role === 'school') schoolId = req.user.id;
    else if (req.user.role === 'instructor') schoolId = req.user.school_id;
    else return res.status(403).json({ error: 'Kein Zugriff' });

    const { data: vehicles } = await supabase.from('vehicles')
      .select('*').eq('school_id', schoolId).order('brand');

    for (const v of (vehicles || [])) {
      // Default status if column doesn't exist yet
      v.status = v.status || 'Aktiv';
      // Non-active vehicles are always unavailable
      if (v.status !== 'Aktiv') {
        v.available = false;
        v.conflictReason = v.status === 'Werkstatt' ? 'In Werkstatt' : 'Außer Betrieb';
        continue;
      }
      const { data: conflicts } = await supabase.from('scheduled_lessons')
        .select('id, instructor_id, instructors(name)')
        .eq('vehicle_id', v.id)
        .eq('date', date)
        .lt('start_time', endTime)
        .gt('end_time', startTime);

      if (conflicts && conflicts.length > 0) {
        v.available = false;
        v.conflictInstructor = conflicts[0].instructors?.name || '?';
      } else {
        v.available = true;
      }
    }

    res.json({ vehicles: vehicles || [] });
  } catch (err) {
    console.error('Vehicle availability error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Weekly bookings for a single vehicle (Variante 1: Tabs pro Fahrzeug)
app.get('/api/school/vehicles/:id/week', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur für Fahrschulen' });
    const { weekStart } = req.query; // Monday date
    if (!weekStart) return res.status(400).json({ error: 'weekStart erforderlich' });
    var ws = new Date(weekStart + 'T00:00:00');
    var we = new Date(ws); we.setDate(ws.getDate() + 5); // Saturday (Mo-Sa = 6 days)

    const { data: bookings } = await supabase.from('scheduled_lessons')
      .select('id, date, start_time, end_time, type, instructor_id, student_id, instructors(name), students(name)')
      .eq('vehicle_id', req.params.id)
      .gte('date', weekStart)
      .lte('date', we.toISOString().split('T')[0])
      .order('date').order('start_time');

    var result = (bookings || []).map(function(b) {
      return {
        id: b.id, date: b.date, start_time: b.start_time, end_time: b.end_time,
        type: b.type, instructor_id: b.instructor_id,
        instructor_name: b.instructors?.name || '?',
        student_name: b.students?.name || '—',
        slot_type: 'lesson'
      };
    });

    // Also include pending slot offers for this vehicle
    try {
      const { data: activeOffers } = await supabase.from('slot_offers')
        .select('id, instructor_id, expires_at, status')
        .eq('vehicle_id', req.params.id)
        .eq('status', 'active');
      const nowT = new Date();
      const validIds = (activeOffers || [])
        .filter(o => !o.expires_at || new Date(o.expires_at) > nowT)
        .map(o => o.id);
      if (validIds.length > 0) {
        const { data: openSlots } = await supabase.from('slot_offer_slots')
          .select('id, offer_id, date, start_time, end_time, status')
          .in('offer_id', validIds).eq('status', 'open')
          .gte('date', weekStart)
          .lte('date', we.toISOString().split('T')[0]);
        const offerById = {};
        (activeOffers || []).forEach(o => { offerById[o.id] = o; });
        const instIds = [...new Set((activeOffers || []).map(o => o.instructor_id))];
        const instById = {};
        if (instIds.length > 0) {
          const { data: insts } = await supabase.from('instructors').select('id, name').in('id', instIds);
          (insts || []).forEach(i => { instById[i.id] = i; });
        }
        (openSlots || []).forEach(os => {
          const offer = offerById[os.offer_id];
          const inst = offer ? instById[offer.instructor_id] : null;
          result.push({
            id: 'offer-' + os.id, date: os.date,
            start_time: os.start_time, end_time: os.end_time,
            type: 'Angebot', slot_type: 'offer',
            instructor_id: offer ? offer.instructor_id : null,
            instructor_name: inst ? inst.name : '?',
            student_name: '—'
          });
        });
      }
    } catch(e) { console.error('[VehicleWeek] offer merge:', e.message); }

    res.json({ bookings: result });
  } catch (err) {
    console.error('Vehicle week error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Bookings for a specific date (Gantt overview)
app.get('/api/school/vehicles/bookings', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur für Fahrschulen' });
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date erforderlich' });
    const schoolId = req.user.id;

    const { data: vehicles } = await supabase.from('vehicles')
      .select('*').eq('school_id', schoolId).order('brand');

    const { data: instructors } = await supabase.from('instructors')
      .select('id, name').eq('school_id', schoolId);

    // Pre-fetch active slot offers once
    const nowT2 = new Date();
    const { data: activeOffers2 } = await supabase.from('slot_offers')
      .select('id, instructor_id, vehicle_id, expires_at, status')
      .eq('school_id', schoolId).eq('status', 'active');
    const validOffersByVehicle = {};
    (activeOffers2 || []).forEach(o => {
      if (o.vehicle_id && (!o.expires_at || new Date(o.expires_at) > nowT2)) {
        validOffersByVehicle[o.vehicle_id] = validOffersByVehicle[o.vehicle_id] || [];
        validOffersByVehicle[o.vehicle_id].push(o);
      }
    });

    for (const v of (vehicles || [])) {
      const { data: bookings } = await supabase.from('scheduled_lessons')
        .select('id, date, start_time, end_time, type, instructor_id, instructors(name)')
        .eq('vehicle_id', v.id)
        .eq('date', date);
      v.bookings = (bookings || []).map(b => ({
        id: b.id, date: b.date, start_time: b.start_time, end_time: b.end_time,
        type: b.type, instructor_id: b.instructor_id, instructor_name: b.instructors?.name || '?',
        slot_type: 'lesson'
      }));

      // Add pending offer slots for this vehicle on this date
      const vehOffers = validOffersByVehicle[v.id] || [];
      if (vehOffers.length > 0) {
        const offerIds = vehOffers.map(o => o.id);
        const { data: openSlots } = await supabase.from('slot_offer_slots')
          .select('id, offer_id, date, start_time, end_time, status')
          .in('offer_id', offerIds).eq('status', 'open').eq('date', date);
        (openSlots || []).forEach(os => {
          const offer = vehOffers.find(o => o.id === os.offer_id);
          const inst = (instructors || []).find(i => i.id === (offer && offer.instructor_id));
          v.bookings.push({
            id: 'offer-' + os.id, date: os.date,
            start_time: os.start_time, end_time: os.end_time,
            type: 'Angebot', slot_type: 'offer',
            instructor_id: offer ? offer.instructor_id : null,
            instructor_name: inst ? inst.name : '?'
          });
        });
      }
    }

    res.json({ vehicles: vehicles || [], instructors: instructors || [] });
  } catch (err) {
    console.error('Vehicle bookings error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ============================================
// RECURRING LESSONS
// ============================================

// Check conflicts for recurring lesson dates
app.post('/api/recurring-lessons/check-conflicts', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Kein Zugriff' });
    const { instructorId, studentId, vehicleId, date, startTime, endTime, frequency, end_date } = req.body;
    if (!date || !startTime || !endTime || !frequency || !end_date) {
      return res.status(400).json({ error: 'Alle Felder erforderlich' });
    }

    // Generate all dates in the series
    const dates = [];
    const start = new Date(date);
    const end = new Date(end_date);
    const step = frequency === 'biweekly' ? 14 : 7;
    let current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + step);
    }

    const targetInstructorId = instructorId || req.user.id;
    const results = [];

    for (const d of dates) {
      const conflicts = [];

      // Check instructor overlap
      const { data: instOverlaps } = await supabase.from('scheduled_lessons')
        .select('id').eq('instructor_id', targetInstructorId).eq('date', d)
        .lt('start_time', endTime).gt('end_time', startTime);
      if (instOverlaps && instOverlaps.length > 0) {
        conflicts.push('instructor');
      }

      // Check vehicle overlap
      if (vehicleId) {
        const { data: vehOverlaps } = await supabase.from('scheduled_lessons')
          .select('id').eq('vehicle_id', vehicleId).eq('date', d)
          .lt('start_time', endTime).gt('end_time', startTime);
        if (vehOverlaps && vehOverlaps.length > 0) {
          conflicts.push('vehicle');
        }
      }

      results.push({ date: d, conflicts: conflicts, ok: conflicts.length === 0 });
    }

    res.json({ dates: results });
  } catch (err) {
    console.error('[Recurring] Conflict check error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Create recurring lessons
app.post('/api/recurring-lessons', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Kein Zugriff' });
    const { instructorId, studentId, vehicleId, date, startTime, endTime, type, licenseClass, notes, frequency, end_date, skipConflicts } = req.body;
    if (!date || !startTime || !endTime || !frequency || !end_date) {
      return res.status(400).json({ error: 'Alle Felder erforderlich' });
    }

    let targetInstructorId = instructorId;
    let schoolId;
    if (req.user.role === 'instructor') {
      targetInstructorId = req.user.id;
      schoolId = req.user.school_id;
    } else if (req.user.role === 'school') {
      if (!targetInstructorId) return res.status(400).json({ error: 'Fahrlehrer-ID erforderlich' });
      schoolId = req.user.id;
    }

    // Generate all dates
    const dates = [];
    const start = new Date(date);
    const end = new Date(end_date);
    const step = frequency === 'biweekly' ? 14 : 7;
    let current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + step);
    }

    // Create a recurring group
    const groupId = generateId();
    const dayOfWeek = new Date(date).getDay();

    // Try to create recurring_groups table entry (table may need to be created first)
    try {
      await supabase.from('recurring_groups').insert({
        id: groupId, school_id: schoolId, instructor_id: targetInstructorId,
        student_id: studentId || null, vehicle_id: vehicleId || null,
        license_class: licenseClass || 'B', day_of_week: dayOfWeek,
        time: startTime, frequency: frequency, start_date: date, end_date: end_date
      });
    } catch (e) {
      // Table may not exist yet — continue without group tracking
      console.log('[Recurring] recurring_groups insert skipped:', e.message);
    }

    // Status logic
    let status;
    if (req.user.role === 'instructor') {
      status = studentId ? 'bestätigt' : 'offen';
    } else {
      status = 'geplant';
    }

    const created = [];
    const skipped = [];

    for (const d of dates) {
      // Check for conflicts if skipConflicts is true
      if (skipConflicts) {
        const { data: overlaps } = await supabase.from('scheduled_lessons')
          .select('id').eq('instructor_id', targetInstructorId).eq('date', d)
          .lt('start_time', endTime).gt('end_time', startTime);
        if (overlaps && overlaps.length > 0) {
          skipped.push(d);
          continue;
        }
        if (vehicleId) {
          const { data: vehOverlaps } = await supabase.from('scheduled_lessons')
            .select('id').eq('vehicle_id', vehicleId).eq('date', d)
            .lt('start_time', endTime).gt('end_time', startTime);
          if (vehOverlaps && vehOverlaps.length > 0) {
            skipped.push(d);
            continue;
          }
        }
      }

      const id = generateId();
      const { error: insertErr } = await supabase.from('scheduled_lessons').insert({
        id, instructor_id: targetInstructorId, school_id: schoolId,
        student_id: studentId || null, date: d, start_time: startTime, end_time: endTime,
        type: type || 'Übungsfahrt', license_class: licenseClass || 'B',
        status, notes: (notes || '') + (notes ? ' ' : '') + '[recurring:' + groupId + ']',
        vehicle_id: vehicleId || null,
        created_by_role: req.user.role, created_by_id: req.user.id
      });
      if (!insertErr) {
        created.push(d);
      } else {
        skipped.push(d);
      }
    }

    if (req.user.role === 'school' && created.length > 0) {
      await createNotification(targetInstructorId, 'instructor', 'schedule_created',
        'Neue Terminserie', created.length + ' wiederkehrende Termine erstellt ab ' + date, groupId);
    }

    res.json({ success: true, groupId, created: created.length, skipped: skipped.length, createdDates: created, skippedDates: skipped });
  } catch (err) {
    console.error('[Recurring] Create error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Delete recurring lesson(s)
app.delete('/api/recurring-lessons/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'student') return res.status(403).json({ error: 'Kein Zugriff' });

    const lessonId = req.params.id;
    const scope = req.query.scope || 'single'; // 'single' or 'future'

    // Get the lesson to find its recurring group
    const { data: lesson } = await supabase.from('scheduled_lessons')
      .select('*').eq('id', lessonId).single();
    if (!lesson) return res.status(404).json({ error: 'Termin nicht gefunden' });

    // Check authorization
    let schoolId;
    if (req.user.role === 'instructor') {
      if (lesson.instructor_id !== req.user.id) return res.status(403).json({ error: 'Kein Zugriff' });
      schoolId = req.user.school_id;
    } else {
      schoolId = req.user.id;
      if (lesson.school_id !== schoolId) return res.status(403).json({ error: 'Kein Zugriff' });
    }

    if (scope === 'single') {
      // Just delete this one lesson
      await supabase.from('scheduled_lessons').delete().eq('id', lessonId);
      res.json({ success: true, deleted: 1 });
    } else if (scope === 'future') {
      // Extract recurring group ID from notes
      const notes = lesson.notes || '';
      const match = notes.match(/\[recurring:([^\]]+)\]/);
      if (!match) {
        // No group — just delete this single lesson
        await supabase.from('scheduled_lessons').delete().eq('id', lessonId);
        return res.json({ success: true, deleted: 1 });
      }
      const groupId = match[1];
      // Find all lessons in this group on or after this date
      const { data: groupLessons } = await supabase.from('scheduled_lessons')
        .select('id, notes')
        .eq('school_id', schoolId)
        .gte('date', lesson.date)
        .like('notes', '%[recurring:' + groupId + ']%');

      let deleted = 0;
      if (groupLessons) {
        for (const gl of groupLessons) {
          await supabase.from('scheduled_lessons').delete().eq('id', gl.id);
          deleted++;
        }
      }
      res.json({ success: true, deleted });
    } else {
      res.status(400).json({ error: 'Ungültiger Scope' });
    }
  } catch (err) {
    console.error('[Recurring] Delete error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ============================================
// THEORY PLANNING
// ============================================

// --- Theory Rooms CRUD ---
app.get('/api/theory/rooms', authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user.school_id || req.user.id;
    const { data, error } = await supabase.from('theory_rooms').select('*').eq('school_id', schoolId).order('created_at');
    if (error) throw error;
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/theory/rooms', authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user.school_id || req.user.id;
    const { name, seat_limit } = req.body;
    const id = generateId();
    const { data, error } = await supabase.from('theory_rooms').insert({ id, school_id: schoolId, name, seat_limit: seat_limit || 25 }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/theory/rooms/:id', authMiddleware, async (req, res) => {
  try {
    const { name, seat_limit } = req.body;
    const { data, error } = await supabase.from('theory_rooms').update({ name, seat_limit }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/theory/rooms/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from('theory_rooms').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Theory Topics ---
app.get('/api/theory/topics', authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user.school_id || req.user.id;
    const { data, error } = await supabase.from('theory_topics').select('*').eq('school_id', schoolId).order('topic_number');
    if (error) throw error;
    // Deduplicate by topic_number (in case topics were inserted twice)
    const seen = {};
    const unique = (data || []).filter(t => {
      if (seen[t.topic_number]) return false;
      seen[t.topic_number] = true;
      return true;
    });
    res.json(unique);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/theory/topics', authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user.school_id || req.user.id;
    const { data: existing } = await supabase.from('theory_topics').select('id').eq('school_id', schoolId).limit(1);
    if (existing && existing.length > 0) return res.json({ message: 'Topics already exist' });
    const topics = [
      { n: 1, title: 'Persönliche Voraussetzungen / Risikofaktor Mensch', basic: true },
      { n: 2, title: 'Rechtliche Rahmenbedingungen', basic: true },
      { n: 3, title: 'Verkehrszeichen und Verkehrseinrichtungen', basic: true },
      { n: 4, title: 'Straßenverkehrssystem und seine Nutzung', basic: true },
      { n: 5, title: 'Vorfahrt', basic: true },
      { n: 6, title: 'Verkehrsregelungen / Bahnübergänge', basic: true },
      { n: 7, title: 'Geschwindigkeit, Abstand und umweltschonende Fahrweise', basic: true },
      { n: 8, title: 'Andere Teilnehmer im Straßenverkehr', basic: true },
      { n: 9, title: 'Verkehrsverhalten bei Fahrmanövern, Verkehrsbeobachtung', basic: true },
      { n: 10, title: 'Ruhender Verkehr', basic: true },
      { n: 11, title: 'Verhalten in besonderen Situationen', basic: true },
      { n: 12, title: 'Lebenslanges Lernen / Folgen von Verstößen', basic: true },
      { n: 13, title: 'Technische Bedingungen (Zusatz B)', basic: false },
      { n: 14, title: 'Fahren mit Solokraftfahrzeugen und Zügen (Zusatz B)', basic: false }
    ];
    const rows = topics.map(t => ({ id: generateId(), school_id: schoolId, topic_number: t.n, title: t.title, is_basic: t.basic }));
    const { data, error } = await supabase.from('theory_topics').insert(rows).select();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Theory Schedule ---
app.get('/api/theory/schedule', authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user.school_id || req.user.id;
    const { week_start } = req.query;
    let query = supabase.from('theory_schedule').select('*').eq('school_id', schoolId);
    if (week_start) {
      const ws = new Date(week_start);
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      query = query.gte('date', formatDateLocal(ws)).lte('date', formatDateLocal(we));
    }
    const { data, error } = await query.order('date').order('start_time');
    if (error) throw error;
    // Fetch rooms and topics for enrichment
    const { data: rooms } = await supabase.from('theory_rooms').select('id, name, seat_limit').eq('school_id', schoolId);
    const { data: topics } = await supabase.from('theory_topics').select('id, topic_number, title, is_basic').eq('school_id', schoolId);
    const roomMap = {};
    (rooms || []).forEach(r => { roomMap[r.id] = r; });
    const topicMap = {};
    (topics || []).forEach(t => { topicMap[t.id] = t; });
    // Enrich with instructor name, room, and topic data
    const enriched = [];
    for (const item of (data || [])) {
      let instructor_name = null;
      if (item.instructor_id) {
        const { data: inst } = await supabase.from('instructors').select('name').eq('id', item.instructor_id).single();
        if (inst) instructor_name = inst.name;
      }
      enriched.push(Object.assign({}, item, {
        instructor_name,
        theory_rooms: roomMap[item.room_id] || null,
        theory_topics: topicMap[item.topic_id] || null
      }));
    }
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/theory/schedule/:id', authMiddleware, async (req, res) => {
  try {
    const updates = {};
    if (req.body.instructor_id !== undefined) updates.instructor_id = req.body.instructor_id;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.room_id !== undefined) updates.room_id = req.body.room_id;
    const { data, error } = await supabase.from('theory_schedule').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;

    // If recurring assignment requested, update all future sessions on same weekday
    if (req.body.recurring && req.body.instructor_id) {
      const schoolId = req.user.school_id || req.user.id;
      const entryDate = new Date(data.date + 'T12:00:00');
      const dayOfWeek = entryDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const todayStr = formatDateLocal(new Date());
      // Get all future schedule entries for this school on same weekday and same time
      const { data: allSchedule } = await supabase.from('theory_schedule')
        .select('id, date, start_time')
        .eq('school_id', schoolId)
        .eq('start_time', data.start_time)
        .gte('date', todayStr);
      if (allSchedule) {
        const matchingIds = allSchedule.filter(s => {
          const sDate = new Date(s.date + 'T12:00:00');
          return sDate.getDay() === dayOfWeek && s.id !== req.params.id;
        }).map(s => s.id);
        if (matchingIds.length > 0) {
          await supabase.from('theory_schedule').update({ instructor_id: req.body.instructor_id }).in('id', matchingIds);
        }
        data._recurringUpdated = matchingIds.length;
      }
    }
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Theory Rotation ---
app.get('/api/theory/rotation', authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user.school_id || req.user.id;
    const { data, error } = await supabase.from('theory_rotation').select('*').eq('school_id', schoolId).order('created_at');
    if (error) throw error;
    // Enrich with room names
    const { data: rooms } = await supabase.from('theory_rooms').select('id, name').eq('school_id', schoolId);
    const roomMap = {};
    (rooms || []).forEach(r => { roomMap[r.id] = r; });
    const enriched = (data || []).map(rot => Object.assign({}, rot, { theory_rooms: roomMap[rot.room_id] || null }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/theory/rotation', authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user.school_id || req.user.id;
    const { room_id, days, start_time, end_time, start_topic_number } = req.body;
    // days is array of day_of_week numbers (0=Mon ... 5=Sat)
    const rotationIds = [];
    for (const day of days) {
      const id = generateId();
      rotationIds.push(id);
      const { error } = await supabase.from('theory_rotation').insert({ id, school_id: schoolId, room_id, day_of_week: day, start_time, end_time, start_topic_number: start_topic_number || 1 });
      if (error) throw error;
    }
    // Get topics (deduplicated)
    const { data: rawTopics } = await supabase.from('theory_topics').select('id, topic_number').eq('school_id', schoolId).order('topic_number');
    const seenTopic = {};
    const topics = (rawTopics || []).filter(tp => { if (seenTopic[tp.topic_number]) return false; seenTopic[tp.topic_number] = true; return true; });
    if (topics.length === 0) return res.status(400).json({ error: 'No topics found. Initialize topics first.' });
    // Generate 52 weeks (full year) of schedule
    const today = new Date();
    const mondayOfThisWeek = new Date(today);
    const dayNum = today.getDay();
    const diff = dayNum === 0 ? -6 : 1 - dayNum;
    mondayOfThisWeek.setDate(today.getDate() + diff);
    mondayOfThisWeek.setHours(0, 0, 0, 0);
    // Collect all scheduled day slots across 52 weeks, sorted chronologically
    const allSlots = [];
    for (let week = 0; week < 52; week++) {
      for (const day of days.slice().sort((a, b) => a - b)) {
        const slotDate = new Date(mondayOfThisWeek);
        slotDate.setDate(slotDate.getDate() + week * 7 + day);
        // Only future dates
        if (slotDate >= today) {
          allSlots.push({ date: formatDateLocal(slotDate), room_id });
        }
      }
    }
    // Assign topics cycling through 1-14
    let topicIdx = (start_topic_number || 1) - 1;
    const scheduleRows = [];
    for (const slot of allSlots) {
      const topic = topics[topicIdx % topics.length];
      scheduleRows.push({
        id: generateId(),
        school_id: schoolId,
        room_id: slot.room_id,
        topic_id: topic.id,
        instructor_id: null,
        date: slot.date,
        start_time,
        end_time,
        status: 'geplant'
      });
      topicIdx++;
    }
    // Delete existing future schedule for this school
    const todayStr = formatDateLocal(today);
    await supabase.from('theory_schedule').delete().eq('school_id', schoolId).gte('date', todayStr);
    // Insert new schedule
    if (scheduleRows.length > 0) {
      const { error } = await supabase.from('theory_schedule').insert(scheduleRows);
      if (error) throw error;
    }
    res.json({ generated: scheduleRows.length, rotationIds });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Delete single rotation ---
app.delete('/api/theory/rotation/:id', authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user.school_id || req.user.id;
    // First get the rotation to know the day_of_week
    const { data: rot } = await supabase.from('theory_rotation').select('day_of_week, start_time').eq('id', req.params.id).single();
    const { error } = await supabase.from('theory_rotation').delete().eq('id', req.params.id);
    if (error) throw error;
    // Delete future unassigned theory schedule entries on that weekday
    if (rot) {
      const todayStr = formatDateLocal(new Date());
      const { data: futureEntries } = await supabase.from('theory_schedule')
        .select('id, date').eq('school_id', schoolId).is('instructor_id', null).gte('date', todayStr);
      if (futureEntries) {
        const toDelete = futureEntries.filter(e => {
          const d = new Date(e.date + 'T12:00:00');
          return d.getDay() === rot.day_of_week + 1; // rotation 0=Mon -> JS getDay() 1=Mon
        }).map(e => e.id);
        if (toDelete.length > 0) {
          await supabase.from('theory_schedule').delete().in('id', toDelete);
        }
      }
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Delete all rotations for school ---
app.delete('/api/theory/rotation', authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user.school_id || req.user.id;
    const { error } = await supabase.from('theory_rotation').delete().eq('school_id', schoolId);
    if (error) throw error;
    // Delete ALL future unassigned theory schedule entries
    const todayStr = formatDateLocal(new Date());
    await supabase.from('theory_schedule').delete()
      .eq('school_id', schoolId).is('instructor_id', null).gte('date', todayStr);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Theory Attendance ---
app.get('/api/theory/attendance/:scheduleId', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('theory_attendance').select('*').eq('theory_schedule_id', req.params.scheduleId);
    if (error) throw error;
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/theory/attendance/:scheduleId', authMiddleware, async (req, res) => {
  try {
    const { attendance } = req.body; // array of { student_id, is_present }
    const scheduleId = req.params.scheduleId;
    // Delete existing attendance for this schedule
    await supabase.from('theory_attendance').delete().eq('theory_schedule_id', scheduleId);
    // Insert new
    if (attendance && attendance.length > 0) {
      const rows = attendance.map(a => ({ id: generateId(), theory_schedule_id: scheduleId, student_id: a.student_id, is_present: a.is_present }));
      const { error } = await supabase.from('theory_attendance').insert(rows);
      if (error) throw error;
    }
    // Mark schedule as completed if in the past
    const { data: sched } = await supabase.from('theory_schedule').select('date').eq('id', scheduleId).single();
    if (sched && new Date(sched.date) < new Date()) {
      await supabase.from('theory_schedule').update({ status: 'abgeschlossen' }).eq('id', scheduleId);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Theory Progress ---
app.get('/api/theory/progress/:studentId', authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user.school_id || req.user.id;
    const { data: attendance, error } = await supabase.from('theory_attendance')
      .select('theory_schedule_id, is_present')
      .eq('student_id', req.params.studentId)
      .eq('is_present', true);
    if (error) throw error;
    // Get the topic_ids from attended schedules
    const scheduleIds = (attendance || []).map(a => a.theory_schedule_id);
    let attendedTopics = [];
    if (scheduleIds.length > 0) {
      const { data: schedules } = await supabase.from('theory_schedule')
        .select('topic_id')
        .in('id', scheduleIds);
      if (schedules) {
        const topicIds = schedules.map(s => s.topic_id).filter(Boolean);
        if (topicIds.length > 0) {
          const { data: topics } = await supabase.from('theory_topics')
            .select('topic_number')
            .in('id', topicIds);
          if (topics) {
            const topicNumbers = new Set();
            topics.forEach(t => topicNumbers.add(t.topic_number));
            attendedTopics = Array.from(topicNumbers);
          }
        }
      }
    }
    // Return full topic list with attended status
    const { data: allTopics } = await supabase.from('theory_topics').select('topic_number, title, is_basic').eq('school_id', schoolId).order('topic_number');
    const seen = {};
    const result = (allTopics || []).filter(tp => {
      if (seen[tp.topic_number]) return false;
      seen[tp.topic_number] = true;
      return true;
    }).map(tp => ({
      topic_number: tp.topic_number,
      title: tp.title,
      is_basic: tp.is_basic,
      attended: attendedTopics.indexOf(tp.topic_number) !== -1
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- School students list (for attendance) ---
app.get('/api/theory/students', authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user.school_id || req.user.id;
    const { data, error } = await supabase.from('students').select('id, name, license_class').eq('school_id', schoolId).eq('status', 'active').order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================
// AUSBILDUNGSNACHWEIS (Anlage 3) DATA
// ============================================
app.get('/api/ausbildungsnachweis/:studentId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur für Fahrschulen' });
    const studentId = req.params.studentId;
    const schoolId = req.user.id;

    // Get student
    const { data: student } = await supabase.from('students')
      .select('*').eq('id', studentId).eq('school_id', schoolId).single();
    if (!student) return res.status(404).json({ error: 'Schüler nicht gefunden' });

    // Get school
    const { data: school } = await supabase.from('schools')
      .select('*').eq('id', schoolId).single();

    // Get all lessons for this student
    const { data: lessons } = await supabase.from('lessons')
      .select('*, instructors(id, name)')
      .eq('student_id', studentId)
      .order('date', { ascending: true });

    // Get instructors
    const instructors = await getStudentInstructors(studentId);

    // Get theory attendance
    const { data: attendance } = await supabase.from('theory_attendance')
      .select('*')
      .eq('student_id', studentId)
      .eq('is_present', true);

    // Build theory data by fetching schedule + topic for each attendance
    var theoryBasic = [];
    var theorySpecific = [];
    for (const att of (attendance || [])) {
      const { data: sched } = await supabase.from('theory_schedule')
        .select('*').eq('id', att.theory_schedule_id).single();
      if (!sched || !sched.topic_id) continue;
      const { data: topic } = await supabase.from('theory_topics')
        .select('*').eq('id', sched.topic_id).single();
      if (!topic) continue;
      var entry = {
        date: sched.date,
        topic_number: topic.topic_number,
        title: topic.title,
        start_time: sched.start_time,
        end_time: sched.end_time,
        duration_min: 90,
        instructor_id: sched.instructor_id
      };
      if (topic.is_basic) {
        theoryBasic.push(entry);
      } else {
        theorySpecific.push(entry);
      }
    }

    // Build practical data grouped by type
    var practicalLessons = (lessons || []).map(function(l) {
      return {
        date: l.date,
        type: l.type,
        duration: l.duration,
        instructor_id: l.instructor_id,
        instructor_name: l.instructors ? l.instructors.name : '?',
        start_time: null,
        license_class: l.license_class
      };
    });

    res.json({
      student: {
        name: student.name,
        email: student.email,
        license_class: student.license_class || 'B',
        geburtsdatum: student.geburtsdatum || '',
        anschrift: student.address || ''
      },
      school: {
        name: school ? school.name : '',
        address: school ? (school.address || '') : '',
        admin_name: school ? (school.admin_name || '') : ''
      },
      instructors: (instructors || []).map(function(i, idx) {
        return { id: i.id, name: i.name, nr: idx + 1 };
      }),
      theoryBasic: theoryBasic,
      theorySpecific: theorySpecific,
      practicalLessons: practicalLessons
    });
  } catch (err) {
    console.error('[Ausbildungsnachweis] Error:', err.message);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ============================================
// SLOT OFFERS (Termine anbieten)
// ============================================

// Auto-create slot offer tables if they don't exist
(async function ensureSlotOfferTables() {
  try {
    var { data, error } = await supabase.from('slot_offers').select('id').limit(1);
    if (error && error.code === 'PGRST204') {
      // Table doesn't exist — create via rpc or direct SQL
      console.log('[SlotOffers] Tables not found, attempting to create...');
      await supabase.rpc('exec_sql', { sql: `
        CREATE TABLE IF NOT EXISTS slot_offers (
          id text PRIMARY KEY, school_id text NOT NULL, instructor_id text NOT NULL,
          expires_at timestamptz, cancel_deadline_hours integer DEFAULT 24,
          vehicle_id text, status text DEFAULT 'active', recurring text,
          created_at timestamptz DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS slot_offer_slots (
          id text PRIMARY KEY, offer_id text NOT NULL REFERENCES slot_offers(id) ON DELETE CASCADE,
          date date NOT NULL, start_time text NOT NULL, end_time text NOT NULL,
          duration_min integer NOT NULL, status text DEFAULT 'open',
          booked_by text, booked_at timestamptz
        );
        CREATE TABLE IF NOT EXISTS slot_offer_recipients (
          id serial PRIMARY KEY, offer_id text NOT NULL REFERENCES slot_offers(id) ON DELETE CASCADE,
          student_id text NOT NULL
        );
      ` });
      console.log('[SlotOffers] Tables created successfully');
    } else {
      console.log('[SlotOffers] Tables exist');
    }
  } catch (e) {
    console.log('[SlotOffers] Tables check/create:', e.message || e);
    console.log('[SlotOffers] If tables do not exist, please create them manually in Supabase SQL editor.');
  }
})();

// Create slot offer (school only)
app.post('/api/slot-offers', authMiddleware, async (req, res) => {
  if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschule' });
  try {
    var { instructor_id, slots, student_ids, expires_at, cancel_deadline_hours, vehicle_id, recurring } = req.body;
    if (!instructor_id || !slots || !slots.length || !student_ids || !student_ids.length) {
      return res.status(400).json({ error: 'instructor_id, slots und student_ids erforderlich' });
    }
    var offerId = generateId();
    // Insert the offer
    await supabase.from('slot_offers').insert({
      id: offerId, school_id: req.user.id, instructor_id: instructor_id,
      expires_at: expires_at || null, cancel_deadline_hours: cancel_deadline_hours || 24,
      vehicle_id: vehicle_id || null, status: 'active',
      recurring: recurring || null
    });
    // Insert slots
    var slotInserts = slots.map(function(s) {
      return {
        id: generateId(), offer_id: offerId, date: s.date,
        start_time: s.start_time, end_time: s.end_time,
        duration_min: s.duration_min || 90, status: 'open'
      };
    });
    await supabase.from('slot_offer_slots').insert(slotInserts);
    // Insert student recipients (id is auto-generated serial, don't provide it)
    var studentInserts = student_ids.map(function(sid) {
      return { offer_id: offerId, student_id: sid };
    });
    var { error: recipErr } = await supabase.from('slot_offer_recipients').insert(studentInserts);
    if (recipErr) {
      console.error('[SlotOffer] Recipient insert error:', recipErr);
      return res.status(500).json({ error: 'Empfänger konnten nicht gespeichert werden: ' + recipErr.message });
    }
    // Create notifications for each student
    var { data: instructor } = await supabase.from('instructors').select('name').eq('id', instructor_id).single();
    var instName = instructor ? instructor.name : 'Fahrlehrer';
    var slotTexts = slots.map(function(s) {
      var d = new Date(s.date);
      var dayStr = d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
      return dayStr + ' ' + s.start_time + '-' + s.end_time;
    });
    var msg = 'Neuer Termin bei ' + instName + ' verfügbar: ' + slotTexts.join(', ') + '. Jetzt in der App bestätigen!';
    for (var i = 0; i < student_ids.length; i++) {
      await createNotification(student_ids[i], 'student', 'slot_offer', 'Termin verfügbar', msg, offerId);
    }
    res.json({ id: offerId, success: true });
  } catch (err) {
    console.error('[SlotOffer] Create error:', err.message);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Get active offers for a student
app.get('/api/slot-offers/student', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Nur Schüler' });
  try {
    // Find offers where this student is a recipient
    var { data: recipientRows } = await supabase.from('slot_offer_recipients')
      .select('offer_id').eq('student_id', req.user.id);
    if (!recipientRows || !recipientRows.length) return res.json([]);
    var offerIds = recipientRows.map(function(r) { return r.offer_id; });
    // Get active offers
    var { data: offers } = await supabase.from('slot_offers')
      .select('id, instructor_id, expires_at, cancel_deadline_hours, vehicle_id, status, recurring, created_at')
      .in('id', offerIds).eq('status', 'active');
    if (!offers || !offers.length) return res.json([]);
    // Filter expired offers
    var now = new Date();
    var activeOffers = offers.filter(function(o) {
      if (!o.expires_at) return true;
      return new Date(o.expires_at) > now;
    });
    // Get slots for these offers
    var activeIds = activeOffers.map(function(o) { return o.id; });
    var { data: allSlots } = await supabase.from('slot_offer_slots')
      .select('id, offer_id, date, start_time, end_time, duration_min, status, booked_by, booked_at')
      .in('offer_id', activeIds).order('date').order('start_time');
    // Get instructor names
    var instIds = [...new Set(activeOffers.map(function(o) { return o.instructor_id; }))];
    var { data: instructors } = await supabase.from('instructors')
      .select('id, name').in('id', instIds);
    var instMap = {};
    (instructors || []).forEach(function(inst) { instMap[inst.id] = inst.name; });
    // Combine
    var result = activeOffers.map(function(o) {
      o.instructor_name = instMap[o.instructor_id] || '';
      o.slots = (allSlots || []).filter(function(s) { return s.offer_id === o.id; });
      return o;
    });
    res.json(result);
  } catch (err) {
    console.error('[SlotOffer] Student fetch error:', err.message);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Book a slot (student)
app.post('/api/slot-offers/book/:slotId', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Nur Schüler' });
  try {
    var slotId = req.params.slotId;
    // Get the slot
    var { data: slot } = await supabase.from('slot_offer_slots')
      .select('id, offer_id, date, start_time, end_time, duration_min, status, booked_by')
      .eq('id', slotId).single();
    if (!slot) return res.status(404).json({ error: 'Slot nicht gefunden' });
    if (slot.status !== 'open') return res.status(409).json({ error: 'Dieser Termin ist leider nicht mehr verfügbar.', expired: true });
    // Check offer is still active and not expired
    var { data: offer } = await supabase.from('slot_offers')
      .select('id, instructor_id, school_id, expires_at, vehicle_id, status, cancel_deadline_hours')
      .eq('id', slot.offer_id).single();
    if (!offer || offer.status !== 'active') return res.status(409).json({ error: 'Angebot abgelaufen', expired: true });
    if (offer.expires_at && new Date(offer.expires_at) < new Date()) {
      return res.status(409).json({ error: 'Angebot abgelaufen', expired: true });
    }
    // Check student is a recipient
    var { data: isRecipient } = await supabase.from('slot_offer_recipients')
      .select('id').eq('offer_id', slot.offer_id).eq('student_id', req.user.id).maybeSingle();
    if (!isRecipient) return res.status(403).json({ error: 'Nicht berechtigt' });
    // Double-booking check: does this instructor already have a lesson at this time?
    var { data: overlaps } = await supabase.from('scheduled_lessons')
      .select('id').eq('instructor_id', offer.instructor_id)
      .eq('date', slot.date)
      .lt('start_time', slot.end_time)
      .gt('end_time', slot.start_time);
    if (overlaps && overlaps.length > 0) {
      return res.status(409).json({ error: 'Dieser Termin ist leider nicht mehr verfügbar.', expired: true });
    }
    // Atomic: Update slot to booked (only if still open)
    var { data: updated, error: updateErr } = await supabase.from('slot_offer_slots')
      .update({ status: 'booked', booked_by: req.user.id, booked_at: new Date().toISOString() })
      .eq('id', slotId).eq('status', 'open')
      .select();
    if (updateErr || !updated || !updated.length) {
      return res.status(409).json({ error: 'Dieser Termin ist leider nicht mehr verfügbar.', expired: true });
    }
    // Get student license class for the booking
    var { data: studentData } = await supabase.from('students').select('license_class').eq('id', req.user.id).single();
    var licClass = (studentData && studentData.license_class) || 'B';
    // Create scheduled_lesson entry
    var lessonId = generateId();
    var { error: lessonInsertErr } = await supabase.from('scheduled_lessons').insert({
      id: lessonId, instructor_id: offer.instructor_id, school_id: offer.school_id,
      student_id: req.user.id, date: slot.date,
      start_time: slot.start_time, end_time: slot.end_time,
      type: 'Übungsfahrt', license_class: licClass, status: 'bestätigt',
      notes: 'Über Slot-Angebot gebucht', vehicle_id: offer.vehicle_id || null,
      created_by_role: 'school', created_by_id: offer.school_id
    });
    if (lessonInsertErr) {
      console.error('[SlotOffer] Lesson insert error:', lessonInsertErr);
      // Revert slot booking since lesson creation failed
      await supabase.from('slot_offer_slots').update({ status: 'open', booked_by: null, booked_at: null }).eq('id', slotId);
      return res.status(500).json({ error: 'Buchung fehlgeschlagen: ' + lessonInsertErr.message });
    }
    // Notify school + instructor
    var { data: student } = await supabase.from('students').select('name').eq('id', req.user.id).single();
    var stuName = student ? student.name : 'Schüler';
    var dayStr = new Date(slot.date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
    var bookMsg = stuName + ' hat den Termin am ' + dayStr + ' (' + slot.start_time + '-' + slot.end_time + ') bestätigt.';
    await createNotification(offer.school_id, 'school', 'slot_booked', 'Termin bestätigt', bookMsg, lessonId);
    await createNotification(offer.instructor_id, 'instructor', 'slot_booked', 'Termin bestätigt', bookMsg, lessonId);
    res.json({ success: true, lesson_id: lessonId });
  } catch (err) {
    console.error('[SlotOffer] Book error:', err.message);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Cancel a booked slot (student) — respects cancel deadline
app.post('/api/slot-offers/cancel/:slotId', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Nur Schüler' });
  try {
    var slotId = req.params.slotId;
    var { data: slot } = await supabase.from('slot_offer_slots')
      .select('id, offer_id, date, start_time, end_time, status, booked_by')
      .eq('id', slotId).single();
    if (!slot || slot.booked_by !== req.user.id) return res.status(404).json({ error: 'Nicht gefunden' });
    if (slot.status !== 'booked') return res.status(400).json({ error: 'Slot nicht gebucht' });
    // Check cancel deadline
    var { data: offer } = await supabase.from('slot_offers')
      .select('cancel_deadline_hours, school_id, instructor_id').eq('id', slot.offer_id).single();
    var deadlineHours = (offer && offer.cancel_deadline_hours) || 24;
    var slotDateTime = new Date(slot.date + 'T' + slot.start_time);
    var deadlineTime = new Date(slotDateTime.getTime() - deadlineHours * 60 * 60 * 1000);
    if (new Date() > deadlineTime) {
      return res.status(400).json({ error: 'Absagefrist von ' + deadlineHours + ' Stunden abgelaufen' });
    }
    // Re-open slot
    await supabase.from('slot_offer_slots')
      .update({ status: 'open', booked_by: null, booked_at: null })
      .eq('id', slotId);
    // Delete the scheduled_lesson
    await supabase.from('scheduled_lessons')
      .delete()
      .eq('instructor_id', offer.instructor_id)
      .eq('student_id', req.user.id)
      .eq('date', slot.date)
      .eq('start_time', slot.start_time);
    // Notify school + instructor
    var { data: student } = await supabase.from('students').select('name').eq('id', req.user.id).single();
    var stuName = student ? student.name : 'Schüler';
    var dayStr = new Date(slot.date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
    var cancelMsg = stuName + ' hat den Termin am ' + dayStr + ' (' + slot.start_time + '-' + slot.end_time + ') abgesagt. Slot ist wieder verfügbar.';
    await createNotification(offer.school_id, 'school', 'slot_cancelled', 'Termin abgesagt', cancelMsg, slotId);
    await createNotification(offer.instructor_id, 'instructor', 'slot_cancelled', 'Termin abgesagt', cancelMsg, slotId);
    // Re-notify other recipients
    var { data: recipients } = await supabase.from('slot_offer_recipients')
      .select('student_id').eq('offer_id', slot.offer_id);
    if (recipients) {
      for (var r = 0; r < recipients.length; r++) {
        if (recipients[r].student_id !== req.user.id) {
          await createNotification(recipients[r].student_id, 'student', 'slot_available',
            'Termin wieder verfügbar', 'Ein Termin am ' + dayStr + ' (' + slot.start_time + '-' + slot.end_time + ') ist wieder frei!', slot.offer_id);
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[SlotOffer] Cancel error:', err.message);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Get all offers for school (management view)
app.get('/api/slot-offers/school', authMiddleware, async (req, res) => {
  if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschule' });
  try {
    var { data: offers } = await supabase.from('slot_offers')
      .select('id, instructor_id, expires_at, cancel_deadline_hours, vehicle_id, status, recurring, created_at')
      .eq('school_id', req.user.id).order('created_at', { ascending: false }).limit(50);
    if (!offers || !offers.length) return res.json([]);
    var offerIds = offers.map(function(o) { return o.id; });
    var { data: allSlots } = await supabase.from('slot_offer_slots')
      .select('id, offer_id, date, start_time, end_time, duration_min, status, booked_by')
      .in('offer_id', offerIds);
    var { data: allRecipients } = await supabase.from('slot_offer_recipients')
      .select('offer_id, student_id').in('offer_id', offerIds);
    offers.forEach(function(o) {
      o.slots = (allSlots || []).filter(function(s) { return s.offer_id === o.id; });
      o.recipients = (allRecipients || []).filter(function(r) { return r.offer_id === o.id; }).map(function(r) { return r.student_id; });
    });
    res.json(offers);
  } catch (err) {
    console.error('[SlotOffer] School fetch error:', err.message);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Delete a single offer slot (school) - only if status=open
app.delete('/api/slot-offers/slot/:slotId', authMiddleware, async (req, res) => {
  if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschule' });
  try {
    var slotId = req.params.slotId;
    var { data: slot } = await supabase.from('slot_offer_slots')
      .select('id, offer_id, status').eq('id', slotId).single();
    if (!slot) return res.status(404).json({ error: 'Slot nicht gefunden' });
    if (slot.status !== 'open') return res.status(409).json({ error: 'Gebuchte Slots können nicht gelöscht werden' });
    // Verify offer belongs to this school
    var { data: offer } = await supabase.from('slot_offers')
      .select('school_id').eq('id', slot.offer_id).single();
    if (!offer || offer.school_id !== req.user.id) return res.status(403).json({ error: 'Nicht berechtigt' });
    await supabase.from('slot_offer_slots').delete().eq('id', slotId);
    // If this was the last open slot, mark offer as cancelled
    var { data: remaining } = await supabase.from('slot_offer_slots')
      .select('id').eq('offer_id', slot.offer_id).eq('status', 'open');
    if (!remaining || remaining.length === 0) {
      var { data: booked } = await supabase.from('slot_offer_slots')
        .select('id').eq('offer_id', slot.offer_id).eq('status', 'booked');
      if (!booked || booked.length === 0) {
        await supabase.from('slot_offers').update({ status: 'cancelled' }).eq('id', slot.offer_id);
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[SlotOffer] Delete slot error:', err.message);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Delete an entire offer (school) - only open slots, booked slots stay as lessons
app.delete('/api/slot-offers/:offerId', authMiddleware, async (req, res) => {
  if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschule' });
  try {
    var offerId = req.params.offerId;
    var { data: offer } = await supabase.from('slot_offers')
      .select('school_id').eq('id', offerId).single();
    if (!offer || offer.school_id !== req.user.id) return res.status(403).json({ error: 'Nicht berechtigt' });
    // Delete only open slots; keep booked ones for history
    await supabase.from('slot_offer_slots').delete().eq('offer_id', offerId).eq('status', 'open');
    // Mark offer as cancelled
    await supabase.from('slot_offers').update({ status: 'cancelled' }).eq('id', offerId);
    res.json({ success: true });
  } catch (err) {
    console.error('[SlotOffer] Delete offer error:', err.message);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Edit an open slot (school) - change date/time/duration
app.put('/api/slot-offers/slot/:slotId', authMiddleware, async (req, res) => {
  if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschule' });
  try {
    var slotId = req.params.slotId;
    var { date, start_time, end_time, duration_min } = req.body;
    if (!date || !start_time || !end_time) return res.status(400).json({ error: 'date/start/end erforderlich' });
    var { data: slot } = await supabase.from('slot_offer_slots')
      .select('id, offer_id, status').eq('id', slotId).single();
    if (!slot) return res.status(404).json({ error: 'Slot nicht gefunden' });
    if (slot.status !== 'open') return res.status(409).json({ error: 'Gebuchte Slots können nicht bearbeitet werden' });
    var { data: offer } = await supabase.from('slot_offers')
      .select('school_id').eq('id', slot.offer_id).single();
    if (!offer || offer.school_id !== req.user.id) return res.status(403).json({ error: 'Nicht berechtigt' });
    await supabase.from('slot_offer_slots').update({
      date: date, start_time: start_time, end_time: end_time,
      duration_min: duration_min || 90
    }).eq('id', slotId);
    res.json({ success: true });
  } catch (err) {
    console.error('[SlotOffer] Edit slot error:', err.message);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Update vehicle on offer (school)
app.put('/api/slot-offers/:offerId/vehicle', authMiddleware, async (req, res) => {
  if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschule' });
  try {
    var { vehicle_id } = req.body;
    await supabase.from('slot_offers').update({ vehicle_id: vehicle_id || null })
      .eq('id', req.params.offerId).eq('school_id', req.user.id);
    // Also update any already-booked lessons from this offer
    var { data: bookedSlots } = await supabase.from('slot_offer_slots')
      .select('date, start_time').eq('offer_id', req.params.offerId).eq('status', 'booked');
    if (bookedSlots) {
      for (var bs = 0; bs < bookedSlots.length; bs++) {
        await supabase.from('scheduled_lessons')
          .update({ vehicle_id: vehicle_id || null })
          .eq('date', bookedSlots[bs].date).eq('start_time', bookedSlots[bs].start_time);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Get student's lessons (upcoming + past)
app.get('/api/student/lessons', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Nur Schüler' });
  try {
    var today = new Date().toISOString().split('T')[0];
    var { data: lessons } = await supabase.from('scheduled_lessons')
      .select('id, date, start_time, end_time, type, status, instructor_id, vehicle_id, notes')
      .eq('student_id', req.user.id)
      .neq('type', 'Zeitsperre')
      .order('date', { ascending: false }).order('start_time', { ascending: false });
    // Split into upcoming and past
    var upcoming = [];
    var past = [];
    (lessons || []).forEach(function(l) {
      if (l.date >= today) upcoming.push(l);
      else past.push(l);
    });
    upcoming.reverse(); // Nearest first
    // Get instructor names
    var instIds = [...new Set((lessons || []).map(function(l) { return l.instructor_id; }).filter(Boolean))];
    var instMap = {};
    if (instIds.length) {
      var { data: insts } = await supabase.from('instructors').select('id, name').in('id', instIds);
      (insts || []).forEach(function(inst) { instMap[inst.id] = inst.name; });
    }
    (lessons || []).forEach(function(l) { l.instructor_name = instMap[l.instructor_id] || ''; });
    res.json({ upcoming: upcoming, past: past });
  } catch (err) {
    console.error('[Student Lessons] Error:', err.message);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ============================================
// BUCHHALTUNG: Helper für Auto-Soll-Position
// ============================================
async function autoCreateChargeFromLesson(opts) {
  // opts: { schoolId, studentId, lessonId, lessonType, lessonDate, createdByRole, createdById }
  if (!opts.schoolId || !opts.studentId || !opts.lessonId || !opts.lessonType) return null;
  // Suche passendes Template (case-insensitive Vergleich lesson_type_match == lessonType)
  const { data: templates } = await supabase.from('pricing_templates')
    .select('*').eq('school_id', opts.schoolId).eq('active', true).eq('auto_apply', true);
  if (!templates || templates.length === 0) return null;
  const lt = (opts.lessonType || '').toLowerCase().trim();
  const match = templates.find(function(t){ return (t.lesson_type_match || '').toLowerCase().trim() === lt; });
  if (!match) return null;
  // Duplikat-Check (UNIQUE-Constraint deckt's auch ab, aber so vermeiden wir Fehlermeldungen)
  const { data: existing } = await supabase.from('student_charges')
    .select('id').eq('lesson_id', opts.lessonId).eq('source', 'auto').maybeSingle();
  if (existing) return existing;
  const total = Math.round(match.price_cents * 1);
  const row = {
    id: generateId(),
    school_id: opts.schoolId,
    student_id: opts.studentId,
    pricing_template_id: match.id,
    description: match.name + ' (' + (opts.lessonDate || '') + ')',
    category: match.category,
    unit_price_cents: match.price_cents,
    quantity: 1,
    total_cents: total,
    charge_date: opts.lessonDate || new Date().toISOString().split('T')[0],
    lesson_id: opts.lessonId,
    created_by_role: opts.createdByRole || 'instructor',
    created_by_id: opts.createdById || null,
    source: 'auto'
  };
  const { data: inserted, error } = await supabase.from('student_charges').insert(row).select().single();
  if (error) throw error;
  return inserted;
}

// Helper: SchoolId aus User-Objekt holen (school: user.id, instructor/student: user.school_id)
function schoolIdOf(user) {
  if (!user) return null;
  return user.role === 'school' ? user.id : user.school_id;
}

// Helper: Berechtigung prüfen (NUR Fahrschule darf Buchhaltungs-Endpoints nutzen)
async function canAccessStudent(req, studentId) {
  if (!studentId) return false;
  if (req.user.role !== 'school') return false;
  const { data: s } = await supabase.from('students')
    .select('school_id').eq('id', studentId).maybeSingle();
  if (!s) return false;
  return s.school_id === schoolIdOf(req.user);
}

// ============================================
// BUCHHALTUNG: Preisliste (pricing_templates)
// ============================================
// GET /api/pricing-templates — alle Templates der Schule
app.get('/api/pricing-templates', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschule darf Preise sehen' });
    const schoolId = schoolIdOf(req.user);
    const { data, error } = await supabase.from('pricing_templates')
      .select('*').eq('school_id', schoolId).order('sort_order').order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[Pricing GET]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pricing-templates — neues Template anlegen (nur Schule)
app.post('/api/pricing-templates', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Schule darf Preise anlegen' });
    const b = req.body || {};
    if (!b.name || b.price_cents == null) return res.status(400).json({ error: 'Name und Preis erforderlich' });
    const row = {
      id: generateId(),
      school_id: schoolIdOf(req.user),
      name: String(b.name).trim(),
      category: b.category || 'sonstiges',
      price_cents: Math.max(0, parseInt(b.price_cents) || 0),
      active: b.active !== false,
      auto_apply: b.auto_apply !== false,
      lesson_type_match: b.lesson_type_match ? String(b.lesson_type_match).trim() : null,
      sort_order: b.sort_order != null ? parseInt(b.sort_order) : 100
    };
    const { data, error } = await supabase.from('pricing_templates').insert(row).select().single();
    if (error) throw error;
    res.json({ template: data });
  } catch (err) {
    console.error('[Pricing POST]', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/pricing-templates/:id
app.put('/api/pricing-templates/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Schule darf Preise ändern' });
    const { data: existing } = await supabase.from('pricing_templates')
      .select('id').eq('id', req.params.id).eq('school_id', schoolIdOf(req.user)).maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Template nicht gefunden' });
    const b = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (b.name != null) updates.name = String(b.name).trim();
    if (b.category != null) updates.category = b.category;
    if (b.price_cents != null) updates.price_cents = Math.max(0, parseInt(b.price_cents) || 0);
    if (b.active != null) updates.active = !!b.active;
    if (b.auto_apply != null) updates.auto_apply = !!b.auto_apply;
    if (b.lesson_type_match !== undefined) updates.lesson_type_match = b.lesson_type_match ? String(b.lesson_type_match).trim() : null;
    if (b.sort_order != null) updates.sort_order = parseInt(b.sort_order);
    const { data, error } = await supabase.from('pricing_templates').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ template: data });
  } catch (err) {
    console.error('[Pricing PUT]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/pricing-templates/:id
app.delete('/api/pricing-templates/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Schule darf Preise löschen' });
    const { error } = await supabase.from('pricing_templates')
      .delete().eq('id', req.params.id).eq('school_id', schoolIdOf(req.user));
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[Pricing DELETE]', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// BUCHHALTUNG: Schüler-Abrechnung (Soll + Ist + Summen)
// ============================================
// GET /api/students/:id/billing — alles für die Abrechnungs-Ansicht
app.get('/api/students/:id/billing', authMiddleware, async (req, res) => {
  try {
    const allowed = await canAccessStudent(req, req.params.id);
    if (!allowed) return res.status(403).json({ error: 'Keine Berechtigung' });
    const [chargesRes, paymentsRes, studentRes, invoicesRes] = await Promise.all([
      supabase.from('student_charges').select('*').eq('student_id', req.params.id).order('charge_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('student_payments').select('*').eq('student_id', req.params.id).order('payment_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('students').select('id, name, email, license_class').eq('id', req.params.id).maybeSingle(),
      supabase.from('invoices').select('*').eq('student_id', req.params.id).order('invoice_date', { ascending: false }).order('created_at', { ascending: false })
    ]);
    const charges = chargesRes.data || [];
    const payments = paymentsRes.data || [];
    const invoices = invoicesRes.data || [];
    const totalCharges = charges.reduce(function(s, c){ return s + (c.total_cents || 0); }, 0);
    const totalPaid = payments.reduce(function(s, p){ return s + (p.amount_cents || 0); }, 0);
    res.json({
      student: studentRes.data || null,
      charges: charges,
      payments: payments,
      invoices: invoices,
      summary: {
        total_charges_cents: totalCharges,
        total_paid_cents: totalPaid,
        open_cents: totalCharges - totalPaid
      }
    });
  } catch (err) {
    console.error('[Billing GET]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students/:id/charges — manuelle Soll-Position anlegen
app.post('/api/students/:id/charges', authMiddleware, async (req, res) => {
  try {
    const allowed = await canAccessStudent(req, req.params.id);
    if (!allowed) return res.status(403).json({ error: 'Keine Berechtigung' });
    const b = req.body || {};
    if (!b.description || b.unit_price_cents == null) return res.status(400).json({ error: 'Beschreibung und Preis erforderlich' });
    const qty = b.quantity != null ? parseFloat(b.quantity) : 1;
    const unit = Math.max(0, parseInt(b.unit_price_cents) || 0);
    const total = Math.round(unit * qty);
    const { data: student } = await supabase.from('students').select('school_id').eq('id', req.params.id).single();
    const row = {
      id: generateId(),
      school_id: student.school_id,
      student_id: req.params.id,
      pricing_template_id: b.pricing_template_id || null,
      description: String(b.description).trim(),
      category: b.category || 'sonstiges',
      unit_price_cents: unit,
      quantity: qty,
      total_cents: total,
      charge_date: b.charge_date || new Date().toISOString().split('T')[0],
      created_by_role: req.user.role,
      created_by_id: req.user.id,
      source: 'manual',
      notes: b.notes || null
    };
    const { data, error } = await supabase.from('student_charges').insert(row).select().single();
    if (error) throw error;
    res.json({ charge: data });
  } catch (err) {
    console.error('[Charge POST]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/charges/:id — Position löschen (nur Fahrschule)
app.delete('/api/charges/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschule darf Positionen löschen' });
    const { data: charge } = await supabase.from('student_charges')
      .select('id, student_id').eq('id', req.params.id).maybeSingle();
    if (!charge) return res.status(404).json({ error: 'Position nicht gefunden' });
    const allowed = await canAccessStudent(req, charge.student_id);
    if (!allowed) return res.status(403).json({ error: 'Keine Berechtigung' });
    const { error } = await supabase.from('student_charges').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[Charge DELETE]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/students/:id/payments — Zahlung erfassen (optional an Rechnung)
app.post('/api/students/:id/payments', authMiddleware, async (req, res) => {
  try {
    const allowed = await canAccessStudent(req, req.params.id);
    if (!allowed) return res.status(403).json({ error: 'Keine Berechtigung' });
    const b = req.body || {};
    if (b.amount_cents == null) return res.status(400).json({ error: 'Betrag erforderlich' });
    const { data: student } = await supabase.from('students').select('school_id').eq('id', req.params.id).single();
    var invoiceId = b.invoice_id || null;
    // Wenn eine Rechnung referenziert wird: gehört sie diesem Schüler?
    if (invoiceId) {
      const { data: inv } = await supabase.from('invoices').select('id, student_id, total_cents, status').eq('id', invoiceId).maybeSingle();
      if (!inv || inv.student_id !== req.params.id) return res.status(400).json({ error: 'Ungültige Rechnungs-ID' });
      if (inv.status === 'storniert') return res.status(400).json({ error: 'Rechnung ist storniert' });
    }
    const row = {
      id: generateId(),
      school_id: student.school_id,
      student_id: req.params.id,
      amount_cents: Math.max(0, parseInt(b.amount_cents) || 0),
      payment_date: b.payment_date || new Date().toISOString().split('T')[0],
      payment_method: b.payment_method || 'bar',
      reference: b.reference || null,
      charge_id: b.charge_id || null,
      invoice_id: invoiceId,
      created_by_role: req.user.role,
      created_by_id: req.user.id,
      notes: b.notes || null
    };
    const { data, error } = await supabase.from('student_payments').insert(row).select().single();
    if (error) throw error;
    // Rechnungs-Status nachziehen
    if (invoiceId) {
      try { await refreshInvoiceStatus(invoiceId); } catch (e) { console.warn('[Invoice status]', e.message); }
    }
    res.json({ payment: data });
  } catch (err) {
    console.error('[Payment POST]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payments/:id (nur Fahrschule)
app.delete('/api/payments/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschule darf Zahlungen löschen' });
    const { data: pay } = await supabase.from('student_payments')
      .select('id, student_id, invoice_id').eq('id', req.params.id).maybeSingle();
    if (!pay) return res.status(404).json({ error: 'Zahlung nicht gefunden' });
    const allowed = await canAccessStudent(req, pay.student_id);
    if (!allowed) return res.status(403).json({ error: 'Keine Berechtigung' });
    const { error } = await supabase.from('student_payments').delete().eq('id', req.params.id);
    if (error) throw error;
    if (pay.invoice_id) {
      try { await refreshInvoiceStatus(pay.invoice_id); } catch (e) { console.warn('[Invoice status]', e.message); }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[Payment DELETE]', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// BUCHHALTUNG PHASE 2: Schul-Einstellungen (USt, Adresse)
// ============================================
app.get('/api/school/settings', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschule' });
    const schoolId = schoolIdOf(req.user);
    const { data, error } = await supabase.from('schools')
      .select('id, name, email, admin_name, tax_mode, tax_rate_percent, address_line1, address_line2, postal_code, city, phone, tax_id, bank_info')
      .eq('id', schoolId).maybeSingle();
    if (error) throw error;
    res.json(data || {});
  } catch (err) {
    console.error('[School Settings GET]', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/school/settings', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschule' });
    const schoolId = schoolIdOf(req.user);
    const b = req.body || {};
    const updates = {};
    if (b.tax_mode !== undefined) {
      if (b.tax_mode !== 'kleinunternehmer' && b.tax_mode !== 'regelbesteuerung') {
        return res.status(400).json({ error: 'Ungültiger USt-Modus' });
      }
      updates.tax_mode = b.tax_mode;
    }
    if (b.tax_rate_percent !== undefined) updates.tax_rate_percent = parseFloat(b.tax_rate_percent) || 0;
    if (b.address_line1 !== undefined) updates.address_line1 = b.address_line1 || null;
    if (b.address_line2 !== undefined) updates.address_line2 = b.address_line2 || null;
    if (b.postal_code   !== undefined) updates.postal_code   = b.postal_code || null;
    if (b.city          !== undefined) updates.city          = b.city || null;
    if (b.phone         !== undefined) updates.phone         = b.phone || null;
    if (b.tax_id        !== undefined) updates.tax_id        = b.tax_id || null;
    if (b.bank_info     !== undefined) updates.bank_info     = b.bank_info || null;
    if (Object.keys(updates).length === 0) return res.json({ success: true, updated: 0 });
    const { data, error } = await supabase.from('schools').update(updates).eq('id', schoolId).select().single();
    if (error) throw error;
    res.json({ success: true, school: data });
  } catch (err) {
    console.error('[School Settings PUT]', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// BUCHHALTUNG PHASE 2: Rechnungen
// ============================================
// Helper: Rechnungsnummer berechnen (nächste fortlaufende pro Schule/Jahr)
async function nextInvoiceNumber(schoolId, year) {
  const { data } = await supabase.from('invoices')
    .select('invoice_seq').eq('school_id', schoolId).eq('invoice_year', year)
    .order('invoice_seq', { ascending: false }).limit(1);
  const lastSeq = (data && data[0]) ? (data[0].invoice_seq || 0) : 0;
  const nextSeq = lastSeq + 1;
  return { seq: nextSeq, number: year + '-' + String(nextSeq).padStart(4, '0') };
}

// Helper: Rechnungs-Status aus Zahlungen ableiten
async function refreshInvoiceStatus(invoiceId) {
  const { data: inv } = await supabase.from('invoices')
    .select('id, total_cents, status').eq('id', invoiceId).maybeSingle();
  if (!inv) return null;
  if (inv.status === 'storniert') return inv; // Storno nicht überschreiben
  const { data: pays } = await supabase.from('student_payments')
    .select('amount_cents').eq('invoice_id', invoiceId);
  const paid = (pays || []).reduce(function(s, p){ return s + (p.amount_cents || 0); }, 0);
  var newStatus = 'offen';
  if (paid >= inv.total_cents && inv.total_cents > 0) newStatus = 'bezahlt';
  else if (paid > 0) newStatus = 'teilbezahlt';
  if (newStatus !== inv.status) {
    await supabase.from('invoices').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', invoiceId);
  }
  return Object.assign({}, inv, { status: newStatus, paid_cents: paid });
}

// GET /api/invoices — alle Rechnungen der Schule (optional Filter ?student_id=)
app.get('/api/invoices', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschule' });
    const schoolId = schoolIdOf(req.user);
    var q = supabase.from('invoices').select('*').eq('school_id', schoolId);
    if (req.query.student_id) q = q.eq('student_id', req.query.student_id);
    if (req.query.status) q = q.eq('status', req.query.status);
    const { data, error } = await q.order('invoice_date', { ascending: false }).order('invoice_seq', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[Invoices GET]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/:id — eine Rechnung inkl. Items + Schule + Schüler + Zahlungen (für PDF)
app.get('/api/invoices/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschule' });
    const schoolId = schoolIdOf(req.user);
    const { data: invoice } = await supabase.from('invoices').select('*').eq('id', req.params.id).maybeSingle();
    if (!invoice || invoice.school_id !== schoolId) return res.status(404).json({ error: 'Rechnung nicht gefunden' });
    const [itemsRes, schoolRes, studentRes, paysRes] = await Promise.all([
      supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id).order('sort_order').order('created_at'),
      supabase.from('schools').select('id, name, email, admin_name, tax_mode, tax_rate_percent, address_line1, address_line2, postal_code, city, phone, tax_id, bank_info').eq('id', schoolId).maybeSingle(),
      supabase.from('students').select('id, name, email, license_class').eq('id', invoice.student_id).maybeSingle(),
      supabase.from('student_payments').select('*').eq('invoice_id', invoice.id).order('payment_date')
    ]);
    res.json({
      invoice: invoice,
      items: itemsRes.data || [],
      school: schoolRes.data || null,
      student: studentRes.data || null,
      payments: paysRes.data || []
    });
  } catch (err) {
    console.error('[Invoice GET]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices — Rechnung aus offenen Charges erzeugen
// body: { student_id, charge_ids: [], invoice_date?, due_date?, notes? }
app.post('/api/invoices', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschule' });
    const b = req.body || {};
    if (!b.student_id) return res.status(400).json({ error: 'student_id erforderlich' });
    if (!Array.isArray(b.charge_ids) || b.charge_ids.length === 0) return res.status(400).json({ error: 'Mindestens eine Position auswählen' });
    const schoolId = schoolIdOf(req.user);
    // Schüler validieren
    const { data: student } = await supabase.from('students')
      .select('id, name, school_id').eq('id', b.student_id).maybeSingle();
    if (!student || student.school_id !== schoolId) return res.status(403).json({ error: 'Schüler nicht in dieser Fahrschule' });
    // Charges laden + prüfen
    const { data: charges } = await supabase.from('student_charges')
      .select('*').in('id', b.charge_ids).eq('student_id', b.student_id).eq('school_id', schoolId);
    if (!charges || charges.length === 0) return res.status(400).json({ error: 'Keine gültigen Positionen gefunden' });
    var already = charges.find(function(c){ return c.invoice_id; });
    if (already) return res.status(400).json({ error: 'Position bereits in einer Rechnung: ' + already.description });
    // Schul-Snapshot
    const { data: school } = await supabase.from('schools')
      .select('name, tax_mode, tax_rate_percent, address_line1, address_line2, postal_code, city').eq('id', schoolId).single();
    const taxMode = (school && school.tax_mode) || 'kleinunternehmer';
    const taxRate = parseFloat(school && school.tax_rate_percent) || 0;
    const subtotal = charges.reduce(function(s, c){ return s + (c.total_cents || 0); }, 0);
    // Bei Kleinunternehmer: keine Steuer ausgewiesen; bei Regelbesteuerung: total ist BRUTTO (inkl. MwSt)
    var taxCents = 0, total = subtotal;
    if (taxMode === 'regelbesteuerung' && taxRate > 0) {
      // Annahme: bisherige Preise sind NETTO → MwSt drauf
      taxCents = Math.round(subtotal * (taxRate / 100));
      total = subtotal + taxCents;
    }
    // Adresse zu String
    var addrLines = [];
    if (school && school.address_line1) addrLines.push(school.address_line1);
    if (school && school.address_line2) addrLines.push(school.address_line2);
    var plzCity = [(school && school.postal_code) || '', (school && school.city) || ''].filter(Boolean).join(' ').trim();
    if (plzCity) addrLines.push(plzCity);
    const today = new Date().toISOString().split('T')[0];
    const year = parseInt((b.invoice_date || today).substring(0, 4)) || new Date().getFullYear();
    const num = await nextInvoiceNumber(schoolId, year);
    const invoiceId = generateId();
    const invoiceRow = {
      id: invoiceId,
      school_id: schoolId,
      student_id: b.student_id,
      invoice_number: num.number,
      invoice_year: year,
      invoice_seq: num.seq,
      invoice_date: b.invoice_date || today,
      due_date: b.due_date || null,
      status: 'offen',
      tax_mode: taxMode,
      tax_rate_percent: taxMode === 'regelbesteuerung' ? taxRate : 0,
      subtotal_cents: subtotal,
      tax_cents: taxCents,
      total_cents: total,
      school_name_snapshot: (school && school.name) || null,
      school_address_snapshot: addrLines.join('\n') || null,
      student_name_snapshot: student.name,
      student_address_snapshot: null,
      notes: b.notes || null,
      created_by_role: req.user.role,
      created_by_id: req.user.id
    };
    const { error: insErr } = await supabase.from('invoices').insert(invoiceRow);
    if (insErr) throw insErr;
    // Items kopieren
    const itemRows = charges.map(function(c, idx){
      return {
        id: generateId(),
        invoice_id: invoiceId,
        charge_id: c.id,
        description: c.description,
        category: c.category,
        unit_price_cents: c.unit_price_cents,
        quantity: c.quantity,
        total_cents: c.total_cents,
        sort_order: (idx + 1) * 10
      };
    });
    if (itemRows.length > 0) {
      const { error: itErr } = await supabase.from('invoice_items').insert(itemRows);
      if (itErr) throw itErr;
    }
    // Charges mit invoice_id markieren
    await supabase.from('student_charges').update({ invoice_id: invoiceId, updated_at: new Date().toISOString() }).in('id', b.charge_ids);
    res.json({ invoice: invoiceRow, items: itemRows });
  } catch (err) {
    console.error('[Invoice POST]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices/:id/cancel — Rechnung stornieren (GoBD: kein Löschen)
app.post('/api/invoices/:id/cancel', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschule' });
    const schoolId = schoolIdOf(req.user);
    const { data: inv } = await supabase.from('invoices').select('id, school_id, status').eq('id', req.params.id).maybeSingle();
    if (!inv || inv.school_id !== schoolId) return res.status(404).json({ error: 'Rechnung nicht gefunden' });
    if (inv.status === 'storniert') return res.status(400).json({ error: 'Bereits storniert' });
    const reason = (req.body && req.body.reason) || null;
    await supabase.from('invoices').update({
      status: 'storniert',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason,
      updated_at: new Date().toISOString()
    }).eq('id', req.params.id);
    // Charges wieder freigeben → können in neue Rechnung
    await supabase.from('student_charges').update({ invoice_id: null, updated_at: new Date().toISOString() }).eq('invoice_id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[Invoice CANCEL]', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// TAGESÜBERSICHT — Soll-Positionen nach Datumsbereich
// GET /api/accounting/daily-summary?from=YYYY-MM-DD&to=YYYY-MM-DD&instructor_id=&student_id=
// Liefert alle Soll-Positionen (student_charges) der Schule im Bereich,
// inkl. Schüler-Name + optional Fahrlehrer-Name (über lesson_id) + Steueraufteilung.
// Default ohne from/to = heute.
// ============================================
app.get('/api/accounting/daily-summary', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschule' });
    const schoolId = schoolIdOf(req.user);
    const today = new Date().toISOString().split('T')[0];
    const from = (req.query.from && /^\d{4}-\d{2}-\d{2}$/.test(req.query.from)) ? req.query.from : today;
    const to = (req.query.to && /^\d{4}-\d{2}-\d{2}$/.test(req.query.to)) ? req.query.to : from;
    const instructorFilter = req.query.instructor_id || null;
    const studentFilter = req.query.student_id || null;

    // Schul-Steuerinfo für Netto/USt-Aufteilung
    const { data: school } = await supabase.from('schools')
      .select('name, tax_mode, tax_rate_percent').eq('id', schoolId).single();
    const taxMode = (school && school.tax_mode) || 'kleinunternehmer';
    const taxRate = parseFloat(school && school.tax_rate_percent) || 0;

    // Charges holen
    let q = supabase.from('student_charges')
      .select('id, student_id, charge_date, description, category, unit_price_cents, quantity, total_cents, lesson_id, invoice_id, source, created_at')
      .eq('school_id', schoolId)
      .gte('charge_date', from)
      .lte('charge_date', to)
      .order('charge_date', { ascending: true })
      .order('created_at', { ascending: true });
    if (studentFilter) q = q.eq('student_id', studentFilter);
    const { data: charges, error: chErr } = await q;
    if (chErr) throw chErr;
    const list = charges || [];

    // Schüler- und Lesson-Daten in Bulk laden
    const studentIds = Array.from(new Set(list.map(function(c){ return c.student_id; }).filter(Boolean)));
    const lessonIds = Array.from(new Set(list.map(function(c){ return c.lesson_id; }).filter(Boolean)));
    const [studRes, lessRes] = await Promise.all([
      studentIds.length > 0
        ? supabase.from('students').select('id, name').in('id', studentIds)
        : Promise.resolve({ data: [] }),
      lessonIds.length > 0
        ? supabase.from('lessons').select('id, instructor_id, instructors(id, name)').in('id', lessonIds)
        : Promise.resolve({ data: [] })
    ]);
    const studMap = {};
    (studRes.data || []).forEach(function(s){ studMap[s.id] = s.name; });
    const lessMap = {};
    (lessRes.data || []).forEach(function(l){
      lessMap[l.id] = {
        instructor_id: l.instructor_id || null,
        instructor_name: (l.instructors && l.instructors.name) || null
      };
    });

    // Aufbereitung + optionaler Instructor-Filter
    const items = [];
    list.forEach(function(c){
      const less = c.lesson_id ? lessMap[c.lesson_id] : null;
      const instructor_id = less ? less.instructor_id : null;
      if (instructorFilter && instructor_id !== instructorFilter) return;
      items.push({
        id: c.id,
        charge_date: c.charge_date,
        student_id: c.student_id,
        student_name: studMap[c.student_id] || '—',
        description: c.description,
        category: c.category || 'sonstiges',
        unit_price_cents: c.unit_price_cents,
        quantity: c.quantity,
        total_cents: c.total_cents,
        lesson_id: c.lesson_id,
        instructor_id: instructor_id,
        instructor_name: less ? less.instructor_name : null,
        invoice_id: c.invoice_id,
        source: c.source
      });
    });

    // Summen — total_cents ist NETTO (analog zu Rechnungserstellung)
    const netto = items.reduce(function(s, c){ return s + (c.total_cents || 0); }, 0);
    let ust = 0, brutto = netto;
    if (taxMode === 'regelbesteuerung' && taxRate > 0) {
      ust = Math.round(netto * (taxRate / 100));
      brutto = netto + ust;
    }

    // Instructor- und Student-Filterlisten (für UI-Dropdown)
    // Nur Aktive aus dieser Schule
    const [allInstrRes, allStudRes] = await Promise.all([
      supabase.from('instructors').select('id, name').eq('school_id', schoolId).order('name'),
      supabase.from('students').select('id, name').eq('school_id', schoolId).order('name')
    ]);

    res.json({
      from: from,
      to: to,
      school: { name: (school && school.name) || '', tax_mode: taxMode, tax_rate_percent: taxRate },
      items: items,
      totals: { netto_cents: netto, ust_cents: ust, brutto_cents: brutto },
      filters: {
        instructors: allInstrRes.data || [],
        students: allStudRes.data || []
      }
    });
  } catch (err) {
    console.error('[Daily Summary]', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// FALLBACK: Landing-Page (/) + App-SPA (/app/*)
// ============================================
// /app ohne abschliessenden Slash -> auf /app/ umleiten (wichtig fuer <base href>)
// RegExp damit NUR exakt "/app" matcht und nicht auch "/app/"
app.get(/^\/app$/, (req, res) => {
  res.redirect(301, '/app/');
});

// Alle App-Routen liefern die App-SPA aus
app.get('/app/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Alles andere liefert die Landing-Page aus
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'landing', 'index.html'));
});

// ============================================
// START
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('[FahrDoc] Server running on port ' + PORT + ' (Supabase)');
});
