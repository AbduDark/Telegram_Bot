import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getSearchHistory, clearSearchHistory } from "../config/database";

export const searchHistoryTool = createTool({
  id: "search-history",
  
  description: `Manage user's search history. Use this when:
- User asks to see their previous searches or search history
- User wants to clear their search history
- User asks "what did I search for before" or similar`,
  
  inputSchema: z.object({
    action: z.enum(['get', 'clear']).describe("Action: get (show search history), clear (delete all history)"),
    telegramUserId: z.number().describe("Telegram user ID"),
  }),
  
  outputSchema: z.object({
    success: z.boolean(),
    action: z.string(),
    message: z.string(),
    data: z.any().optional(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('📜 [SearchHistoryTool] Starting execution', { 
      action: context.action,
      telegramUserId: context.telegramUserId 
    });
    
    try {
      switch (context.action) {
        case 'get': {
          const history = await getSearchHistory(context.telegramUserId);
          
          if (history.length === 0) {
            logger?.info('📜 [SearchHistoryTool] No history found', { 
              telegramUserId: context.telegramUserId
            });
            
            return {
              success: true,
              action: 'get',
              message: '📜 سجل البحث فارغ\n\nلم تقم بأي عمليات بحث بعد.',
              data: { history: [] }
            };
          }
          
          logger?.info('✅ [SearchHistoryTool] History retrieved', { 
            telegramUserId: context.telegramUserId,
            count: history.length
          });
          
          let historyText = '📜 **سجل البحث الخاص بك** (آخر 10 عمليات):\n\n';
          
          history.forEach((entry, index) => {
            const date = new Date(entry.searchedAt);
            const formattedDate = date.toLocaleDateString('ar-EG', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            });
            
            const typeIcon = entry.searchType === 'phone' ? '📱' : '👤';
            const resultsText = entry.resultsFound > 0 ? `✅ ${entry.resultsFound} نتيجة` : '❌ لا نتائج';
            
            historyText += `${index + 1}. ${typeIcon} ${entry.searchQuery}\n`;
            historyText += `   📅 ${formattedDate} | ${resultsText}\n\n`;
          });
          
          return {
            success: true,
            action: 'get',
            message: historyText,
            data: { history, count: history.length }
          };
        }
        
        case 'clear': {
          const result = await clearSearchHistory(context.telegramUserId);
          
          if (result.success) {
            logger?.info('✅ [SearchHistoryTool] History cleared', { 
              telegramUserId: context.telegramUserId,
              deletedCount: result.deletedCount
            });
            
            return {
              success: true,
              action: 'clear',
              message: `🗑️ تم مسح سجل البحث بنجاح!\n\nتم حذف ${result.deletedCount} عملية بحث.`,
              data: { deletedCount: result.deletedCount }
            };
          } else {
            return {
              success: false,
              action: 'clear',
              message: 'فشل في مسح سجل البحث',
              data: { deletedCount: 0 }
            };
          }
        }
        
        default:
          return {
            success: false,
            action: context.action,
            message: 'Invalid action'
          };
      }
    } catch (error) {
      logger?.error('❌ [SearchHistoryTool] Error:', error);
      return {
        success: false,
        action: context.action,
        message: 'حدث خطأ أثناء تنفيذ العملية',
        data: { error: String(error) }
      };
    }
  },
});
