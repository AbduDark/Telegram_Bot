import TelegramBot from 'node-telegram-bot-api';
import { lookupPhoneNumber, lookupFacebookId, SearchAccessType } from './phone-lookup';
import { formatResponse } from './formatter';
import { chatWithAI } from './ai-assistant';
import {
  hasActiveSubscription,
  getSubscriptionDetails,
  getFreeSearchesRemaining,
  useFreeSearch,
  generateReferralCode,
  applyReferralCode,
  getReferralStats,
  useBonusSearch,
  getSearchHistory,
  saveSearchHistory,
  PAYMENT_CONFIG,
  TERMS_AND_CONDITIONS,
  getPackageDetails,
  getUserReferralDiscount,
  markReferralDiscountUsed,
  registerNewUser,
  hasAcceptedTerms,
  acceptTerms,
  canPerformSearch,
  getMonthlySearchCount,
  PackageDuration,
  SubscriptionType
} from './database';
import {
  isUserInRequiredChannel,
  sendChannelJoinPrompt,
  handleChannelSubscriptionCheck
} from './channel-check';

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
    const channelCheck = await isUserInRequiredChannel(bot, userId);
    
    if (!channelCheck.isMember && channelCheck.channelId) {
      console.log(`🚫 [Handler] User ${userId} is not subscribed to required channel ${channelCheck.channelId}`);
      await sendChannelJoinPrompt(bot, chatId, channelCheck.channelId);
      return;
    }

    if (text.startsWith('/start')) {
      const registration = await registerNewUser(userId, username);
      if (registration.isNew) {
        console.log(`🆕 [Handler] New user registered: ${username} (${userId})`);
      }
      
      const parts = text.split(' ');
      if (parts.length > 1 && parts[1].startsWith('ref_')) {
        const referralCode = parts[1].replace('ref_', '');
        const result = await applyReferralCode(userId, username, referralCode);
        if (result.success) {
          await bot.sendMessage(chatId, `🎁 ${result.message}`, { parse_mode: 'HTML' });
        }
      }

      const termsAccepted = await hasAcceptedTerms(userId);
      
      if (!termsAccepted) {
        const keyboard = {
          inline_keyboard: [
            [{ text: '✅ أوافق على الشروط والأحكام', callback_data: 'accept_terms' }]
          ]
        };
        
        await bot.sendMessage(chatId, `
مرحباً ${username}! 👋

${TERMS_AND_CONDITIONS.text}

⚠️ <b>يجب الموافقة على الشروط للمتابعة</b>
`, { parse_mode: 'HTML', reply_markup: keyboard });
        return;
      }

      const freeSearches = await getFreeSearchesRemaining(userId);
      
      await bot.sendMessage(chatId, `
مرحباً ${username}! 👋
<b>بوت البحث الذكي 🔍</b>

<b>كيف تستخدمني؟</b>
📱 أرسل رقم هاتف (01234567890)
🆔 أرسل Facebook ID
💬 اسألني أي سؤال!

━━━━━━━━━━━━━━━━
<b>الاشتراكات:</b>

👑 <b>VIP</b> - ${PAYMENT_CONFIG.PACKAGES.vip['1month'].stars}⭐/شهر (${PAYMENT_CONFIG.MONTHLY_SEARCH_LIMIT} بحث)
👤 <b>عادي</b> - ${PAYMENT_CONFIG.PACKAGES.regular['1month'].stars}⭐/شهر (${PAYMENT_CONFIG.MONTHLY_SEARCH_LIMIT} بحث)

━━━━━━━━━━━━━━━━
<b>الأوامر:</b>
/help - المساعدة
/status - حالة اشتراكك
/packages - باقات الاشتراك
/subscribe - اشترك الآن
/referral - كود الإحالة
/history - سجل البحث
/terms - الشروط والأحكام

🎁 لديك ${freeSearches} عمليات بحث مجانية!
`, { parse_mode: 'HTML' });
      return;
    }

    if (text.startsWith('/terms')) {
      await bot.sendMessage(chatId, TERMS_AND_CONDITIONS.text, { parse_mode: 'HTML' });
      return;
    }

    if (text.startsWith('/help')) {
      await bot.sendMessage(chatId, `
<b>📋 دليل الاستخدام</b>

<b>🔍 البحث:</b>
• أرسل رقم الهاتف بأي صيغة
• أرسل Facebook ID
• اسألني أي شيء!

<b>💰 الاشتراكات:</b>
/packages - عرض الباقات والأسعار
/subscribe - اشترك الآن
/status - حالة اشتراكك

<b>🎁 نظام الإحالة:</b>
/referral - احصل على كود إحالتك
• شارك الكود مع أصدقائك
• احصل على 3 عمليات بحث مجانية لكل صديق يشترك
• صديقك يحصل على خصم 10%

<b>📜 السجل:</b>
/history - آخر 10 عمليات بحث

<b>❓ أمثلة:</b>
• 01234567890
• +201234567890  
• 100007800548113
`, { parse_mode: 'HTML' });
      return;
    }

    if (text.startsWith('/status')) {
      try {
        await registerNewUser(userId, username);
        const subscription = await hasActiveSubscription(userId);
        const freeSearches = await getFreeSearchesRemaining(userId);
        const referralStats = await getReferralStats(userId);
        
        if (!subscription.hasSubscription) {
          await bot.sendMessage(chatId, `
🔒 <b>اشتراك غير نشط</b>

📊 <b>البحث المجاني:</b>
• المتبقي: ${freeSearches} من ${PAYMENT_CONFIG.FREE_SEARCHES}
${referralStats ? `• مكافآت الإحالة: ${referralStats.bonusSearches} عمليات` : ''}

💎 للاشتراك: /subscribe
📦 عرض الباقات: /packages
`, { parse_mode: 'HTML' });
          return;
        }

        const details = await getSubscriptionDetails(userId);
        
        if (!details) {
          await bot.sendMessage(chatId, `⚠️ <b>خطأ مؤقت</b>\n\nحاول لاحقاً`, { parse_mode: 'HTML' });
          return;
        }

        const subscriptionType = subscription.subscriptionType === 'vip' ? '👑 VIP' : '👤 عادي';
        const endDate = details.subscription_end 
          ? new Date(details.subscription_end).toLocaleDateString('ar-EG')
          : 'غير محدد';

        await bot.sendMessage(chatId, `
<b>✅ حالة اشتراكك</b>

${subscriptionType}
👤 ${username}
📅 ينتهي: ${endDate}
🟢 نشط

${subscription.subscriptionType === 'vip' 
  ? '✓ البحث في جميع القواعد' 
  : '✓ البحث في Facebook فقط'}
${referralStats ? `\n🎁 مكافآت الإحالة: ${referralStats.bonusSearches} عمليات بحث` : ''}
`, { parse_mode: 'HTML' });
      } catch (error) {
        console.error('❌ [Handler] /status error:', error);
        await bot.sendMessage(chatId, `❌ <b>خطأ</b>\n\nحاول مرة أخرى لاحقاً`, { parse_mode: 'HTML' });
      }
      return;
    }

    if (text.startsWith('/packages')) {
      const packages = PAYMENT_CONFIG.PACKAGES;
      
      await bot.sendMessage(chatId, `
💰 <b>باقات الاشتراك المتاحة</b>

━━━━━━━━━━━━━━━━━━━━
📱 <b>الاشتراك العادي</b> (Facebook فقط)
━━━━━━━━━━━━━━━━━━━━
• 1 شهر: ${packages.regular['1month'].stars} ⭐
• 3 شهور: ${packages.regular['3months'].stars} ⭐ (خصم 10%)
• 6 شهور: ${packages.regular['6months'].stars} ⭐ (خصم 20%)
• 12 شهر: ${packages.regular['12months'].stars} ⭐ (خصم 30%)

━━━━━━━━━━━━━━━━━━━━
👑 <b>اشتراك VIP</b> (جميع قواعد البيانات)
━━━━━━━━━━━━━━━━━━━━
• 1 شهر: ${packages.vip['1month'].stars} ⭐
• 3 شهور: ${packages.vip['3months'].stars} ⭐ (خصم 10%)
• 6 شهور: ${packages.vip['6months'].stars} ⭐ (خصم 20%)
• 12 شهر: ${packages.vip['12months'].stars} ⭐ (خصم 30%)

🎁 لديك كود إحالة؟ احصل على خصم 10% إضافي!

💡 للاشتراك: /subscribe
`, { parse_mode: 'HTML' });
      return;
    }

    if (text.startsWith('/subscribe')) {
      await registerNewUser(userId, username);
      const packages = PAYMENT_CONFIG.PACKAGES;
      const keyboard = {
        inline_keyboard: [
          [
            { text: `👤 عادي - شهر (${packages.regular['1month'].stars}⭐)`, callback_data: 'sub_regular_1month' },
            { text: `👑 VIP - شهر (${packages.vip['1month'].stars}⭐)`, callback_data: 'sub_vip_1month' }
          ],
          [
            { text: `👤 عادي - 3 شهور (${packages.regular['3months'].stars}⭐)`, callback_data: 'sub_regular_3months' },
            { text: `👑 VIP - 3 شهور (${packages.vip['3months'].stars}⭐)`, callback_data: 'sub_vip_3months' }
          ],
          [
            { text: `👤 عادي - 6 شهور (${packages.regular['6months'].stars}⭐)`, callback_data: 'sub_regular_6months' },
            { text: `👑 VIP - 6 شهور (${packages.vip['6months'].stars}⭐)`, callback_data: 'sub_vip_6months' }
          ],
          [
            { text: `👤 عادي - سنة (${packages.regular['12months'].stars}⭐)`, callback_data: 'sub_regular_12months' },
            { text: `👑 VIP - سنة (${packages.vip['12months'].stars}⭐)`, callback_data: 'sub_vip_12months' }
          ]
        ]
      };

      await bot.sendMessage(chatId, `
💳 <b>اختر باقة الاشتراك</b>

📊 <b>جميع الباقات تشمل ${PAYMENT_CONFIG.MONTHLY_SEARCH_LIMIT} عملية بحث شهرياً</b>

اضغط على الباقة المناسبة لك:
`, { parse_mode: 'HTML', reply_markup: keyboard });
      return;
    }

    if (text.startsWith('/referral')) {
      try {
        await registerNewUser(userId, username);
        const code = await generateReferralCode(userId, username);
        const stats = await getReferralStats(userId);
        
        const botUsername = (await bot.getMe()).username;
        const referralLink = `https://t.me/${botUsername}?start=ref_${code}`;

        await bot.sendMessage(chatId, `
🎁 <b>نظام الإحالة</b>

📋 <b>كود الإحالة الخاص بك:</b>
<code>${code}</code>

🔗 <b>رابط الدعوة:</b>
${referralLink}

━━━━━━━━━━━━━━━━━━━━
📊 <b>إحصائياتك:</b>
• إجمالي الإحالات: ${stats?.totalReferrals || 0}
• عمليات بحث مكافأة: ${stats?.bonusSearches || 0}

━━━━━━━━━━━━━━━━━━━━
<b>🎯 المكافآت:</b>
• أنت تحصل على: 3 عمليات بحث مجانية لكل صديق يشترك
• صديقك يحصل على: خصم 10% على أول اشتراك

💡 شارك الرابط مع أصدقائك!
`, { parse_mode: 'HTML' });
      } catch (error) {
        console.error('❌ [Handler] /referral error:', error);
        await bot.sendMessage(chatId, `❌ <b>خطأ</b>\n\nحاول مرة أخرى لاحقاً`, { parse_mode: 'HTML' });
      }
      return;
    }

    if (text.startsWith('/history')) {
      try {
        const history = await getSearchHistory(userId, 10);
        
        if (history.length === 0) {
          await bot.sendMessage(chatId, `
📜 <b>سجل البحث</b>

لا توجد عمليات بحث سابقة.

🔍 ابدأ البحث بإرسال رقم هاتف!
`, { parse_mode: 'HTML' });
          return;
        }

        let historyText = `📜 <b>آخر ${history.length} عمليات بحث</b>\n\n`;
        
        history.forEach((item, index) => {
          const typeEmoji = item.searchType === 'phone' ? '📱' : '🆔';
          const date = new Date(item.createdAt).toLocaleDateString('ar-EG');
          historyText += `${index + 1}. ${typeEmoji} <code>${item.searchQuery}</code>\n`;
          historyText += `   📊 ${item.resultsCount} نتيجة | 📅 ${date}\n\n`;
        });

        await bot.sendMessage(chatId, historyText, { parse_mode: 'HTML' });
      } catch (error) {
        console.error('❌ [Handler] /history error:', error);
        await bot.sendMessage(chatId, `❌ <b>خطأ</b>\n\nحاول مرة أخرى لاحقاً`, { parse_mode: 'HTML' });
      }
      return;
    }

    if (text.startsWith('/use_code ') || text.startsWith('/usecode ')) {
      const code = text.split(' ')[1];
      if (!code) {
        await bot.sendMessage(chatId, `
❌ <b>خطأ</b>

يرجى إدخال كود الإحالة:
<code>/use_code REFXXXXXX</code>
`, { parse_mode: 'HTML' });
        return;
      }

      const result = await applyReferralCode(userId, username, code);
      await bot.sendMessage(chatId, result.success 
        ? `✅ ${result.message}` 
        : `❌ ${result.message}`, { parse_mode: 'HTML' });
      return;
    }

    const phonePattern = /[\d+]/;
    if (phonePattern.test(text)) {
      await registerNewUser(userId, username);
      
      const subscription = await hasActiveSubscription(userId);
      let accessType: SearchAccessType = 'regular';
      
      if (subscription.hasSubscription) {
        const searchPermission = await canPerformSearch(userId);
        
        if (!searchPermission.canSearch) {
          if (searchPermission.reason === 'limit_reached') {
            await bot.sendMessage(chatId, `
📊 <b>تم الوصول للحد الشهري</b>

لقد استخدمت ${searchPermission.searchesUsed} من ${PAYMENT_CONFIG.MONTHLY_SEARCH_LIMIT} عملية بحث هذا الشهر.

⏳ سيتم تجديد رصيدك في بداية الشهر القادم.

🎁 شارك كود الإحالة للحصول على عمليات بحث إضافية:
/referral
`, { parse_mode: 'HTML' });
            return;
          }
        }
        
        accessType = (subscription.subscriptionType as SearchAccessType) || 'regular';
        console.log(`📊 [Handler] Subscribed user search: ${searchPermission.searchesUsed}/${PAYMENT_CONFIG.MONTHLY_SEARCH_LIMIT} used`);
      } else {
        const referralStats = await getReferralStats(userId);
        if (referralStats && referralStats.bonusSearches > 0) {
          const used = await useBonusSearch(userId);
          if (used.success) {
            await bot.sendMessage(chatId, `🎁 تم استخدام بحث مكافأة (المتبقي: ${used.remaining})`, { parse_mode: 'HTML' });
            accessType = 'free';
          } else {
            await bot.sendMessage(chatId, `
🔒 <b>انتهت عمليات البحث المجانية</b>

💎 للاستمرار، اشترك الآن:
/subscribe - اختر باقة
/packages - عرض الأسعار

🎁 أو شارك كود الإحالة واحصل على عمليات مجانية:
/referral
`, { parse_mode: 'HTML' });
            return;
          }
        } else {
          const freeResult = await useFreeSearch(userId, username);
          if (!freeResult.success) {
            await bot.sendMessage(chatId, `
🔒 <b>انتهت عمليات البحث المجانية</b>

💎 للاستمرار، اشترك الآن:
/subscribe - اختر باقة
/packages - عرض الأسعار

🎁 أو شارك كود الإحالة واحصل على عمليات مجانية:
/referral
`, { parse_mode: 'HTML' });
            return;
          }
          await bot.sendMessage(chatId, `🔍 بحث مجاني (المتبقي: ${freeResult.remaining})`, { parse_mode: 'HTML' });
          accessType = 'free';
        }
      }

      await bot.sendMessage(chatId, '🔍 <b>جاري البحث...</b>', { parse_mode: 'HTML' });

      let result;
      const cleanedText = text.replace(/[^\d]/g, '');
      const isFacebookId = cleanedText.startsWith('100') && cleanedText.length > 14;
      
      if (isFacebookId) {
        console.log(`🔍 [Handler] Detected Facebook ID: ${text}, access: ${accessType}`);
        result = await lookupFacebookId(text, userId, accessType);
      } else {
        console.log(`📱 [Handler] Detected phone number: ${text}, access: ${accessType}`);
        result = await lookupPhoneNumber(text, userId, accessType);
      }
      
      const resultsCount = (result.facebook?.length || 0) + (result.contacts?.length || 0);
      await saveSearchHistory(userId, text, isFacebookId ? 'facebook_id' : 'phone', resultsCount);
      
      const response = formatResponse(result);
      await bot.sendMessage(chatId, response, { parse_mode: 'HTML' });
      return;
    }

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
`, { parse_mode: 'HTML' });
  }
}

export async function handleCallbackQuery(
  bot: TelegramBot,
  callbackQuery: TelegramBot.CallbackQuery
): Promise<void> {
  const chatId = callbackQuery.message?.chat.id;
  const userId = callbackQuery.from.id;
  const username = callbackQuery.from.username || callbackQuery.from.first_name || 'مستخدم';
  const data = callbackQuery.data;

  if (!chatId || !data) return;

  console.log(`🔘 [Callback] ${username} (${userId}): ${data}`);

  try {
    if (data === 'check_channel_subscription') {
      await handleChannelSubscriptionCheck(bot, callbackQuery);
      return;
    }

    await bot.answerCallbackQuery(callbackQuery.id);

    if (data === 'accept_terms') {
      const result = await acceptTerms(userId, username);
      if (result.success) {
        await bot.sendMessage(chatId, `
