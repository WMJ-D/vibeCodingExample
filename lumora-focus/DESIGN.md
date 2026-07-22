# Lumora Design System

## 1. Objective
Lumora should make attention feel spacious and recoverable. The experience uses landscape, controlled pacing, and sparse language to turn a marketing hero into a brief act of focus.

## 2. Product Context
The audience is creators and knowledge workers overwhelmed by fragmented attention. The immediate job is to establish emotional relevance and collect an early-access email.

## 3. Visual Foundations
- Canvas: `#000000` beneath edge-to-edge natural video.
- Primary light text: `#FFFFFF`; reflective dark-state text: `#182C41`.
- Display and brand: Instrument Serif, with italic reserved for the Lumora wordmark.
- Utility copy: `system-ui, sans-serif`, compact and neutral.
- Surfaces: one low-opacity liquid-glass treatment, used only for navigation, badge, form, and mobile control.
- Motion: one-second scene dissolves and a six-pixel breathing drift on the transparent foreground overlay.

## 4. Accessibility
Keyboard focus remains visible, all controls have text or accessible labels, video is muted, and reduced-motion preferences remove decorative movement and shorten transitions.

## 5. Voice & Tone
Calm, lucid, and protective rather than clinical. Copy names familiar sources of distraction, then offers intention as an achievable action.

## 6. Implementation Practices
Keep the entire experience in one viewport section and one React component. Use state only for menu visibility, active scene, transition locking, and email submission feedback.

## 7. Anti-Patterns
Avoid wellness gradients, lotus imagery, floating metric cards, motivational slogans, opaque panels, and animation that competes with the landscape.

## 8. Decision-Making
The active landscape is the source of color and atmosphere. Interface additions must either aid navigation, conversion, or scene selection.

## 9. Workflow
Verify production build, 375px layout, short-height screens, keyboard controls, menu focus behavior, scene cooldown, and reduced-motion handling.

## Decision Trace
- Scene switching is presented as mood selection rather than a carousel, because users are choosing a focus environment rather than browsing content.
- Deep Woods changes the hero to ink-blue, creating one memorable inversion while the navigation and stats stay consistently white.
- The foreground overlay drifts as the sole continuous motion so the page feels alive without becoming another source of distraction.
- Stats remain a quiet baseline instead of cards, preserving the uninterrupted cinematic frame.

## Foldcraft Page Delta
- Foldcraft uses Geist 300-700 and a full-bleed studio film, intentionally separating its precise modernist identity from Lumora's editorial serif voice.
- The hero is split vertically between the studio thesis and one conversion action, preserving the supplied footage rather than covering it with panels.
- `/foldcraft` is a sibling experience inside the same Vite app. Lumora exposes it as a navigation entry, and Foldcraft provides a return link to Lumora.
- Staggered upward text reveals are the sole page-load choreography; no persistent decoration competes with the background craft film.

## MicroVisuals Page Delta
- MicroVisuals uses an oversized italic Instrument Serif title against a procedural video surface, while Barlow keeps navigation and conversion controls technical and quiet.
- The background transitions from source video to a frame-array boomerang after one complete playback; this makes the loop visibly continuous without seeking the media element backward.
- GSAP is limited to low-amplitude pointer parallax on the enlarged background, preserving typography as the dominant layer.
- The sibling route is `/microvisuals`, linked from both Lumora and Foldcraft navigation so all three concepts remain discoverable in one app.
