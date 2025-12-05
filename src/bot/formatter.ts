import { PhoneLookupResult } from './phone-lookup';

export function formatResponse(result: PhoneLookupResult): string {
  const hasFacebookResults = result.facebook.length > 0;
  const hasContactResults = result.contacts.length > 0;
  const isVIP = result.userType === 'vip';

  if (!hasFacebookResults && !hasContactResults) {
    return `
❌ <b>لا توجد نتائج</b>

💡 تأكد من:
• كتابة الرقم بشكل صحيح
• الرقم موجود بالقاعدة

${!isVIP ? '💎 <b>VIP:</b> نتائج أكثر!' : ''}
`;
  }

  let response = '';
  
  const badge = isVIP ? '👑' : '👤';
  response += `<b>🔍 النتائج ${badge}</b>\n`;
  response += `━━━━━━━━━━━━━━━━\n\n`;

  if (hasFacebookResults) {
    response += `<b>📘 Facebook</b> (${result.facebook.length})\n`;
    response += `━━━━━━━━━━━━━━━━\n`;

    result.facebook.forEach((fb, index) => {
      response += `\n<b>${index + 1}.</b>\n`;
      if (fb.name) response += `👤 ${fb.name}\n`;
      if (fb.phone) response += `📱 ${fb.phone}\n`;
      if (fb.facebook_id) response += `🆔 ${fb.facebook_id}\n`;
      if (fb.facebook_url) response += `🔗 ${fb.facebook_url}\n`;
      if (fb.email) response += `✉️ ${fb.email}\n`;
      if (fb.location) response += `📍 ${fb.location}\n`;
      if (fb.job) response += `💼 ${fb.job}\n`;
      if (fb.gender) response += `⚧️ ${fb.gender === 'male' ? 'ذكر' : 'أنثى'}\n`;
    });
  }

  if (isVIP) {
    response += `\n━━━━━━━━━━━━━━━━\n`;
    
    if (hasContactResults) {
      response += `<b>📇 Contacts</b> (${result.contacts.length})\n`;
      response += `━━━━━━━━━━━━━━━━\n`;

      result.contacts.forEach((contact, index) => {
        response += `\n<b>${index + 1}.</b>\n`;
        if (contact.name) response += `🏢 ${contact.name}\n`;
        if (contact.address) response += `📍 ${contact.address}\n`;
        if (contact.phone) response += `📞 ${contact.phone}\n`;
        if (contact.phone2) response += `📞 ${contact.phone2}\n`;
      });
    } else {
      response += `<b>📇 Contacts</b>\nℹ️ لا توجد نتائج\n`;
    }
  } else {
    response += `\n━━━━━━━━━━━━━━━━\n`;
    response += `💎 <b>VIP للمزيد!</b>\n`;
    response += `✓ نتائج Contacts\n`;
    response += `✓ نتائج شاملة\n`;
    response += `✓ دعم أولوية\n`;
  }

  return response;
}
