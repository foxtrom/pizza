// Modèle d'une recette de référence et formulaire de saisie.
//
// Tout est exprimé en pourcentage de la farine (pourcentages du boulanger) ;
// les grammes sont recalculés à chaque fournée. Chaque recette porte une grille
// par température de la pièce (levure, eau, pointage, remise à température) :
//   { temp: 25, levure: 0.527, tempEau: null, pointage: null, remise: null }
// levure en % de la farine (null = à compléter), températures en °C, durées en heures.
//
// Aucun accès à la page : testable avec Node.

import { calculerDoses, levureEnPourcentage, releveDeReference } from './calculs.js';
import { cle, lireNombre, nombre, nouvelId } from './outils.js';

export const TEMP_PATE_DEFAUT = [23, 24]; // °C visés en fin de pétrissage
export const REMISE_DEFAUT = [
  { temp: 20, heures: 4 },
  { temp: 30, heures: 2.5 },
]; // remise à température après le frigo, quand la grille ne la donne pas
export const ALLUMAGE_FOUR_DEFAUT = 30; // minutes avant la première pizza

export const TYPES_LEVURE = {
  LBF: 'LBF – levure fraîche',
  LSA: 'LSA – levure sèche active',
  LSI: 'LSI – levure sèche instantanée',
};

/** Valeurs admises : [minimum, maximum, unité, libellé]. */
const BORNES = {
  boules: [1, 99, '', 'Nombre de boules'],
  poidsBoule: [20, 3000, 'g', 'Poids d’une boule'],
  hydratation: [20, 150, '%', 'Eau'],
  sel: [0, 10, '%', 'Sel'],
  levure: [0.001, 10, '%', 'Levure'],
  levureGrammes: [0.01, 1000, 'g', 'Dose de levure'],
  temp: [0, 45, '°C', 'Température de la pièce'],
  ta: [0, 45, '°C', 'TA'],
  pointage: [0, 72, 'h', 'Levage à TA'],
  froidHeures: [0, 240, 'h', 'Levage au frigo'],
  froidTemp: [-5, 15, '°C', 'Température du frigo'],
  tempEau: [-5, 60, '°C', 'Température de l’eau'],
  remise: [0, 48, 'h', 'Remise à température'],
  tempPate: [10, 40, '°C', 'Température de pâte visée'],
  allumageFour: [0, 180, 'min', 'Allumage du four'],
};

const horsBornes = (valeur, nom) => !(valeur >= BORNES[nom][0] && valeur <= BORNES[nom][1]);

function messageBornes(nom, entier = false) {
  const [min, max, unite] = BORNES[nom];
  if (entier) return `nombre entier entre ${min} et ${max}`;
  return `entre ${nombre(min, 3)} et ${nombre(max, 3)}${unite ? ` ${unite}` : ''}`;
}

/* ---------- Normalisation ---------- */

const texte = (valeur) => (typeof valeur === 'string' ? valeur.trim() : '');

const nombreOuNull = (valeur) => {
  const n = lireNombre(valeur);
  return Number.isFinite(n) ? n : null;
};

/** Plage [min, max] à partir d'un nombre ou d'une liste ; null si rien d'utilisable. */
export function versPlage(valeur) {
  if (valeur == null || valeur === '') return null;
  const nombres = (Array.isArray(valeur) ? valeur : [valeur]).map(nombreOuNull).filter((n) => n != null);
  if (!nombres.length) return null;
  return [Math.min(...nombres), Math.max(...nombres)];
}

function normaliserReleve(releve) {
  return {
    temp: nombreOuNull(releve?.temp),
    levure: nombreOuNull(releve?.levure),
    tempEau: nombreOuNull(releve?.tempEau),
    pointage: nombreOuNull(releve?.pointage),
    remise: versPlage(releve?.remise),
  };
}

function normaliserRemiseDefaut(valeur) {
  if (Array.isArray(valeur) && valeur.length === 2) {
    const points = valeur.map((point) => ({ temp: nombreOuNull(point?.temp), heures: nombreOuNull(point?.heures) }));
    if (points.every((point) => point.temp != null && point.heures != null)) return points;
  }
  return REMISE_DEFAUT.map((point) => ({ ...point }));
}

