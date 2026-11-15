// Composants d'interface : icônes des barres, illustrations, messages, feuilles.
// Les icônes du contenu (taille du texte de l'iPhone) sont les SYMBOLES de js/composants.js.

import { brut, html } from './outils.js';

const icone = (traces, epaisseur = 1.75) =>
  brut(
    `<svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${epaisseur}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${traces}</svg>`,
  );

/** Icônes des barres et des boutons ronds (taille fixe en px, comme sur iOS). */
export const ICONES = {
  retour: icone('<path d="M15 18l-6-6 6-6"/>', 2.25),
  disquette: icone('<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/>'),
  coller: icone(
    '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  ),
  crayon: icone('<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'),
  moins: icone('<path d="M5 12h14"/>', 3),
  plus: icone('<path d="M12 5v14M5 12h14"/>', 3),
  coche: icone('<path d="M20 6 9 17l-5-5"/>', 3),
};

/**
 * Illustrations rondes des cartes (64 px), dessinées pour l'appli. Couleurs en
 * variables CSS (classes illus-…) : elles suivent le thème clair ou sombre.
 */
export const ILLUSTRATIONS = {
  paton: brut(`<svg class="illus" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <circle class="illus-disque" cx="32" cy="32" r="32"/>
    <ellipse class="illus-ombre" cx="32" cy="45.5" rx="18.5" ry="4.5"/>
    <path class="paton" d="M13 40.5C13 29 21.5 20 32 20s19 9 19 20.5c0 3.6-8.5 5.5-19 5.5s-19-1.9-19-5.5Z"/>
    <path class="paton-dessous" d="M13.6 42.6c2.6 2.2 9.6 3.4 18.4 3.4s15.8-1.2 18.4-3.4c-.6 2.4-8.4 4.2-18.4 4.2s-17.8-1.8-18.4-4.2Z"/>
    <path class="paton-reflet" d="M21 30.5c2.6-3.6 6.4-5.6 10.8-6"/>
    <circle class="farine-point" cx="40" cy="31" r="1.1"/>
    <circle class="farine-point" cx="26" cy="37" r="0.9"/>
    <circle class="farine-point" cx="37" cy="39" r="1"/>
    <circle class="farine-point" cx="44.5" cy="37" r="0.8"/>
  </svg>`),
  pizza: brut(`<svg class="illus" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <circle class="illus-disque" cx="32" cy="32" r="32"/>
    <circle class="pizza-croute" cx="32" cy="32" r="21"/>
    <circle class="pizza-cuisson" cx="15" cy="27" r="1.6"/>
    <circle class="pizza-cuisson" cx="24" cy="13.5" r="1.3"/>
    <circle class="pizza-cuisson" cx="44" cy="15.5" r="1.5"/>
    <circle class="pizza-cuisson" cx="50.5" cy="35" r="1.3"/>
    <circle class="pizza-cuisson" cx="37" cy="51" r="1.5"/>
    <circle class="pizza-cuisson" cx="17.5" cy="43" r="1.2"/>
    <circle class="pizza-tomate" cx="32" cy="32" r="16.5"/>
    <circle class="pizza-mozza" cx="26" cy="27" r="4"/>
    <circle class="pizza-mozza" cx="38" cy="30" r="3.6"/>
    <circle class="pizza-mozza" cx="30" cy="39" r="3.4"/>
    <path class="pizza-basilic" d="M32.5 24.5c2.5-2.6 6-2.8 8-1.2-2.2 2.6-5.6 2.9-8 1.2Z"/>
    <path class="pizza-basilic" d="M36.5 38c1.4-3 4.6-4.2 7-3.4-1.4 3-4.6 4.2-7 3.4Z"/>
  </svg>`),
};

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
        <button type="button" class="e-btn e-btn--secondaire" data-reponse="non">Annuler</button>
        <button type="button" class="e-btn ${danger ? 'e-btn--danger' : 'e-btn--principal'}" data-reponse="oui">${ok}</button>
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
