import express from 'express';
import Stripe from 'stripe';
import Razorpay from 'razorpay';
import { createHmac, createHash, randomInt, timingSafeEqual } from 'node:crypto';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectMongo, collection, seedCollection } from './src/server/mongo';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  SEED_USERS,
  SEED_EVENT_CATEGORIES,
  SEED_VENDOR_CATEGORIES,
  SEED_VENDORS,
  SEED_EVENTS,
  SEED_CHECKLIST,
  SEED_BUDGET,
  SEED_ENQUIRIES,
  SEED_QUOTATIONS,
  SEED_BOOKINGS,
  SEED_REVIEWS,
  SEED_NOTIFICATIONS,
} from './src/data/seedData';
import { DEMO_VENDORS, buildServicesForVendors } from './src/data/demoVendors';
import {
  User,
  Vendor,
  UserEvent,
  EventChecklistItem,
  EventBudgetItem,
  Enquiry,
  Quotation,
  Booking,
  PaymentTransaction,
  VendorReview,
  ChatMessage,
  Conversation,
  NotificationItem,
  EventCategory,
  VendorCategory,
  VendorService,
} from './src/types';

const app = express();

// Express 4 does not forward rejected promises from async handlers, which left requests hanging
// forever (e.g. when MongoDB errors) and the UI stuck on loading skeletons. Forward them to the error handler.
for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
  const original = (app as any)[method].bind(app);
  (app as any)[method] = (path: any, ...handlers: any[]) => {
    if (!handlers.length) return original(path);
    return original(path, ...handlers.map((h: any) => (typeof h === 'function' && h.length < 4)
      ? (req: any, res: any, next: any) => { try { const out = h(req, res, next); if (out && typeof out.catch === 'function') out.catch(next); } catch (e) { next(e); } }
      : h));
  };
}
const PORT = Number(process.env.PORT || 3000);
const normalizeCity = (value: unknown) => { const city = String(value || '').trim().toLowerCase(); return city === 'bangalore' || city === 'bengaluru' ? 'bengaluru' : city; };
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-env';
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'change-me-in-env') { throw new Error('JWT_SECRET must be set in production.'); }
const stripeClient = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const stripeCurrency = (process.env.STRIPE_CURRENCY || 'inr').toLowerCase();
const stripeMode = (process.env.STRIPE_MODE || 'test').toLowerCase();
const stripeAdvancePercent = Math.min(90, Math.max(1, Number(process.env.STRIPE_ADVANCE_PERCENT || 20)));
const appBaseUrl = (process.env.APP_BASE_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const googleOAuthClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;
const mailTransport = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: String(process.env.SMTP_SECURE || 'false') === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }) : null;
const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER || '';
const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || '';
const otpCooldownMs = Math.max(30, Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60)) * 1000;
const otpRequestWindowMs = 15 * 60 * 1000;
const otpRequestCounts = new Map<string, { count: number; resetAt: number }>();
const otpVerifyCounts = new Map<string, { count: number; resetAt: number }>();
function hashOtp(email: string, otp: string, salt: string) { return createHash('sha256').update(`${email}:${salt}:${otp}:${JWT_SECRET}`).digest('hex'); }
async function sendEmail(to: string, subject: string, text: string, html?: string) {
  if (!mailTransport || !mailFrom || !to) { console.warn('Email notification not sent: SMTP configuration or recipient is missing.'); return false; }
  try { await mailTransport.sendMail({ from: mailFrom, to, subject, text, ...(html ? { html } : {}) }); return true; }
  catch (error: any) { console.error('Email delivery failed:', String(error?.code || 'SMTP_ERROR')); return false; }
}
function publicUser(userDoc: any): User { const { passwordHash, googleSub, ...safe } = userDoc; return safe as User; }
function otpRateLimited(map: Map<string, {count:number;resetAt:number}>, key: string, max: number) { const now=Date.now(); let entry=map.get(key); if (!entry || entry.resetAt <= now) { entry={count:0,resetAt:now+otpRequestWindowMs}; map.set(key,entry); } entry.count++; return entry.count > max; }


app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === 'http://localhost:3001' || origin === 'http://127.0.0.1:3001') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});


function signToken(user: User) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}
function getTokenUserId(req: express.Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as jwt.JwtPayload;
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch { return null; }
}
function getCurrentUser(req: express.Request): User | null {
  const id = getTokenUserId(req);
  return id ? users.find((u) => u.id === id) || null : null;
}
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ success: false, message: 'Please log in to continue.' });
  (req as any).currentUser = user;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getCurrentUser(req);
  if (!user || user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required.' });
  (req as any).currentUser = user;
  next();
}

function isActiveBookingStatus(status: string) {
  return ['pending', 'confirmed', 'in_progress'].includes(status);
}

function buildHourlySlots(start = '10:00', end = '19:00', durationMinutes = 60) {
  const slots: { startTime: string; endTime: string }[] = [];
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let cursor = sh * 60 + sm;
  const finish = eh * 60 + em;
  const duration = Math.max(30, Number(durationMinutes) || 60);
  while (cursor + duration <= finish) {
    const next = cursor + duration;
    const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    slots.push({ startTime: fmt(cursor), endTime: fmt(next) });
    cursor = next;
  }
  return slots;
}


// Mongo-backed stores loaded at startup. Mutations are persisted to MongoDB.
let users: User[] = [];
let eventCategories: EventCategory[] = [];
let vendorCategories: VendorCategory[] = [];
let vendors: Vendor[] = [];
let events: UserEvent[] = [];
let checklistItems: EventChecklistItem[] = [];
let budgetItems: EventBudgetItem[] = [];
let enquiries: Enquiry[] = [];
let quotations: Quotation[] = [];
let bookings: Booking[] = [];
let reviews: VendorReview[] = [];
let notifications: NotificationItem[] = [];
let payments: PaymentTransaction[] = [];
let savedFavoriteVendorIds: string[] = [];
let vendorServices: VendorService[] = [];

// The browser tells us which origin it is running on so Stripe returns the customer to the SAME origin
// (otherwise a localhost / 127.0.0.1 / LAN-IP mismatch makes the login token disappear). Only trusted hosts are accepted.
function safeReturnOrigin(candidate?: string): string {
  try {
    if (!candidate) return appBaseUrl;
    const url = new URL(candidate);
    const host = url.hostname;
    const trusted = new Set<string>(['localhost', '127.0.0.1', '[::1]', new URL(appBaseUrl).hostname]);
    if (process.env.RENDER_EXTERNAL_URL) trusted.add(new URL(process.env.RENDER_EXTERNAL_URL).hostname);
    if (trusted.has(host) && (url.protocol === 'http:' || url.protocol === 'https:')) return url.origin;
  } catch { /* fall through */ }
  return appBaseUrl;
}

const stripeCheckedAt = new Map<string, number>();
// Confirms Stripe Checkout payments straight from Stripe, independent of webhooks.
async function reconcileStripePayments(opts: { sessionId?: string; customerId?: string; limit?: number }) {
  if (!stripeClient) return 0;
  const col = collection<any>('payments');
  const query: any = { provider: 'stripe', status: 'pending', stripeCheckoutSessionId: { $exists: true } };
  if (opts.sessionId) query.stripeCheckoutSessionId = opts.sessionId;
  if (opts.customerId) query.customerId = opts.customerId;
  // Stripe Checkout sessions expire after 24h, so older pending records are not worth re-checking.
  if (!opts.sessionId) query.createdAt = { $gte: new Date(Date.now() - 25 * 3600 * 1000).toISOString() };
  const pending = await col.find(query).sort({ createdAt: -1 }).limit(opts.limit || 5).toArray();
  let applied = 0;
  for (const record of pending) {
    // Throttle: don't hit Stripe for the same payment more than once every 15 seconds (abandoned checkouts).
    const last = stripeCheckedAt.get(record.id) || 0;
    if (!opts.sessionId && Date.now() - last < 15000) continue;
    stripeCheckedAt.set(record.id, Date.now());
    try {
      const session = await stripeClient.checkout.sessions.retrieve(record.stripeCheckoutSessionId);
      if (session.payment_status === 'paid') {
        const outcome = await applyStripeSession(session);
        if (outcome.status === 'applied') applied += 1;
      } else if (session.status === 'expired') {
        await col.updateOne({ id: record.id, status: 'pending' }, { $set: { status: 'failed', failedAt: new Date().toISOString() } });
      }
    } catch (error) { console.error('Stripe reconcile failed for', record.stripeCheckoutSessionId, error); }
  }
  return applied;
}

type StripeApplyResult = { status: 'applied' | 'duplicate' | 'pending' | 'error'; code?: number; message?: string };
// Applies a verified, paid Stripe Checkout Session to the booking exactly once. Shared by the webhook
// and by the return-URL confirmation so payments are recorded even when webhooks cannot reach the server
// (for example local development without the Stripe CLI).
async function applyStripeSession(session: Stripe.Checkout.Session): Promise<StripeApplyResult> {
  if (session.payment_status !== 'paid') return { status: 'pending' };
  const paymentCol = collection<any>('payments');
  const payment = await paymentCol.findOne({ stripeCheckoutSessionId: session.id });
  if (!payment) {
    console.error('No pending EventSphere payment for Stripe session', session.id);
    return { status: 'error', code: 500, message: 'Payment record not found' };
  }
  if (payment.status === 'success') return { status: 'duplicate' };
  if (session.metadata?.bookingId !== payment.bookingId || session.metadata?.paymentId !== payment.id) {
    console.error('Stripe metadata mismatch for session', session.id);
    return { status: 'error', code: 400, message: 'Payment metadata mismatch' };
  }
  const booking = await collection<any>('bookings').findOne({ id: payment.bookingId });
  if (!booking) return { status: 'error', code: 500, message: 'Booking not found' };
  const expectedMinor = Math.round(Number(payment.amount) * 100);
  if (session.currency?.toLowerCase() !== String(payment.currency || stripeCurrency).toLowerCase() || Number(session.amount_total) !== expectedMinor) {
    console.error('Stripe amount/currency mismatch for session', session.id);
    return { status: 'error', code: 400, message: 'Payment amount mismatch' };
  }
  const now = new Date().toISOString();
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || '';
  const nextPaid = Number(booking.paidAmount || 0) + Number(payment.amount);
  const nextBalance = Math.max(0, Number(booking.totalAmount) - nextPaid);
  const nextPaymentStatus = nextBalance <= 0 ? 'fully_paid' : 'advance_paid';
  // Conditional update prevents the same pending record being applied twice.
  const claim = await paymentCol.updateOne(
    { id: payment.id, status: { $ne: 'success' } },
    { $set: { status: 'success', stripePaymentIntentId: paymentIntentId, paidAt: now } }
  );
  if (!claim.modifiedCount) return { status: 'duplicate' };
  await collection<any>('bookings').updateOne(
    { id: booking.id },
    { $set: { paidAmount: nextPaid, balanceAmount: nextBalance, paymentStatus: nextPaymentStatus, paymentTransactionId: paymentIntentId || session.id, bookingStatus: 'confirmed' },
      $push: { timeline: { $each: [{ time: now, status: 'Payment Received', note: `Stripe payment of ${payment.amount} ${payment.currency} verified. Session: ${session.id}` }], $position: 0 } } as any }
  );
  const localBooking = bookings.find((b) => b.id === booking.id);
  if (localBooking) {
    localBooking.paidAmount = nextPaid;
    localBooking.balanceAmount = nextBalance;
    localBooking.paymentStatus = nextPaymentStatus as Booking['paymentStatus'];
    localBooking.bookingStatus = 'confirmed';
    localBooking.paymentTransactionId = paymentIntentId || session.id;
    localBooking.timeline.unshift({ time: now, status: 'Payment Received', note: `Stripe payment verified. Session: ${session.id}` });
  }
  const localPayment = payments.find((item: any) => item.id === payment.id) as any;
  if (localPayment) { localPayment.status = 'success'; localPayment.stripePaymentIntentId = paymentIntentId; localPayment.paidAt = now; }
  const customerRecord = await collection<any>('users').findOne({ id: booking.customerId });
  const customerEmail = String(booking.customerEmail || customerRecord?.email || '');
  if (customerEmail) void sendEmail(customerEmail, `EventSphere payment received · ${booking.bookingReference}`, `Your payment was verified.\nBooking: ${booking.bookingReference}\nService: ${booking.packageName || booking.vendorName}\nTotal booking amount: ₹${booking.totalAmount}\nAmount paid in this transaction: ₹${payment.amount}\nAmount paid so far: ₹${nextPaid}\nRemaining balance: ₹${nextBalance}\nPayment type: ${nextBalance <= 0 ? 'Full payment' : 'Advance / partial payment'}\nGateway: Stripe\nTransaction reference: ${paymentIntentId || session.id}\nPayment date: ${now}\nBooking status: confirmed`);
  await collection<any>('notifications').insertOne({
    id: `notif_stripe_${session.id}`, userId: booking.customerId,
    title: 'Stripe payment confirmed', message: `Your payment for booking ${booking.bookingReference} was verified.`,
    type: 'payment', read: false, link: '/?view=my-bookings', createdAt: now,
  }).catch(() => undefined);
  return { status: 'applied' };
}

// Stripe webhooks must be registered before express.json so signature verification
// receives the exact raw request body sent by Stripe.
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeClient || !webhookSecret || typeof signature !== 'string') {
    return res.status(400).send('Stripe webhook is not configured.');
  }

  let event: Stripe.Event;
  try {
    event = stripeClient.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error);
    return res.status(400).send('Invalid Stripe webhook signature.');
  }

  try {
    // Check prior processing first. Record the event only after handling it, so a transient
    // database failure does not cause Stripe retries to be incorrectly acknowledged.
    const eventCol = collection<any>('stripeWebhookEvents');
    if (await eventCol.findOne({ _id: event.id })) return res.json({ received: true, duplicate: true });

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      const outcome = await applyStripeSession(session);
      if (outcome.status === 'error') return res.status(outcome.code || 500).json({ received: false, error: outcome.message });
      if (outcome.status === 'pending') return res.json({ received: true, pending: true });
      if (outcome.status === 'duplicate') return res.json({ received: true, duplicate: true });
    } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await collection<any>('payments').updateOne({ stripeCheckoutSessionId: session.id, status: 'pending' }, { $set: { status: 'failed', failedAt: new Date().toISOString() } });
      const localPayment: any = payments.find((item: any) => item.stripeCheckoutSessionId === session.id);
      if (localPayment && localPayment.status === 'pending') localPayment.status = 'failed';
    }
    await eventCol.insertOne({ _id: event.id, type: event.type, receivedAt: new Date().toISOString() }).catch((error: any) => { if (error?.code !== 11000) throw error; });
    return res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing failed:', error);
    return res.status(500).json({ received: false, error: 'Webhook processing failed' });
  }
});

app.use(express.json({ limit: '25mb' }));
app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok', service: 'eventsphere' } }));

