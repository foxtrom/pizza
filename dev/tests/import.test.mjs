// Lecture des recettes collées : texte Pizza App et bloc JSON.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dosesRecette } from '../../js/calculs.js';
import { JSON_48H, TEXTE_PIZZA_APP } from '../../js/exemples.js';
import { detecterFormat, ErreurImport, lireRecettes } from '../../js/import.js';

const lirePizzaApp = (texte) => {
  const { format, resultats } = lireRecettes(texte);
  assert.equal(format, 'pizzapp');
  assert.equal(resultats.length, 1);
  return resultats[0];
};

/* ---------- Texte Pizza App ---------- */

test('Pizza App : lecture de tous les champs de l’exemple', () => {
  const { recette, avertissements, ignorees, verification } = lirePizzaApp(TEXTE_PIZZA_APP);
  assert.equal(recette.nom, 'Napolitaine 20h CT');
  assert.equal(recette.style, 'Napolitaine');
  assert.equal(recette.boules, 5);
  assert.equal(recette.poidsBoule, 285);
  assert.equal(recette.hydratation, 70);
  assert.equal(recette.sel, 2.5);
  assert.equal(recette.typeLevure, 'LBF');
  assert.equal(recette.pointage, 2); // « Levage à TA » = durée du pointage
  assert.deepEqual(recette.froid, { heures: 20, temp: [4, 4] });
  assert.equal(recette.grille.length, 1); // « TA » + « LBF » = premier relevé de la grille
  assert.equal(recette.grille[0].temp, 25);
  assert.ok(Math.abs(recette.grille[0].levure - 0.52697) < 1e-5);
  assert.deepEqual(recette.tempPate, [23, 24]);
  assert.equal(recette.source, 'pizzapp');
  assert.equal(recette.texteImporte, TEXTE_PIZZA_APP);
  // Doses lues dans le texte et doses recalculées : identiques.
  assert.deepEqual(verification.lues, { farine: 824, eau: 576, sel: 21, levure: 4.34 });
  assert.equal(verification.identiques, true);
  assert.deepEqual(verification.ecarts, []);
  assert.deepEqual(avertissements, []);
  assert.deepEqual(ignorees, []);
});

test('Pizza App : point ou virgule, espaces variables, fins de ligne Windows', () => {
  const variante = [
    '  Style de pizza :  Napolitaine',
    'N. boule de pâte:5',
    'Poids boule de pâte : 285g',
    'Eau :\t70 %',
    'Sel: 2,5%',
    'Levage à TA : 2h',
    'TA : 25 °C', // espace insécable, comme dans certains partages iOS
    'Levage à CT: 20 h',
    'CT: 4 ° C',
    '',
    '----------',
    'Doses de pâte principales',
    'Farine : 824 g',
    'Eau: 576 g',
    'Sel: 21 g',
    'LBF: 4.34 g',
  ].join('\r\n');
  const { recette, verification, ignorees } = lirePizzaApp(variante);
  assert.deepEqual(
    [recette.boules, recette.poidsBoule, recette.hydratation, recette.sel, recette.pointage, recette.froid.heures],
    [5, 285, 70, 2.5, 2, 20],
  );
  assert.equal(recette.grille[0].temp, 25);
  assert.deepEqual(recette.froid.temp, [4, 4]);
  assert.equal(verification.identiques, true);
  assert.deepEqual(ignorees, []);
  const doses = dosesRecette(recette, 5);
  assert.deepEqual([doses.farine, doses.eau, doses.sel, doses.levure], [824, 576, 21, 4.34]);
});

test('Pizza App : durées en heures et minutes, frigo en plage', () => {
  const texte = TEXTE_PIZZA_APP.replace('Levage à TA: 2 h', 'Levage à TA: 1 h 30')
    .replace('Levage à CT: 20 h', 'Levage à CT: 22h30')
    .replace('CT: 4°C', 'CT: 4-5°C');
  const { recette } = lirePizzaApp(texte);
  assert.equal(recette.pointage, 1.5);
  assert.equal(recette.froid.heures, 22.5);
  assert.deepEqual(recette.froid.temp, [4, 5]);
  assert.equal(recette.nom, 'Napolitaine 22,5h CT');
});

test('Pizza App : un champ manquant donne une erreur claire et garde ce qui a été lu', () => {
  const texte = TEXTE_PIZZA_APP.replace('Sel: 2.5%\n', '');
  assert.throws(
    () => lireRecettes(texte),
    (erreur) => {
      assert.ok(erreur instanceof ErreurImport);
      assert.match(erreur.message, /Sel \(%\) \(à renseigner\)/);
      assert.equal(erreur.valeurs.boules, 5);
      assert.equal(erreur.valeurs.grille[0].levure, 4.34);
      return true;
    },
  );
});

test('Pizza App : une dose de levure sans TA est refusée', () => {
  assert.throws(() => lireRecettes(TEXTE_PIZZA_APP.replace('TA: 25°C\n', '')), /TA \(à renseigner avec la dose de levure\)/);
});

test('Pizza App : sans dose de levure, la recette est gardée avec un avertissement', () => {
  const { recette, avertissements } = lirePizzaApp(TEXTE_PIZZA_APP.replace('\nLBF: 4,34 g', ''));
  assert.equal(recette.grille.length, 0);
  assert.match(avertissements.join(' '), /levure/);
});