function normaliserFour(valeur) {
  if (!valeur || typeof valeur !== 'object') return null;
  const four = { type: texte(valeur.type), sole: texte(valeur.sole), temp: versPlage(valeur.temp), cuisson: versPlage(valeur.cuisson) };
  return four.type || four.sole || four.temp || four.cuisson ? four : null;
}

/**
 * Recette complète et bien typée à partir de données lues (stockage, sauvegarde,
 * import) : valeurs par défaut, nombres, grille triée. Renvoie toujours une copie.
 */
export function normaliserRecette(source = {}) {
  const s = source && typeof source === 'object' ? source : {};
  const maintenant = new Date().toISOString();
  return {
    id: texte(s.id) || nouvelId(),
    nom: texte(s.nom),
    style: texte(s.style),
    farine: texte(s.farine),
    boules: nombreOuNull(s.boules),
    poidsBoule: nombreOuNull(s.poidsBoule),
    hydratation: nombreOuNull(s.hydratation),
    sel: nombreOuNull(s.sel),
    typeLevure: texte(s.typeLevure) || 'LBF',
    tempPate: versPlage(s.tempPate) ?? [...TEMP_PATE_DEFAUT],
    froid: { heures: nombreOuNull(s.froid?.heures), temp: versPlage(s.froid?.temp) },
    pointage: nombreOuNull(s.pointage),
    grille: (Array.isArray(s.grille) ? s.grille : [])
      .map(normaliserReleve)
      .sort((a, b) => (a.temp ?? Infinity) - (b.temp ?? Infinity)),
    remiseDefaut: normaliserRemiseDefaut(s.remiseDefaut),
    allumageFour: nombreOuNull(s.allumageFour) ?? ALLUMAGE_FOUR_DEFAUT,
    four: normaliserFour(s.four),
    notes: texte(s.notes),
    source: ['pizzapp', 'json', 'manuel'].includes(s.source) ? s.source : 'manuel',
    texteImporte: typeof s.texteImporte === 'string' ? s.texteImporte : '',
    creeLe: texte(s.creeLe) || maintenant,
    modifieLe: texte(s.modifieLe) || maintenant,
  };
}

/* ---------- Contrôle ---------- */

/** Problèmes d'une recette normalisée : liste de { champ, message } (vide si tout va bien). */
export function verifierRecette(recette) {
  const erreurs = [];
  const ajouter = (champ, message) => erreurs.push({ champ, message });
  const controler = (champ, valeur, { requis = false, entier = false, bornes = champ, prefixe = '' } = {}) => {
    const libelle = prefixe + BORNES[bornes][3];
    if (valeur == null) {
      if (requis) ajouter(champ, `${libelle} : à renseigner.`);
      return;
    }
    if (horsBornes(valeur, bornes) || (entier && !Number.isInteger(valeur))) {
      ajouter(champ, `${libelle} : ${messageBornes(bornes, entier)}.`);
    }
  };

  if (!recette.nom) ajouter('nom', 'Nom : à renseigner.');
  controler('boules', recette.boules, { requis: true, entier: true });
  controler('poidsBoule', recette.poidsBoule, { requis: true });
  controler('hydratation', recette.hydratation, { requis: true });
  controler('sel', recette.sel, { requis: true });
  controler('pointage', recette.pointage);
  controler('froidHeures', recette.froid.heures);
  recette.froid.temp?.forEach((t) => controler('froidTemp', t));
  recette.tempPate?.forEach((t) => controler('tempPate', t));
  controler('allumageFour', recette.allumageFour);

  const temperatures = new Set();
  recette.grille.forEach((releve) => {
    if (releve.temp == null) {
      ajouter('grille', 'Grille : un relevé n’a pas de température de pièce.');
      return;
    }
    controler('grille', releve.temp, { bornes: 'temp' });
    if (temperatures.has(releve.temp)) ajouter('grille', `Grille : deux relevés à ${nombre(releve.temp, 1)} °C.`);
    temperatures.add(releve.temp);
    const prefixe = `Grille à ${nombre(releve.temp, 1)} °C – `;
    controler('levure', releve.levure, { prefixe });
    controler('grille', releve.tempEau, { bornes: 'tempEau', prefixe });
    controler('grille', releve.pointage, { bornes: 'pointage', prefixe });
    releve.remise?.forEach((h) => controler('grille', h, { bornes: 'remise', prefixe }));
  });
  return erreurs;
}

