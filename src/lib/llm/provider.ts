import { ChatCompletionMessageParam, ChatCompletionChunk } from "openai/resources/chat/completions.js";

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number; // Estimated cost in USD
}

export interface LLMResponse {
  text: string;
  toolCalls?: any[];
  usage: LLMUsage;
  latencyMs: number;
}

export interface LLMProvider {
  name: string;
  complete(params: {
    model: string;
    messages: ChatCompletionMessageParam[];
    tools?: any[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<LLMResponse>;
}
