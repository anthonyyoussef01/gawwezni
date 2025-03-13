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

// Setup vector store with embeddings
const geminiEmbeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
});
// const openaiEmbeddings = new OpenAIEmbeddings({
//   openAIApiKey: process.env.OPENAI_API_KEY, // You can use a free tier key
// });
const embeddings = geminiEmbeddings;

// Function to load CSV data
export async function loadVendorsFromCSV(filePath: string) {
  const loader = new CSVLoader(filePath);
  const docs = await loader.load();
  return docs;
}

// Initialize vector store with our wedding data
export async function initializeVectorStore() {
  // Load vendor data from CSV
  const vendorCsvPath = path.join(process.cwd(), 'data', 'egypt_wedding_vendors.csv');
  const vendorDocs = await loadVendorsFromCSV(vendorCsvPath);
  
  // Load venue data from CSV
  const venueCsvPath = path.join(process.cwd(), 'data', 'egypt_wedding_venues.csv');
  const venueDocs = await loadVendorsFromCSV(venueCsvPath);
  
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
  const vectorStore = await initializeVectorStore();
  
  // Format the user query from the last user message
  const userQuery = messages.filter(m => m.role === 'user').pop()?.content || '';
  
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