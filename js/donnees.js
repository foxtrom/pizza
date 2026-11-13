// Données de l'appli (recettes, dernière fournée, réglages) et fichier de sauvegarde.
// Aucun accès à la page : testable avec Node.

import { JSON_48H, TEXTE_PIZZA_APP } from './exemples.js';
import { lireRecettes } from './import.js';
import { nouvelId } from './outils.js';
import { normaliserRecette, verifierRecette } from './recettes.js';

/** Version du format des données. À augmenter (avec une migration) si la structure change. */
export const VERSION_DONNEES = 1;
export const APPLICATION = 'pizzeria-ensen';
export const REGLAGES_DEFAUT = { theme: 'auto' }; // 'auto' | 'clair' | 'sombre'

export function donneesVides() {
  return {
    version: VERSION_DONNEES,
    recettes: [],
    // Dernière fournée préparée. L'heure du repas et la température de la pièce
    // serviront au planning et à l'ajustement de la levure.
    fournee: { recetteId: null, boules: null, repas: null, tempPiece: null },
    reglages: { ...REGLAGES_DEFAUT },
    meta: { derniereSauvegarde: null },
  };
}

/** Les deux recettes de référence du cahier des charges, lues comme si on les collait. */
export function recettesPrechargees() {
  return [TEXTE_PIZZA_APP, JSON_48H].map((texte) => lireRecettes(texte).resultats[0].recette);
}

/** Données du tout premier lancement. */
export function donneesInitiales() {
  const donnees = donneesVides();
  donnees.recettes = recettesPrechargees();
  donnees.fournee.recetteId = donnees.recettes[0].id;
  donnees.fournee.boules = donnees.recettes[0].boules;
  return donnees;
}

/** Contrôle et complète des données lues (stockage local ou sauvegarde importée). */
export function normaliserDonnees(source) {
  if (!source || typeof source !== 'object' || !Array.isArray(source.recettes)) {
    throw new Error('Les données ne sont pas lisibles.');
  }
  if ((source.version ?? 1) > VERSION_DONNEES) {
    throw new Error('Ces données viennent d’une version plus récente de l’appli : la mettre à jour d’abord.');
  }
  // Les migrations des versions futures viendront ici.
  const donnees = donneesVides();
  const ids = new Set();
  donnees.recettes = source.recettes.map((r) => {
    const recette = normaliserRecette(r);
    if (ids.has(recette.id)) recette.id = nouvelId();
    ids.add(recette.id);
    return recette;
  });

  const fournee = source.fournee ?? {};
  const recette = donnees.recettes.find((r) => r.id === fournee.recetteId) ?? donnees.recettes[0] ?? null;
  const boulesValides = Number.isInteger(fournee.boules) && fournee.boules >= 1 && fournee.boules <= 99;
  donnees.fournee = {
    recetteId: recette?.id ?? null,
    boules: boulesValides ? fournee.boules : (recette?.boules ?? null),
    repas: typeof fournee.repas === 'string' ? fournee.repas : null,
    tempPiece: Number.isFinite(fournee.tempPiece) ? fournee.tempPiece : null,
  };

  donnees.reglages = { ...REGLAGES_DEFAUT, ...(source.reglages ?? {}) };
  if (!['auto', 'clair', 'sombre'].includes(donnees.reglages.theme)) donnees.reglages.theme = 'auto';
  const derniere = source.meta?.derniereSauvegarde;
  donnees.meta = { derniereSauvegarde: typeof derniere === 'string' ? derniere : null };
  return donnees;
}

/* ---------- Fichier de sauvegarde ---------- */

export function creerSauvegarde(donnees, maintenant = new Date()) {
  return {
    application: APPLICATION,
    version: VERSION_DONNEES,
    exporteLe: maintenant.toISOString(),
    recettes: donnees.recettes,
    fournee: donnees.fournee,
    reglages: donnees.reglages,
  };
}

/** Lit un fichier de sauvegarde. Renvoie { donnees, exporteLe } ou lève une erreur explicite. */
export function lireSauvegarde(texte) {
  let source;
  try {
    source = JSON.parse(texte);
  } catch {
    throw new Error('Ce fichier n’est pas une sauvegarde lisible.');
  }
  if (!source || typeof source !== 'object' || source.application !== APPLICATION) {
    if (Array.isArray(source?.brassins)) throw new Error('C’est une sauvegarde de Brasserie Ensen, pas de Pizzeria Ensen.');
    throw new Error('Ce fichier n’est pas une sauvegarde de Pizzeria Ensen.');
  }
  const donnees = normaliserDonnees(source);
  for (const recette of donnees.recettes) {
    const [probleme] = verifierRecette(recette);
    if (probleme) throw new Error(`Sauvegarde abîmée, recette « ${recette.nom || 'sans nom'} » : ${probleme.message}`);
  }
  const exporteLe = typeof source.exporteLe === 'string' ? source.exporteLe : null;
  donnees.meta.derniereSauvegarde = exporteLe;
  return { donnees, exporteLe };
}

/** « pizzeria-ensen-2026-11-12.json » (date du téléphone). */
export function nomFichierSauvegarde(date = new Date()) {
  const deux = (n) => String(n).padStart(2, '0');
  return `${APPLICATION}-${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}.json`;
}
