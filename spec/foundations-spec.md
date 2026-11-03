# Design foundations specification

This specification defines how tokens are structured, named, and generated for a design system. It is an instruction set for a Figma plugin. Follow it exactly.

The machine-readable source for all mappings and inputs is `tokens.json`. If the two disagree, `tokens.json` wins and the disagreement is reported.

## How to read this specification

Sections 1 to 3 describe what the collections contain. Section 5 describes how the plugin generates them from the user's inputs. Section 6 describes what the plugin outputs and when it stops.

| Section | Topic | Where the values are in `tokens.json` |
|---|---|---|
| Principles | The four collections and how they reference each other | `collections` |
| 1 | Primitives: color palettes, sizes, typography, opacity | `primitives` |
| 1.1.8 | How palettes are named | `primitives.paletteNaming` |
| 1.1.9 | Tinted neutral palettes | `primitives.neutralTint` |
| 2 | Theme collection: roles, alpha tokens, typography, sizes | `theme` |
| 3 | Appearance collection: tokens, scopes, contrast pairings | `appearance` |
| 3.5 | ColorScheme collection (Android) | `colorScheme` |
| 4 | Accessibility reference | — |
| 5 | Generation: inputs, canvas and text fill rules, palettes, contrast adjustment, chroma, modes | `inputs`, `appearance.darkCanvas`, `appearance.lightCanvas`, `appearance.textFill`, `primitives` |
| 6 | Outputs (manifest, report, color tables and maps, developer exports), checks, failure conditions, implementation steps | `validation` |

### Terms

| Term | Meaning |
|---|---|
| Token | A Figma variable defined by this specification. |
| Collection | A Figma variable collection: Primitives, Theme, Appearance, or ColorScheme. |
| Mode | A column of values in a collection. Theme modes are called themes; Appearance and ColorScheme modes are called appearances. |
| Theme | A mode of the Theme collection, such as Main theme. Each theme has its own palettes and fonts. |
| Appearance | A mode of the Appearance and ColorScheme collections: Light, Dark, or an extra appearance based on one of them. |
| Role | The meaning of a color: neutral, brand, a status role (success, danger, warning, info), or a custom role added by the user. |
| Step | A shade of a palette, from 950 (darkest) to 50 (lightest). |
| Anchor | The step of the brand palette that keeps the brand color's exact HEX (section 5.2). |
| Canvas | The base surface of an appearance: color/elevation/surface/canvas and color/bg/base. |
| Text fill | The step of the bolder text and icons of an appearance (section 5.1). |
| Alpha token | A Theme color token made of a color link and an opacity link (section 2.1). Never contrast-checked. |
| Alias | A variable value that links to another variable instead of storing a raw value. |

---

## Principles

In Figma, designs are built with variables called **tokens**. Tokens store values such as color codes, numbers, and strings. Tokens are organized in three layers, each stored as a separate Figma variable collection, plus a fourth collection for Android:

1. **Primitives**: raw values. Not semantic. One mode.
2. **Theme**: semantic roles mapped to Primitives. One mode per theme (Main theme, Custom theme, Custom theme 2, and so on).
3. **Appearance**: the tokens UI components use. One mode per appearance: Light, Dark, and any extra appearances (section 5.1).
4. **ColorScheme**: the Material 3 color roles for Android apps (Jetpack Compose `ColorScheme`). Parallel to Appearance: same modes, values reference Theme tokens (section 3.5).

> Note: In Figma, every collection has one or more modes. This guide uses "theme" for a mode of the Theme collection and "appearance" for a mode of the Appearance collection. The Primitives collection has one mode.

### Reference rules

- **One direction of reference:** Primitives → Theme → Appearance, and Primitives → Theme → ColorScheme.
  - Appearance tokens must reference Theme tokens.
  - ColorScheme tokens must reference Theme tokens.
  - Theme tokens must reference Primitives.
- **Shared references:** one Primitive can be referenced by many Theme tokens, and one Theme token by many Appearance and ColorScheme tokens.
- **Per-theme and per-appearance values:** a Theme token can reference a different Primitive in each theme. An Appearance or ColorScheme token can reference a different Theme token in each appearance.

### Token use in UI components

Components never use Primitive tokens. They use Theme, Appearance, and ColorScheme tokens.

| Component attribute | Layer referenced | Examples |
|---|---|---|
| Size, typography | Theme | Padding, border radius, font weight |
| Color | Appearance | Background color, text color, icon color |
| Color in Android apps (Jetpack Compose) | ColorScheme | primary, onSurface, surfaceContainer |

---

## 1. Primitives

The Primitives collection holds four types of tokens: Color, Size, Typography, and Opacity.

### 1.1 Color

#### 1.1.1 Naming and value rules

- Naming: `Color/{Hue}/{Step}`, with PascalCase hue names. Example: `Color/Red/500`.
- Hue names are chosen by the plugin from the hue of the supplied HEX (section 1.1.8). The user never types or sees them in the form. Gray, Black, and White are fixed. Tinted neutral palettes have their own names (section 1.1.9).
- Primitives carry no meaning. A Primitive name must not describe usage. Use `Color/Red/500`, not `Color/Error/500`.
- Base neutrals are `Color/Black` and `Color/White`. Every other Primitive belongs to a hue scale.
- Figma type: COLOR.
- Value format: HEX (#RRGGBB, uppercase).
- Selection color space: OKLCH. Colors are generated in OKLCH and stored as HEX in Figma variables.
- Accessibility first: palettes are calibrated so that equal shade steps produce predictable contrast.
- All Color Primitives have all variable scopes disabled, so they cannot be used directly to design the UI.

#### 1.1.2 Base colors

| Token name | Value |
|---|---|
| Color/Black | #000000 |
| Color/White | #FFFFFF |

> Note: `Color/Black` and `Color/White` are steps of the neutral scale. `Color/Black` sits beyond step 950, and `Color/White` sits beyond step 50.

#### 1.1.3 Shade steps

Every palette contains exactly 13 steps, from `950` (darkest) to `50` (lightest):

`950, 900, 850, 800, 700, 600, 500, 400, 300, 200, 150, 100, 50`

Steps are not evenly spaced. The light and dark ends are denser, to give finer control where small changes matter most.

Both curves that shape a palette, the target lightness (section 1.1.4) and the chroma multipliers (section 5.5), are smooth curves across the steps, never straight lines. The lightness curve eases in and out: the gap between neighbouring steps rises steadily from the light end to its largest around step 400, then falls steadily toward the dark end. It never goes flat, so the lightest and darkest steps stay distinct (Dark mode uses the darkest steps for the canvas and the surfaces above it). The chroma multipliers form a smooth bell that peaks at step 400.

#### 1.1.4 Luminance targets

Each step has a target lightness (OKLCH L). The brand palette keeps the brand color's L at its anchor step (section 5.2). Every other palette starts from these targets and is calibrated independently against the backgrounds in section 1.1.5. Equivalent accessible contrast takes priority over identical OKLCH L across hues.

| Step | Target OKLCH L |
|---|---|
| 950 | 0.16 |
| 900 | 0.189 |
| 850 | 0.22 |
| 800 | 0.251 |
| 700 | 0.323 |
| 600 | 0.412 |
| 500 | 0.519 |
| 400 | 0.638 |
| 300 | 0.754 |
| 200 | 0.852 |
| 150 | 0.892 |
| 100 | 0.928 |
| 50 | 0.96 |

#### 1.1.5 Contrast requirements

Each row pairs a text step of the palette under validation with a background step. The background is a step of the theme's neutral palette (Color/Gray, or the theme's tinted neutral, section 1.1.9), or a step of the same palette when the background palette is "self". These pairings apply to every palette, including the brand and status palettes. A palette used by several themes, such as a status color shared by two themes, must meet each pairing against the neutral of every one of them.

| Text step | Background step | Background palette | Minimum contrast | Target contrast |
|---|---|---|---|---|
| 500 | 100 | Theme neutral | 4.5:1 | 4.7:1 |
| 700 | 200 | Theme neutral | 7:1 | 8:1 |
| 300 | 700 | Theme neutral | 4.5:1 | 6:1 |
| 150 | 700 | Theme neutral | 7:1 | 9.5:1 |
| 500 | 100 | Same palette (self) | 4.5:1 | 4.5:1 |

> Note: The same-palette pairing protects `color/text/{role}/bold` on `color/bg/{role}/softer` in Light (section 3.4). Step 100 of a palette is usually a little darker than neutral step 100, because its target L is lower. It is much darker when the supplied color is very light and becomes the anchor at step 100.

Minimum ratios are hard requirements. Target ratios are optimization goals. The method for calculating contrast is defined in section 5.7.

#### 1.1.6 Gray palette

Color/Gray is the default neutral palette of every theme. Its values are fixed and are not generated. A theme can instead use a tinted neutral (section 1.1.9), which keeps Gray's lightness and adds a slight hue. Gray's lightness values are its own; they do not follow the target lightness curve in section 1.1.4.

| Token name | Value | Luminance (L) |
|---|---|---|
| Color/Gray/950 | #0D0D0D | 0.16 |
| Color/Gray/900 | #141414 | 0.19 |
| Color/Gray/850 | #1D1D1D | 0.23 |
| Color/Gray/800 | #242424 | 0.26 |
| Color/Gray/700 | #303030 | 0.31 |
| Color/Gray/600 | #4D4D4D | 0.42 |
| Color/Gray/500 | #696969 | 0.52 |
| Color/Gray/400 | #8C8C8C | 0.64 |
| Color/Gray/300 | #B1B1B1 | 0.76 |
| Color/Gray/200 | #C7C7C7 | 0.83 |
| Color/Gray/150 | #DBDBDB | 0.89 |
| Color/Gray/100 | #EAEAEA | 0.94 |
| Color/Gray/50 | #F4F4F4 | 0.97 |

#### 1.1.7 Further reading

- OKLCH: https://en.wikipedia.org/wiki/Oklab_color_space
- Oklab explainer: https://bottosson.github.io/posts/oklab/
- OKLCH picker: https://oklch.com/
- WCAG contrast (minimum): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- Contrast checker: https://webaim.org/resources/contrastchecker/

#### 1.1.8 Palette names

The plugin names every generated palette. The name comes from the hue of the supplied HEX, read as an HSL hue (0° to 360°, as in a color picker). The hue is only used for naming; palettes are still generated in OKLCH (section 5.5). The list and the rules are in `tokens.json`, under `primitives.paletteNaming`.

There are 60 names, one every 6°. Each name covers its center ±3°: from 3° below the center up to, but not including, 3° above it. For example, Red covers 357° to 3°.

