import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMProvider, LLMResponse, LLMUsage } from "./provider.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";

export class GoogleProvider implements LLMProvider {
  name = "Google (Gemini)";
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async complete(params: {
    model: string;
    messages: ChatCompletionMessageParam[];
    tools?: any[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<LLMResponse> {
    const startTime = Date.now();
    const model = this.genAI.getGenerativeModel({ model: params.model.replace("google/", "") });

    // Simple message mapping
    const history = params.messages.slice(0, -1).map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content as string }],
    }));
    
    const lastMessage = params.messages[params.messages.length - 1].content as string;
    
    // Tools mapping would go here
    const chat = model.startChat({
        history: history as any,
        generationConfig: {
            maxOutputTokens: params.maxTokens || 4096,
            temperature: params.temperature ?? 0.7,
        },
    });

    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    const text = response.text();

    const endTime = Date.now();
    const usage: LLMUsage = {
      promptTokens: response.usageMetadata?.promptTokenCount || 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata?.totalTokenCount || 0,
    };

    return {
      text,
      usage,
      latencyMs: endTime - startTime,
    };
  }
}
