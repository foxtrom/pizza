// Cohérence de l'appli publiée : fichiers gardés hors ligne, noms, exemples.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSON_48H, TEXTE_PIZZA_APP } from '../../js/exemples.js';

const RACINE = fileURLToPath(new URL('../../', import.meta.url));
const lire = (chemin) => readFileSync(join(RACINE, chemin), 'utf8');
const SPEC = join(RACINE, 'CAHIER_DES_CHARGES.md');

test('hors ligne : le service worker garde une copie de chaque fichier de l’appli', () => {
  const liste = lire('sw.js').match(/const FICHIERS = \[([\s\S]*?)\];/)[1];
  const gardes = [...liste.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean).sort();
  const dossier = (nom) => readdirSync(join(RACINE, nom)).map((fichier) => `${nom}/${fichier}`);
  const attendus = ['index.html', 'manifest.webmanifest', ...dossier('css'), ...dossier('js'), ...dossier('icons')].sort();
  assert.deepEqual(gardes, attendus);
});

test('hors ligne : caches « pizzeria-… », jamais « ensen-… » (Brasserie Ensen les efface)', () => {
  const sw = lire('sw.js');
  assert.match(sw, /const PREFIXE = 'pizzeria-';/);
  assert.match(sw, /const VERSION = '\d+\.\d+\.\d+';/);
  assert.doesNotMatch(sw, /'ensen-/);
});

test('page et manifeste : tous les fichiers référencés existent', () => {
  const index = lire('index.html');
  const references = [...index.matchAll(/(?:href|src)="([^"#:]+)"/g)].map((m) => m[1]);
  assert.ok(references.length >= 5);
  for (const reference of references) assert.ok(existsSync(join(RACINE, reference)), reference);
  const manifeste = JSON.parse(lire('manifest.webmanifest'));
  for (const { src } of manifeste.icons) assert.ok(existsSync(join(RACINE, src)), src);
});

test('exemples identiques à ceux du cahier des charges', { skip: !existsSync(SPEC) && 'cahier des charges absent' }, () => {
  const spec = lire('CAHIER_DES_CHARGES.md').replace(/\r\n/g, '\n');
  const blocs = Object.fromEntries([...spec.matchAll(/```(text|json)\n([\s\S]*?)\n```/g)].map((m) => [m[1], m[2]]));
  assert.equal(TEXTE_PIZZA_APP, blocs.text);
  assert.equal(JSON_48H, blocs.json);
});