| Range | Names (center hue) |
|---|---|
| Reds and oranges | Red 0°, Scarlet 6°, Vermilion 12°, Cinnabar 18°, Persimmon 24°, Orange 30°, Tangerine 36°, Apricot 42°, Amber 48°, Gold 54° |
| Yellows and yellow-greens | Yellow 60°, Citron 66°, Pear 72°, Lime 78°, Chartreuse 84°, Apple 90°, Leaf 96°, Grass 102°, Clover 108°, Fern 114° |
| Greens | Green 120°, Shamrock 126°, Malachite 132°, Emerald 138°, Mint 144°, Jade 150°, Seafoam 156°, Viridian 162°, Lagoon 168°, Teal 174° |
| Cyans and blues | Cyan 180°, Turquoise 186°, Capri 192°, Sky 198°, Cerulean 204°, Azure 210°, Cobalt 216°, Sapphire 222°, Ultramarine 228°, Royal 234° |
| Blues and violets | Blue 240°, Iris 246°, Indigo 252°, Hyacinth 258°, Violet 264°, Amethyst 270°, Purple 276°, Grape 282°, Orchid 288°, Plum 294° |
| Magentas and pinks | Magenta 300°, Fuchsia 306°, Peony 312°, Mulberry 318°, Hibiscus 324°, Rose 330°, Raspberry 336°, Cerise 342°, Crimson 348°, Carmine 354° |

Rules, applied to the colors one at a time in a fixed order: theme by theme, and within a theme brand, then the status roles in use (success, danger, warning, info), then the custom roles.

1. **No hue.** A HEX whose R, G, and B are equal (white, black, pure grays) uses the fixed Color/Gray palette. No palette is generated for it.
2. **Same hue.** A status or custom color whose hue is within 1° of a palette already named uses that palette, in any theme. For example, two shades of the same green share one palette. The palette is generated from the first color that made it. A brand color keeps its exact HEX (section 5.2), so it only shares a palette made by a brand color with the same HEX; otherwise it makes its own palette (rules 3 and 4).
3. **New palette.** Otherwise the color makes a new palette, named after its hue's range. If that name is already taken, it takes the nearest free name in the list. If the two nearest free names are equally far, the one closer to 240° (the colder side) wins. If all 60 names are taken, generation stops as `missing_input`.
4. **Similar palettes.** After the palettes are generated, each one is compared with the palettes made before it. When no step differs from the same step of an earlier palette by more than 0.03 (OKLab distance, as in section 5.3 step 5), it is reported as `similar_palette` (warning), because the two palettes look almost the same. The finished palettes are compared, not the hues: HSL hues are uneven around the circle, so two colors far apart in HSL can still make almost the same palette (for example `#FF0026` and `#BD4242` as status or custom colors, 8.9° apart). The plugin form shows the same notice next to the color before anything is generated. A brand color has priority over the other colors, so a palette made by a brand color is never reported.
5. **Renamed palettes.** The plugin remembers which color (theme and role) made each palette. When a later run gives that color's palette a new name, and no palette of the new run uses the old name, the plugin renames the old palette's variables in place: `Color/Old/{step}` becomes `Color/New/{step}`. Layers and aliases that use them are kept. If a variable with the new name already exists, the old palette is not renamed and is reported as `orphan_variable`. Nothing is deleted.
6. **Close to the brand.** A status or custom color whose OKLCH hue is within 13° of the brand color of its own theme is reported as `close_to_brand` (warning), also when the two share a palette. The notice is about the other color, never the brand color, and the plugin form shows it next to that color before anything is generated. A color with no hue (rule 1) is left out. A color with this notice gets no `similar_palette` notice against that brand color.

#### 1.1.9 Tinted neutral palettes

A theme's neutral palette can carry a slight hue, so its grays look warmer or cooler while staying gray. The user picks a neutral color per theme (section 5.1). Only its hue is used: every tinted neutral has the same, small chroma. A plain gray (R, G, and B equal) gives the fixed Color/Gray palette. The values are in `tokens.json`, under `primitives.neutralTint`.

Each step of a tinted neutral:

1. Takes the OKLCH L of the same Color/Gray step (section 1.1.6), so it keeps Gray's lightness.
2. Takes the neutral color's OKLCH hue, rounded to one decimal place.
3. Takes the chroma 0.015, faded toward the lightest and darkest steps:

| Step | 50 | 100 | 150 | 200 to 800 | 850 | 900 | 950 |
|---|---|---|---|---|---|---|---|
| Share of 0.015 | 55% | 75% | 90% | 100% | 90% | 75% | 55% |

4. Is gamut-clamped like every other palette (section 5.5).

Tinted neutrals are named from their own list of 24 single-word names, one every 15° of HSL hue. Each name covers its center ±7.5°. The rules are those of section 1.1.8: a neutral color within 1° of a tinted neutral already named shares it; otherwise it takes the name of its range, or the nearest free name. The list is in `tokens.json`, under `primitives.neutralTint.naming`. Names are single words, and none of them is a palette name of section 1.1.8.

| Name | Center hue |
|---|---|
| Rosewood | 0° |
| Clay | 15° |
| Taupe | 30° |
| Sand | 45° |
| Khaki | 60° |
| Lichen | 75° |
| Moss | 90° |
| Sage | 105° |
| Celadon | 120° |
| Eucalyptus | 135° |
| Willow | 150° |
| Agave | 165° |
| Glacier | 180° |
| Mist | 195° |
| Slate | 210° |
| Steel | 225° |
| Flint | 240° |
| Storm | 255° |
| Smoke | 270° |
| Heather | 285° |
| Mauve | 300° |
| Thistle | 315° |
| Quartz | 330° |
| Cameo | 345° |

Every palette of a theme is calibrated against that theme's neutral (section 1.1.5).

---

### 1.2 Size

Size Primitives are the only sizes the design system allows. Figma type: FLOAT. Naming: `Size/{Value}`. Scopes are disabled.

| Token name | Value |
|---|---|
| Size/0 | 0 |
| Size/0-5 | 0.5 |
| Size/1 | 1 |
| Size/2 | 2 |
| Size/4 | 4 |
| Size/6 | 6 |
| Size/8 | 8 |
| Size/12 | 12 |
| Size/14 | 14 |
| Size/16 | 16 |
| Size/20 | 20 |
| Size/24 | 24 |
| Size/28 | 28 |
| Size/32 | 32 |
| Size/36 | 36 |
| Size/40 | 40 |
| Size/48 | 48 |
| Size/56 | 56 |
| Size/64 | 64 |
| Size/72 | 72 |
| Size/80 | 80 |
| Size/96 | 96 |
| Size/112 | 112 |
| Size/128 | 128 |
| Size/152 | 152 |
| Size/256 | 256 |
| Size/512 | 512 |
| Size/1024 | 1024 |

---

### 1.3 Typography

Typography Primitives define all font families and font weights allowed. Figma type: STRING. Scopes are disabled.

- Font family naming: `Typography/Font-family/{Family}`
- Font weight naming: `Typography/Font-weight/{Weight}`

Weights are named after the font's own weight names, exactly as Figma lists the family's styles (for example `Semi Bold` for Inter). Names can differ between font families, so the duplicate check runs within each family, not across families. For example, one family may have `SemiBold` and another `Semibold`, and both are valid. Every style the user selects becomes one weight Primitive (section 5.1).

#### Typography token examples

| Token name | Value |
|---|---|
| Typography/Font-family/Inter | Inter |
| Typography/Font-family/Garamond | Garamond |
| Typography/Font-weight/Light | Light |
| Typography/Font-weight/Thin | Thin |
| Typography/Font-weight/Regular | Regular |
| Typography/Font-weight/Medium | Medium |
| Typography/Font-weight/SemiBold | SemiBold |
| Typography/Font-weight/Semibold | Semibold |
| Typography/Font-weight/Bold | Bold |

> Note: The two families in this example do not share exact weight names. The important rule is that every weight used by the design system exists for its family.

---

### 1.4 Opacity

Opacity Primitives are stored as integer percentages from 0 to 100. Figma type: FLOAT. Naming: `Opacity/{Percentage}`. Scope: Color variable opacity.

| Token name | Value |
|---|---|
| Opacity/0 | 0 |
| Opacity/4 | 4 |
| Opacity/6 | 6 |
| Opacity/8 | 8 |
| Opacity/12 | 12 |
| Opacity/16 | 16 |
| Opacity/20 | 20 |
| Opacity/24 | 24 |
| Opacity/36 | 36 |
| Opacity/40 | 40 |
| Opacity/48 | 48 |
| Opacity/64 | 64 |
| Opacity/80 | 80 |
| Opacity/88 | 88 |
| Opacity/96 | 96 |

---

## 2. Theme collection

Theme tokens are the first semantic layer. Their names describe a general role, such as `brand`, `danger`, or `border-radius`. Their values are always references to Primitives.

Every theme resolves the same token names to different Primitives. The palettes for each theme come from user input (section 5.1). The neutral role resolves to Color/Gray, unless the theme has a tinted neutral (section 1.1.9).

> Note: The tables in this section show Main theme and Custom theme as examples. Each further theme (Custom theme 2, Custom theme 3, and so on) follows the same rule as the columns shown. These are the default mode names. The user can rename any theme (section 5.1); a renamed theme keeps its Figma mode (section 5.8).

```
color
├── neutral
├── brand
├── success
├── danger
├── warning
├── info
└── {custom role}   (one per custom color, section 5.1)

typography
├── font-family
└── font-weight

size
├── padding
├── border-radius
└── border
```

### 2.1 Color

Naming: `color/{role}/{step}`, in lowercase, where `{role}` is always a single word. Example: `color/brand/500`.

- Values reference Primitives only. Raw HEX values are never stored in this collection.
- All Theme color tokens have all variable scopes disabled.
- Figma type: COLOR.

#### Roles and palette mapping

| Role | Purpose | Main theme palette | Custom theme palette |
|---|---|---|---|
| neutral | Grays, including black and white | Color/Gray or a tinted neutral | Color/Gray or a tinted neutral |
| brand | Primary brand hue | User input | User input |
| success | Confirmation, positive states | User input | User input |
| danger | Errors, destructive actions | User input | User input |
| warning | Cautions, states that need attention before proceeding | User input | User input |
| info | Neutral informational messages and highlights | User input | User input |
| {custom role} | A color the user adds, such as `promo` | User input | User input |

> Note: Every palette is colored by the user for each theme (section 5.1) and named by the plugin. Neutral is Color/Gray unless the theme's neutral color has a hue (section 1.1.9). Black and white are always Color/Black and Color/White. A custom role is named once for the file, and each theme gives it its own palette. It follows every rule of a status role in this section and in section 3.

#### Expansion rule

For each role, every step of its palette is a Theme token, with the same step number:

