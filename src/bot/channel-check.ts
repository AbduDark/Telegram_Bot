import TelegramBot from 'node-telegram-bot-api';
import { getSetting } from '../admin/database';

const REQUIRED_CHANNEL_ENV = process.env.TELEGRAM_REQUIRED_CHANNEL_ID;

export interface ChannelCheckResult {
  isMember: boolean;
  channelId: string | null;
  error?: string;
}

export async function getRequiredChannelId(): Promise<string | null> {
  if (REQUIRED_CHANNEL_ENV) {
    return REQUIRED_CHANNEL_ENV;
  }
  
  try {
    const channelId = await getSetting('channel_id');
    return channelId || null;
  } catch (error) {
    console.error('❌ [ChannelCheck] Error getting channel ID from settings:', error);
    return null;
  }
}

export async function isUserInRequiredChannel(
  bot: TelegramBot,
  userId: number
): Promise<ChannelCheckResult> {
  const channelId = await getRequiredChannelId();
  
  if (!channelId) {
    console.log('⚠️ [ChannelCheck] No required channel configured, allowing access');
    return { isMember: true, channelId: null };
  }

  console.log(`🔍 [ChannelCheck] Checking if user ${userId} is member of channel ${channelId}`);

  try {
    const chatMember = await bot.getChatMember(channelId, userId);
    const validStatuses = ['member', 'administrator', 'creator'];
    const isMember = validStatuses.includes(chatMember.status);
    
    console.log(`📊 [ChannelCheck] User ${userId} status in ${channelId}: ${chatMember.status} (isMember: ${isMember})`);
    
    return { isMember, channelId };
  } catch (error: any) {
    console.error(`❌ [ChannelCheck] Error checking membership for user ${userId}:`, error.message || error);
    
    if (error.response?.statusCode === 400 || error.message?.includes('Bad Request')) {
      console.log('⚠️ [ChannelCheck] Bot may not be admin of the channel or channel ID is invalid');
      return { isMember: true, channelId, error: 'Bot is not admin of the channel' };
    }
    
    if (error.response?.statusCode === 403) {
      console.log('⚠️ [ChannelCheck] Bot was kicked from channel or access denied');
      return { isMember: true, channelId, error: 'Bot access denied to channel' };
    }
    
    return { isMember: true, channelId, error: error.message };
  }
}

export async function sendChannelJoinPrompt(
  bot: TelegramBot,
  chatId: number,
  channelId: string
): Promise<void> {
  console.log(`📢 [ChannelCheck] Sending join prompt to user in chat ${chatId}`);
  
  let channelLink = channelId;
  if (channelId.startsWith('@')) {
    channelLink = `https://t.me/${channelId.replace('@', '')}`;
  } else if (channelId.startsWith('-100')) {
    try {
      const chat = await bot.getChat(channelId);
      if (chat.username) {
        channelLink = `https://t.me/${chat.username}`;
      }
    } catch (error) {
      console.error('❌ [ChannelCheck] Could not get channel info:', error);
    }
  }

  const keyboard = {
    inline_keyboard: [
      [{ text: '📢 انضم للقناة', url: channelLink }],
      [{ text: '✅ لقد اشتركت', callback_data: 'check_channel_subscription' }]
    ]
  };

  await bot.sendMessage(chatId, `
⚠️ <b>يجب الاشتراك في القناة أولاً</b>

للاستخدام البوت، يجب أن تكون مشتركاً في قناتنا الرسمية.

1️⃣ اضغط على "انضم للقناة" للاشتراك
2️⃣ ثم اضغط "لقد اشتركت" للتحقق

💡 بعد الاشتراك يمكنك استخدام جميع مميزات البوت!
`, { parse_mode: 'HTML', reply_markup: keyboard });
}

export async function handleChannelSubscriptionCheck(
  bot: TelegramBot,
  callbackQuery: TelegramBot.CallbackQuery
): Promise<boolean> {
  const chatId = callbackQuery.message?.chat.id;
  const userId = callbackQuery.from.id;

  if (!chatId) {
    try {
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'خطأ في الطلب' });
    } catch {}
    return false;
  }

  console.log(`🔄 [ChannelCheck] Re-checking subscription for user ${userId}`);

  try {
    const result = await isUserInRequiredChannel(bot, userId);
    
    if (result.isMember) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ تم التحقق بنجاح!' });
      await bot.sendMessage(chatId, `
✅ <b>تم التحقق بنجاح!</b>

أنت الآن مشترك في القناة ويمكنك استخدام البوت.

أرسل /start للبدء
`, { parse_mode: 'HTML' });
      return true;
    } else {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ لم يتم العثور على اشتراكك' });
      await bot.sendMessage(chatId, `
❌ <b>لم يتم العثور على اشتراكك</b>

يبدو أنك لم تشترك في القناة بعد.
يرجى الاشتراك أولاً ثم الضغط على "لقد اشتركت" مرة أخرى.
`, { parse_mode: 'HTML' });
      return false;
    }
  } catch (error) {
    console.error('❌ [ChannelCheck] Error in subscription check callback:', error);
    try {
      await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ حدث خطأ' });
    } catch {}
    await bot.sendMessage(chatId, '❌ حدث خطأ. حاول مرة أخرى.', { parse_mode: 'HTML' });
    return false;
  }
}
