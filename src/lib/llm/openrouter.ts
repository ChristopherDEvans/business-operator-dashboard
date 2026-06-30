import OpenAI from "openai";
import { LLMProvider, LLMResponse, LLMUsage } from "./provider.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";

export class OpenRouterProvider implements LLMProvider {
  name = "OpenRouter";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
      defaultHeaders: {
        "HTTP-Referer": "https://github.com/gravity-claw",
        "X-Title": "Gravity Claw",
      },
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
      model: params.model,
      messages: params.messages,
      tools: params.tools as any,
      max_tokens: params.maxTokens || 4096,
      temperature: params.temperature ?? 0.7,
    });

    const endTime = Date.now();
    const choice = response.choices[0];
    if (!choice) throw new Error("No response from OpenRouter");

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
