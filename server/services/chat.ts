export interface ChatResponse {
  id: string;
  message: string;
  tokens: number;
}

export async function generateChatResponse(
  documentContent: string,
  userMessage: string
): Promise<ChatResponse> {
  console.log(`Generating chat response for: ${userMessage}`);
  
  return {
    id: `msg-${Date.now()}`,
    message: `Response to: ${userMessage}`,
    tokens: 100,
  };
}

export function validateChatMessage(message: string): boolean {
  return message && message.trim().length > 0 && message.length <= 5000;
}
