/**
 * Clean vector adaptation of the client-supplied Renarchi identity.
 * Wordmark and tagline are paths, so their appearance never depends on fonts.
 * Rebuild with `node scripts/generate-brand.mjs [path/to/sharp]`.
 * This is an asset-authoring utility; the website build uses committed assets.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || 'sharp');
const publicDir = path.resolve(import.meta.dirname, '../public');
const brandDir = path.join(publicDir, 'assets/brand');
await fs.mkdir(brandDir, { recursive: true });

const palette = { dark: '#4B3428', light: '#F3E5D4' };
// Coordinates preserve the supplied mark's apex, asymmetric line weights and gap.
const symbol = '<path d="M357 702H382L469 554H444Z M445 627H455L629 333L817 702H842L638 302Z M579 409L738 702H762L585 390Z"/>';
// Bespoke, outlined RENARCHI lettering based on the supplied artwork.
const wordmark = `<path d="M0 0H49C78 0 91 10 91 28C91 46 80 55 55 57L97 103H83L43 58H29V54H46C69 54 79 45 79 28C79 11 69 3 47 3H11V103H0Z"/>
<path d="M113 0H195V3H124V48H182V51H124V100H195V103H113Z"/>
<path d="M216 0H220L311 87V0H315V103H311L220 16V103H216Z"/>
<path d="M388 0H392L442 103H430L387 15L340 103H335Z"/>
<path d="M447 0H498C525 0 536 11 536 28C536 47 523 56 501 57L542 103H528L489 58H473V54H493C514 54 524 45 524 28C524 10 514 3 495 3H449Z"/>
<path d="M650 16L647 20C635 8 623 2 609 2C581 2 565 20 565 52C565 83 581 101 609 101C624 101 637 95 647 84L651 88C639 101 625 105 609 105C574 105 553 84 553 53C553 21 575-2 609-2C626-2 640 4 650 16Z"/>
<path d="M667 0H678V48H756V0H767V103H756V51H678V103H667Z M790 0H801V103H790Z"/>`;

// Geometric lettering for the three practice areas, with no external font dependency.
const letters = {
  A:'M0 20L7 0L14 20M3 13H11', R:'M0 20V0H6C16 0 16 10 6 10H0M6 10L14 20',
  Q:'M14 10C14 24 0 24 0 10C0-3 14-3 14 10ZM9 15L16 23', U:'M0 0V13C0 23 14 23 14 13V0',
  I:'M7 0V20', T:'M0 0H14M7 0V20', E:'M14 0H0V20H14M0 10H11',
  N:'M0 20V0L14 20V0', O:'M14 10C14 24 0 24 0 10C0-3 14-3 14 10Z',
  S:'M14 2C8-3 0 0 0 5C0 12 14 8 14 15C14 21 6 23 0 18',
  C:'M14 3C8-3 0 0 0 10C0 20 8 23 14 17', D:'M0 0V20H5C17 20 17 0 5 0Z',
  H:'M0 0V20M14 0V20M0 10H14',
};
const spell = (value, start) => [...value].map((letter, i) => `<path transform="translate(${start + i*24} 0)" d="${letters[letter]}"/>`).join('');
const tagline = `<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">${spell('ARQUITETURA', 0)}${spell('INTERIORES', 342)}${spell('CIDADES', 650)}</g><circle cx="291" cy="10" r="2.4"/><circle cx="603" cy="10" r="2.4"/>`;
const taglineEn = `<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">${spell('ARCHITECTURE', 0)}${spell('INTERIORS', 363)}${spell('CITIES', 670)}</g><circle cx="323" cy="10" r="2.4"/><circle cx="620" cy="10" r="2.4"/>`;

const svg = (width, height, viewBox, content, color, label='Renarchi — Arquitetura, Interiores, Cidades') => `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" role="img" aria-label="${label}" style="color:${color}" fill="currentColor">${content}</svg>\n`;
for (const [variant, color] of Object.entries(palette)) {
  const stacked = svg(840,670,'210 280 840 670',`${symbol}<g transform="translate(225 769)">${wordmark}</g><g transform="translate(225 905)">${tagline}</g>`,color);
  const compact = svg(1000,180,'0 0 1000 180',`<g transform="translate(-118 -104) scale(.375)">${symbol}</g><g transform="translate(223 24) scale(.94)">${wordmark}<g transform="translate(0 138)">${tagline}</g></g>`,color);
  const name = svg(840,180,'-18 -12 840 180',`${wordmark}<g transform="translate(0 138)">${tagline}</g>`,color);
  const mark = svg(512,512,'296 240 608 608',symbol,color,'Símbolo Renarchi');
  const core = svg(1000,180,'0 0 1000 180',`<g transform="translate(-118 -104) scale(.375)">${symbol}</g><g transform="translate(223 45) scale(.94)">${wordmark}</g>`,color,'Renarchi');
  const stackedCore = svg(840,620,'210 280 840 620',`${symbol}<g transform="translate(225 769)">${wordmark}</g>`,color,'Renarchi');
  for (const [asset, data] of [['logo',stacked],['lockup',compact],['wordmark',name],['symbol',mark],['lockup-core',core],['logo-core',stackedCore]]) {
    await fs.writeFile(path.join(brandDir,`renarchi-${asset}-${variant}.svg`),data);
  }
  for (const [asset, data] of [['logo',stacked],['lockup',compact],['wordmark',name]]) {
    await fs.writeFile(path.join(brandDir,`renarchi-${asset}-en-${variant}.svg`),data.replace(tagline,taglineEn).replace('Arquitetura, Interiores, Cidades','Architecture, Interiors, Cities'));
  }
  await sharp(Buffer.from(stacked)).resize(1024).png().toFile(path.join(brandDir,`renarchi-logo-${variant}.png`));
}

const icon = (size,adaptive=false) => `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><style>.surface{fill:${palette.light}}.mark{fill:${palette.dark}}${adaptive?`@media(prefers-color-scheme:dark){.surface{fill:${palette.dark}}.mark{fill:${palette.light}}}`:''}</style><rect class="surface" width="64" height="64" rx="8"/><g class="mark" transform="translate(-31.29 -21.06) scale(.1057)">${symbol}</g></svg>\n`;
await fs.writeFile(path.join(publicDir,'favicon.svg'),icon(64,true));
const pngs = new Map();
for (const size of [16,32,48,180,192,512]) {
  const buffer = await sharp(Buffer.from(icon(size))).resize(size,size).png().toBuffer();
  pngs.set(size,buffer);
  const filename = size===180?'apple-touch-icon.png':size>=192?`icon-${size}.png`:`favicon-${size}x${size}.png`;
  await fs.writeFile(path.join(publicDir,filename),buffer);
}
// ICO container with lossless PNG payloads at the three standard browser sizes.
const icoSizes=[16,32,48];
const header=Buffer.alloc(6+16*icoSizes.length);
header.writeUInt16LE(1,2);header.writeUInt16LE(icoSizes.length,4);
let offset=header.length;
for (let i=0;i<icoSizes.length;i++) {
  const size=icoSizes[i],buffer=pngs.get(size),at=6+i*16;
  header[at]=size;header[at+1]=size;header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);
  header.writeUInt32LE(buffer.length,at+8);header.writeUInt32LE(offset,at+12);offset+=buffer.length;
}
await fs.writeFile(path.join(publicDir,'favicon.ico'),Buffer.concat([header,...icoSizes.map(size=>pngs.get(size))]));
await fs.writeFile(path.join(publicDir,'site.webmanifest'),JSON.stringify({
  name:'Renarchi — Arquitetura, Interiores, Cidades',short_name:'Renarchi',id:'/',start_url:'/',scope:'/',
  display:'browser',lang:'pt-BR',background_color:'#F5F0E8',theme_color:palette.dark,
  icons:[{src:'icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'}]
},null,2)+'\n');
console.log('Brand SVGs, logo PNGs, theme-aware favicon, ICO and install icons generated.');
