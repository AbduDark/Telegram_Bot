import express from 'express';
import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { 
  handleTelegramMessage, 
  handleCallbackQuery, 
  handlePreCheckoutQuery,
  handleSuccessfulPayment 
} from './bot/handlers';
import { testConnections } from './bot/database';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const REPLIT_DEV_DOMAIN = process.env.REPLIT_DEV_DOMAIN;
const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;

const WEBHOOK_URL = TELEGRAM_WEBHOOK_URL || 
  (REPLIT_DEV_DOMAIN ? `https://${REPLIT_DEV_DOMAIN}/webhook` : null);

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

console.log('🤖 [Production Server] Initializing Telegram Bot...');

async function setupWebhookAutomatically() {
  if (!WEBHOOK_URL) {
    console.log('⚠️  [Webhook] No webhook URL configured');
    console.log('💡 Set TELEGRAM_WEBHOOK_URL or REPLIT_DEV_DOMAIN in environment variables');
    return false;
  }

  try {
    console.log('🔧 [Webhook] Setting up webhook automatically...');
    console.log(`📍 [Webhook] URL: ${WEBHOOK_URL}`);

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: WEBHOOK_URL,
          max_connections: 40,
          allowed_updates: ['message', 'callback_query', 'pre_checkout_query'],
        }),
      }
    );

    const data = await response.json();

    if (data.ok) {
      console.log('✅ [Webhook] Configured successfully!');
      
      const infoResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
      );
      const webhookInfo = await infoResponse.json();
      
      console.log('📡 [Webhook] Info:', {
        url: webhookInfo.result?.url,
        pending_update_count: webhookInfo.result?.pending_update_count,
        max_connections: webhookInfo.result?.max_connections,
      });
      
      return true;
    } else {
      console.error('❌ [Webhook] Setup failed:', data.description);
      return false;
    }
  } catch (error) {
    console.error('❌ [Webhook] Error during setup:', error instanceof Error ? error.message : error);
    return false;
  }
}

app.get('/', (req, res) => {
  res.json({
    status: 'running',
    mode: 'production',
    timestamp: new Date().toISOString(),
    message: 'Telegram Bot Production Server - No Mastra UI',
    features: [
      'Phone & Facebook ID lookup',
      'Subscription packages (1/3/6/12 months)',
      'Telegram Stars payments',
      'Referral system with bonuses',
      'Search history tracking',
      'Free searches for new users'
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    mode: 'production'
  });
});

app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    
    if (update.pre_checkout_query) {
      console.log('💳 [Webhook] Pre-checkout query received');
      await handlePreCheckoutQuery(bot, update.pre_checkout_query);
      res.sendStatus(200);
      return;
    }
    
    if (update.message?.successful_payment) {
      console.log('💰 [Webhook] Successful payment received');
      await handleSuccessfulPayment(bot, update.message);
      res.sendStatus(200);
      return;
    }
    
    if (update.callback_query) {
      console.log('🔘 [Webhook] Callback query received:', {
        from: update.callback_query.from?.username || update.callback_query.from?.id,
        data: update.callback_query.data
      });
      await handleCallbackQuery(bot, update.callback_query);
      res.sendStatus(200);
      return;
    }
    
    if (update.message) {
      console.log('📨 [Webhook] Received message:', {
        from: update.message.from?.username || update.message.from?.id,
        text: update.message.text?.substring(0, 50),
        chatId: update.message.chat.id
      });

      await handleTelegramMessage(bot, update.message);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ [Webhook] Error:', error);
    res.sendStatus(500);
  }
});

const server = app.listen(PORT, HOST, async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 [Production Server] Server started');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Host: ${HOST}`);
  console.log(`🔌 Port: ${PORT}`);
  console.log(`🌐 Mode: production (No Mastra)`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('\n🔍 Testing database connections...\n');
  await testConnections();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌐 Setting up Telegram Webhook');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const webhookSuccess = await setupWebhookAutomatically();
  
  if (!webhookSuccess && WEBHOOK_URL) {
    console.log('\n💡 Tip: You can also run ./scripts/setup-webhook.sh manually\n');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Server is ready to receive messages!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 Available features:');
  console.log('   • Phone & Facebook ID lookup');
  console.log('   • Subscription packages (1/3/6/12 months)');
  console.log('   • Telegram Stars payments');
  console.log('   • Referral system with bonuses');
  console.log('   • Search history tracking');
  console.log('   • Smart notifications\n');
});

process.on('SIGTERM', () => {
  console.log('📴 [Production Server] Shutting down gracefully...');
  server.close(() => {
    console.log('✅ [Production Server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📴 [Production Server] Received SIGINT, shutting down...');
  server.close(() => {
    console.log('✅ [Production Server] Server closed');
    process.exit(0);
  });
});
