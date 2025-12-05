import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { 
  getUsersWithExpiringSubscriptions, 
  markNotificationSent,
  getSubscriptionDetails,
  PAYMENT_CONFIG
} from "../config/database";

export const notificationTool = createTool({
  id: "notification-system",
  
  description: `Send smart notifications to users. Use this for:
- Sending subscription expiry reminders
- Checking user's subscription status and sending appropriate notifications
- Welcome messages for new users`,
  
  inputSchema: z.object({
    action: z.enum(['check_expiring', 'send_expiry_reminder', 'send_welcome', 'get_status']).describe("Action: check_expiring (get users with expiring subscriptions), send_expiry_reminder (send reminder to specific user), send_welcome (send welcome message), get_status (check subscription status)"),
    telegramUserId: z.number().optional().describe("Telegram user ID (required for send_expiry_reminder, send_welcome, get_status)"),
    chatId: z.number().optional().describe("Telegram chat ID for sending messages"),
    daysUntilExpiry: z.number().optional().default(3).describe("Days before expiry to check (default: 3)"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    action: z.string(),
    message: z.string(),
    data: z.any().optional(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔔 [NotificationTool] Starting execution', { 
      action: context.action,
      telegramUserId: context.telegramUserId 
    });
    
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    try {
      switch (context.action) {
        case 'check_expiring': {
          const expiringUsers = await getUsersWithExpiringSubscriptions(context.daysUntilExpiry || 3);
          
          logger?.info('📋 [NotificationTool] Found expiring subscriptions', { 
            count: expiringUsers.length 
          });
          
          return {
            success: true,
            action: 'check_expiring',
            message: `تم العثور على ${expiringUsers.length} مستخدم باشتراكات تنتهي قريباً`,
            data: { 
              users: expiringUsers,
              count: expiringUsers.length 
            }
          };
        }
        
        case 'send_expiry_reminder': {
          if (!context.telegramUserId || !context.chatId) {
            return {
              success: false,
              action: 'send_expiry_reminder',
              message: 'User ID and Chat ID are required'
            };
          }
          
          const subscription = await getSubscriptionDetails(context.telegramUserId);
          
          if (!subscription) {
            return {
              success: false,
              action: 'send_expiry_reminder',
              message: 'لم يتم العثور على اشتراك لهذا المستخدم'
            };
          }
          
          const endDate = new Date(subscription.subscription_end);
          const now = new Date();
          const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          const isVIP = subscription.subscription_type === 'vip';
          const typeText = isVIP ? 'VIP 👑' : 'العادي 📱';
          
          const message = `⚠️ **تنبيه: اشتراكك ينتهي قريباً!**

━━━━━━━━━━━━━━━━━━━━
📦 نوع الاشتراك: ${typeText}
📅 تاريخ الانتهاء: ${endDate.toLocaleDateString('ar-EG')}
⏰ الأيام المتبقية: ${daysRemaining} يوم
━━━━━━━━━━━━━━━━━━━━

💡 **جدد اشتراكك الآن واستفد من الخصومات:**
• 3 شهور: خصم 10%
• 6 شهور: خصم 20%
• 12 شهر: خصم 30%

🔄 قل "أريد تجديد الاشتراك" للتجديد الآن!`;
          
          if (token && context.chatId) {
            try {
              await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: context.chatId,
                  text: message,
                  parse_mode: "Markdown",
                }),
              });
              
              await markNotificationSent(context.telegramUserId);
              
              logger?.info('✅ [NotificationTool] Expiry reminder sent', { 
                telegramUserId: context.telegramUserId,
                daysRemaining
              });
              
              return {
                success: true,
                action: 'send_expiry_reminder',
                message: 'تم إرسال تذكير انتهاء الاشتراك بنجاح',
                data: { daysRemaining, subscriptionType: subscription.subscription_type }
              };
            } catch (error) {
              logger?.error('❌ [NotificationTool] Failed to send reminder', error);
              return {
                success: false,
                action: 'send_expiry_reminder',
                message: 'فشل في إرسال التذكير'
              };
            }
          }
          
          return {
            success: false,
            action: 'send_expiry_reminder',
            message: 'لم يتم تكوين البوت بشكل صحيح'
          };
        }
        
        case 'send_welcome': {
          if (!context.chatId) {
            return {
              success: false,
              action: 'send_welcome',
              message: 'Chat ID is required'
            };
          }
          
          const message = `🎉 **مرحباً بك في بوت البحث!**

━━━━━━━━━━━━━━━━━━━━

🎁 **هدية الترحيب:**
لديك 5 عمليات بحث مجانية للتجربة!

━━━━━━━━━━━━━━━━━━━━

📱 **الاشتراك العادي** (${PAYMENT_CONFIG.PACKAGES.regular['1month'].stars}⭐/شهر)
• البحث في قاعدة Facebook

👑 **اشتراك VIP** (${PAYMENT_CONFIG.PACKAGES.vip['1month'].stars}⭐/شهر)
• البحث في جميع قواعد البيانات

━━━━━━━━━━━━━━━━━━━━

💡 **ابدأ الآن:**
• أرسل رقم هاتف للبحث عنه
• قل "اشتراك" لعرض الباقات
• قل "كود الإحالة" لمشاركة أصدقائك

نتمنى لك تجربة ممتعة! 🚀`;
          
          if (token) {
            try {
              await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: context.chatId,
                  text: message,
                  parse_mode: "Markdown",
                }),
              });
              
              logger?.info('✅ [NotificationTool] Welcome message sent', { 
                chatId: context.chatId
              });
              
              return {
                success: true,
                action: 'send_welcome',
                message: 'تم إرسال رسالة الترحيب بنجاح'
              };
            } catch (error) {
              logger?.error('❌ [NotificationTool] Failed to send welcome', error);
              return {
                success: false,
                action: 'send_welcome',
                message: 'فشل في إرسال رسالة الترحيب'
              };
            }
          }
          
          return {
            success: false,
            action: 'send_welcome',
            message: 'لم يتم تكوين البوت بشكل صحيح'
          };
        }
        
        case 'get_status': {
          if (!context.telegramUserId) {
            return {
              success: false,
              action: 'get_status',
              message: 'User ID is required'
            };
          }
          
          const subscription = await getSubscriptionDetails(context.telegramUserId);
          
          if (!subscription) {
            return {
              success: true,
              action: 'get_status',
              message: `📊 **حالة الاشتراك**

❌ ليس لديك اشتراك نشط

💡 اشترك الآن وابدأ البحث!
قل "أريد الاشتراك" لعرض الباقات المتاحة`,
              data: { hasSubscription: false }
            };
          }
          
          const endDate = new Date(subscription.subscription_end);
          const now = new Date();
          const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isActive = subscription.is_active && endDate > now;
          const isVIP = subscription.subscription_type === 'vip';
          
          const statusIcon = isActive ? '✅' : '❌';
          const typeIcon = isVIP ? '👑' : '📱';
          
          return {
            success: true,
            action: 'get_status',
            message: `📊 **حالة اشتراكك**

━━━━━━━━━━━━━━━━━━━━
${statusIcon} الحالة: ${isActive ? 'نشط' : 'منتهي'}
${typeIcon} النوع: ${isVIP ? 'VIP' : 'عادي'}
📅 تاريخ الانتهاء: ${endDate.toLocaleDateString('ar-EG')}
⏰ الأيام المتبقية: ${Math.max(0, daysRemaining)} يوم
━━━━━━━━━━━━━━━━━━━━

${daysRemaining <= 3 && isActive ? '⚠️ اشتراكك ينتهي قريباً! جدد الآن بخصم!' : ''}`,
            data: { 
              hasSubscription: true,
              isActive,
              subscriptionType: subscription.subscription_type,
              endDate: subscription.subscription_end,
              daysRemaining: Math.max(0, daysRemaining)
            }
          };
        }
        
        default:
          return {
            success: false,
            action: context.action,
            message: 'Invalid action'
          };
      }
    } catch (error) {
      logger?.error('❌ [NotificationTool] Error:', error);
      return {
        success: false,
        action: context.action,
        message: 'حدث خطأ أثناء تنفيذ العملية',
        data: { error: String(error) }
      };
    }
  },
});
