---
name: methabau-branding
description: Applies METHABAU's official brand colors, typography, and visual language to applications, artifacts, and designs that require the Methabau 'look and feel'. Use it when setting up UI components, adjusting styles, formatting documents, or ensuring corporate design consistency for Methabau products.
license: Internal Use METHABAU
---

# METHABAU Brand Styling

## Overview

To access METHABAU's official brand identity and style resources, use this skill. This incorporates the "Metha Desk pro" look-and-feel found across their digital products and corporate site.

**Keywords**: branding, corporate identity, visual identity, post-processing, styling, brand colors, typography, METHABAU brand, visual formatting, visual design, Metha Desk pro

## Brand Guidelines

### Colors

**Primary Brand Color:**

- **METHABAU Orange**: `#ff6b35` - The core corporate color. Used for primary actions, active states, accents, borders, and main branding elements (like the METHABAU logo).

**Backgrounds & Surface Colors (Light Mode):**

- **Base Background**: `#ffffff` (Pure White) - Used for app backgrounds to maximize contrast.
- **Card Background**: `#ffffff` (Pure White)
- **Muted Elements**: `#f8fafc` (Slate 50)
- **Subtle Borders**: `#e2e8f0` (Slate 200)

**Typography Colors (Light Mode):**

- **Primary Text**: `#334155` (Slate 700)
- **Standard Text**: `#475569` (Slate 600)
- **Secondary/Muted Text**: `#64748b` (Slate 500) / `#94a3b8` (Slate 400)

**Dark Mode Guidelines:**

- **Background**: `#020617` (Slate 950) - **Do not use pure black (`#000000`).**
- **Cards/Surfaces**: `#0f172a` (Slate 900)
- **Primary Text**: `#fafafa` (Near White) - Avoid pure white for lengthy body copy to reduce eye strain.
- **Borders/Muted**: `#1e293b` (Slate 800)
- **Accent**: METHABAU Orange (`#ff6b35`) acts as the high-visibility pop color in Dark Mode.

### Typography

- **Primary Font**: `Inter` (with fallback to `system-ui`, `-apple-system`, `sans-serif`)
- **Headers/Titles**: Usually set to bold (`font-bold` to `font-extrabold`) with tight tracking (`tracking-tight`).

### Design Aesthetics & UI Patterns

- **Corner Radius**: Friendly but professional, utilizing medium to large border radii (e.g., `rounded-xl`, `rounded-2xl`, `rounded-3xl` equivalent to 0.75rem to 1.5rem).
- **Shadows**: Premium, airy feel. Use soft, diffused shadows in light mode (e.g., `rgba(0,0,0,0.05)`) and subtle colored shadows for primary buttons (e.g., `rgba(255, 107, 53, 0.15)`).
- **"Metha Desk pro" Branding**: In specific logo or title contexts, the text should conform to formatting where "METHA" is capitalized/bolded, "Desk" is standard, and "pro" is standard—often combined creatively with the orange accent.

## Features

### Smart Application of Branding

- Whenever creating or modifying UI components (like Buttons, Cards, or Inputs), automatically inject the METHABAU Orange (`#ff6b35`) for active, focus, or primary states.
- Ensure dark mode applications utilize the `slate` scale rather than plain grays or blacks, creating a warmer, more integrated dark environment.
- Prioritize high-contrast structural text (Slate 700/Foreground) layered over expansive white spaces in light mode.

### Tailored UI Components

- Add subtle orange borders with low opacity for inactive states, intensifying upon hover or focus.
- Avoid generic colors. Combine harmonious palettes matching the structural nature of Methabau's business: professional slate and vibrant construction orange.