✅ <b>تم قبول الشروط والأحكام</b>

شكراً لموافقتك! يمكنك الآن استخدام البوت.

أرسل /start للبدء
`, { parse_mode: 'HTML' });
      } else {
        await bot.sendMessage(chatId, `❌ حدث خطأ. حاول مرة أخرى.`, { parse_mode: 'HTML' });
      }
      return;
    }

    if (data.startsWith('sub_')) {
      const parts = data.replace('sub_', '').split('_');
      const subscriptionType = parts[0] as SubscriptionType;
      const duration = parts[1] as PackageDuration;
      
      const packageDetails = getPackageDetails(subscriptionType, duration);
      
      let finalStars = packageDetails.stars;
      let referralDiscountApplied = false;
      
      const referralDiscount = await getUserReferralDiscount(userId);
      if (referralDiscount.hasDiscount) {
        const discountAmount = Math.floor(packageDetails.stars * (referralDiscount.discountPercent / 100));
        finalStars = packageDetails.stars - discountAmount;
        referralDiscountApplied = true;
        await markReferralDiscountUsed(userId);
      }

      const isVIP = subscriptionType === 'vip';
      const monthsText: Record<string, string> = {
        '1month': 'شهر واحد',
        '3months': '3 شهور',
        '6months': '6 شهور',
        '12months': '12 شهر'
      };

      const title = isVIP 
        ? `👑 اشتراك VIP - ${monthsText[duration]}` 
        : `📱 اشتراك عادي - ${monthsText[duration]}`;

      let discountText = '';
      if (packageDetails.discount > 0) {
        discountText = referralDiscountApplied 
          ? ` (خصم ${packageDetails.discount}% + 10% إحالة)` 
          : ` (خصم ${packageDetails.discount}%)`;
      } else if (referralDiscountApplied) {
        discountText = ' (خصم 10% إحالة)';
      }

      const description = isVIP 
        ? `اشتراك VIP لمدة ${monthsText[duration]}${discountText}\nالبحث في جميع قواعد البيانات`
        : `اشتراك عادي لمدة ${monthsText[duration]}${discountText}\nالبحث في Facebook فقط`;

      const payload = `subscription_${subscriptionType}_${duration}`;

      try {
        await bot.sendInvoice(
          chatId,
          title,
          description,
          payload,
          '',
          'XTR',
          [{ label: title, amount: finalStars }]
        );

        let confirmMessage = `✅ تم إرسال فاتورة الدفع!\n\n💰 المبلغ: ${finalStars} ⭐`;
        if (referralDiscountApplied) {
          confirmMessage += `\n🎁 تم تطبيق خصم الإحالة 10%!`;
        }
        confirmMessage += `\n\n💡 اضغط على الفاتورة لإتمام الدفع`;

        await bot.sendMessage(chatId, confirmMessage, { parse_mode: 'HTML' });
      } catch (error) {
        console.error('❌ [Callback] Error sending invoice:', error);
        await bot.sendMessage(chatId, `❌ خطأ في إرسال الفاتورة. حاول مرة أخرى.`, { parse_mode: 'HTML' });
      }
    }
  } catch (error) {
    console.error('❌ [Callback] Error:', error);
  }
}

export async function handlePreCheckoutQuery(
  bot: TelegramBot,
  preCheckoutQuery: TelegramBot.PreCheckoutQuery
): Promise<void> {
  console.log(`💳 [PreCheckout] User ${preCheckoutQuery.from.id}: ${preCheckoutQuery.invoice_payload}`);
  
  try {
    await bot.answerPreCheckoutQuery(preCheckoutQuery.id, true);
    console.log('✅ [PreCheckout] Approved');
  } catch (error) {
    console.error('❌ [PreCheckout] Error:', error);
    await bot.answerPreCheckoutQuery(preCheckoutQuery.id, false, { error_message: 'حدث خطأ. حاول مرة أخرى.' });
  }
}

export async function handleSuccessfulPayment(
  bot: TelegramBot,
  message: TelegramBot.Message
): Promise<void> {
  const successfulPayment = message.successful_payment;
  const chatId = message.chat.id;
  const userId = message.from?.id;
  const username = message.from?.username || message.from?.first_name || 'مستخدم';

  if (!successfulPayment || !userId) return;

  console.log(`💰 [Payment] Success: User ${userId}, Amount: ${successfulPayment.total_amount} XTR`);
  console.log(`📦 [Payment] Payload: ${successfulPayment.invoice_payload}`);

  try {
    const { addSubscription, grantReferralBonus, dbPool } = await import('./database');

    const payload = successfulPayment.invoice_payload;
    let subscriptionType: 'vip' | 'regular' = 'regular';
    let months = 1;

    if (payload.includes('vip')) {
      subscriptionType = 'vip';
    }
    if (payload.includes('3months')) {
      months = 3;
    } else if (payload.includes('6months')) {
      months = 6;
    } else if (payload.includes('12months')) {
      months = 12;
    }

    const result = await addSubscription(userId, username, subscriptionType, months);

    if (result.success) {
      try {
        const [referralUse]: any = await dbPool.query(
          `SELECT referrer_id, subscription_granted FROM referral_uses 
           WHERE referred_user_id = ? AND subscription_granted = FALSE`,
          [userId]
        );

        if (Array.isArray(referralUse) && referralUse.length > 0) {
          const referrerId = referralUse[0].referrer_id;
          await grantReferralBonus(referrerId);

          await dbPool.query(
            `UPDATE referral_uses SET subscription_granted = TRUE WHERE referred_user_id = ?`,
            [userId]
          );

          console.log(`🎁 [Payment] Referral bonus granted to ${referrerId}`);

          try {
            await bot.sendMessage(referrerId, `
