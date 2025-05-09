import OpenAI from "openai";
import { type ChatCompletionMessageParam } from "openai/resources";
import { Message } from "@shared/schema";

// Function to get API key from request headers
export const getOpenAIInstance = (apiKey: string) => {
  if (!apiKey) {
    throw new Error("OpenAI API key is required");
  }
  
  return new OpenAI({ apiKey });
};

// Helper function to convert our Message type to OpenAI's ChatCompletionMessageParam
const convertToOpenAIMessage = (message: Message): ChatCompletionMessageParam => {
  return {
    role: message.role as "user" | "assistant" | "system",
    content: message.content
  };
};

// Function to send chat message to OpenAI
export async function sendChatMessage(
  message: string,
  conversationHistory: Message[],
  apiKey?: string
): Promise<{ assistant: string; summary?: string }> {
  try {
    // Use API key provided by user, or fall back to environment variable
    const key = apiKey || process.env.OPENAI_API_KEY || "";
    const openai = getOpenAIInstance(key);

    // Format conversation history for OpenAI
    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content: "You are a helpful, friendly AI assistant."
    };
    
    const historyMessages: ChatCompletionMessageParam[] = 
      conversationHistory.map(msg => convertToOpenAIMessage(msg));
    
    const userMessage: ChatCompletionMessageParam = {
      role: "user",
      content: message
    };
    
    const messages: ChatCompletionMessageParam[] = [
      systemMessage,
      ...historyMessages,
      userMessage
    ];

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      model: "gpt-4o",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Return assistant's response
    return {
      assistant: response.choices[0].message.content || "I'm sorry, I couldn't generate a response."
    };
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw new Error(`Failed to get response from OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to summarize conversation
export async function summarizeConversation(
  messages: Message[],
  apiKey?: string
): Promise<string> {
  try {
    // Use API key provided by user, or fall back to environment variable
    const key = apiKey || process.env.OPENAI_API_KEY || "";
    const openai = getOpenAIInstance(key);

    // Create a prompt for summarization
    const promptContent = `
      Please provide a concise summary of the following conversation between a user and an AI assistant.
      Focus on the main topics discussed, key questions asked, and important information provided.
      Format the summary with appropriate HTML tags like <h3>, <p>, <ul>, <li>, and <strong> for better readability.
    `;
    
    const systemMessage: ChatCompletionMessageParam = {
      role: "system", 
      content: promptContent
    };
    
    const conversationMessages: ChatCompletionMessageParam[] = 
      messages.map(msg => convertToOpenAIMessage(msg));
    
    const allMessages: ChatCompletionMessageParam[] = [
      systemMessage,
      ...conversationMessages
    ];

    // Call OpenAI API for summarization
    const response = await openai.chat.completions.create({
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      model: "gpt-4o",
      messages: allMessages,
      temperature: 0.5,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || "No summary available.";
  } catch (error) {
    console.error("Error summarizing conversation:", error);
    throw new Error(`Failed to summarize conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