- `color/{role}/950` through `color/{role}/50`: 13 tokens, each referencing `Color/{PaletteName}/{step}`.
- `color/neutral/black` references `Color/Black` in every theme.
- `color/neutral/white` references `Color/White` in every theme.

The neutral role therefore has 15 tokens. Every other role has 13.

#### Alpha tokens

Alpha tokens provide semi-transparent colors. Each alpha token is a color variable whose value is a composed color with two aliases: its color source (the Color Primitive listed below) and its opacity source (the Opacity Primitive listed below). Both are links, so a change to either Primitive updates the token. An alpha token never stores a pre-multiplied HEX color or an `rgba()` value.

Alpha tokens are not contrast-calibrated. They define a base color with transparency, not an accessible foreground/background pairing. Contrast checks never apply to alpha tokens, or to Appearance tokens that reference them (section 3.4).

**Colored alpha:** for each role in brand, danger, success, warning, info, and every custom role, one token is generated for each Opacity Primitive in section 1.4, in each theme.

- Naming: `color/{role}/alpha/a{NN}`, where `{NN}` is the percentage, zero-padded to two digits (`a00`, `a04`, `a06`, `a08`, `a12`, and so on).
- Color source: the role's 500 step in the same theme.
- Opacity source: `Opacity/{NN}`.
- Count: 15 tokens per role per theme.

**Neutral alpha:** not theme-dependent. The same in every theme.

- Naming: `color/neutral/alpha/{black|white}/a{NN}`.
- Black tokens use `Color/Black` as the color source. White tokens use `Color/White`.
- Opacity source: `Opacity/{NN}`.
- Count: 15 black and 15 white tokens, 30 in total.

The full list of alpha tokens is in `tokens.json`, under `theme.alpha.tokens`.

---

### 2.2 Typography

Naming: `typography/{category}/{variant}`.

All Theme typography tokens have all variable scopes disabled. Figma type: STRING.

| Token name | Main theme value | Custom theme value |
|---|---|---|
| typography/font-family | User input (font family) | User input (font family) |
| typography/font-weight/light | Typography/Font-weight/{Light} | Typography/Font-weight/{Light} |
| typography/font-weight/regular | Typography/Font-weight/{Regular} | Typography/Font-weight/{Regular} |
| typography/font-weight/medium | Typography/Font-weight/{Medium} | Typography/Font-weight/{Medium} |
| typography/font-weight/semibold | Typography/Font-weight/{Semibold} | Typography/Font-weight/{Semibold} |
| typography/font-weight/bold | Typography/Font-weight/{Bold} | Typography/Font-weight/{Bold} |

> Note: The braces show where the font's own weight name is used. Each weight token is a slot: in each theme it references the selected style of that theme's family whose name matches the slot when spaces and letter case are ignored. For example, `Semi Bold`, `SemiBold`, and `Semibold` all fill `typography/font-weight/semibold`. Section 5.1 defines how the weight names are supplied and what happens when a slot has no match.

---

### 2.3 Size

Size values can differ between themes, but are usually the same. Naming: `size/{category}/{variant}`. Figma type: FLOAT.

#### Padding

Padding tokens are used for both padding and gap. Scope: GAP.

| Token name | Main theme value | Custom theme value |
|---|---|---|
| size/padding/none | Size/0 | Size/0 |
| size/padding/3xs | Size/2 | Size/2 |
| size/padding/2xs | Size/4 | Size/4 |
| size/padding/xs | Size/6 | Size/6 |
| size/padding/sm | Size/8 | Size/8 |
| size/padding/md | Size/12 | Size/12 |
| size/padding/lg | Size/16 | Size/16 |
| size/padding/xl | Size/20 | Size/20 |
| size/padding/2xl | Size/24 | Size/24 |
| size/padding/3xl | Size/28 | Size/28 |
| size/padding/4xl | Size/32 | Size/32 |

#### Border radius

Border radius tokens are used for corner radii. Scope: CORNER_RADIUS.

| Token name | Main theme value | Custom theme value |
|---|---|---|
| size/border-radius/none | Size/0 | Size/0 |
| size/border-radius/3xs | Size/2 | Size/2 |
| size/border-radius/2xs | Size/4 | Size/4 |
| size/border-radius/xs | Size/6 | Size/6 |
| size/border-radius/sm | Size/8 | Size/8 |
| size/border-radius/md | Size/12 | Size/12 |
| size/border-radius/lg | Size/16 | Size/16 |
| size/border-radius/xl | Size/20 | Size/20 |
| size/border-radius/2xl | Size/24 | Size/24 |
| size/border-radius/3xl | Size/28 | Size/28 |
| size/border-radius/4xl | Size/32 | Size/32 |
| size/border-radius/5xl | Size/36 | Size/36 |
| size/border-radius/6xl | Size/40 | Size/40 |
| size/border-radius/7xl | Size/48 | Size/48 |
| size/border-radius/8xl | Size/64 | Size/64 |
| size/border-radius/full | Size/1024 | Size/1024 |

#### Border

Border tokens control the thickness of strokes. Scope: STROKE_FLOAT.

| Token name | Main theme value | Custom theme value |
|---|---|---|
| size/border/sm | Size/0-5 | Size/0-5 |
| size/border/md | Size/1 | Size/1 |
| size/border/lg | Size/2 | Size/2 |
| size/border/xl | Size/4 | Size/4 |
| size/border/2xl | Size/8 | Size/8 |

---

## 3. Appearance collection

Appearance tokens are color variables only. There are two base modes, Light and Dark, plus one mode per extra appearance (section 5.1). Light is always present. Dark is optional: without it, the collection has no Dark mode and no check runs in Dark (section 5.1). Every Appearance token must have a value in every mode. An extra appearance takes each token's value from its base (Light or Dark), as described in section 5.1. The full list in section 3.3 is mandatory. Figma type: COLOR.

```
color
├── elevation
│   ├── surface
│   └── shadow
├── bg
├── text
├── border
└── icon
```

### 3.1 Category scope

Every Appearance token must have the scope listed below, set in Figma.

| Category | Description | Figma scope |
|---|---|---|
| elevation/surface | Color of stacked layers that form the UI | FRAME_FILL, SHAPE_FILL |
| elevation/shadow | Shadows cast by surfaces | EFFECT_COLOR |
| bg | Backgrounds of elements such as buttons, containers, and inputs | FRAME_FILL, SHAPE_FILL |
| text | All text | TEXT_FILL |
| border | Outlines and dividers | STROKE_COLOR |
| icon | All icons | SHAPE_FILL, TEXT_FILL |

### 3.2 Naming

Appearance token names are the most semantic in the system. They describe exactly where a variable is used.

Main pattern: `color/{category}/{role}/{emphasis}`

- Category: `elevation`, `bg`, `text`, `border`, or `icon`.
- Role: `neutral`, `brand`, `selected` (brand colors for selected states), `success`, `danger`, `warning`, `info`, or a custom role (section 5.1).
- Emphasis: the strength of the color, from the scale below.

| Emphasis | Use |
|---|---|
| softest | Lowest emphasis; subtle fills and dividers |
| softer | Low emphasis; secondary fills |
| soft | Moderate emphasis; secondary surfaces |
| accent | Medium emphasis; graphic elements and selected graphic emphasis |
| bold | High emphasis; primary text and strong fills |
| bolder | Highest emphasis; emphasized text and icons |

Examples: `color/bg/neutral/soft`, `color/text/neutral/bolder`, `color/border/danger`.

Some tokens have no emphasis suffix. These are the only permitted exceptions:

| Category | Permitted no-emphasis variants |
|---|---|
| bg | base, input, disabled |
| text | disabled, inverse, link, fixed/dark, fixed/light |
| border | brand/heavy, brand/light, neutral/heavy, neutral/light, danger, disabled, focus, info, inverse, selected, success, warning |
| icon | danger, disabled, inverse, info, success, warning |
| elevation/surface | canvas, menu, overlay, raised, scrim |
| elevation/shadow | card |

Do not create additional no-emphasis variants. Do not mix emphasis systems within a category. `bg`, `text`, and `icon` use `softest` through `bolder`. `border` uses `light` and `heavy` where a strength distinction is needed. `accent` is reserved for selected graphic emphasis and for the brand accent tokens.

### 3.3 Appearance tokens

Each row references one Theme token per appearance. Alpha tokens are referenced by their Theme name. The values are for the default canvas and text fill steps; the rules for the other steps are in section 5.1.

The table is sorted alphabetically for reading. In Figma, and in the color tables, Appearance tokens follow this order (`appearance.order` in `tokens.json`):

- Groups, from top to bottom: elevation, bg, text, border, icon.
- Inside a group, sub-groups (such as brand, danger, or neutral) keep the order in which they first appear in this table.
- Inside a sub-group, tokens follow the emphasis hierarchy, from top to bottom: bolder, bold, accent, soft, softer, softest. Tokens without an emphasis (such as base, disabled, heavy, or light) come after them, in table order.

> Note: Figma lists variables in the order they were created, and plugins cannot reorder existing variables. The order applies when the plugin creates the variables.

**Custom roles.** Each custom role (section 5.1) adds 8 tokens, with `{role}` replaced by the role name. Inside each group they come after the tokens of the table below.

| Token name | Light value | Dark value |
|---|---|---|
| color/bg/{role}/bold | color/{role}/500 | color/{role}/300 |
| color/bg/{role}/soft | color/{role}/150 | color/{role}/800 |
| color/bg/{role}/softer | color/{role}/100 | color/{role}/850 |
| color/bg/{role}/softest | color/{role}/50 | color/{role}/900 |
| color/text/{role}/bolder | color/{role}/700 | color/{role}/150 |
| color/text/{role}/bold | color/{role}/500 | color/{role}/300 |
| color/border/{role} | color/{role}/300 | color/{role}/500 |
| color/icon/{role} | color/{role}/500 | color/{role}/300 |

Their `softest`, `softer`, and `soft` backgrounds follow the dark canvas like the other backgrounds (section 5.1).

