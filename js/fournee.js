// Une fournée : la recette (le modèle) et les variables du jour (nombre de boules,
// température de la pièce, dose de levure). Calcule tout ce qu'il faut pour faire la pâte.
// La dose saisie pour une fournée ne modifie jamais la recette.
// Aucun accès à la page : testable avec Node.

import { calculerDoses, levureEnPourcentage, lireColonne, lireGrille } from './calculs.js';
import { arrondir, lireNombre } from './outils.js';

/** Levure proposée par la grille de la recette à cette température : { pct, calculee } ou null. */
export function levureDeLaGrille(recette, temp) {
  if (temp == null) return null;
  const { valeur, calculee } = lireGrille(recette.grille, temp).levure; // jamais au-delà des relevés
  return valeur == null ? null : { pct: valeur, calculee };
}

/** Levure retenue : celle saisie pour la fournée, sinon celle de la grille. */
export function levureRetenue(recette, { tempPiece, levurePct }) {
  if (levurePct != null) return { pct: levurePct, source: 'saisie' };
  const proposee = levureDeLaGrille(recette, tempPiece);
  if (!proposee) return null;
  return { pct: proposee.pct, source: proposee.calculee ? 'calculee' : 'grille' };
}

/** Grammes de levure pour la fournée (au centième), ou null. */
export function grammesLevure(recette, boules, pct) {
  if (pct == null) return null;
  return calculerDoses({ ...recette, boules, levure: pct }).levure;
}

/** Pourcentage de levure d'une dose saisie en grammes pour les boules de la fournée. */
export function levureSaisie(recette, boules, grammes) {
  return levureEnPourcentage({ ...recette, boules, grammes });
}

/**
 * Eau en deux versements : le premier (85 % par défaut), puis le bassinage.
 * Le bassinage est le reste : les deux tombent juste sur le total affiché.
 */
export function versementsEau(eauExacte, pctPremier) {
  const total = arrondir(eauExacte);
  const premier = arrondir((eauExacte * pctPremier) / 100);
  return { total, premier, bassinage: total - premier, pctPremier };
}

/** Températures couvertes par la grille de la recette : [min, max], ou null si elle est vide. */
export function plageGrille(recette) {
  const temps = recette.grille.map((r) => r.temp);
  return temps.length ? [Math.min(...temps), Math.max(...temps)] : null;
}

/** Problèmes des variables avant d'afficher le récap : { tempPiece, levure } (vide si tout va bien). */
export function verifierVariables(recette, variables) {
  const erreurs = {};
  const temp = variables.tempPiece;
  if (temp == null) erreurs.tempPiece = 'À renseigner.';
  else if (!(temp >= 0 && temp <= 45)) erreurs.tempPiece = 'Entre 0 et 45 °C.';
  if (!erreurs.tempPiece && !levureRetenue(recette, variables)) {
    erreurs.levure = 'À renseigner : la dose donnée par Pizza App pour cette température.';
  }
  return erreurs;
}

/** Lit une température ou une dose tapée ; null si vide ou illisible. */
export const lireVariable = (texte) => {
  const n = lireNombre(texte);
  return Number.isFinite(n) ? n : null;
};

/** Tout ce qu'il faut pour faire la pâte de cette fournée. */
export function calculerFournee(recette, variables) {
  const { boules, tempPiece } = variables;
  const levure = levureRetenue(recette, variables);
  const doses = calculerDoses({ ...recette, boules, levure: levure?.pct ?? null });
  const grille = lireGrille(recette.grille, tempPiece, { auDela: true });

  let pointage = null;
  if (grille.pointage.valeur != null) pointage = { ...grille.pointage, source: 'grille' };
  else if (recette.pointage != null) pointage = { valeur: recette.pointage, calculee: false, limite: null, source: 'recette' };

  let remise;
  if (grille.remise.valeur != null) {
    remise = { ...grille.remise, source: 'grille' };
  } else {
    const points = recette.remiseDefaut.map((p) => ({ x: p.temp, y: p.heures }));
    remise = { ...lireColonne(points, tempPiece), source: 'defaut' };
  }

  const plage = plageGrille(recette);
  return {
    boules,
    tempPiece,
    levure,
    doses,
    eau: versementsEau(doses.exact.eau, recette.premierVersement),
    tempEau: grille.tempEau.valeur != null ? grille.tempEau : null,
    pointage,
    remise,
    froid: recette.froid,
    tempPate: recette.tempPate,
    horsGrille:
      tempPiece != null && plage && plage[0] < plage[1] && (tempPiece < plage[0] || tempPiece > plage[1]) ? plage : null,
  };
}
