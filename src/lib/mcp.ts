import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import * as fs from "fs";
import * as path from "path";

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
  serverUrl?: string; // For SSE connections
  headers?: Record<string, string>;
  disabledTools?: string[];
}

export interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}

export class MultiMcpClient {
  private clients: Map<string, Client> = new Map();
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  async initialize() {
    if (!fs.existsSync(this.configPath)) {
      console.error(`❌ MCP Config not found: ${this.configPath}`);
      return;
    }

    const config: McpConfig = JSON.parse(fs.readFileSync(this.configPath, "utf-8"));
    console.log(`🔍 [DEBUG] Loaded MCP Config from ${this.configPath}:`, JSON.stringify(config, null, 2));
    
    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      if (serverConfig.disabled) continue;

      try {
        console.log(`🔌 Connecting to MCP server: ${name}...`);
        
        let transport;

        if (serverConfig.serverUrl) {
          console.log(`🔌 Connecting to MCP SSE server: ${name} at ${serverConfig.serverUrl}...`);
          
          const connectSse = async () => {
            console.log(`🔌 Attempting background SSE connection to ${name}...`);
            const timeout = setTimeout(() => {
              console.warn(`⏳ Connection to ${name} timed out after 30s. Still trying in background...`);
            }, 30000);

            try {
              const transport = new SSEClientTransport(new URL(serverConfig.serverUrl!), {
                eventSourceInit: {
                  headers: serverConfig.headers || {},
                } as any,
              });

              const client = new Client(
                { name: "gravity-claw-client", version: "1.0.0" },
                { capabilities: {} }
              );

              await client.connect(transport);
              clearTimeout(timeout);
              this.clients.set(name, client);
              console.log(`✅ Connected to ${name} (SSE)`);

              // Handle disconnection
              transport.onclose = () => {
                console.warn(`⚠️ MCP SSE connection to ${name} closed. Retrying in 10s...`);
                this.clients.delete(name);
                setTimeout(connectSse, 10000);
              };
              transport.onerror = (err) => {
                console.error(`❌ MCP SSE error for ${name}:`, err);
                transport.close();
              };
            } catch (err: any) {
              clearTimeout(timeout);
              console.error(`❌ MCP SSE connection failed for ${name}: ${err.message}. Retrying in 15s...`);
              setTimeout(connectSse, 15000);
            }
          };

          connectSse(); // Don't await, let it happen in background
          continue;
        } else {
          // Safeguard: Skip absolute Windows paths on non-Windows platforms (e.g. Railway)
          const isWindowsPath = serverConfig.command.includes("\\") || 
                               (serverConfig.command.length > 1 && serverConfig.command[1] === ':');
          
          if (process.platform !== "win32" && isWindowsPath) {
            console.warn(`⚠️ Skipping server "${name}": Absolute Windows path detected on ${process.platform}.`);
            continue;
          }

          // Use npx.cmd on Windows for better compatibility
          const command = (serverConfig.command === "npx" && process.platform === "win32") 
            ? "npx.cmd" 
            : serverConfig.command;

          const transport = new StdioClientTransport({
            command: command,
            args: serverConfig.args || [],
            env: { ...process.env, ...(serverConfig.env || {}) } as any,
          });

          const client = new Client(
            { name: "gravity-claw-client", version: "1.0.0" },
            { capabilities: {} }
          );

          // Use a timeout for connection to prevent hanging
          const connectPromise = client.connect(transport);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Connection timeout")), 30000)
          );

          await Promise.race([connectPromise, timeoutPromise]);
          this.clients.set(name, client);
          console.log(`✅ Connected to ${name} (Stdio)`);
        }
        
      } catch (error: any) {
        console.error(`❌ Failed to connect to MCP server ${name}: ${error.message}`);
        if (error.stack) console.error(error.stack);
        // Continue to next server instead of stopping initialization
      }
    }
  }

  async getAllTools() {
    const allTools: any[] = [];
    for (const [serverName, client] of this.clients.entries()) {
      try {
        const result = await client.listTools();
        const serverConfig = this.getServerConfig(serverName);
        const disabledTools = serverConfig?.disabledTools || [];

        // Prefix tool names with server name to avoid collisions
        const prefixedTools = result.tools
          .filter(tool => !disabledTools.includes(tool.name))
          .map(tool => ({
            ...tool,
            name: `${serverName}_${tool.name}`,
            originalName: tool.name,
            serverName
          }));
        allTools.push(...prefixedTools);
      } catch (error) {
        console.error(`❌ Failed to list tools for ${serverName}:`, error);
      }
    }
    return allTools.slice(0, 40);
  }

  async callTool(prefixedName: string, args: any) {
    for (const [serverName, client] of this.clients.entries()) {
      if (prefixedName.startsWith(`${serverName}_`)) {
        const originalName = prefixedName.replace(`${serverName}_`, "");
        return await client.callTool({
          name: originalName,
          arguments: args
        });
      }
    }
    throw new Error(`Tool ${prefixedName} not found in any connected MCP server.`);
  }

  private getServerConfig(name: string): McpServerConfig | undefined {
    try {
      if (!fs.existsSync(this.configPath)) return undefined;
      const config: McpConfig = JSON.parse(fs.readFileSync(this.configPath, "utf-8"));
      return config.mcpServers[name];
    } catch {
      return undefined;
    }
  }

  async shutdown() {
    for (const client of this.clients.values()) {
      // Cleanup logic if needed
    }
    this.clients.clear();
  }
}
