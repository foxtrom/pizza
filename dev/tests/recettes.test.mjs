// Saisie manuelle et modification d'une recette (le modèle), grille comprise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dosesRecette } from '../../js/calculs.js';
import { JSON_48H, TEXTE_PIZZA_APP } from '../../js/exemples.js';
import { lireRecettes } from '../../js/import.js';
import {
  champsDepuisEntrees,
  LIGNE_VIDE,
  nomLibre,
  recetteDepuisFormulaire,
  valeursEnTexte,
  valeursFormulaire,
} from '../../js/recettes.js';

const recettePizzaApp = () => lireRecettes(TEXTE_PIZZA_APP).resultats[0].recette;
const recette48h = () => lireRecettes(JSON_48H).resultats[0].recette;
const ligne = (valeurs) => ({ ...LIGNE_VIDE, ...valeurs });

const SAISIE_PIZZA_APP = {
  nom: 'Napolitaine saisie', style: 'Napolitaine', farine: '', boules: '5', poidsBoule: '285', hydratation: '70',
  sel: '2,5', premierVersement: '85', typeLevure: 'LBF', grille: [ligne({ temp: '25', levure: '4,34' })],
  pointage: '2', froidHeures: '20', froidMin: '4', froidMax: '', notes: '',
};

test('saisie manuelle : mêmes doses que la recette importée de Pizza App', () => {
  const { recette, erreurs } = recetteDepuisFormulaire(SAISIE_PIZZA_APP);
  assert.deepEqual(erreurs, {});
  assert.equal(recette.source, 'manuel');
  assert.equal(recette.premierVersement, 85);
  const doses = dosesRecette(recette, 5);
  assert.deepEqual([doses.farine, doses.eau, doses.sel, doses.levure], [824, 576, 21, 4.34]);
  assert.deepEqual(recette.froid, { heures: 20, temp: [4, 4] });
});

test('formulaire : ouvrir puis enregistrer sans rien changer ne modifie pas la recette', () => {
  for (const recette of [recettePizzaApp(), recette48h()]) {
    const { recette: apres, erreurs } = recetteDepuisFormulaire(valeursFormulaire(recette), recette);
    assert.deepEqual(erreurs, {});
    assert.deepEqual({ ...apres, modifieLe: null }, { ...recette, modifieLe: null });
  }
});

test('grille : une dose saisie sur une ligne garde l’eau, le pointage et la remise', () => {
  const recette = recette48h();
  const valeurs = valeursFormulaire(recette);
  valeurs.grille[1].levure = '1,20'; // ligne 22 °C
  const { recette: apres } = recetteDepuisFormulaire(valeurs, recette);
  assert.deepEqual({ ...apres.grille[1], levure: null }, { temp: 22, levure: null, tempEau: 20, pointage: 2, remise: [3, 4] });
  assert.equal(dosesRecette({ ...apres, grille: [apres.grille[1]] }, 4).levure, 1.2);
  assert.equal(valeursFormulaire(apres).grille[1].levure, '1,20'); // relu tel quel
});

test('grille : ajouter une température (dose seule) et en retirer une', () => {
  const recette = recette48h();
  const valeurs = valeursFormulaire(recette);
  valeurs.grille.push(ligne({ temp: '20', levure: '1,5' }));
  valeurs.grille.splice(3, 1); // retire 29 °C
  const { recette: apres, erreurs } = recetteDepuisFormulaire(valeurs, recette);
  assert.deepEqual(erreurs, {});
  assert.deepEqual(apres.grille.map((r) => r.temp), [19, 20, 22, 25]);
  assert.deepEqual({ ...apres.grille[1], levure: null }, { temp: 20, levure: null, tempEau: null, pointage: null, remise: null });
});

