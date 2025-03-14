import { NextRequest } from 'next/server';
import { ChatRequest, RateLimitData } from '@/types';
import { streamChatResponse } from '@/lib/stream-utils';

export const dynamic = 'force-dynamic';

// Rate limiting map
const rateLimitMap = new Map<string, RateLimitData>();

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
    
    // Rate limiting logic
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const currentTime = Date.now();
    let rateData = rateLimitMap.get(ip) || { count: 0, resetAt: currentTime + 604800000 }; // 7 days

    if (currentTime > rateData.resetAt) {
      rateData = { count: 0, resetAt: currentTime + 604800000 };
    }

    if (rateData.count >= 7) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        reset: rateData.resetAt 
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '7',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateData.resetAt.toString()
        }
      });
    }

    rateData.count++;
    rateLimitMap.set(ip, rateData);

    // Prepare rate limit headers
    const rateHeaders = {
      'X-RateLimit-Limit': '7',
      'X-RateLimit-Remaining': (7 - rateData.count).toString(),
      'X-RateLimit-Reset': rateData.resetAt.toString()
    };

    return new Response(stream as unknown as ReadableStream, {
      headers: {
        ...rateHeaders,
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