test('Pizza App : les lignes inconnues sont signalées', () => {
  const texte = TEXTE_PIZZA_APP.replace('Sel: 2.5%', 'Sel: 2.5%\nHuile: 2%').replace('Sel: 21 g', 'Sel: 21 g\nHuile: 16 g');
  const { ignorees } = lirePizzaApp(texte);
  assert.deepEqual(ignorees, ['Huile: 2%', 'Huile: 16 g']);
});

test('Pizza App : un écart entre doses lues et recalculées est signalé', () => {
  const { verification, avertissements } = lirePizzaApp(TEXTE_PIZZA_APP.replace('Farine: 824 g', 'Farine: 830 g'));
  assert.equal(verification.identiques, false);
  assert.deepEqual(verification.ecarts.map((e) => e.nom), ['farine']);
  assert.match(avertissements.join(' '), /farine : 830 g lus, 824 g calculés/);
});

test('texte quelconque : refusé', () => {
  assert.throws(() => lireRecettes('Bonjour, voici ma recette préférée.'), ErreurImport);
  assert.throws(() => lireRecettes('   '), /Rien à lire/);
});

/* ---------- Bloc JSON ---------- */

test('JSON : lecture du bloc du cahier des charges', () => {
  const { format, resultats } = lireRecettes(JSON_48H);
  assert.equal(format, 'json');
  assert.equal(resultats.length, 1);
  const { recette, avertissements } = resultats[0];
  assert.equal(recette.nom, 'Napolitaine 48h CT – Caputo Cuoco');
  assert.equal(recette.style, 'Napolitaine');
  assert.equal(recette.farine, 'Caputo Cuoco');
  assert.deepEqual([recette.boules, recette.poidsBoule, recette.hydratation, recette.sel], [4, 280, 70, 3]);
  assert.equal(recette.typeLevure, 'LBF');
  assert.deepEqual(recette.tempPate, [23, 24]);
  assert.deepEqual(recette.froid, { heures: 48, temp: [4, 5] });
  assert.equal(recette.pointage, null); // donné par la grille
  assert.deepEqual(recette.grille, [
    { temp: 19, levure: null, tempEau: 24, pointage: 3, remise: [4, 5] },
    { temp: 22, levure: null, tempEau: 20, pointage: 2, remise: [3, 4] },
    { temp: 25, levure: null, tempEau: 15, pointage: 1.5, remise: [2, 3] },
    { temp: 29, levure: null, tempEau: 8, pointage: 1, remise: [1.5, 2] },
  ]);
  assert.deepEqual(recette.four, { type: 'Ooni', sole: 'biscotto', temp: [430, 450], cuisson: [60, 90] });
  assert.match(recette.notes, /^Pourcentages exprimés par rapport à la farine\./);
  assert.equal(recette.source, 'json');
  assert.deepEqual(avertissements, ['Doses de levure à compléter (relevés à faire dans Pizza App).']);
});

test('JSON : doses de levure renseignées dans la grille', () => {
  const texte = JSON_48H.replace('"room_temp_c": 22, "yeast_pct": null', '"room_temp_c": 22, "yeast_pct": 0.12');
  const { recette, avertissements } = lireRecettes(texte).resultats[0];
  assert.equal(recette.grille[1].levure, 0.12);
  assert.deepEqual(avertissements, []);
});

test('JSON : accepte ```json, du texte autour, des guillemets typographiques et une liste', () => {
  const entoure = `Voici la recette :\n\`\`\`json\n${JSON_48H}\n\`\`\`\nBonne cuisson !`;
  assert.equal(lireRecettes(entoure).resultats[0].recette.boules, 4);

  const typographique = JSON_48H.replace(/"(name|balls)"/g, '“$1”');
  assert.equal(lireRecettes(typographique).resultats[0].recette.boules, 4);

  const liste = `[${JSON_48H}, {"name": "Test", "balls": 6, "ball_weight_g": 250, "hydration_pct": 65, "salt_pct": 2.8, "room_temp_c": 22, "yeast_pct": 0.2}]`;
  const { resultats } = lireRecettes(liste);
  assert.deepEqual(resultats.map((r) => r.recette.nom), ['Napolitaine 48h CT – Caputo Cuoco', 'Test']);
  assert.deepEqual(resultats[1].recette.grille, [{ temp: 22, levure: 0.2, tempEau: null, pointage: null, remise: null }]);
});

test('JSON : erreurs explicites', () => {
  assert.throws(() => lireRecettes('{"name": "Incomplet", "balls": 4'), /Bloc JSON/);
  assert.throws(
    () => lireRecettes('{"name": "Sans poids", "balls": 4, "hydration_pct": 70, "salt_pct": 3}'),
    /Poids d’une boule : à renseigner/,
  );
  assert.throws(() => lireRecettes(JSON_48H.replace('"salt_pct": 3', '"salt_pct": 30')), /Sel : entre 0 et 10/);
  assert.throws(() => lireRecettes('{"application": "pizzeria-ensen", "recettes": []}'), /sauvegarde/);
});

test('JSON : les champs inconnus sont signalés', () => {
  const texte = JSON_48H.replace('"flour": "Caputo Cuoco",', '"flour": "Caputo Cuoco", "oil_pct": 2,');
  const { avertissements } = lireRecettes(texte).resultats[0];
  assert.match(avertissements[0], /Champs ignorés : oil_pct/);
});

test('détection du format', () => {
  assert.equal(detecterFormat(TEXTE_PIZZA_APP), 'pizzapp');
  assert.equal(detecterFormat(JSON_48H), 'json');
  assert.equal(detecterFormat('```json\n{}\n```'), 'json');
  assert.equal(detecterFormat('Recette : {"name": "x"}'), 'json');
  assert.equal(detecterFormat(' \n '), null);
});
