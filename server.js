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
const { sendVerificationEmail, sendPasswordResetEmail, sendInviteEmail, generateCode } = require('./email');
const Stripe = require('stripe');
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

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
        const subscriptionId = session.subscription;
        if (schoolId && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await supabase.from('subscriptions').upsert({
            school_id: schoolId,
            stripe_customer_id: session.customer,
            stripe_subscription_id: subscriptionId,
            status: sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            instructor_quantity: sub.items.data[0]?.quantity || 1,
            trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'school_id' });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const { data: existing } = await supabase.from('subscriptions')
          .select('school_id').eq('stripe_subscription_id', sub.id).single();
        if (existing) {
          await supabase.from('subscriptions').update({
            status: sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            instructor_quantity: sub.items.data[0]?.quantity || 1,
            trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            updated_at: new Date().toISOString()
          }).eq('school_id', existing.school_id);
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
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'allow' }));

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
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await supabase.from('verification_codes').insert({
        id: generateId(), user_id: id, user_role: 'school',
        email, code: vCode, type: 'email_verify', expires_at: expiresAt
      });
      await sendVerificationEmail(email, fullName, vCode);

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

      // Send verification email
      const vCode = generateCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await supabase.from('verification_codes').insert({
        id: generateId(), user_id: id, user_role: 'instructor',
        email, code: vCode, type: 'email_verify', expires_at: expiresAt
      });
      await sendVerificationEmail(email, fullName, vCode);

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
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await supabase.from('verification_codes').insert({
        id: generateId(), user_id: id, user_role: 'student',
        email, code: vCode, type: 'email_verify', expires_at: expiresAt
      });
      await sendVerificationEmail(email, fullName, vCode);

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
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await supabase.from('verification_codes').insert({
      id: generateId(), user_id: userId, user_role: role,
      email, code: vCode, type: 'email_verify', expires_at: expiresAt
    });
    await sendVerificationEmail(email, name, vCode);

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

    const { data: instructors } = await supabase.from('instructors')
      .select('id, name, email, phone').eq('school_id', schoolId);
    const { data: students } = await supabase.from('students')
      .select('id, name, email, license_class, status, created_at').eq('school_id', schoolId);
    const { data: sub } = await supabase.from('subscriptions')
      .select('*').eq('school_id', schoolId).single();

    const { count: totalLessons } = await supabase.from('lessons')
      .select('id', { count: 'exact', head: true }).eq('school_id', schoolId);

    // New students this week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const mondayStr = monday.toISOString();

    const { data: newStudentsThisWeek } = await supabase.from('students')
      .select('id, name, created_at').eq('school_id', schoolId).gte('created_at', mondayStr);

    const { data: recentLessons } = await supabase.from('lessons')
      .select('*, students(name)').eq('school_id', schoolId)
      .order('date', { ascending: false }).limit(5);

    // Attach ratings and student_name
    for (const l of (recentLessons || [])) {
      l.student_name = l.students?.name || '?';
      delete l.students;
      const { data: ratings } = await supabase.from('skill_ratings')
        .select('skill_name, rating').eq('lesson_id', l.id);
      l.ratings = {};
      (ratings || []).forEach(r => { l.ratings[r.skill_name] = r.rating; });
    }

    res.json({
      instructors: instructors || [], students: students || [], subscription: sub,
      stats: { totalLessons: totalLessons || 0 },
      recentLessons: recentLessons || [],
      newStudentsThisWeek: newStudentsThisWeek || []
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.get('/api/school/instructors', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur für Fahrschulen' });

    const { data: instructors } = await supabase.from('instructors')
      .select('id, name, email, phone').eq('school_id', req.user.id);

    for (const inst of (instructors || [])) {
      const { count } = await supabase.from('student_instructors')
        .select('student_id', { count: 'exact', head: true }).eq('instructor_id', inst.id);
      inst.studentCount = count || 0;
    }

    const { data: codes } = await supabase.from('invite_codes')
      .select('*').eq('school_id', req.user.id).eq('type', 'instructor')
      .order('created_at', { ascending: false });

    res.json({ instructors: instructors || [], codes: codes || [] });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.get('/api/school/students', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur für Fahrschulen' });

    const { data: students } = await supabase.from('students')
      .select('*').eq('school_id', req.user.id);

    for (const st of (students || [])) {
      const instructors = await getStudentInstructors(st.id);
      st.instructor_name = instructors.length > 0 ? instructors.map(i => i.name).join(', ') : '—';

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

    const { data: codes } = await supabase.from('invite_codes')
      .select('*').eq('school_id', req.user.id).eq('type', 'student')
      .order('created_at', { ascending: false });

    res.json({ students: students || [], codes: codes || [] });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

app.post('/api/school/codes', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur für Fahrschulen' });
    const { type } = req.body;
    if (!type || !['instructor', 'student'].includes(type)) return res.status(400).json({ error: 'Ungültiger Typ' });

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

    const { data: lessons } = await supabase.from('lessons')
      .select('*, instructors(name)')
      .eq('student_id', stuId)
      .order('date', { ascending: false });

    for (const l of (lessons || [])) {
      l.instructor_name = l.instructors?.name || '?';
      delete l.instructors;
      const { data: ratings } = await supabase.from('skill_ratings')
        .select('skill_name, rating').eq('lesson_id', l.id);
      l.ratings = {};
      (ratings || []).forEach(r => { l.ratings[r.skill_name] = r.rating; });
      const { data: images } = await supabase.from('lesson_images')
        .select('id, filename').eq('lesson_id', l.id);
      l.images = images || [];
    }

    const instructors = await getStudentInstructors(stuId);
    const instructorNames = instructors.map(i => i.name).join(', ') || '—';

    const { data: school } = await supabase.from('schools')
      .select('id, name').eq('id', req.user.school_id).single();
    const { data: sub } = await supabase.from('subscriptions')
      .select('*').eq('school_id', req.user.school_id).single();
    const isExpired = sub ? (new Date() > new Date(sub.trial_end) && !sub.is_active) : false;

    res.json({
      lessons: lessons || [],
      instructorName: instructorNames,
      instructors,
      school,
      isExpired
    });
  } catch (err) {
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

    for (const l of (lessons || [])) {
      const { data: ratings } = await supabase.from('skill_ratings')
        .select('skill_name, rating').eq('lesson_id', l.id);
      l.ratings = {};
      (ratings || []).forEach(r => { l.ratings[r.skill_name] = r.rating; });
    }
    res.json(lessons || []);
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

    const { data: lessons } = await supabase.from('lessons')
      .select('*, instructors(name)')
      .eq('student_id', student.id)
      .order('date', { ascending: false });

    for (const l of (lessons || [])) {
      l.instructor_name = l.instructors?.name || '?';
      delete l.instructors;
      const { data: ratings } = await supabase.from('skill_ratings')
        .select('skill_name, rating').eq('lesson_id', l.id);
      l.ratings = {};
      (ratings || []).forEach(r => { l.ratings[r.skill_name] = r.rating; });
      const { data: images } = await supabase.from('lesson_images')
        .select('id, filename').eq('lesson_id', l.id);
      l.images = images || [];
    }

    const instructors = await getStudentInstructors(student.id);
    const instructorNames = instructors.map(i => i.name).join(', ') || '—';

    res.json({ student, lessons: lessons || [], instructorName: instructorNames, instructors });
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
    const status = studentId ? 'geplant' : 'offen';

    await supabase.from('scheduled_lessons').insert({
      id, instructor_id: targetInstructorId, school_id: schoolId,
      student_id: studentId || null, date, start_time: startTime, end_time: endTime,
      type: type || 'Übungsfahrt', license_class: licenseClass || 'B',
      status, notes: notes || null,
      vehicle_id: vehicleId || null,
      created_by_role: req.user.role, created_by_id: req.user.id
    });

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
    if (slot.status !== 'geplant') return res.status(400).json({ error: 'Nur geplante Termine können bestätigt werden' });

    await supabase.from('scheduled_lessons')
      .update({ status: 'bestätigt' }).eq('id', req.params.id);

    if (req.user.role === 'school') {
      const dayStr = new Date(slot.date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
      await createNotification(slot.instructor_id, 'instructor', 'schedule_confirmed',
        'Termin bestätigt', `Termin am ${dayStr} um ${slot.start_time} wurde bestätigt`, req.params.id);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ============================================
// NOTIFICATION ROUTES
// ============================================

app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const { data: notifs } = await supabase.from('notifications')
      .select('*')
      .eq('user_id', req.user.id).eq('user_role', req.user.role)
      .order('created_at', { ascending: false }).limit(50);

    const { count: unreadCount } = await supabase.from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id).eq('user_role', req.user.role).eq('is_read', 0);

    res.json({ notifications: notifs || [], unreadCount: unreadCount || 0 });
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
    priceId: process.env.STRIPE_PRICE_ID || ''
  });
});

// ============================================
// STRIPE: Create Checkout Session
// ============================================
app.post('/api/stripe/create-checkout', authMiddleware, async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe nicht konfiguriert' });
  if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschulen können Abos verwalten' });

  try {
    const { quantity } = req.body; // number of instructors
    const instructorCount = Math.max(1, parseInt(quantity) || 1);

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
      payment_method_types: ['card', 'sepa_debit'],
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: instructorCount
      }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { school_id: req.user.id }
      },
      metadata: { school_id: req.user.id },
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
// STRIPE: Get subscription status
// ============================================
app.get('/api/stripe/subscription', authMiddleware, async (req, res) => {
  if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschulen' });

  try {
    const { data: sub } = await supabase.from('subscriptions')
      .select('*').eq('school_id', req.user.id).single();

    if (!sub) {
      // Check if within free trial (14 days since school creation)
      const { data: school } = await supabase.from('schools')
        .select('created_at').eq('id', req.user.id).single();
      const created = new Date(school?.created_at || Date.now());
      const trialEnd = new Date(created.getTime() + 14 * 24 * 60 * 60 * 1000);
      const now = new Date();
      return res.json({
        status: now < trialEnd ? 'trial' : 'expired',
        trial_end: trialEnd.toISOString(),
        days_remaining: Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))),
        instructor_quantity: 0
      });
    }

    // Sync with Stripe if we have a subscription
    if (stripe && sub.stripe_subscription_id) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
        const updated = {
          status: stripeSub.status,
          current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: stripeSub.cancel_at_period_end,
          instructor_quantity: stripeSub.items.data[0]?.quantity || 1,
          trial_end: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString()
        };
        await supabase.from('subscriptions').update(updated).eq('school_id', req.user.id);
        Object.assign(sub, updated);
      } catch (e) { /* use cached data */ }
    }

    const now = new Date();
    const isTrialing = sub.status === 'trialing';
    const trialEnd = sub.trial_end ? new Date(sub.trial_end) : null;
    const daysRemaining = trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))) : null;

    res.json({
      status: sub.status,
      trial_end: sub.trial_end,
      days_remaining: isTrialing ? daysRemaining : null,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
      instructor_quantity: sub.instructor_quantity || 1
    });
  } catch (err) {
    console.error('[Stripe Sub Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// STRIPE: Update instructor quantity
// ============================================
app.post('/api/stripe/update-quantity', authMiddleware, async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe nicht konfiguriert' });
  if (req.user.role !== 'school') return res.status(403).json({ error: 'Nur Fahrschulen' });

  try {
    const { quantity } = req.body;
    const newQty = Math.max(1, parseInt(quantity) || 1);

    const { data: sub } = await supabase.from('subscriptions')
      .select('stripe_subscription_id').eq('school_id', req.user.id).single();
    if (!sub?.stripe_subscription_id) return res.status(404).json({ error: 'Kein Abo gefunden' });

    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [{ id: stripeSub.items.data[0].id, quantity: newQty }],
      proration_behavior: 'create_prorations'
    });

    await supabase.from('subscriptions').update({
      instructor_quantity: newQty, updated_at: new Date().toISOString()
    }).eq('school_id', req.user.id);

    res.json({ success: true, quantity: newQty });
  } catch (err) {
    console.error('[Stripe Update Error]', err);
    res.status(500).json({ error: err.message });
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
        student_name: b.students?.name || '—'
      };
    });
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

    for (const v of (vehicles || [])) {
      const { data: bookings } = await supabase.from('scheduled_lessons')
        .select('id, date, start_time, end_time, type, instructor_id, instructors(name)')
        .eq('vehicle_id', v.id)
        .eq('date', date);
      v.bookings = (bookings || []).map(b => ({
        id: b.id, date: b.date, start_time: b.start_time, end_time: b.end_time,
        type: b.type, instructor_id: b.instructor_id, instructor_name: b.instructors?.name || '?'
      }));
    }

    res.json({ vehicles: vehicles || [], instructors: instructors || [] });
  } catch (err) {
    console.error('Vehicle bookings error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ============================================
// FALLBACK: SPA
// ============================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// START
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[FahrDoc] Server running on port ${PORT} (Supabase)`);
});
