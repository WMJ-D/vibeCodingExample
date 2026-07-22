# Aperture Studio Design System

## 1. Objective
Create a cinematic agency presence that communicates precision and restraint before it explains services. The page should feel like a title sequence translated into a working interface.

## 2. Product Context
The audience is founders, operators, and creative directors commissioning premium digital work. The page must establish taste, capability, and confidence within two full-screen scenes.

## 3. Visual Foundations
- Color: pure black `#000000`, white `#FFFFFF`, secondary white at 80% and 90% opacity.
- Display type: Instrument Serif italic, tightly tracked and used for all headings and prominent figures.
- Body type: Barlow 300-600, compact leading, with light weights for descriptive copy.
- Surfaces: near-transparent liquid glass with vertical highlight borders and no opaque card fills.
- Motion: blur and vertical displacement resolve into sharp typography; video loops dissolve rather than cut.

## 4. Accessibility
Maintain readable white text, visible keyboard focus, semantic buttons and links, and a reduced-motion mode that removes transforms and blur transitions.

## 5. Voice & Tone
Direct, assured, and specific. Favor operational proof and craft vocabulary over broad marketing claims.

## 6. Implementation Practices
Use React components for reusable motion, video, and icon behavior. Keep the document to exactly two top-level visual sections and preserve responsive behavior down to 375px.

## 7. Anti-Patterns
Avoid colored gradients, opaque cards, decorative icon libraries, excessive shadows, generic feature-grid styling, and animation without hierarchy.

## 8. Decision-Making
When visual richness competes with legibility, preserve typography and interaction first. Use stronger glass only for the primary action.

## 9. Workflow
Verify type checking, production build, keyboard focus, reduced-motion behavior, mobile overflow, and video fallback behavior before release.

## Decision Trace
- The monochrome palette lets the supplied atmospheric footage provide all visual variation without introducing a competing brand color.
- The large italic serif creates an editorial, human counterpoint to the technically precise body copy.
- Two scenes are retained as a hard structural constraint; depth comes from motion and glass, not additional sections.
- The visual risk is near-invisible interface chrome over moving video. It costs some immediate affordance, mitigated through focus and hover states.
