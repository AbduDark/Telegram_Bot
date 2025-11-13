import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { RowDataPacket } from "mysql2/promise";
import { isVIPUser, vipPool, regularPool } from "../config/database";

/**
 * Phone Lookup Tool - Multi-Database Support
 * Searches for phone numbers in VIP or Regular databases based on user type
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
  
  description: "Search for phone numbers in databases. Regular users search ONLY in facebook_accounts. VIP users search in ALL databases (facebook_accounts AND contacts).",
  
  inputSchema: z.object({
    phone: z.string().describe("Phone number to search for (supports various formats: +20, 00, 0, etc.)"),
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
  }),
  
  execute: async ({ context, mastra, runtimeContext }) => {
    const logger = mastra?.getLogger();
    
    // Get telegramUserId from runtime context
    const telegramUserId = runtimeContext?.get("telegramUserId") as number | undefined;
    
    if (!telegramUserId || typeof telegramUserId !== 'number') {
      logger?.error('⚠️ [PhoneLookupTool] No telegramUserId in runtime context');
      throw new Error('❌ خطأ في النظام: لم يتم العثور على معرف المستخدم. يرجى المحاولة مرة أخرى.');
    }
    
    logger?.info('🔧 [PhoneLookupTool] Starting execution', { 
      phone: context.phone,
      telegramUserId 
    });
    
    const variants = phoneVariants(context.phone);
    logger?.info('📝 [PhoneLookupTool] Generated phone variants', { 
      variants: Array.from(variants) 
    });
    
    if (variants.size === 0) {
      logger?.warn('⚠️ [PhoneLookupTool] No valid phone variants generated');
      return { userType: 'unknown', facebook: [], contacts: [] };
    }
    
    // Import hasActiveSubscription
    const { hasActiveSubscription } = await import('../config/database');
    
    // Check subscription status
    const subscription = await hasActiveSubscription(telegramUserId);
    
    if (!subscription.hasSubscription) {
      logger?.warn('⚠️ [PhoneLookupTool] No active subscription found', { 
        telegramUserId 
      });
      throw new Error('❌ ليس لديك اشتراك نشط. للاستفادة من خدمة البحث، يرجى الاشتراك أولاً. اتصل بالدعم للحصول على اشتراك VIP أو عادي.');
    }
    
    const userType = subscription.subscriptionType === 'vip' ? 'VIP' : 'Regular';
    const isVIP = subscription.subscriptionType === 'vip';
    const pool = isVIP ? vipPool : regularPool;
    
    logger?.info(`👤 [PhoneLookupTool] User type: ${userType}`, { 
      telegramUserId,
      subscriptionType: subscription.subscriptionType
    });
    
    try {
      const variantsArray = Array.from(variants);
      const fbPlaceholders = variantsArray.map(() => '?').join(', ');
      
      // Search in facebook_accounts table (BOTH Regular and VIP users)
      const fbQuery = `SELECT * FROM facebook_accounts WHERE phone IN (${fbPlaceholders})`;
      logger?.info('🔍 [PhoneLookupTool] Querying facebook_accounts table');
      const [fbRows] = await pool.query<RowDataPacket[]>(fbQuery, variantsArray);
      
      let contactsRows: RowDataPacket[] = [];
      
      // Search in contacts table ONLY for VIP users
      if (isVIP) {
        const contactsQuery = `
          SELECT * FROM contacts 
          WHERE phone IN (${fbPlaceholders}) OR phone2 IN (${fbPlaceholders})
        `;
        logger?.info('🔍 [PhoneLookupTool] Querying contacts table (VIP only)');
        const [rows] = await pool.query<RowDataPacket[]>(contactsQuery, [...variantsArray, ...variantsArray]);
        contactsRows = rows;
      } else {
        logger?.info('⏭️ [PhoneLookupTool] Skipping contacts table (Regular user)');
      }
      
      logger?.info('✅ [PhoneLookupTool] Search completed', { 
        userType,
        facebookResults: fbRows.length,
        contactsResults: contactsRows.length
      });
      
      return {
        userType,
        facebook: fbRows as any[],
        contacts: contactsRows as any[],
      };
    } catch (error) {
      logger?.error('❌ [PhoneLookupTool] Error executing search:', error);
      throw error;
    }
  },
});
