// Écrans de l'appli : chaque fonction renvoie le HTML d'une page (gabarits sûrs).
// Aucune action ici : les boutons portent des data-action, traités par app.js.

import { dosesRecette, releveDeReference } from './calculs.js';
import { brut, degres, duree, grammes, html, nombre, plage, plageDuree, pluriel, pourcent } from './outils.js';
import { recetteDuMemeNom, TYPES_LEVURE } from './recettes.js';
import { COLLINE, ICONES } from './ui.js';

const coche = (vrai) => (vrai ? brut('checked') : '');
const invalide = (message) => (message ? brut('aria-invalid="true"') : '');
const libelleLevure = (r) => r.typeLevure || 'Levure';
const dateLisible = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/* ================================================================== */
/* En-têtes et barre d'actions                                         */
/* ================================================================== */

export const enteteMarque = (devise) =>
  html`<div class="marque">${COLLINE}<h1>Pizzeria Ensen</h1><p class="devise">${devise}</p></div>`;

export const enteteTitre = (titre, retour = null) => html`<div class="barre-titre">
  ${retour ? html`<a class="lien-entete gauche" href="${retour}">${ICONES.retour}<span>Retour</span></a>` : html`<span class="gauche"></span>`}
  <h1>${titre}</h1>
  <span class="droite"></span>
</div>`;

export const boutonsFormulaire = (retour) => html`
  <a class="btn btn-geant" href="${retour}">Annuler</a>
  <button type="submit" form="form-recette" class="btn btn-primaire btn-geant btn-principal">Enregistrer</button>`;

/* ================================================================== */
/* Résumés d'une recette                                               */
/* ================================================================== */

const resumeCourt = (r) =>
  `${r.boules} × ${grammes(r.poidsBoule)}${r.froid.heures != null ? ` · ${duree(r.froid.heures)} au frigo` : ''}`;

export const resumePate = (r) => `${r.boules} × ${grammes(r.poidsBoule)} · eau ${pourcent(r.hydratation)} · sel ${pourcent(r.sel)}`;

export function resumeFermentation(r) {
  const morceaux = [];
  if (r.pointage != null) morceaux.push(`${duree(r.pointage)} à TA`);
  if (r.froid.heures != null) morceaux.push(`${duree(r.froid.heures)} au frigo`);
  if (r.grille.length > 1) morceaux.push(`grille ${plage([r.grille[0].temp, r.grille.at(-1).temp], '°C')}`);
  const releve = releveDeReference(r);
  morceaux.push(releve ? `${libelleLevure(r)} à ${degres(releve.temp)}` : `${libelleLevure(r)} à compléter`);
  return morceaux.join(' · ');
}

/* ================================================================== */
/* Fournée (écran principal)                                           */
/* ================================================================== */

export function ecranFournee(etat) {
  const { recettes, fournee } = etat.donnees;
  if (!recettes.length) {
    return html`<section class="vide">
      <p>Aucune recette enregistrée.</p>
      <div class="pile-boutons">
        <a class="btn btn-primaire btn-geant" href="#/importer">${ICONES.coller}Importer depuis Pizza App</a>
        <a class="btn btn-geant" href="#/nouvelle">${ICONES.crayon}Saisir une recette</a>
      </div>
    </section>`;
  }
  const recette = recettes.find((r) => r.id === fournee.recetteId) ?? recettes[0];
  const boules = fournee.boules ?? recette.boules;
  return html`
    <fieldset class="choix-recettes">
      <legend>Recette</legend>
      ${recettes.map(
        (r) => html`<label class="choix-recette">
          <input type="radio" name="recette" value="${r.id}" data-champ="recette" ${coche(r.id === recette.id)}>
          <span><strong>${r.nom}</strong><small>${resumeCourt(r)}</small></span>
        </label>`,
      )}
    </fieldset>
    <fieldset class="bloc-boules">
      <legend>Nombre de boules</legend>
      <div class="compteur-boules">
        <button type="button" class="btn btn-compteur" data-action="moins" aria-label="Une boule de moins">${ICONES.moins}</button>
        <input id="boules" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="${boules}" data-champ="boules" aria-label="Nombre de boules" autocomplete="off" enterkeyhint="done">
        <button type="button" class="btn btn-compteur" data-action="plus" aria-label="Une boule de plus">${ICONES.plus}</button>
      </div>
    </fieldset>
    <section id="doses" class="carte-doses" aria-live="polite">${blocDoses(recette, boules)}</section>`;
}

