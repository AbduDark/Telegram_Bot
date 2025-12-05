import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { 
  getOrCreateReferralCode, 
  getReferralStats, 
  applyReferralCode,
  PAYMENT_CONFIG 
} from "../config/database";

export const referralTool = createTool({
  id: "referral-system",
  
  description: `Manage referral system: get referral code, check stats, or apply a referral code.
Use this when:
- User asks for their referral code or referral link
- User wants to see their referral statistics
- User wants to apply/use a referral code from someone else`,
  
  inputSchema: z.object({
    action: z.enum(['get_code', 'get_stats', 'apply_code']).describe("Action: get_code (get user's referral code), get_stats (referral statistics), apply_code (use someone else's code)"),
    telegramUserId: z.number().describe("Telegram user ID"),
    username: z.string().optional().describe("Username (required for get_code action)"),
    referralCode: z.string().optional().describe("Referral code to apply (required for apply_code action)"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    action: z.string(),
    message: z.string(),
    data: z.any().optional(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🎁 [ReferralTool] Starting execution', { 
      action: context.action,
      telegramUserId: context.telegramUserId 
    });
    
    try {
      switch (context.action) {
        case 'get_code': {
          if (!context.username) {
            return {
              success: false,
              action: 'get_code',
              message: 'Username is required to generate referral code'
            };
          }
          
          const result = await getOrCreateReferralCode(context.telegramUserId, context.username);
          
          if (result.success && result.code) {
            logger?.info('✅ [ReferralTool] Referral code retrieved', { 
              telegramUserId: context.telegramUserId,
              code: result.code
            });
            
            return {
              success: true,
              action: 'get_code',
              message: `🎁 كود الإحالة الخاص بك: ${result.code}\n\n📢 شارك هذا الكود مع أصدقائك!\n\n🎯 عندما يشترك صديقك باستخدام كودك:\n• تحصل أنت على ${PAYMENT_CONFIG.REFERRAL_BONUS.REFERRER_FREE_SEARCHES} عمليات بحث مجانية\n• يحصل صديقك على خصم ${PAYMENT_CONFIG.REFERRAL_BONUS.REFEREE_DISCOUNT_PERCENT}% على أول اشتراك`,
              data: { 
                code: result.code,
                bonusPerReferral: PAYMENT_CONFIG.REFERRAL_BONUS.REFERRER_FREE_SEARCHES,
                discountForNewUser: PAYMENT_CONFIG.REFERRAL_BONUS.REFEREE_DISCOUNT_PERCENT
              }
            };
          } else {
            return {
              success: false,
              action: 'get_code',
              message: 'فشل في إنشاء كود الإحالة',
              data: { error: result.error }
            };
          }
        }
        
        case 'get_stats': {
          const stats = await getReferralStats(context.telegramUserId);
          
          if (stats) {
            logger?.info('✅ [ReferralTool] Stats retrieved', { 
              telegramUserId: context.telegramUserId,
              stats
            });
            
            return {
              success: true,
              action: 'get_stats',
              message: `📊 إحصائيات الإحالة الخاصة بك:

🎁 كود الإحالة: ${stats.code}
👥 إجمالي الإحالات: ${stats.totalReferrals}
✅ الإحالات الناجحة: ${stats.successfulReferrals}
🔍 عمليات البحث المجانية المتبقية: ${stats.bonusSearches}`,
              data: stats
            };
          } else {
            const newCode = await getOrCreateReferralCode(context.telegramUserId, context.username || 'user');
            
            return {
              success: true,
              action: 'get_stats',
              message: `📊 ليس لديك إحالات بعد!\n\n🎁 كود الإحالة الخاص بك: ${newCode.code}\n\nشارك هذا الكود مع أصدقائك واحصل على عمليات بحث مجانية!`,
              data: { 
                code: newCode.code,
                totalReferrals: 0,
                successfulReferrals: 0,
                bonusSearches: 0
              }
            };
          }
        }
        
        case 'apply_code': {
          if (!context.referralCode) {
            return {
              success: false,
              action: 'apply_code',
              message: 'الرجاء إدخال كود الإحالة'
            };
          }
          
          const result = await applyReferralCode(
            context.telegramUserId,
            context.username || 'user',
            context.referralCode.toUpperCase()
          );
          
          if (result.success) {
            logger?.info('✅ [ReferralTool] Referral code applied', { 
              telegramUserId: context.telegramUserId,
              code: context.referralCode
            });
            
            return {
              success: true,
              action: 'apply_code',
              message: `✅ تم تطبيق كود الإحالة بنجاح!\n\n🎉 ستحصل على خصم ${result.discount}% على أول اشتراك لك!`,
              data: { 
                discount: result.discount,
                applied: true
              }
            };
          } else {
            return {
              success: false,
              action: 'apply_code',
              message: result.error || 'كود الإحالة غير صالح',
              data: { applied: false }
            };
          }
        }
        
        default:
          return {
            success: false,
            action: context.action,
            message: 'Invalid action'
          };
      }
    } catch (error) {
      logger?.error('❌ [ReferralTool] Error:', error);
      return {
        success: false,
        action: context.action,
        message: 'حدث خطأ أثناء تنفيذ العملية',
        data: { error: String(error) }
      };
    }
  },
});
