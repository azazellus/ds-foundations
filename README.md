# Design Foundations: a Figma plugin

This plugin creates the color, size, and typography variables of a design system in a Figma file. You pick a few colors and fonts. The plugin builds the full palettes, checks that text stays readable (contrast), and writes the variables into four collections.

---

## 1. What the plugin makes

| Collection | What it holds | Modes |
|---|---|---|
| Primitives | Raw values: 13-step color palettes, sizes, font families and weights, opacities | One (Default) |
| Theme | Roles such as `color/brand/500`, linked to Primitives | One per theme (Main theme, Custom theme, …) |
| Appearance | What designs use, such as `color/bg/brand/bold`, linked to Theme tokens | Light, Dark, and any extra appearances |
| ColorScheme | The same colors with Android (Jetpack Compose) names, such as `primary` | Same as Appearance |

The plugin also draws color tables and ColorScheme color maps on a page called "Color tokens", and exports the tokens for developers (JSON, or Kotlin for Android).

All the rules live in `spec/`. The plugin follows them exactly.

---

## 2. The files

```
tokens-plugin/
├── README.md            ← this guide
├── manifest.json        ← tells Figma the plugin's name and files
├── ui.html              ← the plugin window (the form and the report)
├── code.js              ← the built plugin that Figma runs (made by "npm run build")
├── ui-assets/           ← icons used in the window, and the font embedded in it (fonts/, with its license)
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
│   ├── saved-inputs.ts  ← decides which settings the form opens with
│   ├── previews.ts      ← works out the real colors of each appearance card in the window
│   ├── export.ts        ← builds the developer exports (JSON and Kotlin)
│   ├── figma.ts         ← the Figma side: talks to the window and writes the variables
│   ├── modes-figma.ts   ← finds, renames, and adds modes in the file
│   ├── palettes-figma.ts← renames palettes whose name changed
│   └── tables-figma.ts  ← draws the color tables in Figma
└── test/
    └── logic.test.ts    ← automatic checks of all the logic
```

Files ending in `-figma.ts`, and `figma.ts` itself, are the only ones that touch Figma. Everything else is plain logic, so the tests can check it without Figma.

---

## 3. Set up (one time)

You need two programs.

1. **Node.js**, version 22 or newer. Download the LTS version from https://nodejs.org and run the installer.
2. **The Figma desktop app**, from https://www.figma.com/downloads.

Then open a terminal in this folder and install the project's tools:

```bash
npm install
```

To open a terminal: on a Mac, press Cmd + Space, type `Terminal`, and press Enter. On Windows, press the Windows key, type `PowerShell`, and press Enter. Then go to the folder with `cd`, for example `cd ~/Projects/tokens-plugin`.

---

## 4. Build and test

Run these from the project folder.

| Command | What it does |
|---|---|
| `npm test` | Runs the automatic checks. The last line must say `All logic tests passed.` |
| `npm run typecheck` | Checks the code for mistakes in types. No output means no problems. |
| `npm run build` | Builds `code.js`, the file Figma runs. Run it after every code change. |

A line that says `ExperimentalWarning` is harmless.

---

## 5. Load the plugin in Figma

1. Open a test file in the Figma desktop app. Do not use a real design file (see section 7).
2. In the menu, choose **Plugins → Development → Import plugin from manifest…**
3. Select `manifest.json` in this folder.
4. Run it from **Plugins → Development → Design Foundations**.

After a rebuild, close and run the plugin again to load the new `code.js`.

---

## 6. Use the plugin

**Themes.** Each theme has a brand color, a neutral color (only its hue is used, to tint the grays), status colors (success, danger, warning, info), optional added colors, and a font family with its weights. Each color row shows the palette the plugin will make, as you type. A note appears under a color when its palette looks almost the same as another one, or when it will look quite different from the color picked.

**Names.** The first theme is called Main theme. A theme or appearance you add without typing a name is called Custom theme or Custom appearance, then Custom theme 2, Custom appearance 2, and so on.

**Appearances.** Light is always there. Dark can be removed. You can add appearances based on Light or Dark. Each one has its own canvas color and text fill (how strong the bolder text and icons are). Each card is painted in its real colors, taken from the first theme, and shows a preview of its text.

**Buttons:**

| Button | What it does |
|---|---|
| Check only | Builds everything and runs every check. Writes nothing. |
| Generate tokens | Runs the checks. If there is no error, creates or updates the variables and redraws the color tables and color maps. |
| Update tables | Redraws the color tables and color maps from the variables in the file, including changes made by hand. |
| Export | Exports Appearance or ColorScheme tokens as JSON, or ColorScheme tokens as Kotlin. Reads only. |

The report under the form lists every error and warning. If there is an error, nothing is written.

**Your settings** are saved in the file when you press Generate tokens, so each file keeps its own. If the file has no tokens (a new file, or you deleted them all), the form opens with the default settings. Changes you did not generate are not kept when you close the plugin.

**Running it again** in a file that already has the variables updates them in place. Nothing is deleted. Variables and modes that the plugin no longer makes are listed as `orphan_variable` and `orphan_mode`, and left alone. Values you changed by hand on the plugin's variables are set back to the plan.

---

## 7. Safety rules

- Test in a separate test file first. Check the result before running the plugin in a real design file.
- The plugin never deletes variables or modes. It reports extra ones and leaves them alone.
- If a test fails, don't skip it. Find out why first.
- The rules in `spec/` change only on purpose. Ask before editing them.

---

## 8. Common problems

| Problem | What to do |
|---|---|
| `node: command not found` | Node.js is not installed, or the terminal was open during the install. Close and reopen the terminal. |
| `esbuild: command not found` or `tsc: command not found` | Run `npm install` in the project folder. |
| The plugin still shows old behavior | Run `npm run build`, then close and run the plugin again. |
| A test prints an error with a file name | Copy the whole message and share it when you ask for help. |
| The report says "Stopped" | Read the errors in the report. Each one names the token and the mode it is about. |
