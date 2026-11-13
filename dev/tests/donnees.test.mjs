// Données de l'appli et fichier de sauvegarde.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerSauvegarde, donneesInitiales, lireSauvegarde, nomFichierSauvegarde, normaliserDonnees } from '../../js/donnees.js';

test('premier lancement : les deux recettes du cahier des charges sont préchargées', () => {
  const donnees = donneesInitiales();
  assert.deepEqual(donnees.recettes.map((r) => r.nom), ['Napolitaine 20h CT', 'Napolitaine 48h CT – Caputo Cuoco']);
  assert.deepEqual(donnees.recettes.map((r) => r.source), ['pizzapp', 'json']);
  assert.equal(donnees.fournee.recetteId, donnees.recettes[0].id);
  assert.equal(donnees.fournee.boules, 5);
  assert.equal(donnees.reglages.theme, 'auto');
});

test('sauvegarde : export puis restauration redonnent les mêmes données', () => {
  const donnees = donneesInitiales();
  donnees.fournee.boules = 7;
  donnees.reglages.theme = 'sombre';
  const maintenant = new Date('2026-11-12T19:30:00Z');
  const texte = JSON.stringify(creerSauvegarde(donnees, maintenant));
  const { donnees: restaurees, exporteLe } = lireSauvegarde(texte);
  assert.equal(exporteLe, '2026-11-12T19:30:00.000Z');
  assert.deepEqual(restaurees.recettes, donnees.recettes);
  assert.deepEqual(restaurees.fournee, donnees.fournee);
  assert.deepEqual(restaurees.reglages, { theme: 'sombre' });
  assert.equal(restaurees.meta.derniereSauvegarde, exporteLe);
});

test('sauvegarde : refuse les fichiers qui ne viennent pas de Pizzeria Ensen', () => {
  assert.throws(() => lireSauvegarde('pas du json'), /pas une sauvegarde lisible/);
  assert.throws(() => lireSauvegarde('{"application": "brasserie-ensen", "brassins": []}'), /Brasserie Ensen/);
  assert.throws(() => lireSauvegarde('{"recettes": []}'), /pas une sauvegarde de Pizzeria Ensen/);
  const future = JSON.stringify({ application: 'pizzeria-ensen', version: 99, recettes: [] });
  assert.throws(() => lireSauvegarde(future), /version plus récente/);
});

test('sauvegarde : refuse une recette abîmée', () => {
  const sauvegarde = creerSauvegarde(donneesInitiales());
  sauvegarde.recettes[0].sel = 50;
  assert.throws(() => lireSauvegarde(JSON.stringify(sauvegarde)), /Napolitaine 20h CT.*Sel : entre 0 et 10/);
});

test('données : fournée corrigée si sa recette a disparu', () => {
  const donnees = donneesInitiales();
  const [, seconde] = donnees.recettes;
  const lues = normaliserDonnees({ ...donnees, recettes: [seconde], fournee: { recetteId: 'disparue', boules: 0 } });
  assert.equal(lues.fournee.recetteId, seconde.id);
  assert.equal(lues.fournee.boules, 4);
});

test('nom du fichier de sauvegarde', () => {
  assert.equal(nomFichierSauvegarde(new Date(2026, 10, 12, 21, 5)), 'pizzeria-ensen-2026-11-12.json');
});
