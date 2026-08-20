import { categories } from './config/tools.js';
import { dom, switchView, hideAlert } from './ui.js';
import { ShortcutsManager } from './logic/shortcuts.js';
import { createIcons, icons } from 'lucide';
import '@phosphor-icons/web/regular';
import * as pdfjsLib from 'pdfjs-dist';
import '../css/styles.css';
import {
  escapeHtml,
  formatShortcutDisplay,
  formatStars,
} from './utils/helpers.js';
import {
  initI18n,
  applyTranslations,
  rewriteLinks,
  injectLanguageSwitcher,
  t,
} from './i18n/index.js';
import {
  loadRuntimeConfig,
  isToolDisabled,
  isCurrentPageDisabled,
} from './utils/disabled-tools.js';
import {
  getStoredItem,
  setStoredItem,
  removeStoredItem,
} from './utils/safe-storage.js';
declare const __BRAND_NAME__: string;

const init = async () => {
  // Theme synchronization (URL parameter, localStorage, system preference, or postMessage)
  const urlParams = new URLSearchParams(window.location.search);
  const themeParam = urlParams.get('theme');
  const storedTheme =
    localStorage.getItem('theme') || localStorage.getItem('kincseslada_theme');
  const prefersDark =
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const isDark =
    themeParam === 'dark' ||
    (themeParam !== 'light' &&
      (storedTheme === 'dark' || (!storedTheme && prefersDark)));
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'THEME_CHANGE') {
      if (event.data.theme === 'dark') {
        document.documentElement.classList.add('dark');
        try {
          localStorage.setItem('theme', 'dark');
        } catch {}
      } else {
        document.documentElement.classList.remove('dark');
        try {
          localStorage.setItem('theme', 'light');
        } catch {}
      }
    }
  });

  // A standalone fejléc (BentoPDF + kereső + kedvencek) csak a főoldalon kell:
  // az eszközoldalaknak saját belső fejlécük van (vissza-funkcióval).
  const isTopLevel = window.self === window.top;
  if (isTopLevel && document.getElementById('tool-grid')) {
    const existingNav = document.getElementById('standalone-top-nav');
    if (!existingNav) {
      const topNav = document.createElement('div');
      topNav.id = 'standalone-top-nav';
      topNav.className =
        'w-full bg-surface dark:bg-slate-900 border-b border-medium dark:border-slate-800 px-4 py-3 sticky top-0 z-50 mb-4 shadow-sm';
      topNav.innerHTML = `
        <div class="w-full flex items-center gap-4 px-3">
          <div class="shrink-0 pl-1 flex flex-col leading-tight">
            <a
              href="https://www.bentopdf.com"
              target="_blank"
              rel="noopener noreferrer"
              class="text-lg font-black tracking-widest text-darker dark:text-dark-text hover:text-accent transition-colors whitespace-nowrap"
            >
              BentoPDF
            </a>
            <span
              class="mt-0.5 text-[11px] font-medium text-muted dark:text-slate-400"
            >
              Az adataid nem hagyják el az eszközöd. Az oldal ingyenes, korlátlan és megfelel a GDPR-nak.
            </span>
          </div>
          <div class="flex items-center justify-center gap-3 flex-1 min-w-0">
            <div class="relative w-full max-w-[33.6rem]">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted dark:text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input
                id="standalone-search"
                type="search"
                placeholder="Keresés az eszközök között…"
                autocomplete="off"
                class="w-full pl-9 pr-4 py-2 rounded-xl bg-light dark:bg-slate-800 border border-medium dark:border-slate-700 text-sm text-dark dark:text-dark-text placeholder:text-muted dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <button
              id="standalone-fav-toggle"
              type="button"
              title="Csak kedvencek mutatása"
              class="shrink-0 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-muted dark:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </button>
          </div>
        </div>
      `;
      document.body.prepend(topNav);

      // Kereső bekötése a főoldali tool-szűrőhöz
      const searchInput =
        topNav.querySelector<HTMLInputElement>('#standalone-search');
      searchInput?.addEventListener('input', () => {
        const g = (window as any).__toolsSearch;
        if (typeof g === 'function') g(searchInput.value);
      });

      // Csak kedvencek gomb (csillag)
      topNav
        .querySelector('#standalone-fav-toggle')
        ?.addEventListener('click', (e) => {
          const btn = e.currentTarget as HTMLElement;
          const g = (window as any).__toolsFavoritesOnly;
          const on = typeof g === 'function' ? g() : false;
          btn.classList.toggle('text-amber-500', on);
        });
    }
  }

  await initI18n();
  await loadRuntimeConfig();
  injectLanguageSwitcher();
  applyTranslations();

  if (isCurrentPageDisabled()) {
    document.title = t('disabledTool.title') || 'Tool Unavailable';
    const main = document.querySelector('main') || document.body;
    const heading = t('disabledTool.heading') || 'This tool has been disabled';
    const message =
      t('disabledTool.message') ||
      'This tool is not available in your deployment. Contact your administrator for more information.';
    const backHome = t('disabledTool.backHome') || 'Back to Home';
    main.innerHTML = `
      <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <i class="ph ph-prohibit text-6xl text-slate-500 mb-4"></i>
        <h1 class="text-2xl font-bold text-white mb-2">${heading}</h1>
        <p class="text-slate-400 mb-6">${message}</p>
        <a href="${import.meta.env.BASE_URL}" class="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition">${backHome}</a>
      </div>
    `;
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
  if (__SIMPLE_MODE__) {
    const hideBrandingSections = () => {
      const heroSection = document.getElementById('hero-section');
      if (heroSection) {
        heroSection.style.display = 'none';
      }

      const githubLink = document.querySelector(
        'a[href*="github.com/alam00000/bentopdf"]'
      );
      if (githubLink) {
        (githubLink as HTMLElement).style.display = 'none';
      }

      const featuresSection = document.getElementById('features-section');
      if (featuresSection) {
        featuresSection.style.display = 'none';
      }

      const securitySection = document.getElementById(
        'security-compliance-section'
      );
      if (securitySection) {
        securitySection.style.display = 'none';
      }

      const faqSection = document.getElementById('faq-accordion');
      if (faqSection) {
        faqSection.style.display = 'none';
      }

      const testimonialsSection = document.getElementById(
        'testimonials-section'
      );
      if (testimonialsSection) {
        testimonialsSection.style.display = 'none';
      }

      const supportSection = document.getElementById('support-section');
      if (supportSection) {
        supportSection.style.display = 'none';
      }

      // Hide "Used by companies" section
      const usedBySection = document.querySelector(
        '.hide-section'
      ) as HTMLElement;
      if (usedBySection) {
        usedBySection.style.display = 'none';
      }

      const sectionDividers = document.querySelectorAll('.section-divider');
      sectionDividers.forEach((divider) => {
        (divider as HTMLElement).style.display = 'none';
      });

      const brandName = __BRAND_NAME__ || 'BentoPDF';
      document.title = `${brandName} - ${t('simpleMode.title')}`;

      const toolsHeader = document.getElementById('tools-header');
      if (toolsHeader) {
        const title = toolsHeader.querySelector('h2');
        const subtitle = toolsHeader.querySelector('p');
        if (title) {
          title.textContent = t('simpleMode.title');
          title.className = 'text-4xl md:text-5xl font-bold text-white mb-3';
        }
        if (subtitle) {
          subtitle.textContent = t('simpleMode.subtitle');
          subtitle.className = 'text-lg text-slate-400';
        }
      }

      const app = document.getElementById('app');
      if (app) {
        app.style.paddingTop = '1rem';
      }
    };

    hideBrandingSections();
  }

  // Hide shortcuts buttons on mobile devices (Android/iOS)
  // exclude iPad -> users can connect keyboard and use shortcuts
  const isMobile = /Android|iPhone|iPod/i.test(navigator.userAgent);
  const keyboardShortcutBtn = document.getElementById('shortcut');
  const shortcutSettingsBtn = document.getElementById('open-shortcuts-btn');

  if (isMobile) {
    if (keyboardShortcutBtn) keyboardShortcutBtn.style.display = 'none';
    if (shortcutSettingsBtn) shortcutSettingsBtn.style.display = 'none';
  } else {
    if (keyboardShortcutBtn) {
      keyboardShortcutBtn.textContent = navigator.userAgent
        .toUpperCase()
        .includes('MAC')
        ? '⌘ + K'
        : 'Ctrl + K';
    }
  }

  const categoryTranslationKeys: Record<string, string> = {
    'Popular Tools': 'tools:categories.popularTools',
    'Edit & Annotate': 'tools:categories.editAnnotate',
    'Convert to PDF': 'tools:categories.convertToPdf',
    'Convert from PDF': 'tools:categories.convertFromPdf',
    'Organize & Manage': 'tools:categories.organizeManage',
    'Optimize & Repair': 'tools:categories.optimizeRepair',
    'Secure PDF': 'tools:categories.securePdf',
  };

  const toolTranslationKeys: Record<string, string> = {
    'PDF Workflow Builder': 'tools:pdfWorkflow',
    'PDF Multi Tool': 'tools:pdfMultiTool',
    'Merge PDF': 'tools:mergePdf',
    'Split PDF': 'tools:splitPdf',
    'Compress PDF': 'tools:compressPdf',
    'PDF Editor': 'tools:pdfEditor',
    'Edit PDF Text': 'tools:editPdfText',
    'JPG to PDF': 'tools:jpgToPdf',
    'Sign PDF': 'tools:signPdf',
    'Crop PDF': 'tools:cropPdf',
    'Extract Pages': 'tools:extractPages',
    'Duplicate & Organize': 'tools:duplicateOrganize',
    'Delete Pages': 'tools:deletePages',
    'Edit Bookmarks': 'tools:editBookmarks',
    'Table of Contents': 'tools:tableOfContents',
    'Page Numbers': 'tools:pageNumbers',
    'Add Page Labels': 'tools:addPageLabels',
    'Add Watermark': 'tools:addWatermark',
    'Header & Footer': 'tools:headerFooter',
    'Invert Colors': 'tools:invertColors',
    'Background Color': 'tools:backgroundColor',
    'Change Text Color': 'tools:changeTextColor',
    'Add Stamps': 'tools:addStamps',
    'Bates Numbering': 'tools:batesNumbering',
    'Remove Annotations': 'tools:removeAnnotations',
    'PDF Form Filler': 'tools:pdfFormFiller',
    'Create PDF Form': 'tools:createPdfForm',
    'Remove Blank Pages': 'tools:removeBlankPages',
    'Images to PDF': 'tools:imageToPdf',
    'PNG to PDF': 'tools:pngToPdf',
    'WebP to PDF': 'tools:webpToPdf',
    'SVG to PDF': 'tools:svgToPdf',
    'BMP to PDF': 'tools:bmpToPdf',
    'HEIC to PDF': 'tools:heicToPdf',
    'TIFF to PDF': 'tools:tiffToPdf',
    'Text to PDF': 'tools:textToPdf',
    'JSON to PDF': 'tools:jsonToPdf',
    'PDF to JPG': 'tools:pdfToJpg',
    'PDF to PNG': 'tools:pdfToPng',
    'PDF to WebP': 'tools:pdfToWebp',
    'PDF to BMP': 'tools:pdfToBmp',
    'PDF to TIFF': 'tools:pdfToTiff',
    'PDF to CBZ': 'tools:pdfToCbz',
    'PDF to Greyscale': 'tools:pdfToGreyscale',
    'PDF to JSON': 'tools:pdfToJson',
    'OCR PDF': 'tools:ocrPdf',
    'Alternate & Mix Pages': 'tools:alternateMerge',
    'PDF Overlay': 'tools:pdfOverlay',
    'Organize & Duplicate': 'tools:duplicateOrganize',
    'Add Attachments': 'tools:addAttachments',
    'Extract Attachments': 'tools:extractAttachments',
    'Edit Attachments': 'tools:editAttachments',
    'Divide Pages': 'tools:dividePages',
    'Add Blank Page': 'tools:addBlankPage',
    'Reverse Pages': 'tools:reversePages',
    'Rotate PDF': 'tools:rotatePdf',
    'Rotate by Custom Degrees': 'tools:rotateCustom',
    'N-Up PDF': 'tools:nUpPdf',
    'Combine to Single Page': 'tools:combineToSinglePage',
    'View Metadata': 'tools:viewMetadata',
    'Edit Metadata': 'tools:editMetadata',
    'PDFs to ZIP': 'tools:pdfsToZip',
    'Compare PDFs': 'tools:comparePdfs',
    'Posterize PDF': 'tools:posterizePdf',
    'Fix Page Size': 'tools:fixPageSize',
    'Linearize PDF': 'tools:linearizePdf',
    'Page Dimensions': 'tools:pageDimensions',
    'Remove Restrictions': 'tools:removeRestrictions',
    'Repair PDF': 'tools:repairPdf',
    'Encrypt PDF': 'tools:encryptPdf',
    'Sanitize PDF': 'tools:sanitizePdf',
    'Decrypt PDF': 'tools:decryptPdf',
    'Flatten PDF': 'tools:flattenPdf',
    'Remove Metadata': 'tools:removeMetadata',
    'Change Permissions': 'tools:changePermissions',
    'Email to PDF': 'tools:emailToPdf',
    'Font to Outline': 'tools:fontToOutline',
    'Deskew PDF': 'tools:deskewPdf',
    'Digital Signature': 'tools:digitalSignPdf',
    'Validate Signature': 'tools:validateSignaturePdf',
    'Timestamp PDF': 'tools:timestampPdf',
    'Scanner Effect': 'tools:scannerEffect',
    'Adjust Colors': 'tools:adjustColors',
    'Markdown to PDF': 'tools:markdownToPdf',
    'PDF Booklet': 'tools:pdfBooklet',
    'Word to PDF': 'tools:wordToPdf',
    'Excel to PDF': 'tools:excelToPdf',
    'PowerPoint to PDF': 'tools:powerpointToPdf',
    'XPS to PDF': 'tools:xpsToPdf',
    'MOBI to PDF': 'tools:mobiToPdf',
    'EPUB to PDF': 'tools:epubToPdf',
    'FB2 to PDF': 'tools:fb2ToPdf',
    'CBZ to PDF': 'tools:cbzToPdf',
    'WPD to PDF': 'tools:wpdToPdf',
    'WPS to PDF': 'tools:wpsToPdf',
    'XML to PDF': 'tools:xmlToPdf',
    'Pages to PDF': 'tools:pagesToPdf',
    'ODG to PDF': 'tools:odgToPdf',
    'ODS to PDF': 'tools:odsToPdf',
    'ODP to PDF': 'tools:odpToPdf',
    'PUB to PDF': 'tools:pubToPdf',
    'VSD to PDF': 'tools:vsdToPdf',
    'PSD to PDF': 'tools:psdToPdf',
    'ODT to PDF': 'tools:odtToPdf',
    'CSV to PDF': 'tools:csvToPdf',
    'RTF to PDF': 'tools:rtfToPdf',
    'PDF to SVG': 'tools:pdfToSvg',
    'PDF to CSV': 'tools:pdfToCsv',
    'PDF to Excel': 'tools:pdfToExcel',
    'PDF to Text': 'tools:pdfToText',
    'Extract Tables': 'tools:extractTables',
    'PDF to Word': 'tools:pdfToWord',
    'Extract Images': 'tools:extractImages',
    'PDF to Markdown': 'tools:pdfToMarkdown',
    'Prepare PDF for AI': 'tools:preparePdfForAi',
    'PDF OCG': 'tools:pdfOcg',
    'PDF to PDF/A': 'tools:pdfToPdfa',
    'Rasterize PDF': 'tools:rasterizePdf',
  };

  // Homepage-only tool grid rendering (not used on individual tool pages)
  if (dom.toolGrid) {
    dom.toolGrid.textContent = '';

    let collapsedCategories: string[] = [];
    try {
      const stored = getStoredItem('collapsedCategories');
      if (stored) collapsedCategories = JSON.parse(stored);
    } catch {
      removeStoredItem('collapsedCategories');
    }

    function saveCollapsedCategories() {
      setStoredItem('collapsedCategories', JSON.stringify(collapsedCategories));
    }

    let currentFavorites: string[] = [];
    try {
      const rawFavs = localStorage.getItem('favoriteTools_v1');
      if (rawFavs) currentFavorites = JSON.parse(rawFavs);
    } catch {}

    function renderStarSvg(isFav: boolean): string {
      if (isFav) {
        return `<svg class="w-4 h-4 text-accent fill-accent transition-all duration-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      }
      return `<svg class="w-4 h-4 text-slate-300 dark:text-slate-600 hover:text-accent opacity-0 group-hover:opacity-100 transition-all duration-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }

    function updateAllFavoriteButtons(favs: string[]) {
      currentFavorites = favs;
      document
        .querySelectorAll<HTMLButtonElement>('.fav-toggle-btn')
        .forEach((btn) => {
          const id = btn.dataset.favToolId;
          if (!id) return;
          const isFav = favs.includes(id);
          btn.title = isFav
            ? 'Eltávolítás a kedvencekből'
            : 'Hozzáadás a kedvencekhez';
          btn.innerHTML = renderStarSvg(isFav);
        });
    }

    function toggleToolFavorite(toolId: string) {
      let favs: string[] = [];
      try {
        const raw = localStorage.getItem('favoriteTools_v1');
        if (raw) favs = JSON.parse(raw);
      } catch {}

      if (favs.includes(toolId)) {
        favs = favs.filter((id) => id !== toolId);
      } else {
        favs.push(toolId);
      }

      try {
        localStorage.setItem('favoriteTools_v1', JSON.stringify(favs));
      } catch {}

      window.parent.postMessage({ type: 'TOGGLE_FAVORITE', toolId }, '*');
      updateAllFavoriteButtons(favs);
      applyActiveFilters();
    }

    const filteredCategories = categories
      .filter(
        (category) =>
          category.name !== 'Popular Tools' &&
          category.name !== 'Népszerű eszközök'
      )
      .map((category) => ({
        ...category,
        tools: category.tools.filter((tool) => !isToolDisabled(tool.id)),
      }))
      .filter((category) => category.tools.length > 0);

    filteredCategories.forEach((category) => {
      const categoryGroup = document.createElement('div');
      categoryGroup.className = 'category-group col-span-full';

      const header = document.createElement('button');
      header.className = 'category-header';
      header.type = 'button';

      const title = document.createElement('span');
      const categoryKey = categoryTranslationKeys[category.name];
      title.textContent = categoryKey ? t(categoryKey) : category.name;

      const chevron = document.createElement('i');
      chevron.setAttribute('data-lucide', 'chevron-down');
      chevron.className =
        'category-chevron w-5 h-5 text-slate-400 transition-transform duration-300';

      header.append(chevron, title);

      const toolsContainer = document.createElement('div');
      toolsContainer.className =
        'category-tools grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4';

      const isCollapsed = collapsedCategories.includes(category.name);
      if (isCollapsed) {
        categoryGroup.classList.add('collapsed');
        toolsContainer.style.maxHeight = '0px';
      }

      toolsContainer.addEventListener('transitionend', (e) => {
        if ((e as TransitionEvent).propertyName !== 'max-height') return;
        if (!categoryGroup.classList.contains('collapsed')) {
          toolsContainer.style.maxHeight = 'none';
          toolsContainer.style.overflow = 'visible';
        }
      });

      header.addEventListener('click', () => {
        const collapsed = categoryGroup.classList.toggle('collapsed');
        if (collapsed) {
          toolsContainer.style.maxHeight = toolsContainer.scrollHeight + 'px';
          toolsContainer.style.overflow = 'hidden';
          requestAnimationFrame(() => {
            toolsContainer.style.maxHeight = '0px';
          });
          if (!collapsedCategories.includes(category.name)) {
            collapsedCategories.push(category.name);
          }
        } else {
          toolsContainer.style.overflow = 'hidden';
          toolsContainer.style.maxHeight = toolsContainer.scrollHeight + 'px';
          collapsedCategories = collapsedCategories.filter(
            (n) => n !== category.name
          );
        }
        saveCollapsedCategories();
      });

      category.tools.forEach((tool) => {
        let toolCard: HTMLDivElement | HTMLAnchorElement;
        const toolId = getToolId(tool);

        const cardClasses =
          'tool-card group relative flex flex-row items-center gap-4 p-3 rounded-2xl border border-medium dark:border-slate-800 bg-surface dark:bg-slate-900 shadow-sm hover:-translate-y-1.5 hover:border-accent hover:shadow-xl transition-all duration-300 transform no-underline cursor-pointer w-full text-left';

        if (tool.href) {
          toolCard = document.createElement('a');
          toolCard.href = tool.href;
          toolCard.className = `block ${cardClasses}`;
          toolCard.dataset.toolId = toolId;
        } else {
          toolCard = document.createElement('div');
          toolCard.className = cardClasses;
          toolCard.dataset.toolId = toolId;
        }

        const iconContainer = document.createElement('div');
        iconContainer.className =
          'w-10 h-10 p-2 rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white dark:bg-accent/20 transition-all duration-300 flex items-center justify-center shrink-0';

        const icon = document.createElement('i');
        if (tool.icon.startsWith('ph-')) {
          icon.className = `ph ${tool.icon} text-2xl`;
        } else {
          icon.className = 'w-5 h-5';
          icon.setAttribute('data-lucide', tool.icon);
        }
        iconContainer.appendChild(icon);

        const textContainer = document.createElement('div');
        textContainer.className = 'flex flex-col min-w-0 flex-1 ml-1 pr-6';

        const toolName = document.createElement('h3');
        toolName.className =
          'font-bold text-base leading-tight text-darker dark:text-dark-text group-hover:text-accent dark:group-hover:text-accent transition-colors text-left';
        const toolKey = toolTranslationKeys[tool.name];
        toolName.textContent = toolKey ? t(`${toolKey}.name`) : tool.name;
        textContainer.appendChild(toolName);

        if (tool.subtitle) {
          const toolSubtitle = document.createElement('p');
          toolSubtitle.className =
            'text-sm leading-snug font-medium text-muted dark:text-slate-400 mt-1 line-clamp-2 text-left';
          toolSubtitle.textContent = toolKey
            ? t(`${toolKey}.subtitle`)
            : tool.subtitle;
          textContainer.appendChild(toolSubtitle);
        }

        // Kedvenc csillag gomb
        const favBtn = document.createElement('button');
        favBtn.type = 'button';
        favBtn.dataset.favToolId = toolId;
        favBtn.className =
          'fav-toggle-btn absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full cursor-pointer hover:scale-110 transition-transform';
        const isFav = currentFavorites.includes(toolId);
        favBtn.title = isFav
          ? 'Eltávolítás a kedvencekből'
          : 'Hozzáadás a kedvencekhez';
        favBtn.innerHTML = renderStarSvg(isFav);

        favBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleToolFavorite(toolId);
        });

        toolCard.append(iconContainer, textContainer, favBtn);
        toolsContainer.appendChild(toolCard);
      });

      categoryGroup.append(header, toolsContainer);
      dom.toolGrid.appendChild(categoryGroup);

      if (!isCollapsed) {
        toolsContainer.style.maxHeight = 'none';
        toolsContainer.style.overflow = 'visible';
      }
    });

    // Üres állapot üzenet
    const emptyMessage = document.createElement('div');
    emptyMessage.id = 'empty-tools-message';
    emptyMessage.className =
      'hidden col-span-full py-16 text-center text-muted dark:text-slate-400 text-xs sm:text-sm font-medium';
    emptyMessage.textContent =
      'Nincs a megadott keresésnek vagy a kedvencek szűrésének megfelelő eszköz.';
    dom.toolGrid.appendChild(emptyMessage);

    let activeSearchTerm = '';
    let activeShowFavoritesOnly = false;

    function applyActiveFilters() {
      let totalVisible = 0;
      const categoryGroups =
        dom.toolGrid.querySelectorAll<HTMLElement>('.category-group');

      categoryGroups.forEach((group) => {
        const toolCards = group.querySelectorAll<HTMLElement>('.tool-card');
        let categoryVisibleCount = 0;

        toolCards.forEach((card) => {
          const toolId = card.dataset.toolId || '';
          const toolName = (
            card.querySelector('h3')?.textContent || ''
          ).toLowerCase();
          const toolSubtitle = (
            card.querySelector('p')?.textContent || ''
          ).toLowerCase();

          const matchesSearch =
            !activeSearchTerm ||
            toolName.includes(activeSearchTerm) ||
            toolSubtitle.includes(activeSearchTerm);

          const matchesFavorite =
            !activeShowFavoritesOnly || currentFavorites.includes(toolId);

          const isVisible = matchesSearch && matchesFavorite;
          card.style.display = isVisible ? '' : 'none';

          if (isVisible) {
            categoryVisibleCount++;
            totalVisible++;
          }
        });

        group.style.display = categoryVisibleCount > 0 ? '' : 'none';
      });

      if (totalVisible === 0) {
        emptyMessage.classList.remove('hidden');
      } else {
        emptyMessage.classList.add('hidden');
      }
    }

    // A standalone fejlécen lévő keresőmező bekötése a tool-szűrőbe
    (window as any).__toolsSearch = (term: string) => {
      activeSearchTerm = (term || '').toLowerCase().trim();
      applyActiveFilters();
    };

    // A standalone fejlécen lévő „csak kedvencek" gomb bekötése
    (window as any).__toolsFavoritesOnly = () => {
      activeShowFavoritesOnly = !activeShowFavoritesOnly;
      applyActiveFilters();
      return activeShowFavoritesOnly;
    };

    // Valós idejű szűrő- és témaváltás fogadása a Kincsesláda szülőablaktól
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'FILTER_CHANGE') {
        activeSearchTerm = (event.data.searchTerm || '').toLowerCase().trim();
        const standaloneSearch = document.getElementById(
          'standalone-search'
        ) as HTMLInputElement | null;
        if (standaloneSearch && !standaloneSearch.matches(':focus')) {
          standaloneSearch.value = event.data.searchTerm || '';
        }
        activeShowFavoritesOnly = !!event.data.showFavoritesOnly;
        const standaloneFav = document.getElementById('standalone-fav-toggle');
        if (standaloneFav)
          standaloneFav.classList.toggle(
            'text-amber-500',
            activeShowFavoritesOnly
          );
        if (Array.isArray(event.data.favoriteToolIds)) {
          currentFavorites = event.data.favoriteToolIds;
          updateAllFavoriteButtons(currentFavorites);
        }
        applyActiveFilters();
      }
      if (event.data?.type === 'THEME_CHANGE') {
        if (event.data.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    });

    // Kész: az ikonok inicializálása
    createIcons({ icons });

    dom.toolGrid.addEventListener('click', () => {
      // All tools now use href and navigate directly - no modal handling needed
    });
  }

  if (dom.backToGridBtn) {
    dom.backToGridBtn.addEventListener('click', () => switchView('grid'));
  }

  if (dom.alertOkBtn) {
    dom.alertOkBtn.addEventListener('click', hideAlert);
  }

  const faqAccordion = document.getElementById('faq-accordion');
  if (faqAccordion) {
    faqAccordion.addEventListener('click', (e) => {
      // @ts-expect-error TS(2339) FIXME: Property 'closest' does not exist on type 'EventTa... Remove this comment to see the full error message
      const questionButton = e.target.closest('.faq-question');
      if (!questionButton) return;

      const faqItem = questionButton.parentElement;
      const answer = faqItem.querySelector('.faq-answer');

      faqItem.classList.toggle('open');

      if (faqItem.classList.contains('open')) {
        answer.style.maxHeight = answer.scrollHeight + 'px';
      } else {
        answer.style.maxHeight = '0px';
      }
    });
  }

  createIcons({ icons });
  console.log('Please share our tool and share the love!');

  const githubStarsElements = [
    document.getElementById('github-stars-desktop'),
    document.getElementById('github-stars-mobile'),
  ];

  if (
    githubStarsElements.some((el) => el) &&
    !__SIMPLE_MODE__ &&
    !__DISABLE_GITHUB_STARS__
  ) {
    fetch('https://api.github.com/repos/alam00000/bentopdf')
      .then((response) => response.json())
      .then((data) => {
        if (data.stargazers_count !== undefined) {
          const formattedStars = formatStars(data.stargazers_count);
          githubStarsElements.forEach((el) => {
            if (el) el.textContent = formattedStars;
          });
        }
      })
      .catch(() => {
        githubStarsElements.forEach((el) => {
          if (el) el.textContent = '-';
        });
      });
  }

  // Initialize Shortcuts System
  ShortcutsManager.init();

  // Tab switching for settings modal
  const shortcutsTabBtn = document.getElementById('shortcuts-tab-btn');
  const preferencesTabBtn = document.getElementById('preferences-tab-btn');
  const shortcutsTabContent = document.getElementById('shortcuts-tab-content');
  const preferencesTabContent = document.getElementById(
    'preferences-tab-content'
  );
  const shortcutsTabFooter = document.getElementById('shortcuts-tab-footer');
  const preferencesTabFooter = document.getElementById(
    'preferences-tab-footer'
  );
  const resetShortcutsBtn = document.getElementById('reset-shortcuts-btn');

  if (shortcutsTabBtn && preferencesTabBtn) {
    shortcutsTabBtn.addEventListener('click', () => {
      shortcutsTabBtn.classList.add('bg-accent', 'text-white');
      shortcutsTabBtn.classList.remove('text-slate-300');
      preferencesTabBtn.classList.remove('bg-accent', 'text-white');
      preferencesTabBtn.classList.add('text-slate-300');
      shortcutsTabContent?.classList.remove('hidden');
      preferencesTabContent?.classList.add('hidden');
      shortcutsTabFooter?.classList.remove('hidden');
      preferencesTabFooter?.classList.add('hidden');
      resetShortcutsBtn?.classList.remove('hidden');
    });

    preferencesTabBtn.addEventListener('click', () => {
      preferencesTabBtn.classList.add('bg-accent', 'text-white');
      preferencesTabBtn.classList.remove('text-slate-300');
      shortcutsTabBtn.classList.remove('bg-accent', 'text-white');
      shortcutsTabBtn.classList.add('text-slate-300');
      preferencesTabContent?.classList.remove('hidden');
      shortcutsTabContent?.classList.add('hidden');
      preferencesTabFooter?.classList.remove('hidden');
      shortcutsTabFooter?.classList.add('hidden');
      resetShortcutsBtn?.classList.add('hidden');
    });
  }

  // Full-width toggle functionality
  const fullWidthToggle = document.getElementById(
    'full-width-toggle'
  ) as HTMLInputElement;
  const toolInterface = document.getElementById('tool-interface');

  const savedFullWidth = getStoredItem('fullWidthMode') !== 'false';
  if (fullWidthToggle) {
    fullWidthToggle.checked = savedFullWidth;
    applyFullWidthMode(savedFullWidth);
  }

  function applyFullWidthMode(enabled: boolean) {
    if (toolInterface) {
      if (enabled) {
        toolInterface.classList.remove('max-w-4xl');
      } else {
        toolInterface.classList.add('max-w-4xl');
      }
    }

    // Apply to all page uploaders
    const pageUploaders = document.querySelectorAll(
      '#tool-uploader, #signature-editor'
    );
    pageUploaders.forEach((uploader) => {
      if (enabled) {
        uploader.classList.remove('max-w-2xl', 'max-w-5xl');
      } else {
        // Restore original max-width (most are max-w-2xl, add-stamps is max-w-5xl)
        if (
          !uploader.classList.contains('max-w-2xl') &&
          !uploader.classList.contains('max-w-5xl')
        ) {
          uploader.classList.add('max-w-2xl');
        }
      }
    });
  }

  if (fullWidthToggle) {
    fullWidthToggle.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      setStoredItem('fullWidthMode', enabled.toString());
      applyFullWidthMode(enabled);
    });
  }

  const compactModeToggle = document.getElementById(
    'compact-mode-toggle'
  ) as HTMLInputElement;

  const savedCompactMode = getStoredItem('compactMode') === 'true';
  if (compactModeToggle) {
    compactModeToggle.checked = savedCompactMode;
  }
  applyCompactMode(savedCompactMode);

  function applyCompactMode(enabled: boolean) {
    if (dom.toolGrid) {
      dom.toolGrid.classList.toggle('compact-mode', enabled);
      dom.toolGrid
        .querySelectorAll('.category-group:not(.collapsed) .category-tools')
        .forEach((container) => {
          (container as HTMLElement).style.maxHeight = 'none';
        });
    }
  }

  if (compactModeToggle) {
    compactModeToggle.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      setStoredItem('compactMode', enabled.toString());
      applyCompactMode(enabled);
    });
  }

  // Shortcuts UI Handlers
  if (dom.openShortcutsBtn) {
    dom.openShortcutsBtn.addEventListener('click', () => {
      renderShortcutsList();
      dom.shortcutsModal.classList.remove('hidden');
    });
  }

  if (dom.closeShortcutsModalBtn) {
    dom.closeShortcutsModalBtn.addEventListener('click', () => {
      dom.shortcutsModal.classList.add('hidden');
    });
  }

  // Close modal on outside click
  if (dom.shortcutsModal) {
    dom.shortcutsModal.addEventListener('click', (e) => {
      if (e.target === dom.shortcutsModal) {
        dom.shortcutsModal.classList.add('hidden');
      }
    });
  }

  if (dom.resetShortcutsBtn) {
    dom.resetShortcutsBtn.addEventListener('click', async () => {
      const confirmed = await showWarningModal(
        t('settings.warnings.resetTitle'),
        t('settings.warnings.resetMessage'),
        true
      );

      if (confirmed) {
        ShortcutsManager.reset();
        renderShortcutsList();
      }
    });
  }

  if (dom.exportShortcutsBtn) {
    dom.exportShortcutsBtn.addEventListener('click', () => {
      ShortcutsManager.exportSettings();
    });
  }

  if (dom.importShortcutsBtn) {
    dom.importShortcutsBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const content = e.target?.result as string;
            if (ShortcutsManager.importSettings(content)) {
              renderShortcutsList();
              await showWarningModal(
                t('settings.warnings.importSuccessTitle'),
                t('settings.warnings.importSuccessMessage'),
                false
              );
            } else {
              await showWarningModal(
                t('settings.warnings.importFailTitle'),
                t('settings.warnings.importFailMessage'),
                false
              );
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    });
  }

  if (dom.shortcutSearch) {
    dom.shortcutSearch.addEventListener('input', (e) => {
      const term = (e.target as HTMLInputElement).value.toLowerCase();
      const sections = dom.shortcutsList.querySelectorAll('.category-section');

      sections.forEach((section) => {
        const items = section.querySelectorAll('.shortcut-item');
        let visibleCount = 0;

        items.forEach((item) => {
          const text = item.textContent?.toLowerCase() || '';
          if (text.includes(term)) {
            item.classList.remove('hidden');
            visibleCount++;
          } else {
            item.classList.add('hidden');
          }
        });

        if (visibleCount === 0) {
          section.classList.add('hidden');
        } else {
          section.classList.remove('hidden');
        }
      });
    });
  }

  // Reserved shortcuts that commonly conflict with browser/OS functions
  const RESERVED_SHORTCUTS: Record<string, { mac?: string; windows?: string }> =
    {
      'mod+w': { mac: 'Closes tab', windows: 'Closes tab' },
      'mod+t': { mac: 'Opens new tab', windows: 'Opens new tab' },
      'mod+n': { mac: 'Opens new window', windows: 'Opens new window' },
      'mod+shift+n': {
        mac: 'Opens incognito window',
        windows: 'Opens incognito window',
      },
      'mod+q': { mac: 'Quits application (cannot be overridden)' },
      'mod+m': { mac: 'Minimizes window' },
      'mod+h': { mac: 'Hides window' },
      'mod+r': { mac: 'Reloads page', windows: 'Reloads page' },
      'mod+shift+r': { mac: 'Hard reloads page', windows: 'Hard reloads page' },
      'mod+l': { mac: 'Focuses address bar', windows: 'Focuses address bar' },
      'mod+d': { mac: 'Bookmarks page', windows: 'Bookmarks page' },
      'mod+shift+t': {
        mac: 'Reopens closed tab',
        windows: 'Reopens closed tab',
      },
      'mod+shift+w': { mac: 'Closes window', windows: 'Closes window' },
      'mod+tab': { mac: 'Switches tabs', windows: 'Switches apps' },
      'alt+f4': { windows: 'Closes window' },
      'ctrl+tab': { mac: 'Switches tabs', windows: 'Switches tabs' },
    };

  function getReservedShortcutWarning(
    combo: string,
    isMac: boolean
  ): string | null {
    const reserved = RESERVED_SHORTCUTS[combo];
    if (!reserved) return null;

    const description = isMac ? reserved.mac : reserved.windows;
    if (!description) return null;

    return description;
  }

  function showWarningModal(
    title: string,
    message: string,
    confirmMode: boolean = true
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (
        !dom.warningModal ||
        !dom.warningTitle ||
        !dom.warningMessage ||
        !dom.warningCancelBtn ||
        !dom.warningConfirmBtn
      ) {
        resolve(confirmMode ? confirm(message) : (alert(message), true));
        return;
      }

      dom.warningTitle.textContent = title;
      dom.warningMessage.innerHTML = message;
      dom.warningModal.classList.remove('hidden');
      dom.warningModal.classList.add('flex');

      if (confirmMode) {
        dom.warningCancelBtn.style.display = '';
        dom.warningConfirmBtn.textContent = t('warning.proceed');
      } else {
        dom.warningCancelBtn.style.display = 'none';
        dom.warningConfirmBtn.textContent = t('alert.ok');
      }

      const handleConfirm = () => {
        cleanup();
        resolve(true);
      };

      const handleCancel = () => {
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        dom.warningModal?.classList.add('hidden');
        dom.warningModal?.classList.remove('flex');
        dom.warningConfirmBtn?.removeEventListener('click', handleConfirm);
        dom.warningCancelBtn?.removeEventListener('click', handleCancel);
      };

      dom.warningConfirmBtn.addEventListener('click', handleConfirm);
      dom.warningCancelBtn.addEventListener('click', handleCancel);

      // Close on backdrop click
      dom.warningModal.addEventListener(
        'click',
        (e) => {
          if (e.target === dom.warningModal) {
            if (confirmMode) {
              handleCancel();
            } else {
              handleConfirm();
            }
          }
        },
        { once: true }
      );
    });
  }

  function getToolId(tool: { id?: string; href?: string }): string {
    if (tool.id) return tool.id;
    if (tool.href) {
      const match = tool.href.match(/\/([^/]+)\.html$/);
      return match ? match[1] : tool.href;
    }
    return 'unknown';
  }

  function renderShortcutsList() {
    if (!dom.shortcutsList) return;
    dom.shortcutsList.innerHTML = '';

    const allShortcuts = ShortcutsManager.getAllShortcuts();
    const isMac = navigator.userAgent.toUpperCase().includes('MAC');
    const shortcutCategories = categories
      .map((category) => ({
        ...category,
        tools: category.tools.filter((tool) => !isToolDisabled(tool.id)),
      }))
      .filter((category) => category.tools.length > 0);
    const allTools = shortcutCategories.flatMap((c) => c.tools);

    shortcutCategories.forEach((category) => {
      const section = document.createElement('div');
      section.className = 'category-section mb-6 last:mb-0';

      const header = document.createElement('h3');
      header.className =
        'text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 pl-1';
      const categoryKey = categoryTranslationKeys[category.name];
      header.textContent = categoryKey ? t(categoryKey) : category.name;
      section.appendChild(header);

      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'space-y-2';
      section.appendChild(itemsContainer);

      let hasTools = false;

      category.tools.forEach((tool) => {
        hasTools = true;
        const toolId = getToolId(tool);
        const currentShortcut = allShortcuts.get(toolId) || '';

        const item = document.createElement('div');
        item.className =
          'shortcut-item flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors';

        const left = document.createElement('div');
        left.className = 'flex items-center gap-3';

        const icon = document.createElement('i');
        if (tool.icon.startsWith('ph-')) {
          icon.className = `ph ${tool.icon} w-5 h-5 text-accent`;
        } else {
          icon.className = 'w-5 h-5 text-accent';
          icon.setAttribute('data-lucide', tool.icon);
        }

        const name = document.createElement('span');
        name.className = 'text-slate-200 font-medium';
        const toolKey = toolTranslationKeys[tool.name];
        name.textContent = toolKey ? t(`${toolKey}.name`) : tool.name;

        left.append(icon, name);

        const right = document.createElement('div');
        right.className = 'relative';

        const input = document.createElement('input');
        input.type = 'text';
        input.className =
          'shortcut-input w-32 bg-slate-800 border border-slate-600 text-white text-center text-sm rounded px-2 py-1 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all';
        input.placeholder = t('settings.clickToSet');
        input.value = formatShortcutDisplay(currentShortcut, isMac);
        input.readOnly = true;

        const clearBtn = document.createElement('button');
        clearBtn.className =
          'absolute -right-2 -top-2 bg-slate-700 hover:bg-red-600 text-white rounded-full p-0.5 hidden group-hover:block shadow-sm';
        clearBtn.innerHTML = '<i data-lucide="x" class="w-3 h-3"></i>';
        if (currentShortcut) {
          right.classList.add('group');
        }

        clearBtn.onclick = (e) => {
          e.stopPropagation();
          ShortcutsManager.setShortcut(toolId, '');
          renderShortcutsList();
        };

        input.onkeydown = async (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (e.key === 'Backspace' || e.key === 'Törlés') {
            ShortcutsManager.setShortcut(toolId, '');
            renderShortcutsList();
            return;
          }

          const keys: string[] = [];
          // On Mac: metaKey = Command, ctrlKey = Control
          // On Windows/Linux: metaKey is rare, ctrlKey = Ctrl
          if (isMac) {
            if (e.metaKey) keys.push('mod'); // Command on Mac
            if (e.ctrlKey) keys.push('ctrl'); // Control on Mac (separate from Command)
          } else {
            if (e.ctrlKey || e.metaKey) keys.push('mod'); // Ctrl on Windows/Linux
          }
          if (e.altKey) keys.push('alt');
          if (e.shiftKey) keys.push('shift');

          let key = e.key.toLowerCase();

          if (e.altKey && e.code) {
            if (e.code.startsWith('Key')) {
              key = e.code.slice(3).toLowerCase();
            } else if (e.code.startsWith('Digit')) {
              key = e.code.slice(5);
            }
          }

          const isModifier = ['control', 'shift', 'alt', 'meta'].includes(key);
          const isDeadKey = key === 'dead' || key.startsWith('dead');

          // Ignore dead keys (used for accented characters on Mac with Option key)
          if (isDeadKey) {
            input.value = formatShortcutDisplay(
              ShortcutsManager.getShortcut(toolId) || '',
              isMac
            );
            return;
          }

          if (!isModifier) {
            keys.push(key);
          }

          const combo = keys.join('+');

          input.value = formatShortcutDisplay(combo, isMac);

          if (!isModifier) {
            const existingToolId = ShortcutsManager.findToolByShortcut(combo);

            if (existingToolId && existingToolId !== toolId) {
              const existingTool = allTools.find(
                (t) => getToolId(t) === existingToolId
              );
              const existingToolName = existingTool?.name || existingToolId;
              const displayCombo = formatShortcutDisplay(combo, isMac);

              const existingToolKey = existingTool
                ? toolTranslationKeys[existingTool.name]
                : null;
              const translatedToolName = existingToolKey
                ? t(`${existingToolKey}.name`)
                : existingToolName;

              await showWarningModal(
                t('settings.warnings.alreadyInUse'),
                `<strong>${escapeHtml(displayCombo)}</strong> ${t('settings.warnings.assignedTo')}<br><br>` +
                  `<em>"${escapeHtml(translatedToolName)}"</em><br><br>` +
                  t('settings.warnings.chooseDifferent'),
                false
              );

              input.value = formatShortcutDisplay(
                ShortcutsManager.getShortcut(toolId) || '',
                isMac
              );
              input.classList.remove('border-accent', 'text-accent');
              input.blur();
              return;
            }

            const reservedWarning = getReservedShortcutWarning(combo, isMac);
            if (reservedWarning) {
              const displayCombo = formatShortcutDisplay(combo, isMac);
              const shouldProceed = await showWarningModal(
                t('settings.warnings.reserved'),
                `<strong>${escapeHtml(displayCombo)}</strong> ${t('settings.warnings.commonlyUsed')}<br><br>` +
                  `"<em>${escapeHtml(reservedWarning)}</em>"<br><br>` +
                  `${t('settings.warnings.unreliable')}<br><br>` +
                  t('settings.warnings.useAnyway')
              );

              if (!shouldProceed) {
                // Revert display
                input.value = formatShortcutDisplay(
                  ShortcutsManager.getShortcut(toolId) || '',
                  isMac
                );
                input.classList.remove('border-accent', 'text-accent');
                input.blur();
                return;
              }
            }

            ShortcutsManager.setShortcut(toolId, combo);
            // Re-render to update all inputs (show conflicts in real-time)
            renderShortcutsList();
          }
        };

        input.onkeyup = (e) => {
          // If the user releases a modifier without pressing a main key, revert to saved
          const key = e.key.toLowerCase();
          if (['control', 'shift', 'alt', 'meta'].includes(key)) {
            const currentSaved = ShortcutsManager.getShortcut(toolId);
          }
        };

        input.onfocus = () => {
          input.value = t('settings.pressKeys');
          input.classList.add('border-accent', 'text-accent');
        };

        input.onblur = () => {
          input.value = formatShortcutDisplay(
            ShortcutsManager.getShortcut(toolId) || '',
            isMac
          );
          input.classList.remove('border-accent', 'text-accent');
        };

        right.append(input);
        if (currentShortcut) right.append(clearBtn);

        item.append(left, right);
        itemsContainer.appendChild(item);
      });

      if (hasTools) {
        dom.shortcutsList.appendChild(section);
      }
    });

    createIcons({ icons });
  }

  const scrollToTopBtn = document.getElementById('scroll-to-top-btn');

  if (scrollToTopBtn) {
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < lastScrollY && currentScrollY > 300) {
        scrollToTopBtn.classList.add('visible');
      } else {
        scrollToTopBtn.classList.remove('visible');
      }

      lastScrollY = currentScrollY;
    });

    scrollToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'instant',
      });
    });
  }

  // Rewrite links after all dynamic content is fully loaded
  rewriteLinks();
};

window.addEventListener('load', init);
