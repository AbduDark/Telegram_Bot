import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { RowDataPacket } from "mysql2/promise";
import { dbPool, getTablesForUser } from "../config/database";

export const facebookIdLookupTool = createTool({
  id: "facebook-id-lookup",
  
  description: "Search for Facebook accounts by Facebook ID (numeric ID like 100012345678). Regular users and VIP users can both search in facebook_accounts table.",
  
  inputSchema: z.object({
    facebookId: z.string().describe("Facebook ID to search for (numeric ID, e.g., 100012345678)"),
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
    
    logger?.info('🔧 [FacebookIdLookupTool] Starting execution', { 
      facebookId: context.facebookId,
      telegramUserId 
    });
    
    const facebookId = context.facebookId.trim();
    
    if (!facebookId) {
      logger?.warn('⚠️ [FacebookIdLookupTool] Empty Facebook ID provided');
      return { userType: 'unknown', results: [], totalResults: 0 };
    }
    
    const { hasActiveSubscription } = await import('../config/database');
    
    const subscription = await hasActiveSubscription(telegramUserId);
    
    if (!subscription.hasSubscription) {
      logger?.warn('⚠️ [FacebookIdLookupTool] No active subscription found', { 
        telegramUserId 
      });
      throw new Error('❌ ليس لديك اشتراك نشط. للاستفادة من خدمة البحث، يرجى الاشتراك أولاً. اتصل بالدعم للحصول على اشتراك VIP أو عادي.');
    }
    
    if (subscription.subscriptionType !== 'vip' && subscription.subscriptionType !== 'regular') {
      logger?.error('⚠️ [FacebookIdLookupTool] Invalid subscription type', { 
        subscriptionType: subscription.subscriptionType 
      });
      throw new Error('❌ خطأ في النظام: نوع اشتراك غير صحيح. يرجى التواصل مع الدعم.');
    }
    
    const userType = subscription.subscriptionType === 'vip' ? 'VIP' : 'Regular';
    const availableTables = getTablesForUser(subscription.subscriptionType);
    
    logger?.info(`👤 [FacebookIdLookupTool] User type: ${userType}`, { 
      telegramUserId,
      subscriptionType: subscription.subscriptionType,
      availableTables
    });
    
    try {
      let results: RowDataPacket[] = [];
      
      if (availableTables.includes('facebook_accounts')) {
        const query = `
          SELECT * FROM facebook_accounts 
          WHERE facebook_id = ?
          LIMIT 50
        `;
        
        logger?.info('🔍 [FacebookIdLookupTool] Querying facebook_accounts table', {
          facebookId
        });
        
        const [rows] = await dbPool.query<RowDataPacket[]>(query, [facebookId]);
        results = rows;
      }
      
      logger?.info('✅ [FacebookIdLookupTool] Search completed', { 
        userType,
        totalResults: results.length,
        facebookId
      });
      
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
