import { Message, Vendor, Venue } from '@/types';
import { Document } from 'langchain/document';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { 
  RunnableSequence, 
  RunnablePassthrough
} from "@langchain/core/runnables";
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

// Setup vector store with embeddings
const geminiEmbeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
});
// const openaiEmbeddings = new OpenAIEmbeddings({
//   openAIApiKey: process.env.OPENAI_API_KEY, // You can use a free tier key
// });
const embeddings = geminiEmbeddings;

// Function to load and parse CSV data
export async function loadAndParseCSV(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true
  });
  return records;
}

// Function to convert records to documents
function recordsToDocuments(records: any[], type: 'vendor' | 'venue'): Document[] {
  return records.map(record => {
    // Create a formatted string representation of the record
    let content = '';
    if (type === 'vendor') {
      content = `Vendor: ${record.name || 'N/A'}\n` +
                `Type: ${record.type || 'N/A'}\n` +
                `Location: ${record.location || 'N/A'}\n` +
                `Services: ${record.services || 'N/A'}\n` +
                `Pricing: ${record.pricing || 'N/A'}\n` +
                `Contact: ${record.contactInfo || 'N/A'}\n` +
                `Rating: ${record.rating || 'N/A'}\n` +
                `Description: ${record.description || 'N/A'}`;
    } else {
      content = `Venue: ${record.name || 'N/A'}\n` +
                `Location: ${record.location || 'N/A'}\n` +
                `Capacity: ${record.capacity || 'N/A'}\n` +
                `Amenities: ${record.amenities || 'N/A'}\n` +
                `Pricing: ${record.pricing || 'N/A'}\n` +
                `Contact: ${record.contactInfo || 'N/A'}\n` +
                `Description: ${record.description || 'N/A'}`;
    }
    
    return new Document({
      pageContent: content,
      metadata: { 
        source: type,
        id: record.id || record.name,
        ...record
      }
    });
  });
}

// Filter records based on relevance to query
function filterRelevantRecords(records: any[], query: string): any[] {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/);
  
  return records.filter(record => {
    // Convert all record values to a single string for searching
    const recordString = Object.values(record).join(' ').toLowerCase();
    
    // Check if any keyword is present in the record
    return keywords.some(keyword => 
      keyword.length > 3 && recordString.includes(keyword)
    );
  });
}

// Initialize vector store with our wedding data
export async function initializeVectorStore(userQuery: string) {
  // Load vendor data from CSV
  const vendorCsvPath = path.join(process.cwd(), 'data', 'egypt_wedding_vendors.csv');
  const vendorRecords = await loadAndParseCSV(vendorCsvPath);
  
  // Load venue data from CSV
  const venueCsvPath = path.join(process.cwd(), 'data', 'egypt_wedding_venues.csv');
  const venueRecords = await loadAndParseCSV(venueCsvPath);
  
  // Filter records based on relevance to the query
  const relevantVendors = filterRelevantRecords(vendorRecords, userQuery);
  const relevantVenues = filterRelevantRecords(venueRecords, userQuery);
  
  // Convert to documents
  const vendorDocs = recordsToDocuments(relevantVendors, 'vendor');
  const venueDocs = recordsToDocuments(relevantVenues, 'venue');
  
  // Load additional wedding information
  const weddingInfoPath = path.join(process.cwd(), 'data', 'egypt_wedding_info.txt');
  const weddingInfoText = fs.readFileSync(weddingInfoPath, 'utf-8');
  
  // Split text into chunks
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  
  const weddingInfoDocs = await textSplitter.createDocuments([weddingInfoText]);
  
  // Combine all docs
  const allDocs = [...vendorDocs, ...venueDocs, ...weddingInfoDocs];
  
  // Create vector store
  const vectorStore = await MemoryVectorStore.fromDocuments(allDocs, embeddings);
  
  return vectorStore;
}

// Create RAG chain with LangGraph
export async function createRagChain(messages: Message[], modelType: 'groq' | 'gemini') {
  // Format the user query from the last user message
  const userQuery = messages.filter(m => m.role === 'user').pop()?.content || '';
  
  // Initialize vector store with relevant data based on the query
  const vectorStore = await initializeVectorStore(userQuery);
  
  // Retrieve relevant documents based on the query
  const retriever = vectorStore.asRetriever({
    k: 5, // Return top 5 most relevant documents
  });
  
  // Create context from retrieved documents
  const retrievalChain = RunnableSequence.from([
    { original_input: new RunnablePassthrough() },
    {
      retrieved_documents: async (input: any) => {
        const docs = await retriever.getRelevantDocuments(input.original_input);
        return docs.map(doc => doc.pageContent).join('\n\n');
      }
    },
    {
      final_result: async (input: any) => {
        const context = input.retrieved_documents;
        
        // Add context to the messages
        const contextMessage: Message = {
          role: 'system',
          content: `You are a wedding planning assistant specializing in Egyptian weddings. Use the following information to answer the user's question: ${context}`
        };
        
        const augmentedMessages = [contextMessage, ...messages];
        
        // This will be implemented in the main streaming function
        return { messages: augmentedMessages, context };
      }
    }
  ]);
  
  return retrievalChain;
}