import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { PAYMENT_CONFIG, getPackageDetails, PackageDuration, SubscriptionType, getUserReferralDiscount, markReferralDiscountUsed } from "../config/database";

export const starsPaymentTool = createTool({
  id: "stars-payment",
  
  description: `Send a Telegram Stars payment invoice for subscription. Use this when:
- User wants to subscribe (regular or VIP)
- User asks about subscription prices/packages
- User wants to upgrade or renew subscription

Available packages:
- Regular: 1 month (100⭐), 3 months (270⭐ -10%), 6 months (480⭐ -20%), 12 months (840⭐ -30%)
- VIP: 1 month (250⭐), 3 months (675⭐ -10%), 6 months (1200⭐ -20%), 12 months (2100⭐ -30%)

Note: Users with referral codes get an additional 10% discount on their first subscription!`,
  
  inputSchema: z.object({
    action: z.enum(['send_invoice', 'show_packages']).describe("Action: send_invoice (send payment invoice), show_packages (display all available packages)"),
    subscriptionType: z.enum(['vip', 'regular']).optional().describe("Type of subscription: 'vip' or 'regular' (required for send_invoice)"),
    duration: z.enum(['1month', '3months', '6months', '12months']).optional().default('1month').describe("Package duration: 1month, 3months, 6months, or 12months"),
    chatId: z.number().optional().describe("Telegram chat ID to send the invoice to (required for send_invoice)"),
    telegramUserId: z.number().optional().describe("Telegram user ID to check for referral discount"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    invoiceSent: z.boolean().optional(),
    data: z.any().optional(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('💳 [StarsPaymentTool] Starting execution', { 
      action: context.action,
      subscriptionType: context.subscriptionType,
      duration: context.duration
    });
    
    if (context.action === 'show_packages') {
      const packages = PAYMENT_CONFIG.PACKAGES;
      
      let message = `💰 **باقات الاشتراك المتاحة**\n\n`;
      
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📱 **الاشتراك العادي** (Facebook فقط)\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `• 1 شهر: ${packages.regular['1month'].stars} ⭐\n`;
      message += `• 3 شهور: ${packages.regular['3months'].stars} ⭐ (خصم 10%)\n`;
      message += `• 6 شهور: ${packages.regular['6months'].stars} ⭐ (خصم 20%)\n`;
      message += `• 12 شهر: ${packages.regular['12months'].stars} ⭐ (خصم 30%)\n\n`;
      
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `👑 **اشتراك VIP** (جميع قواعد البيانات)\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `• 1 شهر: ${packages.vip['1month'].stars} ⭐\n`;
      message += `• 3 شهور: ${packages.vip['3months'].stars} ⭐ (خصم 10%)\n`;
      message += `• 6 شهور: ${packages.vip['6months'].stars} ⭐ (خصم 20%)\n`;
      message += `• 12 شهر: ${packages.vip['12months'].stars} ⭐ (خصم 30%)\n\n`;
      
      message += `🎁 لديك كود إحالة؟ احصل على خصم 10% إضافي!\n\n`;
      message += `💡 للاشتراك، قل مثلاً:\n`;
      message += `"أريد اشتراك VIP 3 شهور" أو "اشتراك عادي شهر"`;
      
      return {
        success: true,
        message,
        data: { packages }
      };
    }
    
    if (!context.subscriptionType || !context.chatId) {
      return {
        success: false,
        message: 'يرجى تحديد نوع الاشتراك (عادي أو VIP) ومدته',
        invoiceSent: false,
      };
    }
    
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      logger?.error('❌ [StarsPaymentTool] TELEGRAM_BOT_TOKEN not configured');
      return {
        success: false,
        message: 'خطأ في النظام: لم يتم تكوين البوت بشكل صحيح',
        invoiceSent: false,
      };
    }
    
    const duration = (context.duration || '1month') as PackageDuration;
    const subscriptionType = context.subscriptionType as SubscriptionType;
    const packageDetails = getPackageDetails(subscriptionType, duration);
    
    let finalStars = packageDetails.stars;
    let referralDiscountApplied = false;
    let totalDiscount = packageDetails.discount;
    
    if (context.telegramUserId) {
      const referralDiscount = await getUserReferralDiscount(context.telegramUserId);
      if (referralDiscount.hasDiscount) {
        const referralDiscountAmount = Math.floor(packageDetails.stars * (referralDiscount.discountPercent / 100));
        finalStars = packageDetails.stars - referralDiscountAmount;
        referralDiscountApplied = true;
        totalDiscount = packageDetails.discount + referralDiscount.discountPercent;
        
        await markReferralDiscountUsed(context.telegramUserId);
        
        logger?.info('🎁 [StarsPaymentTool] Referral discount applied', {
          originalStars: packageDetails.stars,
          discountAmount: referralDiscountAmount,
          finalStars,
          discountPercent: referralDiscount.discountPercent
        });
      }
    }
    
    const isVIP = subscriptionType === 'vip';
    const monthsText = {
      '1month': 'شهر واحد',
      '3months': '3 شهور',
      '6months': '6 شهور',
      '12months': '12 شهر'
    }[duration];
    
    const title = isVIP 
      ? `👑 اشتراك VIP - ${monthsText}` 
      : `📱 اشتراك عادي - ${monthsText}`;
      
    let discountText = '';
    if (totalDiscount > 0) {
      discountText = referralDiscountApplied 
        ? ` (خصم ${packageDetails.discount}% + 10% إحالة)` 
        : ` (خصم ${packageDetails.discount}%)`;
    }
    
    const description = isVIP 
      ? `اشتراك VIP لمدة ${monthsText}${discountText}\nالبحث في جميع قواعد البيانات (Facebook + Contacts + المزيد)`
      : `اشتراك عادي لمدة ${monthsText}${discountText}\nالبحث في قاعدة بيانات Facebook فقط`;
      
    const payload = `subscription_${subscriptionType}_${duration}`;
    
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
            { label: title, amount: finalStars }
          ],
        }),
      });
      
      const data = await response.json();
      
      if (data.ok) {
        logger?.info('✅ [StarsPaymentTool] Invoice sent successfully', {
          subscriptionType,
          duration,
          originalStars: packageDetails.stars,
          finalStars,
          referralDiscountApplied
        });
        
        let successMessage = `✅ تم إرسال فاتورة الدفع بنجاح!\n\n📦 الباقة: ${title}\n💰 المبلغ: ${finalStars} نجمة ⭐`;
        
        if (referralDiscountApplied) {
          successMessage += `\n🎁 تم تطبيق خصم الإحالة 10%!`;
        }
        
        successMessage += `\n\n💡 اضغط على الفاتورة لإتمام الدفع`;
        
        return {
          success: true,
          message: successMessage,
          invoiceSent: true,
          data: {
            subscriptionType,
            duration,
            months: packageDetails.months,
            originalStars: packageDetails.stars,
            finalStars,
            packageDiscount: packageDetails.discount,
            referralDiscountApplied,
            totalDiscount
          }
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
