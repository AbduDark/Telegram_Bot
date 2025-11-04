import { createStep, createWorkflow } from "../inngest";
import { z } from "zod";
import { telegramBotAgent } from "../agents/telegramBotAgent";

/**
 * Telegram Bot Workflow
 * 
 * Processes incoming Telegram messages and responds with phone lookup results
 */

/**
 * Step 1: Process Telegram Message with Agent
 */
const processTelegramMessage = createStep({
  id: "process-telegram-message",
  description: "Process incoming Telegram message and search for phone number",
  
  inputSchema: z.object({
    userName: z.string().describe("Telegram username of the sender"),
    message: z.string().describe("Message text from Telegram"),
    chatId: z.number().optional().describe("Telegram chat ID"),
  }),
  
  outputSchema: z.object({
    response: z.string().describe("Bot response to send back"),
    userName: z.string(),
  }),
  
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🚀 [TelegramBotWorkflow] Processing message from user:', { 
      userName: inputData.userName, 
      message: inputData.message 
    });
    
    // Check if message contains digits (likely a phone number)
    const hasDigits = /\d/.test(inputData.message);
    
    if (!hasDigits) {
      logger?.info('⚠️ [TelegramBotWorkflow] Message does not contain digits');
      return {
        response: "من فضلك ابعت رقم موبايل صحيح. 📱\n\nمثال: +201234567890 أو 01234567890",
        userName: inputData.userName,
      };
    }
    
    // Use the agent to process the message
    logger?.info('🤖 [TelegramBotWorkflow] Calling agent to process phone number');
    
    const agentResponse = await telegramBotAgent.generate(
      `ابحث عن هذا الرقم: ${inputData.message}`
    );
    
    logger?.info('✅ [TelegramBotWorkflow] Agent response generated', { 
      responseLength: agentResponse.text.length 
    });
    
    return {
      response: agentResponse.text,
      userName: inputData.userName,
    };
  },
});

/**
 * Step 2: Format and Send Response
 */
const formatResponse = createStep({
  id: "format-response",
  description: "Format the response for Telegram",
  
  inputSchema: z.object({
    response: z.string(),
    userName: z.string(),
  }),
  
  outputSchema: z.object({
    formattedResponse: z.string(),
    success: z.boolean(),
  }),
  
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('📤 [TelegramBotWorkflow] Formatting response for user:', { 
      userName: inputData.userName 
    });
    
    // Add greeting with username if available
    const greeting = inputData.userName ? `مرحباً @${inputData.userName}! 👋\n\n` : '';
    const formattedResponse = greeting + inputData.response;
    
    logger?.info('✅ [TelegramBotWorkflow] Response formatted successfully', {
      responseLength: formattedResponse.length,
    });
    
    // If response is too long, truncate with a note
    // Telegram has a message limit of 4096 characters
    let finalResponse = formattedResponse;
    if (formattedResponse.length > 4000) {
      finalResponse = formattedResponse.substring(0, 3900) + 
        '\n\n... (الرسالة طويلة جداً، تم اختصارها)';
      logger?.warn('⚠️ [TelegramBotWorkflow] Response truncated due to length');
    }
    
    return {
      formattedResponse: finalResponse,
      success: true,
    };
  },
});

/**
 * Create the workflow
 */
export const telegramBotWorkflow = createWorkflow({
  id: "telegram-phone-lookup",
  
  inputSchema: z.object({
    userName: z.string().describe("Telegram username"),
    message: z.string().describe("Message from Telegram"),
    chatId: z.number().optional().describe("Telegram chat ID"),
  }),
  
  outputSchema: z.object({
    formattedResponse: z.string(),
    success: z.boolean(),
  }),
})
  .then(processTelegramMessage)
  .then(formatResponse)
  .commit();