/** Doses de la fournée ; remplacé seul quand le nombre de boules change. */
export function blocDoses(recette, boules) {
  const d = dosesRecette(recette, boules);
  const ligne = (nom, detail, valeur, classe = '') => html`<li class="dose ${classe}">
    <span class="dose-nom">${nom}${detail ? html`<small>${detail}</small>` : ''}</span>
    <span class="dose-valeur">${valeur}</span>
  </li>`;
  return html`
    <p class="pate-totale"><strong>${grammes(d.pate)}</strong> de pâte · ${pluriel(boules, 'boule')} de ${grammes(recette.poidsBoule)}</p>
    <ul class="doses">
      ${ligne('Farine', recette.farine, grammes(d.farine))}
      ${ligne('Eau', pourcent(recette.hydratation), grammes(d.eau))}
      ${ligne('Sel', pourcent(recette.sel), grammes(d.sel))}
      ${d.releve
        ? ligne(libelleLevure(recette), pourcent(d.releve.levure, 3), grammes(d.levure, 2))
        : ligne(libelleLevure(recette), 'à compléter', '—', 'dose-manquante')}
    </ul>
    ${d.releve
      ? html`<p class="aide">${libelleLevure(recette)} : dose de référence pour une pièce à ${degres(d.releve.temp)}.</p>`
      : html`<p class="aide alerte">Dose de levure à compléter : <a href="#/recette/${recette.id}/modifier">saisir la dose donnée par Pizza App</a>.</p>`}`;
}

/* ================================================================== */
/* Recettes                                                            */
/* ================================================================== */

export function ecranRecettes(etat) {
  const { recettes, fournee } = etat.donnees;
  return html`
    <div class="deux-boutons">
      <a class="btn btn-primaire btn-geant" href="#/importer">${ICONES.coller}Importer</a>
      <a class="btn btn-geant" href="#/nouvelle">${ICONES.crayon}Saisir</a>
    </div>
    <p class="aide intro">Importer : coller le texte partagé depuis Pizza App, ou un bloc JSON.</p>
    ${recettes.length
      ? html`<ul class="liste-cartes">${recettes.map(
          (r) => html`<li><a class="carte" href="#/recette/${r.id}">
            <span class="carte-haut"><strong class="carte-nom">${r.nom}</strong>${r.id === fournee.recetteId ? html`<span class="pastille">Fournée</span>` : ''}</span>
            <span class="carte-ligne">${resumePate(r)}</span>
            <span class="carte-ligne">${resumeFermentation(r)}</span>
          </a></li>`,
        )}</ul>`
      : html`<p class="vide">Aucune recette pour l’instant.</p>`}`;
}

function blocGrille(r) {
  const colonnes = [
    ['temp', 'Pièce', (g) => degres(g.temp)],
    ['levure', libelleLevure(r), (g) => (g.levure == null ? '—' : pourcent(g.levure, 3))],
    ['tempEau', 'Eau', (g) => (g.tempEau == null ? '' : degres(g.tempEau))],
    ['pointage', 'Pointage', (g) => (g.pointage == null ? '' : duree(g.pointage))],
    ['remise', 'Remise', (g) => (g.remise == null ? '' : plageDuree(g.remise))],
  ].filter(([nom], i) => i < 2 || r.grille.some((g) => g[nom] != null));
  const manquantes = r.grille.some((g) => g.levure == null);
  return html`<section class="bloc">
    <h3>Grille par température de la pièce</h3>
    <div class="defilement">
      <table class="grille-temp">
        <thead><tr>${colonnes.map(([, titre]) => html`<th scope="col">${titre}</th>`)}</tr></thead>
        <tbody>${r.grille.map(
          (g) => html`<tr>${colonnes.map(([, , valeur], i) => (i === 0 ? html`<th scope="row">${valeur(g)}</th>` : html`<td>${valeur(g)}</td>`))}</tr>`,
        )}</tbody>
      </table>
    </div>
    <p class="aide">${libelleLevure(r)} en % de la farine${manquantes ? ' ; — : dose à compléter' : ''}.${r.grille.some((g) => g.tempEau != null) ? ' Eau : température de l’eau du pétrissage.' : ''}</p>
  </section>`;
}