test('grille : changer la dose de référence change le pourcentage, pas les autres lignes', () => {
  const recette = recettePizzaApp();
  const valeurs = valeursFormulaire(recette);
  valeurs.grille[0].levure = '5';
  const { recette: apres } = recetteDepuisFormulaire(valeurs, recette);
  assert.equal(dosesRecette(apres, 5).levure, 5);
  assert.equal(dosesRecette(apres, 5).farine, 823); // la levure compte dans la pâte
});

test('grille : effacer la dose d’une ligne qui n’a rien d’autre la retire', () => {
  const recette = recettePizzaApp();
  const valeurs = valeursFormulaire(recette);
  valeurs.grille[0] = { ...LIGNE_VIDE }; // ligne vidée
  const { recette: apres } = recetteDepuisFormulaire(valeurs, recette);
  assert.deepEqual(apres.grille, []);
});

test('formulaire : erreurs de saisie par champ, grille comprise', () => {
  const { recette, erreurs } = recetteDepuisFormulaire({
    ...SAISIE_PIZZA_APP,
    nom: ' ',
    boules: '0',
    sel: 'beaucoup',
    poidsBoule: '2,5',
    premierVersement: '40',
    grille: [ligne({ temp: '', levure: '4,34' }), ligne({ temp: '22', tempEau: '20' }), ligne({ temp: '22', pointage: '2' })],
  });
  assert.equal(recette, null);
  assert.deepEqual(erreurs, {
    nom: 'À renseigner.',
    boules: 'Nombre entier entre 1 et 99.',
    poidsBoule: 'Entre 20 et 3 000 g.',
    sel: 'Nombre illisible.',
    premierVersement: 'Entre 50 et 100 %.',
    'grille.0.temp': 'À renseigner avec la dose de levure.',
    'grille.2.temp': 'Température déjà dans la grille.',
  });
});

test('formulaire : la température du frigo, non demandée, ne bloque jamais l’enregistrement', () => {
  const { recette: gardee } = recetteDepuisFormulaire(valeursFormulaire(recette48h()), recette48h());
  assert.deepEqual(gardee.froid.temp, [4, 5]); // transmise par les champs cachés
  const { recette, erreurs } = recetteDepuisFormulaire({ ...SAISIE_PIZZA_APP, froidMin: '40' });
  assert.deepEqual(erreurs, {});
  assert.equal(recette.froid.temp, null); // valeur absurde ignorée, sans erreur invisible
});

test('formulaire : champs envoyés, lignes de la grille regroupées', () => {
  const champs = champsDepuisEntrees([
    ['nom', 'Test'],
    ['grille.0.temp', '19'],
    ['grille.0.levure', '1,2'],
    ['grille.1.temp', '22'],
  ]);
  assert.equal(champs.nom, 'Test');
  assert.deepEqual(champs.grille, [ligne({ temp: '19', levure: '1,2' }), ligne({ temp: '22' })]);
});

test('formulaire : pré-rempli avec les valeurs lues avant une erreur d’import', () => {
  const valeurs = valeursEnTexte({ nom: 'Napolitaine 20h CT', boules: 5, sel: null, grille: [{ temp: null, levure: 4.34 }], froidMin: 4 });
  assert.equal(valeurs.boules, '5');
  assert.equal(valeurs.sel, '');
  assert.deepEqual(valeurs.grille, [ligne({ levure: '4,34' })]);
  assert.equal(valeurs.froidMin, '4');
  assert.equal(valeurs.premierVersement, '85');
});

test('noms : « (2) » ajouté si le nom est pris, sans tenir compte des accents ni des majuscules', () => {
  const recettes = [{ id: 'a', nom: 'Napolitaine 20h CT' }, { id: 'b', nom: 'Pâte rapide' }];
  assert.equal(nomLibre(recettes, 'Nouvelle'), 'Nouvelle');
  assert.equal(nomLibre(recettes, 'napolitaine 20H ct'), 'napolitaine 20H ct (2)');
  assert.equal(nomLibre(recettes, 'Pate rapide'), 'Pate rapide (2)');
});
