import OpenAI from "openai";
import { LLMProvider, LLMResponse, LLMUsage } from "./provider.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";

export class GenericOpenAIProvider implements LLMProvider {
  name: string;
  private client: OpenAI;

  constructor(name: string, baseURL: string, apiKey: string) {
    this.name = name;
    this.client = new OpenAI({
      baseURL,
      apiKey,
    });
  }

  async complete(params: {
    model: string;
    messages: ChatCompletionMessageParam[];
    tools?: any[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<LLMResponse> {
    const startTime = Date.now();
    const response = await this.client.chat.completions.create({
      model: params.model.replace(/^(groq|deepseek|openai|local)\//, ""),
      messages: params.messages,
      tools: params.tools as any,
      max_tokens: params.maxTokens || 4096,
      temperature: params.temperature ?? 0.7,
    });

    const endTime = Date.now();
    const choice = response.choices[0];
    if (!choice) throw new Error(`No response from ${this.name}`);

    const usage: LLMUsage = {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    };

    return {
      text: choice.message.content || "",
      toolCalls: choice.message.tool_calls,
      usage,
      latencyMs: endTime - startTime,
    };
  }
}
