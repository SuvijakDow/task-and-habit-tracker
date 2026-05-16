---
name: Task & Habit Tracker
description: Fast personal task and habit companion with soft glass surfaces and momentum-focused feedback.
colors:
  primary-violet: "#7C3AED"
  primary-pink: "#EC4899"
  secondary-indigo: "#8B5CF6"
  tertiary-sky: "#93C5FD"
  neutral-white: "#FFFFFF"
  neutral-blush: "#F8DFEA"
  neutral-lilac: "#EFDDF5"
  neutral-sky: "#DFEBFF"
  surface-frost: "#FFFFFFCC"
  text-strong: "#1F2937"
  text-muted: "#6B7280"
  border-soft: "#FFFFFF99"
typography:
  display:
    fontFamily: "Poppins, Noto Sans Thai, Segoe UI, Arial, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Poppins, Noto Sans Thai, Segoe UI, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Poppins, Noto Sans Thai, Segoe UI, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0"
  body:
    fontFamily: "Poppins, Noto Sans Thai, Segoe UI, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.6
    letterSpacing: "0"
  label:
    fontFamily: "Poppins, Noto Sans Thai, Segoe UI, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary-violet}"
    textColor: "{colors.neutral-white}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-pink}"
    textColor: "{colors.neutral-white}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-frost}"
    textColor: "{colors.primary-violet}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  input-default:
    backgroundColor: "{colors.surface-frost}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  card-glass:
    backgroundColor: "{colors.surface-frost}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.md}"
    padding: "24px"
  nav-tab-active:
    backgroundColor: "{colors.secondary-indigo}"
    textColor: "{colors.neutral-white}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  nav-tab-idle:
    backgroundColor: "{colors.surface-frost}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
---

# Design System: Task & Habit Tracker

## 1. Overview

**Creative North Star: "Momentum Glass"**

The interface should feel like a lightweight personal command surface that stays beautiful under daily repetition. Visual polish exists to reduce friction and preserve momentum, not to perform as decoration. Core actions should read instantly, feel direct, and respond with calm confidence.

The system blends soft glass layering with vivid lilac-pink accents so habit completion and task updates feel rewarding without turning noisy. It explicitly rejects cluttered dashboard interfaces, crowded card stacks, and decorative patterns that slow interaction. It also rejects heavy or distracting motion that competes with core actions.

**Key Characteristics:**
- Soft translucent surfaces with clear hierarchy.
- High-clarity action states in violet and pink.
- Compact spacing tuned for fast daily check-ins.
- Motion used for confirmation and orientation only.

## 2. Colors

The palette is a committed pastel-violet system where tinted neutrals set atmosphere and vivid accents mark action, progress, and completion.

