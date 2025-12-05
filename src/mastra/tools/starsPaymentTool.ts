import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { PAYMENT_CONFIG } from "../config/database";

/**
 * Telegram Stars Payment Tool
 * Sends invoice to user for subscription payment
 */
export const starsPaymentTool = createTool({
  id: "stars-payment",
  
  description: "Send a Telegram Stars payment invoice to the user for subscription. Use this when user wants to subscribe or upgrade their subscription.",
  
  inputSchema: z.object({
    subscriptionType: z.enum(['vip', 'regular']).describe("Type of subscription: 'vip' for VIP access (250 stars), 'regular' for basic access (100 stars)"),
    chatId: z.number().describe("Telegram chat ID to send the invoice to"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    invoiceSent: z.boolean().optional(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('💳 [StarsPaymentTool] Starting payment invoice', { 
      subscriptionType: context.subscriptionType,
      chatId: context.chatId
    });
    
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      logger?.error('❌ [StarsPaymentTool] TELEGRAM_BOT_TOKEN not configured');
      return {
        success: false,
        message: 'خطأ في النظام: لم يتم تكوين البوت بشكل صحيح',
        invoiceSent: false,
      };
    }
    
    const isVIP = context.subscriptionType === 'vip';
    const starsAmount = isVIP 
      ? PAYMENT_CONFIG.VIP_SUBSCRIPTION_STARS 
      : PAYMENT_CONFIG.REGULAR_SUBSCRIPTION_STARS;
    
    const title = isVIP ? '👑 اشتراك VIP شهري' : '📱 اشتراك عادي شهري';
    const description = isVIP 
      ? 'اشتراك VIP يتيح لك البحث في جميع قواعد البيانات (Facebook + Contacts + المزيد)'
      : 'اشتراك عادي يتيح لك البحث في قاعدة بيانات Facebook فقط';
    const payload = isVIP ? 'subscription_vip_1month' : 'subscription_regular_1month';
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendInvoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: context.chatId,
          title: title,
          description: description,
          payload: payload,
          provider_token: "",
          currency: "XTR",
          prices: [
            { label: title, amount: starsAmount }
          ],
        }),
      });
      
      const data = await response.json();
      
      if (data.ok) {
        logger?.info('✅ [StarsPaymentTool] Invoice sent successfully');
        return {
          success: true,
          message: `تم إرسال فاتورة الدفع بنجاح! المبلغ: ${starsAmount} نجمة ⭐`,
          invoiceSent: true,
        };
      } else {
        logger?.error('❌ [StarsPaymentTool] Failed to send invoice', { error: data.description });
        return {
          success: false,
          message: `خطأ في إرسال الفاتورة: ${data.description}`,
          invoiceSent: false,
        };
      }
    } catch (error) {
      logger?.error('❌ [StarsPaymentTool] Error sending invoice', error);
      return {
        success: false,
        message: 'حدث خطأ أثناء إرسال الفاتورة',
        invoiceSent: false,
      };
    }
  },
});