/* ---------- Noms ---------- */

export const memeNom = (a, b) => cle(a) === cle(b);

/** Recette qui porte déjà ce nom (sans tenir compte des majuscules ni des accents). */
export function recetteDuMemeNom(recettes, nom, saufId = null) {
  return recettes.find((recette) => recette.id !== saufId && memeNom(recette.nom, nom)) ?? null;
}

/** « Nom », ou « Nom (2) » s'il est déjà pris. */
export function nomLibre(recettes, nom) {
  if (!recetteDuMemeNom(recettes, nom)) return nom;
  let i = 2;
  while (recetteDuMemeNom(recettes, `${nom} (${i})`)) i += 1;
  return `${nom} (${i})`;
}

/* ---------- Formulaire ---------- */

const texteNombre = (valeur, decimales = 2) => (valeur == null ? '' : nombre(valeur, decimales));

/** Valeurs affichées dans le formulaire (texte) ; sans recette : nouvelle recette vide. */
export function valeursFormulaire(recette = null) {
  if (!recette) {
    return {
      nom: '', style: 'Napolitaine', farine: '', boules: '', poidsBoule: '', hydratation: '', sel: '',
      typeLevure: 'LBF', levureGrammes: '', ta: '', pointage: '', froidHeures: '', froidMin: '', froidMax: '', notes: '',
    };
  }
  const releve = releveDeReference(recette);
  const doses = releve ? calculerDoses({ ...recette, levure: releve.levure }) : null;
  const [froidMin, froidMax] = recette.froid.temp ?? [null, null];
  return {
    nom: recette.nom,
    style: recette.style,
    farine: recette.farine,
    boules: texteNombre(recette.boules, 0),
    poidsBoule: texteNombre(recette.poidsBoule),
    hydratation: texteNombre(recette.hydratation),
    sel: texteNombre(recette.sel),
    typeLevure: recette.typeLevure,
    levureGrammes: doses ? nombre(doses.levure, 2, 2) : '',
    ta: releve ? texteNombre(releve.temp, 1) : '',
    pointage: texteNombre(recette.pointage),
    froidHeures: texteNombre(recette.froid.heures),
    froidMin: texteNombre(froidMin, 1),
    froidMax: froidMax != null && froidMax !== froidMin ? texteNombre(froidMax, 1) : '',
    notes: recette.notes,
  };
}

/** Valeurs lues (nombres) mises en texte pour pré-remplir le formulaire. */
export function valeursEnTexte(valeurs) {
  return Object.fromEntries(
    Object.entries({ ...valeursFormulaire(), ...valeurs }).map(([nom, valeur]) => [
      nom,
      typeof valeur === 'number' ? nombre(valeur, nom === 'levureGrammes' ? 2 : 3) : (valeur ?? ''),
    ]),
  );
}

const releveVide = (r) => r.levure == null && r.tempEau == null && r.pointage == null && r.remise == null;

/**
 * La dose de levure saisie (grammes pour le nombre de boules de la recette) et
 * sa TA deviennent le relevé de la grille à cette température. Les autres
 * colonnes du relevé (eau, pointage, remise) sont conservées.
 */
function appliquerLevure(recette, existante, champs, grammes, ta) {
  const grille = recette.grille;
  const ancien = existante ? releveDeReference(existante) : null;
  const iAncien = ancien ? grille.findIndex((r) => r.temp === ancien.temp) : -1;
  const retirerSiVide = (i) => {
    if (i >= 0 && releveVide(grille[i])) grille.splice(i, 1);
  };

  if (grammes == null) {
    if (iAncien >= 0) {
      grille[iAncien].levure = null; // dose effacée
      retirerSiVide(iAncien);
    }
    return;
  }

  // Rien n'a bougé : on garde le pourcentage exact (pas de dérive due à l'arrondi des grammes).
  const avant = existante ? valeursFormulaire(existante) : null;
  const inchange =
    iAncien >= 0 &&
    ancien.temp === ta &&
    ['boules', 'poidsBoule', 'hydratation', 'sel', 'levureGrammes'].every(
      (nom) => lireNombre(avant[nom]) === lireNombre(champs[nom]),
    );
  const levure = inchange ? ancien.levure : levureEnPourcentage({ ...recette, grammes });

  const iCible = grille.findIndex((r) => r.temp === ta);
  if (iAncien >= 0 && iCible >= 0 && iCible !== iAncien) {
    grille[iCible].levure = levure; // la dose rejoint le relevé déjà présent à cette température
    grille[iAncien].levure = null;
    retirerSiVide(iAncien);
  } else if (iAncien >= 0) {
    Object.assign(grille[iAncien], { temp: ta, levure });
  } else if (iCible >= 0) {
    grille[iCible].levure = levure;
  } else {
    grille.push({ temp: ta, levure, tempEau: null, pointage: null, remise: null });
  }
}

