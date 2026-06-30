import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOUL_PATH = path.join(__dirname, "../soul.md");

/**
 * Tool to update the assistant's own soul (instructions and personality).
 */
export const update_soul = {
  definition: {
    type: 'function' as const,
    function: {
      name: 'update_soul',
      description: 'Update your own core instructions or personality rules. Use this when the user gives you a permanent behavioral instruction (e.g. "From now on, do X when Y happens").',
      parameters: {
        type: 'object',
        properties: {
          instruction: {
            type: 'string',
            description: 'The new behavioral rule or personality change to append to your soul.'
          }
        },
        required: ['instruction']
      }
    }
  },
  execute: async (args: { instruction: string }) => {
    try {
      let content = fs.readFileSync(SOUL_PATH, "utf-8");
      const sectionHeader = "## 📜 Personal Instructions";
      
      if (!content.includes(sectionHeader)) {
        content += `\n\n${sectionHeader}\n`;
      }

      // Append the new instruction
      const timestamp = new Date().toISOString().split("T")[0];
      const newEntry = `- [${timestamp}] ${args.instruction}\n`;
      
      if (!content.includes(args.instruction)) {
        content += newEntry;
        fs.writeFileSync(SOUL_PATH, content);
        return `Successfully evolved my soul. I have added this to my core instructions: "${args.instruction}". I will now strictly follow this.`;
      } else {
        return `That instruction is already part of my core essence. I am already following it!`;
      }
    } catch (err: any) {
      console.error("❌ Failed to update soul:", err.message);
      return `Error: I couldn't update my soul. Reason: ${err.message}`;
    }
  }
};
