// Carnet des fournées : photo figée du récap, résultat à compléter, rappel pour la suivante.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aUnResultat,
  basculerConstat,
  brouillonResultat,
  enregistrerResultat,
  normaliserEntree,
  nouvelleEntree,
  rappelRecette,
  resultatModifie,
} from '../../js/carnet.js';
import { creerSauvegarde, donneesInitiales, lireSauvegarde, normaliserDonnees } from '../../js/donnees.js';
import { TEXTE_PIZZA_APP } from '../../js/exemples.js';
import { lireRecettes } from '../../js/import.js';

const recettePizzaApp = () => lireRecettes(TEXTE_PIZZA_APP).resultats[0].recette;
const VARIABLES = { boules: 5, tempPiece: 25, levurePct: null };

test('carnet : la fournée enregistrée garde son récap complet', () => {
  const entree = nouvelleEntree(recettePizzaApp(), VARIABLES, new Date('2026-11-13T18:00:00Z'));
  assert.equal(entree.date, '2026-11-13T18:00:00.000Z');
  assert.equal(entree.recette.nom, 'Napolitaine 20h CT');
  assert.deepEqual([entree.boules, entree.tempPiece], [5, 25]);
  assert.deepEqual(entree.doses, { pate: 1425, farine: 824, eau: 576, sel: 21, levure: 4.34 });
  assert.deepEqual(entree.eau, { total: 576, premier: 490, bassinage: 86, pctPremier: 85 });
  assert.equal(entree.levure.source, 'grille');
  assert.equal(entree.pointage.valeur, 2);
  assert.deepEqual(entree.resultat, { note: null, constats: [], commentaire: '', modifieLe: null });
  assert.equal(aUnResultat(entree), false);
  assert.deepEqual(JSON.parse(JSON.stringify(entree)), entree); // tout passe dans la sauvegarde
});

test('carnet : modifier la recette ensuite ne change pas l’historique', () => {
  const recette = recettePizzaApp();
  const entree = nouvelleEntree(recette, VARIABLES);
  recette.nom = 'Autre nom';
  recette.hydratation = 65;
  recette.remiseDefaut[0].heures = 9;
  assert.equal(entree.recette.nom, 'Napolitaine 20h CT');
  assert.equal(entree.recette.hydratation, 70);
  assert.equal(entree.recette.remiseDefaut[0].heures, 4);
});

test('carnet : résultat contrôlé à la lecture', () => {
  const entree = nouvelleEntree(recettePizzaApp(), VARIABLES);
  const lue = normaliserEntree({ ...entree, resultat: { note: 7, constats: ['collante', 'inconnu', 'collante'], commentaire: 42 } });
  assert.deepEqual(lue.resultat, { note: null, constats: ['collante'], commentaire: '', modifieLe: null });
  assert.equal(normaliserEntree({ date: 'pas une date' }), null);
  assert.equal(normaliserEntree({ ...entree, resultat: undefined }).resultat.note, null);
});

test('carnet : rappel de la dernière fournée et du dernier résultat d’une recette', () => {
  const recette = recettePizzaApp();
  const ancienne = nouvelleEntree(recette, VARIABLES, new Date('2026-11-01T18:00:00Z'));
  ancienne.resultat.commentaire = 'Pâte un peu collante';
  const recente = nouvelleEntree(recette, VARIABLES, new Date('2026-11-13T18:00:00Z'));
  const autre = { ...nouvelleEntree(recette, VARIABLES), recette: { ...recette, id: 'autre' } };
  const { derniere, dernierResultat } = rappelRecette([recente, autre, ancienne], recette.id);
  assert.equal(derniere, recente);
  assert.equal(dernierResultat, ancienne);
  assert.deepEqual(rappelRecette([], recette.id), { derniere: null, dernierResultat: null });
});

test('carnet : le résultat ne change qu’après « Enregistrer »', () => {
  const entree = nouvelleEntree(recettePizzaApp(), VARIABLES);
  const brouillon = brouillonResultat(entree);
  assert.equal(resultatModifie(entree, brouillon), false);
  brouillon.note = 4;
  basculerConstat(brouillon, 'cornicione', true);
  basculerConstat(brouillon, 'facile', true);
  brouillon.commentaire = 'Belle cuisson';
  assert.deepEqual(brouillon.constats, ['facile', 'cornicione']); // dans l'ordre de la liste
  assert.equal(resultatModifie(entree, brouillon), true);
  assert.deepEqual(entree.resultat, { note: null, constats: [], commentaire: '', modifieLe: null }); // rien n'est gardé
  enregistrerResultat(entree, brouillon, new Date('2026-11-13T22:00:00Z'));
  assert.deepEqual(entree.resultat, { note: 4, constats: ['facile', 'cornicione'], commentaire: 'Belle cuisson', modifieLe: '2026-11-13T22:00:00.000Z' });
  assert.equal(resultatModifie(entree, brouillon), false);
  basculerConstat(brouillon, 'facile', false);
  assert.equal(resultatModifie(entree, brouillon), true);
  assert.deepEqual(entree.resultat.constats, ['facile', 'cornicione']); // la copie de travail n'est pas liée
});

test('carnet : passe dans la sauvegarde, trié du plus récent au plus ancien', () => {
  const donnees = donneesInitiales();
  const recette = donnees.recettes[0];
  const a = nouvelleEntree(recette, VARIABLES, new Date('2026-11-01T18:00:00Z'));
  const b = nouvelleEntree(recette, VARIABLES, new Date('2026-11-13T18:00:00Z'));
  b.resultat = { note: 4, constats: ['facile', 'cornicione'], commentaire: 'Très bien', modifieLe: '2026-11-13T22:00:00.000Z' };
  donnees.fournees = [a, b];
  const { donnees: restaurees } = lireSauvegarde(JSON.stringify(creerSauvegarde(donnees)));
  assert.deepEqual(restaurees.fournees.map((e) => e.id), [b.id, a.id]);
  assert.deepEqual(restaurees.fournees[0].resultat, b.resultat);
  // Données d'avant le carnet : carnet vide.
  const { fournees, ...sansCarnet } = donnees;
  assert.deepEqual(normaliserDonnees(sansCarnet).fournees, []);
});
