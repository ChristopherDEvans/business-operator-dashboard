# Brand Identity: Nebula Dark

## Overview
**Brand Name:** EvansAiSolutions
**Founder:** Chris Evans
**Email:** chris@evansaisolutions.com
**Theme:** Ethereal Glassmorphism (Awwwards-Tier)
**Mood:** Cutting-edge, Futuristic, Premium, AI-Driven

## 1. Color & Theme (The Palette)
The Nebula Dark palette is rooted in deep space and glowing neon accents, representing the cutting-edge nature of AI technology.

| Color Type | Name | Hex Code | Usage |
| :--- | :--- | :--- | :--- |
| **Primary Background** | OLED Black | `#050505` | Main background color. Pure black for infinite depth and OLED efficiency. |
| **Secondary Background** | Vantablack Card | `#0A0A0A` | Used for cards and elevated surfaces. |
| **Primary Accent/CTA** | Electric Blue | `#00D4FF` | Primary buttons, active states, and glowing accents. |
| **Secondary Accent** | Neon Violet | `#6C63FF` | Used in gradients alongside Electric Blue (e.g., `#6C63FF` to `#00D4FF`). |
| **Primary Text** | Pure White | `#FFFFFF` | Headings and high-contrast text. |
| **Secondary Text** | Muted Steel | `#8892B0` | Body text, captions, and secondary information. |
| **Hairline Borders** | Glass White | `#FFFFFF1A` | 10% opacity white for ultra-thin borders on glassmorphic cards. |

## 2. Typography (The Voice)
The typography is wide, geometric, and unapologetically modern.

| Element | Font Family | Weight | Style Notes |
| :--- | :--- | :--- | :--- |
| **Headings (H1, H2)** | `Geist` or `Clash Display` | 600 (Semi-Bold) | Wide geometric Grotesk. High impact, tight line-height. |
| **Body Text** | `Geist` or `Inter` (Fallback) | 400 (Regular) | Clean, legible, airy line-height (1.6+). |
| **Eyebrow Tags** | `Geist Mono` | 500 (Medium) | Tiny (10px), uppercase, wide tracking (0.2em letter-spacing). |
| **Buttons/CTA** | `Geist` | 500 (Medium) | Clean, centered, easily readable. |

## 3. Style & Aesthetic (The Skin)
The visual language relies heavily on haptic depth and the "Double-Bezel" nested architecture.

*   **Card Architecture:** Cards are not flat. They use a "Double-Bezel" nested enclosure. The outer shell has a hairline border (`1px solid #FFFFFF1A`), `1.5rem` padding, and a large outer radius (`border-radius: 2rem`). The inner core has its own distinct background (`#0A0A0A`), an inner highlight (`box-shadow: inset 0 1px 1px rgba(255,255,255,0.1)`), and a smaller radius (`border-radius: 1.5rem`).
*   **Shadows:** No harsh drop shadows. We use heavy `backdrop-blur-2xl` on floating elements and subtle radial mesh gradients (glowing purple/blue orbs) placed behind cards to create ambient light.
*   **Buttons:** Fully rounded pills (`border-radius: 9999px`). Primary CTAs feature the Electric Blue to Neon Violet gradient. If an arrow icon is used, it sits inside its own distinct circular wrapper (`bg-white/10`) flush with the button's right padding.
*   **Whitespace:** Massive macro-whitespace. Sections use massive vertical padding (`py-24` to `py-40`) to let the layout breathe.

## 4. Animations & Interactions (The Soul)
Motion is fluid, physics-based, and cinematic.

*   **Transitions:** All state changes use custom cubic-beziers simulating real-world mass (e.g., `transition: all 700ms cubic-bezier(0.32, 0.72, 0, 1)`). Never use standard `linear` or `ease-in-out`.
*   **Hover Physics:** Magnetic button hovers. On hover, the entire button scales down slightly (`scale: 0.98`) to simulate a physical press. Nested icons translate diagonally (`translate-x: 2px, translate-y: -1px`) to create internal kinetic tension.
*   **Scroll Interpolation:** Elements never appear statically. As they enter the viewport, they execute a gentle, heavy fade-up (`translate-y: 4rem, blur: 8px, opacity: 0` resolving to `translate-y: 0, blur: 0, opacity: 1` over 800ms+).

## 5. Assets
*   **Logo:** `/assets/logo.png`
*   **Favicon:** `/assets/favicon.png`
*   **Founder Photo:** `meoffice.jpg` (Can be used for 'About' sections, styled with a grayscale filter and a subtle blue-violet duotone overlay on hover)