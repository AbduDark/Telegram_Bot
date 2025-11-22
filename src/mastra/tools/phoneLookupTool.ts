import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { RowDataPacket } from "mysql2/promise";
import { dbPool, getTablesForUser } from "../config/database";

/**
 * Phone Lookup Tool - Dynamic Table Search
 * - Regular users: Search only in facebook_accounts table
 * - VIP users: Search in all available tables (facebook_accounts, contacts, etc.)
 */

// Normalize phone number to standard format
function normalizePhone(s: string): string {
  if (!s) return '';
  s = s.trim();
  // Remove all non-digit and non-plus characters
  s = s.replace(/[^\d+]/g, '');
  if (s.startsWith('+')) {
    return s;
  }
  if (s.startsWith('00')) {
    return '+' + s.substring(2);
  }
  return s;
}

// Generate phone variants for searching
function phoneVariants(p: string): Set<string> {
  p = normalizePhone(p);
  const variants = new Set<string>();
  
  if (!p) return variants;
  
  variants.add(p);
  
  if (p.startsWith('+')) {
    // Add without plus
    variants.add(p.substring(1));
    // Add with 00 prefix
    variants.add('00' + p.substring(1));
    // Add local format with leading 0 (for Egyptian numbers)
    if (p.length > 10) {
      const lastDigits = p.substring(p.length - 10);
      variants.add('0' + lastDigits);
    }
  } else {
    // Add with plus
    variants.add('+' + p);
    // Add with 00
    if (!p.startsWith('00')) {
      variants.add('00' + p);
    }
    // If starts with 0, also add without it
    if (p.startsWith('0') && p.length > 1) {
      variants.add(p.substring(1));
    }
  }
  
  return variants;
}