| Token name | Light value | Dark value |
|---|---|---|
| color/bg/base | color/neutral/white | color/neutral/950 |
| color/bg/brand/accent | color/brand/400 | color/brand/400 |
| color/bg/brand/bold | color/brand/500 | color/brand/300 |
| color/bg/brand/soft | color/brand/150 | color/brand/800 |
| color/bg/brand/softer | color/brand/100 | color/brand/850 |
| color/bg/brand/softest | color/brand/50 | color/brand/900 |
| color/bg/danger/bold | color/danger/500 | color/danger/300 |
| color/bg/danger/soft | color/danger/150 | color/danger/800 |
| color/bg/danger/softer | color/danger/100 | color/danger/850 |
| color/bg/danger/softest | color/danger/50 | color/danger/900 |
| color/bg/disabled | color/neutral/alpha/black/a12 | color/neutral/alpha/white/a16 |
| color/bg/info/bold | color/info/500 | color/info/300 |
| color/bg/info/soft | color/info/150 | color/info/800 |
| color/bg/info/softer | color/info/100 | color/info/850 |
| color/bg/info/softest | color/info/50 | color/info/900 |
| color/bg/input | color/neutral/white | color/neutral/700 |
| color/bg/neutral/bolder | color/neutral/700 | color/neutral/150 |
| color/bg/neutral/soft | color/neutral/150 | color/neutral/800 |
| color/bg/neutral/softer | color/neutral/100 | color/neutral/850 |
| color/bg/neutral/softest | color/neutral/50 | color/neutral/900 |
| color/bg/selected/accent | color/brand/200 | color/brand/600 |
| color/bg/selected/bold | color/brand/500 | color/brand/300 |
| color/bg/selected/soft | color/brand/150 | color/brand/800 |
| color/bg/selected/softer | color/brand/100 | color/brand/850 |
| color/bg/selected/softest | color/brand/50 | color/brand/900 |
| color/bg/success/bold | color/success/500 | color/success/300 |
| color/bg/success/soft | color/success/150 | color/success/800 |
| color/bg/success/softer | color/success/100 | color/success/850 |
| color/bg/success/softest | color/success/50 | color/success/900 |
| color/bg/warning/bold | color/warning/500 | color/warning/300 |
| color/bg/warning/soft | color/warning/150 | color/warning/800 |
| color/bg/warning/softer | color/warning/100 | color/warning/850 |
| color/bg/warning/softest | color/warning/50 | color/warning/900 |
| color/border/brand/heavy | color/brand/400 | color/brand/400 |
| color/border/brand/light | color/brand/alpha/a36 | color/brand/alpha/a36 |
| color/border/danger | color/danger/300 | color/danger/500 |
| color/border/disabled | color/neutral/alpha/black/a12 | color/neutral/alpha/white/a08 |
| color/border/focus | color/brand/500 | color/brand/400 |
| color/border/info | color/info/300 | color/info/500 |
| color/border/inverse | color/neutral/white | color/neutral/950 |
| color/border/neutral/heavy | color/neutral/400 | color/neutral/400 |
| color/border/neutral/light | color/neutral/alpha/black/a24 | color/neutral/alpha/white/a16 |
| color/border/selected | color/brand/400 | color/brand/400 |
| color/border/success | color/success/300 | color/success/500 |
| color/border/warning | color/warning/300 | color/warning/500 |
| color/elevation/shadow/card | color/neutral/alpha/black/a12 | color/neutral/alpha/white/a00 |
| color/elevation/surface/canvas | color/neutral/white | color/neutral/950 |
| color/elevation/surface/menu | color/neutral/50 | color/neutral/850 |
| color/elevation/surface/overlay | color/neutral/white | color/neutral/900 |
| color/elevation/surface/raised | color/neutral/50 | color/neutral/850 |
| color/elevation/surface/scrim | color/neutral/alpha/black/a48 | color/neutral/alpha/black/a80 |
| color/icon/brand/accent | color/brand/400 | color/brand/400 |
| color/icon/brand/bold | color/brand/500 | color/brand/300 |
| color/icon/brand/bolder | color/brand/700 | color/brand/150 |
| color/icon/danger | color/danger/500 | color/danger/300 |
| color/icon/disabled | color/neutral/alpha/black/a24 | color/neutral/alpha/white/a16 |
| color/icon/info | color/info/500 | color/info/300 |
| color/icon/inverse | color/neutral/white | color/neutral/950 |
| color/icon/neutral/bold | color/neutral/500 | color/neutral/300 |
| color/icon/neutral/bolder | color/neutral/700 | color/neutral/150 |
| color/icon/success | color/success/500 | color/success/300 |
| color/icon/warning | color/warning/500 | color/warning/300 |
| color/text/brand/bold | color/brand/500 | color/brand/300 |
| color/text/brand/bolder | color/brand/700 | color/brand/150 |
| color/text/danger/bold | color/danger/500 | color/danger/300 |
| color/text/danger/bolder | color/danger/700 | color/danger/150 |
| color/text/disabled | color/neutral/alpha/black/a24 | color/neutral/alpha/white/a16 |
| color/text/fixed/dark | color/neutral/700 | color/neutral/700 |
| color/text/fixed/light | color/neutral/white | color/neutral/50 |
| color/text/info/bold | color/info/500 | color/info/300 |
| color/text/info/bolder | color/info/700 | color/info/150 |
| color/text/inverse | color/neutral/white | color/neutral/900 |
| color/text/link | color/brand/500 | color/brand/300 |
| color/text/neutral/bold | color/neutral/500 | color/neutral/300 |
| color/text/neutral/bolder | color/neutral/700 | color/neutral/150 |
| color/text/selected/bold | color/brand/500 | color/brand/300 |
| color/text/selected/bolder | color/brand/700 | color/brand/150 |
| color/text/success/bold | color/success/500 | color/success/300 |
| color/text/success/bolder | color/success/700 | color/success/150 |
| color/text/warning/bold | color/warning/500 | color/warning/300 |
| color/text/warning/bolder | color/warning/700 | color/warning/150 |

> Note: `color/elevation/shadow/card` is fully transparent in Dark (`a00`) on purpose.

### 3.4 Required contrast pairings

Validate the following pairings in every theme and every appearance (Light, Dark, and each extra appearance). Contrast is calculated on the fully resolved, opaque HEX values (section 5.7).

Alpha-based tokens are excluded. Any Appearance token that references an alpha Theme token is excluded, and it is not resolved, composited, or reported. This includes `color/bg/disabled`, `color/border/brand/light`, `color/border/disabled`, `color/border/neutral/light`, `color/elevation/shadow/card`, `color/elevation/surface/scrim`, `color/icon/disabled`, and `color/text/disabled`.

| Foreground token | Background token | Minimum contrast |
|---|---|---|
| color/text/neutral/bold | color/elevation/surface/canvas | 4.5:1 |
| color/text/neutral/bolder | color/elevation/surface/canvas | 7:1 |
| color/text/brand/bold | color/elevation/surface/canvas | 4.5:1 |
| color/text/brand/bolder | color/elevation/surface/canvas | 7:1 |
| color/text/danger/bold | color/elevation/surface/canvas | 4.5:1 |
| color/text/danger/bolder | color/elevation/surface/canvas | 7:1 |
| color/text/info/bold | color/elevation/surface/canvas | 4.5:1 |
| color/text/info/bolder | color/elevation/surface/canvas | 7:1 |
| color/text/success/bold | color/elevation/surface/canvas | 4.5:1 |
| color/text/success/bolder | color/elevation/surface/canvas | 7:1 |
| color/text/warning/bold | color/elevation/surface/canvas | 4.5:1 |
| color/text/warning/bolder | color/elevation/surface/canvas | 7:1 |
| color/text/link | color/elevation/surface/canvas | 4.5:1 |
| color/icon/neutral/bold | color/elevation/surface/canvas | 3:1 |
| color/icon/neutral/bolder | color/elevation/surface/canvas | 4.5:1 |
| color/icon/brand/bold | color/elevation/surface/canvas | 3:1 |
| color/icon/danger | color/elevation/surface/canvas | 3:1 |
| color/icon/info | color/elevation/surface/canvas | 3:1 |
| color/icon/success | color/elevation/surface/canvas | 3:1 |
| color/icon/warning | color/elevation/surface/canvas | 3:1 |
| color/border/focus | color/elevation/surface/canvas | 3:1 |

Pairings that use a status role that is not in use (section 5.1) are skipped.

For each custom role, also validate `color/text/{role}/bold` (4.5:1), `color/text/{role}/bolder` (7:1), and `color/icon/{role}` (3:1) against `color/elevation/surface/canvas`.

#### Status pairings

For each status role (danger, success, warning, info) and each custom role, validate against `color/bg/{role}/softer` only:

- `color/text/{role}/bold`: at least 4.5:1.
- `color/text/{role}/bolder`: at least 7:1.
- `color/icon/{role}`: at least 3:1.

Status pairings are validated after generation. A failure stops generation and is reported. The plugin does not remap tokens to fix it, because remapping can silently change the design.

### 3.5 ColorScheme collection

The ColorScheme collection holds the Material 3 color roles that Android apps read through Jetpack Compose (`MaterialTheme.colorScheme`). It is parallel to the Appearance collection: it has the same modes (Light, Dark when included, and every extra appearance, each with the same base, canvas step, and text fill step), and its values are aliases to Theme tokens. Token names are the Compose names, such as `primary` or `onSurfaceVariant`. Figma type: COLOR. The list is in `tokens.json`, under `colorScheme`, in Compose order.

Each token gets its value in one of two ways:

- **Same as an Appearance token.** The token takes, in every mode, the Theme token that the Appearance token has in that mode, after the canvas and text fill rules (section 5.1). For example, `primary` is the same as `color/bg/brand/bold`: `color/brand/500` in Light and `color/brand/300` in Dark. The two can never drift apart. When the Appearance token is not generated (a status role turned off), the ColorScheme token is not generated either.
- **Own values.** The token lists its own Theme tokens for Light and Dark. Every mode uses the value of its base. Tokens marked "follows the dark canvas" move their Dark value lighter by as many steps as the dark canvas step moved from 950, like the following tokens of section 5.1, but never lighter than step 600. With a black canvas they keep the values they have at 950. Lighter surfaces would fail the contrast pairings in section 3.5.1.

Roles and slots:

- `primary` and its related tokens belong to brand; `error` and its related tokens belong to danger, and are generated only when danger is in use.
- `secondary` uses the first custom role (section 5.1) and `tertiary` the second. A slot with no custom role is not generated: with one custom role there is no tertiary, with none there is neither. Custom roles after the second are not used here.

Scopes depend on the kind of token: backgrounds (`bg`) FRAME_FILL and SHAPE_FILL; content drawn on them (`on…` tokens) TEXT_FILL and SHAPE_FILL; lines (`outline`, `outlineVariant`) STROKE_COLOR.

Tokens that are the same as an Appearance token are also checked through that token (section 3.4). The ColorScheme text and icon roles are also checked against the backgrounds they are used on (section 3.5.1).

Each token has a description of what the role is for, in this project's words, based on the Compose `ColorScheme` documentation (https://developer.android.com/reference/kotlin/androidx/compose/material3/ColorScheme). The plugin writes it as the Figma variable's description, so a description edited by hand in Figma is set back on the next run.

