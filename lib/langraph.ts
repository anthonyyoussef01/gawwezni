import {Message} from '@/types';
import {Document} from 'langchain/document';
import {MemoryVectorStore} from 'langchain/vectorstores/memory';
import {GoogleGenerativeAIEmbeddings} from '@langchain/google-genai';
import {RecursiveCharacterTextSplitter} from 'langchain/text_splitter';
import {RunnablePassthrough, RunnableSequence} from "@langchain/core/runnables";
import path from 'path';
import fs from 'fs';
import {parse} from 'csv-parse/sync';

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
  return parse(fileContent, {
    columns: (headers: string[]) => headers.map(h => h.trim()),
    trim: true,
    skip_empty_lines: true
  });
}

// Function to convert records to documents
function recordsToDocuments(records: any[], type: 'vendor' | 'venue'): Document[] {
  return records.map(record => {
    // Create a formatted string representation of the record
    let content: string = '';
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
  
  // Define semantic mappings for common wedding themes/types
  const semanticMappings: Record<string, string[]> = {
    'beach': ['beach', 'coastal', 'sea', 'shore', 'ocean', 'mediterranean', 'red sea', 'alexandria', 'hurghada', 'sharm el-sheikh', 'el gouna', 'dahab'],
    'luxury': ['luxury', 'luxurious', 'high-end', 'premium', 'exclusive', 'elegant', 'exclusive'],
    'traditional': ['traditional', 'cultural', 'egyptian', 'pharaonic', 'ancient'],
    'outdoor': ['outdoor', 'garden', 'nature', 'open-air', 'park', 'treehouse'],
    'indoor': ['indoor', 'hall', 'ballroom', 'hotel', 'venue'],
    'budget': ['budget', 'affordable', 'inexpensive', 'cheap', 'cost-effective', 'economical']
  };
  
  // Extract theme keywords from the query
  const themeKeywords: string[] = [];
  Object.entries(semanticMappings).forEach(([theme, relatedTerms]) => {
    if (relatedTerms.some(term => queryLower.includes(term))) {
      themeKeywords.push(theme);
      // Add all related terms to enhance matching
      themeKeywords.push(...relatedTerms);
    }
  });
  
  // If we identified themes, use them for filtering
  const searchTerms = themeKeywords.length > 0 ? themeKeywords : keywords;
  
  // Filter records based on the search terms
  const filteredRecords = records.filter(record => {
    // Convert all record values to a single string for searching
    const recordString = Object.values(record).join(' ').toLowerCase();
    
    // Check if any search term is present in the record
    return searchTerms.some(term => 
      term.length > 3 && recordString.includes(term)
    );
  });
  
  // If no matches found, return a subset of records that might be generally useful
  if (filteredRecords.length === 0) {
    // If query is about a specific venue, return top-rated venues
    if (queryLower.includes('venue')) {
      return records
       .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
       .slice(0, 5);
    }
    
    // For other cases, return top-rated vendors as a fallback
    return records
      .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
      .slice(0, 5);
  }
  
  return filteredRecords;
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
  
  // Create and return vector store
  return await MemoryVectorStore.fromDocuments(allDocs, embeddings);
}

// Create RAG chain with LangGraph
export async function createRagChain(messages: Message[]) {
  // Format the user query from the last user message
  const userQuery = messages.filter(m => m.role === 'user').pop()?.content || '';
  
  // Initialize vector store with relevant data based on the query
  const vectorStore = await initializeVectorStore(userQuery);
  
  // Retrieve relevant documents based on the query
  const retriever = vectorStore.asRetriever({
    k: 5, // Return top 5 most relevant documents
  });
  
  // Create and return context from retrieved documents
  return RunnableSequence.from([
    {original_input: new RunnablePassthrough()},
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
          content: `You are a wedding planning assistant specializing in Egyptian weddings. Use the following information to answer the user's question: ${context}
          
If the user is asking about a specific type of wedding and there's limited vendor information in the context, be creative and provide general recommendations based on Egyptian geography and wedding customs. Always mention specific locations in Egypt that would be suitable for the requested wedding type.`
        };

        const augmentedMessages = [contextMessage, ...messages];

        // This will be implemented in the main streaming function
        return {messages: augmentedMessages, context};
      }
    }
  ]);
}