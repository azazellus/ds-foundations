# Developing Tokenseed

This guide is for people who want to change the plugin's code. To install and use the plugin, see [README.md](README.md).

## Set up

You need two programs.

1. **Node.js**, version 22.6 or newer. Download the LTS version from https://nodejs.org and run the installer.
2. **The Figma desktop app**, from https://www.figma.com/downloads.

Then open a terminal in the project folder and install the project's tools:

```bash
npm install
```

To open a terminal: on a Mac, press Cmd + Space, type `Terminal`, and press Enter. On Windows, press the Windows key, type `PowerShell`, and press Enter. Then go to the folder with `cd`, for example `cd ~/Projects/tokenseed`.

## Build and test

Run these from the project folder.

| Command | What it does |
|---|---|
| `npm test` | Runs the automatic checks. The last line must say `All logic tests passed.` |
| `npm run typecheck` | Checks the code for mistakes in types. No output means no problems. |
| `npm run build` | Builds `code.js`, the file Figma runs. Run it after every code change. |

A line that says `ExperimentalWarning` is harmless.

After a rebuild, close and run the plugin again to load the new `code.js`.

`code.js` is kept in the repository so that anyone can load the plugin without building it. Commit it again after changing anything in `src/`.

## The files

```
tokenseed/
├── README.md            ← the guide for people who use the plugin
├── DEVELOPMENT.md       ← this guide
├── manifest.json        ← tells Figma the plugin's name and files
├── ui.html              ← the plugin window (the form and the report)
├── code.js              ← the built plugin that Figma runs (made by "npm run build")
├── ui-assets/           ← icons used in the window, and the fonts embedded in it (fonts/, with their licenses)
├── spec/                ← the rules
│   ├── foundations-spec.md   ← the full written specification
│   ├── tokens.json           ← the same rules in machine-readable form (wins if the two disagree)
│   └── CONVENTIONS.md        ← writing style for editing the spec
├── src/                 ← the program code
│   ├── color.ts         ← color math: HEX and OKLCH conversions, contrast
│   ├── palette.ts       ← builds a 13-step palette and fixes low contrast
│   ├── naming.ts        ← chooses each palette's name from its hue
│   ├── foundations.ts   ← turns the form's inputs into the full plan of variables and checks
│   ├── validate.ts      ← checks HEX values
│   ├── tables.ts        ← describes the color tables
│   ├── color-maps.ts    ← describes the ColorScheme color maps
│   ├── text-styles.ts   ← describes the Android, iOS, and web text styles
│   ├── saved-inputs.ts  ← decides which settings the form opens with
│   ├── window-size.ts   ← the limits of the plugin window's size
│   ├── previews.ts      ← works out the real colors of each appearance card in the window
│   ├── export.ts        ← builds the developer exports (JSON and Kotlin)
│   ├── figma.ts         ← the Figma side: talks to the window and writes the variables
│   ├── modes-figma.ts   ← finds, renames, and adds modes in the file
│   ├── palettes-figma.ts← renames palettes whose name changed
│   ├── tables-figma.ts  ← draws the color tables in Figma
│   ├── text-styles-figma.ts ← writes the text styles in Figma
│   └── text-style-tables-figma.ts ← draws the text style tables in Figma
└── test/
    └── logic.test.ts    ← automatic checks of all the logic
```

Files ending in `-figma.ts`, and `figma.ts` itself, are the only ones that touch Figma. Everything else is plain logic, so the tests can check it without Figma.

## What the plugin makes

| Collection | What it holds | Modes |
|---|---|---|
| Primitives | Raw values: 13-step color palettes, sizes, font families and weights, opacities | One (Default) |
| Theme | Roles such as `color/brand/500`, linked to Primitives | One per theme (Main theme, Custom theme, …) |
| Appearance | What designs use, such as `color/bg/brand/bold`, linked to Theme tokens | Light, Dark, and any extra appearances |
| ColorScheme | The same colors with Android (Jetpack Compose) names, such as `primary` | Same as Appearance |

It also makes text styles for Android, iOS, and web, linked to the Theme typography tokens, and draws tables of the colors and text styles.

All the rules live in `spec/`. The plugin follows them exactly.

## Rules for changes

- The rules in `spec/` change only on purpose. Ask before editing them.
- If a test fails, don't skip it. Find out why first.
- Test Figma writes in a separate test file, not in a real design file.

## Common problems

| Problem | What to do |
|---|---|
| `node: command not found` | Node.js is not installed, or the terminal was open during the install. Close and reopen the terminal. |
| `esbuild: command not found` or `tsc: command not found` | Run `npm install` in the project folder. |
| The plugin still shows old behavior | Run `npm run build`, then close and run the plugin again. |