export const phoneLookupTool = createTool({
  id: "phone-lookup",
  
  description: "Search for phone numbers in database tables using PARTIAL MATCH. Searches for any phone that contains the search term (e.g., searching '20' returns all phones with '20' anywhere). Regular users search ONLY in facebook_accounts. VIP users search in ALL tables (facebook_accounts, contacts, and any future tables).",
  
  inputSchema: z.object({
    phone: z.string().describe("Phone number or partial phone number to search for (e.g., '20', '0', '012', etc.). Will find all matching results."),
  }),
  
  outputSchema: z.object({
    userType: z.string(),
    facebook: z.array(z.object({
      id: z.number(),
      facebook_id: z.string().nullable(),
      phone: z.string().nullable(),
      name: z.string().nullable(),
      facebook_url: z.string().nullable(),
      email: z.string().nullable(),
      location: z.string().nullable(),
      job: z.string().nullable(),
      gender: z.string().nullable(),
    })),
    contacts: z.array(z.object({
      id: z.number(),
      name: z.string().nullable(),
      address: z.string().nullable(),
      phone: z.string().nullable(),
      phone2: z.string().nullable(),
    })),
    totalResults: z.number(),
  }),
  
  execute: async ({ context, mastra, runtimeContext }) => {
    const logger = mastra?.getLogger();
    
    const telegramUserId = runtimeContext?.get("telegramUserId") as number | undefined;
    
    if (!telegramUserId || typeof telegramUserId !== 'number') {
      logger?.error('⚠️ [PhoneLookupTool] No telegramUserId in runtime context');
      throw new Error('❌ خطأ في النظام: لم يتم العثور على معرف المستخدم. يرجى المحاولة مرة أخرى.');
    }
    
    const originalSearchTerm = context.phone.trim();
    
    if (!originalSearchTerm) {
      logger?.warn('⚠️ [PhoneLookupTool] Empty search term');
      throw new Error('⚠️ الرجاء إدخال رقم هاتف للبحث.');
    }
    
    // Generate multiple search variants for Egyptian numbers
    const searchVariants: string[] = [originalSearchTerm];
    
    // If starts with 0, add variants with 20, 020, +20
    if (originalSearchTerm.startsWith('0') && originalSearchTerm.length >= 10) {
      const withoutZero = originalSearchTerm.substring(1);
      searchVariants.push('20' + withoutZero);      // 01234567890 -> 201234567890
      searchVariants.push('020' + withoutZero);     // 01234567890 -> 0201234567890
      searchVariants.push('+20' + withoutZero);     // 01234567890 -> +201234567890
    }
    
    logger?.info('🔧 [PhoneLookupTool] Starting multi-variant search', { 
      original: originalSearchTerm,
      variants: searchVariants,
      telegramUserId 
    });
    
    const { hasActiveSubscription } = await import('../config/database');
    
    const subscription = await hasActiveSubscription(telegramUserId);
    
    if (!subscription.hasSubscription) {
      logger?.warn('⚠️ [PhoneLookupTool] No active subscription found', { 
        telegramUserId 
      });
      throw new Error('❌ ليس لديك اشتراك نشط. للاستفادة من خدمة البحث، يرجى الاشتراك أولاً. اتصل بالدعم للحصول على اشتراك VIP أو عادي.');
    }
    
    if (subscription.subscriptionType !== 'vip' && subscription.subscriptionType !== 'regular') {
      logger?.error('⚠️ [PhoneLookupTool] Invalid subscription type', { 
        subscriptionType: subscription.subscriptionType 
      });
      throw new Error('❌ خطأ في النظام: نوع اشتراك غير صحيح. يرجى التواصل مع الدعم.');
    }
    
    const userType = subscription.subscriptionType === 'vip' ? 'VIP' : 'Regular';
    const availableTables = getTablesForUser(subscription.subscriptionType);
    
    logger?.info(`👤 [PhoneLookupTool] User type: ${userType}`, { 
      telegramUserId,
      subscriptionType: subscription.subscriptionType,
      availableTables
    });
    
    try {
      let fbRows: RowDataPacket[] = [];
      let contactsRows: RowDataPacket[] = [];
      
      if (availableTables.includes('facebook_accounts')) {
        // Build OR conditions for all search variants
        const conditions = searchVariants.map(() => 'phone LIKE ?').join(' OR ');
        const patterns = searchVariants.map(v => `%${v}%`);
        
        const fbQuery = `
          SELECT * FROM facebook_accounts 
          WHERE ${conditions}
          LIMIT 100
        `;
        logger?.info('🔍 [PhoneLookupTool] Querying facebook_accounts with multiple patterns', {
          patterns
        });
        const [rows] = await dbPool.query<RowDataPacket[]>(fbQuery, patterns);
        fbRows = rows;
      }
      
      if (availableTables.includes('contacts')) {
        // Build OR conditions for all search variants (for both phone and phone2)
        const conditions = searchVariants.map(() => '(phone LIKE ? OR phone2 LIKE ?)').join(' OR ');
        const patterns: string[] = [];
        searchVariants.forEach(v => {
          patterns.push(`%${v}%`);
          patterns.push(`%${v}%`);
        });
        
        const contactsQuery = `
          SELECT * FROM contacts 
          WHERE ${conditions}
          LIMIT 100
        `;
        logger?.info('🔍 [PhoneLookupTool] Querying contacts with multiple patterns', {
          patterns
        });
        const [rows] = await dbPool.query<RowDataPacket[]>(contactsQuery, patterns);
        contactsRows = rows;
      }
      
      const totalResults = fbRows.length + contactsRows.length;
      
      logger?.info('✅ [PhoneLookupTool] Multi-variant search completed', { 
        userType,
        facebookResults: fbRows.length,
        contactsResults: contactsRows.length,
        totalResults,
        searchedTables: availableTables,
        originalSearch: originalSearchTerm,
        searchVariants
      });
      
      return {
        userType,
        facebook: fbRows as any[],
        contacts: contactsRows as any[],
        totalResults,
      };
    } catch (error) {
      logger?.error('❌ [PhoneLookupTool] Error executing search:', error);
      throw error;
    }
  },
});