// Seed initial conversations & messages
let conversations: Conversation[] = [
  {
    id: 'conv_1',
    customerId: 'user_cust_1',
    customerName: 'Rahul Sharma',
    customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    vendorId: 'vend_1',
    vendorName: 'Royal Mandap & Floral Sculptors',
    vendorAvatar: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=200&auto=format&fit=crop&q=80',
    lastMessage: 'I have attached the quotation for your neon backdrop setup.',
    lastMessageTime: '2026-08-16T09:05:00Z',
    unreadCountCustomer: 0,
    unreadCountVendor: 0,
    eventId: 'evt_user_1',
    eventTitle: "Rahul's 30th Birthday Gala",
  },
  {
    id: 'conv_2',
    customerId: 'user_cust_1',
    customerName: 'Rahul Sharma',
    customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    vendorId: 'vend_5',
    vendorName: 'DJ Shadow & Sonic Wave Sound Systems',
    vendorAvatar: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&auto=format&fit=crop&q=80',
    lastMessage: 'Thanks for the payment! Track list received. See you on 15th Sept!',
    lastMessageTime: '2026-08-10T15:05:00Z',
    unreadCountCustomer: 0,
    unreadCountVendor: 0,
    eventId: 'evt_user_1',
    eventTitle: "Rahul's 30th Birthday Gala",
  },
];

let messages: ChatMessage[] = [
  {
    id: 'msg_1',
    conversationId: 'conv_1',
    senderId: 'user_cust_1',
    senderRole: 'customer',
    senderName: 'Rahul Sharma',
    text: 'Hi Vikram! We are planning a 30th Birthday on 15th Sept at Saffron Grand Rooftop. Can we do a modern neon sign + chrome balloon installation?',
    createdAt: '2026-08-15T14:35:00Z',
    read: true,
  },
  {
    id: 'msg_2',
    conversationId: 'conv_1',
    senderId: 'user_vend_1',
    senderRole: 'vendor',
    senderName: 'Vikramaditya Rao',
    text: 'Hello Rahul! Absolutely. We have custom acrylic neon signs and high-gloss chrome organic balloon arches. Let me prepare a customized itemized quote for you.',
    createdAt: '2026-08-15T15:00:00Z',
    read: true,
  },
  {
    id: 'msg_3',
    conversationId: 'conv_1',
    senderId: 'user_vend_1',
    senderRole: 'vendor',
    senderName: 'Vikramaditya Rao',
    text: 'I have attached the quotation for your neon backdrop setup.',
    createdAt: '2026-08-16T09:05:00Z',
    read: true,
  },
];

// Lazy Gemini API Client Helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (e) {
      console.error('Failed to initialize Gemini Client:', e);
    }
  }
  return aiClient;
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Auth & Session Routes
app.get('/api/auth/me', (req, res) => {
  res.json({ success: true, data: { user: getCurrentUser(req), availableUsers: [] } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, phone, password, role } = req.body;
  if (!password || (!email && !phone)) return res.status(400).json({ success: false, message: 'Email or mobile number and password are required.' });
  const userDoc = await collection<any>('users').findOne(email ? { email: String(email).trim().toLowerCase() } : { phone: String(phone).trim() });
  if (!userDoc?.passwordHash || !(await bcrypt.compare(password, userDoc.passwordHash))) return res.status(401).json({ success: false, message: 'Invalid login details.' });
  if (userDoc.suspended || userDoc.disabled || userDoc.status === 'suspended' || userDoc.status === 'disabled') return res.status(403).json({ success: false, message: 'This account is currently disabled. Contact EventSphere support.' });
  if (role && userDoc.role !== role) return res.status(403).json({ success: false, message: `This account is registered as a ${userDoc.role}.` });
  if (userDoc.role === 'vendor') { const vendorProfile = await collection<any>('vendors').findOne({ userId: userDoc.id }); if (vendorProfile?.suspended) return res.status(403).json({ success: false, message: 'This vendor account is currently suspended. Contact EventSphere support.' }); }
  const user = { ...userDoc } as User & { passwordHash?: string };
  delete user.passwordHash;
  users = users.map((u) => (u.id === user.id ? user : u));
  res.json({ success: true, data: { user, token: signToken(user) } });
});

// Email OTP login. Generic request responses prevent account enumeration.
app.post('/api/auth/otp/request', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  const ip = String(req.ip || req.socket.remoteAddress || 'unknown');
  if (otpRateLimited(otpRequestCounts, `${ip}:${email}`, 5) || otpRateLimited(otpRequestCounts, `ip:${ip}`, 20)) return res.status(429).json({ success: false, message: 'Too many requests. Please wait before trying again.' });
  const generic = { success: true, data: { message: 'If an eligible account exists for this email, a sign-in code has been sent.', expiresIn: 300, resendAfter: Math.ceil(otpCooldownMs / 1000) } };
  try {
    const user = await collection<any>('users').findOne({ email });
    if (!user || !['customer', 'vendor'].includes(user.role) || user.suspended || user.disabled || user.status === 'suspended' || user.status === 'disabled') return res.json(generic);
    if (user.role === 'vendor') { const profile = await collection<any>('vendors').findOne({ userId: user.id }); if (profile?.suspended) return res.json(generic); }
    const otpCol = collection<any>('emailOtpChallenges');
    const prior = await otpCol.findOne({ email });
    if (prior?.lastSentAt && Date.now() - new Date(prior.lastSentAt).getTime() < otpCooldownMs) return res.json(generic);
    const otp = String(randomInt(0, 1000000)).padStart(6, '0');
    const salt = createHash('sha256').update(`${Date.now()}:${randomInt(0, 0x7fffffff)}`).digest('hex').slice(0, 24);
    const now = new Date();
    const otpHash = hashOtp(email, otp, salt);
    await otpCol.replaceOne({ email }, { email, userId: user.id, otpHash, salt, attempts: 0, createdAt: now, expiresAt: new Date(now.getTime() + 5 * 60 * 1000), lastSentAt: now, usedAt: null }, { upsert: true });
    const delivered = await sendEmail(email, 'Your EventSphere sign-in code', `Your EventSphere verification code is ${otp}. It expires in 5 minutes and can only be used once. If you did not request this, ignore this email.`, `<p>Your EventSphere verification code is</p><p style="font-size:28px;font-weight:bold;letter-spacing:8px">${otp}</p><p>This code expires in 5 minutes and can only be used once.</p><p>If you did not request this, ignore this email.</p>`);
    if (!delivered) await otpCol.deleteOne({ email, otpHash });
    return res.json(generic);
  } catch (error: any) { console.error('OTP request failed:', String(error?.code || 'OTP_REQUEST_ERROR')); return res.json(generic); }
});

app.post('/api/auth/otp/verify', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const otp = String(req.body?.otp || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, message: 'Enter your email and the six-digit code.' });
  const ip = String(req.ip || req.socket.remoteAddress || 'unknown');
  if (otpRateLimited(otpVerifyCounts, `${ip}:${email}`, 10) || otpRateLimited(otpVerifyCounts, `ip:${ip}`, 40)) return res.status(429).json({ success: false, message: 'Too many verification attempts. Request a new code later.' });
  const otpCol = collection<any>('emailOtpChallenges');
  const challenge = await otpCol.findOne({ email });
  if (!challenge || challenge.usedAt || new Date(challenge.expiresAt).getTime() <= Date.now() || Number(challenge.attempts || 0) >= 5) return res.status(400).json({ success: false, message: 'The code is invalid or expired. Request a new one.' });
  const candidateHash = hashOtp(email, otp, String(challenge.salt || ''));
  const expectedHash = Buffer.from(String(challenge.otpHash || ''), 'hex');
  const providedHash = Buffer.from(candidateHash, 'hex');
  const otpMatches = expectedHash.length === providedHash.length && timingSafeEqual(expectedHash, providedHash);
  if (!otpMatches) {
    await otpCol.updateOne({ email, otpHash: challenge.otpHash, usedAt: null }, { $inc: { attempts: 1 } });
    return res.status(400).json({ success: false, message: 'The code is invalid or expired. Request a new one.' });
  }
  const claimed = await otpCol.findOneAndUpdate({ email, otpHash: candidateHash, usedAt: null, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } }, { $set: { usedAt: new Date() } }, { returnDocument: 'after' });
  if (!claimed) return res.status(400).json({ success: false, message: 'The code is invalid or expired. Request a new one.' });
  const userDoc = await collection<any>('users').findOne({ id: challenge.userId, email });
  if (!userDoc || !['customer', 'vendor'].includes(userDoc.role)) return res.status(403).json({ success: false, message: 'This account cannot use email OTP login.' });
  if (userDoc.role === 'vendor') { const profile = await collection<any>('vendors').findOne({ userId: userDoc.id }); if (profile?.suspended) return res.status(403).json({ success: false, message: 'This vendor account is suspended.' }); }
  const user = publicUser(userDoc); users = users.map(u => u.id === user.id ? user : u);
  return res.json({ success: true, data: { user, token: signToken(user) } });
});

// Google login is restricted to customer accounts. Role is always assigned server-side.
app.post('/api/auth/google', async (req, res) => {
  const credential = String(req.body?.credential || '');
  if (!credential || !googleOAuthClient || !process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ success: false, message: 'Google sign-in is not configured.' });
  try {
    const ticket = await googleOAuthClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true || !['accounts.google.com', 'https://accounts.google.com'].includes(String(payload.iss || '')) || !payload.exp || Number(payload.exp) * 1000 <= Date.now() || payload.aud !== process.env.GOOGLE_CLIENT_ID) return res.status(401).json({ success: false, message: 'Google could not verify this identity.' });
    const email = payload.email.toLowerCase();
    let userDoc = await collection<any>('users').findOne({ googleSub: payload.sub }) || await collection<any>('users').findOne({ email });
    if (userDoc && userDoc.role !== 'customer') return res.status(403).json({ success: false, message: 'Google sign-in is available to customer accounts only.' });
    if (userDoc && (userDoc.suspended || userDoc.disabled || userDoc.status === 'suspended' || userDoc.status === 'disabled')) return res.status(403).json({ success: false, message: 'This account is currently disabled. Contact EventSphere support.' });
    if (userDoc) {
      if (userDoc.googleSub && userDoc.googleSub !== payload.sub) return res.status(409).json({ success: false, message: 'This email is linked to a different Google account.' });
      if (!userDoc.googleSub) {
        const link = await collection<any>('users').updateOne({ id: userDoc.id, email, role: 'customer', $or: [{ googleSub: { $exists: false } }, { googleSub: null }] }, { $set: { googleSub: payload.sub, googleLinkedAt: new Date().toISOString() } });
        if (link.modifiedCount) userDoc = await collection<any>('users').findOne({ id: userDoc.id });
        else userDoc = await collection<any>('users').findOne({ id: userDoc.id });
        if (!userDoc || userDoc.googleSub !== payload.sub) return res.status(409).json({ success: false, message: 'This email could not be safely linked to this Google account.' });
      }
    } else {
      const now = new Date().toISOString();
      const created = { id: `user_google_${payload.sub}`, name: String(payload.name || email.split('@')[0]).slice(0, 120), email, phone: '', role: 'customer', city: '', avatar: payload.picture || '', createdAt: now, googleSub: payload.sub, googleLinkedAt: now };
      try { await collection<any>('users').insertOne(created); userDoc = created; }
      catch { userDoc = await collection<any>('users').findOne({ email }); if (!userDoc || userDoc.role !== 'customer' || userDoc.googleSub !== payload.sub) return res.status(409).json({ success: false, message: 'Could not safely create this customer account.' }); }
    }
    if (!userDoc) return res.status(401).json({ success: false, message: 'Google sign-in failed.' });
    const user = publicUser(userDoc); users = [...users.filter(u => u.id !== user.id), user];
    return res.json({ success: true, data: { user, token: signToken(user) } });
  } catch { return res.status(401).json({ success: false, message: 'Google sign-in could not be verified. Try again.' }); }
});

app.post('/api/auth/logout', (_req, res) => res.json({ success: true, data: { message: 'Logged out' } }));

app.post('/api/auth/register', async (req, res) => {
  const { name, email, phone, password, role, city, businessName, categoryId } = req.body;
  const accountRole = role === 'vendor' ? 'vendor' : 'customer';
  if (!name || !email || (accountRole === 'vendor' && !password)) return res.status(400).json({ success: false, message: 'Name, email and vendor password are required.' });
  const normalizedEmail = String(email).trim().toLowerCase();
  if (await collection<any>('users').findOne({ email: normalizedEmail })) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
  const user: User = { id: `user_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, name: String(name).trim(), email: normalizedEmail, phone: String(phone || ''), role: accountRole, city: city || 'Bangalore', createdAt: new Date().toISOString() };
  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
  await collection<any>('users').insertOne({ ...user, ...(passwordHash ? { passwordHash } : {}) });
  users.push(user);
  if (accountRole === 'vendor') {
    const selectedCat = vendorCategories.find((c) => c.id === categoryId) || vendorCategories[0];
    const vendor: Vendor = {
      id: `vend_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, userId: user.id,
      businessName: businessName || `${name}'s Event Studio`, slug: (businessName || `${name}-studio`).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''),
      categoryId: selectedCat?.id || 'general', categoryName: selectedCat?.name || 'Event Services', subcategory: selectedCat?.subcategories?.[0] || 'General Service',
      city: city || 'Bangalore', areasServed: [city || 'Bangalore'], pincode: '', serviceRadiusKm: 50, startingPrice: 0, rating: 0, reviewCount: 0,
      verified: false, featured: false, coverImage: '', logo: '', about: '', experienceYears: 0, services: [], packages: [], portfolio: [], bookedDates: [], faq: [],
      phone: String(phone || ''), email: normalizedEmail, address: city || '', responseTimeHours: 24, completedEventsCount: 0, verificationStatus: 'pending'
    };
    vendors.push(vendor); await collection<any>('vendors').insertOne(vendor);
  }
  res.status(201).json({ success: true, data: { user, token: signToken(user) } });
});

// 2. Categories Routes
app.get('/api/categories/events', (req, res) => {
  res.json({ success: true, data: eventCategories });
});

app.get('/api/categories/vendors', (req, res) => {
  res.json({ success: true, data: vendorCategories });
});


// 3. Vendor Service Submission & Verification
app.get('/api/services/mine', requireAuth, async (req, res) => {
  const user = getCurrentUser(req)!;
  if (user.role !== 'vendor') return res.status(403).json({ success: false, message: 'Vendor access required.' });
  const vendor = await collection<any>('vendors').findOne({ userId: user.id });
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor profile not found.' });
  const data = await collection<any>('vendorServices').find({ vendorId: vendor.id }).sort({ createdAt: -1 }).toArray();
  vendorServices = [...vendorServices.filter((s) => s.vendorId !== vendor.id), ...(data as VendorService[])];
  res.json({ success: true, data });
});

app.get('/api/services', async (req, res) => {
  const status = String(req.query.status || 'approved');
  let data = await collection<any>('vendorServices').find({ status }).toArray();
  const suspendedVendorIds = new Set(vendors.filter((v:any) => v.suspended === true).map(v => v.id));
  data = data.filter((service:any) => !suspendedVendorIds.has(service.vendorId));
  res.json({ success: true, data });
});

