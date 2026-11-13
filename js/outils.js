// Petits outils partagés : gabarits HTML sûrs, identifiants, nombres et durées
// écrits à la française. Aucun accès à la page : utilisable dans les tests (Node).

/** Morceau de HTML déjà sûr : il ne sera pas échappé une seconde fois. */
export class Brut {
  constructor(texte) {
    this.texte = texte;
  }
  toString() {
    return this.texte;
  }
}

export const brut = (texte) => new Brut(String(texte));

const ECHAPPEMENTS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const echapper = (texte) => String(texte).replace(/[&<>"']/g, (c) => ECHAPPEMENTS[c]);

function versHtml(valeur) {
  if (valeur == null || valeur === false || valeur === true) return '';
  if (valeur instanceof Brut) return valeur.texte;
  if (Array.isArray(valeur)) return valeur.map(versHtml).join('');
  return echapper(valeur);
}

/**
 * Gabarit HTML : html`<p>${texte}</p>` échappe automatiquement chaque valeur
 * (protection contre l'injection de code via un nom de recette, une note…).
 * Les tableaux sont concaténés, null/false/true ne produisent rien.
 */
export function html(morceaux, ...valeurs) {
  let resultat = morceaux[0];
  valeurs.forEach((valeur, i) => {
    resultat += versHtml(valeur) + morceaux[i + 1];
  });
  return new Brut(resultat);
}

export function nouvelId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/* ---------- Nombres ---------- */

/**
 * Arrondi au plus proche, 0,5 vers le haut (valeurs positives).
 * Le petit décalage évite qu'une valeur comme 4,345, que l'ordinateur stocke
 * 4,34499999…, soit arrondie vers le bas.
 */
export function arrondir(valeur, decimales = 0) {
  const facteur = 10 ** decimales;
  return Math.round(valeur * facteur + 1e-9) / facteur;
}

/**
 * Lit un nombre tapé ou copié : « 4,34 », « 2.5 », « 1 425 ».
 * Renvoie null si c'est vide, NaN si ce n'est pas un nombre.
 */
export function lireNombre(valeur) {
  if (typeof valeur === 'number') return Number.isFinite(valeur) ? valeur : NaN;
  if (valeur == null) return null;
  const texte = String(valeur).replace(/[\s​]/g, '').replace(',', '.');
  if (!texte) return null;
  return /^[-+]?(\d+\.?\d*|\.\d+)$/.test(texte) ? Number(texte) : NaN;
}

const formats = new Map();

/** Nombre à la française : « 1 425 », « 4,34 », « 2,5 ». */
export function nombre(valeur, decimalesMax = 0, decimalesMin = 0) {
  const id = `${decimalesMin}-${decimalesMax}`;
  if (!formats.has(id)) {
    formats.set(
      id,
      new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimalesMin, maximumFractionDigits: decimalesMax }),
    );
  }
  return formats.get(id).format(valeur);
}

const INSECABLE = ' ';

/** « 824 g », « 4,34 g » (arrondi comme les doses). */
export const grammes = (valeur, decimales = 0) =>
  `${nombre(arrondir(valeur, decimales), decimales, decimales)}${INSECABLE}g`;

/** « 70 % », « 2,5 % », « 0,527 % ». */
export const pourcent = (valeur, decimales = 2) => `${nombre(valeur, decimales)}${INSECABLE}%`;

/** « 25 °C », « 4,5 °C ». */
export const degres = (valeur) => `${nombre(valeur, 1)}${INSECABLE}°C`;

/** Plage de valeurs : [4, 5] → « 4–5 °C » ; [4, 4] → « 4 °C ». */
export function plage(valeurs, unite, decimales = 1) {
  if (!valeurs) return '—';
  const [a, b] = valeurs;
  const fin = `${INSECABLE}${unite}`;
  return a === b ? `${nombre(a, decimales)}${fin}` : `${nombre(a, decimales)}–${nombre(b, decimales)}${fin}`;
}

/** Durée en heures : 2 → « 2 h » ; 1,5 → « 1 h 30 » ; 0,75 → « 45 min ». */
export function duree(heures) {
  const minutes = Math.round(heures * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}${INSECABLE}min`;
  return m ? `${h}${INSECABLE}h${INSECABLE}${String(m).padStart(2, '0')}` : `${h}${INSECABLE}h`;
}

/** Plage de durées : [4, 5] → « 4–5 h » ; [1,5, 2] → « 1 h 30 à 2 h ». */
export function plageDuree(valeurs) {
  if (!valeurs) return '—';
  const [a, b] = valeurs;
  if (a === b) return duree(a);
  if (Number.isInteger(a) && Number.isInteger(b)) return `${a}–${b}${INSECABLE}h`;
  return `${duree(a)} à ${duree(b)}`;
}

/** Durée courte pour les tableaux étroits : 3 → « 3 h » ; 2,67 → « 2h40 » ; 0,75 → « 45 min ». */
export function dureeCompacte(heures) {
  const minutes = Math.round(heures * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}${INSECABLE}min`;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}${INSECABLE}h`;
}

/** Plage de durées courte : [4, 5] → « 4–5 h » ; [3,67, 4,67] → « 3h40–4h40 ». */
export function plageDureeCompacte(valeurs) {
  const [a, b] = valeurs;
  if (a === b) return dureeCompacte(a);
  if (Number.isInteger(a) && Number.isInteger(b)) return `${a}–${b}${INSECABLE}h`;
  return `${dureeCompacte(a).replace(INSECABLE, '')}–${dureeCompacte(b).replace(INSECABLE, '')}`;
}

/* ---------- Textes ---------- */

export const sansAccents = (texte) => String(texte).normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Forme simplifiée pour comparer deux textes : minuscules, sans accents ni espaces superflus. */
export const cle = (texte) => sansAccents(texte).toLowerCase().replace(/\s+/g, ' ').trim();

/** « 1 recette », « 3 recettes ». */
export const pluriel = (n, singulier, formePlurielle = `${singulier}s`) => `${n} ${n >= 2 ? formePlurielle : singulier}`;
