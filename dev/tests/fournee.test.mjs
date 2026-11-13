// Fournée : variables du jour (boules, température de la pièce, levure) et récap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSON_48H, TEXTE_PIZZA_APP } from '../../js/exemples.js';
import {
  calculerFournee,
  grammesLevure,
  levureRetenue,
  levureSaisie,
  verifierVariables,
  versementsEau,
} from '../../js/fournee.js';
import { lireRecettes } from '../../js/import.js';

const recettePizzaApp = () => lireRecettes(TEXTE_PIZZA_APP).resultats[0].recette;
const recette48h = () => lireRecettes(JSON_48H).resultats[0].recette;
/** Recette 48 h avec des doses de levure fictives à 19 et 22 °C (les vraies viendront de Pizza App). */
const recette48hAvecLevure = () => {
  const recette = recette48h();
  recette.grille[0].levure = 0.3;
  recette.grille[1].levure = 0.2;
  return recette;
};

test('étalonnage : recette Pizza App, 5 boules à 25 °C → 824 g, 576 g, 21 g et 4,34 g', () => {
  const f = calculerFournee(recettePizzaApp(), { boules: 5, tempPiece: 25, levurePct: null });
  assert.deepEqual([f.doses.farine, f.doses.eau, f.doses.sel, f.doses.levure], [824, 576, 21, 4.34]);
  assert.deepEqual(f.levure.source, 'grille');
});

test('eau en deux versements : 85 % puis le bassinage, qui tombent juste sur le total', () => {
  const f = calculerFournee(recettePizzaApp(), { boules: 5, tempPiece: 25, levurePct: null });
  assert.deepEqual(f.eau, { total: 576, premier: 490, bassinage: 86, pctPremier: 85 });
  assert.deepEqual(versementsEau(453.18, 85), { total: 453, premier: 385, bassinage: 68, pctPremier: 85 });
  assert.deepEqual(versementsEau(576.4997, 90), { total: 576, premier: 519, bassinage: 57, pctPremier: 90 });
});

test('levure : relevée, calculée entre deux températures, ou à saisir', () => {
  const recette = recette48hAvecLevure();
  assert.deepEqual(levureRetenue(recette, { tempPiece: 22, levurePct: null }), { pct: 0.2, source: 'grille' });
  const entreDeux = levureRetenue(recette, { tempPiece: 20, levurePct: null });
  assert.equal(entreDeux.source, 'calculee');
  assert.ok(entreDeux.pct < 0.3 && entreDeux.pct > 0.2);
  // Au-delà des doses relevées, aucune dose n'est inventée.
  assert.equal(levureRetenue(recette, { tempPiece: 25, levurePct: null }), null);
  // Recette Pizza App : une seule dose (25 °C), rien ailleurs.
  assert.equal(levureRetenue(recettePizzaApp(), { tempPiece: 22, levurePct: null }), null);
});

test('levure saisie pour la fournée : en grammes, gardée en pourcentage, suit le nombre de boules', () => {
  const recette = recettePizzaApp();
  const pct = levureSaisie(recette, 5, 3.5);
  assert.equal(grammesLevure(recette, 5, pct), 3.5);
  assert.equal(grammesLevure(recette, 10, pct), 7);
  const f = calculerFournee(recette, { boules: 5, tempPiece: 22, levurePct: pct });
  assert.equal(f.levure.source, 'saisie');
  assert.equal(f.doses.levure, 3.5);
  // La recette (le modèle) n'est pas touchée.
  assert.equal(recette.grille.length, 1);
});

test('durées : pointage, remise et eau lus dans la grille, calculés entre deux températures', () => {
  const f = calculerFournee(recette48hAvecLevure(), { boules: 4, tempPiece: 20, levurePct: null });
  assert.equal(f.pointage.source, 'grille');
  assert.equal(f.pointage.calculee, true);
  assert.ok(Math.abs(f.pointage.valeur - 2.648) < 0.01);
  assert.deepEqual(f.remise.valeur.map((h) => Math.round(h * 60)), [220, 280]);
  assert.ok(Math.abs(f.tempEau.valeur - 22.7) < 0.05);
  assert.equal(f.horsGrille, null);
  assert.deepEqual(f.froid, { heures: 48, temp: [4, 5] });
});

test('durées : recette sans grille de durées, pointage fixe et remise par défaut', () => {
  const f = calculerFournee(recettePizzaApp(), { boules: 5, tempPiece: 25, levurePct: null });
  assert.deepEqual(f.pointage, { valeur: 2, calculee: false, limite: null, source: 'recette' });
  assert.equal(f.remise.source, 'defaut');
  assert.equal(f.remise.valeur, 3.25); // entre 4 h à 20 °C et 2 h 30 à 30 °C
  assert.equal(f.tempEau, null); // la recette n'indique pas de température d'eau
});

test('hors de la grille : valeur du bord avec le sens de l’écart, et alerte', () => {
  const froid = calculerFournee(recette48hAvecLevure(), { boules: 4, tempPiece: 17, levurePct: 0.4 });
  assert.deepEqual(froid.horsGrille, [19, 29]);
  assert.deepEqual([froid.pointage.valeur, froid.pointage.limite], [3, 'plus']);
  assert.deepEqual([froid.tempEau.valeur, froid.tempEau.limite], [24, 'plus']);
  const chaud = calculerFournee(recette48hAvecLevure(), { boules: 4, tempPiece: 31, levurePct: 0.1 });
  assert.deepEqual([chaud.pointage.valeur, chaud.pointage.limite], [1, 'moins']);
});

test('variables : température et levure obligatoires avant le récap', () => {
  const recette = recette48h();
  assert.deepEqual(verifierVariables(recette, { boules: 4, tempPiece: null, levurePct: null }), { tempPiece: 'À renseigner.' });
  assert.deepEqual(verifierVariables(recette, { boules: 4, tempPiece: 60, levurePct: null }), { tempPiece: 'Entre 0 et 45 °C.' });
  assert.match(verifierVariables(recette, { boules: 4, tempPiece: 22, levurePct: null }).levure, /Pizza App/);
  assert.deepEqual(verifierVariables(recette, { boules: 4, tempPiece: 22, levurePct: 0.2 }), {});
  assert.deepEqual(verifierVariables(recettePizzaApp(), { boules: 5, tempPiece: 25, levurePct: null }), {});
});