app.post('/api/services', requireAuth, async (req, res) => {
  const user = getCurrentUser(req)!;
  if (user.role !== 'vendor') return res.status(403).json({ success: false, message: 'Vendor access required.' });
  const vendor = vendors.find((v) => v.userId === user.id);
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor profile not found.' });
  const {
    serviceName, categoryId, subcategory, description, price, city,
    eventTypes, includedServices, images, coverImage, contactPhone, contactEmail
  } = req.body;
  if (!serviceName || !categoryId || !description || Number(price) <= 0) {
    return res.status(400).json({ success: false, message: 'Service name, category, description and valid price are required.' });
  }
  const cat = vendorCategories.find(c => c.id === categoryId);
  const now = new Date().toISOString();
  const service: VendorService = {
    id: `svc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    vendorId: vendor.id,
    serviceName: String(serviceName).trim(),
    categoryId: String(categoryId),
    categoryName: cat?.name || vendor.categoryName,
    subcategory: subcategory || cat?.subcategories?.[0] || '',
    description: String(description).trim(),
    price: Number(price),
    city: city || vendor.city,
    eventTypes: Array.isArray(eventTypes) ? eventTypes : [],
    includedServices: Array.isArray(includedServices) ? includedServices : [],
    images: Array.isArray(images) ? images.slice(0, 8) : [],
    coverImage: typeof coverImage === 'string' ? coverImage : '',
    contactPhone: contactPhone || vendor.phone,
    contactEmail: contactEmail || vendor.email,
    status: 'pending',
    createdAt: now,
    updatedAt: now
  };
  try {
    await collection<any>('vendorServices').insertOne(service);
    vendorServices.unshift(service);
    if (adminEmail) void sendEmail(adminEmail, `EventSphere service approval requested: ${service.serviceName}`, `Vendor: ${vendor.businessName}\nService: ${service.serviceName}\nCategory: ${service.categoryName}\nCity: ${service.city}\nSubmitted: ${now}\nPlease review this request in the EventSphere admin dashboard.`);
    return res.status(201).json({ success: true, data: service });
  } catch (err: any) {
    console.error('Service submission failed:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Could not save the service. Check your MongoDB connection and try again.' });
  }
});

app.put('/api/services/:id', requireAuth, async (req, res) => {
  const user = getCurrentUser(req)!;
  const idx = vendorServices.findIndex(s => s.id === req.params.id);
  if (idx < 0) return res.status(404).json({ success: false, message: 'Service not found.' });
  const vendor = vendors.find(v => v.id === vendorServices[idx].vendorId);
  if (user.role !== 'admin' && (!vendor || vendor.userId !== user.id)) return res.status(403).json({ success: false, message: 'Not authorized.' });
  vendorServices[idx] = { ...vendorServices[idx], ...req.body, updatedAt: new Date().toISOString() };
  await collection<any>('vendorServices').replaceOne({ id: vendorServices[idx].id }, vendorServices[idx], { upsert: true });
  res.json({ success: true, data: vendorServices[idx] });
});

app.get('/api/admin/services', requireAdmin, async (req, res) => {
  const status = String(req.query.status || 'pending');
  const filter = status === 'all' ? {} : { status };
  const data = await collection<any>('vendorServices').find(filter).sort({ createdAt: -1 }).toArray();
  // Refresh the local cache from MongoDB so the admin screen never relies on stale process memory.
  vendorServices = data as VendorService[];
  res.json({ success: true, data });
});

app.post('/api/admin/services/:id/approve', requireAdmin, async (req, res) => {
  const service = await collection<any>('vendorServices').findOne({ id: req.params.id }) as VendorService | null;
  if (!service) return res.status(404).json({ success: false, message: 'Service request not found.' });

  const wasAlreadyApproved = service.status === 'approved';
  service.status = 'approved';
  service.rejectionReason = undefined;
  service.updatedAt = new Date().toISOString();

  const v = await collection<any>('vendors').findOne({ id: service.vendorId }) as Vendor | null;
  if (!v) return res.status(409).json({ success: false, message: 'The vendor profile linked to this service could not be found. Ask the vendor to contact support.' });

  const updatedVendor: Vendor = {
    ...v,
    businessName: v.businessName || service.serviceName,
    categoryId: service.categoryId,
    categoryName: service.categoryName,
    subcategory: service.subcategory || v.subcategory,
    city: service.city,
    areasServed: Array.from(new Set([...(v.areasServed || []), service.city].filter(Boolean))),
    startingPrice: service.price,
    about: service.description,
    services: service.includedServices,
    coverImage: service.coverImage || service.images[0] || v.coverImage,
    logo: service.coverImage || service.images[0] || v.logo,
    portfolio: [service.coverImage, ...service.images].filter(Boolean).map((url, i) => ({ id: `${service.id}_${i}`, url: String(url), caption: service.serviceName })),
    phone: service.contactPhone || v.phone,
    email: service.contactEmail || v.email,
    verified: true,
    verificationStatus: 'verified'
  };

  await collection<any>('vendors').replaceOne({ id: updatedVendor.id }, updatedVendor, { upsert: true });
  await collection<any>('vendorServices').replaceOne({ id: service.id }, service, { upsert: true });
  vendors = [...vendors.filter((item) => item.id !== updatedVendor.id), updatedVendor];
  vendorServices = [...vendorServices.filter((item) => item.id !== service.id), service];
  const vendorUser = await collection<any>('users').findOne({ id: v.userId });
  if (!wasAlreadyApproved && vendorUser?.email) void sendEmail(vendorUser.email, `Your EventSphere service was approved: ${service.serviceName}`, `Hello ${vendorUser.name || 'Vendor'},\nYour service \"${service.serviceName}\" has been approved and is eligible to appear in the customer marketplace.`);
  res.json({ success: true, data: service });
});

app.post('/api/admin/services/:id/reject', requireAdmin, async (req, res) => {
  const service = await collection<any>('vendorServices').findOne({ id: req.params.id }) as VendorService | null;
  if (!service) return res.status(404).json({ success: false, message: 'Service request not found.' });
  const updated: VendorService = {
    ...service,
    status: 'rejected',
    rejectionReason: String(req.body.rejectionReason || 'Please review the service details and resubmit.'),
    updatedAt: new Date().toISOString()
  };
  await collection<any>('vendorServices').replaceOne({ id: updated.id }, updated, { upsert: true });
  vendorServices = [...vendorServices.filter((item) => item.id !== updated.id), updated];
  const vendorProfile = await collection<any>('vendors').findOne({ id: updated.vendorId });
  const vendorUser = vendorProfile ? await collection<any>('users').findOne({ id: vendorProfile.userId }) : null;
  if (vendorUser?.email) void sendEmail(vendorUser.email, `Action required for your EventSphere service: ${updated.serviceName}`, `Hello ${vendorUser.name || 'Vendor'},\nYour service \"${updated.serviceName}\" needs changes or was rejected. Reason: ${updated.rejectionReason}`);
  res.json({ success: true, data: updated });
});

// 3. Vendors Discovery & Search API
app.get('/api/vendors', async (req, res) => {
  const {
    q,
    category,
    city,
    minPrice,
    maxPrice,
    rating,
    verified,
    eventType,
    sort,
  } = req.query;

  const persistedVendors = await collection<any>('vendors').find({}).toArray();
  vendors = persistedVendors as Vendor[];
  let results = [...vendors].filter((v) => v.verified === true || v.verificationStatus === 'verified');

  // Text search (businessName, about, services, subcategory, categoryName)
  if (q && typeof q === 'string') {
    const query = q.toLowerCase();
    results = results.filter(
      (v) =>
        v.businessName.toLowerCase().includes(query) ||
        v.categoryName.toLowerCase().includes(query) ||
        v.subcategory.toLowerCase().includes(query) ||
        v.city.toLowerCase().includes(query) ||
        v.about.toLowerCase().includes(query) ||
        v.services.some((s) => s.toLowerCase().includes(query))
    );
  }

  // Category filter
  if (category && typeof category === 'string' && category !== 'all') {
    results = results.filter(
      (v) => v.categoryId === category || v.categoryName.toLowerCase() === category.toLowerCase()
    );
  }

  // City filter
  if (city && typeof city === 'string' && city !== 'all') {
    results = results.filter(
      (v) =>
        normalizeCity(v.city) === normalizeCity(city) ||
        v.areasServed.some((a) => normalizeCity(a).includes(normalizeCity(city)))
    );
  }

  // Price range filter
  if (minPrice) {
    const min = Number(minPrice);
    if (!isNaN(min)) results = results.filter((v) => v.startingPrice >= min);
  }
  if (maxPrice) {
    const max = Number(maxPrice);
    if (!isNaN(max)) results = results.filter((v) => v.startingPrice <= max);
  }

  // Rating filter
  if (rating) {
    const minRating = Number(rating);
    if (!isNaN(minRating)) results = results.filter((v) => v.rating >= minRating);
  }

  // Verified filter
  if (verified === 'true') {
    results = results.filter((v) => v.verified === true);
  }

  // Sort
  if (sort === 'rating') {
    results.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'price_asc') {
    results.sort((a, b) => a.startingPrice - b.startingPrice);
  } else if (sort === 'price_desc') {
    results.sort((a, b) => b.startingPrice - a.startingPrice);
  } else if (sort === 'reviews') {
    results.sort((a, b) => b.reviewCount - a.reviewCount);
  } else {
    // Default: Featured first, then rating
    results.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.rating - a.rating);
  }

  res.json({
    success: true,
    count: results.length,
    data: results,
  });
});

app.get('/api/vendors/mine', requireAuth, (req, res) => {
  const user = getCurrentUser(req)!;
  if (user.role !== 'vendor') return res.status(403).json({ success: false, message: 'Vendor access required.' });
  const vendor = vendors.find(v => v.userId === user.id);
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor profile not found.' });
  res.json({ success: true, data: vendor });
});

app.get('/api/vendors/:id', async (req, res) => {
  vendors = await collection<any>('vendors').find({}).toArray() as Vendor[];
  const vendor = vendors.find((v) => v.id === req.params.id || v.slug === req.params.id);
  if (!vendor) {
    return res.status(404).json({ success: false, message: 'Vendor not found' });
  }
  const viewer = getCurrentUser(req);
  if (((vendor as any).suspended || !vendor.verified) && viewer?.role !== 'admin' && viewer?.id !== vendor.userId) {
    return res.status(404).json({ success: false, message: 'Vendor not found' });
  }

  const vendorReviews = reviews.filter((r) => r.vendorId === vendor.id);

  res.json({
    success: true,
    data: {
      ...vendor,
      reviews: vendorReviews,
    },
  });
});

app.put('/api/vendors/:id/availability', requireAuth, async (req, res) => {
  const user = getCurrentUser(req)!;
  const index = vendors.findIndex((v) => v.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Vendor not found.' });
  if (user.role !== 'admin' && vendors[index].userId !== user.id) return res.status(403).json({ success: false, message: 'Not authorized.' });
  vendors[index].workingHours = {
    start: String(req.body.start || '10:00'), end: String(req.body.end || '19:00'),
    slotDurationMinutes: Number(req.body.slotDurationMinutes || 60), days: Array.isArray(req.body.days) ? req.body.days : ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    blockedDates: Array.isArray(req.body.blockedDates) ? req.body.blockedDates : [],
  };
  await collection<any>('vendors').replaceOne({ id: vendors[index].id }, vendors[index], { upsert: true });
  res.json({ success: true, data: vendors[index] });
});

app.put('/api/vendors/:id', requireAuth, async (req, res) => {
  const user = getCurrentUser(req)!;
  const index = vendors.findIndex((v) => v.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Vendor not found' });
  }
  if (user.role !== 'admin' && vendors[index].userId !== user.id) {
    return res.status(403).json({ success: false, message: 'You can only edit your own business profile.' });
  }

  // Only profile fields may be edited here. Verification, featured, suspension, rating and ownership are admin-controlled.
  const body = req.body || {};
  const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  const patch: any = {};
  if ('businessName' in body) { const n = text(body.businessName, 120); if (n.length < 2) return res.status(400).json({ success: false, message: 'Business name is too short.' }); patch.businessName = n; }
  if ('about' in body) patch.about = text(body.about, 3000);
  if ('phone' in body) patch.phone = text(body.phone, 30);
  if ('email' in body) patch.email = text(body.email, 160);
  if ('address' in body) patch.address = text(body.address, 300);
  if ('city' in body) patch.city = text(body.city, 80);
  if ('pincode' in body) patch.pincode = text(body.pincode, 12);
  if ('experienceYears' in body) patch.experienceYears = Math.max(0, Math.min(80, Number(body.experienceYears) || 0));
  if ('startingPrice' in body) patch.startingPrice = Math.max(0, Number(body.startingPrice) || 0);
  if ('serviceRadiusKm' in body) patch.serviceRadiusKm = Math.max(0, Math.min(2000, Number(body.serviceRadiusKm) || 0));
  if ('areasServed' in body && Array.isArray(body.areasServed)) patch.areasServed = body.areasServed.map((a: unknown) => text(a, 80)).filter(Boolean).slice(0, 30);
  if ('services' in body && Array.isArray(body.services)) patch.services = body.services.map((a: unknown) => text(a, 100)).filter(Boolean).slice(0, 40);
  if ('coverImage' in body) patch.coverImage = text(body.coverImage, 3_000_000);
  if ('logo' in body) patch.logo = text(body.logo, 3_000_000);
  if ('packages' in body && Array.isArray(body.packages)) {
    patch.packages = body.packages.slice(0, 8).map((p: any, i: number) => ({
      id: text(p?.id, 80) || `pkg_${Date.now()}_${i}`, name: text(p?.name, 80) || `Package ${i + 1}`,
      tier: ['basic', 'standard', 'premium', 'custom'].includes(p?.tier) ? p.tier : 'custom',
      price: Math.max(0, Number(p?.price) || 0), description: text(p?.description, 600),
      servicesIncluded: Array.isArray(p?.servicesIncluded) ? p.servicesIncluded.map((x: unknown) => text(x, 100)).filter(Boolean).slice(0, 30) : [],
      duration: text(p?.duration, 60) || 'Custom', staffCount: Math.max(0, Number(p?.staffCount) || 0),
      additionalCharges: text(p?.additionalCharges, 300), terms: text(p?.terms, 600),
    }));
  }
  if ('portfolio' in body && Array.isArray(body.portfolio)) {
    patch.portfolio = body.portfolio.slice(0, 24).map((p: any, i: number) => ({ id: text(p?.id, 80) || `port_${Date.now()}_${i}`, url: text(p?.url, 3_000_000), caption: text(p?.caption, 160), eventType: text(p?.eventType, 60) })).filter((p: any) => p.url);
  }
  vendors[index] = { ...vendors[index], ...patch };
  await collection<any>('vendors').replaceOne({ id: vendors[index].id }, vendors[index], { upsert: true });
  res.json({ success: true, data: vendors[index] });
});

// 4. Customer Events API
app.get('/api/events', async (req, res) => {
  const user = getCurrentUser(req);
  const userEvents = user ? events.filter((e) => e.userId === user.id) : [];
  res.json({ success: true, data: userEvents });
});

app.post('/api/events', requireAuth, async (req, res) => {
  const {
    title,
    eventType,
    eventCategorySlug,
    date,
    time,
    locationCity,
    venueAddress,
    guestCount,
    totalBudget,
    requiredServices,
  } = req.body;

  if (!title || !eventType || !date) {
    return res.status(400).json({ success: false, message: 'Title, event type, and date are required.' });
  }

  const newEvent: UserEvent = {
    id: `evt_user_${Date.now()}`,
    userId: getCurrentUser(req)!.id,
    title,
    eventType,
    eventCategorySlug: eventCategorySlug || 'custom',
    date,
    time: time || '18:00',
    locationCity: locationCity || 'Bangalore',
    venueAddress: venueAddress || '',
    guestCount: Number(guestCount) || 100,
    totalBudget: Number(totalBudget) || 150000,
    currency: 'INR',
    spentAmount: 0,
    requiredServices: requiredServices || ['Venues', 'Food & Catering', 'Decoration & Florals'],
    status: 'planning',
    createdAt: new Date().toISOString(),
  };

  events.push(newEvent);
  await collection<any>('events').insertOne(newEvent);

  // Auto-populate checklist based on category defaults
  const cat = eventCategories.find((c) => c.slug === eventCategorySlug || c.name === eventType);
  if (cat && cat.defaultChecklist) {
    cat.defaultChecklist.forEach((item, idx) => {
      checklistItems.push({
        id: `chk_${Date.now()}_${idx}`,
        eventId: newEvent.id,
        title: item.task,
        category: item.category,
        completed: false,
      });
    });
  }

  // Auto-populate initial budget categories based on split
  if (cat && cat.defaultBudgetSplit) {
    cat.defaultBudgetSplit.forEach((split, idx) => {
      const planned = Math.round((newEvent.totalBudget * split.percentage) / 100);
      budgetItems.push({
        id: `bud_${Date.now()}_${idx}`,
        eventId: newEvent.id,
        category: split.category,
        plannedAmount: planned,
        quotedAmount: 0,
        paidAmount: 0,
      });
    });
  }

  res.json({ success: true, data: newEvent });
});

app.put('/api/events/:id', requireAuth, async (req, res) => {
  const index = events.findIndex((e) => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  events[index] = { ...events[index], ...req.body };
  await collection<any>('events').replaceOne({ id: events[index].id }, events[index], { upsert: true });
  res.json({ success: true, data: events[index] });
});

app.delete('/api/events/:id', requireAuth, async (req, res) => {
  events = events.filter((e) => e.id !== req.params.id);
  await collection<any>('events').deleteOne({ id: req.params.id });
  checklistItems = checklistItems.filter((c) => c.eventId !== req.params.id);
  budgetItems = budgetItems.filter((b) => b.eventId !== req.params.id);
  res.json({ success: true, message: 'Event deleted' });
});

// Checklist API
app.get('/api/events/:id/checklist', (req, res) => {
  const items = checklistItems.filter((c) => c.eventId === req.params.id);
  res.json({ success: true, data: items });
});

app.post('/api/events/:id/checklist', (req, res) => {
  const { title, category, deadline, estimatedCost, notes } = req.body;
  const newItem: EventChecklistItem = {
    id: `chk_${Date.now()}`,
    eventId: req.params.id,
    title: title || 'New Task',
    category: category || 'General',
    deadline,
    completed: false,
    estimatedCost: Number(estimatedCost) || 0,
    notes,
  };
  checklistItems.push(newItem);
  res.json({ success: true, data: newItem });
});

app.put('/api/events/:id/checklist/:itemId', (req, res) => {
  const index = checklistItems.findIndex((c) => c.id === req.params.itemId);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Checklist item not found' });
  }
  checklistItems[index] = { ...checklistItems[index], ...req.body };
  res.json({ success: true, data: checklistItems[index] });
});

app.delete('/api/events/:id/checklist/:itemId', (req, res) => {
  checklistItems = checklistItems.filter((c) => c.id !== req.params.itemId);
  res.json({ success: true, message: 'Task removed' });
});

// Budget API
app.get('/api/events/:id/budget', (req, res) => {
  const items = budgetItems.filter((b) => b.eventId === req.params.id);
  const totalPlanned = items.reduce((acc, i) => acc + i.plannedAmount, 0);
  const totalQuoted = items.reduce((acc, i) => acc + i.quotedAmount, 0);
  const totalPaid = items.reduce((acc, i) => acc + i.paidAmount, 0);

  res.json({
    success: true,
    data: {
      items,
      summary: {
        totalPlanned,
        totalQuoted,
        totalPaid,
        remaining: Math.max(0, totalPlanned - totalPaid),
      },
    },
  });
});

app.post('/api/events/:id/budget', (req, res) => {
  const { category, plannedAmount, quotedAmount, paidAmount, notes } = req.body;
  const newItem: EventBudgetItem = {
    id: `bud_${Date.now()}`,
    eventId: req.params.id,
    category: category || 'Miscellaneous',
    plannedAmount: Number(plannedAmount) || 0,
    quotedAmount: Number(quotedAmount) || 0,
    paidAmount: Number(paidAmount) || 0,
    notes,
  };
  budgetItems.push(newItem);
  res.json({ success: true, data: newItem });
});

app.put('/api/events/:id/budget/:itemId', (req, res) => {
  const index = budgetItems.findIndex((b) => b.id === req.params.itemId);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Budget item not found' });
  }
  budgetItems[index] = { ...budgetItems[index], ...req.body };
  res.json({ success: true, data: budgetItems[index] });
});

