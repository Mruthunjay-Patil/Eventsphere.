export type UserRole = 'customer' | 'vendor' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  city?: string;
  createdAt: string;
}

export interface EventCategory {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  image: string;
  iconName: string;
  popularServices: string[];
  typicalServices?: string[];
  defaultBudgetSplit: { category: string; percentage: number }[];
  defaultChecklist: { task: string; category: string; daysBeforeEvent: number }[];
}

export interface VendorCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  image: string;
  subcategories: string[];
  avgPriceRange: string;
}

export interface VendorPackage {
  id: string;
  name: string;
  tier: 'basic' | 'standard' | 'premium' | 'custom';
  price: number;
  description: string;
  servicesIncluded: string[];
  duration: string;
  staffCount: number;
  additionalCharges?: string;
  terms?: string;
  badge?: string;
}

export interface VendorReview {
  id: string;
  vendorId: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  eventType: string;
  rating: number;
  date: string;
  comment: string;
  photos?: string[];
  vendorReply?: {
    comment: string;
    date: string;
  };
  verifiedBooking: boolean;
}


export interface VendorService {
  id: string;
  vendorId: string;
  serviceName: string;
  categoryId: string;
  categoryName: string;
  subcategory?: string;
  description: string;
  price: number;
  city: string;
  eventTypes: string[];
  includedServices: string[];
  images: string[];
  coverImage?: string;
  contactPhone?: string;
  contactEmail?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  userId: string;
  businessName: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  subcategory: string;
  city: string;
  areasServed: string[];
  pincode: string;
  serviceRadiusKm: number;
  startingPrice: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  featured: boolean;
  coverImage: string;
  logo: string;
  about: string;
  experienceYears: number;
  services: string[];
  packages: VendorPackage[];
  portfolio: { id: string; url: string; caption: string; eventType?: string }[];
  bookedDates: string[]; // YYYY-MM-DD
  workingHours?: { start: string; end: string; slotDurationMinutes: number; days: string[]; blockedDates: string[] };
  faq: { question: string; answer: string }[];
  phone: string;
  email: string;
  address: string;
  responseTimeHours: number;
  completedEventsCount: number;
  verificationStatus: 'verified' | 'pending' | 'unverified';
  kycDocUrl?: string;
}

export interface UserEvent {
  id: string;
  userId: string;
  title: string;
  eventType: string;
  eventCategorySlug: string;
  date: string;
  time: string;
  locationCity: string;
  venueAddress?: string;
  guestCount: number;
  totalBudget: number;
  currency: string;
  spentAmount: number;
  requiredServices: string[];
  status: 'planning' | 'booked' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface EventChecklistItem {
  id: string;
  eventId: string;
  title: string;
  category: string;
  deadline?: string;
  completed: boolean;
  assignedVendorId?: string;
  estimatedCost?: number;
  notes?: string;
}

export interface EventBudgetItem {
  id: string;
  eventId: string;
  category: string;
  plannedAmount: number;
  quotedAmount: number;
  paidAmount: number;
  notes?: string;
}

export interface Enquiry {
  id: string;
  eventId?: string;
  eventTitle?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vendorId: string;
  vendorName: string;
  vendorCategory: string;
  vendorLogo: string;
  packageId?: string;
  packageName?: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  budget: number;
  requirements: string;
  status: 'pending' | 'quoted' | 'declined' | 'converted';
  createdAt: string;
  updatedAt: string;
}

export interface QuotationLineItem {
  name: string;
  amount: number;
  description?: string;
}

export interface Quotation {
  id: string;
  enquiryId?: string;
  eventId?: string;
  eventTitle?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  vendorId: string;
  vendorName: string;
  vendorLogo: string;
  vendorCategory: string;
  packageName?: string;
  items: QuotationLineItem[];
  subtotal: number;
  taxes: number;
  platformFee: number;
  totalAmount: number;
  validUntil: string;
  terms: string;
  notes: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'revised';
  createdAt: string;
}

export interface Booking {
  id: string;
  bookingReference: string;
  eventId?: string;
  eventTitle?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vendorId: string;
  vendorName: string;
  vendorLogo: string;
  vendorCategory: string;
  packageId?: string;
  packageName: string;
  eventDate: string;
  serviceId?: string;
  startTime?: string;
  endTime?: string;
  serviceAddress?: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'pending' | 'advance_paid' | 'fully_paid' | 'refunded';
  bookingStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
  specialRequirements?: string;
  paymentTransactionId?: string;
  paymentProvider?: string;
  paymentReference?: string;
  paymentDate?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  payments?: { id: string; amount: number; currency: string; provider: string; plan?: string; reference?: string; invoiceNumber?: string; paidAt: string }[];
  timeline: { time: string; status: string; note: string }[];
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  bookingId: string;
  bookingReference: string;
  customerId: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  currency?: string;
  provider?: 'stripe' | 'legacy';
  paymentPlan?: 'full' | 'advance' | 'balance';
  paymentMethod?: 'stripe_checkout' | 'legacy';
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  invoiceNumber: string;
  createdAt: string;
  paidAt?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: UserRole;
  senderName: string;
  text: string;
  bookingContextId?: string;
  bookingContextTitle?: string;
  attachmentUrl?: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  vendorId: string;
  vendorName: string;
  vendorAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCountCustomer: number;
  unreadCountVendor: number;
  eventId?: string;
  eventTitle?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'enquiry' | 'quote' | 'booking' | 'payment' | 'chat' | 'system';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface AiPlanResponse {
  eventName: string;
  eventType: string;
  recommendedBudget: number;
  budgetBreakdown: {
    category: string;
    allocatedAmount: number;
    percentage: number;
    rationale: string;
  }[];
  timelineChecklist: {
    phase: string;
    timeframe: string;
    tasks: string[];
  }[];
  proTips: string[];
  matchedVendorIds: string[];
  vendorRecommendations: {
    vendorId: string;
    vendorName: string;
    category: string;
    matchScore: number;
    matchReason: string;
    startingPrice: number;
  }[];
}
