// Calcul des doses à partir des pourcentages du boulanger (rapportés à la farine).
// Comme dans Pizza App, la levure compte dans le poids total de la pâte :
//   farine = pâte ÷ (1 + eau % + sel % + levure %)
// Aucun accès à la page : testable avec Node.

import { arrondir } from './outils.js';

/**
 * Doses pour une fournée. Pourcentages rapportés à la farine ; levure null =
 * dose inconnue (comptée zéro, affichée « à compléter »).
 * Grammes arrondis au gramme, levure au centième ; `exact` garde les valeurs non arrondies.
 */
export function calculerDoses({ boules, poidsBoule, hydratation, sel, levure = null }) {
  const pate = boules * poidsBoule;
  const farine = pate / (1 + (hydratation + sel + (levure ?? 0)) / 100);
  const exact = {
    farine,
    eau: (farine * hydratation) / 100,
    sel: (farine * sel) / 100,
    levure: levure == null ? null : (farine * levure) / 100,
  };
  return {
    pate,
    farine: arrondir(exact.farine),
    eau: arrondir(exact.eau),
    sel: arrondir(exact.sel),
    levure: exact.levure == null ? null : arrondir(exact.levure, 2),
    exact,
  };
}

/**
 * Pourcentage de levure correspondant à une dose en grammes, telle que Pizza App
 * l'affiche pour un nombre de boules. La dose est rapportée à la farine non
 * arrondie : on retrouve ensuite exactement les grammes de Pizza App.
 * (Rapportée aux 824 g arrondis, l'eau tomberait à 577 g au lieu de 576 g.)
 */
export function levureEnPourcentage({ boules, poidsBoule, hydratation, sel, grammes }) {
  const farine = (boules * poidsBoule - grammes) / (1 + (hydratation + sel) / 100);
  return (grammes / farine) * 100;
}

/**
 * Relevé de la grille utilisé tant que la température de la pièce n'est pas
 * prise en compte : le premier qui a une dose de levure (grille triée par température).
 */
export function releveDeReference(recette) {
  return recette.grille.find((releve) => releve.levure != null) ?? null;
}

/** Doses d'une recette de référence pour un nombre de boules. */
export function dosesRecette(recette, boules) {
  const releve = releveDeReference(recette);
  const doses = calculerDoses({
    boules,
    poidsBoule: recette.poidsBoule,
    hydratation: recette.hydratation,
    sel: recette.sel,
    levure: releve?.levure ?? null,
  });
  return { ...doses, releve };
}
