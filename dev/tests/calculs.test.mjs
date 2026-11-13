// Recalcul des doses. Lancer tous les tests : node --test dev/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerDoses, dosesRecette, interpoler, levureEnPourcentage, lireGrille } from '../../js/calculs.js';
import { JSON_48H, TEXTE_PIZZA_APP } from '../../js/exemples.js';
import { lireRecettes } from '../../js/import.js';
import { arrondir } from '../../js/outils.js';

const recettePizzaApp = () => lireRecettes(TEXTE_PIZZA_APP).resultats[0].recette;
const recette48h = () => lireRecettes(JSON_48H).resultats[0].recette;

test('recalcul : 5 boules de 285 g redonnent 824 g de farine, 576 g d’eau, 21 g de sel et 4,34 g de LBF', () => {
  const doses = dosesRecette(recettePizzaApp(), 5);
  assert.equal(doses.pate, 1425);
  assert.equal(doses.farine, 824);
  assert.equal(doses.eau, 576);
  assert.equal(doses.sel, 21);
  assert.equal(doses.levure, 4.34);
});

test('recalcul : les doses suivent le nombre de boules', () => {
  const recette = recettePizzaApp();
  const cinq = dosesRecette(recette, 5);
  const dix = dosesRecette(recette, 10);
  assert.ok(Math.abs(dix.exact.farine - 2 * cinq.exact.farine) < 1e-9);
  assert.deepEqual([dix.farine, dix.eau, dix.sel, dix.levure], [1647, 1153, 41, 8.68]);
  const une = dosesRecette(recette, 1);
  assert.deepEqual([une.pate, une.farine, une.eau, une.sel, une.levure], [285, 165, 115, 4, 0.87]);
});

test('levure : pourcentage déduit de la farine non arrondie', () => {
  const pct = levureEnPourcentage({ boules: 5, poidsBoule: 285, hydratation: 70, sel: 2.5, grammes: 4.34 });
  assert.ok(Math.abs(pct - 0.52697) < 1e-5);
  // Le piège évité : rapportée aux 824 g arrondis, la levure ferait passer l'eau à 577 g.
  const piege = calculerDoses({ boules: 5, poidsBoule: 285, hydratation: 70, sel: 2.5, levure: (4.34 / 824) * 100 });
  assert.equal(piege.eau, 577);
});

test('levure : la pâte compte la levure (sinon 826 g de farine au lieu de 824)', () => {
  const sansLevure = calculerDoses({ boules: 5, poidsBoule: 285, hydratation: 70, sel: 2.5 });
  assert.equal(sansLevure.farine, 826);
  assert.equal(sansLevure.levure, null);
});

test('recette 48 h : doses de 4 boules de 280 g, levure à compléter', () => {
  const doses = dosesRecette(recette48h(), 4);
  assert.deepEqual([doses.pate, doses.farine, doses.eau, doses.sel], [1120, 647, 453, 19]);
  assert.equal(doses.levure, null);
  assert.equal(doses.releve, null);
});

test('courbe : passe par chaque relevé, ne dépasse pas ses voisins, rien hors de la grille', () => {
  const pointage = [{ x: 19, y: 3 }, { x: 22, y: 2 }, { x: 25, y: 1.5 }, { x: 29, y: 1 }];
  assert.equal(interpoler(pointage, 22), 2);
  assert.equal(interpoler(pointage, 18), null);
  assert.equal(interpoler(pointage, 29.5), null);
  assert.ok(Math.abs(interpoler([{ x: 20, y: 4 }, { x: 30, y: 2.5 }], 25) - 3.25) < 1e-12); // deux points : droite
  let precedent = Infinity;
  for (let t = 19; t <= 29; t += 0.25) {
    const v = interpoler(pointage, t);
    assert.ok(v <= precedent + 1e-12 && v >= 1 && v <= 3, `à ${t} °C : ${v}`);
    precedent = v;
  }
});

test('grille 48 h : à 20 °C, eau, pointage et remise calculés entre 19 et 22 °C', () => {
  const { grille } = recette48h();
  const lu = lireGrille(grille, 20);
  assert.equal(lu.pointage.calculee, true);
  assert.equal(Math.round(lu.pointage.valeur * 12) / 12, 2 + 40 / 60); // affiché « ≈ 2 h 40 »
  assert.ok(Math.abs(lu.tempEau.valeur - 22.7) < 0.05);
  assert.deepEqual(lu.remise.valeur.map((h) => Math.round(h * 60)), [220, 280]); // 3 h 40 à 4 h 40
  assert.equal(lu.levure.valeur, null); // aucune dose relevée : rien à calculer
  assert.deepEqual(lireGrille(grille, 22).pointage, { valeur: 2, calculee: false });
});

test('arrondis : au gramme, levure au centième, 0,5 vers le haut', () => {
  assert.equal(arrondir(576.4997), 576);
  assert.equal(arrondir(20.5), 21);
  assert.equal(arrondir(4.345, 2), 4.35); // stocké 4,34499999… par l'ordinateur
  assert.equal(arrondir(1.005, 2), 1.01);
  assert.equal(arrondir(4.3449, 2), 4.34);
});
