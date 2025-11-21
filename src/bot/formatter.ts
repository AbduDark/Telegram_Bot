import { PhoneLookupResult } from './phone-lookup';

export function formatResponse(result: PhoneLookupResult): string {
  if (result.userType === 'no_subscription') {
    return `
❌ ليس لديك اشتراك نشط

للاشتراك في البوت والحصول على صلاحية البحث:
💳 تواصل مع الدعم للاشتراك

الأنواع المتاحة:
👑 VIP - البحث في جميع القواعد
👤 عادي - البحث في Facebook فقط
`;
  }

  const hasFacebookResults = result.facebook.length > 0;
  const hasContactResults = result.contacts.length > 0;
  const isVIP = result.userType === 'vip';

  if (!hasFacebookResults && !hasContactResults) {
    return `
❌ لم يتم العثور على نتائج لهذا الرقم

💡 تأكد من:
• إدخال الرقم بشكل صحيح
• الرقم موجود في قاعدة البيانات

${!isVIP ? '\n💎 الترقية إلى VIP للبحث في قواعد بيانات إضافية!' : ''}
`;
  }

  let response = '';
  
  const subscriptionBadge = isVIP ? '👑 VIP' : '👤 عادي';
  response += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  response += `🔍 نتائج البحث (${subscriptionBadge})\n`;
  response += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (hasFacebookResults) {
    response += `╔═══════════════════════════╗\n`;
    response += `║  📘 نتائج Facebook (${result.facebook.length})    ║\n`;
    response += `╚═══════════════════════════╝\n\n`;

    result.facebook.forEach((fb, index) => {
      response += `🔹 نتيجة ${index + 1}:\n`;
      if (fb.name) response += `👤 الاسم: ${fb.name}\n`;
      if (fb.phone) response += `📱 الهاتف: ${fb.phone}\n`;
      if (fb.facebook_id) response += `🆔 معرف Facebook: ${fb.facebook_id}\n`;
      if (fb.facebook_url) response += `🔗 رابط الحساب: ${fb.facebook_url}\n`;
      if (fb.email) response += `✉️ البريد الإلكتروني: ${fb.email}\n`;
      if (fb.location) response += `📍 الموقع: ${fb.location}\n`;
      if (fb.job) response += `💼 الوظيفة: ${fb.job}\n`;
      if (fb.gender) response += `⚧️ النوع: ${fb.gender === 'male' ? 'ذكر' : 'أنثى'}\n`;
      response += `\n`;
    });
  }

  if (isVIP) {
    response += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (hasContactResults) {
      response += `╔═══════════════════════════╗\n`;
      response += `║  📇 نتائج Contacts (${result.contacts.length})   ║\n`;
      response += `╚═══════════════════════════╝\n\n`;

      result.contacts.forEach((contact, index) => {
        response += `🔹 نتيجة ${index + 1}:\n`;
        if (contact.name) response += `🏢 الاسم: ${contact.name}\n`;
        if (contact.address) response += `📍 العنوان: ${contact.address}\n`;
        if (contact.phone) response += `📞 الهاتف الأول: ${contact.phone}\n`;
        if (contact.phone2) response += `📞 الهاتف الثاني: ${contact.phone2}\n`;
        response += `\n`;
      });
    } else {
      response += `╔═══════════════════════════╗\n`;
      response += `║  📇 نتائج Contacts        ║\n`;
      response += `╚═══════════════════════════╝\n\n`;
      response += `ℹ️ لم يتم العثور على نتائج في Contacts\n\n`;
    }
  } else {
    response += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    response += `💡 <b>للحصول على نتائج أكثر:</b>\n`;
    response += `قم بالترقية إلى اشتراك VIP! 👑\n\n`;
    response += `<b>مميزات VIP:</b>\n`;
    response += `✓ البحث في قاعدة Contacts\n`;
    response += `✓ نتائج أشمل وأكثر تفصيلاً\n`;
    response += `✓ أولوية في الدعم الفني\n\n`;
    response += `📞 للاشتراك: تواصل مع الدعم\n`;
  }

  return response;
}