🎉 <b>مكافأة إحالة!</b>

صديقك ${username} اشترك باستخدام كودك!
🎁 حصلت على 3 عمليات بحث مجانية!

شكراً لمشاركة الكود! 💪
`, { parse_mode: 'HTML' });
          } catch (e) {
            console.log('Could not notify referrer');
          }
        }
      } catch (refError) {
        console.error('⚠️ [Payment] Error granting referral bonus:', refError);
      }

      const endDateStr = result.endDate?.toLocaleDateString('ar-EG') || 'غير محدد';
      const message = subscriptionType === 'vip'
        ? `🎉 <b>تم تفعيل اشتراك VIP بنجاح!</b>\n\n📅 مدة الاشتراك: ${months} شهر\n📆 تاريخ الانتهاء: ${endDateStr}\n\n✅ يمكنك الآن البحث في جميع قواعد البيانات! 🔍`
        : `✅ <b>تم تفعيل الاشتراك العادي بنجاح!</b>\n\n📅 مدة الاشتراك: ${months} شهر\n📆 تاريخ الانتهاء: ${endDateStr}\n\n✅ يمكنك الآن البحث في قاعدة Facebook! 📱`;

      await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } else {
      console.error('❌ [Payment] Failed to activate subscription:', result.error);
      await bot.sendMessage(chatId, `
❌ <b>عذراً، حدث خطأ أثناء تفعيل الاشتراك</b>

سيتم المحاولة مرة أخرى تلقائياً.
إذا استمرت المشكلة، تواصل مع الدعم.
`, { parse_mode: 'HTML' });
    }
  } catch (error) {
    console.error('❌ [Payment] Error processing payment:', error);
    await bot.sendMessage(chatId, `❌ حدث خطأ. تواصل مع الدعم.`, { parse_mode: 'HTML' });
  }
}