export function ecranRecette(etat, r) {
  const releve = releveDeReference(r);
  const [point1, point2] = r.remiseDefaut;
  const four = r.four;
  return html`
    <div class="fiche-tete">
      <p class="aide">${[r.style, r.farine].filter(Boolean).join(' · ') || 'Recette'}</p>
      <h2 class="fiche-nom">${r.nom}</h2>
    </div>
    <button type="button" class="btn btn-primaire btn-geant btn-large" data-action="utiliser" data-id="${r.id}">${ICONES.part}Préparer une fournée</button>
    <section class="bloc">
      <h3>Pâte de référence</h3>
      <dl class="infos">
        <dt>Boules</dt><dd>${r.boules} × ${grammes(r.poidsBoule)}</dd>
        <dt>Eau</dt><dd>${pourcent(r.hydratation)}</dd>
        <dt>Sel</dt><dd>${pourcent(r.sel)}</dd>
        <dt>Levure</dt><dd>${releve
          ? html`${libelleLevure(r)} ${pourcent(releve.levure, 3)}<small>${grammes(dosesRecette(r, r.boules).levure, 2)} pour ${pluriel(r.boules, 'boule')}, pièce à ${degres(releve.temp)}</small>`
          : `${libelleLevure(r)} à compléter`}</dd>
        <dt>Pâte visée</dt><dd>${plage(r.tempPate, '°C')}<small>en fin de pétrissage</small></dd>
      </dl>
    </section>
    <section class="bloc">
      <h3>Fermentation</h3>
      <dl class="infos">
        <dt>Pointage</dt><dd>${r.pointage != null ? duree(r.pointage) : 'selon la grille'}</dd>
        <dt>Frigo</dt><dd>${r.froid.heures != null ? duree(r.froid.heures) : '—'}${r.froid.temp ? html`<small>à ${plage(r.froid.temp, '°C')}</small>` : ''}</dd>
        <dt>Remise à température</dt><dd>${r.grille.some((g) => g.remise)
          ? 'selon la grille'
          : html`${duree(point1.heures)} à ${degres(point1.temp)}<small>${duree(point2.heures)} à ${degres(point2.temp)}</small>`}</dd>
      </dl>
    </section>
    ${r.grille.length ? blocGrille(r) : ''}
    ${four
      ? html`<section class="bloc">
          <h3>Four</h3>
          <dl class="infos">
            ${four.type || four.sole ? html`<dt>Four</dt><dd>${[four.type, four.sole && `sole ${four.sole}`].filter(Boolean).join(', ')}</dd>` : ''}
            ${four.temp ? html`<dt>Température</dt><dd>${plage(four.temp, '°C', 0)}</dd>` : ''}
            ${four.cuisson ? html`<dt>Cuisson</dt><dd>${plage(four.cuisson, 's', 0)}</dd>` : ''}
          </dl>
        </section>`
      : ''}
    ${r.notes ? html`<section class="bloc"><h3>Notes</h3><p class="notes">${r.notes}</p></section>` : ''}
    ${r.texteImporte
      ? html`<details class="bloc details-import">
          <summary>Texte importé${r.source === 'pizzapp' ? ' de Pizza App' : ''}</summary>
          <pre class="texte-importe">${r.texteImporte}</pre>
        </details>`
      : ''}
    <div class="pile-boutons actions-bas">
      <a class="btn btn-large" href="#/recette/${r.id}/modifier">${ICONES.crayon}Modifier</a>
      <button type="button" class="btn btn-danger btn-large" data-action="supprimer" data-id="${r.id}">Supprimer</button>
    </div>`;
}

/* ================================================================== */
/* Import                                                              */
/* ================================================================== */

