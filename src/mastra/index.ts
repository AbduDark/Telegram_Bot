import { Mastra } from "@mastra/core";
import { MastraError } from "@mastra/core/error";
import { RuntimeContext } from "@mastra/core/di";
import { PinoLogger } from "@mastra/loggers";
import { LogLevel, MastraLogger } from "@mastra/core/logger";
import pino from "pino";
import { MCPServer } from "@mastra/mcp";
import { NonRetriableError } from "inngest";
import { z } from "zod";

import { sharedPostgresStorage } from "./storage";
import { inngest, inngestServe } from "./inngest";
import { telegramBotAgent } from "./agents/telegramBotAgent";

async function setupTelegramWebhook() {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const REPLIT_DEV_DOMAIN = process.env.REPLIT_DEV_DOMAIN;
  const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;

  const WEBHOOK_URL = TELEGRAM_WEBHOOK_URL || 
    (REPLIT_DEV_DOMAIN ? `https://${REPLIT_DEV_DOMAIN}/api/webhooks/telegram/action` : null);

  if (!TELEGRAM_BOT_TOKEN) {
    console.log('⚠️  [Webhook Setup] TELEGRAM_BOT_TOKEN not configured, skipping webhook setup');
    return false;
  }

  if (!WEBHOOK_URL) {
    console.log('⚠️  [Webhook Setup] No webhook URL available');
    console.log('💡 Set TELEGRAM_WEBHOOK_URL or ensure REPLIT_DEV_DOMAIN is available');
    return false;
  }

  try {
    console.log('🔧 [Webhook Setup] Configuring Telegram webhook automatically...');
    console.log(`📍 [Webhook Setup] URL: ${WEBHOOK_URL}`);

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
      console.log('✅ [Webhook Setup] Configured successfully!');
      
      const infoResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
      );
      const webhookInfo = await infoResponse.json();
      
      console.log('📡 [Webhook Setup] Info:', {
        url: webhookInfo.result?.url,
        pending_updates: webhookInfo.result?.pending_update_count,
        max_connections: webhookInfo.result?.max_connections,
      });
      
      return true;
    } else {
      console.error('❌ [Webhook Setup] Failed:', data.description);
      console.log('💡 You can manually run: ./scripts/setup-webhook.sh');
      return false;
    }
  } catch (error) {
    console.error('❌ [Webhook Setup] Error:', error instanceof Error ? error.message : error);
    console.log('💡 You can manually run: ./scripts/setup-webhook.sh');
    return false;
  }
}

class ProductionPinoLogger extends MastraLogger {
  protected logger: pino.Logger;

  constructor(
    options: {
      name?: string;
      level?: LogLevel;
    } = {},
  ) {
    super(options);

    this.logger = pino({
      name: options.name || "app",
      level: options.level || LogLevel.INFO,
      base: {},
      formatters: {
        level: (label: string, _number: number) => ({
          level: label,
        }),
      },
      timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
    });
  }

  debug(message: string, args: Record<string, any> = {}): void {
    this.logger.debug(args, message);
  }

  info(message: string, args: Record<string, any> = {}): void {
    this.logger.info(args, message);
  }

  warn(message: string, args: Record<string, any> = {}): void {
    this.logger.warn(args, message);
  }

  error(message: string, args: Record<string, any> = {}): void {
    this.logger.error(args, message);
  }
}

