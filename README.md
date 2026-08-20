# PDF stúdió (BentoPDF – magyar tükör)

Magyar nyelvű, ingyenes, böngészőben futó PDF- és dokumentumkezelő webalkalmazás.
A [BentoPDF](https://github.com/bentopdf/bentopdf) nyílt forrású projektből készült,
**teljesen magyarra fordított** (100%, minden oldal `lang="hu"`) változat. ADATvédelem-első:
a feldolgozás a böngészőben történik, a fájlok nem hagyják el a gépedet.

> **Statikus, böngésző-klens oldali app.** Deploy: Vercel / GitHub Pages.
> Felhasználóinak száma és az eszköztár magyarul van, lásd lentebb a parancsokat.

## Miben más, mint az eredeti?

- Minden oldal, felirat, gomb, meta (title/description/og/twitter/JSON-LD) **magyar**.
- A márkázás egységes: **„PDF stúdió”** (míg az `og:site_name` megőrzi a BentoPDF nevet a visszamutatókhoz).
- A bérmegoldás-motor (pdfium, viewer), WASM-alapú PDF-kezelők változatlanul működnek.

## Funkciók (a teljes eszköztár)

Dokumentum-konvertáló (PDF ↔ DOCX ↔ Excel ↔ JPG ↔ CBZ ↔ Markdown ↔ JSON ↔ PDF/A stb.),
PDF-szerkesztő (vízjel, aláírás, oldallábléc, szöveg, megjegyzések…), oldal- és dokumentumkezelés
(merge/split/compress/crop/rotate), biztonság (jelszó, AES, eltávolítás), valamint e-mail- és
űrlap-kezelők, képfeldolgozás — 118 eszközoldal, mind magyarul.

## Követelmények

- Node.js 22+ és npm
- GitHub-hozzáférés az egyes `file:` és git-függőségek telepítéséhez
  (`bentopdf-pdfium`, `bentopdf-viewer` a `vendor/`-ban; `xlsx` a CDN SheetJS-ről jön)

## Fejlesztés

```bash
npm install          # először (GitHub/működő npm-források kellenek hozzá)
npm run dev          # Vite dev szerver (localhost:3000)
```

## Éles build + előnézet

```bash
npm run build        # tsc + vite build + i18n oldalak, sitemap, biztonsági fejlécek → dist/
npm run preview      # a buildelt dist/ helyi előnézete
```

`npm run build:production` a CDN-alapú építéshez; `npm run build:gzip` / `:brotli` / `:all`
a tömörített változatokhoz (`variable COMPRESSION_MODE=…`).

## Deploy

A projekt **statikus builde** (`dist/`) kerül élesbe. Két ajánlott mód:

### Vercel
1. Repo import a Vercelben; a build parancs: `npm run build`, az output könyvtár: `dist`.
   (Pl. `vercel.json`-ben megadható mindkettő, lásd alább.)

### GitHub Pages
1. Hozz létre publikus repót, és GitHub Actions-szel építsd a `dist/`-et a `gh-pages` ágra,
   vagy töltsd fel kézzel a `dist/` tartalmát.

## Tesztelés

```bash
npm run test:run     # Vitest unit tesztek
npm run lint         # ESLint
npm run security:audit  # npm audit + biztonsági lint
```

## Licenc

[AGPL-3.0-only](./LICENSE). Az eredeti projekt: BentoPDF.
