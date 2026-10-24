# Rate Your Music Discography Image Grid

A Tampermonkey userscript that adds a **View artwork grid** button to Rate Your Music artist pages. Use it to browse the releases on the page in a fullscreen, scrollable grid with larger cover art, release titles, and dates. The grid uses fewer, larger cards per row and tries higher-resolution cover URLs first, falling back to the image URLs provided by the page if a larger variant is unavailable. Selecting a card opens that release in a new tab.

## Install

1. Install Tampermonkey in your browser.
2. Open `rym-discography-grid.user.js` and copy its contents.
3. In Tampermonkey, create a new script, replace the starter code, and save.
4. Visit a Rate Your Music artist discography page and select **View artwork grid**.

Close the grid with the **Close** button or the `Escape` key. The grid is built from release artwork currently present on the page, so scroll the discography first if it loads releases as you scroll.
