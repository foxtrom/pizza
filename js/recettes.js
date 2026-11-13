// Modèle d'une recette de référence et formulaire de saisie.
//
// Tout est exprimé en pourcentage de la farine (pourcentages du boulanger) ;
// les grammes sont recalculés à chaque fournée. Chaque recette porte une grille
// par température de la pièce (levure, eau, pointage, remise à température) :
//   { temp: 25, levure: 0.527, tempEau: null, pointage: null, remise: null }
// levure en % de la farine (null = à compléter), températures en °C, durées en heures.
//
// Aucun accès à la page : testable avec Node.

import { calculerDoses, levureEnPourcentage } from './calculs.js';
import { cle, lireNombre, nombre, nouvelId } from './outils.js';

export const TEMP_PATE_DEFAUT = [23, 24]; // °C visés en fin de pétrissage
export const REMISE_DEFAUT = [
  { temp: 20, heures: 4 },
  { temp: 30, heures: 2.5 },
]; // remise à température après le frigo, quand la grille ne la donne pas
export const ALLUMAGE_FOUR_DEFAUT = 30; // minutes avant la première pizza
export const PREMIER_VERSEMENT_DEFAUT = 85; // % de l'eau versée au début du pétrissage, le reste en bassinage

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
  premierVersement: [50, 100, '%', 'Premier versement d’eau'],
  levure: [0.001, 10, '%', 'Levure'],
  levureGrammes: [0.01, 1000, 'g', 'Dose de levure'],
  temp: [0, 45, '°C', 'Température de la pièce'],
  ta: [0, 45, '°C', 'TA'],
  pointage: [0, 72, 'h', 'Pointage'],
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
    premierVersement: nombreOuNull(s.premierVersement) ?? PREMIER_VERSEMENT_DEFAUT,
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
  controler('premierVersement', recette.premierVersement);
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

/** Une ligne de la grille dans le formulaire (texte). levurePct et levureG0 sont cachés : ils évitent toute dérive par arrondi. */
export const LIGNE_VIDE = Object.freeze({
  temp: '', levure: '', tempEau: '', pointage: '', remiseMin: '', remiseMax: '', levurePct: '', levureG0: '',
});
const COLONNES_SAISIES = ['temp', 'levure', 'tempEau', 'pointage', 'remiseMin', 'remiseMax'];

/** Valeurs affichées dans le formulaire (texte) ; sans recette : nouvelle recette vide. */
export function valeursFormulaire(recette = null) {
  if (!recette) {
    return {
      nom: '', style: 'Napolitaine', farine: '', boules: '', poidsBoule: '', hydratation: '', sel: '',
      premierVersement: texteNombre(PREMIER_VERSEMENT_DEFAUT, 1), typeLevure: 'LBF', grille: [{ ...LIGNE_VIDE }],
      pointage: '', froidHeures: '', froidMin: '', froidMax: '', notes: '',
    };
  }
  const [froidMin, froidMax] = recette.froid.temp ?? [null, null];
  return {
    nom: recette.nom,
    style: recette.style,
    farine: recette.farine,
    boules: texteNombre(recette.boules, 0),
    poidsBoule: texteNombre(recette.poidsBoule),
    hydratation: texteNombre(recette.hydratation),
    sel: texteNombre(recette.sel),
    premierVersement: texteNombre(recette.premierVersement, 1),
    typeLevure: recette.typeLevure,
    grille: recette.grille.map((r) => {
      const grammes = r.levure == null ? '' : nombre(calculerDoses({ ...recette, levure: r.levure }).levure, 2, 2);
      return {
        temp: texteNombre(r.temp, 1),
        levure: grammes,
        tempEau: texteNombre(r.tempEau, 1),
        pointage: texteNombre(r.pointage),
        remiseMin: r.remise ? texteNombre(r.remise[0]) : '',
        remiseMax: r.remise && r.remise[1] !== r.remise[0] ? texteNombre(r.remise[1]) : '',
        levurePct: r.levure == null ? '' : String(r.levure),
        levureG0: grammes,
      };
    }),
    pointage: texteNombre(recette.pointage),
    froidHeures: texteNombre(recette.froid.heures),
    froidMin: texteNombre(froidMin, 1),
    froidMax: froidMax != null && froidMax !== froidMin ? texteNombre(froidMax, 1) : '',
    notes: recette.notes,
  };
}

