# RICS Price List

A GitHub Pages site for displaying RICS mod purchase lists.

## For Streamers

### Quick Setup
1. Fork this repository
2. Enable GitHub Pages in your repository settings (Settings → Pages → Source: Deploy from branch → main branch)
3. Copy your RICS JSON files to the `data/` folder from:
   `%AppData%\LocalLow\Ludeon Studios\RimWorld by Ludeon Studios\Config\CAP_ChatInteractive`
   
   **Files to copy:**
   - `StoreItems.json`
   - `Incidents.json`
   - `Traits.json`
   - `RaceSettings.json`          ← note: corrected spelling
   - `Weather.json`
   - `ActiveMods.json`            ← **NEW** — automatically generated on every game start

4. Your price list will be available at `https://yourusername.github.io/rics-pricelist/`

### Customization
- Edit `index.html` to change the title or layout
- Modify `assets/css/rics-store.css` to change colors and styling
- The **Mods** tab is now available and will automatically show all active mods with direct Steam Workshop links when a Steam ID is present.
- Update the JSON files in `data/` whenever your RICS mod generates new ones (most are updated on game start or when you change store/trait settings).

### File Structure
- `index.html` - Main page
- `assets/css/rics-store.css` - Styles
- `assets/js/rics-store.js` - Functionality (now includes **Mods** tab support)
- `data/` - Your RICS JSON files go here:
  - `StoreItems.json`
  - `Incidents.json`
  - `Traits.json`
  - `RaceSettings.json`
  - `Weather.json`
  - `ActiveMods.json` ← automatically created by RICS on every game start (contains active mods + Steam IDs)

## Updating Your Fork

### To update your fork with new changes:

#### Using Sync Fork:
1. Go to your fork
2. Click "Sync fork" (top of repo)
3. Click "Update branch"
4. Resolve any conflicts if prompted

#### Using Git (advanced):

git pull upstream main
# Resolve any conflicts
git push origin main

#### Optional: Manual File Update (when only a few files changed)
If you only want to get the latest **Mods tab** and Steam Workshop links:

1. Copy these files from the upstream repository:
   - `index.html` - Main page (adds the Mods tab button and pane)
   - `assets/js/rics-store.js` - Functionality (now includes **Mods** tab support)

2. Add the following styles to your `assets/css/rics-store.css` (at the bottom of the file):
	This is for Steam links and the new Mods Tab
   ```css
   .steam-link {
       color: #1b88e9;
       text-decoration: underline;
   }
   .steam-link:hover {
       color: #66c0f4;
   }```

### 4. **Common Issues to Warn About:**


⚠️ **Important Notes:**
1. **Data files must be in `data/` folder** at root level
2. **Case sensitivity matters**: `StoreItems.json`, `RaceSettings.json`, `ActiveMods.json` (exact names)
3. `ActiveMods.json` is **automatically generated** by RICS every time you start a game — no manual action needed for this file.
4. Check browser console (F12) for loading errors if a tab appears empty
5. GitHub Pages takes 1-5 minutes to deploy after pushing changes
6. The **Mods** tab shows clickable Steam Workshop links for any mod that has a Steam ID
