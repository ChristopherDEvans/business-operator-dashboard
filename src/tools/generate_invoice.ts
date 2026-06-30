import { operations } from "../domains/operations/index.js";

export const generate_invoice = {
  definition: {
    type: "function" as const,
    function: {
      name: "generate_invoice",
      description: "Generate a professional HTML invoice for a customer in GBP (£). Automatically researches the company address if not provided.",
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string", description: "Name of the customer or company." },
          customerAddress: { type: "string", description: "Optional customer address. If missing, I will research it." },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                quantity: { type: "number" },
                price: { type: "number" }
              },
              required: ["description", "quantity", "price"]
            }
          },
          invoiceNumber: { type: "string", description: "Optional invoice number" },
          notes: { type: "string", description: "Optional notes or banking information" }
        },
        required: ["customerName", "items"]
      }
    }
  },
  execute: async (args: {
    customerName: string;
    customerAddress?: string;
    items: any[];
    invoiceNumber?: string;
    notes?: string;
  }) => {
    // Delegate to Operations domain
    return await operations.generateInvoice(args);
  }
};
