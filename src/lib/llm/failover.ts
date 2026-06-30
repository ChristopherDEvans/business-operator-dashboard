import { LLMProvider, LLMResponse } from "./provider.js";
import { ProviderFactory } from "./factory.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import { config } from "../../config.js";

export class FailoverProvider implements LLMProvider {
  name = "Failover";

  constructor(private primaryProvider: LLMProvider) {}

  async complete(params: {
    model: string;
    messages: ChatCompletionMessageParam[];
    tools?: any[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<LLMResponse> {
    const modelsToTry = [params.model, ...config.llmFailoverPriority.filter(m => m !== params.model)];
    let lastError: any = null;

    for (const modelId of modelsToTry) {
      try {
        console.log(`📡 [Failover] Attempting completion with model: ${modelId}`);
        const provider = modelId === params.model ? this.primaryProvider : ProviderFactory.getProvider(modelId);
        
        return await provider.complete({
          ...params,
          model: modelId,
        });
      } catch (error: any) {
        console.warn(`⚠️ [Failover] Model ${modelId} failed: ${error.message}`);
        lastError = error;
        
        // Only failover on certain errors (e.g., rate limits, timeouts, server errors)
        // For simplicity, we'll failover on any error for now
        continue;
      }
    }

    throw new Error(`All models failed. Last error: ${lastError?.message}`);
  }
}
