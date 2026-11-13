// Saisie manuelle et modification d'une recette.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dosesRecette, releveDeReference } from '../../js/calculs.js';
import { JSON_48H, TEXTE_PIZZA_APP } from '../../js/exemples.js';
import { lireRecettes } from '../../js/import.js';
import { nomLibre, recetteDepuisFormulaire, valeursEnTexte, valeursFormulaire } from '../../js/recettes.js';

const recettePizzaApp = () => lireRecettes(TEXTE_PIZZA_APP).resultats[0].recette;
const recette48h = () => lireRecettes(JSON_48H).resultats[0].recette;

const SAISIE_PIZZA_APP = {
  nom: 'Napolitaine saisie', style: 'Napolitaine', farine: '', boules: '5', poidsBoule: '285', hydratation: '70',
  sel: '2,5', typeLevure: 'LBF', levureGrammes: '4,34', ta: '25', pointage: '2', froidHeures: '20', froidMin: '4',
  froidMax: '', notes: '',
};

test('saisie manuelle : mêmes doses que la recette importée de Pizza App', () => {
  const { recette, erreurs } = recetteDepuisFormulaire(SAISIE_PIZZA_APP);
  assert.deepEqual(erreurs, {});
  assert.equal(recette.source, 'manuel');
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

test('formulaire : une dose saisie pour la recette 48 h complète le relevé de la grille', () => {
  const recette = recette48h();
  const champs = { ...valeursFormulaire(recette), levureGrammes: '1,20', ta: '22' };
  const { recette: apres } = recetteDepuisFormulaire(champs, recette);
  assert.equal(apres.grille.length, 4);
  const releve = releveDeReference(apres);
  assert.equal(releve.temp, 22);
  assert.equal(releve.tempEau, 20); // le reste du relevé est conservé
  assert.deepEqual(releve.remise, [3, 4]);
  assert.equal(dosesRecette(apres, 4).levure, 1.2);
  // Rouvrir le formulaire affiche bien la dose et la TA saisies.
  assert.equal(valeursFormulaire(apres).levureGrammes, '1,20');
  assert.equal(valeursFormulaire(apres).ta, '22');
});

test('formulaire : recette à grille, dose pour la vraie température de la pièce (hors grille)', () => {
  const recette = recette48h();
  const { recette: apres, erreurs } = recetteDepuisFormulaire({ ...valeursFormulaire(recette), levureGrammes: '5', ta: '20' }, recette);
  assert.deepEqual(erreurs, {});
  assert.deepEqual(apres.grille.map((r) => r.temp), [19, 20, 22, 25, 29]);
  assert.deepEqual({ ...apres.grille[1], levure: null }, { temp: 20, levure: null, tempEau: null, pointage: null, remise: null });
  assert.equal(dosesRecette(apres, 4).levure, 5);
});

test('formulaire : déplacer une dose hors grille sur une température de la grille retire la ligne vide', () => {
  const avant = recette48h();
  avant.grille.splice(1, 0, { temp: 20, levure: 0.776, tempEau: null, pointage: null, remise: null });
  const { recette: apres, erreurs } = recetteDepuisFormulaire({ ...valeursFormulaire(avant), ta: '22' }, avant);
  assert.deepEqual(erreurs, {});
  assert.deepEqual(apres.grille.map((r) => r.temp), [19, 22, 25, 29]); // la ligne 20 °C disparaît
  const releve = apres.grille[1];
  assert.equal(releve.tempEau, 20);
  assert.ok(releve.levure > 0);
});

test('formulaire : changer la TA déplace la dose, sans créer de second relevé', () => {
  const recette = recettePizzaApp();
  const { recette: apres } = recetteDepuisFormulaire({ ...valeursFormulaire(recette), ta: '24' }, recette);
  assert.deepEqual(apres.grille.map((r) => r.temp), [24]);
  assert.equal(dosesRecette(apres, 5).levure, 4.34);
});

test('formulaire : effacer la dose de levure vide le relevé', () => {
  const recette = recettePizzaApp();
  const { recette: apres } = recetteDepuisFormulaire({ ...valeursFormulaire(recette), levureGrammes: '' }, recette);
  assert.deepEqual(apres.grille, []);
});

test('formulaire : erreurs de saisie par champ', () => {
  const { recette, erreurs } = recetteDepuisFormulaire({
    ...SAISIE_PIZZA_APP, nom: ' ', boules: '0', sel: 'beaucoup', ta: '', poidsBoule: '2,5',
  });
  assert.equal(recette, null);
  assert.deepEqual(erreurs, {
    nom: 'À renseigner.',
    boules: 'Nombre entier entre 1 et 99.',
    poidsBoule: 'Entre 20 et 3 000 g.',
    sel: 'Nombre illisible.',
    ta: 'À renseigner avec la dose de levure.',
  });
});

test('formulaire : la température du frigo, non demandée, ne bloque jamais l’enregistrement', () => {
  const { recette: gardee } = recetteDepuisFormulaire(valeursFormulaire(recette48h()), recette48h());
  assert.deepEqual(gardee.froid.temp, [4, 5]); // transmise par les champs cachés
  const { recette, erreurs } = recetteDepuisFormulaire({ ...SAISIE_PIZZA_APP, froidMin: '40' });
  assert.deepEqual(erreurs, {});
  assert.equal(recette.froid.temp, null); // valeur absurde ignorée, sans erreur invisible
});

test('formulaire : pré-rempli avec les valeurs lues avant une erreur d’import', () => {
  const valeurs = valeursEnTexte({ nom: 'Napolitaine 20h CT', boules: 5, sel: null, levureGrammes: 4.34, froidMin: 4 });
  assert.equal(valeurs.boules, '5');
  assert.equal(valeurs.sel, '');
  assert.equal(valeurs.levureGrammes, '4,34');
  assert.equal(valeurs.froidMin, '4');
  assert.equal(valeurs.typeLevure, 'LBF');
});

test('noms : « (2) » ajouté si le nom est pris, sans tenir compte des accents ni des majuscules', () => {
  const recettes = [{ id: 'a', nom: 'Napolitaine 20h CT' }, { id: 'b', nom: 'Pâte rapide' }];
  assert.equal(nomLibre(recettes, 'Nouvelle'), 'Nouvelle');
  assert.equal(nomLibre(recettes, 'napolitaine 20H ct'), 'napolitaine 20H ct (2)');
  assert.equal(nomLibre(recettes, 'Pate rapide'), 'Pate rapide (2)');
});
