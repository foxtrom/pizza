// Composants de la refonte visuelle (styles dans css/systeme.css) : symboles, badges, note,
// aides et messages, états vides, lignes d'action. Ils affichent seulement ce que calculent
// les autres modules : aucune règle métier ici. Aucun accès à la page : utilisable dans les tests.

import { brut, html } from './outils.js';

/* ---------- Symboles au trait fin (style des symboles iOS, dessinés pour l'appli) ---------- */

const icone = (traces) =>
  brut(
    `<svg class="e-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${traces}</svg>`,
  );

export const SYMBOLES = {
  part: icone(
    '<path d="M12 21.5 3.2 7.4a17 17 0 0 1 17.6 0Z"/><path d="M5 10.3a13.5 13.5 0 0 1 14 0"/><circle cx="10" cy="13" r="1.3"/><circle cx="14" cy="14.6" r="1.3"/><circle cx="12" cy="17.7" r="1"/>',
  ),
  livre: icone('<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>'),
  carnet: icone('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>'),
  coller: icone(
    '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  ),
  crayon: icone('<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'),
  retour: icone('<path d="M15 18l-6-6 6-6"/>'),
  suivant: icone('<path d="m9 6 6 6-6 6"/>'),
  ok: icone('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  alerte: icone('<path d="M10.3 4.6 2.9 17.4a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/>'),
  horloge: icone('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  thermometre: icone('<path d="M14 14.8V4.5a2 2 0 0 0-4 0v10.3a4 4 0 1 0 4 0Z"/><path d="M12 9v7"/>'),
  plus: icone('<path d="M12 5v14M5 12h14"/>'),
  exporter: icone('<path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'),
  importer: icone('<path d="M12 3v12M8 11l4 4 4-4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'),
};

/* ---------- Badges ---------- */

// [classe, symbole] : les états à surveiller ont toujours leur icône (jamais la couleur seule).
const BADGES = {
  neutre: ['', null],
  fournee: ['e-badge--fournee', SYMBOLES.part],
  alerte: ['e-badge--alerte', SYMBOLES.alerte],
  attente: ['e-badge--alerte', SYMBOLES.horloge],
  ok: ['e-badge--ok', SYMBOLES.ok],
};

export function badge(type, texte, symbole = undefined) {
  const [classe, parDefaut] = BADGES[type];
  return html`<span class="e-badge${classe ? ` ${classe}` : ''}">${symbole === undefined ? parDefaut : symbole}${texte}</span>`;
}

/* ---------- Note ---------- */

/** Note compacte « ★ 4/5 » ; rien tant que la fournée n'est pas notée. */
export const noteCompacte = (note) =>
  note
    ? html`<span class="e-note" role="img" aria-label="Note : ${note} sur 5"><span class="e-etoile" aria-hidden="true">★</span>${note}/5</span>`
    : '';

/**
 * Note modifiable : étoile pleine ★ ou vide ☆, la forme suffit à lire la note sans dépendre
 * de la couleur. Toucher l'étoile déjà choisie retire la note (data-action="noter", app.js).
 */
export function noteEditable(note, id) {
  return html`<div class="e-note-edition" role="group" aria-label="Note sur 5">${[1, 2, 3, 4, 5].map(
    (i) =>
      html`<button type="button" class="${i <= (note ?? 0) ? 'pleine' : ''}" data-action="noter" data-id="${id}" data-note="${i}" aria-label="${i} sur 5" aria-pressed="${String(i === note)}">${i <= (note ?? 0) ? '★' : '☆'}</button>`,
  )}</div>`;
}

/* ---------- Chiffres, aides, messages ---------- */

/** Ligne « 5 pâtons · 285 g · 70 % eau » : quand elle passe à la ligne, aucun point ne commence la ligne suivante. */
export const points = (elements) =>
  html`<span class="e-ligne-points"><span class="e-points">${elements.filter(Boolean).map((e) => html`<span>${e}</span>`)}</span></span>`;

/** Aide en couleur d'alerte, avec son icône. */
export const aideAlerte = (texte) => html`<p class="e-aide e-aide--alerte">${SYMBOLES.alerte}<span>${texte}</span></p>`;

const SYMBOLES_MESSAGE = { alerte: SYMBOLES.alerte, erreur: SYMBOLES.alerte, info: null };

/** Message dans un écran ou un bloc : icône + texte, jamais la couleur seule. */
export const message = (type, texte) => html`<p class="e-message e-message--${type}">${SYMBOLES_MESSAGE[type]}<span>${texte}</span></p>`;

/* ---------- État vide ---------- */

export function vide({ symbole, titre, texte = '', actions = '' }) {
  return html`<section class="e-vide">
    ${symbole}
    <p class="e-vide-titre">${titre}</p>
    ${texte ? html`<p class="e-vide-texte">${texte}</p>` : ''}
    ${actions ? html`<div class="e-pile">${actions}</div>` : ''}
  </section>`;
}

/* ---------- Ligne d'action : icône, libellé tomate, explication ---------- */

export function ligneAction({ symbole, titre, detail = '', action, cible = null }) {
  return html`<button type="button" class="e-menu-action" data-action="${action}"${cible ? html` data-cible="${cible}"` : ''}>
    ${symbole}
    <span><b>${titre}</b>${detail ? html`<small>${detail}</small>` : ''}</span>
  </button>`;
}