export const mastra = new Mastra({
  storage: sharedPostgresStorage,
  // Register your agents here
  agents: { telegramBotAgent },
  mcpServers: {
    allTools: new MCPServer({
      name: "allTools",
      version: "1.0.0",
      tools: {},
    }),
  },
  bundler: {
    // A few dependencies are not properly picked up by
    // the bundler if they are not added directly to the
    // entrypoint.
    externals: [
      "@slack/web-api",
      "inngest",
      "inngest/hono",
      "hono",
      "hono/streaming",
    ],
    // sourcemaps are good for debugging.
    sourcemap: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    middleware: [
      async (c, next) => {
        const mastra = c.get("mastra");
        const logger = mastra?.getLogger();
        logger?.debug("[Request]", { method: c.req.method, url: c.req.url });
        try {
          await next();
        } catch (error) {
          logger?.error("[Response]", {
            method: c.req.method,
            url: c.req.url,
            error,
          });
          if (error instanceof MastraError) {
            if (error.id === "AGENT_MEMORY_MISSING_RESOURCE_ID") {
              // This is typically a non-retirable error. It means that the request was not
              // setup correctly to pass in the necessary parameters.
              throw new NonRetriableError(error.message, { cause: error });
            }
          } else if (error instanceof z.ZodError) {
            // Validation errors are never retriable.
            throw new NonRetriableError(error.message, { cause: error });
          }

          throw error;
        }
      },
    ],
    apiRoutes: [
      // Telegram webhook handler
      {
        path: "/webhooks/telegram/action",
        method: "POST",
        handler: async (c) => {
          const mastra = c.get("mastra");
          const logger = mastra.getLogger();
          
          try {
            const payload = await c.req.json();
            logger?.info("📝 [Telegram] Received webhook", { 
              userName: payload.message?.from?.username,
              message: payload.message?.text 
            });
            
            // Extract data from payload
            const userName = payload.message?.from?.username || "مستخدم";
            const message = payload.message?.text || "";
            const chatId = payload.message?.chat?.id;
            const telegramUserId = payload.message?.from?.id; // Extract user ID
            
            if (!chatId) {
              logger?.warn("⚠️ [Telegram] No chat ID found");
              return c.text("OK", 200);
            }
            
            if (!telegramUserId) {
              logger?.warn("⚠️ [Telegram] No user ID found");
              return c.text("OK", 200);
            }
            
            // Check if message contains digits
            const hasDigits = /\d/.test(message);
            let responseText = "";
            
            if (!hasDigits) {
              responseText = "من فضلك ابعت رقم موبايل صحيح. 📱\n\nمثال: +201234567890 أو 01234567890";
            } else {
              // Use agent directly for faster response
              logger?.info("🤖 [Telegram] Calling agent", { 
                userName, 
                telegramUserId 
              });
              
              // Create runtime context with telegramUserId
              const runtimeContext = new RuntimeContext<{ telegramUserId: number }>();
              runtimeContext.set("telegramUserId", telegramUserId);
              
              const agentResponse = await telegramBotAgent.generate(
                `ابحث عن هذا الرقم: ${message}`,
                { runtimeContext }
              );
              
              const greeting = userName ? `مرحباً @${userName}! 👋\n\n` : '';
              responseText = greeting + agentResponse.text;
              
              // Truncate if too long
              if (responseText.length > 4000) {
                responseText = responseText.substring(0, 3900) + 
                  '\n\n... (الرسالة طويلة جداً، تم اختصارها)';
              }
            }
            
            // Send response to Telegram
            logger?.info("📤 [Telegram] Sending response");
            const token = process.env.TELEGRAM_BOT_TOKEN;
            
            if (token) {
              try {
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: responseText,
                  }),
                });
                logger?.info("✅ [Telegram] Response sent successfully");
              } catch (error) {
                logger?.error("❌ [Telegram] Failed to send message", error);
              }
            }
            
            return c.text("OK", 200);
          } catch (error) {
            logger?.error("❌ [Telegram] Error handling webhook", error);
            return c.text("Internal Server Error", 500);
          }
        },
      },
      // Telegram Stars - Pre-checkout query handler
      {
        path: "/webhooks/telegram/pre_checkout",
        method: "POST",
        handler: async (c) => {
          const mastra = c.get("mastra");
          const logger = mastra.getLogger();
          
          try {
            const payload = await c.req.json();
            logger?.info("💳 [Telegram Stars] Pre-checkout query received", { 
              preCheckoutQueryId: payload.pre_checkout_query?.id 
            });
            
            const preCheckoutQuery = payload.pre_checkout_query;
            const token = process.env.TELEGRAM_BOT_TOKEN;
            
            if (!token) {
              logger?.error("❌ [Telegram Stars] TELEGRAM_BOT_TOKEN not configured");
              return c.text("Service Unavailable", 503);
            }
            
            if (!preCheckoutQuery) {
              logger?.warn("⚠️ [Telegram Stars] No pre-checkout query in payload");
              return c.text("OK", 200);
            }
            
            const { dbPool } = await import('./config/database');
            try {
              await dbPool.query('SELECT 1');
            } catch (dbError) {
              logger?.error("❌ [Telegram Stars] Database not available", dbError);
              await fetch(`https://api.telegram.org/bot${token}/answerPreCheckoutQuery`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  pre_checkout_query_id: preCheckoutQuery.id,
                  ok: false,
                  error_message: "Service temporarily unavailable. Please try again later.",
                }),
              });
              return c.text("Service Unavailable", 503);
            }
            
            await fetch(`https://api.telegram.org/bot${token}/answerPreCheckoutQuery`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pre_checkout_query_id: preCheckoutQuery.id,
                ok: true,
              }),
            });
            
            logger?.info("✅ [Telegram Stars] Pre-checkout approved");
            return c.text("OK", 200);
          } catch (error) {
            logger?.error("❌ [Telegram Stars] Error handling pre-checkout", error);
            return c.text("Internal Server Error", 500);
          }
        },
      },
      // Telegram Stars - Successful payment handler
      {
        path: "/webhooks/telegram/payment",
        method: "POST",
        handler: async (c) => {
          const mastra = c.get("mastra");
          const logger = mastra.getLogger();
          
          try {
            const payload = await c.req.json();
            const successfulPayment = payload.message?.successful_payment;
            
            if (!successfulPayment) {
              logger?.warn("⚠️ [Telegram Stars] No payment data found");
              return c.text("OK", 200);
            }
            
            logger?.info("💰 [Telegram Stars] Payment successful", { 
              amount: successfulPayment.total_amount,
              currency: successfulPayment.currency,
              invoicePayload: successfulPayment.invoice_payload
            });
            
            const telegramUserId = payload.message?.from?.id;
            const username = payload.message?.from?.username || "unknown";
            const chatId = payload.message?.chat?.id;
            
            if (!telegramUserId) {
              logger?.error("⚠️ [Telegram Stars] No user ID in payment - cannot process");
              return c.text("Bad Request", 400);
            }
            
            const { addSubscription, grantReferralBonus, dbPool } = await import('./config/database');
            
            const invoicePayload = successfulPayment.invoice_payload;
            let subscriptionType: 'vip' | 'regular' = 'regular';
            let months = 1;
            
            if (invoicePayload.includes('vip')) {
              subscriptionType = 'vip';
            }
            if (invoicePayload.includes('3months')) {
              months = 3;
            } else if (invoicePayload.includes('6months')) {
              months = 6;
            } else if (invoicePayload.includes('12months')) {
              months = 12;
            }
            
            const result = await addSubscription(telegramUserId, username, subscriptionType, months);
            
            if (result.success) {
              try {
                const [referralUse]: any = await dbPool.query(
                  `SELECT referrer_id, subscription_granted FROM referral_uses 
                   WHERE referred_user_id = ? AND subscription_granted = FALSE`,
                  [telegramUserId]
                );
                
                if (Array.isArray(referralUse) && referralUse.length > 0) {
                  const referrerId = referralUse[0].referrer_id;
                  await grantReferralBonus(referrerId);
                  
                  await dbPool.query(
                    `UPDATE referral_uses SET subscription_granted = TRUE WHERE referred_user_id = ?`,
                    [telegramUserId]
                  );
                  
                  logger?.info("🎁 [Telegram Stars] Referral bonus granted", { 
                    referrerId, 
                    referredUserId: telegramUserId 
                  });
                }
              } catch (refError) {
                logger?.warn("⚠️ [Telegram Stars] Error granting referral bonus", refError);
              }
            }
            
            const token = process.env.TELEGRAM_BOT_TOKEN;
            
            if (result.success) {
              logger?.info("✅ [Telegram Stars] Subscription activated", { 
                telegramUserId,
                subscriptionType,
                months,
                endDate: result.endDate
              });
              
              if (token && chatId) {
                const message = subscriptionType === 'vip' 
                  ? `🎉 تم تفعيل اشتراك VIP بنجاح!\n\nمدة الاشتراك: ${months} شهر\nتاريخ الانتهاء: ${result.endDate?.toLocaleDateString('ar-EG')}\n\nيمكنك الآن البحث في جميع قواعد البيانات! 🔍`
                  : `✅ تم تفعيل الاشتراك العادي بنجاح!\n\nمدة الاشتراك: ${months} شهر\nتاريخ الانتهاء: ${result.endDate?.toLocaleDateString('ar-EG')}\n\nيمكنك الآن البحث في قاعدة Facebook! 📱`;
                
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                  }),
                });
              }
            } else {
              logger?.error("❌ [Telegram Stars] Failed to activate subscription", result.error);
              
              if (token && chatId) {
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: "❌ عذراً، حدث خطأ أثناء تفعيل الاشتراك. سيتم المحاولة مرة أخرى تلقائياً. إذا استمرت المشكلة، يرجى التواصل مع الدعم.",
                  }),
                });
              }
              
              return c.text("Internal Server Error", 500);
            }
            
            return c.text("OK", 200);
          } catch (error) {
            logger?.error("❌ [Telegram Stars] Error handling payment", error);
            return c.text("Internal Server Error", 500);
          }
        },
      },
      // This API route is used to register the Mastra workflow (inngest function) on the inngest server
      {
        path: "/api/inngest",
        method: "ALL",
        createHandler: async ({ mastra }) => inngestServe({ mastra, inngest }),
        // The inngestServe function integrates Mastra workflows with Inngest by:
        // 1. Creating Inngest functions for each workflow with unique IDs (workflow.${workflowId})
        // 2. Setting up event handlers that:
        //    - Generate unique run IDs for each workflow execution
        //    - Create an InngestExecutionEngine to manage step execution
        //    - Handle workflow state persistence and real-time updates
        // 3. Establishing a publish-subscribe system for real-time monitoring
        //    through the workflow:${workflowId}:${runId} channel
      },
    ],
  },
  logger:
    process.env.NODE_ENV === "production"
      ? new ProductionPinoLogger({
          name: "Mastra",
          level: "info",
        })
      : new PinoLogger({
          name: "Mastra",
          level: "info",
        }),
});

/*  Sanity check 1: Throw an error if there are more than 1 workflows.  */
// !!!!!! Do not remove this check. !!!!!!
if (Object.keys(mastra.getWorkflows()).length > 1) {
  throw new Error(
    "More than 1 workflows found. Currently, more than 1 workflows are not supported in the UI, since doing so will cause app state to be inconsistent.",
  );
}

/*  Sanity check 2: Throw an error if there are more than 1 agents.  */
// !!!!!! Do not remove this check. !!!!!!
if (Object.keys(mastra.getAgents()).length > 1) {
  throw new Error(
    "More than 1 agents found. Currently, more than 1 agents are not supported in the UI, since doing so will cause app state to be inconsistent.",
  );
}

setupTelegramWebhook().catch((error) => {
  console.error('❌ [Webhook Setup] Unexpected error during webhook setup:', error);
});
