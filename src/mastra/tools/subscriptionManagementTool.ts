import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { 
  addSubscription, 
  renewSubscription, 
  cancelSubscription, 
  getSubscriptionDetails,
  hasActiveSubscription 
} from "../config/database";

/**
 * Subscription Management Tool
 * Manages user subscriptions (VIP and Regular)
 * Supports adding, renewing, canceling, and checking subscriptions
 */

export const subscriptionManagementTool = createTool({
  id: "subscription-management",
  
  description: "Manage user subscriptions: add, renew, cancel, or check subscription status. Supports both VIP and Regular monthly subscriptions.",
  
  inputSchema: z.object({
    action: z.enum(['add', 'renew', 'cancel', 'check', 'details']).describe("Action to perform: add new subscription, renew existing, cancel, check active status, or get details"),
    telegramUserId: z.number().describe("Telegram user ID"),
    username: z.string().optional().describe("Username (required for 'add' action)"),
    subscriptionType: z.enum(['vip', 'regular']).optional().describe("Subscription type (required for 'add' and 'renew' actions)"),
    months: z.number().optional().default(1).describe("Number of months to add (default: 1, for 'add' and 'renew' actions)"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    action: z.string(),
    message: z.string(),
    data: z.any().optional(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [SubscriptionManagementTool] Starting execution', { 
      action: context.action,
      telegramUserId: context.telegramUserId 
    });
    
    try {
      switch (context.action) {
        case 'add': {
          if (!context.username || !context.subscriptionType) {
            return {
              success: false,
              action: 'add',
              message: 'Username and subscriptionType are required for adding subscription'
            };
          }
          
          const result = await addSubscription(
            context.telegramUserId, 
            context.username, 
            context.subscriptionType,
            context.months || 1
          );
          
          if (result.success) {
            logger?.info('✅ [SubscriptionManagementTool] Subscription added', { 
              telegramUserId: context.telegramUserId,
              subscriptionType: context.subscriptionType,
              endDate: result.endDate
            });
            
            return {
              success: true,
              action: 'add',
              message: `تم إضافة اشتراك ${context.subscriptionType === 'vip' ? 'VIP' : 'عادي'} لمدة ${context.months || 1} شهر`,
              data: { endDate: result.endDate }
            };
          } else {
            return {
              success: false,
              action: 'add',
              message: 'فشل في إضافة الاشتراك',
              data: { error: result.error }
            };
          }
        }
        
        case 'renew': {
          if (!context.subscriptionType) {
            return {
              success: false,
              action: 'renew',
              message: 'subscriptionType is required for renewing subscription'
            };
          }
          
          const result = await renewSubscription(
            context.telegramUserId, 
            context.subscriptionType,
            context.months || 1
          );
          
          if (result.success) {
            logger?.info('✅ [SubscriptionManagementTool] Subscription renewed', { 
              telegramUserId: context.telegramUserId,
              subscriptionType: context.subscriptionType,
              newEndDate: result.newEndDate
            });
            
            return {
              success: true,
              action: 'renew',
              message: `تم تجديد الاشتراك لمدة ${context.months || 1} شهر`,
              data: { newEndDate: result.newEndDate }
            };
          } else {
            return {
              success: false,
              action: 'renew',
              message: 'فشل في تجديد الاشتراك',
              data: { error: result.error }
            };
          }
        }
        
        case 'cancel': {
          // Get subscription details first to cancel the correct type
          const details = await getSubscriptionDetails(context.telegramUserId);
          const typeToCancel = details?.subscription_type || context.subscriptionType;
          
          const result = await cancelSubscription(context.telegramUserId, typeToCancel);
          
          if (result.success) {
            logger?.info('✅ [SubscriptionManagementTool] Subscription canceled', { 
              telegramUserId: context.telegramUserId,
              subscriptionType: typeToCancel
            });
            
            return {
              success: true,
              action: 'cancel',
              message: `تم إلغاء اشتراك ${typeToCancel === 'vip' ? 'VIP' : 'العادي'} بنجاح`,
              data: { affectedRows: result.affectedRows }
            };
          } else {
            return {
              success: false,
              action: 'cancel',
              message: String(result.error) || 'فشل في إلغاء الاشتراك',
              data: { error: result.error }
            };
          }
        }
        
        case 'check': {
          const result = await hasActiveSubscription(context.telegramUserId);
          
          logger?.info('✅ [SubscriptionManagementTool] Checked subscription status', { 
            telegramUserId: context.telegramUserId,
            hasSubscription: result.hasSubscription,
            subscriptionType: result.subscriptionType
          });
          
          return {
            success: true,
            action: 'check',
            message: result.hasSubscription 
              ? `المستخدم لديه اشتراك ${result.subscriptionType === 'vip' ? 'VIP' : 'عادي'} نشط` 
              : 'المستخدم ليس لديه اشتراك نشط',
            data: result
          };
        }
        
        case 'details': {
          const details = await getSubscriptionDetails(context.telegramUserId);
          
          if (details) {
            logger?.info('✅ [SubscriptionManagementTool] Retrieved subscription details', { 
              telegramUserId: context.telegramUserId
            });
            
            return {
              success: true,
              action: 'details',
              message: 'تفاصيل الاشتراك',
              data: details
            };
          } else {
            return {
              success: false,
              action: 'details',
              message: 'لم يتم العثور على اشتراك لهذا المستخدم'
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
      logger?.error('❌ [SubscriptionManagementTool] Error executing action:', error);
      return {
        success: false,
        action: context.action,
        message: 'حدث خطأ أثناء تنفيذ العملية',
        data: { error: String(error) }
      };
    }
  },
});