export function ecranImport(etat) {
  const imp = etat.import;
  return html`
    <form id="form-import" data-form="lire-import" novalidate>
      <label class="champ">
        <span class="libelle">Texte de la recette</span>
        <textarea id="texte-import" data-champ="texte-import" rows="9" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" placeholder="Coller ici le texte partagé depuis Pizza App, ou un bloc JSON.">${imp.texte}</textarea>
      </label>
      <p class="aide">Dans Pizza App : partager la recette, copier le texte, puis le coller ici.</p>
      <div class="deux-boutons">
        ${etat.peutColler
          ? html`<button type="button" class="btn btn-geant" data-action="coller">${ICONES.coller}Coller</button>`
          : html`<button type="button" class="btn btn-geant" data-action="effacer-import">Effacer</button>`}
        <button type="submit" class="btn btn-primaire btn-geant">Lire la recette</button>
      </div>
      ${etat.peutColler && imp.texte ? html`<button type="button" class="btn btn-discret btn-large" data-action="effacer-import">Effacer le texte</button>` : ''}
    </form>
    <div id="resultat-import">
      ${imp.erreur ? blocErreurImport(imp.erreur) : ''}
      ${imp.resultats
        ? html`${imp.resultats.map((res, i) => apercuImport(res, i, etat))}
          <button type="button" class="btn btn-primaire btn-geant btn-large" data-action="enregistrer-import">${
            imp.resultats.length > 1 ? `Enregistrer les ${imp.resultats.length} recettes` : 'Enregistrer la recette'
          }</button>`
        : ''}
    </div>`;
}

function blocErreurImport(erreur) {
  return html`<section class="bloc bloc-alerte">
    <h3>${ICONES.alerte}Lecture impossible</h3>
    <p>${erreur.message}</p>
    ${erreur.valeurs
      ? html`<button type="button" class="btn btn-large" data-action="saisie-depuis-import">${ICONES.crayon}Compléter à la main</button>`
      : html`<a class="btn btn-large" href="#/nouvelle">${ICONES.crayon}Saisir la recette à la main</a>`}
  </section>`;
}

/** Choix proposé quand une recette du même nom existe déjà. */
export function zoneDoublon(res, i, doublon) {
  if (!doublon) return '';
  return html`<div class="doublon">
    <p class="aide alerte">« ${doublon.nom} » existe déjà.</p>
    <div class="segments" role="radiogroup" aria-label="Recette du même nom">
      <label><input type="radio" name="doublon-${i}" value="remplacer" data-champ="choix-doublon" data-index="${i}" ${coche(res.choix === 'remplacer')}><span>La remplacer</span></label>
      <label><input type="radio" name="doublon-${i}" value="garder" data-champ="choix-doublon" data-index="${i}" ${coche(res.choix === 'garder')}><span>Garder les deux</span></label>
    </div>
  </div>`;
}

function blocControle(v, r) {
  const ligne = (libelle, nom, decimales = 0) =>
    v.lues[nom] == null && v.doses[nom] == null
      ? ''
      : html`<tr>
          <th scope="row">${libelle}</th>
          <td>${v.lues[nom] == null ? '—' : grammes(v.lues[nom], decimales)}</td>
          <td>${v.doses[nom] == null ? '—' : grammes(v.doses[nom], decimales)}</td>
        </tr>`;
  const ok = !v.ecarts.length;
  const titre = v.identiques ? 'Doses identiques à Pizza App' : ok ? 'Doses identiques à Pizza App, à un arrondi près' : 'Écart avec les doses de Pizza App';
  return html`<div class="controle ${ok ? 'controle-ok' : 'controle-ecart'}">
    <p class="controle-titre">${ok ? ICONES.ok : ICONES.alerte}<span>${titre}</span></p>
    <table class="tableau-controle">
      <thead><tr><th scope="col">${pluriel(v.boules, 'boule')}</th><th scope="col">Pizza App</th><th scope="col">Recalcul</th></tr></thead>
      <tbody>${ligne('Farine', 'farine')}${ligne('Eau', 'eau')}${ligne('Sel', 'sel')}${ligne(libelleLevure(r), 'levure', 2)}</tbody>
    </table>
  </div>`;
}

