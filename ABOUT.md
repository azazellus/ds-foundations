# Tokenseed

Tokenseed is a Figma plugin to create accessible and maintainable foundation tokens for design systems.

## Foundations

Foundations are the base decisions of a design system: its colors, typography, sizes and the rules that connect them. Everything else, from components to full products, is built on top of them. The main advantages of good foundations are:

- **Consistency.** Products built on common foundations look and behave as one, even across platforms.
- **Maintainability.** A rebrand, a new theme or a dark mode becomes a change to the foundations, not a redesign of every component. Developers update the token file, instead of making changes in all pages and components.
- **Accessibility.** Readable color pairings defined at the base carry through to every component, instead of being fixed one screen at a time.

Weak foundations have the opposite effect. Mistakes spread to everything built on them, and they get more expensive to fix as the system grows.

## Why I'm creating Tokenseed

Building a token foundation by hand is slow and easy to get wrong. It's a very repetitive setup: every palette, text style and mode has to be created one at a time. Fine-tuning colors and testing accessibility take a lot of effort.

Tokenseed's goal is to provide a solid and well-tested token structure that works for most apps and websites, out of the box. You just make a few brand choices, such as colors and fonts, and the plugin generates the entire foundation, checking that text, icons and backgrounds stay readable, ready to use in Figma. When a choice changes, you run the plugin again and the existing variables update in place, so the designs using them stay connected.

## Main features

- Support for multiple themes and brands.
- Light and dark modes, plus custom color modes.
- Generation of semantic and Android ColorScheme tokens.
- Size and typography tokens.
- WCAG contrast checks on text, icon and background colors.
- Text styles for Android, iOS and web.
- Color and text style tables that document every token.
- Token export to JSON and Kotlin.