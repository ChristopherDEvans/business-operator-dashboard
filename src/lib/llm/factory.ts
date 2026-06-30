import { LLMProvider } from "./provider.js";
import { OpenRouterProvider } from "./openrouter.js";
import { AnthropicProvider } from "./anthropic.js";
import { GoogleProvider } from "./google.js";
import { GenericOpenAIProvider } from "./generic-openai.js";
import { config } from "../../config.js";

export class ProviderFactory {
  private static providers: Map<string, LLMProvider> = new Map();

  static getProvider(model: string): LLMProvider {
    // Only route to native SDKs if the provider-specific API key is set and seems valid.
    const hasKey = (key: string | undefined | null) => !!key && key.trim().length > 10 && key !== "null" && key !== "undefined";

    const stripPrefix = (m: string) => m.split('/').slice(1).join('/');

    if (model.startsWith("anthropic/") && hasKey(config.anthropicApiKey)) {
      console.log(`🤖 [Factory] Using native Anthropic provider for ${model}`);
      return this.getOrCreate("anthropic", () => new AnthropicProvider(config.anthropicApiKey));
    } else if (model.startsWith("google/") && hasKey(config.googleApiKey)) {
      console.log(`🤖 [Factory] Using native Google provider for ${model}`);
      return this.getOrCreate("google", () => new GoogleProvider(config.googleApiKey));
    } else if (model.startsWith("groq/") && hasKey(config.groqApiKey)) {
      console.log(`🤖 [Factory] Using native Groq provider for ${model}`);
      const nativeModel = stripPrefix(model);
      return {
        ...this.getOrCreate("groq", () => new GenericOpenAIProvider("Groq", "https://api.groq.com/openai/v1", config.groqApiKey)),
        complete: (p: any) => this.getOrCreate("groq", () => new GenericOpenAIProvider("Groq", "https://api.groq.com/openai/v1", config.groqApiKey))
          .complete({ ...p, model: nativeModel })
      } as any;
    } else if (model.startsWith("deepseek/") && hasKey(config.deepseekApiKey)) {
      console.log(`🤖 [Factory] Using native DeepSeek provider for ${model}`);
      const nativeModel = stripPrefix(model);
      return {
        ...this.getOrCreate("deepseek", () => new GenericOpenAIProvider("DeepSeek", "https://api.deepseek.com/v1", config.deepseekApiKey)),
        complete: (p: any) => this.getOrCreate("deepseek", () => new GenericOpenAIProvider("DeepSeek", "https://api.deepseek.com/v1", config.deepseekApiKey))
          .complete({ ...p, model: nativeModel })
      } as any;
    } else if (model.startsWith("local/")) {
      console.log(`🤖 [Factory] Using local provider for ${model}`);
      return this.getOrCreate("local", () => new GenericOpenAIProvider("Local", config.localLlmBaseUrl || "http://localhost:11434/v1", "ollama"));
    }

    // Default to OpenRouter (handles anthropic/, google/, etc. natively)
    console.log(`🤖 [Factory] Routing ${model} to OpenRouter`);
    return this.getOrCreate("openrouter", () => new OpenRouterProvider(config.openRouterApiKey));
  }

  private static getOrCreate(key: string, creator: () => LLMProvider): LLMProvider {
    if (!this.providers.has(key)) {
      this.providers.set(key, creator());
    }
    return this.providers.get(key)!;
  }
}
