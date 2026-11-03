import { Vendor, VendorService, VendorPackage } from '../types';
import { SEED_VENDORS } from './seedData';

/**
 * Dummy marketplace data so the Vendors page is never empty in demos.
 * All demo vendors use the id prefix "demo_" so they are easy to spot or remove.
 */
type Row = [name: string, city: string, price: number, rating: number, reviews: number, featured: boolean];
type Cat = { id: string; name: string; sub: string; services: string[]; rows: Row[] };

const CATS: Cat[] = [
  { id: 'cat_venues', name: 'Venues', sub: 'Banquet Halls', services: ['AC Banquet Hall', 'In-house Parking', 'Bridal Suite', 'Stage & Lighting', 'Power Backup'], rows: [
    ['The Grand Orchid Banquets', 'Bangalore', 120000, 4.7, 96, true], ['Lakeview Garden Lawns', 'Bangalore', 85000, 4.5, 61, false],
    ['Marine Drive Celebrations Hall', 'Mumbai', 175000, 4.6, 73, false], ['Pink City Heritage Haveli', 'Jaipur', 210000, 4.8, 58, true] ] },
  { id: 'cat_food', name: 'Food & Catering', sub: 'Multi-cuisine Catering', services: ['North & South Indian Menu', 'Live Counters', 'Dessert Station', 'Serving Staff', 'Crockery & Cutlery'], rows: [
    ['Spice Route Caterers', 'Bangalore', 700, 4.6, 112, true], ['Annapurna Feast Co.', 'Hyderabad', 650, 4.5, 88, false],
    ['Saffron Table Catering', 'Delhi NCR', 900, 4.7, 69, false], ['Sweet Tooth Cakes & Bakes', 'Bangalore', 1800, 4.8, 134, true] ] },
  { id: 'cat_photo', name: 'Photography & Cinema', sub: 'Wedding Photography', services: ['Candid Photography', 'Cinematic Film', 'Drone Coverage', 'Pre-wedding Shoot', 'Premium Album'], rows: [
    ['Frame & Fable Studios', 'Bangalore', 45000, 4.9, 142, true], ['Golden Hour Candids', 'Mumbai', 60000, 4.7, 90, false],
    ['Lens Story Productions', 'Hyderabad', 38000, 4.5, 64, false], ['Moments by Meera', 'Delhi NCR', 52000, 4.6, 77, false] ] },
  { id: 'cat_decor', name: 'Decoration & Florals', sub: 'Stage & Floral Decor', services: ['Floral Stage Design', 'Entrance Decor', 'Fairy Light Canopy', 'Table Centrepieces', 'Theme Props'], rows: [
    ['Petal & Pearl Decorators', 'Bangalore', 55000, 4.7, 101, true], ['Utsav Decor Studio', 'Mumbai', 80000, 4.6, 83, false],
    ['Blossom Bliss Events', 'Hyderabad', 48000, 4.4, 57, false], ['Rangoli Royale Decor', 'Jaipur', 70000, 4.8, 66, false] ] },
  { id: 'cat_ent', name: 'Entertainment & Artists', sub: 'DJs & Live Music', services: ['Professional DJ', 'Live Band', 'Sound & Lights', 'Emcee / Anchor', 'Dance Floor Setup'], rows: [
    ['DJ Nexus Live', 'Bangalore', 30000, 4.6, 118, true], ['Raaga Live Band', 'Bangalore', 55000, 4.7, 74, false],
    ['Beat Brigade Entertainment', 'Mumbai', 42000, 4.5, 92, false], ['Dhol Wale Baraat Band', 'Delhi NCR', 25000, 4.6, 81, false] ] },
  { id: 'cat_beauty', name: 'Beauty & Mehendi', sub: 'Bridal Makeup', services: ['HD Bridal Makeup', 'Hair Styling', 'Saree Draping', 'Mehendi Artist', 'Trial Session'], rows: [
    ['Glow by Shruti Makeovers', 'Bangalore', 22000, 4.8, 147, true], ['Henna Haven by Zoya', 'Hyderabad', 9000, 4.7, 105, false],
    ['Aura Bridal Studio', 'Mumbai', 35000, 4.6, 79, false], ['Mehendi Magic by Priya', 'Bangalore', 7500, 4.9, 163, true] ] },
  { id: 'cat_equip', name: 'Sound, AV & Lighting', sub: 'Sound & Lighting', services: ['Line-array Sound', 'LED Wall', 'Stage Lighting', 'Truss Setup', 'On-site Technician'], rows: [
    ['SoundCraft AV Rentals', 'Bangalore', 28000, 4.5, 70, false], ['Lumina Light & LED', 'Mumbai', 40000, 4.6, 62, false],
    ['StageWorks Productions', 'Delhi NCR', 65000, 4.7, 55, false], ['PixelWall LED Screens', 'Hyderabad', 35000, 4.4, 48, false] ] },
  { id: 'cat_rentals', name: 'Rentals & Furniture', sub: 'Event Furniture Rental', services: ['Chairs & Tables', 'Sofas & Lounge Sets', 'Tents & Pandals', 'Cutlery Rental', 'Delivery & Setup'], rows: [
    ['Comfort Seats Event Rentals', 'Bangalore', 15000, 4.5, 66, false], ['Shamiana Tent House', 'Jaipur', 30000, 4.6, 59, false],
    ['Lounge & Co. Furniture', 'Mumbai', 26000, 4.4, 51, false], ['Royal Seating Rentals', 'Delhi NCR', 20000, 4.5, 63, false] ] },
  { id: 'cat_invites', name: 'Invitations & Favors', sub: 'Wedding Invitations', services: ['Custom Card Design', 'Digital E-Invites', 'Return Gifts', 'Hamper Packing', 'Bulk Printing'], rows: [
    ['Inkwell Invitations', 'Bangalore', 8000, 4.6, 72, false], ['Gift Gully Return Gifts', 'Mumbai', 12000, 4.5, 58, false],
    ['Card Kahani Designs', 'Hyderabad', 6500, 4.7, 49, false], ['Shagun Hampers', 'Jaipur', 14000, 4.6, 53, false] ] },
];