In the table, a token either names the Appearance token it copies (its Light and Dark values then come from that token) or lists its own Light and Dark values. `{secondary}` and `{tertiary}` stand for the first and second custom role.

| Token | Role | Same as Appearance token | Own Light value | Own Dark value | Description |
|---|---|---|---|---|---|
| primary | brand | color/bg/brand/bold | — | — | Main accent: the color seen most often across screens and components. |
| onPrimary | brand | color/text/inverse | — | — | Text and icons on primary. |
| primaryContainer | brand | color/bg/brand/soft | — | — | Softer primary fill for containers. |
| onPrimaryContainer | brand | color/text/brand/bolder | — | — | Text and icons on primaryContainer. |
| inversePrimary | brand | — | color/brand/300 | color/brand/500 | Primary color for places using inverse colors, like a snackbar button. |
| secondary | {secondary} | color/bg/{secondary}/bold | — | — | Second accent, to add variety and tell parts of the product apart. |
| onSecondary | {secondary} | color/text/inverse | — | — | Text and icons on secondary. |
| secondaryContainer | {secondary} | color/bg/{secondary}/soft | — | — | Softer secondary fill for containers. |
| onSecondaryContainer | {secondary} | color/text/{secondary}/bolder | — | — | Text and icons on secondaryContainer. |
| tertiary | {tertiary} | color/bg/{tertiary}/bold | — | — | Third accent, to balance the others or draw attention to an element. |
| onTertiary | {tertiary} | color/text/inverse | — | — | Text and icons on tertiary. |
| tertiaryContainer | {tertiary} | color/bg/{tertiary}/soft | — | — | Softer tertiary fill for containers. |
| onTertiaryContainer | {tertiary} | color/text/{tertiary}/bolder | — | — | Text and icons on tertiaryContainer. |
| background | — | color/bg/base | — | — | Color behind scrollable content. |
| onBackground | — | color/text/neutral/bolder | — | — | Text and icons on background. |
| surface | — | color/elevation/surface/canvas | — | — | Color of component surfaces, such as cards, sheets and menus. |
| onSurface | — | color/text/neutral/bolder | — | — | Text and icons on surface. |
| surfaceVariant | — | color/bg/neutral/soft | — | — | Alternative to surface, for similar uses. |
| onSurfaceVariant | — | — | color/neutral/600 | color/neutral/200 | Secondary text and icons on surface. |
| surfaceTint | brand | color/bg/brand/bold | — | — | Tint laid over surface by components with tonal elevation. |
| inverseSurface | — | — | color/neutral/700 | color/neutral/100 | Strong contrast with surface, for elements sitting on top of it. |
| inverseOnSurface | — | color/text/inverse | — | — | Text and icons on inverseSurface. |
| error | danger | color/bg/danger/bold | — | — | Signals errors in components, such as invalid text in a field. |
| onError | danger | color/text/inverse | — | — | Text and icons on error. |
| errorContainer | danger | color/bg/danger/soft | — | — | Softer error fill for containers. |
| onErrorContainer | danger | color/text/danger/bolder | — | — | Text and icons on errorContainer. |
| outline | — | color/border/neutral/heavy | — | — | Subtle boundary color that adds contrast for accessibility. |
| outlineVariant | — | color/border/neutral/light | — | — | Decorative boundary color, where strong contrast is not needed. |
| scrim | — | color/elevation/surface/scrim | — | — | Color of a scrim that covers content behind a layer. |
| surfaceBright | — | — | color/neutral/white | color/neutral/700 (follows the dark canvas) | Surface variant that is always brighter than surface. |
| surfaceContainer | — | — | color/neutral/100 | color/neutral/850 (follows the dark canvas) | Surface variant for component containers, such as cards and menus. |
| surfaceContainerHigh | — | — | color/neutral/150 | color/neutral/800 (follows the dark canvas) | Surface container with more emphasis than surfaceContainer. |
| surfaceContainerHighest | — | — | color/neutral/200 | color/neutral/700 (follows the dark canvas) | Surface container with more emphasis than surfaceContainerHigh. |
| surfaceContainerLow | — | — | color/neutral/50 | color/neutral/900 (follows the dark canvas) | Surface container with less emphasis than surfaceContainer. |
| surfaceContainerLowest | — | color/elevation/surface/canvas | — | — | Surface container with less emphasis than surfaceContainerLow. |
| surfaceDim | — | — | color/neutral/200 | color/neutral/950 (follows the dark canvas) | Surface variant that is always dimmer than surface. |
| primaryFixed | brand | — | color/brand/100 | color/brand/100 | Primary fill that keeps the same color in light and dark. |
| primaryFixedDim | brand | — | color/brand/200 | color/brand/200 | Stronger version of primaryFixed, the same in light and dark. |
| onPrimaryFixed | brand | — | color/brand/900 | color/brand/900 | Text and icons on primaryFixed or primaryFixedDim. |
| onPrimaryFixedVariant | brand | — | color/brand/700 | color/brand/700 | Lower-emphasis version of onPrimaryFixed. |
| secondaryFixed | {secondary} | — | color/{secondary}/100 | color/{secondary}/100 | Secondary fill that keeps the same color in light and dark. |
| secondaryFixedDim | {secondary} | — | color/{secondary}/200 | color/{secondary}/200 | Stronger version of secondaryFixed, the same in light and dark. |
| onSecondaryFixed | {secondary} | — | color/{secondary}/900 | color/{secondary}/900 | Text and icons on secondaryFixed or secondaryFixedDim. |
| onSecondaryFixedVariant | {secondary} | — | color/{secondary}/700 | color/{secondary}/700 | Lower-emphasis version of onSecondaryFixed. |
| tertiaryFixed | {tertiary} | — | color/{tertiary}/100 | color/{tertiary}/100 | Tertiary fill that keeps the same color in light and dark. |
| tertiaryFixedDim | {tertiary} | — | color/{tertiary}/200 | color/{tertiary}/200 | Stronger version of tertiaryFixed, the same in light and dark. |
| onTertiaryFixed | {tertiary} | — | color/{tertiary}/900 | color/{tertiary}/900 | Text and icons on tertiaryFixed or tertiaryFixedDim. |
| onTertiaryFixedVariant | {tertiary} | — | color/{tertiary}/700 | color/{tertiary}/700 | Lower-emphasis version of onTertiaryFixed. |

#### 3.5.1 ColorScheme contrast pairings

Validate the following pairings in every theme and every mode (Light, Dark, and each extra appearance), on the fully resolved HEX values (section 5.7). A failure is reported as `contrast_minimum` (error) for the ColorScheme collection and stops generation. A pairing whose text or background token is not generated (no tertiary, danger turned off) is skipped. The list is in `tokens.json`, under `colorScheme.contrastRequired`.

"Compose documentation" pairs are named in the Compose `ColorScheme` documentation ("used for text and icons displayed on top of …"). "Material usage" pairs are not named there, but Material components draw that text on that background: secondary labels on variant surfaces, the snackbar action, and content on every surface container.

| Text and icons | Background | Minimum contrast | Source |
|---|---|---|---|
| onPrimary | primary | 4.5:1 | Compose documentation |
| onSecondary | secondary | 4.5:1 | Compose documentation |
| onTertiary | tertiary | 4.5:1 | Compose documentation |
| onError | error | 4.5:1 | Compose documentation |
| onPrimaryContainer | primaryContainer | 4.5:1 | Compose documentation |
| onSecondaryContainer | secondaryContainer | 4.5:1 | Compose documentation |
| onTertiaryContainer | tertiaryContainer | 4.5:1 | Compose documentation |
| onErrorContainer | errorContainer | 4.5:1 | Compose documentation |
| onBackground | background | 4.5:1 | Compose documentation |
| onSurface | surface | 4.5:1 | Compose documentation |
| onSurfaceVariant | surface | 4.5:1 | Compose documentation |
| inverseOnSurface | inverseSurface | 4.5:1 | Compose documentation |
| onPrimaryFixed | primaryFixed | 4.5:1 | Compose documentation |
| onPrimaryFixed | primaryFixedDim | 4.5:1 | Compose documentation |
| onSecondaryFixed | secondaryFixed | 4.5:1 | Compose documentation |
| onSecondaryFixed | secondaryFixedDim | 4.5:1 | Compose documentation |
| onTertiaryFixed | tertiaryFixed | 4.5:1 | Compose documentation |
| onTertiaryFixed | tertiaryFixedDim | 4.5:1 | Compose documentation |
| onPrimaryFixedVariant | primaryFixed | 4.5:1 | Material usage |
| onPrimaryFixedVariant | primaryFixedDim | 4.5:1 | Material usage |
| onSecondaryFixedVariant | secondaryFixed | 4.5:1 | Material usage |
| onSecondaryFixedVariant | secondaryFixedDim | 4.5:1 | Material usage |
| onTertiaryFixedVariant | tertiaryFixed | 4.5:1 | Material usage |
| onTertiaryFixedVariant | tertiaryFixedDim | 4.5:1 | Material usage |
| onSurfaceVariant | surfaceVariant | 4.5:1 | Material usage |
| inversePrimary | inverseSurface | 4.5:1 | Material usage |
| onSurface | surfaceBright | 4.5:1 | Material usage |
| onSurfaceVariant | surfaceBright | 4.5:1 | Material usage |
| onSurface | surfaceDim | 4.5:1 | Material usage |
| onSurfaceVariant | surfaceDim | 4.5:1 | Material usage |
| onSurface | surfaceContainerLowest | 4.5:1 | Material usage |
| onSurfaceVariant | surfaceContainerLowest | 4.5:1 | Material usage |
| onSurface | surfaceContainerLow | 4.5:1 | Material usage |
| onSurfaceVariant | surfaceContainerLow | 4.5:1 | Material usage |
| onSurface | surfaceContainer | 4.5:1 | Material usage |
| onSurfaceVariant | surfaceContainer | 4.5:1 | Material usage |
| onSurface | surfaceContainerHigh | 4.5:1 | Material usage |
| onSurfaceVariant | surfaceContainerHigh | 4.5:1 | Material usage |
| onSurface | surfaceContainerHighest | 4.5:1 | Material usage |
| onSurfaceVariant | surfaceContainerHighest | 4.5:1 | Material usage |

---

## 4. Accessibility reference

- WCAG 2.2 AA: body text at least 4.5:1. Large text and UI components at least 3:1.
- WCAG 2.2 AAA: body text at least 7:1. The `bolder` text tokens must meet it (section 3.4). For other text tokens it is optional.
- Non-color cues: do not rely on color alone to convey state (danger, success). Pair color with an icon or text.
- Text tokens must document their intended `bg` pairings and be verified in every appearance.

---

## 5. Foundations generation

To generate the foundations, follow this process in order.

### 5.1 Inputs