function apercuImport(res, i, etat) {
  const r = res.recette;
  const releve = releveDeReference(r);
  const doublon = recetteDuMemeNom(etat.donnees.recettes, res.nom.trim() || r.nom);
  return html`<section class="bloc apercu">
    <h3>${ICONES.ok}${r.source === 'pizzapp' ? 'Recette Pizza App lue' : 'Recette JSON lue'}</h3>
    <label class="champ">
      <span class="libelle">Nom de la recette</span>
      <input type="text" value="${res.nom}" data-champ="nom-import" data-index="${i}" autocomplete="off" enterkeyhint="done">
    </label>
    <div id="doublon-${i}">${zoneDoublon(res, i, doublon)}</div>
    <dl class="infos">
      <dt>Pâte</dt><dd>${r.boules} × ${grammes(r.poidsBoule)}</dd>
      <dt>Eau · sel</dt><dd>${pourcent(r.hydratation)} · ${pourcent(r.sel)}</dd>
      <dt>Levure</dt><dd>${releve
        ? html`${libelleLevure(r)} ${pourcent(releve.levure, 3)}<small>pièce à ${degres(releve.temp)}</small>`
        : `${libelleLevure(r)} à compléter`}</dd>
      ${r.pointage != null ? html`<dt>Levage à TA</dt><dd>${duree(r.pointage)}</dd>` : ''}
      ${r.froid.heures != null
        ? html`<dt>Frigo</dt><dd>${duree(r.froid.heures)}${r.froid.temp ? html`<small>à ${plage(r.froid.temp, '°C')}</small>` : ''}</dd>`
        : ''}
      ${r.grille.length > 1
        ? html`<dt>Grille</dt><dd>${pluriel(r.grille.length, 'température')}<small>${r.grille.map((g) => nombre(g.temp, 1)).join(', ')} °C</small></dd>`
        : ''}
    </dl>
    ${res.verification ? blocControle(res.verification, r) : ''}
    ${res.avertissements.map((a) => html`<p class="banniere banniere-alerte">${ICONES.alerte}<span>${a}</span></p>`)}
    ${res.ignorees.length
      ? html`<details>
          <summary>${pluriel(res.ignorees.length, 'ligne non reconnue', 'lignes non reconnues')}</summary>
          <pre class="texte-importe">${res.ignorees.join('\n')}</pre>
        </details>`
      : ''}
  </section>`;
}

/* ================================================================== */
/* Formulaire : nouvelle recette ou modification                       */
/* ================================================================== */