const enTexte = (nom, valeur) => {
  if (typeof valeur !== 'number') return valeur ?? '';
  if (nom === 'levurePct') return String(valeur);
  return nombre(valeur, nom === 'levure' ? 2 : 3);
};

/** Valeurs lues (nombres) mises en texte pour pré-remplir le formulaire. */
export function valeursEnTexte(valeurs) {
  const resultat = {};
  for (const [nom, valeur] of Object.entries({ ...valeursFormulaire(), ...valeurs })) {
    if (nom !== 'grille') resultat[nom] = enTexte(nom, valeur);
  }
  const lignes = valeurs.grille?.length ? valeurs.grille : [{}];
  resultat.grille = lignes.map((ligne) => ({
    ...LIGNE_VIDE,
    ...Object.fromEntries(Object.entries(ligne).map(([nom, valeur]) => [nom, enTexte(nom, valeur)])),
  }));
  return resultat;
}

/** Champs d'un formulaire envoyé (paires nom/valeur) : « grille.2.temp » va dans grille[2].temp. */
export function champsDepuisEntrees(entrees) {
  const champs = { grille: [] };
  for (const [nom, valeur] of entrees) {
    const ligne = /^grille\.(\d+)\.(\w+)$/.exec(nom);
    if (ligne) (champs.grille[Number(ligne[1])] ??= { ...LIGNE_VIDE })[ligne[2]] = valeur;
    else champs[nom] = valeur;
  }
  champs.grille = champs.grille.filter(Boolean);
  return champs;
}

/**
 * Recette construite à partir des champs du formulaire (texte saisi) ou des
 * valeurs lues dans un texte Pizza App (nombres).
 * Grille : une ligne par température ; la levure s'y saisit en grammes pour le
 * nombre de boules de la recette, comme Pizza App l'affiche.
 * Renvoie { recette, erreurs } : erreurs = { champ: message } ; recette = null s'il y en a.
 * Les erreurs de la grille ont pour clé « grille.<ligne>.<colonne> », ou « grille ».
 */
