"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

  // spec/tokens.json
  var tokens_default = {
    version: "1.22.0",
    description: "Source of truth for the design foundations specification (foundations-spec.md). Palette HEX values are user inputs and palette names come from primitives.paletteNaming; this file defines the rules, inputs, Theme mappings, alpha tokens, Appearance mappings, and ColorScheme mappings.",
    collections: {
      Primitives: { modes: ["Default"] },
      Theme: {
        firstModeName: "Main theme",
        customModeName: "Custom theme",
        modeCount: "input:numberOfThemes",
        modeNames: "input:themeNames"
      },
      Appearance: {
        modes: ["Light", "Dark"],
        requiredModes: ["Light"],
        optionalModes: { Dark: "input:includeDark" },
        extraModes: "input:extraAppearances"
      },
      ColorScheme: {
        modesFrom: "Appearance",
        description: "Same modes as Appearance: Light, Dark when included, and every extra appearance, each with the same base, canvas step, and text fill step."
      },
      modeRules: {
        rename: "When a theme or an extra appearance is renamed, the plugin renames its existing Figma mode in place, so its values and any layer that uses it are kept. It never creates a second mode for a renamed one.",
        removed: "A mode that the inputs no longer list (a removed theme, Dark, or extra appearance) is never deleted. It is reported as orphan_mode."
      }
    },
    primitives: {
      steps: [950, 900, 850, 800, 700, 600, 500, 400, 300, 200, 150, 100, 50],
      targetL: {
        "950": 0.16,
        "900": 0.189,
        "850": 0.22,
        "800": 0.251,
        "700": 0.323,
        "600": 0.412,
        "500": 0.519,
        "400": 0.638,
        "300": 0.754,
        "200": 0.852,
        "150": 0.892,
        "100": 0.928,
        "50": 0.96
      },
      chromaMultiplier: {
        "50": 0.3,
        "100": 0.43,
        "150": 0.55,
        "200": 0.68,
        "300": 0.87,
        "400": 1,
        "500": 0.93,
        "600": 0.76,
        "700": 0.56,
        "800": 0.38,
        "850": 0.32,
        "900": 0.28,
        "950": 0.27
      },
      minChroma: 0.01,
      hueRounding: 1,
      neutralTint: {
        description: "A theme's neutral palette tinted with the hue of its neutral color (inputs.neutralColor). Each step keeps the OKLCH L of the same Color/Gray step and takes the neutral color's OKLCH hue, rounded to one decimal, with the chroma below. Only the hue matters: every tinted neutral has the same chroma. Each step is gamut-clamped like other palettes.",
        chroma: 0.015,
        fade: {
          description: "Share of chroma at each step. Steps not listed use the full chroma. The tint fades toward the lightest and darkest steps.",
          steps: {
            "50": 0.55,
            "100": 0.75,
            "150": 0.9,
            "850": 0.9,
            "900": 0.75,
            "950": 0.55
          }
        },
        naming: {
          description: "Names for tinted neutral palettes: Color/{Name}/{step}. Single words only. Like primitives.paletteNaming, but with 24 names, one every 15 degrees of HSL hue, starting at 0 degrees.",
          hueSpace: "HSL hue of the neutral color, in degrees from 0 to 360.",
          rangeWidth: 15,
          names: [
            "Rosewood",
            "Clay",
            "Taupe",
            "Sand",
            "Khaki",
            "Lichen",
            "Moss",
            "Sage",
            "Celadon",
            "Eucalyptus",
            "Willow",
            "Agave",
            "Glacier",
            "Mist",
            "Slate",
            "Steel",
            "Flint",
            "Storm",
            "Smoke",
            "Heather",
            "Mauve",
            "Thistle",
            "Quartz",
            "Cameo"
          ],
          nameRule: "Name n (from 0) covers the HSL hues from n*15-7.5 up to, but not including, n*15+7.5.",
          achromatic: {
            palette: "Gray"
          },
          order: "Neutral colors are named theme by theme, in theme order.",
          shareWithinDegrees: 1,
          shareRule: "A neutral color whose hue is within shareWithinDegrees of a tinted neutral already named uses that palette.",
          freeNameRule: "Otherwise it takes the name of its range, or the nearest free name in the list, as in primitives.paletteNaming. When all names are taken, generation stops as missing_input."
        }
      },
      brandAnchor: {
        description: "Where the brand color sits in its palette (section 5.2 steps 1 and 3). The brand HEX is always kept exactly.",
        closest: "The brand sits at the step whose targetL is closest to the brand's OKLCH L. Ties go to the darker step.",
        move: "When the brand fails the contrastPairs minimum with a Gray background at that step, it moves one step away from that background, to a step with no pairing: dark text on a light background (500, 700) moves one step lighter (500 to 400, 700 to 600); light text on a dark background (300, 150) moves one step darker (300 to 400, 150 to 200).",
        respace: "After a move, the brand is darker or lighter than its new step's targetL. Usually only its two neighbours on each side change; every other step keeps its targetL. Each re-spaced step takes its chroma from chromaMultiplier at its new L, with no chromaCeiling, so a gamut clamp at its targetL is not carried over. Toward that shift, the first neighbour keeps the usual targetL gap from the brand, and the second goes halfway between it and the next step. On the other side, the two neighbours are spaced evenly between the brand and the next step. A brand that moved from 500 to 400 uses respaceFrom500To400 on the other side instead. The re-spaced steps still meet every contrast minimum, but do not chase targets and report no contrast_target warning.",
        respaceFrom500To400: {
          description: "For a brand that moved from 500 to 400: each listed step sits at this fraction of the way from the brand's L to the targetL of step 100, which stays fixed.",
          fractions: { "300": 0.325, "200": 0.619, "150": 0.845 }
        }
      },
      chromaCeiling: {
        description: "The highest OKLCH chroma a generated step may have, for every hue and every palette. Steps not listed have no ceiling. The brand anchor (the brand HEX itself) and the steps re-spaced around a moved anchor (brandAnchor.respace) are exempt. The contrast adjustment (section 5.4) never raises chroma above it.",
        steps: { "300": 0.14, "400": 0.18 }
      },
      hueOnlyPalette: {
        description: "Status and custom palettes take only the hue of the supplied HEX (section 5.3). They have no anchor step. Each step uses its target L (targetL) and the chroma referenceChroma400 \xD7 chromaMultiplier[step] \xD7 the yellow factor, then chromaCeiling, minChroma, the gamut clamp and the contrast adjustment.",
        referenceChroma400: 0.16,
        yellowBoost: {
          description: "Yellow hues can show much more chroma at light steps than other hues. The yellow factor is 1 + (factor - 1) \xD7 w, where w is 1 for an OKLCH hue from fullFrom to fullTo, falls linearly to 0 at zeroBelow and zeroAbove, and is 0 outside them.",
          factor: 1.6,
          zeroBelow: 65,
          fullFrom: 85,
          fullTo: 105,
          zeroAbove: 125
        },
        shiftNotice: {
          description: "When no step of the palette a status or custom color uses is within maxDistance of the supplied HEX (Euclidean distance in OKLab), the color is reported as hue_only_shift (warning), naming the closest step. The plugin form shows the same notice next to the color.",
          maxDistance: 0.06
        }
      },
      baseColors: {
        "Color/Black": "#000000",
        "Color/White": "#FFFFFF"
      },
      neutralPalette: {
        name: "Gray",
        steps: {
          "950": "#0D0D0D",
          "900": "#141414",
          "850": "#1D1D1D",
          "800": "#242424",
          "700": "#303030",
          "600": "#4D4D4D",
          "500": "#696969",
          "400": "#8C8C8C",
          "300": "#B1B1B1",
          "200": "#C7C7C7",
          "150": "#DBDBDB",
          "100": "#EAEAEA",
          "50": "#F4F4F4"
        }
      },
      paletteNaming: {
        description: "Palette names are never typed by the user. The plugin names each palette from the hue of the supplied HEX. The user never sees or edits these names in the form.",
        hueSpace: "HSL hue of the supplied HEX, in degrees from 0 to 360. Only used for naming; palettes are still generated in OKLCH (section 5.5).",
        rangeWidth: 6,
        names: [
          "Red",
          "Scarlet",
          "Vermilion",
          "Cinnabar",
          "Persimmon",
          "Orange",
          "Tangerine",
          "Apricot",
          "Amber",
          "Gold",
          "Yellow",
          "Citron",
          "Pear",
          "Lime",
          "Chartreuse",
          "Apple",
          "Leaf",
          "Grass",
          "Clover",
          "Fern",
          "Green",
          "Shamrock",
          "Malachite",
          "Emerald",
          "Mint",
          "Jade",
          "Seafoam",
          "Viridian",
          "Lagoon",
          "Teal",
          "Cyan",
          "Turquoise",
          "Capri",
          "Sky",
          "Cerulean",
          "Azure",
          "Cobalt",
          "Sapphire",
          "Ultramarine",
          "Royal",
          "Blue",
          "Iris",
          "Indigo",
          "Hyacinth",
          "Violet",
          "Amethyst",
          "Purple",
          "Grape",
          "Orchid",
          "Plum",
          "Magenta",
          "Fuchsia",
          "Peony",
          "Mulberry",
          "Hibiscus",
          "Rose",
          "Raspberry",
          "Cerise",
          "Crimson",
          "Carmine"
        ],
        nameRule: "names[i] is centered on hue i \xD7 rangeWidth and covers from 3\xB0 below its center up to, but not including, 3\xB0 above it. Example: Red covers 357\xB0 to 3\xB0, Scarlet 3\xB0 to 9\xB0.",
        achromatic: { rule: "A HEX whose R, G and B are equal (white, black, pure grays) has no hue.", palette: "Gray", result: "The role uses the fixed neutral palette (neutralPalette). No palette is generated for it." },
        order: "Colors are named theme by theme, in theme order. Within a theme: brand, then success, danger, warning, info (the status roles in use), then the custom roles in their order.",
        shareWithinDegrees: 1,
        shareRule: "A status or custom color whose hue is within shareWithinDegrees of a palette already named (on the hue circle) uses that palette, in any theme. The palette is generated from the first color that made it. A brand color keeps its exact HEX (section 5.2), so it only shares a palette made by a brand color with the same HEX; otherwise it makes its own palette.",
        freeNameRule: "Otherwise the color makes a new palette named by its hue's range. When that name is already taken, it takes the nearest free name on the circle (counted in names). When the two nearest free names are equally far, the one whose center is closer to 240\xB0 (the colder side) is used. When all names are taken, generation stops as missing_input.",
        similarMaxStepDifference: 0.03,
        similarRule: "After the palettes are generated, each palette is compared with every palette made before it in the naming order. When no step differs from the same step of an earlier palette by more than similarMaxStepDifference (OKLab distance, the measure of hueOnlyPalette.shiftNotice), it is reported as similar_palette (warning) against the closest such palette: the two palettes look almost the same. Hues are not compared, because HSL hues are uneven around the circle. The plugin form shows the same notice next to the color. A brand has priority over the other colors, so a palette made by a brand color is never reported.",
        closeToBrandDegrees: 13,
        closeToBrandRule: "A status or custom color whose OKLCH hue is within closeToBrandDegrees of the brand of its own theme is reported as close_to_brand (warning), also when the two share a palette. The notice is about the other color, never the brand, and the plugin form shows it next to that color. A color with no hue (R, G, and B equal) is left out. A color with this notice gets no similar_palette notice against that brand.",
        rename: "The plugin remembers which color (theme and role) made each palette. When a later run gives that color's palette a new name, and the old name is not used by any palette of the new run, the plugin renames the old palette's variables in place (Color/Old/{step} becomes Color/New/{step}), so layers and aliases that use them are kept. If a variable with the new name already exists, the old palette is not renamed and is reported as orphan_variable. Nothing is deleted."
      },
      contrastPairsRule: "backgroundPalette neutral is the neutral palette of the theme that uses the palette being checked: Color/Gray, or that theme's tinted neutral (neutralTint). A palette used by several themes must meet each pairing against the neutral of every one of them. self is the palette itself. The brand HEX never changes: when the brand fails a self pairing at its own step, the background step of that pairing gets lighter instead (section 5.4 step 2).",
      contrastPairs: [
        { text: 500, background: 100, backgroundPalette: "neutral", minimum: 4.5, target: 4.7 },
        { text: 700, background: 200, backgroundPalette: "neutral", minimum: 7, target: 8 },
        { text: 300, background: 700, backgroundPalette: "neutral", minimum: 4.5, target: 6 },
        { text: 150, background: 700, backgroundPalette: "neutral", minimum: 7, target: 9.5 },
        { text: 500, background: 100, backgroundPalette: "self", minimum: 4.5, target: 4.5 }
      ],
      sizes: [0, 0.5, 1, 2, 4, 6, 8, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 112, 128, 152, 256, 512, 1024],
      opacities: [0, 4, 6, 8, 12, 16, 20, 24, 36, 40, 48, 64, 80, 88, 96]
    },
    inputs: {
      numberOfThemes: {
        scope: "global",
        requirement: "mandatory",
        type: "integer",
        minimum: 1,
        maximum: 26
      },
      themeNames: {
        scope: "global",
        requirement: "optional",
        type: "list of string, one per theme",
        default: "collections.Theme.firstModeName for the first theme; collections.Theme.customModeName for the others, numbered from the second: Custom theme, Custom theme 2, Custom theme 3, ...",
        namePattern: "^[A-Za-z0-9]+( [A-Za-z0-9]+)*$",
        unique: true,
        rule: "Theme n is named by the n-th entry. An empty or missing entry uses the default name, with the lowest number that is free. Renaming follows collections.modeRules.rename."
      },
      includeDark: {
        scope: "global",
        requirement: "optional",
        type: "boolean",
        default: true,
        rule: "When false, the Appearance collection has no Dark mode: no Dark values are written and every check in the Dark mode is skipped. darkCanvasStep and darkTextFillStep are then ignored. Dark-based extra appearances are still allowed; they copy the Dark values of appearance.tokens."
      },
      brandColor: {
        scope: "theme",
        requirement: "mandatory",
        type: "hex",
        name: "brand",
        paletteName: "primitives.paletteNaming"
      },
      neutralColor: {
        scope: "theme",
        requirement: "optional",
        type: "hex",
        default: "#808080",
        rule: "Only its hue is used. A HEX whose R, G and B are equal (a plain gray) gives the fixed Color/Gray palette. Any other HEX gives a tinted neutral (primitives.neutralTint), named from primitives.neutralTint.naming.",
        paletteName: "primitives.neutralTint.naming"
      },
      statusRoles: {
        scope: "global",
        requirement: "optional",
        type: "list",
        allowed: ["success", "danger", "warning", "info"],
        default: ["success", "danger", "warning", "info"],
        rule: "Only the listed status roles exist. For a role that is not listed, no status color is asked for and no token is created: no Primitive palette, no Theme color/{role}/... or alpha tokens, no Appearance token whose name or value uses the role (its third name segment is the role, or a value points to color/{role}/...), and no contrast or status check that uses those tokens. Brand and neutral are always present."
      },
      statusColors: {
        scope: "theme",
        requirement: "mandatory for each role in statusRoles",
        type: "hex",
        roles: ["success", "danger", "warning", "info"],
        paletteName: "primitives.paletteNaming"
      },
      fontFamilies: {
        scope: "theme",
        requirement: "mandatory",
        type: "string"
      },
      fontWeights: {
        scope: "theme",
        requirement: "optional",
        type: "list",
        allowed: "the non-italic styles of the theme's font family, as Figma lists them, with the font's own names (for example Thin, Light, Regular, Medium, Semi Bold, Bold, ExtraBold)",
        default: "the styles of the family that match a Theme weight slot",
        slotMatch: "A Theme weight slot (theme.typography, input:fontWeights.{slot}) uses the selected style whose name equals the slot name when spaces and letter case are ignored. For example Semi Bold and SemiBold both match semibold.",
        rule: "Every selected style becomes a Primitive Typography/Font-weight/{Style}. A slot that matches in no theme is not created. A slot that matches in some themes but not in others is a missing_input error that names the slot and the font families without a match."
      },
      darkCanvasStep: {
        scope: "global",
        requirement: "optional",
        allowed: [950, 900, 850, "black"],
        default: 950
      },
      lightCanvasStep: {
        scope: "global",
        requirement: "optional",
        allowed: ["white", 50],
        default: "white",
        rule: "Applies to Light. See appearance.lightCanvas."
      },
      lightTextFillStep: {
        scope: "global",
        requirement: "optional",
        allowed: [700, 800, 850, 900, 950, "black"],
        default: 700,
        rule: "Applies to Light. See appearance.textFill."
      },
      darkTextFillStep: {
        scope: "global",
        requirement: "optional",
        allowed: [150, 100, 50, "white"],
        default: 150,
        rule: "Applies to Dark. See appearance.textFill."
      },
      customRoles: {
        scope: "global",
        requirement: "optional",
        type: "list of role names",
        default: [],
        namePattern: "^[a-z]+$",
        unique: true,
        reservedNames: [
          "neutral",
          "brand",
          "success",
          "danger",
          "warning",
          "info",
          "base",
          "disabled",
          "input",
          "selected",
          "focus",
          "inverse",
          "shadow",
          "surface",
          "fixed",
          "link"
        ],
        rule: "Each custom role is defined once for the file and gets a color in every theme (customColors). It creates the same tokens and checks as a status color: see theme.customRoles and appearance.customRoles."
      },
      customColors: {
        scope: "theme",
        requirement: "mandatory for each role in customRoles",
        type: "hex",
        paletteName: "primitives.paletteNaming"
      },
      extraAppearances: {
        scope: "global",
        requirement: "optional",
        type: "list of { name, base, canvasStep, textFillStep }",
        default: [],
        defaultName: "Custom appearance",
        namePattern: "^[A-Za-z0-9]+( [A-Za-z0-9]+)*$",
        reservedNames: ["Light", "Dark"],
        unique: true,
        bases: ["Light", "Dark"],
        canvasStep: {
          Light: { allowed: ["white", 50], default: "white" },
          Dark: { allowed: [950, 900, 850, "black"], default: 950 }
        },
        textFillStep: {
          Light: { allowed: [700, 800, 850, 900, 950, "black"], default: 700 },
          Dark: { allowed: [150, 100, 50, "white"], default: 150 }
        },
        rule: "An empty or missing name uses defaultName, numbered like theme names: Custom appearance, Custom appearance 2, Custom appearance 3, ... An extra appearance copies the Light or Dark value of every Appearance token. A Light-based one applies appearance.lightCanvas and a Dark-based one applies appearance.darkCanvas, each with its own canvasStep. Each one also applies appearance.textFill with its own textFillStep. Renaming follows collections.modeRules.rename."
      },
      reservedHueNames: ["Gray", "Black", "White"]
    },
    theme: {
      colorRoles: {
        neutral: { input: "neutralColor", source: "input", default: "Gray", rule: "The theme's neutral palette: Color/Gray, or a tinted neutral (primitives.neutralTint)." },
        brand: { input: "brandColor", source: "input" },
        success: { input: "statusColors.success", source: "input" },
        danger: { input: "statusColors.danger", source: "input" },
        warning: { input: "statusColors.warning", source: "input" },
        info: { input: "statusColors.info", source: "input" }
      },
      colorExpansion: {
        steps: [950, 900, 850, 800, 700, 600, 500, 400, 300, 200, 150, 100, 50],
        pattern: "color/{role}/{step}",
        neutralExtras: { "color/neutral/black": "Color/Black", "color/neutral/white": "Color/White" },
        neutralCount: 15,
        otherRoleCount: 13
      },
      alpha: {
        opacities: [0, 4, 6, 8, 12, 16, 20, 24, 36, 40, 48, 64, 80, 88, 96],
        coloredRoles: ["brand", "danger", "success", "warning", "info"],
        coloredSourceStep: 500,
        coloredNamePattern: "color/{role}/alpha/a{NN}",
        neutralNamePattern: "color/neutral/alpha/{black|white}/a{NN}",
        opacityAssignment: "linked: each alpha token is a composed color with two aliases, its color source and Opacity/{NN} (opacity field), in every theme",
        neutralSource: { black: "Color/Black", white: "Color/White" },
        counts: { perColoredRolePerTheme: 15, neutral: 30, coloredTotalPerTheme: 75 },
        tokens: [
          { name: "color/neutral/alpha/black/a00", colorSource: "Color/Black", opacity: 0 },
          { name: "color/neutral/alpha/black/a04", colorSource: "Color/Black", opacity: 4 },
          { name: "color/neutral/alpha/black/a06", colorSource: "Color/Black", opacity: 6 },
          { name: "color/neutral/alpha/black/a08", colorSource: "Color/Black", opacity: 8 },
          { name: "color/neutral/alpha/black/a12", colorSource: "Color/Black", opacity: 12 },
          { name: "color/neutral/alpha/black/a16", colorSource: "Color/Black", opacity: 16 },
          { name: "color/neutral/alpha/black/a20", colorSource: "Color/Black", opacity: 20 },
          { name: "color/neutral/alpha/black/a24", colorSource: "Color/Black", opacity: 24 },
          { name: "color/neutral/alpha/black/a36", colorSource: "Color/Black", opacity: 36 },
          { name: "color/neutral/alpha/black/a40", colorSource: "Color/Black", opacity: 40 },
          { name: "color/neutral/alpha/black/a48", colorSource: "Color/Black", opacity: 48 },
          { name: "color/neutral/alpha/black/a64", colorSource: "Color/Black", opacity: 64 },
          { name: "color/neutral/alpha/black/a80", colorSource: "Color/Black", opacity: 80 },
          { name: "color/neutral/alpha/black/a88", colorSource: "Color/Black", opacity: 88 },
          { name: "color/neutral/alpha/black/a96", colorSource: "Color/Black", opacity: 96 },
          { name: "color/neutral/alpha/white/a00", colorSource: "Color/White", opacity: 0 },
          { name: "color/neutral/alpha/white/a04", colorSource: "Color/White", opacity: 4 },
          { name: "color/neutral/alpha/white/a06", colorSource: "Color/White", opacity: 6 },
          { name: "color/neutral/alpha/white/a08", colorSource: "Color/White", opacity: 8 },
          { name: "color/neutral/alpha/white/a12", colorSource: "Color/White", opacity: 12 },
          { name: "color/neutral/alpha/white/a16", colorSource: "Color/White", opacity: 16 },
          { name: "color/neutral/alpha/white/a20", colorSource: "Color/White", opacity: 20 },
          { name: "color/neutral/alpha/white/a24", colorSource: "Color/White", opacity: 24 },
          { name: "color/neutral/alpha/white/a36", colorSource: "Color/White", opacity: 36 },
          { name: "color/neutral/alpha/white/a40", colorSource: "Color/White", opacity: 40 },
          { name: "color/neutral/alpha/white/a48", colorSource: "Color/White", opacity: 48 },
          { name: "color/neutral/alpha/white/a64", colorSource: "Color/White", opacity: 64 },
          { name: "color/neutral/alpha/white/a80", colorSource: "Color/White", opacity: 80 },
          { name: "color/neutral/alpha/white/a88", colorSource: "Color/White", opacity: 88 },
          { name: "color/neutral/alpha/white/a96", colorSource: "Color/White", opacity: 96 },
          { name: "color/brand/alpha/a00", role: "brand", opacity: 0 },
          { name: "color/brand/alpha/a04", role: "brand", opacity: 4 },
          { name: "color/brand/alpha/a06", role: "brand", opacity: 6 },
          { name: "color/brand/alpha/a08", role: "brand", opacity: 8 },
          { name: "color/brand/alpha/a12", role: "brand", opacity: 12 },
          { name: "color/brand/alpha/a16", role: "brand", opacity: 16 },
          { name: "color/brand/alpha/a20", role: "brand", opacity: 20 },
          { name: "color/brand/alpha/a24", role: "brand", opacity: 24 },
          { name: "color/brand/alpha/a36", role: "brand", opacity: 36 },
          { name: "color/brand/alpha/a40", role: "brand", opacity: 40 },
          { name: "color/brand/alpha/a48", role: "brand", opacity: 48 },
          { name: "color/brand/alpha/a64", role: "brand", opacity: 64 },
          { name: "color/brand/alpha/a80", role: "brand", opacity: 80 },
          { name: "color/brand/alpha/a88", role: "brand", opacity: 88 },
          { name: "color/brand/alpha/a96", role: "brand", opacity: 96 },
          { name: "color/danger/alpha/a00", role: "danger", opacity: 0 },
          { name: "color/danger/alpha/a04", role: "danger", opacity: 4 },
          { name: "color/danger/alpha/a06", role: "danger", opacity: 6 },
          { name: "color/danger/alpha/a08", role: "danger", opacity: 8 },
          { name: "color/danger/alpha/a12", role: "danger", opacity: 12 },
          { name: "color/danger/alpha/a16", role: "danger", opacity: 16 },
          { name: "color/danger/alpha/a20", role: "danger", opacity: 20 },
          { name: "color/danger/alpha/a24", role: "danger", opacity: 24 },
          { name: "color/danger/alpha/a36", role: "danger", opacity: 36 },
          { name: "color/danger/alpha/a40", role: "danger", opacity: 40 },
          { name: "color/danger/alpha/a48", role: "danger", opacity: 48 },
          { name: "color/danger/alpha/a64", role: "danger", opacity: 64 },
          { name: "color/danger/alpha/a80", role: "danger", opacity: 80 },
          { name: "color/danger/alpha/a88", role: "danger", opacity: 88 },
          { name: "color/danger/alpha/a96", role: "danger", opacity: 96 },
          { name: "color/success/alpha/a00", role: "success", opacity: 0 },
          { name: "color/success/alpha/a04", role: "success", opacity: 4 },
          { name: "color/success/alpha/a06", role: "success", opacity: 6 },
          { name: "color/success/alpha/a08", role: "success", opacity: 8 },
          { name: "color/success/alpha/a12", role: "success", opacity: 12 },
          { name: "color/success/alpha/a16", role: "success", opacity: 16 },
          { name: "color/success/alpha/a20", role: "success", opacity: 20 },
          { name: "color/success/alpha/a24", role: "success", opacity: 24 },
          { name: "color/success/alpha/a36", role: "success", opacity: 36 },
          { name: "color/success/alpha/a40", role: "success", opacity: 40 },
          { name: "color/success/alpha/a48", role: "success", opacity: 48 },
          { name: "color/success/alpha/a64", role: "success", opacity: 64 },
          { name: "color/success/alpha/a80", role: "success", opacity: 80 },
          { name: "color/success/alpha/a88", role: "success", opacity: 88 },
          { name: "color/success/alpha/a96", role: "success", opacity: 96 },
          { name: "color/warning/alpha/a00", role: "warning", opacity: 0 },
          { name: "color/warning/alpha/a04", role: "warning", opacity: 4 },
          { name: "color/warning/alpha/a06", role: "warning", opacity: 6 },
          { name: "color/warning/alpha/a08", role: "warning", opacity: 8 },
          { name: "color/warning/alpha/a12", role: "warning", opacity: 12 },
          { name: "color/warning/alpha/a16", role: "warning", opacity: 16 },
          { name: "color/warning/alpha/a20", role: "warning", opacity: 20 },
          { name: "color/warning/alpha/a24", role: "warning", opacity: 24 },
          { name: "color/warning/alpha/a36", role: "warning", opacity: 36 },
          { name: "color/warning/alpha/a40", role: "warning", opacity: 40 },
          { name: "color/warning/alpha/a48", role: "warning", opacity: 48 },
          { name: "color/warning/alpha/a64", role: "warning", opacity: 64 },
          { name: "color/warning/alpha/a80", role: "warning", opacity: 80 },
          { name: "color/warning/alpha/a88", role: "warning", opacity: 88 },
          { name: "color/warning/alpha/a96", role: "warning", opacity: 96 },
          { name: "color/info/alpha/a00", role: "info", opacity: 0 },
          { name: "color/info/alpha/a04", role: "info", opacity: 4 },
          { name: "color/info/alpha/a06", role: "info", opacity: 6 },
          { name: "color/info/alpha/a08", role: "info", opacity: 8 },
          { name: "color/info/alpha/a12", role: "info", opacity: 12 },
          { name: "color/info/alpha/a16", role: "info", opacity: 16 },
          { name: "color/info/alpha/a20", role: "info", opacity: 20 },
          { name: "color/info/alpha/a24", role: "info", opacity: 24 },
          { name: "color/info/alpha/a36", role: "info", opacity: 36 },
          { name: "color/info/alpha/a40", role: "info", opacity: 40 },
          { name: "color/info/alpha/a48", role: "info", opacity: 48 },
          { name: "color/info/alpha/a64", role: "info", opacity: 64 },
          { name: "color/info/alpha/a80", role: "info", opacity: 80 },
          { name: "color/info/alpha/a88", role: "info", opacity: 88 },
          { name: "color/info/alpha/a96", role: "info", opacity: 96 }
        ]
      },
      typography: {
        "typography/font-family": "input:fontFamilies",
        "typography/font-weight/light": "input:fontWeights.light",
        "typography/font-weight/regular": "input:fontWeights.regular",
        "typography/font-weight/medium": "input:fontWeights.medium",
        "typography/font-weight/semibold": "input:fontWeights.semibold",
        "typography/font-weight/bold": "input:fontWeights.bold"
      },
      customRoles: {
        description: "For every role in inputs.customRoles: the color expansion color/{role}/{step} (13 tokens) aliased per theme to that theme's customColors palette, and the 15 alpha tokens color/{role}/alpha/a{NN} built like a colored role (theme.alpha.coloredSourceStep, coloredNamePattern, linked opacity).",
        input: "customColors.{role}",
        alpha: true
      },
      size: {
        padding: {
          scope: "GAP",
          values: {
            none: "Size/0",
            "3xs": "Size/2",
            "2xs": "Size/4",
            xs: "Size/6",
            sm: "Size/8",
            md: "Size/12",
            lg: "Size/16",
            xl: "Size/20",
            "2xl": "Size/24",
            "3xl": "Size/28",
            "4xl": "Size/32"
          }
        },
        "border-radius": {
          scope: "CORNER_RADIUS",
          values: {
            none: "Size/0",
            "3xs": "Size/2",
            "2xs": "Size/4",
            xs: "Size/6",
            sm: "Size/8",
            md: "Size/12",
            lg: "Size/16",
            xl: "Size/20",
            "2xl": "Size/24",
            "3xl": "Size/28",
            "4xl": "Size/32",
            "5xl": "Size/36",
            "6xl": "Size/40",
            "7xl": "Size/48",
            "8xl": "Size/64",
            full: "Size/1024"
          }
        },
        border: {
          scope: "STROKE_FLOAT",
          values: { sm: "Size/0-5", md: "Size/1", lg: "Size/2", xl: "Size/4", "2xl": "Size/8" }
        }
      }
    },
    appearance: {
      scopesByCategory: {
        "elevation/surface": ["FRAME_FILL", "SHAPE_FILL"],
        "elevation/shadow": ["EFFECT_COLOR"],
        bg: ["FRAME_FILL", "SHAPE_FILL"],
        text: ["TEXT_FILL"],
        border: ["STROKE_COLOR"],
        icon: ["SHAPE_FILL", "TEXT_FILL"]
      },
      contrastCanvas: "color/elevation/surface/canvas",
      order: {
        description: "Order in which Appearance variables are created (and so listed in Figma) and drawn in the tables. Groups follow categories. Inside a group, sub-groups keep their order of first appearance in appearance.tokens; inside a sub-group, tokens follow emphasis, and tokens without an emphasis come after them in their appearance.tokens order.",
        categories: ["elevation", "bg", "text", "border", "icon"],
        emphasis: ["bolder", "bold", "accent", "soft", "softer", "softest"]
      },
      darkCanvas: {
        description: "The Dark mode values in appearance.tokens are for the default canvas step (inputs.darkCanvasStep.default). When the user picks another step, canvasTokens use color/neutral/{step} in Dark, and every followingToken moves its Dark step lighter by the same number of steps along primitives.steps. The step black is not on that scale: with it, the following tokens keep the values they have at 950.",
        canvasTokens: ["color/bg/base", "color/elevation/surface/canvas"],
        followingTokens: [
          "color/bg/brand/softest",
          "color/bg/brand/softer",
          "color/bg/brand/soft",
          "color/bg/danger/softest",
          "color/bg/danger/softer",
          "color/bg/danger/soft",
          "color/bg/info/softest",
          "color/bg/info/softer",
          "color/bg/info/soft",
          "color/bg/neutral/softest",
          "color/bg/neutral/softer",
          "color/bg/neutral/soft",
          "color/bg/selected/softest",
          "color/bg/selected/softer",
          "color/bg/selected/soft",
          "color/bg/success/softest",
          "color/bg/success/softer",
          "color/bg/success/soft",
          "color/bg/warning/softest",
          "color/bg/warning/softer",
          "color/bg/warning/soft",
          "color/elevation/surface/overlay",
          "color/elevation/surface/menu",
          "color/elevation/surface/raised"
        ],
        customRoleFollowingTokens: ["color/bg/{role}/softest", "color/bg/{role}/softer", "color/bg/{role}/soft"]
      },
      textFill: {
        description: "The bolder text and icon step of an appearance. The values in appearance.tokens are for the default steps (inputs.lightTextFillStep.default and inputs.darkTextFillStep.default). With another step, every token below uses that step in that mode, in its own color family. Only neutral has black and white: every other family uses the step in stepsWithoutColor. Bold tokens and color/bg/neutral/bolder do not change. ColorScheme tokens with sameAs follow these tokens as usual.",
        tokens: [
          "color/icon/brand/bolder",
          "color/icon/neutral/bolder",
          "color/text/brand/bolder",
          "color/text/danger/bolder",
          "color/text/info/bolder",
          "color/text/neutral/bolder",
          "color/text/selected/bolder",
          "color/text/success/bolder",
          "color/text/warning/bolder"
        ],
        customRoleTokens: ["color/text/{role}/bolder"],
        stepsWithoutColor: { black: 950, white: 50 }
      },
      lightCanvas: {
        description: "The Light mode values in appearance.tokens are for the default canvas (inputs.lightCanvasStep.default, white). With canvas 50, canvasTokens use color/neutral/50 in Light, and the tokens in valuesByStep.50 take the listed values. No other token changes, and the contrast checks are unchanged.",
        canvasSteps: ["white", 50],
        canvasTokens: ["color/bg/base", "color/elevation/surface/canvas"],
        valuesByStep: {
          "50": {
            "color/elevation/surface/menu": "color/neutral/white",
            "color/elevation/surface/raised": "color/neutral/100"
          }
        }
      },
      customRoles: {
        description: "Appearance tokens for every role in inputs.customRoles, with {role} replaced by the role name. They are ordered by appearance.order after the tokens of appearance.tokens in each group. Their contrast checks are contrastRequired (below, with {role} replaced) and statusPairings, exactly like a status role.",
        tokens: {
          "color/bg/{role}/bold": { Light: "color/{role}/500", Dark: "color/{role}/300" },
          "color/bg/{role}/soft": { Light: "color/{role}/150", Dark: "color/{role}/800" },
          "color/bg/{role}/softer": { Light: "color/{role}/100", Dark: "color/{role}/850" },
          "color/bg/{role}/softest": { Light: "color/{role}/50", Dark: "color/{role}/900" },
          "color/text/{role}/bolder": { Light: "color/{role}/700", Dark: "color/{role}/150" },
          "color/text/{role}/bold": { Light: "color/{role}/500", Dark: "color/{role}/300" },
          "color/border/{role}": { Light: "color/{role}/300", Dark: "color/{role}/500" },
          "color/icon/{role}": { Light: "color/{role}/500", Dark: "color/{role}/300" }
        },
        contrastRequired: [
          { text: "color/text/{role}/bold", background: "color/elevation/surface/canvas", minimum: 4.5 },
          { text: "color/text/{role}/bolder", background: "color/elevation/surface/canvas", minimum: 7 },
          { text: "color/icon/{role}", background: "color/elevation/surface/canvas", minimum: 3 }
        ],
        statusPairings: true
      },
      alphaDependentTokens: [
        "color/bg/disabled",
        "color/border/brand/light",
        "color/border/disabled",
        "color/border/neutral/light",
        "color/elevation/shadow/card",
        "color/elevation/surface/scrim",
        "color/icon/disabled",
        "color/text/disabled"
      ],
      tokens: {
        "color/bg/base": { Light: "color/neutral/white", Dark: "color/neutral/950" },
        "color/bg/brand/accent": { Light: "color/brand/400", Dark: "color/brand/400" },
        "color/bg/brand/bold": { Light: "color/brand/500", Dark: "color/brand/300" },
        "color/bg/brand/soft": { Light: "color/brand/150", Dark: "color/brand/800" },
        "color/bg/brand/softer": { Light: "color/brand/100", Dark: "color/brand/850" },
        "color/bg/brand/softest": { Light: "color/brand/50", Dark: "color/brand/900" },
        "color/bg/danger/bold": { Light: "color/danger/500", Dark: "color/danger/300" },
        "color/bg/danger/soft": { Light: "color/danger/150", Dark: "color/danger/800" },
        "color/bg/danger/softer": { Light: "color/danger/100", Dark: "color/danger/850" },
        "color/bg/danger/softest": { Light: "color/danger/50", Dark: "color/danger/900" },
        "color/bg/disabled": { Light: "color/neutral/alpha/black/a12", Dark: "color/neutral/alpha/white/a16" },
        "color/bg/info/bold": { Light: "color/info/500", Dark: "color/info/300" },
        "color/bg/info/soft": { Light: "color/info/150", Dark: "color/info/800" },
        "color/bg/info/softer": { Light: "color/info/100", Dark: "color/info/850" },
        "color/bg/info/softest": { Light: "color/info/50", Dark: "color/info/900" },
        "color/bg/input": { Light: "color/neutral/white", Dark: "color/neutral/700" },
        "color/bg/neutral/bolder": { Light: "color/neutral/700", Dark: "color/neutral/150" },
        "color/bg/neutral/soft": { Light: "color/neutral/150", Dark: "color/neutral/800" },
        "color/bg/neutral/softer": { Light: "color/neutral/100", Dark: "color/neutral/850" },
        "color/bg/neutral/softest": { Light: "color/neutral/50", Dark: "color/neutral/900" },
        "color/bg/selected/accent": { Light: "color/brand/200", Dark: "color/brand/600" },
        "color/bg/selected/bold": { Light: "color/brand/500", Dark: "color/brand/300" },
        "color/bg/selected/soft": { Light: "color/brand/150", Dark: "color/brand/800" },
        "color/bg/selected/softer": { Light: "color/brand/100", Dark: "color/brand/850" },
        "color/bg/selected/softest": { Light: "color/brand/50", Dark: "color/brand/900" },
        "color/bg/success/bold": { Light: "color/success/500", Dark: "color/success/300" },
        "color/bg/success/soft": { Light: "color/success/150", Dark: "color/success/800" },
        "color/bg/success/softer": { Light: "color/success/100", Dark: "color/success/850" },
        "color/bg/success/softest": { Light: "color/success/50", Dark: "color/success/900" },
        "color/bg/warning/bold": { Light: "color/warning/500", Dark: "color/warning/300" },
        "color/bg/warning/soft": { Light: "color/warning/150", Dark: "color/warning/800" },
        "color/bg/warning/softer": { Light: "color/warning/100", Dark: "color/warning/850" },
        "color/bg/warning/softest": { Light: "color/warning/50", Dark: "color/warning/900" },
        "color/border/brand/heavy": { Light: "color/brand/400", Dark: "color/brand/400" },
        "color/border/brand/light": { Light: "color/brand/alpha/a36", Dark: "color/brand/alpha/a36" },
        "color/border/danger": { Light: "color/danger/300", Dark: "color/danger/500" },
        "color/border/disabled": { Light: "color/neutral/alpha/black/a12", Dark: "color/neutral/alpha/white/a08" },
        "color/border/focus": { Light: "color/brand/500", Dark: "color/brand/400" },
        "color/border/info": { Light: "color/info/300", Dark: "color/info/500" },
        "color/border/inverse": { Light: "color/neutral/white", Dark: "color/neutral/950" },
        "color/border/neutral/heavy": { Light: "color/neutral/400", Dark: "color/neutral/400" },
        "color/border/neutral/light": { Light: "color/neutral/alpha/black/a24", Dark: "color/neutral/alpha/white/a16" },
        "color/border/selected": { Light: "color/brand/400", Dark: "color/brand/400" },
        "color/border/success": { Light: "color/success/300", Dark: "color/success/500" },
        "color/border/warning": { Light: "color/warning/300", Dark: "color/warning/500" },
        "color/elevation/shadow/card": { Light: "color/neutral/alpha/black/a12", Dark: "color/neutral/alpha/white/a00" },
        "color/elevation/surface/canvas": { Light: "color/neutral/white", Dark: "color/neutral/950" },
        "color/elevation/surface/menu": { Light: "color/neutral/50", Dark: "color/neutral/850" },
        "color/elevation/surface/overlay": { Light: "color/neutral/white", Dark: "color/neutral/900" },
        "color/elevation/surface/raised": { Light: "color/neutral/50", Dark: "color/neutral/850" },
        "color/elevation/surface/scrim": { Light: "color/neutral/alpha/black/a48", Dark: "color/neutral/alpha/black/a80" },
        "color/icon/brand/accent": { Light: "color/brand/400", Dark: "color/brand/400" },
        "color/icon/brand/bold": { Light: "color/brand/500", Dark: "color/brand/300" },
        "color/icon/brand/bolder": { Light: "color/brand/700", Dark: "color/brand/150" },
        "color/icon/danger": { Light: "color/danger/500", Dark: "color/danger/300" },
        "color/icon/disabled": { Light: "color/neutral/alpha/black/a24", Dark: "color/neutral/alpha/white/a16" },
        "color/icon/info": { Light: "color/info/500", Dark: "color/info/300" },
        "color/icon/inverse": { Light: "color/neutral/white", Dark: "color/neutral/950" },
        "color/icon/neutral/bold": { Light: "color/neutral/500", Dark: "color/neutral/300" },
        "color/icon/neutral/bolder": { Light: "color/neutral/700", Dark: "color/neutral/150" },
        "color/icon/success": { Light: "color/success/500", Dark: "color/success/300" },
        "color/icon/warning": { Light: "color/warning/500", Dark: "color/warning/300" },
        "color/text/brand/bold": { Light: "color/brand/500", Dark: "color/brand/300" },
        "color/text/brand/bolder": { Light: "color/brand/700", Dark: "color/brand/150" },
        "color/text/danger/bold": { Light: "color/danger/500", Dark: "color/danger/300" },
        "color/text/danger/bolder": { Light: "color/danger/700", Dark: "color/danger/150" },
        "color/text/disabled": { Light: "color/neutral/alpha/black/a24", Dark: "color/neutral/alpha/white/a16" },
        "color/text/fixed/dark": { Light: "color/neutral/700", Dark: "color/neutral/700" },
        "color/text/fixed/light": { Light: "color/neutral/white", Dark: "color/neutral/50" },
        "color/text/info/bold": { Light: "color/info/500", Dark: "color/info/300" },
        "color/text/info/bolder": { Light: "color/info/700", Dark: "color/info/150" },
        "color/text/inverse": { Light: "color/neutral/white", Dark: "color/neutral/900" },
        "color/text/link": { Light: "color/brand/500", Dark: "color/brand/300" },
        "color/text/neutral/bold": { Light: "color/neutral/500", Dark: "color/neutral/300" },
        "color/text/neutral/bolder": { Light: "color/neutral/700", Dark: "color/neutral/150" },
        "color/text/selected/bold": { Light: "color/brand/500", Dark: "color/brand/300" },
        "color/text/selected/bolder": { Light: "color/brand/700", Dark: "color/brand/150" },
        "color/text/success/bold": { Light: "color/success/500", Dark: "color/success/300" },
        "color/text/success/bolder": { Light: "color/success/700", Dark: "color/success/150" },
        "color/text/warning/bold": { Light: "color/warning/500", Dark: "color/warning/300" },
        "color/text/warning/bolder": { Light: "color/warning/700", Dark: "color/warning/150" }
      },
      contrastRequired: [
        { text: "color/text/neutral/bold", background: "color/elevation/surface/canvas", minimum: 4.5 },
        { text: "color/text/neutral/bolder", background: "color/elevation/surface/canvas", minimum: 7 },
        { text: "color/text/brand/bold", background: "color/elevation/surface/canvas", minimum: 4.5 },
        { text: "color/text/brand/bolder", background: "color/elevation/surface/canvas", minimum: 7 },
        { text: "color/text/danger/bold", background: "color/elevation/surface/canvas", minimum: 4.5 },
        { text: "color/text/danger/bolder", background: "color/elevation/surface/canvas", minimum: 7 },
        { text: "color/text/info/bold", background: "color/elevation/surface/canvas", minimum: 4.5 },
        { text: "color/text/info/bolder", background: "color/elevation/surface/canvas", minimum: 7 },
        { text: "color/text/success/bold", background: "color/elevation/surface/canvas", minimum: 4.5 },
        { text: "color/text/success/bolder", background: "color/elevation/surface/canvas", minimum: 7 },
        { text: "color/text/warning/bold", background: "color/elevation/surface/canvas", minimum: 4.5 },
        { text: "color/text/warning/bolder", background: "color/elevation/surface/canvas", minimum: 7 },
        { text: "color/text/link", background: "color/elevation/surface/canvas", minimum: 4.5 },
        { text: "color/icon/neutral/bold", background: "color/elevation/surface/canvas", minimum: 3 },
        { text: "color/icon/neutral/bolder", background: "color/elevation/surface/canvas", minimum: 4.5 },
        { text: "color/icon/brand/bold", background: "color/elevation/surface/canvas", minimum: 3 },
        { text: "color/icon/danger", background: "color/elevation/surface/canvas", minimum: 3 },
        { text: "color/icon/info", background: "color/elevation/surface/canvas", minimum: 3 },
        { text: "color/icon/success", background: "color/elevation/surface/canvas", minimum: 3 },
        { text: "color/icon/warning", background: "color/elevation/surface/canvas", minimum: 3 },
        { text: "color/border/focus", background: "color/elevation/surface/canvas", minimum: 3 }
      ],
      statusPairings: {
        roles: ["danger", "success", "warning", "info"],
        backgrounds: ["softer"],
        "text/bold": 4.5,
        "text/bolder": 7,
        icon: 3
      }
    },
    colorScheme: {
      description: "Material 3 color roles for Android (Jetpack Compose ColorScheme), in the ColorScheme collection. Parallel to Appearance: same modes, values are aliases to Theme tokens. Token names are the Compose names. Figma type: COLOR. Created in the order of tokens.",
      scopesByKind: { bg: ["FRAME_FILL", "SHAPE_FILL"], content: ["TEXT_FILL", "SHAPE_FILL"], line: ["STROKE_COLOR"] },
      slots: {
        description: "Placeholders in role and in token values. {secondary} is the first custom role (inputs.customRoles), {tertiary} the second. A slot with no custom role is not generated.",
        "{secondary}": 0,
        "{tertiary}": 1
      },
      sameAsRule: "A token with sameAs takes, in every mode, the Theme token that this Appearance token has in that mode, after the canvas and text fill rules (appearance.lightCanvas, appearance.darkCanvas, appearance.textFill). So it always matches the Appearance token. When the Appearance token is not generated (a status role turned off), the ColorScheme token is not generated either.",
      ownRule: "A token with Light and Dark lists its own Theme tokens. Every mode uses the value of its base (Light or Dark). With followsDarkCanvas, the Dark value moves lighter by as many steps as the dark canvas step moved from its default, like appearance.darkCanvas.followingTokens, but never lighter than followsDarkCanvasLimit. With the step black they keep the values they have at the default.",
      followsDarkCanvasLimit: 600,
      roleRule: "role names the input role a token belongs to. The token is generated only when that role exists: brand always, danger when it is a status role in use, {secondary} and {tertiary} when that custom role exists. A token without role is always generated.",
      descriptionRule: "Each token's description says what the role is for, in this project's words, based on the Compose ColorScheme documentation. The plugin writes it as the Figma variable's description.",
      contrastRule: "Every pair in contrastRequired is checked in every theme and every mode, on the resolved HEX values (section 5.7), like appearance.contrastRequired. A failure is contrast_minimum (error) for collection ColorScheme and stops generation. A pair whose text or background token is not generated (no tertiary, danger turned off) is skipped. documented: the Compose ColorScheme documentation says the text role is used on top of the background role. usage: Material components use the pair, but the documentation does not name it.",
      contrastRequired: [
        { text: "onPrimary", background: "primary", minimum: 4.5, source: "documented" },
        { text: "onSecondary", background: "secondary", minimum: 4.5, source: "documented" },
        { text: "onTertiary", background: "tertiary", minimum: 4.5, source: "documented" },
        { text: "onError", background: "error", minimum: 4.5, source: "documented" },
        { text: "onPrimaryContainer", background: "primaryContainer", minimum: 4.5, source: "documented" },
        { text: "onSecondaryContainer", background: "secondaryContainer", minimum: 4.5, source: "documented" },
        { text: "onTertiaryContainer", background: "tertiaryContainer", minimum: 4.5, source: "documented" },
        { text: "onErrorContainer", background: "errorContainer", minimum: 4.5, source: "documented" },
        { text: "onBackground", background: "background", minimum: 4.5, source: "documented" },
        { text: "onSurface", background: "surface", minimum: 4.5, source: "documented" },
        { text: "onSurfaceVariant", background: "surface", minimum: 4.5, source: "documented" },
        { text: "inverseOnSurface", background: "inverseSurface", minimum: 4.5, source: "documented" },
        { text: "onPrimaryFixed", background: "primaryFixed", minimum: 4.5, source: "documented" },
        { text: "onPrimaryFixed", background: "primaryFixedDim", minimum: 4.5, source: "documented" },
        { text: "onSecondaryFixed", background: "secondaryFixed", minimum: 4.5, source: "documented" },
        { text: "onSecondaryFixed", background: "secondaryFixedDim", minimum: 4.5, source: "documented" },
        { text: "onTertiaryFixed", background: "tertiaryFixed", minimum: 4.5, source: "documented" },
        { text: "onTertiaryFixed", background: "tertiaryFixedDim", minimum: 4.5, source: "documented" },
        { text: "onPrimaryFixedVariant", background: "primaryFixed", minimum: 4.5, source: "usage" },
        { text: "onPrimaryFixedVariant", background: "primaryFixedDim", minimum: 4.5, source: "usage" },
        { text: "onSecondaryFixedVariant", background: "secondaryFixed", minimum: 4.5, source: "usage" },
        { text: "onSecondaryFixedVariant", background: "secondaryFixedDim", minimum: 4.5, source: "usage" },
        { text: "onTertiaryFixedVariant", background: "tertiaryFixed", minimum: 4.5, source: "usage" },
        { text: "onTertiaryFixedVariant", background: "tertiaryFixedDim", minimum: 4.5, source: "usage" },
        { text: "onSurfaceVariant", background: "surfaceVariant", minimum: 4.5, source: "usage" },
        { text: "inversePrimary", background: "inverseSurface", minimum: 4.5, source: "usage" },
        { text: "onSurface", background: "surfaceBright", minimum: 4.5, source: "usage" },
        { text: "onSurfaceVariant", background: "surfaceBright", minimum: 4.5, source: "usage" },
        { text: "onSurface", background: "surfaceDim", minimum: 4.5, source: "usage" },
        { text: "onSurfaceVariant", background: "surfaceDim", minimum: 4.5, source: "usage" },
        { text: "onSurface", background: "surfaceContainerLowest", minimum: 4.5, source: "usage" },
        { text: "onSurfaceVariant", background: "surfaceContainerLowest", minimum: 4.5, source: "usage" },
        { text: "onSurface", background: "surfaceContainerLow", minimum: 4.5, source: "usage" },
        { text: "onSurfaceVariant", background: "surfaceContainerLow", minimum: 4.5, source: "usage" },
        { text: "onSurface", background: "surfaceContainer", minimum: 4.5, source: "usage" },
        { text: "onSurfaceVariant", background: "surfaceContainer", minimum: 4.5, source: "usage" },
        { text: "onSurface", background: "surfaceContainerHigh", minimum: 4.5, source: "usage" },
        { text: "onSurfaceVariant", background: "surfaceContainerHigh", minimum: 4.5, source: "usage" },
        { text: "onSurface", background: "surfaceContainerHighest", minimum: 4.5, source: "usage" },
        { text: "onSurfaceVariant", background: "surfaceContainerHighest", minimum: 4.5, source: "usage" }
      ],
      tokens: [
        { name: "primary", group: "primary", kind: "bg", role: "brand", sameAs: "color/bg/brand/bold", description: "Main accent: the color seen most often across screens and components." },
        { name: "onPrimary", group: "primary", kind: "content", role: "brand", sameAs: "color/text/inverse", description: "Text and icons on primary." },
        { name: "primaryContainer", group: "primary", kind: "bg", role: "brand", sameAs: "color/bg/brand/soft", description: "Softer primary fill for containers." },
        { name: "onPrimaryContainer", group: "primary", kind: "content", role: "brand", sameAs: "color/text/brand/bolder", description: "Text and icons on primaryContainer." },
        { name: "inversePrimary", group: "primary", kind: "bg", role: "brand", Light: "color/brand/300", Dark: "color/brand/500", description: "Primary color for places using inverse colors, like a snackbar button." },
        { name: "secondary", group: "secondary", kind: "bg", role: "{secondary}", sameAs: "color/bg/{secondary}/bold", description: "Second accent, to add variety and tell parts of the product apart." },
        { name: "onSecondary", group: "secondary", kind: "content", role: "{secondary}", sameAs: "color/text/inverse", description: "Text and icons on secondary." },
        { name: "secondaryContainer", group: "secondary", kind: "bg", role: "{secondary}", sameAs: "color/bg/{secondary}/soft", description: "Softer secondary fill for containers." },
        { name: "onSecondaryContainer", group: "secondary", kind: "content", role: "{secondary}", sameAs: "color/text/{secondary}/bolder", description: "Text and icons on secondaryContainer." },
        { name: "tertiary", group: "tertiary", kind: "bg", role: "{tertiary}", sameAs: "color/bg/{tertiary}/bold", description: "Third accent, to balance the others or draw attention to an element." },
        { name: "onTertiary", group: "tertiary", kind: "content", role: "{tertiary}", sameAs: "color/text/inverse", description: "Text and icons on tertiary." },
        { name: "tertiaryContainer", group: "tertiary", kind: "bg", role: "{tertiary}", sameAs: "color/bg/{tertiary}/soft", description: "Softer tertiary fill for containers." },
        { name: "onTertiaryContainer", group: "tertiary", kind: "content", role: "{tertiary}", sameAs: "color/text/{tertiary}/bolder", description: "Text and icons on tertiaryContainer." },
        { name: "background", group: "surface", kind: "bg", sameAs: "color/bg/base", description: "Color behind scrollable content." },
        { name: "onBackground", group: "surface", kind: "content", sameAs: "color/text/neutral/bolder", description: "Text and icons on background." },
        { name: "surface", group: "surface", kind: "bg", sameAs: "color/elevation/surface/canvas", description: "Color of component surfaces, such as cards, sheets and menus." },
        { name: "onSurface", group: "surface", kind: "content", sameAs: "color/text/neutral/bolder", description: "Text and icons on surface." },
        { name: "surfaceVariant", group: "surface", kind: "bg", sameAs: "color/bg/neutral/soft", description: "Alternative to surface, for similar uses." },
        { name: "onSurfaceVariant", group: "surface", kind: "content", Light: "color/neutral/600", Dark: "color/neutral/200", description: "Secondary text and icons on surface." },
        { name: "surfaceTint", group: "surface", kind: "bg", role: "brand", sameAs: "color/bg/brand/bold", description: "Tint laid over surface by components with tonal elevation." },
        { name: "inverseSurface", group: "surface", kind: "bg", Light: "color/neutral/700", Dark: "color/neutral/100", description: "Strong contrast with surface, for elements sitting on top of it." },
        { name: "inverseOnSurface", group: "surface", kind: "content", sameAs: "color/text/inverse", description: "Text and icons on inverseSurface." },
        { name: "error", group: "error", kind: "bg", role: "danger", sameAs: "color/bg/danger/bold", description: "Signals errors in components, such as invalid text in a field." },
        { name: "onError", group: "error", kind: "content", role: "danger", sameAs: "color/text/inverse", description: "Text and icons on error." },
        { name: "errorContainer", group: "error", kind: "bg", role: "danger", sameAs: "color/bg/danger/soft", description: "Softer error fill for containers." },
        { name: "onErrorContainer", group: "error", kind: "content", role: "danger", sameAs: "color/text/danger/bolder", description: "Text and icons on errorContainer." },
        { name: "outline", group: "outline", kind: "line", sameAs: "color/border/neutral/heavy", description: "Subtle boundary color that adds contrast for accessibility." },
        { name: "outlineVariant", group: "outline", kind: "line", sameAs: "color/border/neutral/light", description: "Decorative boundary color, where strong contrast is not needed." },
        { name: "scrim", group: "outline", kind: "bg", sameAs: "color/elevation/surface/scrim", description: "Color of a scrim that covers content behind a layer." },
        { name: "surfaceBright", group: "surface container", kind: "bg", Light: "color/neutral/white", Dark: "color/neutral/700", followsDarkCanvas: true, description: "Surface variant that is always brighter than surface." },
        { name: "surfaceContainer", group: "surface container", kind: "bg", Light: "color/neutral/100", Dark: "color/neutral/850", followsDarkCanvas: true, description: "Surface variant for component containers, such as cards and menus." },
        { name: "surfaceContainerHigh", group: "surface container", kind: "bg", Light: "color/neutral/150", Dark: "color/neutral/800", followsDarkCanvas: true, description: "Surface container with more emphasis than surfaceContainer." },
        { name: "surfaceContainerHighest", group: "surface container", kind: "bg", Light: "color/neutral/200", Dark: "color/neutral/700", followsDarkCanvas: true, description: "Surface container with more emphasis than surfaceContainerHigh." },
        { name: "surfaceContainerLow", group: "surface container", kind: "bg", Light: "color/neutral/50", Dark: "color/neutral/900", followsDarkCanvas: true, description: "Surface container with less emphasis than surfaceContainer." },
        { name: "surfaceContainerLowest", group: "surface container", kind: "bg", sameAs: "color/elevation/surface/canvas", description: "Surface container with less emphasis than surfaceContainerLow." },
        { name: "surfaceDim", group: "surface container", kind: "bg", Light: "color/neutral/200", Dark: "color/neutral/950", followsDarkCanvas: true, description: "Surface variant that is always dimmer than surface." },
        { name: "primaryFixed", group: "fixed", kind: "bg", role: "brand", Light: "color/brand/100", Dark: "color/brand/100", description: "Primary fill that keeps the same color in light and dark." },
        { name: "primaryFixedDim", group: "fixed", kind: "bg", role: "brand", Light: "color/brand/200", Dark: "color/brand/200", description: "Stronger version of primaryFixed, the same in light and dark." },
        { name: "onPrimaryFixed", group: "fixed", kind: "content", role: "brand", Light: "color/brand/900", Dark: "color/brand/900", description: "Text and icons on primaryFixed or primaryFixedDim." },
        { name: "onPrimaryFixedVariant", group: "fixed", kind: "content", role: "brand", Light: "color/brand/700", Dark: "color/brand/700", description: "Lower-emphasis version of onPrimaryFixed." },
        { name: "secondaryFixed", group: "fixed", kind: "bg", role: "{secondary}", Light: "color/{secondary}/100", Dark: "color/{secondary}/100", description: "Secondary fill that keeps the same color in light and dark." },
        { name: "secondaryFixedDim", group: "fixed", kind: "bg", role: "{secondary}", Light: "color/{secondary}/200", Dark: "color/{secondary}/200", description: "Stronger version of secondaryFixed, the same in light and dark." },
        { name: "onSecondaryFixed", group: "fixed", kind: "content", role: "{secondary}", Light: "color/{secondary}/900", Dark: "color/{secondary}/900", description: "Text and icons on secondaryFixed or secondaryFixedDim." },
        { name: "onSecondaryFixedVariant", group: "fixed", kind: "content", role: "{secondary}", Light: "color/{secondary}/700", Dark: "color/{secondary}/700", description: "Lower-emphasis version of onSecondaryFixed." },
        { name: "tertiaryFixed", group: "fixed", kind: "bg", role: "{tertiary}", Light: "color/{tertiary}/100", Dark: "color/{tertiary}/100", description: "Tertiary fill that keeps the same color in light and dark." },
        { name: "tertiaryFixedDim", group: "fixed", kind: "bg", role: "{tertiary}", Light: "color/{tertiary}/200", Dark: "color/{tertiary}/200", description: "Stronger version of tertiaryFixed, the same in light and dark." },
        { name: "onTertiaryFixed", group: "fixed", kind: "content", role: "{tertiary}", Light: "color/{tertiary}/900", Dark: "color/{tertiary}/900", description: "Text and icons on tertiaryFixed or tertiaryFixedDim." },
        { name: "onTertiaryFixedVariant", group: "fixed", kind: "content", role: "{tertiary}", Light: "color/{tertiary}/700", Dark: "color/{tertiary}/700", description: "Lower-emphasis version of onTertiaryFixed." }
      ]
    },
    validation: {
      reportSchema: {
        check: "string",
        severity: "error | warning",
        collection: "string",
        token: "string",
        mode: "string",
        expected: "string",
        actual: "string | number",
        message: "string"
      },
      checks: {
        error: [
          "missing_input",
          "invalid_hex",
          "unresolved_reference",
          "duplicate_name",
          "naming_grammar",
          "missing_mandatory_token",
          "contrast_minimum",
          "status_pairing"
        ],
        warning: ["contrast_target", "gamut_clamp", "orphan_variable", "orphan_mode", "similar_palette", "close_to_brand", "hue_only_shift"]
      },
      maxAdjustmentsPerPalette: 50
    }
  };

  // src/color.ts
  var HEX_RE = /^#[0-9A-Fa-f]{6}$/;
  function isValidHex(hex) {
    return HEX_RE.test(hex);
  }
  function hexToRgb255(hex) {
    if (!HEX_RE.test(hex)) throw new Error(`invalid_hex: ${hex}`);
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16)
    ];
  }
  function rgb255ToHex(rgb) {
    return "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  function srgbToLinear(v) {
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  function linearToSrgb(c) {
    return c <= 31308e-7 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  }
  function hexToOklch(hex) {
    const [r8, g8, b8] = hexToRgb255(hex);
    const r = srgbToLinear(r8 / 255);
    const g = srgbToLinear(g8 / 255);
    const b = srgbToLinear(b8 / 255);
    const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    const lp = Math.cbrt(l);
    const mp = Math.cbrt(m);
    const sp = Math.cbrt(s);
    const L = 0.2104542553 * lp + 0.793617785 * mp - 0.0040720468 * sp;
    const a = 1.9779984951 * lp - 2.428592205 * mp + 0.4505937099 * sp;
    const bb = 0.0259040371 * lp + 0.7827717662 * mp - 0.808675766 * sp;
    const C2 = Math.hypot(a, bb);
    let H = Math.atan2(bb, a) * 180 / Math.PI;
    if (H < 0) H += 360;
    return { L, C: C2, H };
  }
  function oklchToLinear({ L, C: C2, H }) {
    const a = C2 * Math.cos(H * Math.PI / 180);
    const b = C2 * Math.sin(H * Math.PI / 180);
    const lp = L + 0.3963377774 * a + 0.2158037573 * b;
    const mp = L - 0.1055613458 * a - 0.0638541728 * b;
    const sp = L - 0.0894841775 * a - 1.291485548 * b;
    const l = lp * lp * lp;
    const m = mp * mp * mp;
    const s = sp * sp * sp;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    ];
  }
  var GAMUT_EPS = 1e-9;
  function inGamut(lch) {
    return oklchToLinear(lch).every((c) => c >= -GAMUT_EPS && c <= 1 + GAMUT_EPS);
  }
  function maxChroma(L, H) {
    let lo = 0;
    let hi = 0.5;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut({ L, C: mid, H })) lo = mid;
      else hi = mid;
    }
    return lo;
  }
  function clampChroma(lch) {
    if (inGamut(lch)) return lch;
    return { L: lch.L, C: maxChroma(lch.L, lch.H), H: lch.H };
  }
  function oklchToHex(lch) {
    const lin = oklchToLinear(lch).map((c) => Math.min(1, Math.max(0, c)));
    return rgb255ToHex(lin.map((c) => Math.round(linearToSrgb(c) * 255)));
  }
  function relativeLuminance(hex) {
    const [r, g, b] = hexToRgb255(hex).map((v) => srgbToLinear(v / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrast(hexA, hexB) {
    const ya = relativeLuminance(hexA);
    const yb = relativeLuminance(hexB);
    const hi = Math.max(ya, yb);
    const lo = Math.min(ya, yb);
    return (hi + 0.05) / (lo + 0.05);
  }

  // src/palette.ts
  var STEPS = [950, 900, 850, 800, 700, 600, 500, 400, 300, 200, 150, 100, 50];
  var TARGET_L = {
    950: 0.16,
    900: 0.189,
    850: 0.22,
    800: 0.251,
    700: 0.323,
    600: 0.412,
    500: 0.519,
    400: 0.638,
    300: 0.754,
    200: 0.852,
    150: 0.892,
    100: 0.928,
    50: 0.96
  };
  var CHROMA_MULT = {
    50: 0.3,
    100: 0.43,
    150: 0.55,
    200: 0.68,
    300: 0.87,
    400: 1,
    500: 0.93,
    600: 0.76,
    700: 0.56,
    800: 0.38,
    850: 0.32,
    900: 0.28,
    950: 0.27
  };
  var MIN_CHROMA = 0.01;
  var CHROMA_CEILING = { 300: 0.14, 400: 0.18 };
  var REFERENCE_C400 = 0.16;
  var YELLOW_BOOST = { factor: 1.6, zeroBelow: 65, fullFrom: 85, fullTo: 105, zeroAbove: 125 };
  var SHIFT_NOTICE_DISTANCE = 0.06;
  var MAX_ADJUSTMENTS = 50;
  var RESPACE_FROM_500_TO_400 = { 300: 0.325, 200: 0.619, 150: 0.845 };
  var L_SEARCH_LIMIT = 0.15;
  var SEARCH_STEP = 1e-3;
  var GRAY_HEX = {
    950: "#0D0D0D",
    900: "#141414",
    850: "#1D1D1D",
    800: "#242424",
    700: "#303030",
    600: "#4D4D4D",
    500: "#696969",
    400: "#8C8C8C",
    300: "#B1B1B1",
    200: "#C7C7C7",
    150: "#DBDBDB",
    100: "#EAEAEA",
    50: "#F4F4F4"
  };
  var NEUTRAL_CHROMA = 0.015;
  var NEUTRAL_FADE = { 50: 0.55, 100: 0.75, 150: 0.9, 850: 0.9, 900: 0.75, 950: 0.55 };
  var CONTRAST_PAIRS = [
    { text: 500, bg: 100, bgPalette: "neutral", min: 4.5, target: 4.7 },
    { text: 700, bg: 200, bgPalette: "neutral", min: 7, target: 8 },
    { text: 300, bg: 700, bgPalette: "neutral", min: 4.5, target: 6 },
    { text: 150, bg: 700, bgPalette: "neutral", min: 7, target: 9.5 },
    { text: 500, bg: 100, bgPalette: "self", min: 4.5, target: 4.5 }
  ];
  function minContrast(hex, backgrounds) {
    return Math.min(...backgrounds.map((b) => contrast(hex, b)));
  }
  var r3 = (x) => Math.round(x * 1e3) / 1e3;
  var r1 = (x) => Math.round(x * 10) / 10;
  var r2 = (x) => Math.round(x * 100) / 100;
  function chooseAnchor(L0) {
    let best = STEPS[0];
    let bestD = Infinity;
    for (const s of STEPS) {
      const d = Math.abs(TARGET_L[s] - L0);
      if (d < bestD - 1e-12 || Math.abs(d - bestD) <= 1e-12 && s > best) {
        best = s;
        bestD = d;
      }
    }
    return best;
  }
  function placeAnchor(hex, neutrals = [GRAY_HEX]) {
    const closest = chooseAnchor(hexToOklch(hex).L);
    const i = STEPS.indexOf(closest);
    for (const pair of CONTRAST_PAIRS.filter((x) => x.text === closest && x.bgPalette === "neutral")) {
      if (minContrast(hex, neutrals.map((n) => n[pair.bg])) >= pair.min) continue;
      const darkText = pair.text > pair.bg;
      return { closest, anchor: STEPS[i + (darkText ? 1 : -1)] };
    }
    return { closest, anchor: closest };
  }
  function pairBackgrounds(p, pair) {
    return pair.bgPalette === "self" ? [p.steps[pair.bg].hex] : p.neutrals.map((n) => n[pair.bg]);
  }
  function pairBackgroundLabel(p, pair) {
    const plainGray = p.neutrals.every((n) => n === GRAY_HEX);
    return `${pair.bgPalette === "self" ? p.name : plainGray ? "Gray" : "neutral"} ${pair.bg}`;
  }
  function measure(p, pair) {
    return minContrast(p.steps[pair.text].hex, pairBackgrounds(p, pair));
  }
  function curveChroma(C400, s) {
    var _a;
    return Math.max(Math.min(C400 * CHROMA_MULT[s], (_a = CHROMA_CEILING[s]) != null ? _a : Infinity), MIN_CHROMA);
  }
  function commit(p, s, cand) {
    const clamped = clampChroma(cand);
    if (clamped.C < cand.C - 1e-9) {
      p.warnings.push({
        check: "gamut_clamp",
        step: s,
        message: `Chroma reduced from ${cand.C.toFixed(4)} to ${clamped.C.toFixed(4)} to stay in sRGB.`
      });
    }
    p.steps[s] = { lch: clamped, hex: oklchToHex(clamped) };
  }
  function fixPair(p, pair, threshold, allowChroma) {
    var _a;
    const s = pair.text;
    if (s === p.anchor) return false;
    const cur = p.steps[s].lch;
    const bgs = pairBackgrounds(p, pair);
    const bgL = hexToOklch(bgs[0]).L;
    const dir = cur.L >= bgL ? 1 : -1;
    const others = STEPS.filter((x) => x !== s).map((x) => p.steps[x].lch.L);
    const lower = others.filter((L) => L < cur.L).reduce((a, b) => Math.max(a, b), 0);
    const upper = others.filter((L) => L > cur.L).reduce((a, b) => Math.min(a, b), 1);
    const n = Math.round(L_SEARCH_LIMIT / SEARCH_STEP);
    for (let i = 1; i <= n; i++) {
      const L = r3(cur.L + dir * i * SEARCH_STEP);
      if (L <= lower || L >= upper || L <= 0 || L >= 1) break;
      const cand = clampChroma({ L, C: cur.C, H: cur.H });
      if (minContrast(oklchToHex(cand), bgs) >= threshold) {
        commit(p, s, cand);
        return true;
      }
    }
    if (allowChroma) {
      const maxC = Math.min(maxChroma(cur.L, cur.H), (_a = CHROMA_CEILING[s]) != null ? _a : Infinity);
      const order = [];
      for (let C2 = r3(cur.C); C2 >= MIN_CHROMA - 1e-9; C2 = r3(C2 - SEARCH_STEP)) order.push(C2);
      for (let C2 = r3(cur.C + SEARCH_STEP); C2 <= maxC; C2 = r3(C2 + SEARCH_STEP)) order.push(C2);
      for (const C2 of order) {
        if (C2 < MIN_CHROMA - 1e-9 || C2 > maxC) continue;
        const cand = { L: cur.L, C: C2, H: cur.H };
        if (minContrast(oklchToHex(cand), bgs) >= threshold) {
          commit(p, s, cand);
          return true;
        }
      }
    }
    return false;
  }
  function lightenOwnBackground(p, pair, threshold) {
    const cur = p.steps[pair.bg].lch;
    const upper = STEPS.filter((x) => p.steps[x].lch.L > cur.L).reduce((a, x) => Math.min(a, p.steps[x].lch.L), 1);
    const n = Math.round(L_SEARCH_LIMIT / SEARCH_STEP);
    for (let i = 1; i <= n; i++) {
      const L = r3(cur.L + i * SEARCH_STEP);
      if (L >= upper) break;
      const cand = clampChroma({ L, C: cur.C, H: cur.H });
      if (contrast(p.steps[pair.text].hex, oklchToHex(cand)) >= threshold) {
        commit(p, pair.bg, cand);
        return true;
      }
    }
    return false;
  }
  function calibrate(p) {
    var _a;
    for (const pair of CONTRAST_PAIRS) {
      const ratio = measure(p, pair);
      if (ratio >= pair.min) continue;
      if (p.adjustments >= MAX_ADJUSTMENTS) {
        p.errors.push({
          check: "contrast_minimum",
          step: pair.text,
          message: "Adjustment cap of 50 reached.",
          expected: `>= ${pair.min}`,
          actual: r2(ratio)
        });
        return;
      }
      const fixed = pair.text === p.anchor && pair.bgPalette === "self" ? lightenOwnBackground(p, pair, pair.min) : fixPair(p, pair, pair.min, true);
      if (fixed) {
        p.adjustments++;
      } else {
        p.errors.push({
          check: "contrast_minimum",
          step: pair.text,
          message: `Step ${pair.text} vs ${pairBackgroundLabel(p, pair)}: minimum ${pair.min} not reachable (measured ${measure(p, pair).toFixed(2)}).`,
          expected: `>= ${pair.min}`,
          actual: r2(measure(p, pair))
        });
      }
    }
    if (p.errors.length > 0) return;
    for (const pair of CONTRAST_PAIRS) {
      const ratio = measure(p, pair);
      if (ratio >= pair.target || ((_a = p.respaced) == null ? void 0 : _a.includes(pair.text))) continue;
      if (p.adjustments < MAX_ADJUSTMENTS && fixPair(p, pair, pair.target, false)) {
        p.adjustments++;
      } else {
        p.warnings.push({
          check: "contrast_target",
          step: pair.text,
          message: `Step ${pair.text} vs ${pairBackgroundLabel(p, pair)}: target ${pair.target} not reached (measured ${measure(p, pair).toFixed(2)}).`,
          expected: `>= ${pair.target}`,
          actual: r2(measure(p, pair))
        });
      }
    }
  }
  function buildPalette(name, hex, neutrals = [GRAY_HEX]) {
    const src = hexToOklch(hex);
    const { closest, anchor } = placeAnchor(hex, neutrals);
    const C400 = src.C / CHROMA_MULT[anchor];
    const H = r1(src.H);
    const respacedL = anchor === closest ? {} : respacedLightness(closest, anchor, src.L);
    const p = { name, anchor, steps: {}, warnings: [], errors: [], adjustments: 0, neutrals };
    if (anchor !== closest) p.respaced = Object.keys(respacedL).map(Number);
    for (const s of STEPS) {
      if (s === anchor) {
        p.steps[s] = { lch: { L: src.L, C: src.C, H }, hex: hex.toUpperCase() };
      } else if (s in respacedL) {
        commit(p, s, { L: respacedL[s], C: Math.max(C400 * CHROMA_MULT[s], MIN_CHROMA), H });
      } else {
        commit(p, s, { L: TARGET_L[s], C: curveChroma(C400, s), H });
      }
    }
    calibrate(p);
    return p;
  }
  function respacedLightness(closest, anchor, brandL) {
    const T = TARGET_L;
    const i = STEPS.indexOf(anchor);
    const shift = brandL < T[anchor] ? -1 : 1;
    const toward = (k) => STEPS[i + k * shift];
    const away = (k) => STEPS[i - k * shift];
    const L = {};
    L[toward(1)] = brandL + (T[toward(1)] - T[anchor]);
    L[toward(2)] = (L[toward(1)] + T[toward(3)]) / 2;
    if (closest === 500 && anchor === 400) {
      for (const s of Object.keys(RESPACE_FROM_500_TO_400).map(Number)) {
        L[s] = brandL + (T[100] - brandL) * RESPACE_FROM_500_TO_400[s];
      }
    } else {
      const gap = (T[away(3)] - brandL) / 3;
      L[away(1)] = brandL + gap;
      L[away(2)] = brandL + 2 * gap;
    }
    return Object.fromEntries(Object.entries(L).map(([s, value]) => [s, r3(value)]));
  }
  function yellowFactor(H) {
    const y = YELLOW_BOOST;
    const w = Math.max(0, Math.min(1, (H - y.zeroBelow) / (y.fullFrom - y.zeroBelow), (y.zeroAbove - H) / (y.zeroAbove - y.fullTo)));
    return 1 + (y.factor - 1) * w;
  }
  function buildHuePalette(name, hex, neutrals = [GRAY_HEX]) {
    const H = r1(hexToOklch(hex).H);
    const C400 = REFERENCE_C400 * yellowFactor(H);
    const p = { name, anchor: -1, steps: {}, warnings: [], errors: [], adjustments: 0, neutrals };
    for (const s of STEPS) {
      commit(p, s, { L: TARGET_L[s], C: curveChroma(C400, s), H });
    }
    calibrate(p);
    return p;
  }
  function buildNeutralPalette(name, hex) {
    var _a;
    const H = r1(hexToOklch(hex).H);
    const p = { name, anchor: -1, steps: {}, warnings: [], errors: [], adjustments: 0, neutrals: [] };
    for (const s of STEPS) {
      commit(p, s, { L: hexToOklch(GRAY_HEX[s]).L, C: NEUTRAL_CHROMA * ((_a = NEUTRAL_FADE[s]) != null ? _a : 1), H });
    }
    return p;
  }
  function neutralOf(p) {
    return Object.fromEntries(STEPS.map((s) => [s, p.steps[s].hex]));
  }
  function closestStep(p, hex) {
    const target = lab(hex);
    let best = { step: STEPS[0], hex: p.steps[STEPS[0]].hex, distance: Infinity };
    for (const s of STEPS) {
      const x = lab(p.steps[s].hex);
      const d = Math.hypot(x[0] - target[0], x[1] - target[1], x[2] - target[2]);
      if (d < best.distance) best = { step: s, hex: p.steps[s].hex, distance: d };
    }
    return best;
  }
  function lab(hex) {
    const c = hexToOklch(hex);
    const a = c.H * Math.PI / 180;
    return [c.L, c.C * Math.cos(a), c.C * Math.sin(a)];
  }
  function paletteDifference(p, q) {
    let largest = 0;
    for (const s of STEPS) {
      const x = lab(p.steps[s].hex);
      const y = lab(q.steps[s].hex);
      largest = Math.max(largest, Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]));
    }
    return largest;
  }

  // src/validate.ts
  function validateHex(hex) {
    return isValidHex(hex) ? [] : [{ check: "invalid_hex", message: `"${hex}" is not a #RRGGBB value.` }];
  }

  // src/naming.ts
  function hslHue(hex) {
    const [r, g, b] = hexToRgb255(hex);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === min) return null;
    const d = max - min;
    let h;
    if (max === r) h = (g - b) / d % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  }
  var capitalize = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  function hueDistance(a, b) {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }
  function rangeIndex(hue, width, count) {
    return Math.floor(hue / width + 0.5) % count;
  }
  function assignPaletteNames(naming, achromaticPalette, colors) {
    const names = naming.names;
    const width = naming.rangeWidth;
    const shareWithin = naming.shareWithinDegrees;
    const palettes = [];
    const assignments = [];
    const problems = [];
    const taken = /* @__PURE__ */ new Set();
    for (const c of colors) {
      const hex = c.hex.toUpperCase();
      const hue = hslHue(hex);
      if (hue === null) {
        assignments.push({ source: c.source, hex, palette: achromaticPalette });
        continue;
      }
      const same = c.exact ? palettes.find((p) => p.exact && p.hex === hex) : palettes.filter((p) => hueDistance(p.hue, hue) <= shareWithin).sort((a, b) => hueDistance(a.hue, hue) - hueDistance(b.hue, hue))[0];
      if (same) {
        same.sources.push(c.source);
        assignments.push({ source: c.source, hex, palette: same.name });
        continue;
      }
      const home = rangeIndex(hue, width, names.length);
      let index = -1;
      for (let d = 0; d <= names.length / 2 && index < 0; d++) {
        const sides = [.../* @__PURE__ */ new Set([(home + d) % names.length, (home - d + names.length) % names.length])].filter((i) => !taken.has(names[i])).sort((a, b) => hueDistance(a * width, 240) - hueDistance(b * width, 240));
        if (sides.length > 0) index = sides[0];
      }
      if (index < 0) {
        problems.push(`All ${names.length} palette names are taken, so ${c.label} (${hex}) cannot get a palette.`);
        continue;
      }
      const name = names[index];
      taken.add(name);
      palettes.push({ name, hex, hue, source: c.source, label: c.label, sources: [c.source], exact: !!c.exact });
      assignments.push({ source: c.source, hex, palette: name });
    }
    return { assignments, palettes, problems };
  }
  function similarPalettes(palettes, difference, maxDifference) {
    const out = [];
    palettes.forEach((p, i) => {
      if (p.exact) return;
      const near = palettes.slice(0, i).map((q) => ({ q, d: difference(p.name, q.name) })).filter((x) => x.d <= maxDifference).sort((a, b) => a.d - b.d)[0];
      if (!near) return;
      out.push({
        source: p.source,
        label: p.label,
        palette: p.name,
        otherPalette: near.q.name,
        otherLabel: near.q.label,
        difference: near.d,
        message: `${capitalize(p.label)} (${p.hex}) makes a palette that looks almost the same as the one of ${near.q.label} (${near.q.hex}).`,
        note: `Its palette looks almost the same as the one of ${near.q.label}.`
      });
    });
    return out;
  }
  function paletteRenames(previous, palettes, existing) {
    const used = new Set(palettes.map((p) => p.name));
    const renames = {};
    for (const p of palettes) {
      const old = previous[p.source];
      if (!old || old === p.name || used.has(old) || !existing.has(old) || existing.has(p.name)) continue;
      if (Object.keys(renames).includes(old) || Object.values(renames).includes(p.name)) continue;
      renames[old] = p.name;
    }
    return renames;
  }

  // src/foundations.ts
  var ROLE_INPUTS = ["brand", "success", "danger", "warning", "info"];
  function canvasStepOf(v) {
    return typeof v === "string" && /^\d+$/.test(v) ? Number(v) : v;
  }
  function appearanceModes(spec, inputs) {
    var _a, _b, _c, _d, _e;
    const si = spec.inputs;
    const xa = si.extraAppearances;
    const extras = (_a = inputs.extraAppearances) != null ? _a : [];
    const extraNames = extraAppearanceNames(spec, extras);
    return [
      { name: "Light", base: "Light", canvasStep: canvasStepOf((_b = inputs.lightCanvasStep) != null ? _b : si.lightCanvasStep.default), textFillStep: canvasStepOf((_c = inputs.lightTextFillStep) != null ? _c : si.lightTextFillStep.default) },
      ...inputs.includeDark !== false ? [{ name: "Dark", base: "Dark", canvasStep: canvasStepOf((_d = inputs.darkCanvasStep) != null ? _d : si.darkCanvasStep.default), textFillStep: canvasStepOf((_e = inputs.darkTextFillStep) != null ? _e : si.darkTextFillStep.default) }] : [],
      ...extras.map((a, i) => {
        var _a2, _b2, _c2, _d2;
        return {
          name: extraNames[i],
          base: a.base,
          canvasStep: canvasStepOf((_b2 = a.canvasStep) != null ? _b2 : (_a2 = xa.canvasStep[a.base]) == null ? void 0 : _a2.default),
          textFillStep: canvasStepOf((_d2 = a.textFillStep) != null ? _d2 : (_c2 = xa.textFillStep[a.base]) == null ? void 0 : _c2.default)
        };
      })
    ];
  }
  function appearanceValueFor(spec, name, value, mode, customRoles) {
    const canvased = canvasValueFor(spec, name, value, mode.base, mode.canvasStep, customRoles);
    return textFillValueFor(spec, name, canvased, mode.textFillStep, customRoles);
  }
  function textFillValueFor(spec, name, value, step, customRoles) {
    var _a;
    const rule = spec.appearance.textFill;
    const listed = rule.tokens.includes(name) || customRoles.some((r) => rule.customRoleTokens.some((t) => t.replace("{role}", r) === name));
    if (!listed) return value;
    const family = (_a = value.match(/^color\/([^/]+)\/\d+$/)) == null ? void 0 : _a[1];
    if (!family) return value;
    if (typeof step === "number") return `color/${family}/${step}`;
    return family === "neutral" ? `color/neutral/${step}` : `color/${family}/${rule.stepsWithoutColor[step]}`;
  }
  function canvasValueFor(spec, name, value, base, step, customRoles) {
    var _a, _b, _c;
    const rule = base === "Dark" ? spec.appearance.darkCanvas : spec.appearance.lightCanvas;
    if (rule.canvasTokens.includes(name)) return `color/neutral/${step}`;
    const fixed = (_b = (_a = rule.valuesByStep) == null ? void 0 : _a[String(step)]) == null ? void 0 : _b[name];
    if (fixed) return fixed;
    const following = [
      ...(_c = rule.followingTokens) != null ? _c : [],
      ...customRoles.flatMap((r) => {
        var _a2;
        return ((_a2 = rule.customRoleFollowingTokens) != null ? _a2 : []).map((t) => t.replace("{role}", r));
      })
    ];
    if (!following.includes(name)) return value;
    return shiftWithDarkCanvas(spec, value, step);
  }
  function shiftWithDarkCanvas(spec, value, step) {
    const steps = spec.primitives.steps;
    if (!steps.includes(step)) return value;
    const shift = steps.indexOf(step) - steps.indexOf(spec.inputs.darkCanvasStep.default);
    const m = value.match(/^(.*\/)(\d+)$/);
    if (!m || shift === 0) return value;
    const moved = steps[steps.indexOf(Number(m[2])) + shift];
    return `${m[1]}${moved != null ? moved : "out-of-scale"}`;
  }
  function limitDarkShift(value, limit) {
    const m = value.match(/^(.*\/)(\d+)$/);
    return m && Number(m[2]) < limit ? `${m[1]}${limit}` : value;
  }
  function weightSlotOf(style) {
    return style.replace(/\s+/g, "").toLowerCase();
  }
  function severityOf(spec, check) {
    return spec.validation.checks.warning.includes(check) ? "warning" : "error";
  }
  function isAlias(v) {
    return typeof v === "object" && v !== null && "alias" in v;
  }
  function sizeName(v) {
    return `Size/${String(v).replace(".", "-")}`;
  }
  function orderedColors(spec, inputs) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const n = Math.max(0, Math.min((_a = inputs == null ? void 0 : inputs.numberOfThemes) != null ? _a : 0, (_c = (_b = inputs == null ? void 0 : inputs.themes) == null ? void 0 : _b.length) != null ? _c : 0));
    const modes = themeModeNames(spec, n, inputs == null ? void 0 : inputs.themeNames);
    const statusRoles = (_d = inputs == null ? void 0 : inputs.statusRoles) != null ? _d : spec.inputs.statusRoles.default;
    const customRoles = ((_e = inputs == null ? void 0 : inputs.customRoles) != null ? _e : []).map((r) => String(r != null ? r : "").trim());
    const roles = [...ROLE_INPUTS.filter((r) => r === "brand" || statusRoles.includes(r)), ...customRoles];
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = inputs.themes[i];
      for (const role of roles) {
        const h = customRoles.includes(role) ? (_f = t == null ? void 0 : t.custom) == null ? void 0 : _f[role] : t == null ? void 0 : t[role];
        const hex = (_h = (_g = h == null ? void 0 : h.hex) == null ? void 0 : _g.trim().toUpperCase()) != null ? _h : "";
        if (validateHex(hex).length > 0) continue;
        out.push({
          theme: i,
          role,
          hex,
          source: `${((_i = inputs.themeKeys) == null ? void 0 : _i[i]) || modes[i]}|${role}`,
          label: `the ${role} color of ${modes[i]}`,
          exact: role === "brand"
          // only the brand keeps its HEX (section 5.2)
        });
      }
    }
    return out;
  }
  function colorsCloseToBrand(colors, maxDegrees) {
    const hasHue = (hex) => hslHue(hex) !== null;
    const out = [];
    for (const c of colors) {
      const brand = colors.find((x) => x.theme === c.theme && x.exact);
      if (c.exact || !brand || !hasHue(c.hex) || !hasHue(brand.hex)) continue;
      const degrees = hueDistance(hexToOklch(c.hex).H, hexToOklch(brand.hex).H);
      if (degrees > maxDegrees) continue;
      out.push({
        theme: c.theme,
        role: c.role,
        hex: c.hex,
        label: c.label,
        degrees,
        message: `The hue of ${c.label} (${c.hex}) is close to the brand color (${brand.hex}), so the two may be hard to tell apart.`,
        note: "Its hue is close to the brand color, so the two may be hard to tell apart."
      });
    }
    return out;
  }
  function namePalettes(spec, inputs) {
    var _a, _b, _c;
    const colors = orderedColors(spec, inputs);
    const result = assignPaletteNames(spec.primitives.paletteNaming, spec.primitives.neutralPalette.name, colors);
    const n = Math.max(0, Math.min((_a = inputs == null ? void 0 : inputs.numberOfThemes) != null ? _a : 0, (_c = (_b = inputs == null ? void 0 : inputs.themes) == null ? void 0 : _b.length) != null ? _c : 0));
    const modes = themeModeNames(spec, n, inputs == null ? void 0 : inputs.themeNames);
    const neutralColors = Array.from({ length: n }, (_, i) => {
      var _a2, _b2, _c2, _d;
      const hex = ((_c2 = (_b2 = (_a2 = inputs.themes[i]) == null ? void 0 : _a2.neutral) == null ? void 0 : _b2.hex) == null ? void 0 : _c2.trim().toUpperCase()) || spec.inputs.neutralColor.default;
      return {
        theme: i,
        hex: validateHex(hex).length > 0 ? spec.inputs.neutralColor.default : hex,
        source: `${((_d = inputs.themeKeys) == null ? void 0 : _d[i]) || modes[i]}|neutral`,
        label: `the neutral color of ${modes[i]}`
      };
    });
    const neutralNaming = assignPaletteNames(spec.primitives.neutralTint.naming, spec.primitives.neutralPalette.name, neutralColors);
    const neutralBuilt = neutralNaming.palettes.map((p) => buildNeutralPalette(p.name, p.hex));
    const neutralNameOf = (i) => {
      var _a2, _b2;
      return (_b2 = (_a2 = neutralNaming.assignments.find((a) => {
        var _a3;
        return a.source === ((_a3 = neutralColors[i]) == null ? void 0 : _a3.source);
      })) == null ? void 0 : _a2.palette) != null ? _b2 : spec.primitives.neutralPalette.name;
    };
    const neutralStepsOf = (i) => {
      const tinted = neutralBuilt.find((p) => p.name === neutralNameOf(i));
      return tinted ? neutralOf(tinted) : GRAY_HEX;
    };
    const neutralsFor = (p) => {
      const themesUsing = [...new Set(colors.filter((c) => p.sources.includes(c.source)).map((c) => c.theme))];
      const names = [...new Set(themesUsing.map(neutralNameOf))];
      return names.map((name) => neutralStepsOf(themesUsing.find((i) => neutralNameOf(i) === name)));
    };
    const paletteOf = (theme, role) => {
      var _a2;
      const c = colors.find((x) => x.theme === theme && x.role === role);
      return c ? (_a2 = result.assignments.find((a) => a.source === c.source)) == null ? void 0 : _a2.palette : void 0;
    };
    const built = result.palettes.map((p) => p.exact ? buildPalette(p.name, p.hex, neutralsFor(p)) : buildHuePalette(p.name, p.hex, neutralsFor(p)));
    const byName = (name) => built.find((p) => p.name === name);
    const build = () => built;
    const similar = similarPalettes(
      result.palettes,
      (a, b) => paletteDifference(byName(a), byName(b)),
      spec.primitives.paletteNaming.similarMaxStepDifference
    ).map((s) => {
      const c = colors.find((x) => x.source === s.source);
      return __spreadProps(__spreadValues({}, s), { theme: c.theme, role: c.role });
    });
    const closeToBrand = colorsCloseToBrand(colors, spec.primitives.paletteNaming.closeToBrandDegrees);
    const similarOthers = similar.filter((s) => !(s.otherPalette === paletteOf(s.theme, "brand") && closeToBrand.some((c) => c.theme === s.theme && c.role === s.role)));
    return __spreadProps(__spreadValues({}, result), { similar: similarOthers, closeToBrand, paletteOf, build, colors, neutralNaming, neutralBuilt, neutralNameOf, neutralStepsOf });
  }
  function hueOnlyShifts(naming, built) {
    const out = [];
    for (const c of naming.colors) {
      if (c.exact) continue;
      const name = naming.paletteOf(c.theme, c.role);
      const p = built.find((x) => x.name === name);
      if (!p) continue;
      const near = closestStep(p, c.hex);
      if (near.distance > SHIFT_NOTICE_DISTANCE) {
        out.push({ theme: c.theme, role: c.role, label: c.label, hex: c.hex, palette: p.name, step: near.step, stepHex: near.hex, distance: near.distance });
      }
    }
    return out;
  }
  function buildPlan(spec, inputs) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    const report = [];
    const add = (check, collection, token, mode, expected, actual, message) => {
      report.push({ check, severity: severityOf(spec, check), collection, token, mode, expected, actual, message });
    };
    const hasErrors = () => report.some((r) => r.severity === "error");
    const stop = () => ({ ok: false, collections: [], variables: [], report, manifest: [] });
    const n = inputs == null ? void 0 : inputs.numberOfThemes;
    const { minimum, maximum } = spec.inputs.numberOfThemes;
    if (!Number.isInteger(n) || n < minimum || n > maximum) {
      add(
        "missing_input",
        "Theme",
        "numberOfThemes",
        "Global",
        `${minimum} to ${maximum}`,
        String(n),
        `Number of themes must be a whole number from ${minimum} to ${maximum}.`
      );
      return stop();
    }
    const themeModes = themeModeNames(spec, n, inputs.themeNames);
    const namePattern = new RegExp(spec.inputs.themeNames.namePattern);
    themeModes.forEach((name, i) => {
      if (!namePattern.test(name)) {
        add(
          "missing_input",
          "Theme",
          `theme ${i + 1} name`,
          "Global",
          "letters, numbers and single spaces",
          name,
          `"${name}" is not a valid theme name.`
        );
      } else if (themeModes.indexOf(name) !== i) {
        add("missing_input", "Theme", `theme ${i + 1} name`, "Global", "unique theme name", name, `"${name}" is used by more than one theme.`);
      }
    });
    const checkHue = (h, label, mode) => {
      var _a2, _b2;
      const hex = (_b2 = (_a2 = h == null ? void 0 : h.hex) == null ? void 0 : _a2.trim().toUpperCase()) != null ? _b2 : "";
      if (!hex) add("missing_input", "Primitives", label, mode, "#RRGGBB", "", `The ${label} needs a HEX value.`);
      else for (const p of validateHex(hex)) add(p.check, "Primitives", label, mode, "#RRGGBB", hex, p.message);
    };
    const themes = [];
    for (let i = 0; i < n; i++) {
      const t = (_a = inputs.themes) == null ? void 0 : _a[i];
      const mode = themeModes[i];
      if (!t) {
        add("missing_input", "Theme", "theme inputs", mode, "inputs for this theme", "", `${mode} has no inputs.`);
        continue;
      }
      themes.push(t);
    }
    const sr = spec.inputs.statusRoles;
    const statusRoles = (_b = inputs.statusRoles) != null ? _b : sr.default;
    for (const r of statusRoles) {
      if (!sr.allowed.includes(r)) {
        add("missing_input", "Theme", "statusRoles", "Global", sr.allowed.join(", "), String(r), `"${r}" is not a status role.`);
      }
    }
    const inactiveRoles = sr.allowed.filter((r) => !statusRoles.includes(r));
    const cr = spec.inputs.customRoles;
    const customRoles = ((_c = inputs.customRoles) != null ? _c : []).map((r) => String(r != null ? r : "").trim());
    customRoles.forEach((r, i) => {
      const label = `custom color ${i + 1}`;
      if (!new RegExp(cr.namePattern).test(r)) {
        add(
          "missing_input",
          "Theme",
          label,
          "Global",
          "lowercase letters only",
          r,
          r ? `"${r}" is not a valid color role name. Use lowercase letters only.` : `The ${label} needs a role name.`
        );
      } else if (cr.reservedNames.includes(r)) {
        add("missing_input", "Theme", label, "Global", `not ${cr.reservedNames.join(", ")}`, r, `"${r}" is already used by the spec.`);
      } else if (customRoles.indexOf(r) !== i) {
        add("missing_input", "Theme", label, "Global", "unique role name", r, `"${r}" is used by more than one custom color.`);
      }
    });
    const activeRoles = ROLE_INPUTS.filter((r) => r === "brand" || statusRoles.includes(r));
    const colorOf = (t, role) => {
      var _a2;
      return customRoles.includes(role) ? (_a2 = t.custom) == null ? void 0 : _a2[role] : t[role];
    };
    themes.forEach((t, i) => {
      var _a2, _b2;
      for (const role of [...activeRoles, ...customRoles]) checkHue(colorOf(t, role), `${role} color`, themeModes[i]);
      if ((_b2 = (_a2 = t.neutral) == null ? void 0 : _a2.hex) == null ? void 0 : _b2.trim()) checkHue(t.neutral, "neutral color", themeModes[i]);
    });
    const slots = Object.values(spec.theme.typography).filter((src) => src.startsWith("input:fontWeights.")).map((src) => src.split(".")[1]);
    const weightsByTheme = [];
    themes.forEach((t, i) => {
      var _a2;
      const mode = themeModes[i];
      if (!((_a2 = t.fontFamily) == null ? void 0 : _a2.trim())) {
        add("missing_input", "Theme", "font family", mode, "font family name", "", `${mode} needs a font family.`);
      }
      const available = t.availableWeights;
      const weights = t.fontWeights && t.fontWeights.length > 0 ? t.fontWeights : (available != null ? available : []).filter((w) => slots.includes(weightSlotOf(w)));
      for (const w of weights) {
        if (available && !available.includes(w)) {
          add(
            "missing_input",
            "Theme",
            "font weights",
            mode,
            `a style of ${t.fontFamily}`,
            w,
            `"${w}" is not a style of ${t.fontFamily}.`
          );
        }
      }
      weightsByTheme.push(weights);
    });
    const styleForSlot = (slot, i) => weightsByTheme[i].find((w) => weightSlotOf(w) === slot);
    for (const slot of slots) {
      const missing = themes.filter((_, i) => !styleForSlot(slot, i));
      if (missing.length > 0 && missing.length < themes.length) {
        const fonts = [...new Set(missing.map((t) => t.fontFamily))].join(", ");
        add(
          "missing_input",
          "Theme",
          `typography/font-weight/${slot}`,
          "Global",
          `a ${slot} style in every theme`,
          `no match in ${fonts}`,
          `The ${slot} weight is selected in some themes but has no match in ${fonts}.`
        );
      }
    }
    const includeDark = inputs.includeDark !== false;
    const lightStep = canvasStepOf((_d = inputs.lightCanvasStep) != null ? _d : spec.inputs.lightCanvasStep.default);
    if (!spec.inputs.lightCanvasStep.allowed.includes(lightStep)) {
      const allowed = spec.inputs.lightCanvasStep.allowed.join(", ");
      add("missing_input", "Appearance", "lightCanvasStep", "Global", allowed, String(lightStep), `Light canvas step must be one of ${allowed}.`);
    }
    const darkStep = canvasStepOf((_e = inputs.darkCanvasStep) != null ? _e : spec.inputs.darkCanvasStep.default);
    if (includeDark && !spec.inputs.darkCanvasStep.allowed.includes(darkStep)) {
      const allowed = spec.inputs.darkCanvasStep.allowed.join(", ");
      add("missing_input", "Appearance", "darkCanvasStep", "Global", allowed, String(darkStep), `Dark canvas step must be one of ${allowed}.`);
    }
    const lightFill = canvasStepOf((_f = inputs.lightTextFillStep) != null ? _f : spec.inputs.lightTextFillStep.default);
    if (!spec.inputs.lightTextFillStep.allowed.includes(lightFill)) {
      const allowed = spec.inputs.lightTextFillStep.allowed.join(", ");
      add("missing_input", "Appearance", "lightTextFillStep", "Global", allowed, String(lightFill), `Light text fill step must be one of ${allowed}.`);
    }
    const darkFill = canvasStepOf((_g = inputs.darkTextFillStep) != null ? _g : spec.inputs.darkTextFillStep.default);
    if (includeDark && !spec.inputs.darkTextFillStep.allowed.includes(darkFill)) {
      const allowed = spec.inputs.darkTextFillStep.allowed.join(", ");
      add("missing_input", "Appearance", "darkTextFillStep", "Global", allowed, String(darkFill), `Dark text fill step must be one of ${allowed}.`);
    }
    const xa = spec.inputs.extraAppearances;
    const extraNames = [];
    const seenModes = new Set(xa.reservedNames);
    const filledNames = extraAppearanceNames(spec, (_h = inputs.extraAppearances) != null ? _h : []);
    ((_i = inputs.extraAppearances) != null ? _i : []).forEach((a, i) => {
      var _a2, _b2;
      const label = `extra appearance ${i + 1}`;
      const name = filledNames[i];
      if (!new RegExp(xa.namePattern).test(name)) {
        add(
          "missing_input",
          "Appearance",
          label,
          "Global",
          "letters, numbers and single spaces",
          name,
          `"${name}" is not a valid appearance name.`
        );
      } else if (seenModes.has(name)) {
        add("missing_input", "Appearance", label, "Global", "unique, not Light or Dark", name, `"${name}" is already an appearance.`);
      }
      seenModes.add(name);
      const rule = xa.canvasStep[a == null ? void 0 : a.base];
      if (!rule) {
        add("missing_input", "Appearance", label, "Global", xa.bases.join(" or "), String(a == null ? void 0 : a.base), `The base of "${name}" must be Light or Dark.`);
        return;
      }
      const step = canvasStepOf((_a2 = a.canvasStep) != null ? _a2 : rule.default);
      if (!rule.allowed.includes(step)) {
        add(
          "missing_input",
          "Appearance",
          label,
          "Global",
          rule.allowed.join(", "),
          String(step),
          `The canvas of "${name}" must be one of ${rule.allowed.join(", ")}.`
        );
      }
      const fillRule = xa.textFillStep[a.base];
      const fill2 = canvasStepOf((_b2 = a.textFillStep) != null ? _b2 : fillRule.default);
      if (!fillRule.allowed.includes(fill2)) {
        add(
          "missing_input",
          "Appearance",
          label,
          "Global",
          fillRule.allowed.join(", "),
          String(fill2),
          `The text fill of "${name}" must be one of ${fillRule.allowed.join(", ")}.`
        );
      }
      extraNames.push(name);
    });
    if (hasErrors()) return stop();
    const naming = namePalettes(spec, inputs);
    for (const p of [...naming.problems, ...naming.neutralNaming.problems]) {
      add("missing_input", "Primitives", "palette names", "Default", "a free palette name", "none left", p);
    }
    for (const s of naming.similar) {
      add(
        "similar_palette",
        "Primitives",
        `Color/${s.palette}`,
        themeModes[s.theme],
        `a step more than ${spec.primitives.paletteNaming.similarMaxStepDifference} from Color/${s.otherPalette}`,
        `largest step difference ${s.difference.toFixed(3)}`,
        s.message
      );
    }
    for (const c of naming.closeToBrand) {
      add(
        "close_to_brand",
        "Primitives",
        `Color/${naming.paletteOf(c.theme, c.role)}`,
        themeModes[c.theme],
        `more than ${spec.primitives.paletteNaming.closeToBrandDegrees}\xB0 from the brand's hue`,
        `${c.degrees.toFixed(1)}\xB0`,
        c.message
      );
    }
    if (hasErrors()) return stop();
    const palettes = naming.build();
    for (const h of hueOnlyShifts(naming, palettes)) {
      add(
        "hue_only_shift",
        "Primitives",
        `Color/${h.palette}`,
        themeModes[h.theme],
        `a step within ${SHIFT_NOTICE_DISTANCE} of ${h.hex}`,
        `step ${h.step} ${h.stepHex}`,
        `Only the hue of ${h.label} (${h.hex}) is used. Its palette is closer to ${h.stepHex} (step ${h.step}).`
      );
    }
    for (const p of [...palettes, ...naming.neutralBuilt]) {
      for (const f of [...p.errors, ...p.warnings]) {
        const token = f.step !== void 0 ? `Color/${p.name}/${f.step}` : `Color/${p.name}`;
        if (f.check === "gamut_clamp") {
          add(f.check, "Primitives", token, "Default", "inside sRGB", "chroma reduced", f.message);
        } else {
          add(f.check, "Primitives", token, "Default", (_j = f.expected) != null ? _j : "", (_k = f.actual) != null ? _k : "", f.message);
        }
      }
    }
    if (hasErrors()) return stop();
    const vars = [];
    const primMode = spec.collections.Primitives.modes[0];
    const baseModes = spec.collections.Appearance.modes.filter((m) => includeDark || m !== "Dark");
    const appModes = [...baseModes, ...extraNames];
    const everyTheme = (v) => Object.fromEntries(themeModes.map((m) => [m, v]));
    const prim = (name, type, value, scopes = []) => {
      vars.push({ collection: "Primitives", name, type, scopes, values: { [primMode]: value } });
    };
    for (const [name, hex] of Object.entries(spec.primitives.baseColors)) prim(name, "COLOR", hex);
    const gray = spec.primitives.neutralPalette;
    for (const step of spec.primitives.steps) prim(`Color/${gray.name}/${step}`, "COLOR", gray.steps[String(step)]);
    for (const p of [...naming.neutralBuilt, ...palettes]) {
      for (const step of spec.primitives.steps) prim(`Color/${p.name}/${step}`, "COLOR", p.steps[step].hex);
    }
    for (const v of spec.primitives.sizes) prim(sizeName(v), "FLOAT", v);
    const families = [...new Set(themes.map((t) => t.fontFamily.trim()))];
    for (const f of families) prim(`Typography/Font-family/${f}`, "STRING", f);
    const usedWeights = [...new Set(weightsByTheme.flat())];
    for (const w of usedWeights) prim(`Typography/Font-weight/${w}`, "STRING", w);
    for (const o of spec.primitives.opacities) prim(`Opacity/${o}`, "FLOAT", o, ["OPACITY"]);
    const paletteFor = (role, i) => role === "neutral" ? naming.neutralNameOf(i) : naming.paletteOf(i, role);
    const theme = (name, type, values, scopes = [], alpha = false) => {
      vars.push(__spreadValues({ collection: "Theme", name, type, scopes, values }, alpha ? { alpha } : {}));
    };
    const exp = spec.theme.colorExpansion;
    for (const role of [...Object.keys(spec.theme.colorRoles), ...customRoles]) {
      if (inactiveRoles.includes(role)) continue;
      for (const step of exp.steps) {
        const name = exp.pattern.replace("{role}", role).replace("{step}", String(step));
        theme(name, "COLOR", Object.fromEntries(themeModes.map((m, i) => [m, { alias: `Color/${paletteFor(role, i)}/${step}` }])));
      }
      if (role === "neutral") {
        for (const [name, target] of Object.entries(exp.neutralExtras)) {
          theme(name, "COLOR", everyTheme({ alias: target }));
        }
      }
    }
    const al = spec.theme.alpha;
    const customAlpha = customRoles.flatMap((role) => al.opacities.map((o) => ({
      name: al.coloredNamePattern.replace("{role}", role).replace("{NN}", String(o).padStart(2, "0")),
      role,
      opacity: o
    })));
    for (const t of [...al.tokens, ...customAlpha]) {
      if (t.role && inactiveRoles.includes(t.role)) continue;
      const values = Object.fromEntries(themeModes.map((m, i) => {
        var _a2;
        return [
          m,
          {
            alias: (_a2 = t.colorSource) != null ? _a2 : `Color/${paletteFor(t.role, i)}/${spec.theme.alpha.coloredSourceStep}`,
            opacityAlias: `Opacity/${t.opacity}`
          }
        ];
      }));
      theme(t.name, "COLOR", values, [], true);
    }
    for (const [name, src] of Object.entries(spec.theme.typography)) {
      if (src === "input:fontFamilies") {
        theme(name, "STRING", Object.fromEntries(themeModes.map((m, i) => [m, { alias: `Typography/Font-family/${themes[i].fontFamily.trim()}` }])));
      } else if (src.startsWith("input:fontWeights.")) {
        const slot = src.split(".")[1];
        if (themes.some((_, i) => !styleForSlot(slot, i))) continue;
        theme(name, "STRING", Object.fromEntries(themeModes.map((m, i) => [m, { alias: `Typography/Font-weight/${styleForSlot(slot, i)}` }])));
      }
    }
    for (const [category, group] of Object.entries(spec.theme.size)) {
      for (const [variant, target] of Object.entries(group.values)) {
        theme(`size/${category}/${variant}`, "FLOAT", everyTheme({ alias: target }), [group.scope]);
      }
    }
    const categories = Object.keys(spec.appearance.scopesByCategory).sort((a, b) => b.length - a.length);
    const scopesFor = (name) => {
      const rest = name.replace(/^color\//, "");
      const cat = categories.find((c) => rest.startsWith(c + "/"));
      return cat ? spec.appearance.scopesByCategory[cat] : [];
    };
    const usesInactiveRole = (name) => {
      const map = spec.appearance.tokens[name];
      return inactiveRoles.some((r) => name.split("/")[2] === r || Object.values(map).some((target) => target.startsWith(`color/${r}/`)));
    };
    const appMaps = /* @__PURE__ */ new Map();
    for (const name of Object.keys(spec.appearance.tokens)) {
      if (!usesInactiveRole(name)) appMaps.set(name, spec.appearance.tokens[name]);
    }
    for (const role of customRoles) {
      for (const [tpl, map] of Object.entries(spec.appearance.customRoles.tokens)) {
        appMaps.set(tpl.replace("{role}", role), { Light: map.Light.replace("{role}", role), Dark: map.Dark.replace("{role}", role) });
      }
    }
    const appNames = [...appMaps.keys()];
    const modeBases = appearanceModes(spec, inputs);
    for (const name of appearanceOrder(spec, appNames)) {
      const map = appMaps.get(name);
      const values = {};
      for (const m of modeBases) {
        values[m.name] = { alias: appearanceValueFor(spec, name, map[m.base], m, customRoles) };
      }
      vars.push({ collection: "Appearance", name, type: "COLOR", scopes: scopesFor(name), values });
    }
    const cs = spec.colorScheme;
    const appearanceVar = new Map(vars.filter((v) => v.collection === "Appearance").map((v) => [v.name, v]));
    const slotRole = (r) => r in cs.slots ? customRoles[cs.slots[r]] : r;
    const fill = (text2) => text2.replace(/\{(secondary|tertiary)\}/g, (slot) => {
      var _a2;
      return (_a2 = slotRole(slot)) != null ? _a2 : slot;
    });
    for (const t of cs.tokens) {
      if (t.role) {
        const role = slotRole(t.role);
        if (!role || inactiveRoles.includes(role)) continue;
      }
      const values = {};
      if (t.sameAs) {
        const source = appearanceVar.get(fill(t.sameAs));
        if (!source) continue;
        for (const m of modeBases) values[m.name] = source.values[m.name];
      } else {
        for (const m of modeBases) {
          const own = fill(t[m.base]);
          values[m.name] = { alias: t.followsDarkCanvas && m.base === "Dark" ? limitDarkShift(shiftWithDarkCanvas(spec, own, m.canvasStep), cs.followsDarkCanvasLimit) : own };
        }
      }
      vars.push({ collection: "ColorScheme", name: t.name, type: "COLOR", scopes: cs.scopesByKind[t.kind], values, description: t.description });
    }
    const collections = [
      { name: "Primitives", modes: [primMode] },
      { name: "Theme", modes: themeModes },
      { name: "Appearance", modes: appModes },
      { name: "ColorScheme", modes: appModes }
    ];
    const byName = {
      Primitives: /* @__PURE__ */ new Map(),
      Theme: /* @__PURE__ */ new Map(),
      Appearance: /* @__PURE__ */ new Map(),
      ColorScheme: /* @__PURE__ */ new Map()
    };
    for (const v of vars) {
      if (byName[v.collection].has(v.name)) {
        add("duplicate_name", v.collection, v.name, "", "unique name", v.name, "This name is used more than once.");
      }
      byName[v.collection].set(v.name, v);
      if (!followsGrammar(v)) {
        add("naming_grammar", v.collection, v.name, "", "naming pattern of the spec", v.name, "This name breaks the naming rules.");
      }
    }
    const targetOf = {
      Primitives: null,
      Theme: "Primitives",
      Appearance: "Theme",
      ColorScheme: "Theme"
    };
    for (const v of vars) {
      const modes = collections.find((c) => c.name === v.collection).modes;
      for (const m of modes) {
        const val = v.values[m];
        if (val === void 0) {
          add("missing_mandatory_token", v.collection, v.name, m, "a value", "none", `No value in mode ${m}.`);
          continue;
        }
        if (!isAlias(val)) continue;
        const target = targetOf[v.collection];
        if (!target || !byName[target].has(val.alias)) {
          add(
            "unresolved_reference",
            v.collection,
            v.name,
            m,
            `${target != null ? target : "no alias"}: ${val.alias}`,
            "not found",
            `Cannot resolve ${val.alias}.`
          );
        }
        if (val.opacityAlias !== void 0 && !byName.Primitives.has(val.opacityAlias)) {
          add(
            "unresolved_reference",
            v.collection,
            v.name,
            m,
            `Primitives: ${val.opacityAlias}`,
            "not found",
            `Cannot resolve ${val.opacityAlias}.`
          );
        }
      }
    }
    for (const name of appNames) {
      if (!byName.Appearance.has(name)) {
        add("missing_mandatory_token", "Appearance", name, "", "present", "missing", "Mandatory Appearance token is missing.");
      }
    }
    if (hasErrors()) return stop();
    const alphaDependent = spec.appearance.alphaDependentTokens;
    const resolveAppearance = (name, themeIdx, appMode) => {
      if (alphaDependent.includes(name)) return null;
      const a = byName.Appearance.get(name).values[appMode];
      const t = byName.Theme.get(a.alias);
      if (t.alpha) return null;
      return resolveTheme(t, themeIdx);
    };
    const resolveScheme = (v, themeIdx, mode) => {
      const t = byName.Theme.get(v.values[mode].alias);
      return t.alpha ? null : resolveTheme(t, themeIdx);
    };
    const resolveTheme = (t, themeIdx) => {
      const p = t.values[themeModes[themeIdx]];
      return byName.Primitives.get(p.alias).values[primMode];
    };
    const contrastByToken = /* @__PURE__ */ new Map();
    const modeLabel = (i, m) => n === 1 ? m : `${themeModes[i]} / ${m}`;
    const checkPair = (fg, bg, minimum2, check, i, m) => {
      if (!byName.Appearance.has(fg) || !byName.Appearance.has(bg)) return;
      const fgHex = resolveAppearance(fg, i, m);
      const bgHex = resolveAppearance(bg, i, m);
      if (!fgHex || !bgHex) return;
      const ratio = contrast(fgHex, bgHex);
      const rounded = Math.round(ratio * 100) / 100;
      const key = `${fg}|${m}`;
      if (!contrastByToken.has(key)) contrastByToken.set(key, []);
      contrastByToken.get(key).push({ against: bg, theme: themeModes[i], minimum: minimum2, ratio: rounded, pass: ratio >= minimum2 });
      if (ratio < minimum2) {
        add(check, "Appearance", fg, modeLabel(i, m), `>= ${minimum2}`, rounded, `Minimum contrast not met against ${bg}.`);
      }
    };
    const contrastPairs = [
      ...spec.appearance.contrastRequired,
      ...customRoles.flatMap((role) => spec.appearance.customRoles.contrastRequired.map((p) => __spreadProps(__spreadValues({}, p), {
        text: p.text.replace("{role}", role),
        background: p.background.replace("{role}", role)
      })))
    ];
    for (let i = 0; i < n; i++) {
      for (const m of appModes) {
        for (const pair of contrastPairs) {
          checkPair(pair.text, pair.background, pair.minimum, "contrast_minimum", i, m);
        }
        const sp = spec.appearance.statusPairings;
        for (const role of [...sp.roles.filter((r) => !inactiveRoles.includes(r)), ...customRoles]) {
          for (const bgName of sp.backgrounds) {
            const bg = `color/bg/${role}/${bgName}`;
            checkPair(`color/text/${role}/bold`, bg, sp["text/bold"], "status_pairing", i, m);
            checkPair(`color/text/${role}/bolder`, bg, sp["text/bolder"], "status_pairing", i, m);
            checkPair(`color/icon/${role}`, bg, sp["icon"], "status_pairing", i, m);
          }
        }
      }
    }
    for (let i = 0; i < n; i++) {
      for (const m of appModes) {
        for (const pair of spec.colorScheme.contrastRequired) {
          const fg = byName.ColorScheme.get(pair.text);
          const bg = byName.ColorScheme.get(pair.background);
          if (!fg || !bg) continue;
          const fgHex = resolveScheme(fg, i, m);
          const bgHex = resolveScheme(bg, i, m);
          if (!fgHex || !bgHex) continue;
          const ratio = contrast(fgHex, bgHex);
          const rounded = Math.round(ratio * 100) / 100;
          const key = `${pair.text}|${m}`;
          if (!contrastByToken.has(key)) contrastByToken.set(key, []);
          contrastByToken.get(key).push({ against: pair.background, theme: themeModes[i], minimum: pair.minimum, ratio: rounded, pass: ratio >= pair.minimum });
          if (ratio < pair.minimum) {
            add(
              "contrast_minimum",
              "ColorScheme",
              pair.text,
              modeLabel(i, m),
              `>= ${pair.minimum}`,
              rounded,
              `Minimum contrast not met against ${pair.background}.`
            );
          }
        }
      }
    }
    if (hasErrors()) return stop();
    const manifest = [];
    for (const v of vars) {
      for (const [mode, value] of Object.entries(v.values)) {
        const entry = { collection: v.collection, name: v.name, type: v.type, value, scopes: v.scopes, mode };
        if (v.type === "COLOR" && !v.alpha) {
          if (v.collection === "Primitives") entry.resolved_hex = value;
          if (v.collection === "Theme") entry.resolved_hex = resolveTheme(v, themeModes.indexOf(mode));
          if (v.collection === "Appearance" || v.collection === "ColorScheme") {
            const perTheme = themeModes.map((_, i) => v.collection === "Appearance" ? resolveAppearance(v.name, i, mode) : resolveScheme(v, i, mode));
            if (perTheme.every((h) => h !== null)) {
              entry.resolved_hex = n === 1 ? perTheme[0] : Object.fromEntries(themeModes.map((t, i) => [t, perTheme[i]]));
            }
          }
        }
        const c = contrastByToken.get(`${v.name}|${mode}`);
        if (c) entry.contrast = c;
        manifest.push(entry);
      }
    }
    return { ok: true, collections, variables: vars, report, manifest, palettes: [...naming.neutralNaming.palettes, ...naming.palettes] };
  }
  function appearanceOrder(spec, names) {
    const { categories, emphasis } = spec.appearance.order;
    const specNames = Object.keys(spec.appearance.tokens);
    const reference = [...specNames, ...names.filter((n) => !specNames.includes(n))];
    const pos = new Map(reference.map((n, i) => [n, i]));
    const parentOf = (n) => n.split("/").slice(0, -1).join("/");
    const firstOfParent = /* @__PURE__ */ new Map();
    for (const n of reference) if (!firstOfParent.has(parentOf(n))) firstOfParent.set(parentOf(n), pos.get(n));
    const rank = (list, x) => list.includes(x) ? list.indexOf(x) : list.length;
    const key = (n) => {
      const parts = n.split("/");
      return [rank(categories, parts[1]), firstOfParent.get(parentOf(n)), rank(emphasis, parts[parts.length - 1]), pos.get(n)];
    };
    const keys = new Map(names.map((n) => [n, key(n)]));
    return [...names].sort((a, b) => {
      const ka = keys.get(a), kb = keys.get(b);
      for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
      return 0;
    });
  }
  function themeModeNames(spec, n, names = []) {
    const t = spec.collections.Theme;
    const wanted = Array.from({ length: n }, (_, i) => names[i]);
    return fillDefaultNames(wanted, (i) => i === 0 ? t.firstModeName : t.customModeName);
  }
  function extraAppearanceNames(spec, extras) {
    return fillDefaultNames(extras.map((a) => a == null ? void 0 : a.name), () => spec.inputs.extraAppearances.defaultName);
  }
  function fillDefaultNames(names, defaultOf) {
    const used = new Set(names.map((x) => x == null ? void 0 : x.trim()).filter(Boolean));
    return names.map((x, i) => {
      const typed = x == null ? void 0 : x.trim();
      if (typed) return typed;
      const base = defaultOf(i);
      let name = base;
      for (let k = 2; used.has(name); k++) name = `${base} ${k}`;
      used.add(name);
      return name;
    });
  }
  function followsGrammar(v) {
    const parts = v.name.split("/");
    if (parts.some((p) => p.length === 0 || p.trim() !== p)) return false;
    if (v.collection === "Primitives") return ["Color", "Size", "Typography", "Opacity"].includes(parts[0]);
    const lower = parts.every((p) => /^[a-z0-9-]+$/.test(p));
    if (v.collection === "Theme") return lower && ["color", "typography", "size"].includes(parts[0]);
    if (v.collection === "ColorScheme") return parts.length === 1 && /^[a-z][A-Za-z]*$/.test(parts[0]);
    return lower && parts[0] === "color" && ["elevation", "bg", "text", "border", "icon"].includes(parts[1]);
  }

  // src/previews.ts
  var alphaHex = (percent) => Math.round(percent / 100 * 255).toString(16).padStart(2, "0").toUpperCase();
  function appearancePreviews(spec, inputs, neutral, brand) {
    const black = spec.primitives.baseColors["Color/Black"];
    const white = spec.primitives.baseColors["Color/White"];
    const hexOf = (alias) => {
      const alpha = alias.match(/^color\/neutral\/alpha\/(black|white)\/a(\d+)$/);
      if (alpha) return (alpha[1] === "black" ? black : white) + alphaHex(Number(alpha[2]));
      if (alias === "color/neutral/black") return black;
      if (alias === "color/neutral/white") return white;
      const step = alias.match(/^color\/(neutral|brand)\/(\d+)$/);
      return step ? (step[1] === "neutral" ? neutral : brand)[step[2]] : "";
    };
    return appearanceModes(spec, inputs).map((mode) => {
      const color = (name) => hexOf(appearanceValueFor(spec, name, spec.appearance.tokens[name][mode.base], mode, []));
      return {
        canvas: color("color/bg/base"),
        input: color("color/bg/input"),
        border: color("color/border/neutral/light"),
        icon: color("color/icon/neutral/bolder"),
        text: color("color/text/neutral/bolder"),
        textBold: color("color/text/neutral/bold"),
        brandBolder: color("color/text/brand/bolder"),
        brandBold: color("color/text/brand/bold"),
        softNeutral: color("color/bg/neutral/softest"),
        softBrand: color("color/bg/brand/softest")
      };
    });
  }

  // src/saved-inputs.ts
  var TOKEN_COLLECTIONS = ["Primitives", "Theme", "Appearance", "ColorScheme"];
  function fileHasTokens(collectionOfEachVariable) {
    return collectionOfEachVariable.some((name) => TOKEN_COLLECTIONS.includes(name != null ? name : ""));
  }
  function readSavedInputs(text2) {
    try {
      return text2 ? JSON.parse(text2) : null;
    } catch (e) {
      return null;
    }
  }
  function inputsToShow(hasTokens, fileInputs, olderInputs) {
    var _a;
    if (!hasTokens) return null;
    return (_a = fileInputs != null ? fileInputs : olderInputs) != null ? _a : null;
  }

  // src/tables.ts
  var WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
  function countWord(n) {
    var _a;
    return (_a = WORDS[n]) != null ? _a : String(n);
  }
  function listOf(items) {
    var _a;
    return items.length <= 1 ? (_a = items[0]) != null ? _a : "" : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  }
  function isDarkContext(spec, byKey, themeMode, appMode) {
    const find = (c, name) => byKey.get(`${c}|${name}`);
    const canvas = find("Appearance", spec.appearance.contrastCanvas);
    const themeRef = canvas ? aliasOf(canvas, appMode) : void 0;
    const themeVar = themeRef ? find("Theme", themeRef) : void 0;
    const primRef = themeVar ? aliasOf(themeVar, themeMode) : void 0;
    const primVar = primRef ? find("Primitives", primRef) : void 0;
    const hex = primVar ? Object.values(primVar.values)[0] : void 0;
    if (typeof hex === "string" && isValidHex(hex)) return relativeLuminance(hex) < 0.18;
    return appMode === "Dark";
  }
  function parentPath(name) {
    const parts = name.split("/");
    return parts.length > 1 ? parts.slice(0, -1).join("/") : name;
  }
  function firstTwo(name) {
    return name.split("/").slice(0, 2).join("/");
  }
  function groupBy(vars, key, row2) {
    const groups = [];
    for (const v of vars) {
      const k = key(v);
      let g = groups.find((x) => x.name === k);
      if (!g) groups.push(g = { name: k, rows: [] });
      g.rows.push(row2(v));
    }
    return groups;
  }
  var aliasOf = (v, mode) => {
    const val = v.values[mode];
    return typeof val === "object" ? val.alias : void 0;
  };
  var opacityAliasOf = (v, mode) => {
    const val = v.values[mode];
    return typeof val === "object" ? val.opacityAlias : void 0;
  };
  function buildTables(spec, source) {
    var _a;
    const has = (c) => source.collections.some((x) => x.name === c);
    const modesOf = (c) => {
      var _a2, _b;
      return (_b = (_a2 = source.collections.find((x) => x.name === c)) == null ? void 0 : _a2.modes) != null ? _b : [];
    };
    const colors = (c) => source.variables.filter((v) => v.collection === c && v.type === "COLOR");
    const prim = colors("Primitives");
    const primMode = modesOf("Primitives")[0];
    const ramps = new Set(prim.map((v) => v.name.split("/")).filter((p) => p.length === 3).map((p) => p[1])).size;
    const primitives = {
      collection: "Primitives",
      count: prim.length,
      description: "The source palettes. Absolute color values before semantic meaning.",
      modesLabel: "EXPLICIT MODE",
      modes: primMode,
      notation: "HEX",
      info: `${ramps} tonal ramps \xD7 ${spec.primitives.steps.length} steps, plus Black and White. Token names retain their source capitalization. Swatches are bound to the original Primitives variables in ${primMode} mode.`,
      nameHeader: "FULL TOKEN NAME",
      columns: ["VALUE", "HEX"],
      groups: groupBy(prim, (v) => parentPath(v.name), (v) => ({ name: v.name, cells: [{ dark: false }] }))
    };
    const themeModes = modesOf("Theme");
    const many = themeModes.length > 1;
    const theme = {
      collection: "Theme",
      count: colors("Theme").length,
      description: themeModes.length === 2 ? "Semantic palettes, compared side by side across both themes." : many ? `Semantic palettes, compared side by side across all ${themeModes.length} themes.` : "Semantic palettes, each role resolved to its Primitive.",
      modesLabel: many ? "EXPLICIT MODES" : "EXPLICIT MODE",
      modes: themeModes.join(" / "),
      notation: "Primitive color token, primitive opacity token (optional)",
      info: (many ? `Each row is one source variable. The ${countWord(themeModes.length).toLowerCase()} columns resolve that same variable in ${listOf(themeModes)}. ` : `Each row is one source variable, resolved in ${(_a = themeModes[0]) != null ? _a : "the first theme"}. `) + "Arrows show exact alias targets; literal alpha colors retain their source opacity. Swatches sit on a light neutral substrate.",
      nameHeader: "TOKEN NAME AND DESCRIPTION",
      columns: themeModes.map((m) => m.toUpperCase()),
      groups: groupBy(colors("Theme"), (v) => firstTwo(v.name), (v) => ({
        name: v.name,
        cells: themeModes.map((m) => ({
          themeMode: m,
          dark: false,
          ref: aliasOf(v, m),
          // Alpha tokens: the opacity link actually stored on the variable.
          opacityRef: opacityAliasOf(v, m)
        }))
      }))
    };
    const appModes = modesOf("Appearance");
    const contexts = themeModes.flatMap((t) => appModes.map((a) => ({ t, a })));
    const byKey = new Map(source.variables.map((v) => [`${v.collection}|${v.name}`, v]));
    const darkOf = new Map(contexts.map(({ t, a }) => [`${t}|${a}`, isDarkContext(spec, byKey, t, a)]));
    const appVars = appearanceOrder(spec, colors("Appearance").map((v) => v.name)).map((n) => byKey.get(`Appearance|${n}`));
    const appGroups = groupBy(appVars, (v) => firstTwo(v.name), (v) => ({
      name: v.name,
      cells: contexts.map(({ t, a }) => ({ themeMode: t, appMode: a, dark: darkOf.get(`${t}|${a}`), ref: aliasOf(v, a) }))
    }));
    const appearance = {
      collection: "Appearance",
      count: colors("Appearance").length,
      description: "Application roles across every theme and appearance combination.",
      modesLabel: "EXPLICIT MODES",
      modes: appModes.join(" / "),
      notation: "Theme color token",
      info: `${countWord(contexts.length)} contexts per token. Read each alias chain from Mode \u2192 Theme \u2192 Primitives; every value and bound swatch uses the same explicit theme and appearance. Identical values are repeated so no combination is implicit. Literal colors are labeled directly.`,
      nameHeader: "TOKEN NAME AND DESCRIPTION",
      columns: contexts.map(({ t, a }) => `${t} ${a}`.toUpperCase()),
      groups: appGroups
    };
    const csModes = modesOf("ColorScheme");
    const csContexts = themeModes.flatMap((t) => csModes.map((a) => ({ t, a })));
    const csSpec = spec.colorScheme.tokens;
    const rank = (name) => {
      const i = csSpec.findIndex((x) => x.name === name);
      return i < 0 ? csSpec.length : i;
    };
    const csVars = [...colors("ColorScheme")].sort((a, b) => rank(a.name) - rank(b.name));
    const colorScheme = {
      collection: "ColorScheme",
      count: csVars.length,
      description: "Material 3 color roles for Android (Jetpack Compose ColorScheme), across every theme and appearance.",
      modesLabel: "EXPLICIT MODES",
      modes: csModes.join(" / "),
      notation: "Theme color token",
      info: `${countWord(csContexts.length)} contexts per token. Names are the Compose names. Read each alias chain from Mode \u2192 Theme \u2192 Primitives; roles that match an Appearance token use the same Theme token in every mode.`,
      nameHeader: "TOKEN NAME AND DESCRIPTION",
      columns: csContexts.map(({ t, a }) => `${t} ${a}`.toUpperCase()),
      groups: groupBy(csVars, (v) => {
        var _a2, _b;
        return (_b = (_a2 = csSpec.find((x) => x.name === v.name)) == null ? void 0 : _a2.group) != null ? _b : "other";
      }, (v) => ({
        name: v.name,
        cells: csContexts.map(({ t, a }) => {
          var _a2;
          return {
            themeMode: t,
            appMode: a,
            dark: (_a2 = darkOf.get(`${t}|${a}`)) != null ? _a2 : isDarkContext(spec, byKey, t, a),
            ref: aliasOf(v, a)
          };
        })
      }))
    };
    return [primitives, theme, appearance, colorScheme].filter((t) => has(t.collection));
  }

  // src/export.ts
  var EXPORT_VERSION = 1;
  function exportName(name, options) {
    let parts = name.split("/");
    if (!options.keepColorPrefix && parts[0] === "color") parts = parts.slice(1);
    const words = parts.flatMap((p) => p.split("-")).filter(Boolean);
    const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
    switch (options.naming) {
      case "dot":
        return parts.join(".");
      case "pascal":
        return words.map(cap).join("");
      case "camel":
        return words.map((w, i) => i === 0 ? w : cap(w)).join("");
      case "kebab":
        return "--" + words.join("-");
    }
  }
  function themeResolver(source) {
    const byName = (c) => new Map(source.variables.filter((v) => v.collection === c).map((v) => [v.name, v]));
    const prim = byName("Primitives");
    const theme = byName("Theme");
    const primHex = (name) => {
      const v = prim.get(name);
      const value = v ? Object.values(v.values)[0] : void 0;
      return typeof value === "string" && /^#[0-9A-F]{6}([0-9A-F]{2})?$/i.test(value) ? value.toUpperCase() : null;
    };
    const alphaHex2 = (name) => {
      const v = prim.get(name);
      const value = v ? Object.values(v.values)[0] : void 0;
      if (typeof value !== "number") return null;
      return Math.round(Math.min(100, Math.max(0, value)) / 100 * 255).toString(16).padStart(2, "0").toUpperCase();
    };
    const themeHex = (name, themeMode) => {
      var _a;
      const value = (_a = theme.get(name)) == null ? void 0 : _a.values[themeMode];
      if (typeof value === "string") return value.toUpperCase();
      if (!value || typeof value !== "object") return null;
      const base = value.alias.startsWith("#") ? value.alias.toUpperCase() : primHex(value.alias);
      if (!base) return null;
      if (value.opacityAlias === void 0) return base;
      const a = alphaHex2(value.opacityAlias);
      return a === null ? null : base.slice(0, 7) + (a === "FF" ? "" : a);
    };
    return themeHex;
  }
  function buildAppearanceExport(source, options) {
    const problems = [];
    const data = { version: EXPORT_VERSION, themes: {} };
    const modesOf = (c) => {
      var _a, _b;
      return (_b = (_a = source.collections.find((x) => x.name === c)) == null ? void 0 : _a.modes) != null ? _b : [];
    };
    const themeModes = modesOf("Theme");
    const appModes = modesOf("Appearance");
    if (appModes.length === 0) return { data, problems: ["There is no Appearance collection in this file. Generate tokens first."] };
    if (themeModes.length === 0) return { data, problems: ["There is no Theme collection in this file. Generate tokens first."] };
    const themeHex = themeResolver(source);
    const appearance = source.variables.filter((v) => v.collection === "Appearance" && v.type === "COLOR").sort((a, b) => exportName(a.name, options).localeCompare(exportName(b.name, options)));
    const seen = /* @__PURE__ */ new Map();
    const exported = appearance.filter((v) => {
      const key = exportName(v.name, options);
      const other = seen.get(key);
      if (other) {
        problems.push(`${v.name} and ${other} both become "${key}". ${v.name} was left out.`);
        return false;
      }
      seen.set(key, v.name);
      return true;
    });
    for (const t of themeModes) {
      const appearances = {};
      for (const m of appModes) {
        const tokens = {};
        for (const v of exported) {
          const value = v.values[m];
          const hex = typeof value === "string" ? value.toUpperCase() : value && typeof value === "object" ? themeHex(value.alias, t) : null;
          if (hex) tokens[exportName(v.name, options)] = hex;
          else problems.push(`${v.name} (${t}, ${m}) could not be resolved to a color and was left out.`);
        }
        appearances[m] = tokens;
      }
      data.themes[t] = { appearances };
    }
    return { data, problems };
  }
  function exportFiles(data, split, prefix = "appearance-tokens") {
    if (split === "all") return [{ fileName: `${prefix}.json`, data }];
    const used = /* @__PURE__ */ new Set();
    return Object.entries(data.themes).map(([theme, content]) => {
      const slug = theme.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "theme";
      let fileName = `${prefix}-${slug}.json`;
      for (let n = 2; used.has(fileName); n++) fileName = `${prefix}-${slug}-${n}.json`;
      used.add(fileName);
      return { fileName, data: { version: data.version, themes: { [theme]: content } } };
    });
  }
  function buildColorSchemeExport(source) {
    var _a;
    const problems = [];
    const data = { version: EXPORT_VERSION, themes: {} };
    const dark = {};
    const modesOf = (c) => {
      var _a2, _b;
      return (_b = (_a2 = source.collections.find((x) => x.name === c)) == null ? void 0 : _a2.modes) != null ? _b : [];
    };
    const themeModes = modesOf("Theme");
    const modes = modesOf("ColorScheme");
    if (modes.length === 0) return { data, dark, problems: ["There is no ColorScheme collection in this file. Generate tokens first."] };
    if (themeModes.length === 0) return { data, dark, problems: ["There is no Theme collection in this file. Generate tokens first."] };
    const themeHex = themeResolver(source);
    const roles = source.variables.filter((v) => v.collection === "ColorScheme" && v.type === "COLOR");
    for (const t of themeModes) {
      const appearances = {};
      dark[t] = {};
      for (const m of modes) {
        const tokens = {};
        for (const v of roles) {
          const value = v.values[m];
          const hex = typeof value === "string" ? value.toUpperCase() : value && typeof value === "object" ? themeHex(value.alias, t) : null;
          if (hex) tokens[v.name] = hex;
          else problems.push(`${v.name} (${t}, ${m}) could not be resolved to a color and was left out.`);
        }
        appearances[m] = tokens;
        const surface = (_a = tokens.surface) == null ? void 0 : _a.slice(0, 7);
        dark[t][m] = surface && isValidHex(surface) ? relativeLuminance(surface) < 0.18 : m === "Dark";
      }
      data.themes[t] = { appearances };
    }
    return { data, dark, problems };
  }
  function kotlinWord(text2) {
    return text2.split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  }
  function kotlinColor(hex) {
    const h = hex.replace("#", "").toUpperCase();
    return `Color(0x${h.length === 8 ? h.slice(6) + h.slice(0, 6) : "FF" + h})`;
  }
  var KOTLIN_PACKAGE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;
  function kotlinFiles(exp, split, packageName, knownRoles) {
    const problems = [];
    let pkg = packageName.trim();
    if (!KOTLIN_PACKAGE.test(pkg)) {
      problems.push(`"${pkg}" is not a valid Kotlin package name, so com.example.ui.theme was used.`);
      pkg = "com.example.ui.theme";
    }
    const unknown = /* @__PURE__ */ new Set();
    const usedNames = /* @__PURE__ */ new Set();
    const schemesOf = (theme) => Object.entries(exp.data.themes[theme].appearances).map(([mode, tokens]) => {
      var _a;
      let name = `${kotlinWord(theme)}${kotlinWord(mode)}ColorScheme`;
      if (!/^[A-Za-z]/.test(name)) name = `Scheme${name}`;
      for (let n = 2; usedNames.has(name); n++) name = `${kotlinWord(theme)}${kotlinWord(mode)}${n}ColorScheme`;
      usedNames.add(name);
      const args = Object.entries(tokens).filter(([role]) => knownRoles.includes(role) || (unknown.add(role), false)).map(([role, hex]) => `    ${role} = ${kotlinColor(hex)},`);
      const fn = ((_a = exp.dark[theme]) == null ? void 0 : _a[mode]) ? "darkColorScheme" : "lightColorScheme";
      return `// ${theme}, ${mode}
val ${name} = ${fn}(
${args.join("\n")}
)
`;
    }).join("\n");
    const header = `// Generated by the Tokenseed Figma plugin from the ColorScheme variables. Do not edit by hand.
package ${pkg}

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color

`;
    const themes = Object.keys(exp.data.themes);
    const files = split === "all" ? [{ fileName: "ColorSchemes.kt", text: header + themes.map(schemesOf).join("\n") }] : themes.map((t) => ({ fileName: `${kotlinWord(t) || "Theme"}ColorScheme.kt`, text: header + schemesOf(t) }));
    const seen = /* @__PURE__ */ new Set();
    for (const f of files) {
      const base = f.fileName.replace(/\.kt$/, "");
      for (let n = 2; seen.has(f.fileName); n++) f.fileName = `${base}${n}.kt`;
      seen.add(f.fileName);
    }
    for (const role of unknown) problems.push(`${role} is not a Compose ColorScheme role, so it was left out of the Kotlin file.`);
    return { files, problems };
  }

  // src/color-maps.ts
  var MAP_WIDTH = 1872;
  var MAP_HEIGHT = 1272;
  var MAP_BACKGROUND = "surfaceContainer";
  function accentColumn(role, Role, x) {
    const on = `on${Role}`;
    const container = `${role}Container`;
    const onContainer = `on${Role}Container`;
    return [
      { role, labelRole: on, label: Role, x, y: 104, w: 392, h: 102 },
      { role: on, labelRole: role, label: `On ${Role}`, x, y: 206, w: 392, h: 80 },
      { role: container, labelRole: onContainer, label: `${Role} Container`, x, y: 294, w: 392, h: 102 },
      { role: onContainer, labelRole: on, label: `On ${Role} Container`, x, y: 396, w: 392, h: 80 }
    ];
  }
  function fixedColumn(role, Role, x) {
    const fixed = `${role}Fixed`;
    const onFixed = `on${Role}Fixed`;
    return [
      { role: fixed, labelRole: onFixed, label: `${Role}
Fixed`, x, y: 508, w: 196, h: 112 },
      { role: `${role}FixedDim`, labelRole: onFixed, label: `${Role}
Fixed Dim`, x: x + 196, y: 508, w: 196, h: 112 },
      { role: onFixed, labelRole: fixed, label: `On ${Role} Fixed`, x, y: 620, w: 392, h: 72 },
      { role: `on${Role}FixedVariant`, labelRole: fixed, label: `On ${Role} Fixed Variant`, x, y: 692, w: 392, h: 72 }
    ];
  }
  var MAP_BLOCKS = [
    ...accentColumn("primary", "Primary", 128),
    ...accentColumn("secondary", "Secondary", 528),
    ...accentColumn("tertiary", "Tertiary", 928),
    ...accentColumn("error", "Error", 1352),
    ...fixedColumn("primary", "Primary", 128),
    ...fixedColumn("secondary", "Secondary", 528),
    ...fixedColumn("tertiary", "Tertiary", 928),
    // Surfaces.
    { role: "surfaceDim", labelRole: "onSurface", label: "Surface Dim", x: 128, y: 796, w: 397.333, h: 130 },
    { role: "surface", labelRole: "onSurface", label: "Surface", x: 525.333, y: 796, w: 397.333, h: 130 },
    { role: "surfaceBright", labelRole: "onSurface", label: "Surface Bright", x: 922.667, y: 796, w: 397.333, h: 130 },
    { role: "surfaceContainerLowest", labelRole: "onSurface", label: "Surface\nContainer\nLowest", x: 128, y: 934, w: 238.4, h: 146 },
    { role: "surfaceContainerLow", labelRole: "onSurface", label: "Surface\nContainer Low", x: 366.4, y: 934, w: 238.4, h: 146 },
    { role: "surfaceContainer", labelRole: "onSurface", label: "Surface\nContainer", x: 604.8, y: 934, w: 238.4, h: 146 },
    { role: "surfaceContainerHigh", labelRole: "onSurface", label: "Surface\nContainer High", x: 843.2, y: 934, w: 238.4, h: 146 },
    { role: "surfaceContainerHighest", labelRole: "onSurface", label: "Surface\nContainer\nHighest", x: 1081.6, y: 934, w: 238.4, h: 146 },
    // Text and lines on surfaces.
    { role: "onSurface", labelRole: "inverseOnSurface", label: "On Surface", x: 128, y: 1088, w: 298, h: 80 },
    { role: "onSurfaceVariant", labelRole: "inverseOnSurface", label: "On Surface Variant", x: 426, y: 1088, w: 298, h: 80 },
    { role: "outline", labelRole: "inverseOnSurface", label: "Outline", x: 724, y: 1088, w: 298, h: 80 },
    { role: "outlineVariant", labelRole: "onSurface", label: "Outline Variant", x: 1022, y: 1088, w: 298, h: 80 },
    // The right column: surface variant, background, tint, inverse roles and the scrim.
    { role: "surfaceVariant", labelRole: "onSurface", label: "Surface Variant", x: 1352, y: 542, w: 392, h: 72 },
    { role: "background", labelRole: "onBackground", label: "Background", x: 1352, y: 622, w: 392, h: 72 },
    { role: "onBackground", labelRole: "background", label: "On Background", x: 1352, y: 694, w: 392, h: 72 },
    { role: "surfaceTint", labelRole: "inverseOnSurface", label: "Surface Tint", x: 1352, y: 774, w: 392, h: 72 },
    { role: "inverseSurface", labelRole: "inverseOnSurface", label: "Inverse Surface", x: 1352, y: 854, w: 392, h: 72 },
    { role: "inverseOnSurface", labelRole: "onSurface", label: "Inverse On Surface", x: 1352, y: 928, w: 392, h: 72 },
    { role: "inversePrimary", labelRole: "onPrimaryContainer", label: "Inverse Primary", x: 1352, y: 1008, w: 392, h: 72 },
    { role: "scrim", labelRole: "primaryFixed", label: "Scrim", x: 1352, y: 1088, w: 392, h: 80 }
  ];
  function buildColorMaps(source) {
    const modesOf = (c) => {
      var _a, _b;
      return (_b = (_a = source.collections.find((x) => x.name === c)) == null ? void 0 : _a.modes) != null ? _b : [];
    };
    const themes = modesOf("Theme");
    const roles = new Set(source.variables.filter((v) => v.collection === "ColorScheme" && v.type === "COLOR").map((v) => v.name));
    const blocks = MAP_BLOCKS.filter((b) => roles.has(b.role) && roles.has(b.labelRole));
    return themes.flatMap((themeMode) => modesOf("ColorScheme").map((appMode) => ({
      // With one theme the name is the design's; with more, it also says which theme it shows.
      name: themes.length > 1 ? `ColorScheme map - ${themeMode} ${appMode}` : `ColorScheme map - ${appMode}`,
      themeMode,
      appMode,
      blocks
    })));
  }

  // src/tables-figma.ts
  var PAGE_NAME = "Color tokens";
  var PAGE_TAG = "color-tokens-page";
  var TABLE_TAG = "color-tokens-table";
  var TABLE_GAP = 120;
  var C = {
    black: "#000000",
    white: "#FFFFFF",
    muted: "#6D6D6D",
    // metadata labels, descriptions, alias lines on Light cells
    mutedDark: "#757575",
    // alias lines on Dark cells
    legendText: "#6A6A6A",
    legendBg: "#F1F1F1",
    divider: "#A2A2A2",
    // used at 24% opacity
    checker: "#D9D9D9"
    // grey squares behind transparent swatches
  };
  var NAME_W = 320;
  var CELL_W = 320;
  var GAP = 40;
  var SIDE = 16;
  var ROW_H = 64;
  var PRIM_ROW_H = 48;
  var TILE = 40;
  var CHECK = 10;
  async function drawColorTables(tables, maps = []) {
    var _a;
    const ctx = await loadContext();
    const mapFont = maps.length > 0 ? await loadMapFont() : null;
    let page = (_a = figma.root.children.find((p) => p.getPluginData(PAGE_TAG) === "1")) != null ? _a : figma.root.children.find((p) => p.name === PAGE_NAME);
    if (!page) {
      page = figma.createPage();
      page.name = PAGE_NAME;
    }
    page.setPluginData(PAGE_TAG, "1");
    await page.loadAsync();
    const old = page.children.filter((n) => n.getPluginData(TABLE_TAG) !== "");
    let x = old.length ? Math.min(...old.map((n) => n.x)) : page.children.length ? Math.max(...page.children.map((n) => n.x + n.width)) + 200 : 0;
    const y = old.length ? Math.min(...old.map((n) => n.y)) : 0;
    const drawn = [];
    try {
      for (const t of tables) {
        const frame = drawTable(t, ctx, page);
        drawn.push(frame);
        frame.x = x;
        frame.y = y;
        x += frame.width + TABLE_GAP;
      }
      for (const m of maps) {
        const frame = drawColorMap(m, ctx, page, mapFont);
        drawn.push(frame);
        frame.x = x;
        frame.y = y;
        x += MAP_WIDTH + TABLE_GAP;
      }
    } catch (e) {
      for (const f of drawn) if (!f.removed) f.remove();
      throw e;
    }
    for (const n of old) n.remove();
    return { page: page.name, tables: tables.length };
  }
  async function loadContext() {
    const vars = await figma.variables.getLocalVariablesAsync();
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    const collectionsById = new Map(cols.map((c) => [c.id, c]));
    return {
      fonts: await loadFonts(),
      byKey: new Map(vars.map((v) => {
        var _a;
        return [`${(_a = collectionsById.get(v.variableCollectionId)) == null ? void 0 : _a.name}|${v.name}`, v];
      })),
      byId: new Map(vars.map((v) => [v.id, v])),
      collections: new Map(cols.map((c) => [c.name, c])),
      collectionsById
    };
  }
  async function loadFonts() {
    const pick = async (style) => {
      try {
        await figma.loadFontAsync({ family: "IBM Plex Sans", style });
        return { family: "IBM Plex Sans", style };
      } catch (e) {
        await figma.loadFontAsync({ family: "Inter", style });
        return { family: "Inter", style };
      }
    };
    const regular = await pick("Regular");
    return {
      bold: await pick("Bold"),
      medium: await pick("Medium"),
      regular,
      light: await pick("Light"),
      body: regular
      // descriptions and info text
    };
  }
  async function loadMapFont() {
    for (const family of ["Roboto", "IBM Plex Sans"]) {
      try {
        const font = { family, style: "Regular" };
        await figma.loadFontAsync(font);
        return font;
      } catch (e) {
      }
    }
    throw new Error("Neither Roboto nor IBM Plex Sans is available to draw the color maps.");
  }
  function drawColorMap(map, ctx, page, font) {
    const frame = figma.createFrame();
    page.appendChild(frame);
    frame.name = map.name;
    frame.resize(MAP_WIDTH, MAP_HEIGHT);
    frame.clipsContent = true;
    const setMode = (collection, modeName) => {
      const col = ctx.collections.get(collection);
      const mode = col == null ? void 0 : col.modes.find((m) => m.name === modeName);
      if (col && mode) frame.setExplicitVariableModeForCollection(col, mode.modeId);
    };
    setMode("Theme", map.themeMode);
    setMode("ColorScheme", map.appMode);
    frame.fills = [roleFill(MAP_BACKGROUND, ctx)];
    for (const b of map.blocks) {
      const block = figma.createFrame();
      frame.appendChild(block);
      block.name = b.label.replace(/\n/g, " ");
      block.x = b.x;
      block.y = b.y;
      block.resize(b.w, b.h);
      block.clipsContent = true;
      block.fills = [roleFill(b.role, ctx)];
      const label = text(block, b.label, font, 28, 34, C.black, b.w - 48);
      label.name = "Color label";
      label.x = 24;
      label.y = 18;
      label.fills = [roleFill(b.labelRole, ctx)];
    }
    frame.setPluginData(TABLE_TAG, "ColorScheme map");
    return frame;
  }
  function roleFill(role, ctx) {
    const variable = ctx.byKey.get(`ColorScheme|${role}`);
    const paint = solid(C.white);
    return variable ? figma.variables.setBoundVariableForPaint(paint, "color", variable) : paint;
  }
  function drawTable(t, ctx, page) {
    const cellCount = t.collection === "Primitives" ? 0 : t.columns.length;
    const contentW = t.collection === "Primitives" ? SIDE + NAME_W + GAP + 120 + GAP + 80 + SIDE : SIDE + NAME_W + cellCount * (GAP + CELL_W) + SIDE;
    const outer = stack(page, "VERTICAL", { name: `${t.collection} color tokens`, gap: 0, pad: [40, 40, 40, 40] });
    outer.fills = [solid(C.white)];
    outer.cornerRadius = 32;
    fixedWidth(outer, contentW + 80);
    titleBlock(outer, t, ctx);
    for (const g of t.groups) {
      groupHeader(outer, g.name, t, ctx);
      for (const r of g.rows) row(outer, r, t, ctx);
    }
    outer.setPluginData(TABLE_TAG, t.collection);
    return outer;
  }
  function titleBlock(parent, t, ctx) {
    const f = ctx.fonts;
    const block = stack(parent, "VERTICAL", { name: "CollectionTitle", gap: 32, pad: [32, 16, 32, 16] });
    block.layoutSizingHorizontal = "FILL";
    const header = stack(block, "HORIZONTAL", { name: "Collection header", gap: 32 });
    header.layoutSizingHorizontal = "FILL";
    header.primaryAxisAlignItems = "SPACE_BETWEEN";
    header.counterAxisAlignItems = "BASELINE";
    text(header, t.collection, f.bold, 64, null, C.black);
    text(header, `${t.count} tokens`, f.bold, 24, null, C.black);
    text(block, t.description, f.body, 16, 20, C.black);
    const meta = stack(block, "VERTICAL", { name: "Collection specification", gap: 0 });
    meta.layoutSizingHorizontal = "FILL";
    const specRow = stack(meta, "HORIZONTAL", { name: "Collection metadata", gap: 64, pad: [18, 0, 18, 0] });
    specRow.layoutSizingHorizontal = "FILL";
    divider(specRow, true);
    for (const [label, value] of [["COLLECTION", t.collection], [t.modesLabel, t.modes], ["VALUE NOTATION", t.notation]]) {
      const item = stack(specRow, "VERTICAL", { name: label, gap: 6 });
      text(item, label, f.medium, 10, 12, C.muted);
      text(item, value, f.regular, 14, 16, C.black);
    }
    const infoWrap = stack(meta, "VERTICAL", { name: "Info", gap: 16, pad: [18, 0, 18, 0] });
    infoWrap.layoutSizingHorizontal = "FILL";
    text(infoWrap, t.info, f.body, 10, 14, C.black, NAME_W);
  }
  function groupHeader(parent, name, t, ctx) {
    var _a, _b;
    const f = ctx.fonts;
    const block = stack(parent, "VERTICAL", { name: "GroupHeader", gap: 32, pad: [48, 0, 0, 0] });
    block.layoutSizingHorizontal = "FILL";
    const title = stack(block, "HORIZONTAL", { name: "Group title", gap: 8, pad: [8, 16, 8, 16] });
    text(title, name, f.bold, 32, null, C.black);
    const legend = stack(block, "HORIZONTAL", { name: "Legend", gap: GAP, pad: [16, SIDE, 16, SIDE] });
    legend.fills = [solid(C.legendBg)];
    legend.cornerRadius = 8;
    legend.counterAxisAlignItems = "CENTER";
    legend.resize(1, ROW_H);
    legend.layoutSizingHorizontal = "FILL";
    legendText(legend, t.nameHeader, NAME_W, ctx);
    if (t.collection === "Primitives") {
      legendText(legend, t.columns[0], 120, ctx);
      legendText(legend, t.columns[1], 80, ctx);
    } else {
      const firstRow = (_a = t.groups[0]) == null ? void 0 : _a.rows[0];
      for (const [i, col] of t.columns.entries()) {
        const indent = ((_b = firstRow == null ? void 0 : firstRow.cells[i]) == null ? void 0 : _b.dark) ? 24 : 16;
        const wrap = stack(legend, "HORIZONTAL", { name: col, gap: 8, pad: [0, 0, 0, indent] });
        fixedWidth(wrap, CELL_W);
        legendText(wrap, col, CELL_W - indent, ctx);
      }
    }
  }
  function legendText(parent, label, width, ctx) {
    const t = text(parent, label, ctx.fonts.medium, 10, 12, C.legendText, width);
    t.letterSpacing = { value: 0.7, unit: "PIXELS" };
  }
  function row(parent, r, t, ctx) {
    const f = ctx.fonts;
    const variable = ctx.byKey.get(`${t.collection}|${r.name}`);
    if (t.collection === "Primitives") {
      const line2 = stack(parent, "HORIZONTAL", { name: r.name, gap: GAP, pad: [0, SIDE, 0, SIDE] });
      line2.counterAxisAlignItems = "CENTER";
      line2.resize(1, PRIM_ROW_H);
      line2.layoutSizingHorizontal = "FILL";
      const rgba = variable ? resolve(variable, /* @__PURE__ */ new Map(), ctx) : null;
      text(line2, r.name, f.medium, 16, 20, C.black, NAME_W);
      swatch(line2, variable, 120, PRIM_ROW_H, rgba);
      text(line2, rgba ? toHex(rgba, false) : "\u2014", f.regular, 14, 16, C.black, 80);
      return;
    }
    const perAppearance = t.collection === "Appearance" || t.collection === "ColorScheme";
    const line = stack(parent, "HORIZONTAL", { name: r.name, gap: GAP, pad: [8, perAppearance ? 0 : SIDE, 8, SIDE] });
    line.counterAxisAlignItems = "CENTER";
    line.resize(1, ROW_H);
    line.layoutSizingHorizontal = "FILL";
    divider(line, false);
    const nameCol = stack(line, "VERTICAL", { name: "Token", gap: 4 });
    text(nameCol, r.name, f.medium, 16, 20, C.black, NAME_W);
    if (perAppearance && (variable == null ? void 0 : variable.description)) {
      text(nameCol, variable.description, f.light, 10, 12, C.muted, NAME_W);
    }
    for (const cell of r.cells) swatchCell(line, cell, variable, t, ctx);
  }
  function swatchCell(parent, cell, variable, t, ctx) {
    var _a, _b;
    const f = ctx.fonts;
    const box = stack(parent, "HORIZONTAL", {
      name: [cell.themeMode, cell.appMode].filter(Boolean).join(" "),
      gap: 16,
      pad: [8, 8, 8, cell.dark ? 16 : 8]
    });
    box.counterAxisAlignItems = "CENTER";
    box.resize(CELL_W, ROW_H);
    if (cell.dark) box.fills = [solid(C.black)];
    const modes = /* @__PURE__ */ new Map();
    const setMode = (collection, modeName) => {
      const col = ctx.collections.get(collection);
      const mode = col == null ? void 0 : col.modes.find((m) => m.name === modeName);
      if (col && mode) {
        box.setExplicitVariableModeForCollection(col, mode.modeId);
        modes.set(col.id, mode.modeId);
      }
    };
    setMode("Theme", cell.themeMode);
    setMode("Appearance", cell.appMode);
    setMode("ColorScheme", cell.appMode);
    const rgba = variable ? resolve(variable, modes, ctx) : null;
    swatch(box, variable, TILE, TILE, rgba);
    const details = stack(box, "VERTICAL", { name: "Color details", gap: 6 });
    details.layoutSizingHorizontal = "FILL";
    const lines = [];
    if (t.collection === "Theme") {
      lines.push([`\u2192 ${(_a = cell.ref) != null ? _a : "\u2014"}`, f.regular, 14, 16, C.black]);
      if (cell.opacityRef) lines.push([`\u2192 ${cell.opacityRef}`, f.regular, 14, 16, C.black]);
    } else {
      lines.push([rgba ? toHex(rgba, true) : "\u2014", f.regular, 14, 16, cell.dark ? C.white : C.black]);
      lines.push([`\u2192 ${(_b = cell.ref) != null ? _b : "\u2014"}`, f.regular, 12, 14, cell.dark ? C.mutedDark : C.muted]);
    }
    for (const [chars, font, size, lh, color] of lines) {
      const tn = text(details, chars, font, size, lh, color);
      tn.textAutoResize = "HEIGHT";
      tn.layoutSizingHorizontal = "FILL";
    }
  }
  function swatch(parent, variable, w, h, rgba) {
    const paint = solid(C.white);
    const fill = variable ? figma.variables.setBoundVariableForPaint(paint, "color", variable) : paint;
    if (!rgba || rgba.a >= 1) {
      const rect2 = figma.createRectangle();
      parent.appendChild(rect2);
      rect2.name = "#color_tile";
      rect2.resize(w, h);
      rect2.fills = [fill];
      rect2.cornerRadius = 8;
      if (isWhite(rgba)) outline(rect2);
      return;
    }
    const frame = figma.createFrame();
    parent.appendChild(frame);
    frame.name = "#color_tile";
    frame.resize(w, h);
    frame.cornerRadius = 8;
    frame.clipsContent = true;
    frame.fills = [solid(C.white)];
    outline(frame);
    checkerboard(frame, w, h);
    const rect = figma.createRectangle();
    frame.appendChild(rect);
    rect.name = "Color";
    rect.resize(w, h);
    rect.fills = [fill];
  }
  var checkerPaths = /* @__PURE__ */ new Map();
  function checkerboard(parent, w, h) {
    const sizeKey = `${w}\xD7${h}`;
    let data = checkerPaths.get(sizeKey);
    if (!data) {
      const squares = [];
      for (let row2 = 0; row2 * CHECK < h; row2++) {
        for (let col = 0; col * CHECK < w; col++) {
          if ((row2 + col) % 2 === 0) continue;
          const x = col * CHECK, y = row2 * CHECK;
          squares.push(`M ${x} ${y} L ${x + CHECK} ${y} L ${x + CHECK} ${y + CHECK} L ${x} ${y + CHECK} Z`);
        }
      }
      data = squares.join(" ");
      checkerPaths.set(sizeKey, data);
    }
    const v = figma.createVector();
    parent.appendChild(v);
    v.name = "Checkerboard";
    v.vectorPaths = [{ windingRule: "NONZERO", data }];
    v.fills = [solid(C.checker)];
    v.strokes = [];
    v.x = 0;
    v.y = 0;
  }
  function outline(node) {
    node.strokes = [solid(C.black, 0.08)];
    node.strokeWeight = 1;
    node.strokeAlign = "INSIDE";
  }
  function resolve(v, modes, ctx, depth = 0) {
    const val = valueIn(v, modes, ctx);
    return val === void 0 || depth > 10 ? null : resolveValue(val, modes, ctx, depth);
  }
  function valueIn(v, modes, ctx) {
    var _a;
    const col = ctx.collectionsById.get(v.variableCollectionId);
    return col ? v.valuesByMode[(_a = modes.get(col.id)) != null ? _a : col.defaultModeId] : void 0;
  }
  function resolveValue(val, modes, ctx, depth) {
    if (typeof val !== "object" || val === null) return null;
    if ("type" in val && val.type === "VARIABLE_ALIAS") {
      const next = ctx.byId.get(val.id);
      return next ? resolve(next, modes, ctx, depth + 1) : null;
    }
    if ("color" in val && "opacity" in val) {
      const base = resolveValue(val.color, modes, ctx, depth + 1);
      const pct = typeof val.opacity === "number" ? val.opacity : resolveNumber(val.opacity, modes, ctx);
      return base && pct !== null ? __spreadProps(__spreadValues({}, base), { a: base.a * (pct / 100) }) : null;
    }
    if ("r" in val) return { r: val.r, g: val.g, b: val.b, a: "a" in val ? val.a : 1 };
    return null;
  }
  function resolveNumber(alias, modes, ctx) {
    let cur = ctx.byId.get(alias.id);
    for (let depth = 0; cur && depth < 10; depth++) {
      const val = valueIn(cur, modes, ctx);
      if (typeof val === "number") return val;
      if (val && typeof val === "object" && "type" in val && val.type === "VARIABLE_ALIAS") cur = ctx.byId.get(val.id);
      else return null;
    }
    return null;
  }
  function isWhite(c) {
    return c !== null && [c.r, c.g, c.b].every((v) => Math.round(v * 255) === 255);
  }
  function toHex(c, withAlpha) {
    const ch = [c.r, c.g, c.b, ...withAlpha ? [c.a] : []];
    return "#" + ch.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  function stack(parent, dir, o) {
    var _a;
    const fr = figma.createFrame();
    parent.appendChild(fr);
    fr.name = o.name;
    fr.layoutMode = dir;
    fr.primaryAxisSizingMode = "AUTO";
    fr.counterAxisSizingMode = "AUTO";
    if (o.gap) fr.itemSpacing = o.gap;
    const [t, r, b, l] = (_a = o.pad) != null ? _a : [0, 0, 0, 0];
    if (t) fr.paddingTop = t;
    if (r) fr.paddingRight = r;
    if (b) fr.paddingBottom = b;
    if (l) fr.paddingLeft = l;
    fr.fills = [];
    fr.clipsContent = false;
    return fr;
  }
  function fixedWidth(fr, width) {
    fr.resize(width, 1);
    fr.layoutSizingHorizontal = "FIXED";
    fr.layoutSizingVertical = "HUG";
  }
  function divider(fr, topToo) {
    fr.strokes = [solid(C.divider, 0.24)];
    fr.strokeAlign = "OUTSIDE";
    fr.strokeTopWeight = topToo ? 1 : 0;
    fr.strokeBottomWeight = 1;
    fr.strokeLeftWeight = 0;
    fr.strokeRightWeight = 0;
  }
  function text(parent, chars, font, size, lineHeight, color, width) {
    const t = figma.createText();
    parent.appendChild(t);
    t.fontName = font;
    t.fontSize = size;
    t.characters = chars;
    t.lineHeight = lineHeight === null ? { unit: "AUTO" } : { value: lineHeight, unit: "PIXELS" };
    t.fills = [solid(color)];
    if (width !== void 0) {
      t.resize(width, lineHeight != null ? lineHeight : size);
      t.textAutoResize = "HEIGHT";
    }
    return t;
  }
  function solid(hex, opacity) {
    return __spreadValues({
      type: "SOLID",
      color: { r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255, b: parseInt(hex.slice(5, 7), 16) / 255 }
    }, opacity !== void 0 ? { opacity } : {});
  }

  // src/modes-figma.ts
  var MODE_KEYS = "mode-keys";
  function plannedModes(plan, inputs) {
    const out = [];
    for (const c of plan.collections) {
      c.modes.forEach((name, i) => {
        var _a, _b, _c;
        let key = name;
        if (c.name === "Theme") key = ((_a = inputs.themeKeys) == null ? void 0 : _a[i]) || name;
        const extras = (_b = inputs.extraAppearances) != null ? _b : [];
        if (c.name === "Appearance" || c.name === "ColorScheme") key = ((_c = extras[i - (c.modes.length - extras.length)]) == null ? void 0 : _c.key) || name;
        out.push({ collection: c.name, name, key });
      });
    }
    return out;
  }
  function storedKeys(col) {
    try {
      return col ? JSON.parse(col.getPluginData(MODE_KEYS) || "{}") : {};
    } catch (e) {
      return {};
    }
  }
  function matchModes(plan, inputs, collections) {
    const used = /* @__PURE__ */ new Set();
    return plannedModes(plan, inputs).map((m) => {
      const col = collections.find((c) => c.name === m.collection);
      const byKey = col == null ? void 0 : col.modes.find((x) => x.modeId === storedKeys(col)[m.key] && !used.has(x.modeId));
      const byName = col == null ? void 0 : col.modes.find((x) => x.name === m.name && !used.has(x.modeId));
      const mode = byKey != null ? byKey : byName;
      if (mode) used.add(mode.modeId);
      return __spreadProps(__spreadValues({}, m), { modeId: mode == null ? void 0 : mode.modeId });
    });
  }
  function findOrphanModes(modes, collections) {
    const matched = new Set(modes.map((m) => m.modeId));
    const out = [];
    for (const col of collections) {
      if (!["Primitives", "Theme", "Appearance", "ColorScheme"].includes(col.name)) continue;
      if (col.modes.length === 1 && col.modes[0].name === "Mode 1") continue;
      for (const m of col.modes) {
        if (matched.has(m.modeId)) continue;
        out.push({
          check: "orphan_mode",
          severity: "warning",
          collection: col.name,
          token: "",
          mode: m.name,
          expected: "in inputs",
          actual: "not in inputs",
          message: `The mode "${m.name}" is not in the inputs. Left untouched; the plugin never deletes modes. You can delete it in Figma.`
        });
      }
    }
    return out;
  }
  function checkRenames(modes, collections) {
    for (const m of modes) {
      const col = collections.find((x) => x.name === m.collection);
      const clash = col == null ? void 0 : col.modes.find((x) => x.name === m.name && x.modeId !== m.modeId);
      if (m.modeId && clash) {
        throw new Error(`Cannot rename a mode to "${m.name}" in ${m.collection}: another mode already has that name. Rename or delete it in Figma first. Nothing was changed.`);
      }
    }
  }
  function ensureModes(col, wanted) {
    const ids = {};
    const keys = storedKeys(col);
    for (const { name, key, modeId } of wanted) {
      let mode = col.modes.find((m) => m.modeId === modeId);
      if (mode && mode.name !== name) col.renameMode(mode.modeId, name);
      if (!mode && col.modes.length === 1 && col.modes[0].name === "Mode 1" && Object.keys(ids).length === 0) {
        col.renameMode(col.modes[0].modeId, name);
        mode = col.modes[0];
      }
      if (!mode) {
        try {
          col.addMode(name);
        } catch (e) {
          throw new Error(
            `Figma did not allow adding the mode "${name}" to the ${col.name} collection. Your Figma plan may limit the number of modes per collection. (${e instanceof Error ? e.message : e})`
          );
        }
        mode = col.modes.find((m) => m.name === name);
      }
      ids[name] = mode.modeId;
      keys[key] = mode.modeId;
    }
    col.setPluginData(MODE_KEYS, JSON.stringify(keys));
    return ids;
  }

  // src/palettes-figma.ts
  var PALETTE_SOURCES = "palette-sources";
  var STEP_NAME = /^Color\/([^/]+)\/\d+$/;
  function primitivesOf(collections) {
    return collections.find((c) => c.name === "Primitives");
  }
  function storedSources(col) {
    try {
      return col ? JSON.parse(col.getPluginData(PALETTE_SOURCES) || "{}") : {};
    } catch (e) {
      return {};
    }
  }
  function plannedPaletteRenames(plan, existing, collections) {
    const col = primitivesOf(collections);
    if (!col || !plan.palettes) return {};
    const names = /* @__PURE__ */ new Set();
    for (const v of existing) {
      const m = v.variableCollectionId === col.id ? STEP_NAME.exec(v.name) : null;
      if (m) names.add(m[1]);
    }
    return paletteRenames(storedSources(col), plan.palettes, names);
  }
  function renamePalettes(renames, existing, collections) {
    const col = primitivesOf(collections);
    if (!col) return [];
    const done = [];
    for (const [oldName, newName] of Object.entries(renames)) {
      for (const v of existing) {
        const m = v.variableCollectionId === col.id ? STEP_NAME.exec(v.name) : null;
        if (m && m[1] === oldName) v.name = v.name.replace(`Color/${oldName}/`, `Color/${newName}/`);
      }
      done.push(`Palette Color/${oldName} was renamed to Color/${newName}.`);
    }
    return done;
  }
  async function storePaletteSources(plan) {
    const col = primitivesOf(await figma.variables.getLocalVariableCollectionsAsync());
    if (!col || !plan.palettes) return;
    col.setPluginData(PALETTE_SOURCES, JSON.stringify(Object.fromEntries(plan.palettes.map((p) => [p.source, p.name]))));
  }

  // src/figma.ts
  var FILE_INPUTS = "form-inputs";
  var OLDER_STORAGE_KEY = "last-inputs";
  figma.showUI(__html__, { width: 960, height: 880 });
  var fontStyles = null;
  async function loadFontStyles() {
    var _a, _b;
    if (fontStyles) return fontStyles;
    const styles = {};
    for (const f of await figma.listAvailableFontsAsync()) {
      if (/italic|oblique/i.test(f.fontName.style)) continue;
      ((_b = styles[_a = f.fontName.family]) != null ? _b : styles[_a] = []).push(f.fontName.style);
    }
    fontStyles = styles;
    return styles;
  }
  async function settingsForThisFile() {
    var _a;
    const variables = await figma.variables.getLocalVariablesAsync();
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const nameOf = new Map(collections.map((c) => [c.id, c.name]));
    const hasTokens = fileHasTokens(variables.map((v) => nameOf.get(v.variableCollectionId)));
    const older = (_a = await figma.clientStorage.getAsync(OLDER_STORAGE_KEY)) != null ? _a : null;
    return inputsToShow(hasTokens, readSavedInputs(figma.root.getPluginData(FILE_INPUTS)), older);
  }
  (async () => {
    const saved = await settingsForThisFile();
    const ui = {
      gray: tokens_default.primitives.neutralPalette.steps,
      // swatches of the canvas dropdowns
      slots: Object.values(tokens_default.theme.typography).filter((src) => src.startsWith("input:fontWeights.")).map((src) => src.split(".")[1]),
      // weight styles ticked by default
      lightSteps: tokens_default.inputs.lightCanvasStep.allowed,
      darkSteps: tokens_default.inputs.darkCanvasStep.allowed,
      lightFillSteps: tokens_default.inputs.lightTextFillStep.allowed,
      darkFillSteps: tokens_default.inputs.darkTextFillStep.allowed,
      steps: [...tokens_default.primitives.steps].sort((a, b) => a - b),
      // palette steps, lightest first
      firstThemeName: tokens_default.collections.Theme.firstModeName,
      // default names
      customThemeName: tokens_default.collections.Theme.customModeName,
      customAppearanceName: tokens_default.inputs.extraAppearances.defaultName
    };
    figma.ui.postMessage({ type: "saved-inputs", inputs: saved != null ? saved : null, fonts: await loadFontStyles(), ui });
  })();
  figma.ui.onmessage = async (msg) => {
    var _a;
    if (msg.type === "tables") return updateTablesOnly();
    if (msg.type === "export") return exportTokens(msg.options);
    if (msg.type === "names") return previewNames(msg.inputs);
    if (msg.type !== "run") return;
    try {
      const fonts = await loadFontStyles();
      const inputs = __spreadProps(__spreadValues({}, msg.inputs), {
        themes: ((_a = msg.inputs.themes) != null ? _a : []).map((t) => {
          var _a2;
          return __spreadProps(__spreadValues({}, t), { availableWeights: fonts[(_a2 = t.fontFamily) == null ? void 0 : _a2.trim()] });
        })
      });
      const plan = buildPlan(tokens_default, inputs);
      const existing = await figma.variables.getLocalVariablesAsync();
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      const report = [...plan.report];
      let modes = [];
      let renames = {};
      if (plan.ok) {
        modes = matchModes(plan, inputs, collections);
        renames = plannedPaletteRenames(plan, existing, collections);
        const renamed = (name) => Object.keys(renames).some((old) => name.startsWith(`Color/${old}/`));
        report.push(
          ...findOrphans(plan, existing, collections).filter((r) => !(r.collection === "Primitives" && renamed(r.token))),
          ...findOrphanModes(modes, collections)
        );
      }
      let summary = null;
      if (plan.ok && msg.write) {
        checkRenames(modes, collections);
        const renamedPalettes = renamePalettes(renames, existing, collections);
        summary = writePlan(plan, existing, collections, modes);
        summary.renamed = renamedPalettes;
        await storePaletteSources(plan);
        figma.root.setPluginData(FILE_INPUTS, JSON.stringify(msg.inputs));
        try {
          summary.tablesPage = (await drawColorTables(buildTables(tokens_default, plan), buildColorMaps(plan))).page;
        } catch (e) {
          summary.problems.push(`Color tables were not drawn: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      figma.ui.postMessage({
        type: "result",
        ok: plan.ok,
        wrote: summary !== null,
        summary,
        report,
        manifest: plan.manifest,
        collections: plan.collections,
        variables: plan.variables
      });
      if (summary) figma.notify(`Variables: ${summary.created} created, ${summary.updated} updated, ${summary.unchanged} unchanged.`);
    } catch (e) {
      figma.ui.postMessage({ type: "failure", message: e instanceof Error ? e.message : String(e) });
    }
  };
  function previewNames(inputs) {
    var _a;
    try {
      const naming = namePalettes(tokens_default, inputs);
      const built = naming.build();
      const notes = [...naming.closeToBrand, ...naming.similar].map((s) => ({ theme: s.theme, role: s.role, note: s.note }));
      for (const h of hueOnlyShifts(naming, built)) {
        notes.push({ theme: h.theme, role: h.role, note: `Only the hue of this color is used. Its palette will be closer to ${h.stepHex} (step ${h.step}).` });
      }
      const steps = [...tokens_default.primitives.steps].sort((a, b) => a - b);
      const gray = tokens_default.primitives.neutralPalette.steps;
      const palettes = naming.colors.map((c) => {
        const p = built.find((x) => x.name === naming.paletteOf(c.theme, c.role));
        return { theme: c.theme, role: c.role, hexes: steps.map((s) => p ? p.steps[s].hex : gray[String(s)]) };
      });
      for (let i = 0; i < ((_a = inputs.themes) != null ? _a : []).length; i++) {
        const neutral = naming.neutralStepsOf(i);
        palettes.push({ theme: i, role: "neutral", hexes: steps.map((s) => neutral[s]) });
      }
      const brandName = naming.paletteOf(0, "brand");
      const brandPalette = built.find((x) => x.name === brandName);
      const brandSteps = Object.fromEntries(steps.map((s) => [s, brandPalette ? brandPalette.steps[s].hex : gray[String(s)]]));
      const previews = appearancePreviews(tokens_default, inputs, naming.neutralStepsOf(0), brandSteps);
      figma.ui.postMessage({ type: "names-result", similar: notes, palettes, previews });
    } catch (e) {
      figma.ui.postMessage({ type: "names-result", similar: [], palettes: [], previews: [] });
    }
  }
  async function updateTablesOnly() {
    try {
      const source = await readLiveVariables();
      const names = source.collections.map((c) => c.name);
      const missing = ["Primitives", "Theme", "Appearance", "ColorScheme"].filter((n) => !names.includes(n));
      if (names.length === 0) {
        figma.ui.postMessage({ type: "failure", message: "No Primitives, Theme or Appearance collection in this file. Generate tokens first." });
        return;
      }
      const result = await drawColorTables(buildTables(tokens_default, source), buildColorMaps(source));
      figma.ui.postMessage({ type: "tables-result", page: result.page, tables: result.tables, missing });
      figma.notify(`Color tables updated on "${result.page}".`);
    } catch (e) {
      figma.ui.postMessage({ type: "failure", message: e instanceof Error ? e.message : String(e) });
    }
  }
  async function exportTokens(options) {
    var _a, _b;
    try {
      const source = await readLiveVariables(true);
      const split = (_a = options.split) != null ? _a : "all";
      if (options.collection === "colorScheme") {
        const exp = buildColorSchemeExport(source);
        const ok = Object.keys(exp.data.themes).length > 0;
        if (options.format === "kotlin") {
          const roles = tokens_default.colorScheme.tokens.map((t) => t.name);
          const k = ok ? kotlinFiles(exp, split, (_b = options.kotlinPackage) != null ? _b : "", roles) : { files: [], problems: [] };
          figma.ui.postMessage({ type: "export-result", data: exp.data, files: k.files, problems: [...exp.problems, ...k.problems] });
        } else {
          const files2 = ok ? exportFiles(exp.data, split, "colorscheme-tokens") : [];
          figma.ui.postMessage({ type: "export-result", data: exp.data, files: files2, problems: exp.problems });
        }
        return;
      }
      const { data, problems } = buildAppearanceExport(source, options);
      const files = Object.keys(data.themes).length > 0 ? exportFiles(data, split) : [];
      figma.ui.postMessage({ type: "export-result", data, files, problems });
    } catch (e) {
      figma.ui.postMessage({ type: "failure", message: e instanceof Error ? e.message : String(e) });
    }
  }
  async function readLiveVariables(keepAlpha = false) {
    var _a, _b;
    const wanted = ["Primitives", "Theme", "Appearance", "ColorScheme"];
    const cols = (await figma.variables.getLocalVariableCollectionsAsync()).filter((c) => wanted.includes(c.name));
    const all = await figma.variables.getLocalVariablesAsync();
    const nameById = new Map(all.map((v) => [v.id, v.name]));
    const variables = [];
    for (const col of cols) {
      for (const v of all.filter((x) => x.variableCollectionId === col.id)) {
        if (v.resolvedType !== "COLOR" && v.resolvedType !== "FLOAT" && v.resolvedType !== "STRING") continue;
        const values = {};
        for (const m of col.modes) {
          const val = v.valuesByMode[m.modeId];
          if (val && typeof val === "object" && "type" in val && val.type === "VARIABLE_ALIAS") {
            values[m.name] = { alias: (_a = nameById.get(val.id)) != null ? _a : "(library variable)" };
          } else if (val && typeof val === "object" && "color" in val && "opacity" in val) {
            const c = val.color, o = val.opacity;
            const colorName = typeof c === "object" && "type" in c ? (_b = nameById.get(c.id)) != null ? _b : "(library variable)" : rgbaToHex(c, keepAlpha);
            const opacityName = typeof o === "object" ? nameById.get(o.id) : void 0;
            values[m.name] = __spreadValues({ alias: colorName }, opacityName ? { opacityAlias: opacityName } : {});
          } else if (val && typeof val === "object" && "r" in val) {
            values[m.name] = rgbaToHex(val, keepAlpha);
          } else if (typeof val === "number" || typeof val === "string") {
            values[m.name] = val;
          }
        }
        variables.push({ collection: col.name, name: v.name, type: v.resolvedType, scopes: [...v.scopes], values });
      }
    }
    const collections = wanted.flatMap((name) => {
      const c = cols.find((x) => x.name === name);
      return c ? [{ name, modes: c.modes.map((m) => m.name) }] : [];
    });
    return { collections, variables };
  }
  function rgbaToHex(c, keepAlpha = false) {
    const channels = keepAlpha && c.a !== void 0 && c.a < 1 ? [c.r, c.g, c.b, c.a] : [c.r, c.g, c.b];
    return "#" + channels.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  function findOrphans(plan, existing, collections) {
    const planned = new Set(plan.variables.map((v) => `${v.collection}|${v.name}`));
    const nameOf = new Map(collections.map((c) => [c.id, c.name]));
    return existing.filter((v) => !planned.has(`${nameOf.get(v.variableCollectionId)}|${v.name}`)).map((v) => {
      var _a;
      return {
        check: "orphan_variable",
        severity: "warning",
        collection: (_a = nameOf.get(v.variableCollectionId)) != null ? _a : "",
        token: v.name,
        mode: "",
        expected: "in manifest",
        actual: "not in manifest",
        message: "Not created by this plugin. Left untouched; the plugin never deletes variables."
      };
    });
  }
  function writePlan(plan, existing, allCollections, modes) {
    var _a;
    const summary = { created: 0, updated: 0, unchanged: 0, problems: [], renamed: [] };
    const collectionOf = /* @__PURE__ */ new Map();
    const modeIds = /* @__PURE__ */ new Map();
    for (const c of plan.collections) {
      const col = (_a = allCollections.find((x) => x.name === c.name)) != null ? _a : figma.variables.createVariableCollection(c.name);
      collectionOf.set(c.name, col);
      modeIds.set(c.name, ensureModes(col, modes.filter((m) => m.collection === c.name)));
    }
    const nameOfCollection = new Map([...collectionOf.values()].map((c) => [c.id, c.name]));
    const byKey = /* @__PURE__ */ new Map();
    for (const v of existing) {
      const col = nameOfCollection.get(v.variableCollectionId);
      if (col) byKey.set(`${col}|${v.name}`, v);
    }
    for (const def of plan.variables) {
      const key = `${def.collection}|${def.name}`;
      let variable = byKey.get(key);
      if (variable && variable.resolvedType !== def.type) {
        summary.problems.push(`${key}: exists as ${variable.resolvedType}, expected ${def.type}. Not changed.`);
        continue;
      }
      const isNew = !variable;
      if (!variable) {
        variable = figma.variables.createVariable(def.name, collectionOf.get(def.collection), def.type);
        byKey.set(key, variable);
      }
      let changed = false;
      if (!sameScopes(variable.scopes, def.scopes)) {
        variable.scopes = def.scopes;
        changed = true;
      }
      if (def.description !== void 0 && variable.description !== def.description) {
        variable.description = def.description;
        changed = true;
      }
      const modes2 = modeIds.get(def.collection);
      for (const [modeName, value] of Object.entries(def.values)) {
        const modeId = modes2[modeName];
        const figmaValue = toFigmaValue(def, value, byKey);
        if (figmaValue === null) {
          summary.problems.push(`${key} (${modeName}): alias target not found.`);
          continue;
        }
        if (isNew || !sameValue(variable.valuesByMode[modeId], figmaValue)) {
          variable.setValueForMode(modeId, figmaValue);
          changed = true;
        }
      }
      if (isNew) summary.created++;
      else if (changed) summary.updated++;
      else summary.unchanged++;
    }
    return summary;
  }
  function sameScopes(current, wanted) {
    return current.length === wanted.length && wanted.every((s) => current.includes(s));
  }
  function sameValue(current, wanted) {
    var _a, _b;
    if (current === void 0) return false;
    if (typeof wanted !== "object" || wanted === null) return current === wanted;
    if (typeof current !== "object" || current === null) return false;
    const isAliasValue = (v) => "type" in v && v.type === "VARIABLE_ALIAS";
    if (isAliasValue(wanted)) return isAliasValue(current) && current.id === wanted.id;
    if ("opacity" in wanted) {
      if (!("opacity" in current) || !("color" in current)) return false;
      const w = wanted;
      const c = current;
      return sameValue(c.color, w.color) && sameValue(c.opacity, w.opacity);
    }
    if ("r" in wanted && "r" in current) {
      const byte = (x) => Math.round(x * 255);
      const w = wanted, c = current;
      return byte(c.r) === byte(w.r) && byte(c.g) === byte(w.g) && byte(c.b) === byte(w.b) && byte((_a = c.a) != null ? _a : 1) === byte((_b = w.a) != null ? _b : 1);
    }
    return false;
  }
  function toFigmaValue(def, value, byKey) {
    if (typeof value === "object") {
      const target = def.collection === "Appearance" || def.collection === "ColorScheme" ? "Theme" : "Primitives";
      const v = byKey.get(`${target}|${value.alias}`);
      if (!v) return null;
      if (value.opacityAlias === void 0) return figma.variables.createVariableAlias(v);
      const op = byKey.get(`Primitives|${value.opacityAlias}`);
      if (!op) return null;
      return { color: figma.variables.createVariableAlias(v), opacity: figma.variables.createVariableAlias(op) };
    }
    if (def.type === "COLOR") return hexToRgba(value);
    return value;
  }
  function hexToRgba(hex) {
    return {
      r: parseInt(hex.slice(1, 3), 16) / 255,
      g: parseInt(hex.slice(3, 5), 16) / 255,
      b: parseInt(hex.slice(5, 7), 16) / 255,
      a: 1
    };
  }
})();