The plugin asks for each input below. Every palette input is a HEX value. The plugin names the palette (section 1.1.8).

| Input | Scope | Requirement | Format | Default when omitted |
|---|---|---|---|---|
| Number of themes | Global | Mandatory | Integer, 1 to 26 | None |
| Theme names | Global | Optional | One name per theme | Main theme, then Custom theme, Custom theme 2, ... |
| Brand color | Per theme | Mandatory | HEX | None |
| Neutral color | Per theme | Optional | HEX (only its hue is used) | #808080 (plain gray: Color/Gray) |
| Status roles | Global | Optional | Any of: success, danger, warning, info | All four |
| Status colors (success, danger, warning, info) | Per theme | Mandatory for each status role in use | HEX, each | None |
| Font families | Per theme | Mandatory | String | None |
| Font weights | Per theme | Optional | Any of the non-italic styles of the theme's font family, with the font's own names | The styles that match a weight slot (section 2.2) |
| Custom roles | Global | Optional | Zero or more role names, lowercase letters | None added |
| Custom colors | Per theme | Mandatory for each custom role | HEX, each | None |
| Dark | Global | Optional | Include or not | Included |
| Light canvas step | Global | Optional | white or 50 | white |
| Dark canvas step | Global | Optional | 950, 900, 850, or black | 950 |
| Light text fill step | Global | Optional | 700, 800, 850, 900, 950, or black | 700 |
| Dark text fill step | Global | Optional | 150, 100, 50, or white | 150 |
| Extra appearances | Global | Optional | Zero or more: name, base (Light or Dark), a canvas step (white or 50 for a Light base; 950, 900, 850, or black for a Dark base), and a text fill step (the Light or Dark list above, by base) | None added |

Rules for inputs:

- The neutral color is optional, one per theme. Only its hue is used. A plain gray (R, G, and B equal), the default, gives the fixed Color/Gray palette. Any other color gives a tinted neutral (section 1.1.9). An invalid HEX stops generation as `invalid_hex`.
- Status roles choose which of success, danger, warning, and info exist, for all themes at once. Brand and neutral always exist. For a status role that is not in use, no status color is asked for and nothing is generated for it: no Primitive palette, no Theme `color/{role}/...` tokens or alpha tokens, and no Appearance tokens whose name contains the role (such as `color/bg/warning/soft`, `color/text/warning/bold`, `color/border/warning`, and `color/icon/warning`) or whose value points to it. The contrast and status pairings in section 3.4 that use those tokens are skipped. Variables already in the file from an earlier run are not deleted; they are reported as `orphan_variable`.
- Palette names are not inputs. The plugin chooses them from the list in section 1.1.8. A missing or invalid HEX stops generation as `missing_input` or `invalid_hex`.
- Defaults apply only to optional inputs. A missing mandatory input stops generation (section 6.2).
- Per-theme inputs must be supplied for every theme. Each theme needs a brand color, a color for each status role in use, a color for each custom role, and a font family.
- The first theme is named Main theme unless the user names it. Every other theme the user does not name is named Custom theme, then Custom theme 2, Custom theme 3, and so on, with the lowest number that is free. A theme name uses letters, numbers, and single spaces and is unique. An invalid or duplicated name stops generation as `missing_input`. Only the themes requested exist.
- Dark is optional. Without it, the Appearance collection has no Dark mode, no Dark value is written, every check in Dark is skipped, and the dark canvas and text fill steps are ignored. Dark-based extra appearances are still allowed: they copy the Dark values of section 3.3.
- Custom roles add colors beyond brand and the status roles, such as `promo`. A role name is lowercase letters only, unique, and not one of: neutral, brand, success, danger, warning, info, base, disabled, input, selected, focus, inverse, shadow, surface, fixed, link. Each theme supplies its own HEX for every custom role. A custom role generates the same tokens and checks as a status role: a Primitive palette per hue (section 5.3), the Theme tokens `color/{role}/{step}` and `color/{role}/alpha/a{NN}` (section 2.1), the Appearance tokens in section 3.3, and the checks in section 3.4.
- Font weights are chosen from the styles that the theme's font family has in Figma. Italic styles are not offered. Every selected style becomes a Primitive `Typography/Font-weight/{Style}`. Each weight slot in section 2.2 uses the selected style whose name matches the slot when spaces and letter case are ignored. A slot that matches in no theme is not created. A slot that matches in some themes but not in others stops generation as `missing_input`; the report names the slot and the font families without a match. A selected style that the family does not have also stops generation as `missing_input`.
- Extra appearances are named by the user. One the user does not name is named Custom appearance, then Custom appearance 2, Custom appearance 3, and so on, with the lowest number that is free. A name uses letters, numbers, and single spaces, is unique, and is not Light or Dark. An invalid or duplicated name stops generation as `missing_input`.
- An extra appearance copies the value of every Appearance token from its base. It also has its own canvas step: white or 50 for a Light base (default white), and 950, 900, 850, or black for a Dark base (default 950). The light or dark canvas rule below applies to it with that step. The light and dark canvas step inputs apply to Light and Dark themselves. It has its own text fill step too (default 700 for a Light base and 150 for a Dark base), and the text fill rules below apply to it with that step.
- The dark canvas step changes `color/bg/base` (Dark) and `color/elevation/surface/canvas` (Dark). Both use the chosen step instead of 950. With black, both use `color/neutral/black`.
- The Dark backgrounds and surfaces above the canvas follow it, so they always stay lighter than the canvas. The Dark values in section 3.3 are for the default step, 950. With another step, each following token moves its Dark step lighter by the same number of steps along the shade scale (section 1.1.3) as the canvas moved from 950. With black, which is not on the shade scale, they keep the values they have at 950. The following tokens are `color/bg/{role}/softest`, `color/bg/{role}/softer`, and `color/bg/{role}/soft` for brand, danger, info, neutral, selected, success, warning, and every custom role, plus `color/elevation/surface/overlay`, `color/elevation/surface/menu`, and `color/elevation/surface/raised`. The full list is in `tokens.json`, under `appearance.darkCanvas`.

Dark values of the following tokens for each dark canvas step:

| Dark canvas step | softest | softer | soft | overlay | menu, raised |
|---|---|---|---|---|---|
| 950 | 900 | 850 | 800 | 900 | 850 |
| 900 | 850 | 800 | 700 | 850 | 800 |
| 850 | 800 | 700 | 600 | 800 | 700 |
| black | 900 | 850 | 800 | 900 | 850 |

Light canvas rules:

- The light canvas step changes `color/bg/base` (Light) and `color/elevation/surface/canvas` (Light). With 50, both use `color/neutral/50` instead of `color/neutral/white`.
- With 50, the elevated surfaces change too, so they stand out from the canvas: `color/elevation/surface/menu` uses `color/neutral/white` and `color/elevation/surface/raised` uses `color/neutral/100` (Light). The list is in `tokens.json`, under `appearance.lightCanvas.valuesByStep`.
- No other token follows the light canvas. All other Light values stay as in section 3.3, and the contrast checks in section 3.4 are unchanged.

Light values for each light canvas step:

| Light canvas step | canvas, bg/base | menu | raised | other tokens |
|---|---|---|---|---|
| white | white | 50 | 50 | as in section 3.3 |
| 50 | 50 | white | 100 | as in section 3.3 |

Text fill rules:

- The text fill step sets how strong the bolder text and icons are in an appearance. Each appearance has its own step. The values in section 3.3 are for the default steps, 700 in Light and 150 in Dark.
- With another step, these tokens use it in that mode, in their own color family: `color/text/{role}/bolder` for brand, danger, info, neutral, selected, success, warning, and every custom role, plus `color/icon/neutral/bolder` and `color/icon/brand/bolder`. The list is in `tokens.json`, under `appearance.textFill`.
- Only neutral has black and white. Where neutral uses black, the other families use step 950. Where neutral uses white, they use step 50.
- Bold tokens and `color/bg/neutral/bolder` do not change. ColorScheme tokens that are the same as a bolder token follow it (section 3.5). The contrast checks in section 3.4 run on the chosen values.

Values for each text fill step:

| Text fill step | color/text/neutral/bolder | Other families |
|---|---|---|
| 700 (Light default) | color/neutral/700 | color/{role}/700 |
| 800, 850, 900, or 950 | color/neutral/{step} | color/{role}/{step} |
| black | color/neutral/black | color/{role}/950 |
| 150 (Dark default) | color/neutral/150 | color/{role}/150 |
| 100 or 50 | color/neutral/{step} | color/{role}/{step} |
| white | color/neutral/white | color/{role}/50 |

### 5.2 Brand palette

1. **Choose the anchor.** Convert the brand color to OKLCH. The anchor is the step whose target L (section 1.1.4) is closest to the brand color's L. The closest step is usually 300, 400, 500, or 600, but any of the 13 steps is allowed. If two steps are equally close, choose the darker one.

   **Moved anchor.** Lightness and contrast do not match perfectly across hues, so a brand color can be closest to a step and still fail that step's contrast minimum against the theme's neutral (section 1.1.5). For example, `#127681` (L 0.519) is closest to step 500 but measures 4.44:1 against Color/Gray/100, below 4.5:1. The brand color is then never changed. Instead, it moves one step away from that pairing's background, to a step that has no pairing of its own:

   | Closest step | Pairing it fails | Anchor moves to |
   |---|---|---|
   | 500 | 500 on Gray 100 (dark text on a light background) | 400 |
   | 700 | 700 on Gray 200 (dark text on a light background) | 600 |
   | 300 | 300 on Gray 700 (light text on a dark background) | 400 |
   | 150 | 150 on Gray 700 (light text on a dark background) | 200 |

2. **Set the anchor lightness.** Keep the brand color's exact OKLCH L at the anchor step. Do not snap it to the target. Example: if `#78449F` has OKLCH L 0.49 and its anchor is 500, then `Color/{BrandName}/500` has L 0.49.

3. **Recalibrate the luminance curve.** Keep the target L for every non-anchor step unless a contrast adjustment (section 5.4) changes it. Every L value must follow these rules:
   - Steps keep their order from 950 to 50.
   - A step never passes the L of an adjacent step.
   - Changes decrease in size with distance from the anchor.

   Status and custom palettes start from the target L values instead (section 5.3).

   **After a moved anchor**, the brand color is darker or lighter than its new step's target, so the steps around it are re-spaced. Usually only its two neighbours on each side change; every other step keeps its target L.
   - Toward that shift, the first neighbour keeps the usual target gap from the brand color, and the second goes halfway between it and the next step, which stays fixed.
   - On the other side, the two neighbours are spaced evenly between the brand color and the next step, which stays fixed.
   - A brand color that moved from 500 to 400 follows a different rule on the lighter side. Steps 300, 200, and 150 sit at fixed fractions of the way from the brand color's L to the target L of step 100, which stays fixed: 0.325, 0.619, and 0.845. This keeps the lightest steps free of a jump in lightness.
   - Each re-spaced step takes its chroma from the curve in section 5.5 at its new L, with no chroma ceiling, so a gamut clamp at its target L is not carried over.

   Example: `#127681` anchored at 400 (L 0.519). Step 500 keeps the usual gap of 0.119 (L 0.400), step 600 goes halfway to step 700, and steps 300, 200, and 150 sit at their fractions of the way to step 100. The re-spaced steps still meet every contrast minimum, but do not chase targets (section 5.4 step 5). The rule is in `tokens.json`, under `primitives.brandAnchor`.