// 5. Enquiries & Quotations
app.get('/api/enquiries', requireAuth, async (req, res) => {
  const currentUser = getCurrentUser(req)!;
  let userEnquiries = enquiries;

  if (currentUser?.role === 'customer') {
    userEnquiries = enquiries.filter((e) => e.customerId === getCurrentUser(req)!.id);
  } else if (currentUser?.role === 'vendor') {
    const currentVendor = vendors.find((v) => v.userId === getCurrentUser(req)!.id);
    if (currentVendor) {
      userEnquiries = enquiries.filter((e) => e.vendorId === currentVendor.id);
    }
  }

  res.json({ success: true, data: userEnquiries });
});

app.post('/api/enquiries', requireAuth, async (req, res) => {
  const {
    eventId,
    eventTitle,
    vendorId,
    eventType,
    eventDate,
    guestCount,
    budget,
    requirements,
  } = req.body;

  const vendor = vendors.find((v) => v.id === vendorId);
  if (!vendor) {
    return res.status(404).json({ success: false, message: 'Vendor not found' });
  }

  const currentUser = getCurrentUser(req)!;

  const newEnquiry: Enquiry = {
    id: `enq_${Date.now()}`,
    eventId,
    eventTitle: eventTitle || `${eventType || 'Celebration'} Planning`,
    customerId: currentUser.id,
    customerName: currentUser.name,
    customerEmail: currentUser.email,
    customerPhone: currentUser.phone,
    vendorId: vendor.id,
    vendorName: vendor.businessName,
    vendorCategory: vendor.categoryName,
    vendorLogo: vendor.logo,
    eventType: eventType || 'Special Occasion',
    eventDate: eventDate || '2026-10-01',
    guestCount: Number(guestCount) || 100,
    budget: Number(budget) || vendor.startingPrice,
    requirements: requirements || 'Looking forward to discussing event details.',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  enquiries.unshift(newEnquiry);
  await collection<any>('enquiries').insertOne(newEnquiry);

  // Send notification to vendor
  notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: vendor.userId,
    title: `New Enquiry from ${currentUser.name}`,
    message: `${currentUser.name} submitted an enquiry for ${newEnquiry.eventType} on ${newEnquiry.eventDate}.`,
    type: 'enquiry',
    read: false,
    link: '/vendor-portal',
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, data: newEnquiry });
});

// Quotations
app.get('/api/quotations', requireAuth, async (req, res) => {
  const currentUser = getCurrentUser(req)!;
  let userQuotations = quotations;

  if (currentUser?.role === 'customer') {
    userQuotations = quotations.filter((q) => q.customerId === getCurrentUser(req)!.id);
  } else if (currentUser?.role === 'vendor') {
    const currentVendor = vendors.find((v) => v.userId === getCurrentUser(req)!.id);
    if (currentVendor) {
      userQuotations = quotations.filter((q) => q.vendorId === currentVendor.id);
    }
  }

  res.json({ success: true, data: userQuotations });
});

app.post('/api/quotations', requireAuth, async (req, res) => {
  const {
    enquiryId,
    eventId,
    eventTitle,
    customerId,
    customerName,
    customerEmail,
    packageName,
    items,
    validUntil,
    terms,
    notes,
  } = req.body;

  const currentVendor = vendors.find((v) => v.userId === getCurrentUser(req)!.id);
  if (!currentVendor) return res.status(403).json({ success: false, message: 'Vendor profile not found for this account.' });

  const enquiry = enquiryId ? enquiries.find((e) => e.id === enquiryId) : undefined;
  const resolvedCustomerId = enquiry?.customerId || customerId;
  const resolvedCustomer = resolvedCustomerId ? users.find((u) => u.id === resolvedCustomerId) : undefined;
  if (!resolvedCustomerId || !resolvedCustomer) return res.status(400).json({ success: false, message: 'A valid customer linked to this enquiry is required to create a quotation.' });
  const resolvedCustomerName = resolvedCustomer.name;
  const resolvedCustomerEmail = resolvedCustomer.email;

  const parsedItems = items && Array.isArray(items) && items.length > 0
    ? items
    : [{ name: packageName || 'Standard Event Package', amount: 50000 }];

  const subtotal = parsedItems.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
  const taxes = Math.round(subtotal * 0.05); // 5% GST
  const totalAmount = subtotal + taxes;

  const newQuote: Quotation = {
    id: `quot_${Date.now()}`,
    enquiryId,
    eventId,
    eventTitle: eventTitle || 'Celebration',
    customerId: resolvedCustomerId,
    customerName: resolvedCustomerName,
    customerEmail: resolvedCustomerEmail,
    vendorId: currentVendor.id,
    vendorName: currentVendor.businessName,
    vendorLogo: currentVendor.logo,
    vendorCategory: currentVendor.categoryName,
    packageName: packageName || 'Custom Quote',
    items: parsedItems,
    subtotal,
    taxes,
    platformFee: 0,
    totalAmount,
    validUntil: validUntil || '2026-10-30',
    terms: terms || '50% advance to block calendar slot. Balance on event completion.',
    notes: notes || 'Looking forward to creating a magical experience.',
    status: 'sent',
    createdAt: new Date().toISOString(),
  };

  quotations.unshift(newQuote);

  // Update enquiry status if applicable
  if (enquiryId) {
    const enq = enquiries.find((e) => e.id === enquiryId);
    if (enq) enq.status = 'quoted';
  }

  // Notify customer
  notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: newQuote.customerId,
    title: `Quotation Received from ${currentVendor.businessName}`,
    message: `${currentVendor.businessName} prepared a formal quote for ₹${totalAmount.toLocaleString('en-IN')}.`,
    type: 'quote',
    read: false,
    link: '/events',
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, data: newQuote });
});

app.post('/api/quotations/:id/accept', requireAuth, async (req, res) => {
  const quote = quotations.find((q) => q.id === req.params.id);
  if (!quote) {
    return res.status(404).json({ success: false, message: 'Quotation not found' });
  }

  quote.status = 'accepted';

  // Automatically create a pending booking ready for payment
  const bookingRef = `ESP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const newBooking: Booking = {
    id: `book_${Date.now()}`,
    bookingReference: bookingRef,
    eventId: quote.eventId,
    eventTitle: quote.eventTitle || 'Celebration',
    customerId: quote.customerId,
    customerName: quote.customerName,
    customerEmail: quote.customerEmail,
    customerPhone: '+91 98450 12345',
    vendorId: quote.vendorId,
    vendorName: quote.vendorName,
    vendorLogo: quote.vendorLogo,
    vendorCategory: quote.vendorCategory,
    packageName: quote.packageName || 'Quoted Package',
    eventDate: '2026-09-15',
    totalAmount: quote.totalAmount,
    paidAmount: 0,
    balanceAmount: quote.totalAmount,
    paymentStatus: 'pending',
    bookingStatus: 'pending',
    timeline: [
      { time: new Date().toLocaleString('en-IN'), status: 'Quotation Accepted', note: 'Customer accepted formal quotation.' },
    ],
    createdAt: new Date().toISOString(),
  };

  bookings.unshift(newBooking);
  await collection<any>('bookings').insertOne(newBooking);

  // Update budget item quoted amount if match exists
  const budgetMatch = budgetItems.find((b) => b.eventId === quote.eventId && b.category === quote.vendorCategory);
  if (budgetMatch) {
    budgetMatch.quotedAmount = quote.totalAmount;
  }

  res.json({
    success: true,
    message: 'Quotation accepted. Booking created.',
    data: { quote, booking: newBooking },
  });
});

app.post('/api/quotations/:id/reject', requireAuth, async (req, res) => {
  const quote = quotations.find((q) => q.id === req.params.id);
  if (!quote) {
    return res.status(404).json({ success: false, message: 'Quotation not found' });
  }

  quote.status = 'rejected';
  res.json({ success: true, data: quote });
});

// 6. Live service availability & bookings
app.get('/api/services/:id/availability', async (req, res) => {
  const service = vendorServices.find((s) => s.id === req.params.id && s.status === 'approved');
  if (!service) return res.status(404).json({ success: false, message: 'Approved service not found.' });
  const vendor = vendors.find((v) => v.id === service.vendorId);
  const date = String(req.query.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ success: false, message: 'A valid date is required.' });
  const schedule = vendor?.workingHours;
  const slots = buildHourlySlots(schedule?.start || '10:00', schedule?.end || '19:00', schedule?.slotDurationMinutes || 60);
  const dayName = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
  const allowedDay = !schedule?.days?.length || schedule.days.includes(dayName);
  const blocked = Boolean(schedule?.blockedDates?.includes(date));
  const active = await collection<any>('bookings').find({
    serviceId: service.id, eventDate: date, bookingStatus: { $in: ['pending', 'confirmed', 'in_progress'] }
  }).toArray();
  const booked = new Set(active.map((b: any) => String(b.startTime)));
  res.json({ success: true, data: { date, slots: slots.map((slot) => ({ ...slot, status: (!allowedDay || blocked || booked.has(slot.startTime)) ? 'booked' : 'available' })) } });
});

// 6. Bookings & Stripe Payments
app.get('/api/bookings', requireAuth, async (req, res) => {
  const currentUser = getCurrentUser(req)!;
  if (currentUser.role === 'customer') await reconcileStripePayments({ customerId: currentUser.id, limit: 5 }).catch(() => 0);
  else await reconcileStripePayments({ limit: 5 }).catch(() => 0);
  let userBookings = bookings;

  if (currentUser?.role === 'customer') {
    userBookings = bookings.filter((b) => b.customerId === getCurrentUser(req)!.id);
  } else if (currentUser?.role === 'vendor') {
    const currentVendor = vendors.find((v) => v.userId === getCurrentUser(req)!.id);
    if (currentVendor) {
      userBookings = bookings.filter((b) => b.vendorId === currentVendor.id);
    }
  }

  const paymentCol = await collection<any>('payments').find({ bookingId: { $in: userBookings.map(b => b.id) } }).sort({ createdAt: -1 }).toArray();
  const withPaymentDetails = userBookings.map(b => { const records = paymentCol.filter((p:any) => p.bookingId === b.id); const latest = records.find((p:any) => p.status === 'success') || records[0]; const vendorRecord: any = vendors.find((v) => v.id === b.vendorId); return { ...b, vendorPhone: vendorRecord?.phone || '', vendorEmail: vendorRecord?.email || '', paymentProvider: latest?.provider || '', paymentReference: latest?.razorpayPaymentId || latest?.stripePaymentIntentId || latest?.stripeCheckoutSessionId || latest?.razorpayOrderId || b.paymentTransactionId || '', paymentDate: latest?.paidAt || latest?.createdAt || '', payments: records.filter((p:any) => p.status === 'success').map((p:any) => ({ id: p.id, amount: p.amount, currency: p.currency || 'inr', provider: p.provider || (p.razorpayPaymentId ? 'razorpay' : 'stripe'), plan: p.paymentPlan, reference: p.razorpayPaymentId || p.stripePaymentIntentId || p.stripeCheckoutSessionId || '', invoiceNumber: p.invoiceNumber, paidAt: p.paidAt || p.createdAt })) }; });
  res.json({ success: true, data: withPaymentDetails });
});

app.post('/api/bookings', requireAuth, async (req, res) => {
  const currentUser = getCurrentUser(req)!;
  if (currentUser.role !== 'customer') return res.status(403).json({ success: false, message: 'Customer access required.' });
  const { eventId, eventTitle, vendorId, serviceId, packageId, packageName, eventDate, startTime, endTime, specialRequirements, serviceAddress } = req.body;
  const service = vendorServices.find((s) => s.id === serviceId && s.status === 'approved');
  const vendor = vendors.find((v) => v.id === vendorId);
  if (!service || !vendor || service.vendorId !== vendor.id) return res.status(404).json({ success: false, message: 'Approved service not found.' });
  if (!eventDate || !startTime || !endTime) return res.status(400).json({ success: false, message: 'Date and time slot are required.' });

  const schedule = vendor.workingHours;
  const validSlots = buildHourlySlots(schedule?.start || '10:00', schedule?.end || '19:00', schedule?.slotDurationMinutes || 60);
  if (!validSlots.some(slot => slot.startTime === String(startTime) && slot.endTime === String(endTime))) {
    return res.status(400).json({ success: false, message: 'Please choose a valid vendor time slot.' });
  }
  if (schedule?.blockedDates?.includes(eventDate)) return res.status(409).json({ success: false, message: 'This date is blocked by the vendor.' });
  const bookingDay = new Date(`${eventDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
  if (schedule?.days?.length && !schedule.days.includes(bookingDay)) return res.status(409).json({ success: false, message: 'The vendor is not available on this day.' });

  // Re-check availability immediately before inserting. This prevents two customers
  // from booking the same service slot even if both screens showed AVAILABLE.
  const existing = await collection<any>('bookings').findOne({
    serviceId, eventDate, startTime, bookingStatus: { $in: ['pending', 'confirmed', 'in_progress'] }
  });
  if (existing) return res.status(409).json({ success: false, message: 'This slot was just booked by another customer. Please choose another slot.' });

  const bookingRef = `ESP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const amount = Number(service.price) || vendor.startingPrice;
  const newBooking: Booking = {
    id: `book_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    bookingReference: bookingRef, eventId, eventTitle: eventTitle || 'Private Celebration',
    customerId: currentUser.id, customerName: currentUser.name, customerEmail: currentUser.email, customerPhone: currentUser.phone,
    vendorId: vendor.id, vendorName: vendor.businessName, vendorLogo: vendor.logo, vendorCategory: service.categoryName,
    serviceId: service.id, startTime, endTime, serviceAddress, packageId, packageName: packageName || service.serviceName,
    eventDate, totalAmount: amount, paidAmount: 0, balanceAmount: amount, paymentStatus: 'pending', bookingStatus: 'pending',
    specialRequirements, timeline: [{ time: new Date().toLocaleString('en-IN'), status: 'Booking Request', note: `${service.serviceName} reserved for ${eventDate} at ${startTime}. Awaiting vendor confirmation.` }],
    createdAt: new Date().toISOString(),
  };

  try {
    await collection<any>('bookings').createIndex({ serviceId: 1, eventDate: 1, startTime: 1 }, { unique: true, partialFilterExpression: { serviceId: { $exists: true }, startTime: { $exists: true }, bookingStatus: { $in: ['pending', 'confirmed', 'in_progress'] } } });
    await collection<any>('bookings').insertOne(newBooking);
  } catch (err: any) {
    if (err?.code === 11000) return res.status(409).json({ success: false, message: 'This slot was just booked by another customer. Please choose another slot.' });
    throw err;
  }
  bookings.unshift(newBooking);
  notifications.unshift({ id: `notif_${Date.now()}`, userId: vendor.userId, title: 'New booking request', message: `${currentUser.name} requested ${service.serviceName} for ${eventDate} at ${startTime}.`, type: 'booking', read: false, link: '/vendor-portal', createdAt: new Date().toISOString() });
  res.status(201).json({ success: true, data: newBooking });
});

