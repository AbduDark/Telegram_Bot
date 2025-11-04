import type { ContentfulStatusCode } from "hono/utils/http-status";

import { registerApiRoute } from "../mastra/inngest";
import { Mastra } from "@mastra/core";
import { mastra } from "../mastra";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn(
    "Trying to initialize Telegram triggers without TELEGRAM_BOT_TOKEN. Can you confirm that the Telegram integration is configured correctly?",
  );
}

export type TriggerInfoTelegramOnNewMessage = {
  type: "telegram/message";
  params: {
    userName: string;
    message: string;
  };
  payload: any;
};

export function registerTelegramTrigger({
  triggerType,
  handler,
}: {
  triggerType: string;
  handler: (
    mastra: Mastra,
    triggerInfo: TriggerInfoTelegramOnNewMessage,
  ) => Promise<void>;
}) {
  return [
    registerApiRoute("/webhooks/telegram/action", {
      method: "POST",
      handler: async (c) => {
        const mastra = c.get("mastra");
        const logger = mastra.getLogger();
        try {
          const payload = await c.req.json();

          logger?.info("📝 [Telegram] payload", payload);

          await handler(mastra, {
            type: triggerType,
            params: {
              userName: payload.message.from.username,
              message: payload.message.text,
            },
            payload,
          } as TriggerInfoTelegramOnNewMessage);

          return c.text("OK", 200);
        } catch (error) {
          logger?.error("Error handling Telegram webhook:", error);
          return c.text("Internal Server Error", 500);
        }
      },
    }),
  ];
}

// Register the Telegram trigger to execute the phone lookup workflow
registerTelegramTrigger({
  triggerType: "telegram/message",
  handler: async (mastra, triggerInfo) => {
    const logger = mastra.getLogger();
    logger?.info("📨 [Telegram Trigger] Received message from user", {
      userName: triggerInfo.params.userName,
      message: triggerInfo.params.message,
    });

    // Get the workflow
    const workflow = mastra.getWorkflow("telegram-phone-lookup");
    if (!workflow) {
      logger?.error("❌ [Telegram Trigger] Workflow 'telegram-phone-lookup' not found");
      return;
    }

    try {
      // Extract chat ID from payload
      const chatId = triggerInfo.payload?.message?.chat?.id;
      
      // Create a workflow run
      logger?.info("🚀 [Telegram Trigger] Starting workflow execution");
      const run = await workflow.createRunAsync();
      
      // Start the workflow with input data
      const result = await run.start({
        inputData: {
          userName: triggerInfo.params.userName || "مستخدم",
          message: triggerInfo.params.message,
          chatId: chatId,
        },
      });

      logger?.info("✅ [Telegram Trigger] Workflow completed successfully", {
        status: result.status,
      });

      // Send the response back to Telegram
      if (result.result?.formattedResponse) {
        logger?.info("📤 [Telegram Trigger] Sending response to Telegram");
        await sendTelegramMessage(chatId, result.result.formattedResponse);
      }
    } catch (error) {
      logger?.error("❌ [Telegram Trigger] Error executing workflow:", error);
    }
  },
});

// Helper function to send messages back to Telegram
async function sendTelegramMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN not found");
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send Telegram message:", error);
    }
  } catch (error) {
    console.error("Error sending Telegram message:", error);
  }
}
