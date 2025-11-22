import TelegramBot from 'node-telegram-bot-api';
import { lookupPhoneNumber, lookupFacebookId } from './phone-lookup';
import { formatResponse } from './formatter';

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
مرحباً بك في بوت البحث عن أرقام الهواتف! 👋

🔍 كيفية الاستخدام:
━━━━━━━━━━━━━━━━━━━━
أرسل رقم الهاتف الذي تريد البحث عنه

📱 صيغ الأرقام المدعومة:
• +201234567890
• 00201234567890
• 01234567890

💳 أنواع الاشتراكات:
━━━━━━━━━━━━━━━━━━━━

👑 VIP:
✓ البحث في جميع قواعد البيانات
✓ نتائج Facebook كاملة
✓ نتائج Contacts
✓ اشتراك شهري

👤 عادي:
✓ البحث في Facebook فقط
✓ نتائج محدودة
✓ اشتراك شهري

📝 الأوامر المتاحة:
/start - رسالة الترحيب
/help - المساعدة
/status - حالة الاشتراك

أرسل رقم هاتف الآن للبدء! 🚀
`, { parse_mode: 'HTML' });
      return;
    }

    if (text.startsWith('/help')) {
      await bot.sendMessage(chatId, `
📋 كيفية استخدام البوت:
━━━━━━━━━━━━━━━━━━━━

1️⃣ أرسل رقم الهاتف مباشرة
2️⃣ انتظر النتائج
3️⃣ سترى معلومات تفصيلية

💡 نصائح:
• تأكد من إدخال الرقم بشكل صحيح
• يمكن إدخال الرقم بأي صيغة
• النتائج تعتمد على نوع اشتراكك

للاستفسارات: تواصل مع الدعم
`, { parse_mode: 'HTML' });
      return;
    }

    if (text.startsWith('/status')) {
      const { hasActiveSubscription, getSubscriptionDetails } = await import('./database');
      
      try {
        const subscription = await hasActiveSubscription(userId);
        
        if (!subscription.hasSubscription) {
          await bot.sendMessage(chatId, `
❌ ليس لديك اشتراك نشط حالياً

للاشتراك، تواصل مع الدعم
`);
          return;
        }

        const details = await getSubscriptionDetails(userId);
        
        if (!details) {
          await bot.sendMessage(chatId, `
⚠️ لم نتمكن من الحصول على تفاصيل اشتراكك

الرجاء المحاولة لاحقاً أو التواصل مع الدعم
`);
          return;
        }

        const subscriptionType = subscription.subscriptionType === 'vip' ? '👑 VIP' : '👤 عادي';
        const endDate = details.subscription_end 
          ? new Date(details.subscription_end).toLocaleDateString('ar-EG')
          : 'غير محدد';

        await bot.sendMessage(chatId, `
✅ معلومات اشتراكك:
━━━━━━━━━━━━━━━━━━━━

📋 النوع: ${subscriptionType}
👤 المستخدم: ${username}
📅 تاريخ الانتهاء: ${endDate}
🟢 الحالة: نشط

${subscription.subscriptionType === 'vip' 
  ? '✓ لديك صلاحية البحث في جميع القواعد' 
  : '✓ لديك صلاحية البحث في Facebook فقط\n\n💡 للترقية إلى VIP، تواصل مع الدعم'}
`, { parse_mode: 'HTML' });
      } catch (error) {
        console.error('❌ [Handler] /status error:', error);
        await bot.sendMessage(chatId, `
❌ حدث خطأ أثناء جلب معلومات الاشتراك

الرجاء المحاولة لاحقاً
`);
      }
      return;
    }

    const phonePattern = /[\d+]/;
    if (phonePattern.test(text)) {
      await bot.sendMessage(chatId, '🔍 جاري البحث عن الرقم...', { parse_mode: 'HTML' });

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

    await bot.sendMessage(chatId, `
⚠️ لم أفهم طلبك

الرجاء إرسال:
• رقم هاتف للبحث عنه
• /start للبدء
• /help للمساعدة
• /status لمعرفة حالة اشتراكك
`);

  } catch (error) {
    console.error('❌ [Handler] Error:', error);
    await bot.sendMessage(chatId, `
❌ عذراً، حدث خطأ أثناء معالجة طلبك

الرجاء المحاولة مرة أخرى أو التواصل مع الدعم
`);
  }
}
