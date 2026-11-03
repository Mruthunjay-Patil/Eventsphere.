export interface BrandConfig {
  name: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  primaryCurrency: {
    symbol: string;
    code: string;
    locale: string;
  };
  commissionRatePercent: number;
  popularCities: { name: string; state: string; isTop: boolean }[];
  priceTiers: { label: string; min: number; max: number }[];
  theme: {
    warmIvory: string;
    charcoal: string;
    terracotta: string;
    burgundy: string;
    mutedGold: string;
    softPeach: string;
    naturalGreen: string;
  };
}

export const BRAND_CONFIG: BrandConfig = {
  name: 'EventSphere',
  tagline: "India's Largest Wedding & Event Planning Platform",
  supportEmail: 'support@eventsphere.local',
  supportPhone: '+91 800 456 7890',
  primaryCurrency: {
    symbol: '₹',
    code: 'INR',
    locale: 'en-IN',
  },
  commissionRatePercent: 8,
  popularCities: [
    { name: 'Bangalore', state: 'Karnataka', isTop: true },
    { name: 'Mumbai', state: 'Maharashtra', isTop: true },
    { name: 'Delhi NCR', state: 'Delhi', isTop: true },
    { name: 'Hyderabad', state: 'Telangana', isTop: true },
    { name: 'Chennai', state: 'Tamil Nadu', isTop: true },
    { name: 'Jaipur', state: 'Rajasthan', isTop: true },
    { name: 'Goa', state: 'Goa', isTop: true },
    { name: 'Pune', state: 'Maharashtra', isTop: false },
    { name: 'Udaipur', state: 'Rajasthan', isTop: false },
    { name: 'Kolkata', state: 'West Bengal', isTop: false },
    { name: 'Ahmedabad', state: 'Gujarat', isTop: false },
    { name: 'Kochi', state: 'Kerala', isTop: false },
  ],
  priceTiers: [
    { label: 'Under ₹25,000', min: 0, max: 25000 },
    { label: '₹25,000 - ₹75,000', min: 25000, max: 75000 },
    { label: '₹75,000 - ₹2,00,000', min: 75000, max: 200000 },
    { label: '₹2,00,000 - ₹5,00,000', min: 200000, max: 500000 },
    { label: '₹5,00,000+', min: 500000, max: 50000000 },
  ],
  theme: {
    warmIvory: '#FFFFFF',
    charcoal: '#1A1A1A',
    terracotta: '#E83A59',
    burgundy: '#C71B48',
    mutedGold: '#D4A017',
    softPeach: '#FFF5F7',
    naturalGreen: '#10B981',
  },
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};
