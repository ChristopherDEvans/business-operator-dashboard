---
name: competitor-website-analysis
description: Analyzes a client's existing website and generates a surgical breakdown of its weaknesses, accompanied by a targeted proposal detailing how EvansAiSolutions' CodeGrid-style designs will elevate their brand. 
---

# Competitor Website Analysis

## When to use this skill
- You are provided with a lead's business URL and need to figure out how to pitch them.
- You are tasked with analyzing a competitor or local business website to find flaws.
- You need to generate an outreach proposal that sells the "EvansAiSolutions" approach (premium CodeGrid templates, GSAP animations, cinematic design).

## Workflow

### 1. Ingestion
- Use the `read_url_content` tool to fetch the raw text/HTML structure of the target URL.
- Note any missing elements standard in modern design (e.g., missing `<nav>`, missing clear Call-to-Actions (CTAs), no semantic `<header>`, low word count, outdated patterns).

### 2. Diagnosis (The Flaw Extraction)
Identify 2-3 specific, honest weaknesses in the current site. Focus on:
- **Aesthetic Stagnation:** Does it look like it was built 10 years ago? Are the colors generic?
- **Conversion Friction:** Is it hard to figure out how to book or call them immediately?
- **Lack of Dynamism:** Is it static? Are there zero micro-animations or scroll reveals?

### 3. The CodeGrid Vision (The Cure)
Map the weaknesses to the premium CodeGrid solutions you offer.
- Mention switching from bulky legacy builders (like WordPress/Wix) to lightning-fast **React/Vite**.
- Pitch the addition of **GSAP Animations** (e.g., cinematic curtain-reveals, smooth-scrolling bento boxes, dynamic hover states).
- Pitch dark mode aesthetics or glassmorphism to look like a high-end, premium brand.

### 4. Output Generation 
Generate an artifact named `[BusinessName]_Outreach_Proposal.md`. 
The artifact must contain:
1. **The Hook:** A respectful opener acknowledging their business size/reputation.
2. **The Audit:** The 2-3 identified weaknesses phrased as "missed opportunities for conversion".
3. **The Evans Vision:** How a modern CodeGrid-based Vite app resolves these issues, giving them an enterprise-grade feel.
4. **The Free Pitch:** The closing offer explaining you have already started stamping a free, 80%-finished version of their new site for them to view.

## Instructions
- Be respectful but absolute. Do not insult the current site directly, frame it as "losing potential revenue" or "not reflecting the quality of their actual service".
- Always use the `write_to_file` tool to save the proposal in the current workspace or `artifacts/` folder so it can be easily copied to an email campaign.
- If you cannot fetch the URL, gracefully fall back to asking the user for a snapshot or summary of the site.