app.post('/api/bookings/:id/accept', requireAuth, async (req, res) => {
  const booking = bookings.find((b) => b.id === req.params.id);
  const user = getCurrentUser(req)!;
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  const vendor = vendors.find((v) => v.id === booking.vendorId);
  if (!vendor || vendor.userId !== user.id) return res.status(403).json({ success: false, message: 'Vendor access required.' });
  if (booking.bookingStatus !== 'pending') return res.status(400).json({ success: false, message: 'Only pending bookings can be accepted.' });
  booking.bookingStatus = 'confirmed';
  booking.timeline.unshift({ time: new Date().toLocaleString('en-IN'), status: 'Booking Confirmed', note: 'Vendor accepted the requested service slot.' });
  await collection<any>('bookings').replaceOne({ id: booking.id }, booking, { upsert: true });
  notifications.unshift({ id: `notif_${Date.now()}`, userId: booking.customerId, title: 'Booking confirmed', message: `${vendor.businessName} accepted your ${booking.eventDate} ${booking.startTime} booking.`, type: 'booking', read: false, link: '/events', createdAt: new Date().toISOString() });
  res.json({ success: true, data: booking });
});

app.post('/api/bookings/:id/reject', requireAuth, async (req, res) => {
  const booking = bookings.find((b) => b.id === req.params.id);
  const user = getCurrentUser(req)!;
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  const vendor = vendors.find((v) => v.id === booking.vendorId);
  if (!vendor || vendor.userId !== user.id) return res.status(403).json({ success: false, message: 'Vendor access required.' });
  booking.bookingStatus = 'rejected';
  booking.specialRequirements = `${booking.specialRequirements ? booking.specialRequirements + ' ' : ''}Vendor response: ${String(req.body.reason || 'Vendor unavailable.')}`;
  booking.timeline.unshift({ time: new Date().toLocaleString('en-IN'), status: 'Booking Rejected', note: String(req.body.reason || 'Vendor unavailable.') });
  await collection<any>('bookings').replaceOne({ id: booking.id }, booking, { upsert: true });
  res.json({ success: true, data: booking });
});

app.post('/api/bookings/:id/complete', requireAuth, async (req, res) => {
  const booking = bookings.find((b) => b.id === req.params.id);
  const user = getCurrentUser(req)!;
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  const vendor = vendors.find((v) => v.id === booking.vendorId);
  if (!vendor || vendor.userId !== user.id) return res.status(403).json({ success: false, message: 'Vendor access required.' });
  booking.bookingStatus = 'completed';
  booking.timeline.unshift({ time: new Date().toLocaleString('en-IN'), status: 'Completed', note: 'Vendor marked the service as completed.' });
  await collection<any>('bookings').replaceOne({ id: booking.id }, booking, { upsert: true });
  res.json({ success: true, data: booking });
});

