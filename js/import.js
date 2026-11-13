// Lecture d'une recette collée dans l'appli :
//  - texte partagé depuis Pizza App (« Style de pizza: Napolitaine », « Eau: 70% »…) ;
//  - bloc JSON au format du cahier des charges (« ball_weight_g », « room_temp_variants »…),
//    seul ou en liste.
// Aucun accès à la page : testable avec Node.

import { calculerDoses, releveDeReference } from './calculs.js';
import { cle, grammes, nombre } from './outils.js';
import { normaliserRecette, recetteDepuisFormulaire, verifierRecette } from './recettes.js';

/** Erreur de lecture ; `valeurs` garde ce qui a pu être lu, pour compléter à la main. */
export class ErreurImport extends Error {
  constructor(message, valeurs = null) {
    super(message);
    this.name = 'ErreurImport';
    this.valeurs = valeurs;
  }
}

/** 'json', 'pizzapp', ou null si le texte est vide. */
export function detecterFormat(texte) {
  const t = String(texte ?? '').trim();
  if (!t) return null;
  return /^(```|[[{])/.test(t) || /\{\s*"/.test(t) ? 'json' : 'pizzapp';
}

/**
 * Lit le texte collé. Renvoie { format, resultats } ; chaque résultat contient
 * la recette, les avertissements, les lignes ignorées et, pour Pizza App, la
 * comparaison entre les doses lues et les doses recalculées.
 */
export function lireRecettes(texte) {
  const format = detecterFormat(texte);
  if (!format) throw new ErreurImport('Rien à lire : coller d’abord le texte de la recette.');
  return { format, resultats: format === 'json' ? lireJson(texte) : [lireTextePizzaApp(texte)] };
}

/* ================================================================== */
/* Texte partagé depuis Pizza App                                      */
/* ================================================================== */

// Libellés reconnus, comparés en minuscules, sans accents ni points.
const LIBELLES = [
  [/^style/, 'style'],
  [/^(n|nb|nbre|nombre)( de)? boules?\b/, 'boules'],
  [/^poids\b/, 'poidsBoule'],
  [/^(eau|hydratation)$/, 'eau'],
  [/^sel$/, 'sel'],
  [/^farine$/, 'farine'],
  [/^levage (a )?ta$/, 'pointage'],
  [/^ta$/, 'ta'],
  [/^levage (a )?ct$/, 'froidHeures'],
  [/^ct$/, 'froidTemp'],
  [/^(lbf|lsa|lsi|levure\b.*)$/, 'levure'],
];

const ESPACES = /[\s​⁠﻿]+/g; // \s couvre déjà les espaces insécables

/** Nombres d'une valeur : « 4,34 g » → [4.34] ; « 4-5 °C » → [4, 5] ; « 1 425 g » → [1425]. */
function nombresDe(valeur) {
  const t = valeur.replace(/(\d) (?=\d{3}(?!\d))/g, '$1');
  return [...t.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(',', '.')));
}

/** Unité d'une valeur : '%', '°C', 'g', 'h', ou null. */
function uniteDe(valeur) {
  const t = cle(valeur);
  if (t.includes('%')) return '%';
  if (/[°º]/.test(t) || /\d ?c$/.test(t)) return '°C';
  if (/\d ?(g|gr|grammes?)$/.test(t)) return 'g';
  if (/\d ?(h|heures?|min|minutes?)(?![a-z])/.test(t)) return 'h';
  return null;
}

/** Durée en heures : « 2 h », « 1 h 30 », « 1h30 », « 2,5 h », « 90 min ». */
function dureeDe(valeur) {
  const t = cle(valeur).replace(',', '.');
  let m = t.match(/(\d+(?:\.\d+)?) ?(?:h|heures?)(?![a-z]) ?(\d{1,2})?/);
  if (m) return Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0);
  m = t.match(/(\d+(?:\.\d+)?) ?min/);
  if (m) return Number(m[1]) / 60;
  return nombresDe(valeur)[0] ?? null;
}

function typeLevureDe(etiquette) {
  if (/^(lbf|lsa|lsi)$/.test(etiquette)) return etiquette.toUpperCase();
  if (/seche/.test(etiquette)) return /instant/.test(etiquette) ? 'LSI' : 'LSA';
  return 'LBF';
}

/** Nom proposé : « Napolitaine 20h CT » (style et durée au frigo), modifiable avant d'enregistrer. */
function nomPropose(lu) {
  const style = lu.style || 'Recette';
  if (lu.froidHeures) return `${style} ${nombre(lu.froidHeures, 1)}h CT`;
  if (lu.pointage) return `${style} ${nombre(lu.pointage, 1)}h TA`;
  return lu.style || 'Recette Pizza App';
}

const LIBELLES_CHAMPS = {
  nom: 'Nom',
  boules: 'N. boule de pâte',
  poidsBoule: 'Poids boule de pâte',
  hydratation: 'Eau (%)',
  sel: 'Sel (%)',
  levureGrammes: 'Levure',
  ta: 'TA',
  pointage: 'Levage à TA',
  froidHeures: 'Levage à CT',
  froidMin: 'CT',
  froidMax: 'CT',
};

const listeErreurs = (erreurs) =>
  Object.entries(erreurs)
    .map(([champ, message]) => `${LIBELLES_CHAMPS[champ] ?? champ} (${message[0].toLowerCase()}${message.slice(1).replace(/\.$/, '')})`)
    .join(', ');

/** Compare les doses lues dans le texte à celles que l'appli recalcule (même nombre de boules). */
function verifierDoses(recette, lu) {
  const lues = { farine: lu.farineG ?? null, eau: lu.eauG ?? null, sel: lu.selG ?? null, levure: lu.levureG ?? null };
  if (Object.values(lues).every((v) => v == null)) return null;
  const doses = calculerDoses({ ...recette, levure: releveDeReference(recette)?.levure ?? null });
  const noms = ['farine', 'eau', 'sel', 'levure'].filter((nom) => lues[nom] != null && doses[nom] != null);
  const tolerance = { farine: 1, eau: 1, sel: 1, levure: 0.01 }; // un arrondi d'écart reste normal
  const ecarts = noms
    .filter((nom) => Math.abs(lues[nom] - doses[nom]) > tolerance[nom] + 1e-9)
    .map((nom) => ({ nom, lue: lues[nom], calculee: doses[nom] }));
  const identiques = noms.every((nom) => Math.abs(lues[nom] - doses[nom]) < 1e-9);
  return { boules: recette.boules, lues, doses, ecarts, identiques };
}

/** Lit le texte partagé par Pizza App. Lève ErreurImport si la recette est incomplète. */
export function lireTextePizzaApp(texte) {
  const source = String(texte ?? '');
  const lu = {};
  const ignorees = [];
  const avertissements = [];
  let section = 'parametres'; // puis 'doses' après le séparateur « ----- »
  let reconnues = 0;

  for (const ligneBrute of source.split(/\r\n|[\r\n\u2028\u2029]/)) {
    const ligne = ligneBrute.replace(ESPACES, ' ').trim();
    if (!ligne) continue;
    if (/^[-–—_=*.·• ]{3,}$/.test(ligne)) {
      section = 'doses';
      continue;
    }
    const position = ligne.indexOf(':');
    if (position < 0) {
      const titre = cle(ligne);
      if (/^doses?\b/.test(titre) && /pre-?ferment|biga|poolish|levain/.test(titre)) {
        section = 'ignoree';
        avertissements.push(`Section « ${ligne} » ignorée : les préferments (biga, poolish) ne sont pas pris en charge.`);
      } else if (/^doses?\b/.test(titre)) {
        section = 'doses';
      } else {
        ignorees.push(ligne);
      }
      continue;
    }
    if (section === 'ignoree') {
      ignorees.push(ligne);
      continue;
    }

    const etiquette = cle(ligne.slice(0, position)).replace(/\./g, ' ').replace(/ +/g, ' ').trim();
    const valeur = ligne.slice(position + 1).trim();
    const champ = LIBELLES.find(([motif]) => motif.test(etiquette))?.[1];
    const nombres = nombresDe(valeur);
    if (!champ || !valeur || (champ !== 'style' && !nombres.length)) {
      ignorees.push(ligne);
      continue;
    }
    reconnues += 1;

    switch (champ) {
      case 'style':
        lu.style = valeur;
        break;
      case 'boules':
        lu.boules = nombres[0];
        break;
      case 'poidsBoule':
        lu.poidsBoule = nombres[0];
        break;
      case 'farine':
        lu.farineG = nombres[0];
        break;
      case 'pointage':
        lu.pointage = dureeDe(valeur);
        break;
      case 'froidHeures':
        lu.froidHeures = dureeDe(valeur);
        break;
      case 'ta':
        lu.ta = nombres[0];
        break;
      case 'froidTemp':
        lu.froidTemp = nombres.slice(0, 2);
        break;
      default: {
        // Eau, sel, levure : pourcentage dans les paramètres, grammes dans les doses.
        const unite = uniteDe(valeur);
        const enPourcent = unite === '%' || (unite == null && section === 'parametres');
        lu[`${champ}${enPourcent ? 'Pct' : 'G'}`] = nombres[0];
        if (champ === 'levure') lu.typeLevure = typeLevureDe(etiquette);
      }
    }
  }

  if (!reconnues) throw new ErreurImport('Ce texte ne ressemble ni à une recette Pizza App, ni à un bloc JSON.');

  const valeurs = {
    nom: nomPropose(lu),
    style: lu.style ?? '',
    farine: '',
    boules: lu.boules ?? null,
    poidsBoule: lu.poidsBoule ?? null,
    hydratation: lu.eauPct ?? null,
    sel: lu.selPct ?? null,
    typeLevure: lu.typeLevure ?? 'LBF',
    levureGrammes: lu.levureG ?? null,
    ta: lu.ta ?? null,
    pointage: lu.pointage ?? null,
    froidHeures: lu.froidHeures ?? null,
    froidMin: lu.froidTemp?.[0] ?? null,
    froidMax: lu.froidTemp?.[1] ?? null,
    notes: '',
  };
  const { recette, erreurs } = recetteDepuisFormulaire(valeurs, null, { source: 'pizzapp', texteImporte: source.trim() });
  if (!recette) throw new ErreurImport(`Champs manquants ou invalides : ${listeErreurs(erreurs)}.`, valeurs);

  // Levure donnée seulement en pourcentage : elle devient directement le relevé à la TA.
  if (lu.levureG == null && lu.levurePct != null && lu.ta != null) {
    recette.grille = [{ temp: lu.ta, levure: lu.levurePct, tempEau: null, pointage: null, remise: null }];
    const [probleme] = verifierRecette(recette);
    if (probleme) throw new ErreurImport(probleme.message, valeurs);
  }
  if (!releveDeReference(recette)) avertissements.push('Pas de dose de levure dans le texte : elle sera à compléter.');

  const verification = verifierDoses(recette, lu);
  if (verification?.ecarts.length) {
    const libelles = { farine: 'farine', eau: 'eau', sel: 'sel', levure: recette.typeLevure };
    const detail = verification.ecarts
      .map((e) => {
        const decimales = e.nom === 'levure' ? 2 : 0;
        return `${libelles[e.nom]} : ${grammes(e.lue, decimales)} lus, ${grammes(e.calculee, decimales)} calculés`;
      })
      .join(' ; ');
    avertissements.push(`Écart avec les doses de Pizza App (${detail}). Vérifier le texte : huile, sucre et préferments ne sont pas pris en charge.`);
  }
  return { recette, avertissements, ignorees, verification };
}

/* ================================================================== */
/* Bloc JSON                                                           */
/* ================================================================== */

const CLES_RECETTE = new Set([
  'name', 'style', 'oven', 'flour', 'balls', 'ball_weight_g', 'hydration_pct', 'salt_pct', 'yeast_type',
  'yeast_pct', 'room_temp_c', 'bulk_hours', 'target_dough_temp_c', 'cold_ferment', 'room_temp_variants', 'steps', 'notes',
]);
const CLES_VARIANTE = new Set(['room_temp_c', 'yeast_pct', 'water_temp_c', 'bulk_hours', 'final_proof_hours']);

const STYLES = {
  neapolitan: 'Napolitaine', napoletana: 'Napolitaine', napolitaine: 'Napolitaine',
  roman: 'Romaine', romana: 'Romaine', romaine: 'Romaine',
  'new york': 'New York', new_york: 'New York', newyork: 'New York',
  teglia: 'Teglia', pan: 'Teglia',
};
const LEVURES = {
  fresh: 'LBF', fresh_yeast: 'LBF', lbf: 'LBF',
  dry: 'LSA', active_dry: 'LSA', lsa: 'LSA',
  instant: 'LSI', instant_dry: 'LSI', lsi: 'LSI',
};

function traduire(valeur, table) {
  if (typeof valeur !== 'string' || !valeur.trim()) return '';
  return table[cle(valeur)] ?? valeur.trim().charAt(0).toUpperCase() + valeur.trim().slice(1);
}

/** Objet JSON d'un texte collé : accepte ```json … ```, du texte autour, des guillemets typographiques. */
function analyserJson(texte) {
  let t = String(texte).trim().replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
  const debut = t.search(/[[{]/);
  const fin = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (debut < 0 || fin <= debut) {
    throw new ErreurImport('Bloc JSON incomplet : il doit commencer par { et finir par }.');
  }
  t = t.slice(debut, fin + 1);
  try {
    return JSON.parse(t);
  } catch {
    // Copié depuis Notes ou un traitement de texte : guillemets “ ” et espaces insécables.
    const corrige = t.replace(/[“”„‟″]/g, '"').replace(/[   ⁠﻿]/g, ' ');
    try {
      return JSON.parse(corrige);
    } catch (erreur) {
      throw new ErreurImport(`Bloc JSON illisible (${erreur.message}). Vérifier qu’il a été copié en entier.`);
    }
  }
}

function recetteDepuisJson(o, prefixe) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new ErreurImport(`${prefixe}ce n’est pas une recette.`);
  const avertissements = [];
  let recette;

  if ('poidsBoule' in o) {
    // Recette au format de l'appli.
    recette = normaliserRecette({ ...o, id: null, source: 'json' });
  } else {
    // Format du cahier des charges.
    const variantes = Array.isArray(o.room_temp_variants) ? o.room_temp_variants : [];
    const inconnues = new Set(Object.keys(o).filter((k) => !CLES_RECETTE.has(k)));
    for (const v of variantes) {
      if (v && typeof v === 'object') Object.keys(v).filter((k) => !CLES_VARIANTE.has(k)).forEach((k) => inconnues.add(k));
    }
    if (inconnues.size) avertissements.push(`Champs ignorés : ${[...inconnues].join(', ')}.`);

    const grille = variantes.map((v) => ({
      temp: v?.room_temp_c,
      levure: v?.yeast_pct,
      tempEau: v?.water_temp_c,
      pointage: v?.bulk_hours,
      remise: v?.final_proof_hours,
    }));
    if (o.room_temp_c != null && o.yeast_pct != null && !grille.some((r) => r.temp === o.room_temp_c)) {
      grille.push({ temp: o.room_temp_c, levure: o.yeast_pct });
    }
    const four = o.oven && typeof o.oven === 'object'
      ? { type: o.oven.type, sole: o.oven.stone, temp: o.oven.temp_c, cuisson: o.oven.bake_seconds }
      : null;
    recette = normaliserRecette({
      nom: typeof o.name === 'string' && o.name.trim() ? o.name : 'Recette importée',
      style: traduire(o.style, STYLES),
      farine: o.flour,
      boules: o.balls,
      poidsBoule: o.ball_weight_g,
      hydratation: o.hydration_pct,
      sel: o.salt_pct,
      typeLevure: traduire(o.yeast_type, LEVURES) || 'LBF',
      tempPate: o.target_dough_temp_c,
      froid: { heures: o.cold_ferment?.hours, temp: o.cold_ferment?.temp_c },
      pointage: o.bulk_hours,
      grille,
      four,
      notes: o.notes,
      source: 'json',
    });
  }
  recette.texteImporte = JSON.stringify(o, null, 2);

  const erreurs = verifierRecette(recette);
  if (erreurs.length) throw new ErreurImport(prefixe + erreurs.map((e) => e.message).join(' '));
  if (!releveDeReference(recette)) avertissements.push('Doses de levure à compléter (relevés à faire dans Pizza App).');
  return { recette, avertissements, ignorees: [], verification: null };
}

/** Lit un bloc JSON : une recette, ou une liste de recettes. */
export function lireJson(texte) {
  const objet = analyserJson(texte);
  if (objet && typeof objet === 'object' && !Array.isArray(objet) && ('application' in objet || 'recettes' in objet || 'brassins' in objet)) {
    throw new ErreurImport('C’est un fichier de sauvegarde, pas une recette : le restaurer depuis Réglages.');
  }
  const liste = Array.isArray(objet) ? objet : [objet];
  if (!liste.length) throw new ErreurImport('Le bloc JSON ne contient aucune recette.');
  return liste.map((element, i) => recetteDepuisJson(element, liste.length > 1 ? `Recette n° ${i + 1} : ` : ''));
}
