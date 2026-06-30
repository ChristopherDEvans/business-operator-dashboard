import { z } from "zod";
import { config } from "../config.js";

export const clickupCreateTaskTool = {
  name: "clickup_create_task",
  description: "Create a new task in the user's ClickUp Inbox/Triage list. Use this whenever you are asked to do something, or whenever you want to track a side effect or action you've taken.",
  parameters: z.object({
    name: z.string().describe("The name or title of the task"),
    description: z.string().describe("Detailed description of what needs to be done"),
    listId: z.string().optional().describe("Optional: The ClickUp List ID (e.g. 901522846691 for Client Projects)."),
    status: z.enum(["to do", "in progress", "complete"]).optional().describe("Task status (default: to do)"),
    priority: z.number().optional().describe("Priority (1=Urgent, 2=High, 3=Normal, 4=Low)")
  }),
  execute: async (args: { name: string, description: string, listId?: string, status?: string, priority?: number }) => {
    const targetList = args.listId || config.clickupListId;
    if (!config.clickupApiKey || !targetList) {
      return "Error: ClickUp API Key or List ID is missing from configuration.";
    }

    const payload: any = {
      name: args.name,
      description: args.description,
      status: args.status || "to do"
    };
    if (args.priority) payload.priority = args.priority;

    try {
      const res = await fetch(`https://api.clickup.com/api/v2/list/${targetList}/task`, {
        method: 'POST',
        headers: {
          'Authorization': config.clickupApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) {
        return `Failed to create ClickUp task: ${JSON.stringify(data)}`;
      }
      return `Successfully created ClickUp task: ID ${data.id}, url: ${data.url}`;
    } catch (e: any) {
      return `Error creating task: ${e.message}`;
    }
  }
};
