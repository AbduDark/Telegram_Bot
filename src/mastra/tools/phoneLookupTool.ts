import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { Client } from "pg";

/**
 * Phone Lookup Tool
 * Searches for phone numbers in both facebook_accounts and contacts tables
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
  
  description: "Search for phone numbers in facebook_accounts and contacts databases. Returns all matching records from both tables.",
  
  inputSchema: z.object({
    phone: z.string().describe("Phone number to search for (supports various formats: +20, 00, 0, etc.)"),
  }),
  
  outputSchema: z.object({
    facebook: z.array(z.object({
      id: z.number(),
      facebook_id: z.string().nullable(),
      phone: z.string().nullable(),
      name: z.string().nullable(),
      link_facebook: z.string().nullable(),
      email_facebook: z.string().nullable(),
      account_name: z.string().nullable(),
      location: z.string().nullable(),
      job: z.string().nullable(),
      sex: z.string().nullable(),
    })),
    contacts: z.array(z.object({
      id: z.number(),
      name: z.string().nullable(),
      address: z.string().nullable(),
      phone: z.string().nullable(),
      phone2: z.string().nullable(),
    })),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [PhoneLookupTool] Starting execution with phone:', { phone: context.phone });
    
    const variants = phoneVariants(context.phone);
    logger?.info('📝 [PhoneLookupTool] Generated phone variants:', { variants: Array.from(variants) });
    
    if (variants.size === 0) {
      logger?.warn('⚠️ [PhoneLookupTool] No valid phone variants generated');
      return { facebook: [], contacts: [] };
    }
    
    const client = new Client({
      connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/mastra",
    });
    
    try {
      await client.connect();
      logger?.info('📡 [PhoneLookupTool] Connected to database');
      
      // Build placeholders for SQL query
      const variantsArray = Array.from(variants);
      const placeholders = Array.from(variants).map((_, i) => `$${i + 1}`).join(', ');
      
      // Search in facebook_accounts
      const fbQuery = `SELECT * FROM facebook_accounts WHERE phone IN (${placeholders})`;
      logger?.info('🔍 [PhoneLookupTool] Querying facebook_accounts table');
      const fbResult = await client.query(fbQuery, variantsArray);
      
      // Search in contacts (check both phone and phone2)
      // For the second IN clause, we need to use different placeholders
      const placeholders2 = Array.from(variants).map((_, i) => `$${i + variants.size + 1}`).join(', ');
      const contactsQuery = `SELECT * FROM contacts WHERE phone IN (${placeholders}) OR phone2 IN (${placeholders2})`;
      logger?.info('🔍 [PhoneLookupTool] Querying contacts table');
      const contactsResult = await client.query(contactsQuery, [...variantsArray, ...variantsArray]);
      
      logger?.info('✅ [PhoneLookupTool] Search completed', { 
        facebookResults: fbResult.rows.length, 
        contactsResults: contactsResult.rows.length 
      });
      
      return {
        facebook: fbResult.rows,
        contacts: contactsResult.rows,
      };
    } catch (error) {
      logger?.error('❌ [PhoneLookupTool] Error executing search:', error);
      throw error;
    } finally {
      await client.end();
      logger?.info('🔌 [PhoneLookupTool] Database connection closed');
    }
  },
});
