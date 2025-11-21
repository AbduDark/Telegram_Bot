import express from 'express';
import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { handleTelegramMessage } from './bot/handlers';
import { testConnections } from './bot/database';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

console.log('🤖 [Production Server] Initializing Telegram Bot...');

app.get('/', (req, res) => {
  res.json({
    status: 'running',
    mode: 'production',
    timestamp: new Date().toISOString(),
    message: 'Telegram Bot Production Server - No Mastra UI'
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
  
  if (WEBHOOK_URL) {
    console.log(`\n📡 Webhook URL: ${WEBHOOK_URL}`);
    console.log('💡 Run setup-webhook.sh to configure Telegram webhook\n');
  } else {
    console.log('\n⚠️  TELEGRAM_WEBHOOK_URL not set. Please configure webhook manually.\n');
  }
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
