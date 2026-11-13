// Composants d'interface : icônes, silhouette de l'en-tête, messages, feuilles.

import { brut, html } from './outils.js';

const icone = (traces, epaisseur = 2) =>
  brut(
    `<svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${epaisseur}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${traces}</svg>`,
  );

export const ICONES = {
  retour: icone('<path d="M15 18l-6-6 6-6"/>'),
  part: icone(
    '<path d="M12 21.5 3.2 7.4a17 17 0 0 1 17.6 0Z"/><path d="M5 10.3a13.5 13.5 0 0 1 14 0"/><circle cx="10" cy="13" r="1.3"/><circle cx="14" cy="14.6" r="1.3"/><circle cx="12" cy="17.7" r="1"/>',
  ),
  livre: icone('<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>'),
  reglages: icone(
    '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  ),
  coller: icone(
    '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  ),
  crayon: icone('<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'),
  ok: icone('<path d="M20 6 9 17l-5-5"/>'),
  alerte: icone('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>'),
  moins: icone('<path d="M5 12h14"/>', 3),
  plus: icone('<path d="M12 5v14M5 12h14"/>', 3),
  exporter: icone('<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>'),
  restaurer: icone('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>'),
};

/**
 * Silhouette du Puy de Naouri, comme dans Brasserie Ensen, avec une pizza
 * à la place du soleil (même tracé que l'icône de l'appli). Cadrée sur le sommet.
 */
export const COLLINE = brut(`<svg class="marque-colline" viewBox="0 120 512 250" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">
  <g class="pizza">
    <circle class="pizza-croute" cx="336" cy="214" r="60"/>
    <circle class="pizza-sauce" cx="336" cy="214" r="46"/>
    <circle class="pizza-mozza" cx="318" cy="198" r="10"/>
    <circle class="pizza-mozza" cx="355" cy="205" r="9"/>
    <circle class="pizza-mozza" cx="332" cy="232" r="8"/>
    <path class="pizza-basilic" d="M333 188c7-8 17-9 23-4-6 8-16 9-23 4Z"/>
  </g>
  <path class="crete" d="M-900 352H0C48 338 92 330 134 336C172 341 196 326 236 330C286 336 332 314 384 312C436 310 476 324 512 334V512H-900Z"/>
  <path class="colline" d="M-900 440H0C70 418 122 380 170 332C210 292 242 256 292 251C332 247 358 264 382 284C400 299 416 300 432 309C462 327 490 366 512 382V512H-900Z"/>
</svg>`);

/* ---------- Message temporaire (avec « Annuler ») ---------- */

let minuteurMessage = null;

export function toast(message, { action = null, libelle = 'Annuler', duree = 6000 } = {}) {
  const zone = document.getElementById('toast');
  zone.innerHTML = String(html`<p>${message}</p>${action ? html`<button type="button">${libelle}</button>` : ''}`);
  if (action) {
    zone.querySelector('button').addEventListener(
      'click',
      () => {
        masquerToast();
        action();
      },
      { once: true },
    );
  }
  zone.classList.add('visible');
  clearTimeout(minuteurMessage);
  if (duree) minuteurMessage = setTimeout(masquerToast, duree);
}

export function masquerToast() {
  clearTimeout(minuteurMessage);
  document.getElementById('toast').classList.remove('visible');
}

/* ---------- Feuille (panneau qui monte du bas de l'écran) ---------- */

export function ouvrirFeuille(contenu) {
  const feuille = document.getElementById('feuille');
  feuille.innerHTML = String(contenu);
  if (!feuille.open) feuille.showModal();
  else feuille.querySelector('[autofocus]')?.focus();
  return feuille;
}

export function fermerFeuille() {
  const feuille = document.getElementById('feuille');
  if (feuille.open) feuille.close();
}

/** Demande de confirmation. Renvoie une promesse : true si confirmé. */
export function confirmer({ titre, message, ok = 'Confirmer', danger = false }) {
  return new Promise((resoudre) => {
    const feuille = ouvrirFeuille(html`<div class="feuille-contenu">
      <h2 tabindex="-1" autofocus>${titre}</h2>
      <p>${message}</p>
      <div class="boutons-feuille">
        <button type="button" class="btn" data-reponse="non">Annuler</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primaire'}" data-reponse="oui">${ok}</button>
      </div>
    </div>`);
    const surFermeture = () => resoudre(false);
    feuille.addEventListener('close', surFermeture, { once: true });
    feuille.querySelectorAll('[data-reponse]').forEach((bouton) =>
      bouton.addEventListener('click', () => {
        feuille.removeEventListener('close', surFermeture);
        fermerFeuille();
        resoudre(bouton.dataset.reponse === 'oui');
      }),
    );
  });
}
