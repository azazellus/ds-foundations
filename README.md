# Tokenseed

Tokenseed is a Figma plugin to create accessible and maintainable foundation tokens for design systems.

You pick a few colors and fonts. The plugin builds full color palettes, checks that text stays readable, and creates the variables of your design system in your Figma file. When your choices change, run it again and the variables update in place.

## What you get

**Four variable collections:**

| Collection | What it holds |
|---|---|
| Primitives | The raw values: color palettes, sizes, font families and weights, opacities |
| Theme | Color and font roles, such as your brand color. There is one mode for each theme you make |
| Appearance | The tokens you use in your designs, such as a brand background. There is one mode for each appearance, such as Light and Dark |
| ColorScheme | The same colors with Android names, for teams that build with Jetpack Compose |

**Color tables and color maps**, drawn on a page called "Color tokens", so you can see all your colors at a glance.

**Exports for developers:** Appearance or ColorScheme tokens as JSON, or ColorScheme tokens as Kotlin.

## Install the plugin

1. Install the **Figma desktop app**, from https://www.figma.com/downloads. Importing a plugin does not work in the browser.
2. Unzip the plugin folder and keep it somewhere permanent.
3. Open a test file in the Figma desktop app. Do not start in a real design file.
4. In the menu, choose **Plugins → Development → Import plugin from manifest…**
5. Select `manifest.json` in the plugin folder.
6. Run it from **Plugins → Development → Tokenseed**.

You only import the plugin once. After that, run it from the same menu.

## Use the plugin

### 1. Set up your themes

A theme is one look for your product, with its own colors and fonts. Each theme has:

- a brand color
- a neutral color, whose hue is used to tint the grays
- status colors: success, danger, warning, and info
- any other colors you want to add
- a font family with its weights

The Saturation slider makes the status colors and any added colors softer or stronger, from level 1 to 10. It does not change the brand or neutral colors. Each color row shows the palette the plugin will make, as you type. A note appears under a color when its palette looks almost the same as another one, when its hue is close to the brand color, or when it will look quite different from the color you picked. The brand color never gets a closeness note, because it has priority.

### 2. Set up your color modes

A color mode, also called an appearance, is a version of the theme's colors. Light is always there, and Dark can be removed. You can also add your own, based on Light or Dark.

Each one has its own canvas color and text fill, which sets how strong the bolder text and icons are. Each card shows its real colors, taken from the first theme, with a preview of its text.

If you add a theme or color mode without typing a name, it is called Custom theme or Custom appearance, then Custom theme 2, Custom appearance 2, and so on.

### 3. Generate your tokens

| Button | What it does |
|---|---|
| Check only | Runs every check and writes nothing to your file. |
| Generate tokens | Runs every check. If there is no error, it creates or updates the variables and redraws the color tables and color maps. |
| Update tables | Redraws the color tables and color maps from the variables in the file, including changes made by hand. |
| Export | Exports tokens for developers. It changes nothing in your file. |

The report under the form lists every error and warning. If there is an error, nothing is written.

## Good to know

- **Resize the window.** Drag the handle in the bottom right corner. The width goes from 680 to 1280 pixels, and the plugin remembers your size.
- **Light or dark window.** The switch in the bottom panel changes the plugin's window. The plugin remembers your choice, and it does not change your tokens.
- **Try it in a test file first.** Check the result before you run the plugin in a real design file.
- **Your settings stay with the file.** They are saved when you press Generate tokens, so each file keeps its own. Changes you did not generate are lost when you close the plugin.
- **A file with no tokens starts fresh.** In a new file, or after you delete all the tokens, the form opens with the default settings.
- **Running it again updates your variables.** It does not make duplicates.
- **Manual edits are replaced.** If you changed the value of one of the plugin's variables by hand, Generate tokens sets it back.
- **Nothing is deleted.** Variables and modes the plugin no longer makes stay in your file, and the report lists them as `orphan_variable` and `orphan_mode`.

## Common problems

| Problem | What to do |
|---|---|
| Figma cannot load the plugin after you moved or renamed its folder | Import `manifest.json` again from the folder's new location. |
| The report says "Stopped" | Read the errors in the report. Each one names the token and the mode it is about. |

## For developers

To change the plugin's code, see [DEVELOPMENT.md](DEVELOPMENT.md).