4. **Name the palette.** Use the name from section 1.1.8. Example: a brand color of `#78449F` (HSL hue 274°) is named `Purple` and becomes `Color/Purple/500` at its anchor.

5. **Generate the palette.** For each step, use the L from step 3, the hue from section 5.5, and the chroma from section 5.5 (brand palettes). The anchor keeps the brand color's exact HEX. Only the brand keeps its supplied color.

6. **Validate.** Run the contrast checks in section 5.4 against every pairing in section 1.1.5.

### 5.3 Other palettes

Status and custom colors only give a hue. Their palettes have no anchor step, and the supplied HEX does not need to appear in them:

1. Take the hue of the supplied HEX (section 5.5).
2. Give each step its target L (section 1.1.4).
3. Generate chroma as in section 5.5 (status and custom palettes).
4. Run the contrast checks in section 5.4 against the backgrounds in section 1.1.5.
5. **Shift notice.** Find the step closest to the supplied HEX (Euclidean distance in Oklab). If it is more than 0.06 away, report `hue_only_shift` (warning) with the closest step and its HEX. The plugin form shows the same notice next to the color, so the user knows the palette will look different from the color picked. The limit is in `tokens.json`, under `primitives.hueOnlyPalette.shiftNotice`.

Palettes can have different L values at the same step. This is expected when it is needed to produce equivalent accessible contrast.

### 5.4 Contrast adjustment

This procedure applies to every palette and uses one order everywhere:

1. **Check minimums.** Validate every required pairing in section 1.1.5 against its minimum.
2. **Adjust lightness first.** If a pairing fails, change the L of the foreground step only. The search is deterministic:
   - Direction: if the foreground L is at or above the background's L, increase L. Otherwise decrease L. This is the direction that increases contrast.
   - Step: 0.001 per candidate. Candidates are rounded to three decimals.
   - Limit: at most 0.150 away from the starting L.
   - Bounds: a candidate must stay strictly between the L values of the nearest darker and lighter steps in the same palette. It must also stay within 0 to 1.
   - Accept the first candidate whose contrast meets the threshold. Each candidate's color is gamut-clamped (section 5.5) before its contrast is measured.
   - The anchor never changes, so the brand color keeps its exact HEX. Because of the moved anchor (section 5.2 step 1), it never fails a neutral pairing at its own step. Status and custom palettes have no anchor.
   - **Brand color on its own step 100.** Only the same-palette pairing (500 on its own 100) can still fail at the anchor. The palette's step 100 then gets lighter instead, with the same search: 0.001 per candidate, at most 0.150 away from its starting L, and strictly below the L of the next lighter step. Its chroma and hue stay the same, and each candidate is gamut-clamped. If no candidate passes, generation stops as `contrast_minimum`.
3. **Adjust chroma second.** If no lightness candidate passes, search chroma at the step's current L and hue, in 0.001 steps:
   - First, descending from the current chroma to 0.01.
   - Then, ascending from the current chroma to the maximum in-gamut chroma at that L and hue, or to the step's chroma ceiling (section 5.5) when it is lower.
   - Accept the first candidate whose contrast meets the threshold.
   - The anchor is never changed.
4. **Re-validate.** One adjustment is one accepted candidate in step 2 or 3. After each adjustment, recalculate the pairing it changed. If the palette needs more than 50 adjustments, stop and report a failure. Only foreground steps are adjusted, apart from the brand color's own step 100 (step 2), and no foreground step is used as a background (section 1.1.5). Step 500 is the foreground in two pairings, and both of its backgrounds (neutral step 100 and the palette's own step 100) are lighter than it. Darkening step 500 for one pairing therefore never lowers the contrast of the other.
5. **Aim for targets.** After all minimums pass, apply the lightness search of step 2 with each target in place of its minimum. Targets never use the chroma search of step 3, never move the anchor, and never move the steps re-spaced around a moved anchor (section 5.2 step 3), because they are optimization goals. Never move a value below a minimum to reach a target. A target that cannot be reached is reported as a warning (`contrast_target`). Steps re-spaced around a moved anchor report only their minimums.

### 5.5 Chroma and hue

#### Chroma (brand palettes)

1. **Reference chroma.** The brand color is the anchor color. Compute the chroma at the 400 step as `C_400 = C_anchor / m_anchor`, where `C_anchor` is the color's OKLCH chroma and `m_anchor` is the multiplier of the anchor step below.
2. **Generate chroma.** For each step, `C_tone = C_400 × m_tone`.
3. **Multipliers:**

| Tone | Multiplier |
|---:|---:|
| 50 | 0.30 |
| 100 | 0.43 |
| 150 | 0.55 |
| 200 | 0.68 |
| 300 | 0.87 |
| 400 | 1.00 |
| 500 | 0.93 |
| 600 | 0.76 |
| 700 | 0.56 |
| 800 | 0.38 |
| 850 | 0.32 |
| 900 | 0.28 |
| 950 | 0.27 |

4. **Chroma ceiling.** No generated step goes above the ceiling below, for any hue. The anchor keeps the brand color's exact chroma, and the steps re-spaced around a moved anchor have no ceiling (section 5.2 step 3).

| Step | Highest chroma |
|---:|---:|
| 400 | 0.18 |
| 300 | 0.14 |

5. **Minimum chroma.** For non-neutral palettes, the minimum chroma is 0.01. If `C_tone` is below 0.01, set it to 0.01.
6. **Gamut clamp.** If a step falls outside sRGB, reduce its chroma at fixed L and hue until it is inside sRGB. Record each clamp as a warning, with the step, the original chroma, and the clamped chroma. A clamp is not a failure by itself. It becomes a failure only if it causes a minimum contrast to fail (section 5.4).

#### Chroma (status and custom palettes)

1. **Reference chroma.** `C_400` is fixed at 0.16 for every status and custom palette. The supplied color's chroma is not used.
2. **Yellow boost.** Yellow hues can show much more chroma at light steps than other hues. Multiply `C_400` by `1 + 0.6 × w`, where `w` depends on the palette's OKLCH hue: 1 from 85° to 105°, falling linearly to 0 at 65° and at 125°, and 0 outside. For example, a hue of 95° uses 0.256 and a hue of 75° uses 0.208.
3. **Generate chroma.** For each step, `C_tone = C_400 × m_tone`, with the multipliers above.
4. Then apply the chroma ceiling, the minimum chroma, and the gamut clamp, as for brand palettes (steps 4 to 6 above).

The values are in `tokens.json`, under `primitives.hueOnlyPalette` and `primitives.chromaCeiling`.

#### Hue

Every step uses the supplied color's OKLCH hue, rounded to one decimal place. The hue is constant across the palette. Hue anchors and per-step hue shifts are not used in this version of the specification.

### 5.6 Theme, Appearance, and ColorScheme tokens

- Theme tokens are created from the mappings in sections 2.1 to 2.3. Each token references its Primitive for the theme.
- Alpha tokens are created from the rules in section 2.1, using each theme's 500 step as the color source for colored roles.
- Appearance tokens reference Theme tokens as listed in section 3.3. Appearance values are never computed.
- ColorScheme tokens reference Theme tokens as listed in section 3.5. They are never computed either.

### 5.7 Contrast calculation

Contrast is WCAG 2.x contrast on sRGB. Compute it from the rounded HEX values that Figma stores.

1. **OKLCH to Oklab.** Convert `(L, C, H)` to `a = C · cos(H)` and `b = C · sin(H)`.
2. **Oklab to LMS.** Compute:
   - `l' = L + 0.3963377774a + 0.2158037573b`
   - `m' = L − 0.1055613458a − 0.0638541728b`
   - `s' = L − 0.0894841775a − 1.2914855480b`

   Then `l = l'³`, `m = m'³`, `s = s'³`.
3. **LMS to linear sRGB.**
   - `R = 4.0767416621l − 3.3077115913m + 0.2309699292s`
   - `G = −1.2684380046l + 2.6097574011m − 0.3413193965s`
   - `B = −0.0041960863l − 0.7034186147m + 1.7076147010s`
4. **Gamut check.** If any channel is outside [0, 1], the color is out of sRGB. Apply the gamut clamp in section 5.5.
5. **sRGB encoding and quantization.** For each channel `c`, apply `12.92c` if `c ≤ 0.0031308`, otherwise `1.055c^(1/2.4) − 0.055`. Then round `c × 255` to an integer. The result is the HEX value.
6. **Relative luminance.** From the rounded HEX values, linearize each channel `v = channel / 255`: use `v / 12.92` if `v ≤ 0.04045`, otherwise `((v + 0.055) / 1.055)^2.4`. Then `Y = 0.2126R + 0.7152G + 0.0722B`.
7. **Ratio.** `ratio = (Y_lighter + 0.05) / (Y_darker + 0.05)`. Compare the unrounded ratio to the minimum. Report it to two decimal places.

### 5.8 Modes in the Figma file

- **Shared modes.** The ColorScheme collection has the same modes as Appearance and follows the same rules below.
- **Renamed modes.** When the user renames a theme or an extra appearance, the plugin renames its existing Figma mode in place. Its values, and any layer that uses the mode, are kept. The plugin never creates a second mode for a renamed one. Light and Dark cannot be renamed.
- **Removed modes.** A mode that the inputs no longer list (a removed theme, Dark, or a removed extra appearance) is never deleted. It is reported as `orphan_mode`, and the user can delete it by hand in Figma.

---

## 6. Output contract and validation

### 6.1 Outputs

The plugin produces five outputs. The first three come from Check only and Generate tokens, and are shown in the plugin's report; when generation stops, only the validation report is produced (section 6.2). The color tables are drawn after the variables are written. The developer exports are made on request.