/**
 * Recette construite à partir des champs du formulaire (texte saisi) ou des
 * valeurs lues dans un texte Pizza App (nombres).
 * Renvoie { recette, erreurs } : erreurs = { champ: message } ; recette = null s'il y en a.
 */
export function recetteDepuisFormulaire(champs, existante = null, { source = 'manuel', texteImporte = '' } = {}) {
  const erreurs = {};
  const lire = (nom, bornes, { requis = false, entier = false } = {}) => {
    const valeur = lireNombre(champs[nom]);
    if (valeur == null) {
      if (requis) erreurs[nom] = 'À renseigner.';
      return null;
    }
    if (Number.isNaN(valeur)) {
      erreurs[nom] = 'Nombre illisible.';
      return null;
    }
    if (horsBornes(valeur, bornes) || (entier && !Number.isInteger(valeur))) {
      const message = messageBornes(bornes, entier);
      erreurs[nom] = `${message[0].toUpperCase()}${message.slice(1)}.`;
      return null;
    }
    return valeur;
  };

  const nom = String(champs.nom ?? '').trim();
  if (!nom) erreurs.nom = 'À renseigner.';
  const boules = lire('boules', 'boules', { requis: true, entier: true });
  const poidsBoule = lire('poidsBoule', 'poidsBoule', { requis: true });
  const hydratation = lire('hydratation', 'hydratation', { requis: true });
  const sel = lire('sel', 'sel', { requis: true });
  const levureGrammes = lire('levureGrammes', 'levureGrammes');
  const ta = lire('ta', 'ta');
  const pointage = lire('pointage', 'pointage');
  const froidHeures = lire('froidHeures', 'froidHeures');
  let froidMin = lire('froidMin', 'froidTemp');
  const froidMax = lire('froidMax', 'froidTemp');
  if (froidMin == null && froidMax != null) froidMin = froidMax;

  if (levureGrammes != null && ta == null && !erreurs.ta) erreurs.ta = 'À renseigner avec la dose de levure.';
  if (levureGrammes != null && boules && poidsBoule && levureGrammes >= (boules * poidsBoule) / 2) {
    erreurs.levureGrammes = 'Dose trop forte pour ce poids de pâte.';
  }
  if (Object.keys(erreurs).length) return { recette: null, erreurs };

  const recette = normaliserRecette(existante ?? { source, texteImporte });
  Object.assign(recette, {
    nom,
    style: String(champs.style ?? '').trim(),
    farine: String(champs.farine ?? '').trim(),
    boules,
    poidsBoule,
    hydratation,
    sel,
    typeLevure: String(champs.typeLevure ?? '').trim() || 'LBF',
    pointage,
    froid: { heures: froidHeures, temp: versPlage([froidMin, froidMax]) },
    notes: String(champs.notes ?? '').trim(),
    modifieLe: new Date().toISOString(),
  });
  appliquerLevure(recette, existante, champs, levureGrammes, ta);
  recette.grille.sort((a, b) => a.temp - b.temp);

  // Dernier filet de sécurité : les mêmes contrôles que pour une recette importée.
  for (const { champ, message } of verifierRecette(recette)) {
    const cible = { levure: 'levureGrammes', froidTemp: 'froidMin', grille: 'ta' }[champ] ?? champ;
    erreurs[cible] ??= message;
  }
  return Object.keys(erreurs).length ? { recette: null, erreurs } : { recette, erreurs };
}
