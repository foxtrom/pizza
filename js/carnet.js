// Carnet des fournées : chaque fournée enregistrée garde une photo figée de son récap
// (une recette modifiée plus tard ne change pas l'historique), et un résultat
// à compléter après la cuisson : note sur 5, constats rapides, commentaire.
// Aucun accès à la page : testable avec Node.

import { calculerFournee } from './fournee.js';
import { nouvelId } from './outils.js';

/** Constats en un toucher : [code, libellé]. */
export const CONSTATS = [
  ['facile', 'Facile à étaler'],
  ['collante', 'Collante'],
  ['dechire', 'Se déchire'],
  ['trop-levee', 'Trop levée'],
  ['pas-assez-levee', 'Pas assez levée'],
  ['cornicione', 'Cornicione bien gonflé'],
];
const CODES = new Set(CONSTATS.map(([code]) => code));
export const libelleConstat = (code) => CONSTATS.find(([c]) => c === code)?.[1] ?? code;

/** Ce qu'il faut pour réafficher un récap : la recette telle qu'elle était, les variables, les résultats du calcul. */
export function instantane(recette, f) {
  const { exact, ...doses } = f.doses;
  return {
    recette: {
      id: recette.id,
      nom: recette.nom,
      farine: recette.farine,
      typeLevure: recette.typeLevure,
      hydratation: recette.hydratation,
      sel: recette.sel,
      poidsBoule: recette.poidsBoule,
      remiseDefaut: recette.remiseDefaut.map((point) => ({ ...point })),
    },
    boules: f.boules,
    tempPiece: f.tempPiece,
    levure: f.levure && { ...f.levure },
    doses,
    eau: { ...f.eau },
    tempEau: f.tempEau && { ...f.tempEau },
    pointage: f.pointage && { ...f.pointage },
    remise: f.remise && { ...f.remise },
    froid: { heures: f.froid.heures, temp: f.froid.temp && [...f.froid.temp] },
    tempPate: f.tempPate && [...f.tempPate],
    horsGrille: f.horsGrille && [...f.horsGrille],
  };
}

const resultatVide = () => ({ note: null, constats: [], commentaire: '', modifieLe: null });

/** Nouvelle entrée du carnet pour la fournée en cours. */
export function nouvelleEntree(recette, variables, maintenant = new Date()) {
  return {
    id: nouvelId(),
    date: maintenant.toISOString(),
    ...instantane(recette, calculerFournee(recette, variables)),
    resultat: resultatVide(),
  };
}

/** Contrôle une entrée lue (stockage ou sauvegarde) ; null si elle est inutilisable. */
export function normaliserEntree(source) {
  if (!source || typeof source !== 'object') return null;
  const { recette, doses } = source;
  if (!recette || typeof recette.nom !== 'string' || !doses || !Number.isFinite(doses.farine)) return null;
  if (typeof source.date !== 'string' || Number.isNaN(Date.parse(source.date))) return null;
  const r = source.resultat ?? {};
  return {
    ...source,
    id: typeof source.id === 'string' && source.id ? source.id : nouvelId(),
    resultat: {
      note: Number.isInteger(r.note) && r.note >= 1 && r.note <= 5 ? r.note : null,
      constats: Array.isArray(r.constats) ? [...new Set(r.constats.filter((code) => CODES.has(code)))] : [],
      commentaire: typeof r.commentaire === 'string' ? r.commentaire : '',
      modifieLe: typeof r.modifieLe === 'string' ? r.modifieLe : null,
    },
  };
}

/* ---------- Saisie du résultat : rien n'est gardé sans « Enregistrer » ---------- */

/** Copie de travail du résultat, le temps de l'écran de la fournée. */
export const brouillonResultat = (entree) => ({
  id: entree.id,
  note: entree.resultat.note,
  constats: [...entree.resultat.constats],
  commentaire: entree.resultat.commentaire,
});

/** Coche ou décoche un constat (gardés dans l'ordre de la liste). */
export function basculerConstat(brouillon, code, coche) {
  const choisis = new Set(brouillon.constats);
  if (coche) choisis.add(code);
  else choisis.delete(code);
  brouillon.constats = CONSTATS.map(([c]) => c).filter((c) => choisis.has(c));
}

/** La copie de travail diffère-t-elle du résultat enregistré ? */
export function resultatModifie(entree, brouillon) {
  const r = entree.resultat;
  const memesConstats = r.constats.length === brouillon.constats.length && r.constats.every((c) => brouillon.constats.includes(c));
  return r.note !== brouillon.note || r.commentaire !== brouillon.commentaire || !memesConstats;
}

/** « Enregistrer » : la copie de travail devient le résultat de la fournée. */
export function enregistrerResultat(entree, brouillon, maintenant = new Date()) {
  entree.resultat = {
    note: brouillon.note,
    constats: [...brouillon.constats],
    commentaire: brouillon.commentaire,
    modifieLe: maintenant.toISOString(),
  };
}

export const aUnResultat = (entree) =>
  entree.resultat.note != null || entree.resultat.constats.length > 0 || entree.resultat.commentaire.trim() !== '';

/**
 * Pour ajuster la prochaine fournée d'une recette : la plus récente, et la plus
 * récente dont le résultat a été noté (souvent la même). Carnet trié du plus récent au plus ancien.
 */
export function rappelRecette(fournees, recetteId) {
  const avecRecette = fournees.filter((e) => e.recette.id === recetteId);
  return { derniere: avecRecette[0] ?? null, dernierResultat: avecRecette.find(aUnResultat) ?? null };
}
