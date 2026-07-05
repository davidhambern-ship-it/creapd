/**
 * CREAPD Custom Fonts Registry
 * 
 * These fonts are permanently hosted on Base44 file storage.
 * Each entry maps a semantic font name to its static URL.
 * 
 * To use in a component:
 *   import { CREAPD_FONTS } from '@/lib/creapdFonts';
 *   style={{ fontFamily: CREAPD_FONTS.heading.family }}
 * 
 * To add a new font:
 *   1. Upload the .ttf file via a backend function (see uploadFont pattern).
 *   2. Add an entry below with the returned file_url.
 */

export const CREAPD_FONTS = {
  heading: {
    name: 'CreapdCustom',
    family: "'CreapdCustom', sans-serif",
    url: 'https://base44.app/api/apps/6a4126962e5804304cc84b12/files/mp/public/6a4126962e5804304cc84b12/c3e48bc1e_CreapdCustom.ttf',
    description: 'Main brand heading font — "Welcome to CREAPD"',
    uploaded: '2026-07-05',
  },
  tagline: {
    name: 'CreapdTagline',
    family: "'CreapdTagline', sans-serif",
    url: 'https://base44.app/api/apps/6a4126962e5804304cc84b12/files/mp/public/6a4126962e5804304cc84b12/ecb20b7b6_CreapdTagline.ttf',
    description: 'Tagline font — "Create. Automate. Produce. Direct."',
    uploaded: '2026-07-05',
  },
};

/**
 * CSS @font-face declarations for injection into index.css.
 * Each block registers the font-family name so it can be referenced
 * via fontFamily inline styles or Tailwind config.
 */
export const CREAPD_FONT_FACE_CSS = `
@font-face {
  font-family: 'CreapdCustom';
  src: url('${CREAPD_FONTS.heading.url}') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'CreapdTagline';
  src: url('${CREAPD_FONTS.tagline.url}') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
`;