import { Message } from '@/types';
import { createRagChain } from './langraph';
import { generateGroqStream, generateGeminiStream } from './ai-services';
import { ReadableStream, TransformStream } from 'stream/web';

export async function streamChatResponse(messages: Message[], model: 'groq' | 'gemini') {
  // Create a TransformStream for text encoding
  const { writable, readable } = new TransformStream();
  const writer = writable.getWriter();
  
  // Process the request asynchronously
  (async () => {
    try {
      // Apply RAG to enrich messages with context
      const ragChain = await createRagChain(messages, model);
      const result = await ragChain.invoke(messages[messages.length - 1].content);
      
      const augmentedMessages = result.final_result.messages;
      
      // Choose AI model based on user preference
      const apiKey = model === 'groq' 
        ? process.env.GROQ_API_KEY 
        : process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error(`API key for ${model} is not configured`);
      }
      
      // Generate stream based on selected model
      const generator = model === 'groq'
        ? generateGroqStream(augmentedMessages, apiKey)
        : generateGeminiStream(augmentedMessages, apiKey);
      
      // Stream the response
      for await (const chunk of generator) {
        const data = `data: ${JSON.stringify({ text: chunk })}\n\n`;
        await writer.write(new TextEncoder().encode(data));
      }
      
      // Send [DONE] to indicate the stream is complete
      await writer.write(new TextEncoder().encode('data: [DONE]\n\n'));
    } catch (error) {
      console.error('Streaming error:', error);
      const errorMessage = `data: ${JSON.stringify({ error: 'An error occurred during streaming' })}\n\n`;
      await writer.write(new TextEncoder().encode(errorMessage));
    } finally {
      await writer.close();
    }
  })();
  
  return readable;
}