export function recetteDepuisFormulaire(champs, existante = null, { source = 'manuel', texteImporte = '' } = {}) {
  const erreurs = {};
  const lire = (cle, brut, bornes, { requis = false, entier = false } = {}) => {
    const valeur = lireNombre(brut);
    if (valeur == null) {
      if (requis) erreurs[cle] = 'À renseigner.';
      return null;
    }
    if (Number.isNaN(valeur)) {
      erreurs[cle] = 'Nombre illisible.';
      return null;
    }
    if (horsBornes(valeur, bornes) || (entier && !Number.isInteger(valeur))) {
      const message = messageBornes(bornes, entier);
      erreurs[cle] = `${message[0].toUpperCase()}${message.slice(1)}.`;
      return null;
    }
    return valeur;
  };

  const nom = String(champs.nom ?? '').trim();
  if (!nom) erreurs.nom = 'À renseigner.';
  const boules = lire('boules', champs.boules, 'boules', { requis: true, entier: true });
  const poidsBoule = lire('poidsBoule', champs.poidsBoule, 'poidsBoule', { requis: true });
  const hydratation = lire('hydratation', champs.hydratation, 'hydratation', { requis: true });
  const sel = lire('sel', champs.sel, 'sel', { requis: true });
  const premierVersement = lire('premierVersement', champs.premierVersement, 'premierVersement') ?? PREMIER_VERSEMENT_DEFAUT;
  const pointage = lire('pointage', champs.pointage, 'pointage');
  const froidHeures = lire('froidHeures', champs.froidHeures, 'froidHeures');
  // Température du frigo : pense-bête, jamais utilisé dans un calcul. Une valeur illisible est ignorée.
  const temperatureFrigo = (cle) => {
    const t = lireNombre(champs[cle]);
    return Number.isFinite(t) && !horsBornes(t, 'froidTemp') ? t : null;
  };
  let froidMin = temperatureFrigo('froidMin');
  const froidMax = temperatureFrigo('froidMax');
  if (froidMin == null && froidMax != null) froidMin = froidMax;

  // Grille par température de la pièce.
  const pateConnue = boules != null && poidsBoule != null && hydratation != null && sel != null;
  const memePate =
    existante != null &&
    boules === existante.boules &&
    poidsBoule === existante.poidsBoule &&
    hydratation === existante.hydratation &&
    sel === existante.sel;
  const grille = [];
  const temperatures = new Set();
  (champs.grille ?? []).forEach((ligne, i) => {
    const cle = (colonne) => `grille.${i}.${colonne}`;
    const texte = (colonne) => String(ligne[colonne] ?? '').trim();
    if (COLONNES_SAISIES.every((colonne) => !texte(colonne)) && !texte('levurePct')) return; // ligne vide

    const grammes = lire(cle('levure'), ligne.levure, 'levureGrammes');
    const pctConnu = lireNombre(ligne.levurePct);
    let temp = lireNombre(ligne.temp);
    if (temp == null) {
      erreurs[cle('temp')] = grammes != null || Number.isFinite(pctConnu) ? 'À renseigner avec la dose de levure.' : 'À renseigner.';
    } else {
      temp = lire(cle('temp'), ligne.temp, 'temp');
      if (temp != null && temperatures.has(temp)) erreurs[cle('temp')] = 'Température déjà dans la grille.';
      if (temp != null) temperatures.add(temp);
    }

    let levure = null;
    if (grammes != null) {
      const inchange = memePate && Number.isFinite(pctConnu) && lireNombre(ligne.levureG0) === grammes;
      if (inchange) levure = pctConnu;
      else if (pateConnue && grammes >= (boules * poidsBoule) / 2) erreurs[cle('levure')] = 'Dose trop forte pour ce poids de pâte.';
      else if (pateConnue) levure = levureEnPourcentage({ boules, poidsBoule, hydratation, sel, grammes });
    } else if (Number.isFinite(pctConnu) && !texte('levureG0')) {
      levure = pctConnu; // dose connue seulement en pourcentage (import)
    }
    const remiseMin = lire(cle('remiseMin'), ligne.remiseMin, 'remise');
    const remiseMax = lire(cle('remiseMax'), ligne.remiseMax, 'remise');
    grille.push({
      temp,
      levure,
      tempEau: lire(cle('tempEau'), ligne.tempEau, 'tempEau'),
      pointage: lire(cle('pointage'), ligne.pointage, 'pointage'),
      remise: remiseMin == null && remiseMax == null ? null : versPlage([remiseMin ?? remiseMax, remiseMax ?? remiseMin]),
    });
  });
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
    premierVersement,
    typeLevure: String(champs.typeLevure ?? '').trim() || 'LBF',
    grille: grille.sort((a, b) => a.temp - b.temp),
    pointage,
    froid: { heures: froidHeures, temp: versPlage([froidMin, froidMax]) },
    notes: String(champs.notes ?? '').trim(),
    modifieLe: new Date().toISOString(),
  });

  // Dernier filet de sécurité : les mêmes contrôles que pour une recette importée.
  for (const { champ, message } of verifierRecette(recette)) {
    const cible = { levure: 'grille', froidTemp: 'froidMin' }[champ] ?? champ;
    erreurs[cible] ??= message;
  }
  return Object.keys(erreurs).length ? { recette: null, erreurs } : { recette, erreurs };
}