// Stripe Checkout: the backend determines the amount from the stored booking.
app.post('/api/payments/create-checkout-session', requireAuth, async (req, res) => {
  try {
    if (!stripeClient) return res.status(503).json({ success: false, message: 'Stripe is not configured. Add STRIPE_SECRET_KEY to .env and restart the server.' });
    if (stripeMode === 'test' && process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) return res.status(500).json({ success: false, message: 'STRIPE_MODE is test but a live secret key is configured. Use an sk_test_ key or explicitly switch STRIPE_MODE to live.' });
    if (stripeMode === 'live' && process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) return res.status(500).json({ success: false, message: 'STRIPE_MODE is live but a test secret key is configured. Use an eligible live Stripe key.' });
    const user = getCurrentUser(req)!;
    if (user.role !== 'customer') return res.status(403).json({ success: false, message: 'Customer access required.' });
    const { bookingId, paymentPlan, returnOrigin } = req.body as { bookingId?: string; paymentPlan?: 'full' | 'advance' | 'balance'; returnOrigin?: string };
    const returnBase = safeReturnOrigin(returnOrigin);
    if (!bookingId || !['full', 'advance', 'balance'].includes(String(paymentPlan))) return res.status(400).json({ success: false, message: 'Choose a valid payment option.' });
    const booking = await collection<any>('bookings').findOne({ id: bookingId, customerId: user.id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found for this customer.' });
    if (['cancelled', 'rejected', 'completed'].includes(String(booking.bookingStatus))) return res.status(400).json({ success: false, message: 'This booking is not eligible for payment.' });
    const total = Math.round(Number(booking.totalAmount) * 100) / 100;
    const paid = Math.round(Number(booking.paidAmount || 0) * 100) / 100;
    const balance = Math.max(0, Math.round((total - paid) * 100) / 100);
    let amount = balance;
    if (paymentPlan === 'advance') amount = Math.min(balance, Math.max(0.01, Math.round(total * stripeAdvancePercent) / 100));
    if (paymentPlan === 'full') amount = balance;
    if (amount <= 0) return res.status(400).json({ success: false, message: 'This booking has no outstanding balance.' });
    const amountMinor = Math.round(amount * 100);
    const paymentId = `pay_stripe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payment: any = {
      id: paymentId, bookingId: booking.id, bookingReference: booking.bookingReference,
      customerId: booking.customerId, vendorId: booking.vendorId, vendorName: booking.vendorName,
      amount, currency: stripeCurrency, paymentPlan, provider: 'stripe', status: 'pending',
      invoiceNumber: `INV-ESP-${Date.now()}`, createdAt: new Date().toISOString(),
    };
    const session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      customer_email: booking.customerEmail || user.email,
      client_reference_id: booking.id,
      line_items: [{ quantity: 1, price_data: { currency: stripeCurrency, unit_amount: amountMinor, product_data: { name: `EventSphere booking ${booking.bookingReference}`, description: `${booking.vendorName} · ${paymentPlan} payment` } } }],
      metadata: { bookingId: booking.id, paymentId, customerId: user.id, paymentPlan },
      payment_intent_data: { metadata: { bookingId: booking.id, paymentId, customerId: user.id, paymentPlan } },
      success_url: `${returnBase}/?view=my-bookings&payment=return&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnBase}/?view=my-bookings&payment=cancelled`,
    });
    payment['stripeCheckoutSessionId'] = session.id;
    await collection<any>('payments').insertOne(payment);
    payments.unshift(payment as any);
    return res.json({ success: true, data: { checkoutUrl: session.url, sessionId: session.id, paymentId, amount, currency: stripeCurrency, paymentPlan } });
  } catch (error: any) {
    console.error('Unable to create Stripe Checkout Session:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Unable to start Stripe Checkout.' });
  }
});

// Called by the browser when the customer returns from Stripe (or taps "Refresh statuses").
app.post('/api/payments/confirm-session', requireAuth, async (req, res) => {
  const user = getCurrentUser(req)!;
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined;
  const applied = await reconcileStripePayments({ sessionId, customerId: user.role === 'customer' ? user.id : undefined, limit: 10 });
  res.json({ success: true, data: { applied } });
});

// Razorpay Standard Checkout: booking price and ownership are verified on the server.
app.post('/api/create-order', requireAuth, async (req, res) => {
  const user = getCurrentUser(req)!;
  if (user.role !== 'customer') return res.status(403).json({ success: false, message: 'Customer access required.' });
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return res.status(503).json({ success: false, message: 'Razorpay is not configured.' });
  const { bookingId, paymentPlan } = req.body || {};
  if (typeof bookingId !== 'string' || !['full', 'advance', 'balance'].includes(paymentPlan)) return res.status(400).json({ success: false, message: 'Invalid booking or payment plan.' });
  const booking = await collection<any>('bookings').findOne({ id: bookingId, customerId: user.id });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
  if (['cancelled', 'rejected', 'completed'].includes(booking.bookingStatus)) return res.status(400).json({ success: false, message: 'Booking cannot be paid.' });
  const totalMinor = Math.round(Number(booking.totalAmount) * 100);
  const paidMinor = Math.round(Number(booking.paidAmount || 0) * 100);
  const balanceMinor = totalMinor - paidMinor;
  if (!Number.isSafeInteger(balanceMinor) || balanceMinor < 100) return res.status(400).json({ success: false, message: 'Minimum outstanding payment is ₹1.' });
  if (paymentPlan === 'advance' && paidMinor > 0) return res.status(400).json({ success: false, message: 'Advance already paid.' });
  const amount = paymentPlan === 'advance' ? Math.min(balanceMinor, Math.round(totalMinor * 0.2)) : balanceMinor;
  if (amount < 100) return res.status(400).json({ success: false, message: 'Minimum amount is 100 paise.' });
  try {
    const client = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const receipt = `esp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const order = await client.orders.create({ amount, currency: 'INR', receipt });
    const payment = { id: `pay_razor_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, bookingId, bookingReference: booking.bookingReference, customerId: user.id, vendorId: booking.vendorId, vendorName: booking.vendorName, amount: amount / 100, currency: 'inr', paymentPlan, provider: 'razorpay', status: 'pending', razorpayOrderId: order.id, invoiceNumber: `INV-ESP-${Date.now()}`, createdAt: new Date().toISOString() };
    await collection<any>('payments').insertOne(payment);
    payments.unshift(payment as any);
    return res.json({ success: true, data: { order_id: order.id, amount, currency: 'INR', key_id: process.env.RAZORPAY_KEY_ID } });
  } catch (error: any) {
    console.error('Razorpay order error:', error);
    return res.status(error?.statusCode === 401 ? 401 : 500).json({ success: false, message: error?.statusCode === 401 ? 'Razorpay authentication failed.' : 'Unable to create Razorpay order.' });
  }
});

app.post('/api/verify-payment', requireAuth, async (req, res) => {
  const user = getCurrentUser(req)!;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every(v => typeof v === 'string' && v.length > 0)) return res.status(400).json({ success: false, message: 'Missing payment verification fields.' });
  if (!process.env.RAZORPAY_KEY_SECRET || !process.env.RAZORPAY_KEY_ID) return res.status(503).json({ success: false, message: 'Razorpay is not configured.' });
  const expected = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = /^[a-f0-9]{64}$/i.test(razorpay_signature) ? Buffer.from(razorpay_signature, 'hex') : Buffer.alloc(0);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
  const col = collection<any>('payments');
  const payment = await col.findOne({ razorpayOrderId: razorpay_order_id, customerId: user.id, provider: 'razorpay' });
  if (!payment) return res.status(404).json({ success: false, message: 'Payment order not found.' });
  if (payment.status === 'success') return res.json({ success: true, data: { verified: true, alreadyProcessed: true } });
  try {
    const client = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const remote: any = await client.payments.fetch(razorpay_payment_id);
    if (remote.order_id !== razorpay_order_id || remote.status !== 'captured' || Number(remote.amount) !== Math.round(Number(payment.amount) * 100) || remote.currency !== 'INR') return res.status(400).json({ success: false, message: 'Payment is not captured or order details differ.' });
    const booking = await collection<any>('bookings').findOne({ id: payment.bookingId, customerId: user.id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    const claim = await col.updateOne({ id: payment.id, status: 'pending' }, { $set: { status: 'success', razorpayPaymentId: razorpay_payment_id, paidAt: new Date().toISOString() } });
    if (claim.modifiedCount !== 1) return res.json({ success: true, data: { verified: true, alreadyProcessed: true } });
    const newPaid = Math.round((Number(booking.paidAmount || 0) + Number(payment.amount)) * 100) / 100;
    const balance = Math.max(0, Math.round((Number(booking.totalAmount) - newPaid) * 100) / 100);
    await collection<any>('bookings').updateOne({ id: booking.id }, { $set: { paidAmount: newPaid, balanceAmount: balance, paymentStatus: balance === 0 ? 'fully_paid' : 'advance_paid', paymentTransactionId: razorpay_payment_id, bookingStatus: 'confirmed' }, $push: { timeline: { $each: [{ time: new Date().toISOString(), status: 'Payment Received', note: `Razorpay payment ${razorpay_payment_id} verified.` }], $position: 0 } } as any });
    const local = bookings.find(b => b.id === booking.id);
    if (local) { local.paidAmount = newPaid; local.balanceAmount = balance; local.paymentStatus = balance === 0 ? 'fully_paid' : 'advance_paid'; local.bookingStatus = 'confirmed'; local.paymentTransactionId = razorpay_payment_id; }
    const localPayment: any = payments.find((x: any) => x.id === payment.id);
    if (localPayment) { localPayment.status = 'success'; localPayment.razorpayPaymentId = razorpay_payment_id; localPayment.paidAt = new Date().toISOString(); }
    const customerEmail = String(booking.customerEmail || user.email || '');
    if (customerEmail) void sendEmail(customerEmail, `EventSphere payment received · ${booking.bookingReference}`, `Your payment was verified.\nBooking: ${booking.bookingReference}\nService: ${booking.packageName || booking.vendorName}\nTotal booking amount: ₹${booking.totalAmount}\nAmount paid so far: ₹${newPaid}\nRemaining balance: ₹${balance}\nPayment type: ${balance === 0 ? 'Full payment' : 'Advance / partial payment'}\nGateway: Razorpay\nTransaction reference: ${razorpay_payment_id}\nBooking status: confirmed`);
    return res.json({ success: true, data: { verified: true, bookingId: booking.id } });
  } catch (error: any) {
    console.error('Razorpay verification error:', error);
    return res.status(error?.statusCode === 401 ? 401 : 500).json({ success: false, message: 'Unable to confirm captured payment. Contact support if charged.' });
  }
});

// 7. Reviews API
app.get('/api/reviews', requireAuth, async (req, res) => {
  const { vendorId } = req.query;
  if (vendorId) {
    const list = reviews.filter((r) => r.vendorId === vendorId);
    return res.json({ success: true, data: list });
  }
  res.json({ success: true, data: reviews });
});

// Vendors can publicly reply to reviews on their own profile.
app.post('/api/reviews/:id/reply', requireAuth, async (req, res) => {
  const user = getCurrentUser(req)!;
  const review = reviews.find((r) => r.id === req.params.id);
  if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
  const vendor = vendors.find((v) => v.id === review.vendorId);
  if (user.role !== 'admin' && vendor?.userId !== user.id) return res.status(403).json({ success: false, message: 'You can only reply to reviews of your own business.' });
  const comment = String(req.body?.comment || '').trim().slice(0, 1000);
  if (comment.length < 2) return res.status(400).json({ success: false, message: 'Write a short reply first.' });
  review.vendorReply = { comment, date: new Date().toISOString().slice(0, 10) };
  await collection<any>('reviews').updateOne({ id: review.id }, { $set: { vendorReply: review.vendorReply } });
  res.json({ success: true, data: review });
});

app.post('/api/reviews', requireAuth, async (req, res) => {
  const { vendorId, rating, comment, eventType, photos } = req.body;
  const vendor = vendors.find((v) => v.id === vendorId);
  if (!vendor) {
    return res.status(404).json({ success: false, message: 'Vendor not found' });
  }

  const currentUser = getCurrentUser(req)!;

  const newReview: VendorReview = {
    id: `rev_${Date.now()}`,
    vendorId,
    customerId: currentUser.id,
    customerName: currentUser.name,
    customerAvatar: currentUser.avatar,
    eventType: eventType || 'Celebration',
    rating: Number(rating) || 5,
    date: 'Just now',
    comment: comment || 'Wonderful experience working with this vendor!',
    photos: photos || [],
    verifiedBooking: true,
  };

  reviews.unshift(newReview);
  await collection<any>('reviews').insertOne(newReview);

  // Recalculate vendor average rating
  const vendorReviews = reviews.filter((r) => r.vendorId === vendorId);
  const avg = vendorReviews.reduce((sum, r) => sum + r.rating, 0) / vendorReviews.length;
  vendor.rating = Number(avg.toFixed(2));
  vendor.reviewCount = vendorReviews.length;

  res.json({ success: true, data: newReview });
});

// 8. Chat & Real-time Messages API
app.get('/api/chat/conversations', requireAuth, async (req, res) => {
  const currentUser = getCurrentUser(req)!;
  let userConversations = conversations;

  if (currentUser?.role === 'customer') {
    userConversations = conversations.filter((c) => c.customerId === getCurrentUser(req)!.id);
  } else if (currentUser?.role === 'vendor') {
    const currentVendor = vendors.find((v) => v.userId === getCurrentUser(req)!.id);
    if (currentVendor) {
      userConversations = conversations.filter((c) => c.vendorId === currentVendor.id);
    }
  }

  res.json({ success: true, data: userConversations });
});

app.get('/api/chat/messages/:conversationId', requireAuth, async (req, res) => {
  const convMessages = messages.filter((m) => m.conversationId === req.params.conversationId);
  res.json({ success: true, data: convMessages });
});

app.post('/api/chat/messages', requireAuth, async (req, res) => {
  const { conversationId, vendorId, text, bookingContextId } = req.body;
  const currentUser = getCurrentUser(req)!;

  let targetConv = conversations.find((c) => c.id === conversationId);

  // Auto create conversation if starting fresh
  if (!targetConv && vendorId) {
    const vendor = vendors.find((v) => v.id === vendorId);
    if (vendor) {
      targetConv = {
        id: `conv_${Date.now()}`,
        customerId: currentUser.id,
        customerName: currentUser.name,
        customerAvatar: currentUser.avatar,
        vendorId: vendor.id,
        vendorName: vendor.businessName,
        vendorAvatar: vendor.logo,
        lastMessage: text,
        lastMessageTime: new Date().toISOString(),
        unreadCountCustomer: 0,
        unreadCountVendor: 1,
      };
      conversations.unshift(targetConv);
    }
  }

  if (!targetConv) {
    return res.status(404).json({ success: false, message: 'Conversation could not be established.' });
  }

  const newMsg: ChatMessage = {
    id: `msg_${Date.now()}`,
    conversationId: targetConv.id,
    senderId: currentUser.id,
    senderRole: currentUser.role,
    senderName: currentUser.name,
    text,
    bookingContextId,
    createdAt: new Date().toISOString(),
    read: true,
  };

  messages.push(newMsg);
  targetConv.lastMessage = text;
  targetConv.lastMessageTime = newMsg.createdAt;

  // Auto simulated reply from vendor if message is from customer for rich real-time feel
  if (currentUser.role === 'customer') {
    setTimeout(() => {
      const replyMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        conversationId: targetConv!.id,
        senderId: targetConv!.vendorId,
        senderRole: 'vendor',
        senderName: targetConv!.vendorName,
        text: `Thank you for reaching out, ${currentUser.name.split(' ')[0]}! We have noted your request and our lead designer will follow up shortly.`,
        createdAt: new Date().toISOString(),
        read: true,
      };
      messages.push(replyMsg);
      targetConv!.lastMessage = replyMsg.text;
      targetConv!.lastMessageTime = replyMsg.createdAt;
    }, 1500);
  }

  res.json({ success: true, data: newMsg });
});

// 9. Favorites API
app.get('/api/favorites', requireAuth, async (req, res) => {
  const favoriteVendors = vendors.filter((v) => savedFavoriteVendorIds.includes(v.id));
  res.json({ success: true, data: favoriteVendors, ids: savedFavoriteVendorIds });
});

app.post('/api/favorites/toggle', requireAuth, async (req, res) => {
  const { vendorId } = req.body;
  if (savedFavoriteVendorIds.includes(vendorId)) {
    savedFavoriteVendorIds = savedFavoriteVendorIds.filter((id) => id !== vendorId);
  } else {
    savedFavoriteVendorIds.push(vendorId);
  }
  res.json({ success: true, data: savedFavoriteVendorIds });
});

// 10. Notifications API
app.get('/api/notifications', async (req, res) => {
  const user = getCurrentUser(req);
  const userNotifs = user ? notifications.filter((n) => n.userId === user.id || !n.userId) : [];
  res.json({ success: true, data: userNotifs });
});

app.put('/api/notifications/:id/read', requireAuth, async (req, res) => {
  const notif = notifications.find((n) => n.id === req.params.id);
  if (notif) notif.read = true;
  res.json({ success: true, message: 'Notification marked as read' });
});

// Admin-only payment transaction list. Never expose payment records to ordinary customers/vendors.
app.get('/api/admin/payments', requireAdmin, async (_req, res) => {
  await reconcileStripePayments({ limit: 10 }).catch(() => 0);
  const records = await collection<any>('payments').find({}).sort({ createdAt: -1 }).limit(500).toArray();
  return res.json({ success: true, data: records.map(({ _id, ...payment }) => payment) });
});

app.get('/api/admin/vendors', requireAdmin, async (_req, res) => {
  const list = await collection<any>('vendors').find({}).sort({ businessName: 1 }).toArray();
  return res.json({ success: true, data: list.map(({ _id, ...v }) => v) });
});
app.get('/api/admin/vendors/:id/details', requireAdmin, async (req, res) => {
  const vendor = await collection<any>('vendors').findOne({ id: req.params.id });
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });
  const services = await collection<any>('vendorServices').find({ vendorId: vendor.id }).sort({ createdAt: -1 }).toArray();
  const vendorBookings = await collection<any>('bookings').find({ vendorId: vendor.id }).sort({ createdAt: -1 }).toArray();
  const paymentRows = await collection<any>('payments').find({ vendorId: vendor.id }).sort({ createdAt: -1 }).toArray();
  const successful = paymentRows.filter((p:any) => p.status === 'success' || p.status === 'refunded');
  const resultServices = services.map((service:any) => {
    const serviceBookings = vendorBookings.filter((b:any) => b.serviceId === service.id || b.packageId === service.id);
    const servicePayments = successful.filter((p:any) => serviceBookings.some((b:any) => b.id === p.bookingId));
    const grossCollected = servicePayments.reduce((n:number,p:any)=>n+Number(p.amount||0),0); const refunds = servicePayments.filter((p:any)=>p.status==='refunded').reduce((n:number,p:any)=>n+Number(p.amount||0),0); return { ...service, bookingCount: serviceBookings.length, successfulPaymentCount: servicePayments.filter((p:any)=>p.status==='success').length, grossCollected, refunds, netCollected: Math.max(0, grossCollected-refunds) };
  });
  return res.json({ success: true, data: { vendor, services: resultServices, bookings: vendorBookings, payments: paymentRows, summary: { serviceCount: services.length, bookingCount: vendorBookings.length, paymentsCollected: successful.reduce((n:number,p:any)=>n+Number(p.amount||0),0), refunded: paymentRows.filter((p:any)=>p.status==='refunded').reduce((n:number,p:any)=>n+Number(p.amount||0),0) } } });
});
app.delete('/api/admin/services/:id', requireAdmin, async (req, res) => {
  const service = await collection<any>('vendorServices').findOne({ id: req.params.id });
  if (!service) return res.status(404).json({ success: false, message: 'Service not found.' });
  const now = new Date().toISOString();
  await collection<any>('vendorServices').updateOne({ id: service.id }, { $set: { status: 'removed', removedAt: now, removedBy: (req as any).currentUser?.id, updatedAt: now } });
  vendorServices = vendorServices.map((s:any) => s.id === service.id ? { ...s, status: 'removed', removedAt: now, updatedAt: now } : s);
  return res.json({ success: true, data: { removed: true, id: service.id } });
});

app.get('/api/admin/customers', requireAdmin, async (_req, res) => {
  const list = await collection<any>('users').find({ role: 'customer' }).project({ password: 0, passwordHash: 0 }).sort({ createdAt: -1 }).limit(1000).toArray();
  return res.json({ success: true, data: list.map(({ _id, ...u }) => u) });
});
app.post('/api/admin/vendors/:id/suspend', requireAdmin, async (req, res) => {
  const vendor = vendors.find(v => v.id === req.params.id) as any;
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });
  vendor.suspended = Boolean(req.body?.suspended);
  vendor.suspensionReason = vendor.suspended ? String(req.body?.reason || 'Suspended by admin') : '';
  await collection<any>('vendors').replaceOne({ id: vendor.id }, vendor, { upsert: true });
  return res.json({ success: true, data: vendor });
});
app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
  const review = reviews.find(r => r.id === req.params.id);
  if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
  reviews = reviews.filter(r => r.id !== req.params.id);
  await collection<any>('reviews').deleteOne({ id: req.params.id });
  return res.json({ success: true, data: { deleted: true } });
});

app.post('/api/admin/payments/:id/refund', requireAdmin, async (req, res) => {
  const col = collection<any>('payments');
  const payment = await col.findOne({ id: req.params.id });
  if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found.' });
  if (payment.status !== 'success') return res.status(400).json({ success: false, message: 'Only verified successful payments can be refunded.' });
  try {
    if (payment.provider === 'razorpay') {
      if (!payment.razorpayPaymentId) return res.status(400).json({ success: false, message: 'Razorpay payment reference is missing.' });
      const client = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID || '', key_secret: process.env.RAZORPAY_KEY_SECRET || '' });
      await client.payments.refund(payment.razorpayPaymentId, {});
    } else if (payment.provider === 'stripe') {
      if (!stripeClient) return res.status(503).json({ success: false, message: 'Stripe is not configured on the server.' });
      let intentId = payment.stripePaymentIntentId;
      if (!intentId && payment.stripeCheckoutSessionId) { const session = await stripeClient.checkout.sessions.retrieve(payment.stripeCheckoutSessionId); intentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id; }
      if (!intentId) return res.status(400).json({ success: false, message: 'Stripe payment intent is missing.' });
      await stripeClient.refunds.create({ payment_intent: intentId });
    } else return res.status(400).json({ success: false, message: 'Refund is unavailable for this legacy payment record.' });
    const refundedAt = new Date().toISOString();
    await col.updateOne({ id: payment.id, status: 'success' }, { $set: { status: 'refunded', refundedAt } });
    const customer = await collection<any>('users').findOne({ id: payment.customerId });
    if (customer?.email) void sendEmail(customer.email, `EventSphere refund initiated · ${payment.bookingReference || payment.bookingId}`, `A refund has been submitted for your EventSphere payment.\nBooking: ${payment.bookingReference || payment.bookingId}\nRefund amount: ₹${payment.amount}\nGateway: ${payment.provider}\nTransaction reference: ${payment.razorpayPaymentId || payment.stripePaymentIntentId || payment.stripeCheckoutSessionId || ''}\nIf your bank does not show the refund immediately, please allow the gateway/bank processing time.`);
    const successful = await col.find({ bookingId: payment.bookingId, status: 'success' }).toArray();
    const paid = Math.round(successful.reduce((sum:number, p:any) => sum + Number(p.amount || 0), 0) * 100) / 100;
    const booking = bookings.find(b => b.id === payment.bookingId);
    if (booking) {
      const balance = Math.max(0, Math.round((Number(booking.totalAmount) - paid) * 100) / 100);
      await collection<any>('bookings').updateOne({ id: booking.id }, { $set: { paidAmount: paid, balanceAmount: balance, paymentStatus: paid <= 0 ? 'refunded' : balance <= 0 ? 'fully_paid' : 'advance_paid' } });
      booking.paidAmount = paid; booking.balanceAmount = balance; booking.paymentStatus = paid <= 0 ? 'refunded' as any : balance <= 0 ? 'fully_paid' : 'advance_paid';
    }
    return res.json({ success: true, data: { refunded: true, paymentId: payment.id } });
  } catch (error:any) {
    console.error('Admin refund failed:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Gateway refund failed. Check the payment in the provider dashboard before retrying.' });
  }
});

// Admin complaint tickets and editable marketplace categories.
app.post('/api/complaints', requireAuth, async (req, res) => {
  const user = getCurrentUser(req)!;
  if (!['customer', 'vendor'].includes(user.role)) return res.status(403).json({ success: false, message: 'Customer or vendor account required.' });
  const subject = String(req.body?.subject || '').trim().slice(0, 160);
  const message = String(req.body?.message || '').trim().slice(0, 4000);
  const bookingId = String(req.body?.bookingId || '').trim().slice(0, 120);
  if (subject.length < 4 || message.length < 10) return res.status(400).json({ success: false, message: 'Enter a subject and at least 10 characters describing the issue.' });
  if (bookingId) {
    const booking = await collection<any>('bookings').findOne({ id: bookingId });
    const vendor = booking ? vendors.find(v => v.id === booking.vendorId) : null;
    if (!booking || (user.role === 'customer' && booking.customerId !== user.id) || (user.role === 'vendor' && vendor?.userId !== user.id)) return res.status(404).json({ success: false, message: 'Booking not found for this account.' });
  }
  const ticket = { id: `complaint_${Date.now()}_${randomInt(1000,9999)}`, userId: user.id, userRole: user.role, userName: user.name, userEmail: user.email, bookingId: bookingId || null, subject, message, status: 'open', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await collection<any>('complaints').insertOne(ticket);
  if (adminEmail) void sendEmail(adminEmail, `EventSphere support ticket: ${subject}`, `A new ${user.role} support ticket was submitted.\nFrom: ${user.name} (${user.email})\nBooking: ${bookingId || 'Not specified'}\nSubject: ${subject}\n\n${message}`);
  return res.status(201).json({ success: true, data: ticket });
});
app.get('/api/admin/complaints', requireAdmin, async (req, res) => {
  const status = String(req.query.status || 'all');
  const filter = status === 'all' ? {} : { status };
  const rows = await collection<any>('complaints').find(filter).sort({ createdAt: -1 }).limit(1000).toArray();
  return res.json({ success: true, data: rows.map(({ _id, ...row }) => row) });
});
app.patch('/api/admin/complaints/:id', requireAdmin, async (req, res) => {
  const status = String(req.body?.status || '');
  if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid complaint status.' });
  const result = await collection<any>('complaints').findOneAndUpdate({ id: req.params.id }, { $set: { status, adminNote: String(req.body?.adminNote || '').slice(0, 2000), updatedAt: new Date().toISOString() } }, { returnDocument: 'after' });
  if (!result) return res.status(404).json({ success: false, message: 'Complaint not found.' });
  return res.json({ success: true, data: result });
});
app.put('/api/admin/categories/:kind/:id', requireAdmin, async (req, res) => {
  const kind = String(req.params.kind);
  const id = String(req.params.id);
  const name = String(req.body?.name || '').trim().slice(0, 100);
  if (!['events', 'vendors'].includes(kind) || name.length < 2) return res.status(400).json({ success: false, message: 'Provide a valid category name.' });
  const target = kind === 'events' ? eventCategories : vendorCategories;
  const category: any = target.find((item: any) => item.id === id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });
  category.name = name;
  if (kind === 'events') await collection<any>('eventCategories').replaceOne({ id }, category, { upsert: true });
  else await collection<any>('vendorCategories').replaceOne({ id }, category, { upsert: true });
  return res.json({ success: true, data: category });
});

// 11. Admin API
app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
  await reconcileStripePayments({ limit: 10 }).catch(() => 0);
  const [userRows, vendorRows, bookingRows, paymentRows, serviceRows] = await Promise.all([
    collection<any>('users').find({}).toArray(),
    collection<any>('vendors').find({}).toArray(),
    collection<any>('bookings').find({}).toArray(),
    collection<any>('payments').find({}).toArray(),
    collection<any>('vendorServices').find({}).toArray(),
  ]);
  const successfulPayments = paymentRows.filter((p:any) => p.status === 'success');
  const totalCollected = successfulPayments.reduce((sum:number, p:any) => sum + Number(p.amount || 0), 0);
  const refunded = paymentRows.filter((p:any) => p.status === 'refunded').reduce((sum:number, p:any) => sum + Number(p.amount || 0), 0);
  const monthly = new Map<string, { month:string; revenue:number; bookings:number }>();
  for (let offset = 5; offset >= 0; offset--) {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - offset);
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
    monthly.set(key, { month: date.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), revenue: 0, bookings: 0 });
  }
  for (const b of bookingRows) { const key = String(b.createdAt || '').slice(0,7); const item = monthly.get(key); if (item) item.bookings += 1; }
  for (const p of successfulPayments) { const key = String(p.paidAt || p.createdAt || '').slice(0,7); const item = monthly.get(key); if (item) item.revenue += Number(p.amount || 0); }
  const categoryCounts = new Map<string, number>();
  for (const service of serviceRows) { const name = String(service.categoryName || 'Other'); categoryCounts.set(name, (categoryCounts.get(name) || 0) + 1); }
  const totalServices = Array.from(categoryCounts.values()).reduce((a,b)=>a+b,0) || 1;
  return res.json({ success: true, data: {
    totalUsers: userRows.length,
    activeCustomers: userRows.filter((u:any) => u.role === 'customer').length,
    totalVendors: vendorRows.length,
    verifiedVendors: vendorRows.filter((v:any) => v.verified).length,
    pendingVerifications: vendorRows.filter((v:any) => v.verificationStatus === 'pending').length,
    activeVendors: vendorRows.filter((v:any) => !v.suspended).length,
    totalEvents: await collection<any>('events').countDocuments(),
    totalBookings: bookingRows.length,
    confirmedBookings: bookingRows.filter((b:any) => b.bookingStatus === 'confirmed').length,
    pendingApprovals: serviceRows.filter((s:any) => s.status === 'pending').length,
    totalGMV: Math.round(totalCollected * 100) / 100,
    totalCollected: Math.round(totalCollected * 100) / 100,
    refunded: Math.round(refunded * 100) / 100,
    platformEarnings: Math.round(totalCollected * 0.08 * 100) / 100,
    popularCategories: Array.from(categoryCounts.entries()).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({ name, count, percentage: Math.round(count/totalServices*100) })),
    monthlyGrowth: Array.from(monthly.values()).map(x=>({...x,revenue:Math.round(x.revenue*100)/100})),
  }});
});

app.post('/api/admin/vendors/:id/verify', requireAdmin, async (req, res) => {
  const { status } = req.body; // 'verified' | 'rejected'
  const vendor = vendors.find((v) => v.id === req.params.id);
  if (!vendor) {
    return res.status(404).json({ success: false, message: 'Vendor not found' });
  }

  vendor.verificationStatus = status;
  vendor.verified = status === 'verified';
  await collection<any>('vendors').replaceOne({ id: vendor.id }, vendor, { upsert: true });
  res.json({ success: true, data: vendor });
});

app.post('/api/admin/vendors/:id/toggle-featured', requireAdmin, async (req, res) => {
  const vendor = vendors.find((v) => v.id === req.params.id);
  if (!vendor) {
    return res.status(404).json({ success: false, message: 'Vendor not found' });
  }

  vendor.featured = !vendor.featured;
  await collection<any>('vendors').replaceOne({ id: vendor.id }, vendor, { upsert: true });
  res.json({ success: true, data: vendor });
});

// EventSphere support assistant: answer from actual marketplace listings when possible.
// ---------------------------------------------------------------------------
// Role-aware assistant helpers (vendor / customer). Account answers use the signed-in user's own data only.
// ---------------------------------------------------------------------------
const rupees = (n: unknown) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

async function vendorAssistantReply(user: User, message: string): Promise<string | null> {
  const vendor: any = vendors.find((v) => v.userId === user.id);
  if (!vendor) return null;
  const mine = bookings.filter((b) => b.vendorId === vendor.id);
  const active = mine.filter((b) => !['cancelled', 'rejected'].includes(b.bookingStatus));
  const pending = mine.filter((b) => b.bookingStatus === 'pending');
  const confirmed = mine.filter((b) => ['confirmed', 'in_progress'].includes(b.bookingStatus));
  const paid = active.reduce((sum, b) => sum + (Number(b.paidAmount) || 0), 0);
  const due = active.reduce((sum, b) => sum + Math.max(0, Number(b.balanceAmount ?? b.totalAmount) || 0), 0);

  if (/add.*service|new service|create.*service|list.*service|post.*service|upload.*service/i.test(message)) {
    return 'To add a service:\n1. Open Vendor Dashboard and tap “Add service” (top right).\n2. Fill in the service name, category, price, city, event types and what is included.\n3. Add clear photos, then submit.\nNew services go to the EventSphere team for approval, and once approved they appear on the Vendors page for customers. You can track the status under My Services.';
  }
  if (/(request|pending|enquir|lead|new booking|waiting|accept|decline)/i.test(message)) {
    if (!pending.length) return `You have no new booking requests right now. You have ${confirmed.length} confirmed booking${confirmed.length === 1 ? '' : 's'}. New requests appear in the Bookings tab, where you can accept or decline them.`;
    const list = pending.slice(0, 5).map((b) => `• ${b.bookingReference} — ${b.customerName || 'Customer'} · ${b.packageName} · ${b.eventDate}${b.startTime ? ` ${b.startTime}` : ''} · ${rupees(b.totalAmount)}`).join('\n');
    return `You have ${pending.length} request${pending.length === 1 ? '' : 's'} waiting for your response:\n${list}\n\nOpen the Bookings tab to accept or decline. Once you accept, that slot is blocked for other customers.`;
  }
  if (/(paid|payment|payout|earning|revenue|money|income|balance|received)/i.test(message)) {
    return `Here is your payment summary:\n• Paid so far: ${rupees(paid)}\n• Still to be paid by customers: ${rupees(due)}\n• Confirmed bookings: ${confirmed.length}\nPayments show up on each booking as soon as the customer pays online (Paid revenue on your dashboard updates too). For payout timing or a payment issue, please contact EventSphere support with the booking reference.`;
  }
  if (/(availab|schedule|block|working hours|calendar|slot|holiday|leave|off day)/i.test(message)) {
    return 'To manage availability, open the “Availability & Schedule” tab:\n• Set your working hours and days.\n• Block dates when you are not available.\n• Accepted bookings block their slot automatically, so customers cannot double-book you.\nKeeping this up to date improves your bookings and avoids cancellations.';
  }
  if (/(service.*(status|approv|reject|live|pending)|approval|my services|is my service)/i.test(message)) {
    const list = await collection<any>('vendorServices').find({ vendorId: vendor.id }).toArray();
    if (!list.length) return 'You have not added any services yet. Tap “Add service” on your dashboard to create your first listing.';
    const by = (st: string) => list.filter((x: any) => x.status === st);
    const rejected = by('rejected').slice(0, 3).map((x: any) => `• ${x.serviceName}${x.rejectionReason ? ` — ${x.rejectionReason}` : ''}`).join('\n');
    return `Your services: ${by('approved').length} live, ${by('pending').length} awaiting approval, ${by('rejected').length} rejected.${rejected ? `\nRejected:\n${rejected}\nEdit and resubmit them under My Services.` : ''}`;
  }
  if (/(verif|kyc|document|badge)/i.test(message)) {
    return `Your verification status is “${vendor.verificationStatus || (vendor.verified ? 'verified' : 'pending')}”. ${vendor.verified ? 'Customers can see the Verified badge on your profile.' : 'Once the EventSphere team verifies your details, your listings become visible to customers.'}`;
  }
  if (/(review|rating|feedback)/i.test(message)) {
    return `Your current rating is ${Number(vendor.rating || 0).toFixed(1)}★ from ${vendor.reviewCount || 0} review${vendor.reviewCount === 1 ? '' : 's'}. Delivering on time and replying quickly to requests are the biggest ways to improve it.`;
  }
  if (/(profile|about|logo|photo|portfolio|price|package)/i.test(message)) {
    return 'Keep your listing strong: add a clear business description, good portfolio photos, accurate starting prices and packages, and the areas you serve. Customers compare these before they book.';
  }
  return null;
}

async function customerAssistantReply(user: User, message: string): Promise<string | null> {
  if (!/(my booking|booking status|status|paid|balance|payment|refund|invoice|receipt|reservation|check my)/i.test(message)) return null;
  const mine = bookings.filter((b) => b.customerId === user.id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  if (!mine.length) return 'You have no bookings yet. Browse Vendors, pick a service and reserve a slot, and it will show up in My Bookings.';
  const list = mine.slice(0, 4).map((b) => {
    const balance = Math.max(0, Number(b.balanceAmount ?? b.totalAmount) || 0);
    return `• ${b.bookingReference} — ${b.packageName} with ${b.vendorName} · ${b.bookingStatus} · paid ${rupees(b.paidAmount)} of ${rupees(b.totalAmount)}${balance > 0 ? ` (balance ${rupees(balance)})` : ' (fully paid)'}`;
  }).join('\n');
  return `Here are your latest bookings:\n${list}\n\nOpen My Bookings for payment history, receipts and to pay any balance. If a payment shows as pending, tap “Refresh statuses”.`;
}

app.post('/api/ai/support-chat', async (req, res) => {
  const message = String(req.body?.message || '').trim().slice(0, 1000);
  const city = String(req.body?.city || '').trim().slice(0, 100) || 'Bangalore';
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8).map((m: any) => ({ role: m?.role === 'assistant' ? 'assistant' : 'user', content: String(m?.content || '').slice(0, 1000) })) : [];
  if (!message) return res.status(400).json({ success: false, message: 'Please enter a question.' });

  const chatUser = getCurrentUser(req);
  const chatRole = chatUser?.role || 'guest';
  if (chatUser && chatRole === 'vendor') {
    const accountReply = await vendorAssistantReply(chatUser, message).catch(() => null);
    if (accountReply) return res.json({ success: true, data: { reply: accountReply } });
  } else if (chatUser && chatRole === 'customer') {
    const accountReply = await customerAssistantReply(chatUser, message).catch(() => null);
    if (accountReply) return res.json({ success: true, data: { reply: accountReply } });
  }

  const normalized = message.toLowerCase();
  const matchedVendors = vendors.filter((v: any) => {
    const cityMatch = !/(in my city|near me|nearby|in my area)/i.test(message) || String(v.city || '').toLowerCase().includes(city.toLowerCase());
    const active = v.verified !== false && v.suspended !== true;
    const categoryText = `${v.categoryName || ''} ${v.category || ''} ${v.businessName || ''}`.toLowerCase();
    const requestedCategory = normalized.includes('dj') || normalized.includes('music') ? /dj|music|entertainment|artist|sound/ : normalized.includes('photo') ? /photo|cinema|video/ : normalized.includes('decor') ? /decor|floral/ : normalized.includes('cater') || normalized.includes('food') ? /food|cater/ : normalized.includes('venue') || normalized.includes('hall') ? /venue|hall/ : null;
    return active && cityMatch && (!requestedCategory || requestedCategory.test(categoryText));
  }).map((v: any) => ({ name: v.businessName, category: v.categoryName || v.category, city: v.city, startingPrice: Number(v.startingPrice || 0), rating: Number(v.rating || 0) }));
  const cheapest = /cheap|cheapest|lowest|least (?:booking|price|cost)|budget/i.test(message);
  if (cheapest) matchedVendors.sort((a: any, b: any) => (a.startingPrice || Number.MAX_SAFE_INTEGER) - (b.startingPrice || Number.MAX_SAFE_INTEGER));

  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const prompt = `${chatRole === 'vendor' ? `You are EventSphere's vendor-business assistant. You are helping a VENDOR (service provider) who is signed in to the vendor portal. Help with adding services, handling booking requests, availability, payments received, profile quality and growing bookings. Do not suggest hiring other vendors.` : `You are EventSphere's concise event-planning and marketplace support assistant.`} Answer helpfully in plain text. Do not claim to have checked a user's private bookings or payment records; direct them to My Bookings for private status. Recommend only vendors included in the supplied database list; never invent names, prices, or ratings. If the question is ambiguous, ask one short clarification.\nCity context: ${city}\nUser question: ${message}\nRecent conversation: ${JSON.stringify(history)}\nMatching verified marketplace vendors: ${JSON.stringify(matchedVendors.slice(0, 12))}`;
      const response = await gemini.models.generateContent({ model: 'gemini-3.7-flash', contents: prompt, config: { systemInstruction: 'You are the helpful EventSphere support assistant. Be friendly, accurate, concise, and transparent about limitations.', maxOutputTokens: 500 } });
      const reply = String(response.text || '').trim();
      if (reply) return res.json({ success: true, data: { reply } });
    } catch (error: any) {
      console.error('Support assistant provider error:', String(error?.message || 'provider request failed').slice(0, 180));
    }
  }

  // Useful deterministic responses keep the chatbot functional when no AI key is configured.
  if (chatRole === 'vendor') {
    return res.json({ success: true, data: { reply: 'I can help you run your vendor business on EventSphere. Try asking: “How do I add a service?”, “Do I have new booking requests?”, “How much have I been paid?”, “How do I block dates?” or “Is my service approved?”' } });
  }
  if (/(vendor|dj|photograph|photo|decor|cater|venue|find|cheap|least|budget)/i.test(message)) {
    if (!matchedVendors.length) return res.json({ success: true, data: { reply: `I couldn't find a matching verified vendor in ${city} for that request yet. Try another category or city, or open Find Vendors to browse the available listings.` } });
    const list = matchedVendors.slice(0, 5).map((v: any) => `• ${v.name} — ${v.category || 'Event service'}${v.city ? `, ${v.city}` : ''}${v.startingPrice ? ` · from ₹${v.startingPrice.toLocaleString('en-IN')}` : ''}${v.rating ? ` · ${v.rating.toFixed(1)}★` : ''}`).join('\n');
    return res.json({ success: true, data: { reply: `${cheapest ? 'Here are the lowest starting-price matches' : 'Here are matching verified vendors'}${city ? ` for ${city}` : ''}:\n${list}\n\nOpen Find Vendors to review details and availability. Prices and availability should be confirmed with the vendor.` } });
  }
  if (/booking|payment|paid|balance|refund|reservation|status/i.test(message)) return res.json({ success: true, data: { reply: 'For the latest booking and payment status, open My Bookings and select Refresh statuses. It shows the verified amount paid and remaining balance. I cannot confirm a transaction from chat alone; if the gateway charged you but the status stays pending, contact support with your booking reference.' } });
  if (/checklist|plan|wedding wizard|budget|event/i.test(message)) return res.json({ success: true, data: { reply: 'I can help you plan an event. Tell me the event type, city, approximate guest count, date, and budget—or open the AI Wedding Wizard for a structured plan.' } });
  return res.json({ success: true, data: { reply: 'I can help find vendors, plan an event, and explain booking or payment steps. Tell me your event type and city, or try “cheapest photographers in my city”.' } });
});

// 12. AI EVENT PLANNER (Server-Side Gemini API using @google/genai with gemini-3.7-flash)
app.post('/api/ai/plan-event', async (req, res) => {
  const { prompt, budget, guests, location, eventType } = req.body;

  const targetBudget = Number(budget) || 200000;
  const targetGuests = Number(guests) || 120;
  const targetCity = location || 'Bangalore';
  const targetEventType = eventType || 'Special Celebration';

  // Filter actual vendors from database matching city or category
  const availableVendors = vendors.map((v) => ({
    id: v.id,
    name: v.businessName,
    category: v.categoryName,
    city: v.city,
    startingPrice: v.startingPrice,
    rating: v.rating,
  }));

  const gemini = getGeminiClient();

  if (gemini) {
    try {
      const systemInstruction = `You are the Master AI Event Planner on EventSphere (India's premier multi-event marketplace).
Given a user event description and constraints, generate a realistic itemized budget allocation in INR (₹), a timeline checklist, pro tips, and match real vendor IDs from the provided database list.
CRITICAL: ONLY recommend vendor IDs that exist in the provided vendor list. Do NOT invent fake vendor IDs.`;

      const userPrompt = `Event Request: "${prompt || `${targetEventType} with ₹${targetBudget} budget for ${targetGuests} guests in ${targetCity}`}"
Constraints:
- Total Budget: ₹${targetBudget}
- Guest Count: ${targetGuests}
- Location: ${targetCity}
- Event Type: ${targetEventType}

Available Platform Vendors in Database:
${JSON.stringify(availableVendors, null, 2)}

Provide a structured JSON output with:
- eventName: Title for the event plan
- eventType: Recognized event type
- recommendedBudget: Total budget in numbers
- budgetBreakdown: Array of { category, allocatedAmount, percentage, rationale }
- timelineChecklist: Array of { phase, timeframe, tasks: string[] }
- proTips: Array of 3 expert planning tips
- matchedVendorIds: Array of vendor id strings chosen from the database
- vendorRecommendations: Array of { vendorId, vendorName, category, matchScore (80-99), matchReason, startingPrice }`;

      const response = await gemini.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              eventName: { type: Type.STRING },
              eventType: { type: Type.STRING },
              recommendedBudget: { type: Type.NUMBER },
              budgetBreakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    allocatedAmount: { type: Type.NUMBER },
                    percentage: { type: Type.NUMBER },
                    rationale: { type: Type.STRING },
                  },
                },
              },
              timelineChecklist: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    phase: { type: Type.STRING },
                    timeframe: { type: Type.STRING },
                    tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                },
              },
              proTips: { type: Type.ARRAY, items: { type: Type.STRING } },
              matchedVendorIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              vendorRecommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    vendorId: { type: Type.STRING },
                    vendorName: { type: Type.STRING },
                    category: { type: Type.STRING },
                    matchScore: { type: Type.NUMBER },
                    matchReason: { type: Type.STRING },
                    startingPrice: { type: Type.NUMBER },
                  },
                },
              },
            },
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return res.json({ success: true, data: parsed });
      }
    } catch (err) {
      console.warn('Gemini API call returned error, using fallback intelligent planner:', err);
    }
  }

  // Fallback Rule-Based Smart Event Planner Heuristics
  const venueAlloc = Math.round(targetBudget * 0.35);
  const foodAlloc = Math.round(targetBudget * 0.30);
  const decorAlloc = Math.round(targetBudget * 0.15);
  const photoAlloc = Math.round(targetBudget * 0.12);
  const musicAlloc = Math.round(targetBudget * 0.08);

  const matched = vendors.slice(0, 4).map((v, i) => ({
    vendorId: v.id,
    vendorName: v.businessName,
    category: v.categoryName,
    matchScore: 94 - i * 3,
    matchReason: `Available in ${v.city} and fits within your allocated ${v.categoryName} budget.`,
    startingPrice: v.startingPrice,
  }));

  const plan = {
    eventName: `${targetEventType} Experience Plan`,
    eventType: targetEventType,
    recommendedBudget: targetBudget,
    budgetBreakdown: [
      { category: 'Venues & Lawns', allocatedAmount: venueAlloc, percentage: 35, rationale: `Covers premium space with air conditioning and seating for ${targetGuests} guests in ${targetCity}.` },
      { category: 'Food & Catering', allocatedAmount: foodAlloc, percentage: 30, rationale: `Provides multi-course meal + welcome mocktails at ₹${Math.round(foodAlloc / targetGuests)} per plate.` },
      { category: 'Decoration & Florals', allocatedAmount: decorAlloc, percentage: 15, rationale: 'Thematic entrance archway, stage backdrop, and atmospheric lighting.' },
      { category: 'Photography & Cinema', allocatedAmount: photoAlloc, percentage: 12, rationale: 'Full-day candid photo and 4K video coverage.' },
      { category: 'Entertainment & DJ', allocatedAmount: musicAlloc, percentage: 8, rationale: 'High-energy sound setup and curated playlist.' },
    ],
    timelineChecklist: [
      { phase: '1. Foundation (6-8 Weeks Prior)', timeframe: 'Month 1', tasks: ['Lock venue reservation', 'Finalize guest list and send save-the-dates', 'Set up EventSphere budget tracker'] },
      { phase: '2. Vendor Contracting (4 Weeks Prior)', timeframe: 'Month 2', tasks: ['Schedule catering tasting', 'Book candid photographer & decorator', 'Finalize DJ playlist'] },
      { phase: '3. Final Countdown (1 Week Prior)', timeframe: 'Week 1', tasks: ['Confirm final plate count with caterer', 'Review stage setup schedule', 'Distribute digital QR passes to guests'] },
    ],
    proTips: [
      'Lock in catering plate guarantees at 85% of confirmed RSVP to avoid food waste while saving up to 15%.',
      'For indoor venues, prioritize lighting designers over heavy physical structures to create luxury depth on camera.',
      'Always request an itemized quotation with GST & logistics fees included so there are zero surprise charges on event day.',
    ],
    matchedVendorIds: matched.map((m) => m.vendorId),
    vendorRecommendations: matched,
  };

  res.json({ success: true, data: plan });
});

