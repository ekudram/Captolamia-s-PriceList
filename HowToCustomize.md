
# How to Customize the Captolamia / RICS Store Look

You can easily change the title, colors, and basic styling yourself — no advanced coding required!

Only two files matter:

- **`index.html`** → for changing the title and main text  
- **`assets/css/rics-store.css`** → for colors, gradients, hover effects, etc.

## 1. Change the Title

Open **`index.html`** in any text editor (Notepad, VS Code, Notepad++, etc.).

Find this line:

```html
<h1>RICS Store</h1>
```

Change it to whatever you like:

```html
<h1>Captolamia Pawn Shop</h1>
<h1>My Colony Trading Hub</h1>
<h1>RimWorld Black Market</h1>
```

Save the file → refresh the page in your browser → you're done!

## 2. Change the Header Color (the colorful banner at the top)

Open **`assets/css/rics-store.css`**.

Look for the `header` block (it looks something like this):

```css
header {
    text-align: center;
    margin-bottom: 30px;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 8px;
}
```

The magic line is the `background`:

```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Quick color examples you can copy-paste:

- **Solid orange**
  ```css
  background: #ff6b35;
  ```

- **Orange → yellow gradient**
  ```css
  background: linear-gradient(135deg, #ff6b35 0%, #ffb347 100%);
  ```

- **Red → dark red**
  ```css
  background: linear-gradient(135deg, #c0392b 0%, #8b0000 100%);
  ```

- **Green neon**
  ```css
  background: linear-gradient(135deg, #00ff9d 0%, #00b7ff 100%);
  ```

- **Purple vibe**
  ```css
  background: linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%);
  ```

You can search online for "hex color picker" or visit sites like coolors.co to pick any color and copy its `#xxxxxx` code.

## 3. Make Tabs & Active Buttons Match Your New Header Color

Still in `rics-store.css`, find:

```css
.tab-button.active {
    background: white;
    border-bottom: 3px solid #667eea;
    color: #667eea;
    font-weight: bold;
}
```

Update the colors to match your header. Example for orange:

```css
.tab-button.active {
    background: white;
    border-bottom: 3px solid #ff6b35;
    color: #ff6b35;
    font-weight: bold;
}
```

Do the same for the `:hover` state if you want consistency:

```css
.tab-button:hover {
    background: #fff5f0; /* light version of your main color */
}
```

## 4. Tips for Finding Colors

- Google: "orange hex color", "neon blue hex", etc.
- Websites:  
  - https://coolors.co  
  - https://colorhunt.co  
  - https://htmlcolorcodes.com

Just copy the `#xxxxxx` code and paste it into the CSS.

## 5. Need More Help?

If something doesn't look right or you want a completely different style (e.g. "dark mode", "cyberpunk theme", "pastel colors"), just describe what you want and ask an AI like **Grok**, ChatGPT, or Claude — they can give you the exact lines to copy-paste.

That's it — most visual changes only require editing 3–6 lines!

Happy customizing! 🛠️✨
```
