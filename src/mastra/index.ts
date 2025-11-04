import { Mastra } from "@mastra/core";
import { MastraError } from "@mastra/core/error";
import { PinoLogger } from "@mastra/loggers";
import { LogLevel, MastraLogger } from "@mastra/core/logger";
import pino from "pino";
import { MCPServer } from "@mastra/mcp";
import { NonRetriableError } from "inngest";
import { z } from "zod";

import { sharedPostgresStorage } from "./storage";
import { inngest, inngestServe } from "./inngest";
import { telegramBotAgent } from "./agents/telegramBotAgent";

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
            
            if (!chatId) {
              logger?.warn("⚠️ [Telegram] No chat ID found");
              return c.text("OK", 200);
            }
            
            // Check if message contains digits
            const hasDigits = /\d/.test(message);
            let responseText = "";
            
            if (!hasDigits) {
              responseText = "من فضلك ابعت رقم موبايل صحيح. 📱\n\nمثال: +201234567890 أو 01234567890";
            } else {
              // Use agent directly for faster response
              logger?.info("🤖 [Telegram] Calling agent");
              
              const agentResponse = await telegramBotAgent.generate(
                `ابحث عن هذا الرقم: ${message}`
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
