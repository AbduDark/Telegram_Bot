import { RowDataPacket } from 'mysql2/promise';
import { 
  facebookPool, 
  contactsPool 
} from './database';

export type SearchAccessType = 'vip' | 'regular' | 'free';

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
  userType: 'vip' | 'regular';
  facebook: FacebookResult[];
  contacts: ContactResult[];
}

export async function lookupFacebookId(
  facebookId: string,
  telegramUserId: number,
  accessType: SearchAccessType = 'regular'
): Promise<PhoneLookupResult> {
  console.log(`🔍 [FacebookIdLookup] Starting lookup for user ${telegramUserId}, access: ${accessType}`);
  
  const userType = accessType === 'free' ? 'regular' : accessType;
  const searchTerm = facebookId.trim();

  console.log(`📝 [FacebookIdLookup] User type: ${userType}, Searching for ID: ${searchTerm}`);

  const facebookResults: FacebookResult[] = [];

  try {
    // Use EXACT MATCH for Facebook ID - much faster than LIKE
    const facebookQuery = `
      SELECT id, facebook_id, phone, name, facebook_url, email, location, job, gender
      FROM facebook_accounts
      WHERE facebook_id = ?
      LIMIT 1
    `;
    
    console.log(`🔍 [FacebookIdLookup] Querying Facebook with exact match:`, searchTerm);
    const [fbRows] = await facebookPool.query<RowDataPacket[]>(facebookQuery, [searchTerm]);
    
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
  telegramUserId: number,
  accessType: SearchAccessType = 'regular'
): Promise<PhoneLookupResult> {
  console.log(`🔍 [PhoneLookup] Starting lookup for user ${telegramUserId}, access: ${accessType}`);
  
  const userType = accessType === 'free' ? 'regular' : accessType;
  
  // Generate search variants for Egyptian numbers - EXACT MATCH for speed
  const originalSearchTerm = phone.trim();
  const searchVariants: string[] = [originalSearchTerm];
  
  // If starts with 0, add variants with 20, 020, +20
  if (originalSearchTerm.startsWith('0') && originalSearchTerm.length >= 10) {
    const withoutZero = originalSearchTerm.substring(1);
    searchVariants.push('20' + withoutZero);      // 01234567890 -> 201234567890
    searchVariants.push('020' + withoutZero);     // 01234567890 -> 0201234567890
    searchVariants.push('+20' + withoutZero);     // 01234567890 -> +201234567890
  }
  // If starts with 20, also try with 0
  else if (originalSearchTerm.startsWith('20') && originalSearchTerm.length >= 12) {
    const withoutCountryCode = originalSearchTerm.substring(2);
    searchVariants.push('0' + withoutCountryCode);      // 201234567890 -> 01234567890
    searchVariants.push('020' + withoutCountryCode);    // 201234567890 -> 0201234567890
    searchVariants.push('+20' + withoutCountryCode);    // 201234567890 -> +201234567890
  }

  console.log(`📝 [PhoneLookup] User type: ${userType}, Search variants:`, searchVariants);

  const facebookResults: FacebookResult[] = [];
  const contactResults: ContactResult[] = [];

  try {
    // Use IN for EXACT MATCH - much faster than LIKE
    const placeholders = searchVariants.map(() => '?').join(',');
    
    const facebookQuery = `
      SELECT id, facebook_id, phone, name, facebook_url, email, location, job, gender
      FROM facebook_accounts
      WHERE phone IN (${placeholders})
      LIMIT 100
    `;
    
    console.log(`🔍 [PhoneLookup] Querying Facebook with exact match:`, searchVariants);
    const [fbRows] = await facebookPool.query<RowDataPacket[]>(facebookQuery, searchVariants);
    
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

    const placeholdersContacts = searchVariants.map(() => '?').join(',');
    
    const contactQuery = `
      SELECT id, name, address, phone, phone2
      FROM contacts
      WHERE phone IN (${placeholdersContacts}) OR phone2 IN (${placeholdersContacts})
      LIMIT 100
    `;
    
    const allPhoneParams = [...searchVariants, ...searchVariants];
    console.log(`🔍 [PhoneLookup] Querying Contacts with exact match:`, searchVariants);
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
