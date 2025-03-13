import { NextRequest } from 'next/server';
import { ChatRequest } from '@/types';
import { streamChatResponse } from '@/lib/stream-utils';

export const dynamic = 'force-dynamic';

// API route handler for chat requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequest;
    const { messages, model } = body;
    
    // Validate request data
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid messages format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (!model || !['groq', 'gemini'].includes(model)) {
      return new Response(JSON.stringify({ error: 'Invalid model specified' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Get API keys from environment variables
    const groqApiKey = process.env.GROQ_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!groqApiKey && model === 'groq') {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY is not defined in environment variables' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (!geminiApiKey && model === 'gemini') {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not defined in environment variables' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Process the chat request and stream the response using the RAG-enhanced stream utility
    const stream = await streamChatResponse(messages, model);
    
    return new Response(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