### Primary
- **Momentum Violet** (#7C3AED): Primary action color for major controls, active tabs, and progress emphasis.
- **Pulse Pink** (#EC4899): Counter-accent for gradient energy on key calls to action and success momentum moments.

### Secondary
- **Lifted Indigo** (#8B5CF6): Reinforcement accent for selected navigation and high-priority interface states.

### Tertiary
- **Sky Signal** (#93C5FD): Supplemental color for category chips and low-pressure informational highlights.

### Neutral
- **Cloud White** (#FFFFFF): Core surface and text-contrast baseline.
- **Petal Blush** (#F8DFEA): Background gradient anchor for warm top-level ambience.
- **Mist Lilac** (#EFDDF5): Mid-background layer to support depth without hard separation.
- **Soft Sky** (#DFEBFF): Cool balancing layer that keeps the composition airy.
- **Slate Ink** (#1F2937): Primary text color for readable content density.
- **Quiet Slate** (#6B7280): Secondary text for supporting information and metadata.

### Named Rules
**The Momentum Accent Rule.** Accent colors exist to reveal action and progress, never as generic decoration.  
**The Soft Surface Rule.** Surface contrast should come from tinted layers and subtle borders, not stark black-white blocks.

## 3. Typography

**Display Font:** Poppins (with Noto Sans Thai, Segoe UI, Arial, sans-serif fallback)  
**Body Font:** Poppins (with Noto Sans Thai, Segoe UI, Arial, sans-serif fallback)  
**Label/Mono Font:** Same stack, no separate mono voice in current product UI.

**Character:** Rounded geometric forms communicate friendliness and speed, while medium-to-bold weights keep short daily interactions scannable under time pressure.

### Hierarchy
- **Display** (800, clamp(2rem, 5vw, 3rem), 1.1): Brand or page headline moments.
- **Headline** (700, 1.5rem, 1.25): Section-level anchors and welcome headers.
- **Title** (600, 1.25rem, 1.35): Card and module titles.
- **Body** (500, 1rem, 1.6): Default reading and interaction copy, target line length 65-75ch when long-form appears.
- **Label** (600, 0.875rem, 0.01em): Form labels, metadata, and compact control text.

### Named Rules
**The One-Glance Rule.** Any daily action screen must be readable in one quick scan, so weights and sizes must keep hierarchy obvious at a glance.

## 4. Elevation

Elevation is ambient and soft. Resting surfaces use frosted backgrounds and light borders, then lift through shadow and minor translation on interaction. Depth should suggest responsiveness, not theatrical layering.

### Shadow Vocabulary
- **Surface Lift** (`box-shadow: 0 10px 28px rgba(124,58,237,0.12)`): Sticky navigation and elevated persistent controls.
- **Modal Focus** (`box-shadow: 0 24px 56px rgba(120,87,255,0.26)`): Modal and high-focus overlays.
- **Action Glow** (`box-shadow: 0 10px 24px rgba(168,85,247,0.3)`): High-importance active controls.

### Named Rules
**The Response-Only Depth Rule.** Depth intensifies only when user intent or focus changes, never as idle ornament.

## 5. Components

### Buttons
- **Shape:** Soft rectangular with compact corners (8px).
- **Primary:** Violet-to-pink emphasis for commit actions, medium-large hit area, bold white text.
- **Hover / Focus:** Brightness lift, slight upward shift, explicit focus ring.
- **Secondary / Ghost:** Frosted white base with violet text for lower-priority actions.

### Chips
- **Style:** Rounded pills or compact rounded tags using pastel category colors.
- **State:** Selection uses stronger border/scale cue; unselected remains neutral and quiet.

### Cards / Containers
- **Corner Style:** Rounded medium geometry (12px to 16px depending on density).
- **Background:** Frosted white overlays on tinted gradient canvas.
- **Shadow Strategy:** Ambient in rest state, stronger only for hover/focus contexts.
- **Border:** Soft translucent borders, never heavy side stripes.
- **Internal Padding:** Uses 16px, 24px, and 32px rhythm steps.

### Inputs / Fields
- **Style:** Frosted white fill, soft border, rounded 8px corners.
- **Focus:** Violet ring + cleaner background for active editing state.
- **Error / Disabled:** Error uses red-tinted panel and border; disabled lowers opacity without losing legibility.

### Navigation
- **Style:** Sticky frosted tab rail with animated sheen.
- **Active Tab:** Saturated violet-pink emphasis with white icon/text.
- **Inactive Tab:** Soft white surface and muted slate text, with hover lift.
- **Mobile Nav:** Compact dropdown tab selector keeps one-handed flow fast.

## 6. Do's and Don'ts

### Do:
- **Do** keep primary actions visually obvious with violet/pink emphasis and clear hover/focus response.
- **Do** preserve compact, fast interaction paths for daily habit check-offs and task capture.
- **Do** use translucent surfaces, soft borders, and ambient shadows to separate layers gently.
- **Do** keep motion short and purposeful, especially for confirmation, orientation, and feedback.

### Don't:
- **Don't** create cluttered dashboard interfaces.
- **Don't** use crowded card stacks.
- **Don't** add decorative patterns that slow interaction.
- **Don't** use heavy or distracting motion that competes with core actions.
- **Don't** use side-stripe borders or gradient text as decorative shortcuts.
