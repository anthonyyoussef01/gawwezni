export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: Message[];
  model: 'groq' | 'gemini';
}

export interface Vendor {
  name: string;
  type: string;
  location: string;
  services: string[];
  pricing: string;
  contactInfo?: string;
  rating?: number;
  description?: string;
}

export interface Venue {
  name: string;
  location: string;
  capacity: number;
  amenities: string[];
  pricing: string;
  contactInfo: string;
  rating?: number;
  description?: string;
}

export interface RateLimitData {
  count: number;
  resetAt: number;
}