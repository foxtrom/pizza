// Génère les icônes PNG (180, 192 et 512 px) à partir de icons/icon.svg,
// avec Chrome (ou Edge) sans fenêtre :   node dev/icones.mjs
// (variable NAVIGATEUR pour indiquer un autre chemin de navigateur ;
//  sur ce PC, Edge refuse les captures sans fenêtre, d'où Chrome en premier)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RACINE = resolve(fileURLToPath(new URL('..', import.meta.url)));
const NAVIGATEURS = [
  process.env.NAVIGATEUR,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean);

const navigateur = NAVIGATEURS.find((chemin) => existsSync(chemin));
if (!navigateur) {
  console.error('Edge ou Chrome introuvable : indiquer son chemin dans la variable NAVIGATEUR.');
  process.exit(1);
}

const svg = readFileSync(join(RACINE, 'icons', 'icon.svg'), 'utf8');
const dossier = mkdtempSync(join(tmpdir(), 'pizzeria-icones-'));
try {
  for (const taille of [180, 192, 512]) {
    const page = join(dossier, `icone-${taille}.html`);
    writeFileSync(
      page,
      `<!doctype html><html><head><style>html,body{margin:0;padding:0;overflow:hidden}svg{display:block;width:${taille}px;height:${taille}px}</style></head><body>${svg}</body></html>`,
    );
    const sortie = join(RACINE, 'icons', `icon-${taille}.png`);
    execFileSync(
      navigateur,
      [
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        `--window-size=${taille},${taille}`,
        `--user-data-dir=${join(dossier, 'profil')}`,
        `--screenshot=${sortie}`,
        pathToFileURL(page).href,
      ],
      { stdio: 'ignore' },
    );
    const png = readFileSync(sortie);
    const [largeur, hauteur] = [png.readUInt32BE(16), png.readUInt32BE(20)];
    if (largeur !== taille || hauteur !== taille) {
      throw new Error(`icon-${taille}.png fait ${largeur}×${hauteur} px au lieu de ${taille}×${taille}.`);
    }
    console.log(`icons/icon-${taille}.png`);
  }
} finally {
  // Le navigateur peut garder son profil ouvert quelques instants : nettoyage au mieux.
  try {
    rmSync(dossier, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
  } catch {
    /* dossier temporaire laissé au système */
  }
}