// ----------------------------------------------------
// Production / Development Vite Integration
// ----------------------------------------------------
// Inserts dummy vendors and approved services once, so the marketplace is never empty on a fresh or
// half-seeded database. Idempotent (upsert by id) and guarded by a flag so admin deletions stick.
async function ensureDemoMarketplace() {
  const meta = collection<any>('meta');
  if (await meta.findOne({ id: 'demoMarketplaceV1' })) return;
  const allVendors: Vendor[] = [...JSON.parse(JSON.stringify(SEED_VENDORS)), ...DEMO_VENDORS];
  const vendorCol = collection<any>('vendors');
  const existingIds = new Set((await vendorCol.find({}, { projection: { id: 1 } }).toArray()).map((v: any) => v.id));
  const newVendors = allVendors.filter((v) => !existingIds.has(v.id));
  if (newVendors.length) await vendorCol.insertMany(newVendors as any);
  const verified = allVendors.filter((v) => v.verified || v.verificationStatus === 'verified');
  const serviceCol = collection<any>('vendorServices');
  const existingSvc = new Set((await serviceCol.find({}, { projection: { id: 1 } }).toArray()).map((s: any) => s.id));
  const newServices = buildServicesForVendors(verified).filter((s) => !existingSvc.has(s.id));
  if (newServices.length) await serviceCol.insertMany(newServices as any);
  await meta.insertOne({ id: 'demoMarketplaceV1', createdAt: new Date().toISOString(), vendors: newVendors.length, services: newServices.length });
  console.log(`Demo marketplace seeded: ${newVendors.length} vendors, ${newServices.length} services.`);
}

