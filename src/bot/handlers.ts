import TelegramBot from 'node-telegram-bot-api';
import { lookupPhoneNumber, lookupFacebookId } from './phone-lookup';
import { formatResponse } from './formatter';
import { chatWithAI } from './ai-assistant';

export async function handleTelegramMessage(
  bot: TelegramBot,
  message: TelegramBot.Message
): Promise<void> {
  const chatId = message.chat.id;
  const text = message.text?.trim();
  const userId = message.from?.id;
  const username = message.from?.username || message.from?.first_name || 'مستخدم';

  if (!text || !userId) {
    return;
  }

  console.log(`📨 [Handler] Message from ${username} (${userId}): ${text.substring(0, 50)}`);

  try {
    if (text.startsWith('/start')) {
      await bot.sendMessage(chatId, `
مرحباً ${username}! 👋
<b>بوت البحث الذكي 🔍</b>

<b>كيف تستخدمني؟</b>
📱 أرسل رقم هاتف (01234567890)
🆔 أرسل Facebook ID
💬 اسألني أي سؤال!

━━━━━━━━━━━━━━━━
<b>الاشتراكات:</b>

👑 <b>VIP</b>
✓ جميع القواعد
✓ نتائج شاملة
✓ دعم أولوية

👤 <b>عادي</b>
✓ Facebook فقط
✓ نتائج محدودة

━━━━━━━━━━━━━━━━
<b>الأوامر:</b>
/help - المساعدة
/status - اشتراكك

جاهز للبحث! 🚀
`, { parse_mode: 'HTML' });
      return;
    }

    if (text.startsWith('/help')) {
      await bot.sendMessage(chatId, `
<b>📋 دليل الاستخدام</b>

<b>البحث:</b>
1️⃣ أرسل رقم الهاتف
2️⃣ انتظر النتائج
3️⃣ احصل على المعلومات

<b>💡 نصائح:</b>
• اكتب الرقم بأي صيغة
• جرب Facebook ID
• اسألني أي شيء!

<b>❓ أمثلة:</b>
• 01234567890
• +201234567890  
• 100007800548113

💬 <b>محتاج مساعدة؟</b>
اكتب سؤالك وسأساعدك!
`, { parse_mode: 'HTML' });
      return;
    }

    if (text.startsWith('/status')) {
      const { hasActiveSubscription, getSubscriptionDetails } = await import('./database');
      
      try {
        const subscription = await hasActiveSubscription(userId);
        
        if (!subscription.hasSubscription) {
          await bot.sendMessage(chatId, `
🔒 <b>اشتراك غير نشط</b>

للاشتراك:
💳 تواصل مع الدعم
`);
          return;
        }

        const details = await getSubscriptionDetails(userId);
        
        if (!details) {
          await bot.sendMessage(chatId, `
⚠️ <b>خطأ مؤقت</b>

حاول لاحقاً أو تواصل مع الدعم
`);
          return;
        }

        const subscriptionType = subscription.subscriptionType === 'vip' ? '👑 VIP' : '👤 عادي';
        const endDate = details.subscription_end 
          ? new Date(details.subscription_end).toLocaleDateString('ar-EG')
          : 'غير محدد';

        await bot.sendMessage(chatId, `
<b>✅ اشتراكك</b>

${subscriptionType}
👤 ${username}
📅 ينتهي: ${endDate}
🟢 نشط

${subscription.subscriptionType === 'vip' 
  ? '✓ البحث في جميع القواعد' 
  : '✓ البحث في Facebook فقط\n\n💎 <b>VIP؟</b> تواصل مع الدعم'}
`, { parse_mode: 'HTML' });
      } catch (error) {
        console.error('❌ [Handler] /status error:', error);
        await bot.sendMessage(chatId, `
❌ <b>خطأ</b>

حاول مرة أخرى لاحقاً
`);
      }
      return;
    }

    const phonePattern = /[\d+]/;
    if (phonePattern.test(text)) {
      await bot.sendMessage(chatId, '🔍 <b>جاري البحث...</b>', { parse_mode: 'HTML' });

      let result;
      
      // Determine if it's a Facebook ID or phone number
      // Facebook IDs typically start with 100 and are longer than 14 digits
      const cleanedText = text.replace(/[^\d]/g, '');
      const isFacebookId = cleanedText.startsWith('100') && cleanedText.length > 14;
      
      if (isFacebookId) {
        console.log(`🔍 [Handler] Detected Facebook ID: ${text}`);
        result = await lookupFacebookId(text, userId);
      } else {
        console.log(`📱 [Handler] Detected phone number: ${text}`);
        result = await lookupPhoneNumber(text, userId);
      }
      
      const response = formatResponse(result);

      await bot.sendMessage(chatId, response, { parse_mode: 'HTML' });
      return;
    }

    // AI Chat for everything else
    console.log(`💬 [Handler] AI Chat request from ${username}`);
    await bot.sendMessage(chatId, '💭 <b>دعني أفكر...</b>', { parse_mode: 'HTML' });
    
    const aiResponse = await chatWithAI(text, username);
    await bot.sendMessage(chatId, aiResponse, { parse_mode: 'HTML' });

  } catch (error) {
    console.error('❌ [Handler] Error:', error);
    await bot.sendMessage(chatId, `
❌ <b>عذراً، حدث خطأ</b>

حاول مرة أخرى
💬 أو تواصل مع الدعم
`);
  }
}
