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
  const variants = phoneVariants(phone);
  const phoneList = Array.from(variants);

  console.log(`📝 [PhoneLookup] User type: ${userType}, Phone variants:`, phoneList);

  const facebookResults: FacebookResult[] = [];
  const contactResults: ContactResult[] = [];

  try {
    const placeholders = phoneList.map(() => '?').join(',');
    
    const facebookQuery = `
      SELECT id, facebook_id, phone, name, facebook_url, email, location, job, gender
      FROM facebook_accounts
      WHERE phone IN (${placeholders})
      LIMIT 50
    `;
    
    const [fbRows] = await facebookPool.query<RowDataPacket[]>(facebookQuery, phoneList);
    
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
      const contactQuery = `
        SELECT id, name, address, phone, phone2
        FROM contacts
        WHERE phone IN (${placeholders}) OR phone2 IN (${placeholders})
        LIMIT 50
      `;
      
      const allPhoneParams = [...phoneList, ...phoneList];
      const [contactRows] = await contactsPool.query<RowDataPacket[]>(contactQuery, allPhoneParams);
      
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