const slug = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const AREAS: Record<string, string[]> = {
  Bangalore: ['Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'Jayanagar'],
  Mumbai: ['Bandra', 'Andheri', 'Juhu', 'Powai', 'Worli'],
  'Delhi NCR': ['Connaught Place', 'Gurugram', 'Noida', 'Saket', 'Dwarka'],
  Hyderabad: ['Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'Madhapur', 'Kondapur'],
  Jaipur: ['C-Scheme', 'Malviya Nagar', 'Vaishali Nagar', 'Mansarovar', 'Civil Lines'],
};

function buildVendors(): Vendor[] {
  const out: Vendor[] = [];
  CATS.forEach((cat) => {
    const pool = SEED_VENDORS.filter((v) => v.categoryId === cat.id);
    const images = pool.flatMap((v) => [v.coverImage, ...(v.portfolio || []).map((p) => p.url)]).filter(Boolean);
    const fallback = SEED_VENDORS[0].coverImage;
    cat.rows.forEach(([name, city, price, rating, reviews, featured], i) => {
      const id = `demo_${slug(name)}`;
      const cover = images[i % Math.max(1, images.length)] || fallback;
      const pkg = (tier: VendorPackage['tier'], label: string, mult: number, n: number): VendorPackage => ({
        id: `${id}_pkg_${n}`, name: `${label} Package`, tier, price: Math.round((price * mult) / 500) * 500,
        description: `${label} option from ${name} with ${cat.services.slice(0, 2 + n).join(', ')}.`,
        servicesIncluded: cat.services.slice(0, 2 + n), duration: n === 1 ? '4 Hours' : n === 2 ? '8 Hours' : 'Full Day',
        staffCount: 2 + n * 3, additionalCharges: 'Travel outside the city may be charged extra.', terms: '30% advance to block the date, balance before the event.',
      });
      out.push({
        id, userId: `user_${id}`, businessName: name, slug: slug(name), categoryId: cat.id, categoryName: cat.name, subcategory: cat.sub,
        city, areasServed: AREAS[city] || [city], pincode: '560001', serviceRadiusKm: 40, startingPrice: price, rating, reviewCount: reviews,
        verified: true, featured, coverImage: cover, logo: images[(i + 1) % Math.max(1, images.length)] || cover,
        about: `${name} is a trusted ${cat.sub.toLowerCase()} provider in ${city}, known for reliable service, transparent pricing and on-time delivery for weddings, birthdays and corporate events.`,
        experienceYears: 4 + ((i * 3 + reviews) % 11), services: cat.services,
        packages: [pkg('basic', 'Essential', 1, 1), pkg('standard', 'Signature', 1.8, 2), pkg('premium', 'Premium', 3, 3)],
        portfolio: images.slice(i, i + 3).map((url, k) => ({ id: `${id}_port_${k}`, url, caption: `${cat.sub} by ${name}`, eventType: k === 0 ? 'Wedding' : 'Birthday' })),
        bookedDates: [], workingHours: { start: '09:00', end: '21:00', slotDurationMinutes: 60, days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], blockedDates: [] },
        faq: [
          { question: 'How far in advance should we book?', answer: 'We recommend booking 4 to 8 weeks ahead, and earlier for peak wedding season.' },
          { question: 'Can packages be customised?', answer: 'Yes, share your requirements and budget and we will tailor a quote.' },
        ],
        phone: '+91 98000 ' + String(10000 + ((reviews * 37 + i * 11) % 89999)).slice(0, 5), email: `hello@${slug(name)}.example.com`,
        address: `${(AREAS[city] || [city])[0]}, ${city}`, responseTimeHours: 1 + (i % 4), completedEventsCount: reviews * 3,
        verificationStatus: 'verified',
      });
    });
  });
  return out;
}

export const DEMO_VENDORS: Vendor[] = buildVendors();

/** Approved marketplace services (2 per demo vendor) so listings appear on the Vendors page. */
export function buildServicesForVendors(vendors: Vendor[]): VendorService[] {
  const now = new Date().toISOString();
  return vendors.flatMap((v) =>
    (v.packages || []).slice(0, 2).map((p, idx) => ({
      id: `svc_seed_${v.id}${idx === 0 ? '' : `_${idx + 1}`}`, vendorId: v.id, serviceName: `${v.subcategory} - ${p.name}`,
      categoryId: v.categoryId, categoryName: v.categoryName, subcategory: v.subcategory, description: p.description || v.about,
      price: p.price, city: v.city, eventTypes: ['Wedding', 'Birthday', 'Corporate Event', 'Party', 'Engagement'],
      includedServices: p.servicesIncluded || v.services.slice(0, 3), images: [v.coverImage || v.logo].filter(Boolean), coverImage: v.coverImage,
      contactPhone: v.phone, contactEmail: v.email, status: 'approved' as const, createdAt: now, updatedAt: now,
    }))
  );
}
