---
name: Perfect Invoice
description: Generate premium, branded invoices for EvansAiSolutions with automatic address research.
---
# Perfect Invoice Skill

Use this skill to create high-end, branded invoices for clients of **EvansAiSolutions**. This skill leverages the `generate_invoice` tool and follows the **Nebula Dark** brand identity.

## 🚀 Workflow

### 1. Information Gathering
- Identify the **Customer Name**.
- Collate the **Line Items** (Description, Quantity, Price).
- Check if a specific **Invoice Number** or **Notes/Banking Info** are required.

### 2. Physical Address Research
- If the customer's address is not provided, you **MUST** let the `generate_invoice` tool perform automatic research via the Apify actor.
- Do not make up addresses; allow the tool to fetch real corporate data.

### 3. Branded Generation
- Call the `generate_invoice` tool.
- **Branding Requirements** (Already baked into the tool):
    - **Color Palette**: OLED Black background (`#050505`), Electric Blue to Neon Violet gradients.
    - **Logo**: Uses `/branding/logo.png`.
    - **Founder Identification**: Chris Evans, Founder of EvansAiSolutions.
    - **Contact Info**: `chris@evansaisolutions.com`.
    - **Footer**: Professional payment terms (14-day net) and business contact details.

### 4. Verification & Delivery
- Confirm the invoice was saved to the `mission-control/public/invoices/` directory.
- Provide the user with the direct URL (e.g., `http://localhost:3000/invoices/INV-xxx.html`).

## 🎨 Design Philosophy
- **Glassmorphism**: 2rem border radius, semi-transparent backgrounds, and `backdrop-filter: blur`.
- **Micro-Animations**: Nebula glow effects (radial gradients) in the background.
- **Premium Feel**: Heavy macro-whitespace and geometric typography (`Plus Jakarta Sans`).

---
> [!TIP]
> Always ask the user if they want to add custom "Payment Instructions" or "Banking Info" to the `notes` field to make it truly useful.