export function ecranFormulaire(etat, recette = null) {
  const { valeurs: v, erreurs: e, general } = etat.formulaire;
  const nombreSaisi = (nom, libelle, { mode = 'decimal', unite = '' } = {}) => html`
    <label class="champ">
      <span class="libelle">${libelle}</span>
      <span class="champ-unite">
        <input type="text" name="${nom}" value="${v[nom] ?? ''}" inputmode="${mode}" autocomplete="off" ${invalide(e[nom])}>
        <span class="unite" aria-hidden="${unite ? 'false' : 'true'}">${unite}</span>
      </span>
      ${e[nom] ? html`<span class="erreur">${e[nom]}</span>` : ''}
    </label>`;
  const texteSaisi = (nom, libelle, placeholder = '') => html`
    <label class="champ">
      <span class="libelle">${libelle}</span>
      <input type="text" name="${nom}" value="${v[nom] ?? ''}" placeholder="${placeholder}" autocomplete="off" ${invalide(e[nom])}>
      ${e[nom] ? html`<span class="erreur">${e[nom]}</span>` : ''}
    </label>`;
  const types = { ...TYPES_LEVURE };
  if (v.typeLevure && !types[v.typeLevure]) types[v.typeLevure] = v.typeLevure;
  const grille = recette?.grille ?? [];

  return html`<form id="form-recette" data-form="recette" novalidate>
    ${general ? html`<p class="banniere banniere-info">${general}</p>` : ''}
    <fieldset>
      <legend>Recette</legend>
      ${texteSaisi('nom', 'Nom', 'Napolitaine 24 h')}
      <div class="deux-colonnes">
        ${texteSaisi('style', 'Style', 'Napolitaine')}
        ${texteSaisi('farine', 'Farine', 'Caputo Cuoco')}
      </div>
    </fieldset>
    <fieldset>
      <legend>Pâte, comme dans Pizza App</legend>
      <div class="deux-colonnes">
        ${nombreSaisi('boules', 'N. boules', { mode: 'numeric' })}
        ${nombreSaisi('poidsBoule', 'Poids boule', { unite: 'g' })}
        ${nombreSaisi('hydratation', 'Eau', { unite: '%' })}
        ${nombreSaisi('sel', 'Sel', { unite: '%' })}
      </div>
    </fieldset>
    <fieldset>
      <legend>Levure</legend>
      <label class="champ">
        <span class="libelle">Type</span>
        <select name="typeLevure">${Object.entries(types).map(
          ([code, libelle]) => html`<option value="${code}" ${code === v.typeLevure ? brut('selected') : ''}>${libelle}</option>`,
        )}</select>
      </label>
      <div class="deux-colonnes">
        ${nombreSaisi('levureGrammes', 'Dose', { unite: 'g' })}
        ${nombreSaisi('ta', 'TA', { unite: '°C' })}
      </div>
      <p class="aide">Dose donnée par Pizza App pour ce nombre de boules, à la température ambiante (TA) indiquée. Laisser vide si elle n’est pas encore connue.</p>
      ${grille.length > 1
        ? html`<p class="aide">Cette recette a une grille de ${pluriel(grille.length, 'température')} (${grille.map((g) => nombre(g.temp, 1)).join(', ')} °C) : la dose saisie complète le relevé à la TA indiquée.</p>`
        : ''}
    </fieldset>
    <fieldset>
      <legend>Fermentation</legend>
      <div class="deux-colonnes">
        ${nombreSaisi('pointage', 'Levage à TA', { unite: 'h' })}
        ${nombreSaisi('froidHeures', 'Levage à CT', { unite: 'h' })}
        ${nombreSaisi('froidMin', 'CT (frigo)', { unite: '°C' })}
        ${nombreSaisi('froidMax', 'CT maxi', { unite: '°C' })}
      </div>
      <p class="aide">Levage à TA : durée du pointage, avant le boulage. Laisser vide si la grille de la recette la donne. CT maxi : seulement pour une plage (4 à 5 °C).</p>
    </fieldset>
    <label class="champ">
      <span class="libelle">Notes</span>
      <textarea name="notes" rows="4">${v.notes ?? ''}</textarea>
    </label>
  </form>`;
}

/* ================================================================== */
/* Réglages                                                            */
/* ================================================================== */

export function ecranReglages(etat) {
  const { reglages, meta, recettes } = etat.donnees;
  const themes = [
    ['auto', 'Auto'],
    ['clair', 'Clair'],
    ['sombre', 'Sombre'],
  ];
  return html`
    <section class="bloc">
      <h3>Apparence</h3>
      <div class="segments" role="radiogroup" aria-label="Thème">
        ${themes.map(
          ([valeur, libelle]) => html`<label><input type="radio" name="theme" value="${valeur}" data-reglage="theme" ${coche(reglages.theme === valeur)}><span>${libelle}</span></label>`,
        )}
      </div>
      <p class="aide">Auto suit le réglage clair ou sombre de l’iPhone.</p>
    </section>
    <section class="bloc">
      <h3>Sauvegarde</h3>
      <p>Les recettes sont enregistrées sur ce téléphone uniquement. Après chaque changement de recette, exporter une sauvegarde dans Fichiers.</p>
      <p class="aide">Dernière sauvegarde : ${meta.derniereSauvegarde ? dateLisible(meta.derniereSauvegarde) : 'jamais'}</p>
      <div class="pile-boutons">
        <button type="button" class="btn btn-large" data-action="exporter">${ICONES.exporter}Exporter une sauvegarde</button>
        <button type="button" class="btn btn-large" data-action="restaurer">${ICONES.restaurer}Restaurer une sauvegarde</button>
      </div>
    </section>
    <section class="bloc">
      <h3>À propos</h3>
      <p>Pizzeria Ensen · ${pluriel(recettes.length, 'recette')}</p>
      <p class="aide">Version <span id="version">${etat.version ?? '…'}</span> · stockage ${etat.persistant ? 'persistant' : 'standard'}</p>
    </section>`;
}
