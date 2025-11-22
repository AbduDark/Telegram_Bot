import { RowDataPacket } from 'mysql2/promise';
import { 
  hasActiveSubscription, 
  facebookPool, 
  contactsPool 
} from './database';

function normalizePhone(s: string): string {
  if (!s) return '';
  s = s.trim();
  s = s.replace(/[^\d+]/g, '');
  if (s.startsWith('+')) {
    return s;
  }
  if (s.startsWith('00')) {
    return '+' + s.substring(2);
  }
  return s;
}

function phoneVariants(p: string): Set<string> {
  p = normalizePhone(p);
  const variants = new Set<string>();
  
  if (!p) return variants;
  
  variants.add(p);
  
  if (p.startsWith('+')) {
    variants.add(p.substring(1));
    variants.add('00' + p.substring(1));
    if (p.length > 10) {
      const lastDigits = p.substring(p.length - 10);
      variants.add('0' + lastDigits);
    }
  } else {
    variants.add('+' + p);
    if (!p.startsWith('00')) {
      variants.add('00' + p);
    }
    if (p.startsWith('0') && p.length > 1) {
      variants.add(p.substring(1));
    }
  }
  
  return variants;
}

interface FacebookResult {
  id: number;
  facebook_id: string | null;
  phone: string | null;
  name: string | null;
  facebook_url: string | null;
  email: string | null;
  location: string | null;
  job: string | null;
  gender: string | null;
}

interface ContactResult {
  id: number;
  name: string | null;
  address: string | null;
  phone: string | null;
  phone2: string | null;
}

export interface PhoneLookupResult {
  userType: 'vip' | 'regular' | 'no_subscription';
  facebook: FacebookResult[];
  contacts: ContactResult[];
}

export async function lookupFacebookId(
  facebookId: string,
  telegramUserId: number
): Promise<PhoneLookupResult> {
  console.log(`🔍 [FacebookIdLookup] Starting lookup for user ${telegramUserId}`);
  
  const subscription = await hasActiveSubscription(telegramUserId);
  
  if (!subscription.hasSubscription) {
    console.log('⚠️  [FacebookIdLookup] No active subscription');
    return {
      userType: 'no_subscription',
      facebook: [],
      contacts: []
    };
  }

  const userType = subscription.subscriptionType || 'regular';
  const searchTerm = facebookId.trim();

  console.log(`📝 [FacebookIdLookup] User type: ${userType}, Searching for ID: ${searchTerm}`);

  const facebookResults: FacebookResult[] = [];

  try {
    const likePattern = `%${searchTerm}%`;
    
    const facebookQuery = `
      SELECT id, facebook_id, phone, name, facebook_url, email, location, job, gender
      FROM facebook_accounts
      WHERE facebook_id LIKE ?
      LIMIT 100
    `;
    
    console.log(`🔍 [FacebookIdLookup] Querying Facebook with pattern:`, likePattern);
    const [fbRows] = await facebookPool.query<RowDataPacket[]>(facebookQuery, [likePattern]);
    
    fbRows.forEach((row: any) => {
      facebookResults.push({
        id: row.id,
        facebook_id: row.facebook_id,
        phone: row.phone,
        name: row.name,
        facebook_url: row.facebook_url,
        email: row.email,
        location: row.location,
        job: row.job,
        gender: row.gender
      });
    });

    console.log(`✅ [FacebookIdLookup] Found ${facebookResults.length} Facebook results`);

    return {
      userType: userType as 'vip' | 'regular',
      facebook: facebookResults,
      contacts: [] // Facebook ID search doesn't search in contacts
    };

  } catch (error) {
    console.error('❌ [FacebookIdLookup] Database error:', error);
    throw new Error('فشل البحث في قاعدة البيانات');
  }
}

export async function lookupPhoneNumber(
  phone: string,
  telegramUserId: number
): Promise<PhoneLookupResult> {
  console.log(`🔍 [PhoneLookup] Starting lookup for user ${telegramUserId}`);
  
  const subscription = await hasActiveSubscription(telegramUserId);
  
  if (!subscription.hasSubscription) {
    console.log('⚠️  [PhoneLookup] No active subscription');
    return {
      userType: 'no_subscription',
      facebook: [],
      contacts: []
    };
  }

  const userType = subscription.subscriptionType || 'regular';
  
  // Generate multiple search variants for Egyptian numbers
  const originalSearchTerm = phone.trim();
  const searchVariants: string[] = [originalSearchTerm];
  
  // If starts with 0, add variants with 20, 020, +20
  if (originalSearchTerm.startsWith('0') && originalSearchTerm.length >= 10) {
    const withoutZero = originalSearchTerm.substring(1);
    searchVariants.push('20' + withoutZero);      // 01234567890 -> 201234567890
    searchVariants.push('020' + withoutZero);     // 01234567890 -> 0201234567890
    searchVariants.push('+20' + withoutZero);     // 01234567890 -> +201234567890
  }

  console.log(`📝 [PhoneLookup] User type: ${userType}, Search variants:`, searchVariants);

  const facebookResults: FacebookResult[] = [];
  const contactResults: ContactResult[] = [];

  try {
    // Build OR conditions for all search variants using LIKE
    const conditions = searchVariants.map(() => 'phone LIKE ?').join(' OR ');
    const patterns = searchVariants.map(v => `%${v}%`);
    
    const facebookQuery = `
      SELECT id, facebook_id, phone, name, facebook_url, email, location, job, gender
      FROM facebook_accounts
      WHERE ${conditions}
      LIMIT 100
    `;
    
    console.log(`🔍 [PhoneLookup] Querying Facebook with patterns:`, patterns);
    const [fbRows] = await facebookPool.query<RowDataPacket[]>(facebookQuery, patterns);
    
    fbRows.forEach((row: any) => {
      facebookResults.push({
        id: row.id,
        facebook_id: row.facebook_id,
        phone: row.phone,
        name: row.name,
        facebook_url: row.facebook_url,
        email: row.email,
        location: row.location,
        job: row.job,
        gender: row.gender
      });
    });

    console.log(`✅ [PhoneLookup] Found ${facebookResults.length} Facebook results`);

    if (userType === 'vip') {
      // Build OR conditions for all search variants (for both phone and phone2)
      const contactConditions = searchVariants.map(() => '(phone LIKE ? OR phone2 LIKE ?)').join(' OR ');
      const contactPatterns: string[] = [];
      searchVariants.forEach(v => {
        contactPatterns.push(`%${v}%`);
        contactPatterns.push(`%${v}%`);
      });
      
      const contactQuery = `
        SELECT id, name, address, phone, phone2
        FROM contacts
        WHERE ${contactConditions}
        LIMIT 100
      `;
      
      console.log(`🔍 [PhoneLookup] Querying Contacts with patterns:`, contactPatterns);
      const [contactRows] = await contactsPool.query<RowDataPacket[]>(contactQuery, contactPatterns);
      
      contactRows.forEach((row: any) => {
        contactResults.push({
          id: row.id,
          name: row.name,
          address: row.address,
          phone: row.phone,
          phone2: row.phone2
        });
      });

      console.log(`✅ [PhoneLookup] Found ${contactResults.length} Contact results`);
    }

    return {
      userType: userType as 'vip' | 'regular',
      facebook: facebookResults,
      contacts: contactResults
    };

  } catch (error) {
    console.error('❌ [PhoneLookup] Database error:', error);
    throw new Error('فشل البحث في قاعدة البيانات');
  }
}
