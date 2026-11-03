import {
  User,
  Vendor,
  EventCategory,
  VendorCategory,
  UserEvent,
  EventChecklistItem,
  EventBudgetItem,
  Enquiry,
  Quotation,
  Booking,
  PaymentTransaction,
  VendorReview,
  VendorService,
  ChatMessage,
  Conversation,
  NotificationItem,
  AiPlanResponse,
} from '../types';

const TOKEN_KEY = 'eventsphere_token';
// The login token lives in localStorage so it survives the redirect to Stripe/Razorpay and back (and new tabs).
export const authToken = {
  get(): string | null {
    try { return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token: string) {
    try { localStorage.setItem(TOKEN_KEY, token); sessionStorage.removeItem(TOKEN_KEY); } catch { try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* storage unavailable */ } }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? authToken.get() : null;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string> | undefined),
    },
  });

  const raw = await res.text();
  let json: any;
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    const preview = raw.replace(/\s+/g, ' ').slice(0, 180);
    throw new Error(`Server returned an invalid response (HTTP ${res.status}). ${preview || 'Empty response'}`);
  }
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `API request failed (HTTP ${res.status})`);
  }
  return json.data as T;
}

export const api = {
  // Auth
  getMe: () => fetchJson<{ user: User | null; availableUsers: User[] }>('/api/auth/me'),
  login: (payload: { email?: string; phone?: string; password: string; role?: 'customer' | 'vendor' | 'admin' }) =>
    fetchJson<{ user: User; token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  requestEmailOtp: (email: string) => fetchJson<{ message: string; expiresIn: number; resendAfter: number }>('/api/auth/otp/request', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyEmailOtp: (email: string, otp: string) => fetchJson<{ user: User; token: string }>('/api/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  loginWithGoogle: (credential: string) => fetchJson<{ user: User; token: string }>('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  logout: () => fetchJson<{ message: string }>('/api/auth/logout', { method: 'POST' }),
  register: (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: string;
    city?: string;
    businessName?: string;
    categoryId?: string;
  }) =>
    fetchJson<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Categories
  getEventCategories: () => fetchJson<EventCategory[]>('/api/categories/events'),
  getVendorCategories: () => fetchJson<VendorCategory[]>('/api/categories/vendors'),

  // Vendors
  getVendors: (params?: {
    q?: string;
    category?: string;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
    verified?: boolean;
    eventType?: string;
    sort?: string;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          query.set(k, String(v));
        }
      });
    }
    return fetchJson<Vendor[]>(`/api/vendors?${query.toString()}`);
  },
  getVendorById: (id: string) => fetchJson<Vendor & { reviews: VendorReview[] }>(`/api/vendors/${id}`),
  getMyVendor: () => fetchJson<Vendor>('/api/vendors/mine'),
  updateVendor: (id: string, data: Partial<Vendor>) =>
    fetchJson<Vendor>(`/api/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Vendor services
  getMyServices: () => fetchJson<VendorService[]>('/api/services/mine'),
  createService: (data: Partial<VendorService>) =>
    fetchJson<VendorService>('/api/services', { method: 'POST', body: JSON.stringify(data) }),
  getServices: (status = 'approved') => fetchJson<VendorService[]>(`/api/services?status=${encodeURIComponent(status)}`),
  updateService: (id: string, data: Partial<VendorService>) =>
    fetchJson<VendorService>(`/api/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getAdminServices: (status?: string) =>
    fetchJson<VendorService[]>(`/api/admin/services${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  approveService: (id: string) =>
    fetchJson<VendorService>(`/api/admin/services/${id}/approve`, { method: 'POST' }),
  rejectService: (id: string, rejectionReason: string) =>
    fetchJson<VendorService>(`/api/admin/services/${id}/reject`, { method: 'POST', body: JSON.stringify({ rejectionReason }) }),

  // Events
  getEvents: () => fetchJson<UserEvent[]>('/api/events'),
  createEvent: (data: Partial<UserEvent>) =>
    fetchJson<UserEvent>('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateEvent: (id: string, data: Partial<UserEvent>) =>
    fetchJson<UserEvent>(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteEvent: (id: string) =>
    fetchJson<{ message: string }>(`/api/events/${id}`, { method: 'DELETE' }),

  // Checklist
  getChecklist: (eventId: string) => fetchJson<EventChecklistItem[]>(`/api/events/${eventId}/checklist`),
  addChecklistItem: (eventId: string, data: Partial<EventChecklistItem>) =>
    fetchJson<EventChecklistItem>(`/api/events/${eventId}/checklist`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateChecklistItem: (eventId: string, itemId: string, data: Partial<EventChecklistItem>) =>
    fetchJson<EventChecklistItem>(`/api/events/${eventId}/checklist/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteChecklistItem: (eventId: string, itemId: string) =>
    fetchJson<{ message: string }>(`/api/events/${eventId}/checklist/${itemId}`, {
      method: 'DELETE',
    }),

  // Budget
  getBudget: (eventId: string) =>
    fetchJson<{
      items: EventBudgetItem[];
      summary: { totalPlanned: number; totalQuoted: number; totalPaid: number; remaining: number };
    }>(`/api/events/${eventId}/budget`),
  addBudgetItem: (eventId: string, data: Partial<EventBudgetItem>) =>
    fetchJson<EventBudgetItem>(`/api/events/${eventId}/budget`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateBudgetItem: (eventId: string, itemId: string, data: Partial<EventBudgetItem>) =>
    fetchJson<EventBudgetItem>(`/api/events/${eventId}/budget/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Enquiries
  getEnquiries: () => fetchJson<Enquiry[]>('/api/enquiries'),
  createEnquiry: (data: Partial<Enquiry>) =>
    fetchJson<Enquiry>('/api/enquiries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Quotations
  getQuotations: () => fetchJson<Quotation[]>('/api/quotations'),
  createQuotation: (data: any) =>
    fetchJson<Quotation>('/api/quotations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  acceptQuotation: (id: string) =>
    fetchJson<{ quote: Quotation; booking: Booking }>(`/api/quotations/${id}/accept`, {
      method: 'POST',
    }),
  rejectQuotation: (id: string) =>
    fetchJson<Quotation>(`/api/quotations/${id}/reject`, {
      method: 'POST',
    }),

  // Bookings
  getBookings: () => fetchJson<Booking[]>('/api/bookings'),
  createBooking: (data: Partial<Booking>) =>
    fetchJson<Booking>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getServiceAvailability: (serviceId: string, date: string) =>
    fetchJson<{ date: string; slots: { startTime: string; endTime: string; status: 'available' | 'booked' }[] }>(`/api/services/${serviceId}/availability?date=${encodeURIComponent(date)}`),
  acceptBooking: (id: string) => fetchJson<Booking>(`/api/bookings/${id}/accept`, { method: 'POST' }),
  rejectBooking: (id: string, reason?: string) => fetchJson<Booking>(`/api/bookings/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  completeBooking: (id: string) => fetchJson<Booking>(`/api/bookings/${id}/complete`, { method: 'POST' }),
  updateVendorAvailability: (vendorId: string, data: any) => fetchJson<Vendor>(`/api/vendors/${vendorId}/availability`, { method: 'PUT', body: JSON.stringify(data) }),

  // Stripe Checkout: amounts are calculated and validated on the backend.
  createStripeCheckoutSession: (bookingId: string, paymentPlan: 'full' | 'advance' | 'balance') =>
    fetchJson<{ checkoutUrl: string; sessionId: string; paymentId: string; amount: number; currency: string; paymentPlan: string }>('/api/payments/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ bookingId, paymentPlan, returnOrigin: window.location.origin }),
    }),

  confirmStripePayments: (sessionId?: string) => fetchJson<{ applied: number }>('/api/payments/confirm-session', { method: 'POST', body: JSON.stringify({ sessionId }) }),
  createRazorpayOrder: (bookingId: string, paymentPlan: 'full' | 'advance' | 'balance') => fetchJson<{ order_id: string; amount: number; currency: string; key_id: string }>('/api/create-order', { method: 'POST', body: JSON.stringify({ bookingId, paymentPlan }) }),
  verifyRazorpayPayment: (payload: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => fetchJson<{ verified: boolean }>('/api/verify-payment', { method: 'POST', body: JSON.stringify(payload) }),

  createComplaint: (payload: { subject: string; message: string; bookingId?: string }) => fetchJson<any>('/api/complaints', { method: 'POST', body: JSON.stringify(payload) }),
  getAdminPayments: () => fetchJson<any[]>('/api/admin/payments'),
  getAdminVendorDetails: (id: string) => fetchJson<any>(`/api/admin/vendors/${encodeURIComponent(id)}/details`),
  removeAdminService: (id: string) => fetchJson<{ removed: boolean; id: string }>(`/api/admin/services/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getAdminVendors: () => fetchJson<Vendor[]>('/api/admin/vendors'),
  getAdminReviews: () => fetchJson<VendorReview[]>('/api/reviews'),
  getAdminServicesAll: () => fetchJson<VendorService[]>('/api/admin/services?status=all'),
  getAdminCustomers: () => fetchJson<User[]>('/api/admin/customers'),
  suspendVendor: (id: string, suspended: boolean, reason?: string) => fetchJson<Vendor>(`/api/admin/vendors/${id}/suspend`, { method: 'POST', body: JSON.stringify({ suspended, reason }) }),
  setAdminVendorVerification: (id: string, verified: boolean) => fetchJson<Vendor>(`/api/admin/vendors/${id}/verify`, { method: 'POST', body: JSON.stringify({ status: verified ? 'verified' : 'pending' }) }),
  deleteAdminReview: (id: string) => fetchJson<{ deleted: boolean }>(`/api/admin/reviews/${id}`, { method: 'DELETE' }),
  refundAdminPayment: (id: string) => fetchJson<{ refunded: boolean }>(`/api/admin/payments/${id}/refund`, { method: 'POST' }),

  // Reviews
  replyToReview: (id: string, comment: string) => fetchJson<VendorReview>(`/api/reviews/${encodeURIComponent(id)}/reply`, { method: 'POST', body: JSON.stringify({ comment }) }),
  getReviews: (vendorId?: string) =>
    fetchJson<VendorReview[]>(`/api/reviews${vendorId ? `?vendorId=${vendorId}` : ''}`),
  createReview: (data: {
    vendorId: string;
    rating: number;
    comment: string;
    eventType: string;
    photos?: string[];
  }) =>
    fetchJson<VendorReview>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Chat
  getConversations: () => fetchJson<Conversation[]>('/api/chat/conversations'),
  getMessages: (conversationId: string) =>
    fetchJson<ChatMessage[]>(`/api/chat/messages/${conversationId}`),
  sendMessage: (payload: {
    conversationId?: string;
    vendorId?: string;
    text: string;
    bookingContextId?: string;
  }) =>
    fetchJson<ChatMessage>('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Favorites
  getFavorites: () => fetchJson<Vendor[]>('/api/favorites'),
  toggleFavorite: (vendorId: string) =>
    fetchJson<string[]>('/api/favorites/toggle', {
      method: 'POST',
      body: JSON.stringify({ vendorId }),
    }),

  // Notifications
  getNotifications: () => fetchJson<NotificationItem[]>('/api/notifications'),
  markNotificationRead: (id: string) =>
    fetchJson<{ message: string }>(`/api/notifications/${id}/read`, { method: 'PUT' }),

  // Admin
  getAdminStats: () => fetchJson<any>('/api/admin/stats'),
  verifyVendor: (vendorId: string, status: 'verified' | 'rejected') =>
    fetchJson<Vendor>(`/api/admin/vendors/${vendorId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  toggleFeaturedVendor: (vendorId: string) =>
    fetchJson<Vendor>(`/api/admin/vendors/${vendorId}/toggle-featured`, {
      method: 'POST',
    }),

  // AI Event Planner
  planEventWithAi: (payload: {
    prompt?: string;
    budget?: number;
    guests?: number;
    location?: string;
    eventType?: string;
  }) =>
    fetchJson<AiPlanResponse>('/api/ai/plan-event', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
