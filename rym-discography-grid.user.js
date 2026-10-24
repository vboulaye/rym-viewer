// ==UserScript==
// @name         Rate Your Music Discography Image Grid
// @namespace    https://github.com/rym-viewer
// @version      1.1.0
// @description  View a discography's release artwork, titles, and dates in a fullscreen grid.
// @match        https://rateyourmusic.com/artist/*
// @match        https://www.rateyourmusic.com/artist/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const BUTTON_ID = 'rym-image-grid-button';
  const OVERLAY_ID = 'rym-image-grid-overlay';
  const STYLE_ID = 'rym-image-grid-style';
  const RELEASE_PATH = /\/release\//i;
  const DATE_PATTERN = /\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}(?:st|nd|rd|th)?[,]?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?[,]?\s+\d{4}|(?:19|20)\d{2})\b/i;

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID} {
        position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
        border: 0; border-radius: 999px; padding: 12px 18px;
        background: #202124; color: #fff; box-shadow: 0 3px 14px #0005;
        font: 600 14px/1.2 system-ui, sans-serif; cursor: pointer;
      }
      #${BUTTON_ID}:hover { background: #3c4043; }
      #${OVERLAY_ID} {
        position: fixed; inset: 0; z-index: 2147483001; overflow: auto;
        box-sizing: border-box; padding: 64px 24px 28px;
        background: #111; color: #f5f5f5; font-family: system-ui, sans-serif;
      }
      #${OVERLAY_ID} [data-rym-grid-toolbar] {
        position: fixed; inset: 0 0 auto; z-index: 1; display: flex;
        align-items: center; justify-content: space-between; gap: 16px;
        box-sizing: border-box; min-height: 52px; padding: 8px 20px;
        background: #111e; backdrop-filter: blur(8px);
      }
      #${OVERLAY_ID} [data-rym-grid-count] { font-size: 14px; color: #ccc; }
      #${OVERLAY_ID} [data-rym-grid-close] {
        border: 1px solid #777; border-radius: 6px; padding: 7px 12px;
        background: #222; color: white; font: inherit; cursor: pointer;
      }
      #${OVERLAY_ID} [data-rym-grid-cards] {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px; max-width: 2100px; margin: 0 auto;
      }
      #${OVERLAY_ID} [data-rym-grid-card] {
        display: flex; min-width: 0; flex-direction: column; overflow: hidden;
        border: 1px solid #333; border-radius: 8px; background: #1b1b1b;
        color: inherit; text-decoration: none;
      }
      #${OVERLAY_ID} [data-rym-grid-image-wrap] {
        display: grid; place-items: center; aspect-ratio: 1; padding: 10px;
        background: #080808;
      }
      #${OVERLAY_ID} [data-rym-grid-card] img {
        display: block; width: 100%; height: 100%; object-fit: contain;
      }
      #${OVERLAY_ID} [data-rym-grid-caption] { padding: 10px 12px 12px; }
      #${OVERLAY_ID} [data-rym-grid-title] {
        display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical;
        -webkit-line-clamp: 2; font-size: 14px; font-weight: 650; line-height: 1.35;
      }
      #${OVERLAY_ID} [data-rym-grid-date] {
        margin-top: 5px; color: #aaa; font-size: 12px; line-height: 1.3;
      }
      #${OVERLAY_ID} [data-rym-grid-empty] {
        max-width: 560px; margin: 12vh auto; color: #ddd; text-align: center;
      }
      @media (max-width: 520px) {
        #${OVERLAY_ID} { padding: 60px 12px 20px; }
        #${OVERLAY_ID} [data-rym-grid-cards] { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        #${OVERLAY_ID} [data-rym-grid-caption] { padding: 8px; }
      }
    `;
    document.head.append(style);
  }

  function releaseLinksIn(element) {
    return [...element.querySelectorAll('a[href]')].filter((link) => RELEASE_PATH.test(link.pathname));
  }

  function findReleaseCard(link) {
    let node = link;
    let best = link;
    for (let depth = 0; node && depth < 7; depth += 1, node = node.parentElement) {
      const links = releaseLinksIn(node);
      const uniqueLinks = new Set(links.map((item) => item.href));
      if (uniqueLinks.size > 1) break;
      if (node.querySelector('img')) best = node;
      if (node.querySelector('img') && (node.innerText || '').trim().length > 4) {
        best = node;
        if (getDate(node)) break;
      }
    }
    return best;
  }

  function getDate(element) {
    const dateNode = element.querySelector('time[datetime], [class*="date"], [class*="year"]');
    if (dateNode) {
      const value = dateNode.getAttribute('datetime') || dateNode.innerText;
      const match = value && value.match(DATE_PATTERN);
      if (match) return match[0];
    }
    const match = (element.innerText || '').match(DATE_PATTERN);
    return match ? match[0] : '';
  }

  function getTitle(link, card, image, date) {
    const titleNode = card.querySelector('[class*="release_title"], [class*="album_title"], [class*="release-title"], [class*="album-title"], h2, h3');
    const candidates = [
      titleNode && titleNode.innerText,
      link.getAttribute('aria-label'),
      link.getAttribute('title'),
      link.innerText,
      image.getAttribute('alt'),
      ...((card.innerText || '').split('\n')),
    ];
    for (const candidate of candidates) {
      const cleaned = (candidate || '').replace(/\s+/g, ' ').trim();
      if (!cleaned || (date && cleaned === date) || /^(cover|album art|release image)$/i.test(cleaned)) continue;
      return cleaned;
    }
    return 'Untitled release';
  }

  function getImageUrls(image) {
    const urls = [];
    const add = (value) => {
      if (!value) return;
      const url = new URL(value, document.baseURI).href;
      if (!url.startsWith('data:') && !urls.includes(url)) urls.push(url);
    };
    const addSrcset = (srcset) => {
      if (!srcset) return;
      const candidates = srcset.split(',').map((entry) => {
        const [url, descriptor] = entry.trim().split(/\s+/, 2);
        const size = descriptor ? Number.parseFloat(descriptor) : 1;
        return { url, size: Number.isFinite(size) ? size : 1 };
      }).filter((entry) => entry.url);
      candidates.sort((a, b) => b.size - a.size).forEach((entry) => add(entry.url));
    };

    addSrcset(image.dataset.srcset || image.getAttribute('srcset'));
    add(image.dataset.original);
    add(image.dataset.lazySrc);
    add(image.dataset.src);
    add(image.currentSrc);
    add(image.src);

    // RYM artwork URLs commonly include a requested size in the /i/<size>/ path.
    // Try larger variants first, while retaining every page-provided URL as fallback.
    const pageUrls = [...urls];
    for (const url of pageUrls) {
      const match = url.match(/\/i\/(\d+)\//);
      if (!match) continue;
      const currentSize = Number(match[1]);
      for (const size of [1200, 800, 600]) {
        if (size > currentSize) add(url.replace(`/i/${match[1]}/`, `/i/${size}/`));
      }
    }

    const originalUrls = new Set(pageUrls);
    const largerUrls = urls.filter((url) => !originalUrls.has(url));
    return [...largerUrls, ...pageUrls];
  }

  function collectReleases() {
    const releases = [];
    const seen = new Set();

    for (const link of document.querySelectorAll('a[href]')) {
      if (!RELEASE_PATH.test(link.pathname) || seen.has(link.href)) continue;
      const card = findReleaseCard(link);
      const image = link.querySelector('img') || card.querySelector('img');
      if (!image) continue;

      const imageUrls = getImageUrls(image);
      if (!imageUrls.length) continue;

      const date = getDate(card);
      const title = getTitle(link, card, image, date);
      seen.add(link.href);
      releases.push({ href: link.href, imageUrls, title, date, alt: image.alt || title });
    }
    return releases;
  }

  function closeGrid(overlay) {
    overlay.remove();
    document.removeEventListener('keydown', onKeyDown, true);
    document.body.style.overflow = '';
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      const overlay = document.getElementById(OVERLAY_ID);
      if (overlay) closeGrid(overlay);
    }
  }

  function showGrid() {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) return;

    const releases = collectReleases();
    const overlay = document.createElement('section');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Discography image grid');

    const toolbar = document.createElement('div');
    toolbar.dataset.rymGridToolbar = '';
    const count = document.createElement('span');
    count.dataset.rymGridCount = '';
    count.textContent = `${releases.length} release${releases.length === 1 ? '' : 's'}`;
    const close = document.createElement('button');
    close.type = 'button';
    close.dataset.rymGridClose = '';
    close.textContent = 'Close  ×';
    close.addEventListener('click', () => closeGrid(overlay));
    toolbar.append(count, close);
    overlay.append(toolbar);

    if (!releases.length) {
      const empty = document.createElement('p');
      empty.dataset.rymGridEmpty = '';
      empty.textContent = 'No release artwork was found on this page. Open a discography page with releases and try again.';
      overlay.append(empty);
    } else {
      const grid = document.createElement('div');
      grid.dataset.rymGridCards = '';
      for (const release of releases) {
        const card = document.createElement('a');
        card.dataset.rymGridCard = '';
        card.href = release.href;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        const imageWrap = document.createElement('div');
        imageWrap.dataset.rymGridImageWrap = '';
        const image = document.createElement('img');
        let imageUrlIndex = 0;
        image.src = release.imageUrls[imageUrlIndex];
        image.alt = release.alt;
        image.loading = 'lazy';
        image.addEventListener('error', () => {
          imageUrlIndex += 1;
          if (imageUrlIndex < release.imageUrls.length) image.src = release.imageUrls[imageUrlIndex];
        });
        imageWrap.append(image);
        const caption = document.createElement('div');
        caption.dataset.rymGridCaption = '';
        const title = document.createElement('div');
        title.dataset.rymGridTitle = '';
        title.textContent = release.title;
        caption.append(title);
        if (release.date) {
          const date = document.createElement('div');
          date.dataset.rymGridDate = '';
          date.textContent = release.date;
          caption.append(date);
        }
        card.append(imageWrap, caption);
        grid.append(card);
      }
      overlay.append(grid);
    }

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeGrid(overlay);
    });
    document.body.append(overlay);
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown, true);
    close.focus();
  }

  function install() {
    if (!document.body || document.getElementById(BUTTON_ID)) return;
    addStyles();
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = 'View artwork grid';
    button.addEventListener('click', showGrid);
    document.body.append(button);
  }

  install();
})();
