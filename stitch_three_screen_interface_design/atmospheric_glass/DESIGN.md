---
name: Atmospheric Glass
colors:
  surface: '#f7f9fc'
  surface-dim: '#d8dadd'
  surface-bright: '#f7f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f7'
  surface-container: '#eceef1'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e6'
  on-surface: '#191c1e'
  on-surface-variant: '#414752'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f4'
  outline: '#717783'
  outline-variant: '#c1c7d3'
  surface-tint: '#005fac'
  primary: '#005da8'
  on-primary: '#ffffff'
  primary-container: '#2276cb'
  on-primary-container: '#fdfcff'
  inverse-primary: '#a4c9ff'
  secondary: '#006a63'
  on-secondary: '#ffffff'
  secondary-container: '#7df6ea'
  on-secondary-container: '#00716a'
  tertiary: '#006389'
  on-tertiary: '#ffffff'
  tertiary-container: '#2c7ca5'
  on-tertiary-container: '#fcfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d4e3ff'
  primary-fixed-dim: '#a4c9ff'
  on-primary-fixed: '#001c39'
  on-primary-fixed-variant: '#004884'
  secondary-fixed: '#7df6ea'
  secondary-fixed-dim: '#5ed9ce'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#00504b'
  tertiary-fixed: '#c6e7ff'
  tertiary-fixed-dim: '#87cffc'
  on-tertiary-fixed: '#001e2d'
  on-tertiary-fixed-variant: '#004c6b'
  background: '#f7f9fc'
  on-background: '#191c1e'
  surface-variant: '#e0e3e6'
  bg-surface: '#ffffff'
  bg-card-glass: rgba(255, 255, 255, 0.72)
  accent-orange: '#f4801a'
  accent-yellow: '#f7c948'
  accent-red: '#e05c2a'
  accent-uv-extreme: '#9b44c8'
  text-primary: '#1a1f2e'
  text-secondary: '#5a6478'
  text-tertiary: '#9aa3b2'
  text-on-gradient: '#ffffff'
typography:
  hero-temp:
    fontFamily: Inter
    fontSize: 80px
    fontWeight: '200'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  hero-temp-mobile:
    fontFamily: Inter
    fontSize: 64px
    fontWeight: '200'
    lineHeight: '1.1'
  headline-display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  body-large:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.5'
  body-main:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-metadata:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  label-tiny:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-page: 24px
  gutter-grid: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  safe-area-bottom: env(safe-area-inset-bottom)
---

## Brand & Style

The design system is centered on a **light, cheerful, and airy** personality. It aims to evoke a sense of optimism and clarity, transforming weather data into a serene visual experience. By moving away from heavy containers and dark panels, the interface feels weightless and integrated with its environment.

The aesthetic leans heavily into **Glassmorphism**, utilizing translucent layers, backdrop blurs, and soft shadows to create a sense of depth and hierarchy. The visual strategy uses the entire screen as a data point—where the background color is as informative as the text itself—creating an immersive, modern utility that feels more like a window than a dashboard.

## Colors

The palette is split between static functional colors and a dynamic, weather-driven background system. 

### Core Logic
- **Surfaces**: Use `bg-surface` for the main page canvas and `bg-card-glass` for interactive elements to ensure the background gradients bleed through.
- **Accents**: These are semantic. Use `accent-rain` (blue-tint) for precipitation metrics, `accent-orange/yellow/red` for UV intensity, and `primary` for general UI highlights.
- **Contrast**: On dark or highly saturated weather backgrounds (Night, Storm), typography should switch to `text-on-gradient` to maintain legibility.

### Dynamic Backgrounds
The background is a 3-stop linear gradient at 160 degrees. Transitions between weather states must be a slow, atmospheric 800ms ease to mimic the natural shift in conditions.

## Typography

This design system uses **Inter** exclusively to maintain a systematic, modern feel. The typographic hierarchy is driven by weight and scale rather than decorative font switching.

- **Hero Displays**: Temperature readings must be set in the `200` (Light) weight at a large scale to emphasize the minimalist aesthetic.
- **Hierarchy**: Use `text-primary` for main readings, `text-secondary` for descriptions, and `text-tertiary` for auxiliary data like "Feels like" or timestamps.
- **Readability**: On colorful weather backgrounds, ensure font weights are slightly increased if using white text to prevent "haloing" and maintain crispness.

## Layout & Spacing

The layout philosophy follows a **fluid grid** model with an emphasis on "air" and generous white space. 

- **Structure**: Information is grouped into vertical stacks. Main hero content is centered at the top, with detailed metrics following in 2-column or 4-column grids.
- **Margins**: A 24px safe margin is maintained on all sides for mobile. 
- **Mobile Patterns**: All interactive views must respect a 50px minimum swipe delta for city-switching gestures. 
- **Responsive**: On desktop, the content container should be capped at 480px width for a focused, app-like experience, centered horizontally on the screen.

## Elevation & Depth

Depth is communicated through **translucency and soft diffusion** rather than traditional stacking.

- **Glassmorphic Layers**: The primary elevation method is a `12px` backdrop blur combined with a `0.72` opacity white surface. This creates a "frosted" effect where the background weather colors remain visible but diffused.
- **Shadows**: Use extremely soft, low-opacity shadows (`rgba(0,0,0,0.07)`) to lift cards off the background. Avoid borders entirely; the shadow and the blur define the edge of the component.
- **Hover States**: Elevation increases on hover by deepening the shadow spread and slightly increasing the opacity of the glass effect.

## Shapes

The shape language is **very soft and friendly**. High corner radii are used to reinforce the approachable and modern brand personality.

- **Cards**: Use `rounded-lg` (20px) for standard data cards.
- **Interaction Elements**: Buttons and pills should use `rounded-xl` (28px) for a soft, friendly touch.
- **Small Elements**: Selection indicators or small chips use `rounded-sm` (8px).

## Components

### Cards
Cards are the primary unit of information. They must feature `backdrop-filter: blur(12px)` and a background of `rgba(255, 255, 255, 0.72)`. No borders should be used; instead, rely on the `--shadow-card` token for definition.

### Buttons & Pills
Actionable items should use the `rounded-xl` shape. Primary actions use `accent-blue`, while secondary actions remain semi-transparent glass.

### Input Fields
Search or location inputs should be styled as soft glass pills. Focus states are indicated by a subtle increase in the shadow intensity rather than a heavy border.

### Data Visualizations
Precipitation bars and UV indexes should use the semantic accent colors. For example, a rainfall chart uses `accent-rain`, while the UV scale transitions from `accent-yellow` to `accent-uv-extreme`.

### Icons
Use the system's emoji-based set (e.g., ☀️, 🌧️) for weather conditions. These should be sized large (56px) in the hero section to act as a secondary visual anchor alongside the temperature.