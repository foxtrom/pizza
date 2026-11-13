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

/* ---------- Lecture de la grille entre deux températures ---------- */

/**
 * Valeur à `x` sur une courbe qui passe exactement par chaque point et ne dépasse
 * jamais les valeurs de ses deux voisins (interpolation monotone de Fritsch-Carlson).
 * Entre deux points seulement, c'est une droite. Hors de la plage des points : null.
 * points : [{ x, y }] (températures distinctes).
 */
export function interpoler(points, x) {
  const p = [...points].sort((a, b) => a.x - b.x);
  const n = p.length;
  if (!n || x < p[0].x || x > p[n - 1].x) return null;
  const exact = p.find((point) => point.x === x);
  if (exact) return exact.y;

  const pentes = p.slice(0, -1).map((point, i) => (p[i + 1].y - point.y) / (p[i + 1].x - point.x));
  const tangentes = p.map((_, i) => {
    if (i === 0) return pentes[0];
    if (i === n - 1) return pentes[n - 2];
    return pentes[i - 1] * pentes[i] <= 0 ? 0 : (pentes[i - 1] + pentes[i]) / 2;
  });
  pentes.forEach((pente, i) => {
    if (pente === 0) {
      tangentes[i] = 0;
      tangentes[i + 1] = 0;
      return;
    }
    const a = tangentes[i] / pente;
    const b = tangentes[i + 1] / pente;
    const s = a * a + b * b;
    if (s > 9) {
      tangentes[i] = (3 / Math.sqrt(s)) * a * pente;
      tangentes[i + 1] = (3 / Math.sqrt(s)) * b * pente;
    }
  });

  const k = p.findIndex((point, i) => i < n - 1 && x >= point.x && x <= p[i + 1].x);
  const h = p[k + 1].x - p[k].x;
  const t = (x - p[k].x) / h;
  return (
    (2 * t ** 3 - 3 * t ** 2 + 1) * p[k].y +
    (t ** 3 - 2 * t ** 2 + t) * h * tangentes[k] +
    (-2 * t ** 3 + 3 * t ** 2) * p[k + 1].y +
    (t ** 3 - t ** 2) * h * tangentes[k + 1]
  );
}

/**
 * Valeur d'une colonne pour une température : relevée, calculée entre deux relevés,
 * ou, au-delà des relevés, celle du relevé le plus proche avec le sens de l'écart
 * (limite « plus » : la vraie valeur est au-dessus ; « moins » : en dessous).
 * Avec un seul relevé, rien n'est calculé ailleurs qu'à sa température.
 * Renvoie { valeur, calculee, limite } (valeur null si rien ne peut être dit).
 */
export function lireColonne(points, temp) {
  const p = points.filter((point) => point.y != null).sort((a, b) => a.x - b.x);
  const rien = { valeur: null, calculee: false, limite: null };
  if (!p.length || temp == null) return rien;
  const exact = p.find((point) => point.x === temp);
  if (exact) return { valeur: exact.y, calculee: false, limite: null };
  const entreDeux = interpoler(p, temp);
  if (entreDeux != null) return { valeur: entreDeux, calculee: true, limite: null };
  if (p.length === 1) return rien;
  const [premier, dernier] = [p[0], p[p.length - 1]];
  const proche = temp < premier.x ? premier : dernier;
  if (premier.y === dernier.y) return { valeur: proche.y, calculee: true, limite: null };
  const monte = dernier.y > premier.y;
  const limite = temp < premier.x ? (monte ? 'moins' : 'plus') : monte ? 'plus' : 'moins';
  return { valeur: proche.y, calculee: true, limite };
}

/**
 * Valeurs de la grille pour une température de pièce : relevées si la ligne existe,
 * sinon calculées entre les deux températures voisines.
 * Au-delà de la grille : null, ou avec { auDela: true } la valeur du bord et sa limite.
 * Chaque valeur : { valeur, calculee, limite } ; la remise est une plage [min, max].
 */
export function lireGrille(grille, temp, { auDela = false } = {}) {
  const colonne = (nom) => {
    const points = grille.filter((r) => r[nom] != null);
    let lu;
    if (nom === 'remise') {
      const min = lireColonne(points.map((r) => ({ x: r.temp, y: r.remise[0] })), temp);
      const max = lireColonne(points.map((r) => ({ x: r.temp, y: r.remise[1] })), temp);
      lu = min.valeur == null || max.valeur == null ? min : { ...min, valeur: [min.valeur, max.valeur] };
    } else {
      lu = lireColonne(points.map((r) => ({ x: r.temp, y: r[nom] })), temp);
    }
    return lu.limite && !auDela ? { valeur: null, calculee: false, limite: null } : lu;
  };
  return { levure: colonne('levure'), tempEau: colonne('tempEau'), pointage: colonne('pointage'), remise: colonne('remise') };
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