1. **Token manifest (JSON).** One entry per token:
   - `collection` (Primitives, Theme, Appearance, or ColorScheme)
   - `name`
   - `type` (COLOR, FLOAT, or STRING)
   - `value`: an alias (`{ "alias": "<token name>" }`) or a raw value
   - `scopes`
   - `mode` (Default, a theme such as Main theme, or an appearance such as Light, Dark, or an extra appearance)
   - `resolved_hex` for color tokens. Alpha tokens, and Appearance and ColorScheme tokens that link to one, have none: they are transparent, so they have no single HEX.
   - `contrast`: results for applicable pairings (sections 3.4 and 3.5.1), excluding alpha tokens and alpha-based tokens
2. **Validation report (JSON).** One entry per finding:

```json
{
  "check": "contrast_minimum",
  "severity": "error",
  "collection": "Appearance",
  "token": "color/text/brand/bold",
  "mode": "Light",
  "expected": ">= 4.5",
  "actual": 4.31,
  "message": "Minimum contrast not met against color/elevation/surface/canvas."
}
```

   Checks and their severity:

   | Check | Severity |
   |---|---|
   | `missing_input` | error |
   | `invalid_hex` | error |
   | `unresolved_reference` | error |
   | `duplicate_name` | error |
   | `naming_grammar` | error |
   | `missing_mandatory_token` | error |
   | `contrast_minimum` | error |
   | `status_pairing` | error |
   | `contrast_target` | warning |
   | `gamut_clamp` | warning |
   | `orphan_variable` | warning |
   | `orphan_mode` | warning |
   | `similar_palette` | warning |
   | `close_to_brand` | warning |
   | `hue_only_shift` | warning |

3. **Figma-ready variable definitions**, grouped by collection and mode.
4. **Color tables and ColorScheme color maps** (section 6.1.1), drawn in the Figma file.
5. **Developer exports** (section 6.1.2): Appearance tokens as JSON, and ColorScheme tokens as JSON or Kotlin.

Do not invent hues, roles, emphasis levels, font weights, or Appearance tokens that this specification does not define.

#### 6.1.1 Color tables

The plugin draws one table per color collection on a page called "Color tokens", so people can see every color token and what it links to.

- **When.** After Generate tokens writes the variables, and when the user presses Update tables. Update tables reads the variables as they are in the file, including changes made by hand, and changes no variable.
- **Page.** The plugin finds the page it made before (it carries a hidden tag, so it is found even if renamed), or a page named "Color tokens". Otherwise it creates one.
- **Tables.** One table per collection that exists in the file, in this order: Primitives, Theme, Appearance, ColorScheme. A collection that is missing has no table.
- **Replacing.** The new tables are drawn first. The tables drawn by an earlier run (they carry a hidden tag) are removed only once all new ones are finished. If drawing fails, the earlier tables stay. Nothing else on the page is touched.
- **Swatches** are filled with the variable itself, in an explicit theme and appearance, so each one shows that exact combination. Transparent colors sit on a checkerboard.

| Table | Rows | Columns |
|---|---|---|
| Primitives | Every color Primitive, grouped by palette | The swatch and its HEX |
| Theme | Every color Theme token, grouped by role | One per theme: the swatch and the Primitive it links to (and the Opacity Primitive, for alpha tokens) |
| Appearance | Every Appearance token, in the order of section 3.3, grouped by category | One per theme and appearance: the swatch, its HEX, and the Theme token it links to |
| ColorScheme | Every ColorScheme token, in the order of section 3.5, grouped by role family (primary, secondary, surface, error, …) | One per theme and appearance, as for Appearance |

A theme and appearance column is drawn on a black panel when its canvas color is dark (WCAG relative luminance below 0.18). So a Dark-based extra appearance is shown as dark, whatever its name.

**ColorScheme color maps.** To the right of the tables, the plugin draws one color map per theme and appearance in the ColorScheme collection, like Material's own color scheme chart. Maps are drawn and replaced together with the tables, under the same rules.

- **Frame.** 1872 × 1272, in an explicit theme and appearance, with the surfaceContainer role as its background.
- **Blocks.** One labeled block per ColorScheme role. Each block's fill and its label are bound to ColorScheme variables, usually the role and its "on" role, so a map follows later changes to the variables.
- **Missing roles.** A role that is not generated (no tertiary, danger turned off) leaves its place empty, and the other blocks do not move.
- **Names.** With one theme, a map is named after its appearance, such as "ColorScheme map - Light". With more themes, the name also says the theme, such as "ColorScheme map - Main theme Light".
- **Font.** Roboto, or IBM Plex Sans when Roboto is not installed.

#### 6.1.2 Developer exports

The plugin exports tokens for developers on request. It reads the variables as they are in the file, resolves every value to a HEX color, and changes nothing. The user chooses one file with all themes, or one file per theme.

- **HEX values.** A color is `#RRGGBB`. An alpha token adds its opacity as two more digits: `#RRGGBBAA`. A color typed in by hand in Figma is exported as it is.
- **Problems.** A token that cannot be resolved to a color is left out and listed as a problem. The other tokens are still exported.

**Appearance tokens (JSON).** Every Appearance token, sorted by its exported name. The user chooses how names are written. For `color/bg/brand/bold`:

| Naming | Example |
|---|---|
| dot.case | `color.bg.brand.bold` |
| PascalCase | `ColorBgBrandBold` |
| camelCase | `colorBgBrandBold` |
| kebab-case (CSS) | `--color-bg-brand-bold` |

The user can also leave out the leading `color`. When two tokens would get the same exported name, the second is left out and listed as a problem.

**ColorScheme tokens (JSON).** Every ColorScheme token, with its Compose name unchanged, in the collection's order.

Both JSON exports use the same structure:

```json
{
  "version": 1,
  "themes": {
    "Main theme": {
      "appearances": {
        "Light": { "color/bg/base": "#FFFFFF" },
        "Dark": { "color/bg/base": "#0D0D0D" }
      }
    }
  }
}
```

| Export | One file | One file per theme |
|---|---|---|
| Appearance JSON | `appearance-tokens.json` | `appearance-tokens-{theme}.json`, such as `appearance-tokens-main-theme.json` |
| ColorScheme JSON | `colorscheme-tokens.json` | `colorscheme-tokens-{theme}.json` |
| ColorScheme Kotlin | `ColorSchemes.kt` | `{Theme}ColorScheme.kt`, such as `MainThemeColorScheme.kt` |

**ColorScheme tokens (Kotlin).** A Kotlin file for Jetpack Compose, in the package the user types (default `com.example.ui.theme`; an invalid package name is replaced by the default and listed as a problem).

- Each theme and appearance becomes one value, named after both: Main theme in Light becomes `MainThemeLightColorScheme`.
- The value uses `darkColorScheme(...)` when the appearance's `surface` color is dark (WCAG relative luminance below 0.18), and `lightColorScheme(...)` otherwise. So a Dark-based extra appearance gets a dark scheme.
- Each role is written as `role = Color(0xAARRGGBB)`. Compose puts the alpha first, so `#RRGGBB` becomes `0xFFRRGGBB` and `#RRGGBBAA` becomes `0xAARRGGBB`.
- A role that is not in `colorScheme.tokens` (one added by hand in Figma) would not compile. It is left out and listed as a problem.

### 6.2 Failure conditions

Stop generation and produce only the validation report if any of the following occurs:

- A mandatory input is missing or invalid.
- A required minimum contrast cannot be met after the adjustments in section 5.4.
- A status pairing fails (section 3.4).
- A ColorScheme contrast pairing fails (section 3.5.1).
- A Theme token cannot resolve to a Primitive, or an Appearance or ColorScheme token cannot resolve to a Theme token.
- A token name duplicates another or violates the naming grammar.
- A mandatory Appearance token is missing.

A gamut clamp does not stop the run. It is reported as a warning (section 5.5).

Do not silently approximate, remove a requirement, rename a token, or add an undocumented token to make generation succeed.

### 6.3 Plugin implementation

#### Figma types and scopes

| Collection | Figma type | Scopes |
|---|---|---|
| Primitives: Color | COLOR | None (all disabled) |
| Primitives: Size | FLOAT | None |
| Primitives: Typography | STRING | None |
| Primitives: Opacity | FLOAT, values 0–100 | OPACITY |
| Theme: color | COLOR | None |
| Theme: typography | STRING | None |
| Theme: size | FLOAT | Per token (GAP, CORNER_RADIUS, STROKE_FLOAT) |
| Appearance | COLOR | Per category (section 3.1) |
| ColorScheme | COLOR | Per kind of token (section 3.5) |

#### Alpha tokens

Alpha tokens are created like other Theme color tokens, using the sources in section 2.1. The plugin sets each alpha token, in every theme, to a composed color: an alias to its color source and an alias to its Opacity Primitive (`Opacity/{NN}`). Both aliases must resolve to Primitives (`unresolved_reference` otherwise). Alpha tokens are excluded from the contrast checks (sections 3.4 and 3.5.1).

#### Implementation steps

Steps are sequential.

1. Read `tokens.json`. Collect the inputs in section 5.1 and validate them. Name the palettes (section 1.1.8).
2. Build every palette and every variable definition, and run all the checks in section 6.1 on them. Nothing has been written to the file yet.
3. If any check is an error, stop: show only the validation report (section 6.2). Check only always stops here, and shows the report without writing.
4. Find or create each collection by name, and its modes (section 5.8). Rename palettes whose name changed (section 1.1.8, rule 5). Find existing variables by collection and name, then update them. Never create duplicates.
5. Create or update Primitives, since they have no references.
6. Create or update Theme tokens, with `VARIABLE_ALIAS` values pointing to Primitive IDs.
7. Create or update alpha tokens (section 2.1).
8. Create or update Appearance tokens, with aliases pointing to Theme IDs.
9. Create or update ColorScheme tokens, with aliases pointing to Theme IDs.
10. Redraw the color tables and the ColorScheme color maps (section 6.1.1).
11. Save the form's settings in the file (see "Saved settings" below).
12. Show the manifest, the report, and a summary of what was created, updated, unchanged, and renamed.

Variables in the file that are not in the manifest are reported as `orphan_variable`. Modes that the inputs do not list are reported as `orphan_mode`. The plugin never deletes either.

#### Saved settings

The plugin saves the form's settings inside the Figma file when Generate tokens writes the variables. Check only does not save them. Each file keeps its own settings.

When the plugin opens:

- **The file has no tokens** (no variable in the Primitives, Theme, Appearance, or ColorScheme collections): the form shows the default settings. This covers a new file and a file whose tokens were all deleted.
- **The file has tokens and saved settings:** the form shows them.
- **The file has tokens but no saved settings** (generated by an earlier version of the plugin): the form shows the settings that version kept for the user, if any. Otherwise it shows the default settings.

#### Source of truth

`tokens.json` is the source of truth. The plugin reads it. The markdown tables describe the same mappings for people. If a markdown table and `tokens.json` disagree, the disagreement is reported as an error.