async function startServer() {
  await connectMongo();
  eventCategories = await seedCollection('eventCategories', JSON.parse(JSON.stringify(SEED_EVENT_CATEGORIES)));
  vendorCategories = await seedCollection('vendorCategories', JSON.parse(JSON.stringify(SEED_VENDOR_CATEGORIES)));
  vendors = await seedCollection('vendors', JSON.parse(JSON.stringify(SEED_VENDORS)));
  vendorServices = await seedCollection('vendorServices', []);
  if (vendorServices.length === 0) {
    const sampleServices: VendorService[] = vendors.filter(v => v.verified || v.verificationStatus === 'verified').map((v, i) => ({
      id: `svc_seed_${v.id}`, vendorId: v.id, serviceName: v.packages?.[0]?.name || `${v.categoryName} Service`,
      categoryId: v.categoryId, categoryName: v.categoryName, subcategory: v.subcategory,
      description: v.about || `Professional ${v.categoryName.toLowerCase()} services for your celebration.`,
      price: v.startingPrice || (15000 + i * 5000), city: v.city, eventTypes: ['Wedding','Birthday','Corporate Event','Party','Conference'],
      includedServices: v.services?.slice(0, 3) || ['Professional service team', 'Event-day coordination'],
      images: [v.coverImage || v.logo].filter(Boolean), contactPhone: v.phone, contactEmail: v.email, status: 'approved',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    }));
    if (sampleServices.length) {
      vendorServices = await seedCollection('vendorServices', sampleServices);
    }
  }
  await ensureDemoMarketplace();
  vendors = await collection<any>('vendors').find({}).toArray() as Vendor[];
  vendorServices = await collection<any>('vendorServices').find({}).toArray() as VendorService[];
  users = await seedCollection('users', []);
  events = await seedCollection('events', []);
  checklistItems = await seedCollection('checklistItems', []);
  budgetItems = await seedCollection('budgetItems', []);
  enquiries = await seedCollection('enquiries', []);
  quotations = await seedCollection('quotations', []);
  bookings = await seedCollection('bookings', []);
  await collection<any>('bookings').createIndex({ serviceId: 1, eventDate: 1, startTime: 1 }, { unique: true, partialFilterExpression: { serviceId: { $exists: true }, startTime: { $exists: true }, bookingStatus: { $in: ['pending', 'confirmed', 'in_progress'] } } }).catch(() => undefined);
  await collection<any>('emailOtpChallenges').createIndex({ email: 1 }, { unique: true }).catch(() => undefined);
  await collection<any>('emailOtpChallenges').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => undefined);
  reviews = await seedCollection('reviews', JSON.parse(JSON.stringify(SEED_REVIEWS)));
  await seedCollection('complaints', []);
  notifications = await seedCollection('notifications', []);
  payments = await seedCollection('payments', []);
  // Create a real admin account from environment variables if one does not exist.
  const adminEmail = String(process.env.ADMIN_EMAIL || 'admin@eventsphere.local').trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || 'Admin@12345');
  if (!(await collection<any>('users').findOne({ email: adminEmail }))) {
    const adminUser: User = {
      id: `user_admin_${Date.now()}`,
      name: 'EventSphere Admin',
      email: adminEmail,
      phone: '',
      role: 'admin',
      city: 'Bangalore',
      createdAt: new Date().toISOString()
    };
    await collection<any>('users').insertOne({ ...adminUser, passwordHash: await bcrypt.hash(adminPassword, 12) });
    users.push(adminUser);
  }

  const favoriteDocs = await seedCollection('favorites', []);
  savedFavoriteVendorIds = favoriteDocs[0]?.vendorIds || [];

  // Keep API failures machine-readable so the frontend can show the real cause.
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('EventSphere request error:', err?.message || err);
    if (res.headersSent) return;
    const status = err?.type === 'entity.too.large' ? 413 : (Number(err?.status) >= 400 ? Number(err.status) : 500);
    res.status(status).json({ success: false, message: status === 413 ? 'Uploaded photos are too large. Please use smaller images.' : (err?.message || 'Unexpected server error.') });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EventSphere full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
