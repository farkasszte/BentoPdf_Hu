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

A projekt **statikus builde** (`dist/`) kerül élesbe. Két támogatott mód:

### Közzététel (önálló publikus repó + push)

A repó a gyökértől (`/`) épül — a `vite.config.ts` a `BASE_URL` környezeti
változóból veszi az alap-útvonalat (alapértelmezett subapp-prefix helyett).

```bash
# a repó már git-inicializálva van (main ág, kezdő commit kész)
git remote add origin https://github.com/<felhasznalo>/<repo-neve>.git
git push -u origin main
```

> Repó létrehozás előtt: a számodra fontos infrastruktúra-fájlok (Docker/nginx/
> cloudflare/helm, az eredeti CLA/sponsor) a `732fc20`-ból eltávolíthatók — lásd a
> „Takarítás” részt. A `.github/workflows/deploy-pages.yml` az egyetlen CI.

### Vercel
1. Importáld a repót a Vercelben. A `vercel.json` már beállítja:
   - build parancs: `npm run build`
   - output könyvtár: `dist`
   - `BASE_URL=/` (gyökéren jelenik meg).
2. Várj az automatikus buildre — kész. (Előnézet is készül minden push-ra.)

### GitHub Pages
1. Hozd létre a **publikus** repót, és a *Settings → Pages → Build and
   deployment → Source* értéke legyen **GitHub Actions**.
2. Push a `main` ágra — a `.github/workflows/deploy-pages.yml` automatikusan
   lefut, és a `dist/` a Pages-re kerül.
   - **Projekt-repó** esetén a build `BASE_URL="/<repo-neve>/"`-t használ (ezért
     a cím `https://<felhasznalo>.github.io/<repo-neve>/`).
   - Ha a repó egy `<felhasznalo>.github.io` (user-site) repó, akkor a
     workflow-ban a `BASE_URL`-t `/`-ra kell venni.

> A buildhez nincs `git:` függőség: a `vendor/`-beli tarballok és a
> `xlsx` (cdn.sheetjs.com) önállóan telepíthetők `npm ci`-vel.

## Takarítás (elhagyható, személyes döntés)

A tüköraból értelemszerűen törölhető az eredeti projektre vonatkozó
infrastruktúra, ha nem kell: `Dockerfile*`, `docker-compose*.yml`,
`entrypoint.sh`, `nginx*`, `unraid_bentopdf.xml`, `chart/`, `cloudflare/`,
`.trivyignore`, `CCLA.md`, `ICLA.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`,
`SECURITY.md`, `.github/FUNDING.yml` (az eredeti szponzora), `signatures/`,
`.well-known/funding-manifest-urls`. *(Mind visszanyerhető a `732fc20`-ból.)*

## Tesztelés

```bash
npm run test:run     # Vitest unit tesztek
npm run lint         # ESLint
npm run security:audit  # npm audit + biztonsági lint
```

## Licenc

[AGPL-3.0-only](./LICENSE). Az eredeti projekt: BentoPDF.
