import Anthropic from "@anthropic-ai/sdk";
import { LLMProvider, LLMResponse, LLMUsage } from "./provider.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";

export class AnthropicProvider implements LLMProvider {
  name = "Anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey: apiKey,
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

    // Convert messages for Anthropic
    const system = params.messages.find(m => m.role === "system")?.content as string || "";
    const messages = params.messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "user" ? "user" as const : "assistant" as const,
        content: m.content as string,
      }));

    // Multi-turn tool use conversion is omitted for brevity, focusing on base functionality
    // Anthropic's tool integration is more complex and would require more robust mapping.
    
    const response = await this.client.messages.create({
      model: params.model.replace("anthropic/", ""),
      system,
      messages,
      max_tokens: params.maxTokens || 4096,
      temperature: params.temperature ?? 0.7,
      // tools: params.tools as any, // Needs mapping
    });

    const endTime = Date.now();
    const usage: LLMUsage = {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    };

    return {
      text: response.content[0].type === "text" ? response.content[0].text : "",
      usage,
      latencyMs: endTime - startTime,
    };
  }
}
