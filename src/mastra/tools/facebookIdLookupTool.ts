import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { RowDataPacket } from "mysql2/promise";
import { dbPool, getTablesForUser, canUserSearch, incrementFreeSearchCount, FREE_SEARCHES_CONFIG, PAYMENT_CONFIG, saveSearchHistory } from "../config/database";

export const facebookIdLookupTool = createTool({
  id: "facebook-id-lookup",
  
  description: "Search for Facebook accounts by Facebook ID using EXACT MATCH (fast). Searches for the exact facebook_id provided. Regular users and VIP users can both search in facebook_accounts table.",
  
  inputSchema: z.object({
    facebookId: z.string().describe("Facebook ID to search for (e.g., '100007800548113'). Must be exact ID."),
  }),
  
  outputSchema: z.object({
    userType: z.string(),
    results: z.array(z.object({
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
    totalResults: z.number(),
  }),
  
  execute: async ({ context, mastra, runtimeContext }) => {
    const logger = mastra?.getLogger();
    
    const telegramUserId = runtimeContext?.get("telegramUserId") as number | undefined;
    
    if (!telegramUserId || typeof telegramUserId !== 'number') {
      logger?.error('⚠️ [FacebookIdLookupTool] No telegramUserId in runtime context');
      throw new Error('❌ خطأ في النظام: لم يتم العثور على معرف المستخدم. يرجى المحاولة مرة أخرى.');
    }
    
    const searchTerm = context.facebookId.trim();
    
    if (!searchTerm) {
      logger?.warn('⚠️ [FacebookIdLookupTool] Empty search term');
      throw new Error('⚠️ الرجاء إدخال Facebook ID للبحث.');
    }
    
    logger?.info('🔧 [FacebookIdLookupTool] Starting search', { 
      searchTerm,
      telegramUserId 
    });
    
    const searchAccess = await canUserSearch(telegramUserId);
    
    if (!searchAccess.canSearch) {
      logger?.warn('⚠️ [FacebookIdLookupTool] No access - free searches exhausted and no subscription', { 
        telegramUserId 
      });
      throw new Error(`❌ لقد استنفدت جميع عمليات البحث المجانية (${FREE_SEARCHES_CONFIG.MAX_FREE_SEARCHES} عمليات).

💳 للاستمرار في استخدام الخدمة، اشترك الآن:

👑 اشتراك VIP: ${PAYMENT_CONFIG.VIP_SUBSCRIPTION_STARS} نجمة ⭐ شهرياً
   • بحث في جميع قواعد البيانات

📱 اشتراك عادي: ${PAYMENT_CONFIG.REGULAR_SUBSCRIPTION_STARS} نجمة ⭐ شهرياً
   • بحث في Facebook فقط

أرسل /subscribe للاشتراك`);
    }
    
    let userType = 'Regular';
    let subscriptionType: 'vip' | 'regular' = 'regular';
    
    if (searchAccess.reason === 'subscription') {
      subscriptionType = searchAccess.subscriptionType as 'vip' | 'regular';
      userType = subscriptionType === 'vip' ? 'VIP' : 'Regular';
    } else if (searchAccess.reason === 'free_trial') {
      await incrementFreeSearchCount(telegramUserId);
      logger?.info('📊 [FacebookIdLookupTool] Free search used', { 
        telegramUserId,
        remaining: (searchAccess.freeSearchesRemaining || 1) - 1
      });
    }
    
    const availableTables = getTablesForUser(subscriptionType);
    
    logger?.info(`👤 [FacebookIdLookupTool] User type: ${userType}`, { 
      telegramUserId,
      subscriptionType: subscriptionType,
      availableTables
    });
    
    try {
      let results: RowDataPacket[] = [];
      
      if (availableTables.includes('facebook_accounts')) {
        // Use EXACT MATCH for Facebook ID - much faster than LIKE
        const query = `
          SELECT * FROM facebook_accounts 
          WHERE facebook_id = ?
          LIMIT 1
        `;
        
        logger?.info('🔍 [FacebookIdLookupTool] Querying facebook_accounts with exact match', {
          facebookId: searchTerm
        });
        
        const [rows] = await dbPool.query<RowDataPacket[]>(query, [searchTerm]);
        results = rows;
      }
      
      logger?.info('✅ [FacebookIdLookupTool] Exact match search completed', { 
        userType,
        totalResults: results.length,
        searchTerm
      });
      
      await saveSearchHistory(telegramUserId, searchTerm, 'facebook_id', results.length);
      logger?.info('📜 [FacebookIdLookupTool] Search saved to history');
      
      return {
        userType,
        results: results as any[],
        totalResults: results.length,
      };
    } catch (error) {
      logger?.error('❌ [FacebookIdLookupTool] Error executing search:', error);
      throw error;
    }
  },
});
