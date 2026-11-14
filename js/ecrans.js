// Écrans de l'appli : chaque fonction renvoie le HTML d'une page (gabarits sûrs).
// Aucune action ici : les boutons portent des data-action, traités par app.js.

import { dosesRecette, lireGrille, releveDeReference } from './calculs.js';
import { aUnResultat, CONSTATS, instantane, libelleConstat, rappelRecette, resultatModifie } from './carnet.js';
import { calculerFournee, grammesLevure, levureDeLaGrille, plageGrille } from './fournee.js';
import {
  brut,
  degres,
  duree,
  dureeCompacte,
  grammes,
  html,
  nombre,
  plage,
  plageDuree,
  plageDureeCompacte,
  pluriel,
  pourcent,
} from './outils.js';
import { recetteDuMemeNom, TYPES_LEVURE } from './recettes.js';
import { COLLINE, ICONES, ILLUSTRATIONS } from './ui.js';

const coche = (vrai) => (vrai ? brut('checked') : '');
const invalide = (message) => (message ? brut('aria-invalid="true"') : '');
const libelleLevure = (r) => r.typeLevure || 'Levure';
const dateLisible = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/* ================================================================== */
/* En-têtes et barre d'actions                                         */
/* ================================================================== */

/** Grand titre façon iOS, sous-titre discret, boutons ronds éventuels à droite (écrans des onglets). */
export const enteteGrand = (titre, sousTitre = '', actions = null) => html`<div class="entete-grand">
  <div>
    <h1>${titre}</h1>
    ${sousTitre ? html`<p class="sous-titre">${sousTitre}</p>` : ''}
  </div>
  ${actions ? html`<div class="actions-rondes">${actions}</div>` : ''}
</div>`;

export const enteteMarque = (devise) =>
  html`<div class="marque">${COLLINE}<h1>Pizzeria Ensen</h1><p class="devise">${devise}</p></div>`;

export const enteteTitre = (titre, retour = null, droite = null) => html`<div class="barre-titre">
  ${retour ? html`<a class="lien-entete gauche" href="${retour}">${ICONES.retour}<span>Retour</span></a>` : html`<span class="gauche"></span>`}
  <h1>${titre}</h1>
  ${droite ?? html`<span class="droite"></span>`}
</div>`;

/** En haut à droite de la fiche d'une fournée du carnet : actif seulement s'il y a des changements. */
export const boutonEnregistrer = (modifie) => html`<button type="button" class="action-entete droite" id="enregistrer-resultat" data-action="enregistrer-resultat" ${modifie ? '' : brut('disabled')}>
  ${ICONES.disquette}<span>Enregistrer</span>
</button>`;

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
  if (r.pointage != null) morceaux.push(`pointage ${duree(r.pointage)}`);
  if (r.froid.heures != null) morceaux.push(`${duree(r.froid.heures)} au frigo`);
  if (r.grille.length > 1) morceaux.push(`grille ${plage([r.grille[0].temp, r.grille.at(-1).temp], '°C')}`);
  const releve = releveDeReference(r);
  morceaux.push(releve ? `${libelleLevure(r)} à ${degres(releve.temp)}` : `${libelleLevure(r)} à compléter`);
  return morceaux.join(' · ');
}

/* ================================================================== */
/* Fournée : les variables du jour, puis le récap                      */
/* ================================================================== */

/** Grammes de levure du champ de la fournée : la dose saisie, sinon celle proposée par la grille. */
export function texteLevure(recette, fournee) {
  const pct = fournee.levurePct ?? levureDeLaGrille(recette, fournee.tempPiece)?.pct ?? null;
  const g = grammesLevure(recette, fournee.boules, pct);
  return g == null ? '' : nombre(g, 2, 2);
}

/** Sous le champ de la levure : d'où vient la dose. */
export function aideLevure(recette, fournee, erreur = null) {
  if (erreur) return html`<p class="erreur">${erreur}</p>`;
  const proposee = levureDeLaGrille(recette, fournee.tempPiece);
  if (fournee.levurePct != null) {
    return html`<p class="aide">Dose saisie pour cette fournée (${pourcent(fournee.levurePct, 3)} de la farine) : la recette n’est pas modifiée.</p>
      ${proposee
        ? html`<button type="button" class="lien" data-action="levure-grille">Reprendre la dose de la grille : ${grammes(grammesLevure(recette, fournee.boules, proposee.pct), 2)}</button>`
        : ''}`;
  }
  if (fournee.tempPiece == null) return html`<p class="aide">Saisir d’abord la température de la pièce.</p>`;
  if (!proposee) {
    return html`<p class="aide alerte">À saisir : la grille de la recette n’a pas de dose pour ${degres(fournee.tempPiece)}. Prendre celle de Pizza App pour ${pluriel(fournee.boules, 'boule')}.</p>`;
  }
  return html`<p class="aide">${proposee.calculee ? '≈ Calculée entre deux températures de la grille' : `Dose de la grille pour ${degres(fournee.tempPiece)}`} (${pourcent(proposee.pct, 3)} de la farine).</p>`;
}

/** Sous la température de la pièce : alerte si elle sort de la grille de la recette. */
export function aideTemperature(recette, fournee, erreur = null) {
  if (erreur) return html`<p class="erreur">${erreur}</p>`;
  const bornes = plageGrille(recette);
  const t = fournee.tempPiece;
  if (t == null || !bornes || bornes[0] === bornes[1] || (t >= bornes[0] && t <= bornes[1])) return '';
  return html`<p class="aide alerte">Hors de la grille de la recette (${plage(bornes, '°C')}) : durées et température de l’eau seront indicatives.</p>`;
}

/** Variables de la fournée telles qu'affichées : la recette choisie et ses boules par défaut. */
export function variablesFournee(etat) {
  const { recettes, fournee } = etat.donnees;
  const recette = recettes.find((r) => r.id === fournee.recetteId) ?? recettes[0] ?? null;
  return { recette, variables: { ...fournee, boules: fournee.boules ?? recette?.boules ?? 1 } };
}

export function ecranFournee(etat, erreurs = {}) {
  const { recettes } = etat.donnees;
  if (!recettes.length) {
    return html`<section class="vide">
      <p>Aucune recette enregistrée.</p>
      <div class="pile-boutons">
        <a class="btn btn-primaire btn-geant" href="#/importer">${ICONES.coller}Importer depuis Pizza App</a>
        <a class="btn btn-geant" href="#/nouvelle">${ICONES.crayon}Saisir une recette</a>
      </div>
    </section>`;
  }
  const { recette, variables: f } = variablesFournee(etat);
  return html`
    <h2 class="titre-section">Recette</h2>
    <div class="choix-recettes" role="radiogroup" aria-label="Recette">
      ${recettes.map(
        (r) => html`<label class="carte carte-choix">
          <input type="radio" name="recette" value="${r.id}" data-champ="recette" ${coche(r.id === recette.id)}>
          <span class="carte-tete">
            <span class="carte-texte">
              <strong class="carte-nom">${r.nom}</strong>
              <small class="carte-sous">${[r.style, r.farine].filter(Boolean).join(' · ') || 'Recette'}</small>
            </span>
            <span class="carte-illus">${ILLUSTRATIONS.paton}<span class="coche-ronde">${ICONES.coche}</span></span>
          </span>
          <span class="carte-pied">${chiffresRecette(r)}</span>
        </label>`,
      )}
    </div>
    ${rappelFournees(etat, recette)}
    <h2 class="titre-section">Nombre de boules</h2>
    <div class="compteur-boules">
      <button type="button" class="btn-compteur" data-action="moins" aria-label="Une boule de moins">${ICONES.moins}</button>
      <input id="boules" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" value="${f.boules}" data-champ="boules" aria-label="Nombre de boules" autocomplete="off" enterkeyhint="done">
      <button type="button" class="btn-compteur" data-action="plus" aria-label="Une boule de plus">${ICONES.plus}</button>
    </div>
    <h2 class="titre-section">Variables du jour</h2>
    <div class="variables-duo">
      <label class="champ-carte">
        <span class="libelle-carte">Pièce</span>
        <span class="valeur">
          <input id="temp-piece" type="text" inputmode="decimal" value="${f.tempPiece == null ? '' : nombre(f.tempPiece, 1)}" data-champ="temp-piece" aria-label="Température de la pièce" placeholder="—" autocomplete="off" enterkeyhint="done" ${invalide(erreurs.tempPiece)}>
          <span class="unite">°C</span>
        </span>
      </label>
      <label class="champ-carte">
        <span class="libelle-carte">Levure ${libelleLevure(recette)}</span>
        <span class="valeur">
          <input id="levure" type="text" inputmode="decimal" value="${texteLevure(recette, f)}" data-champ="levure" aria-label="Dose de levure en grammes" placeholder="—" autocomplete="off" enterkeyhint="done" ${invalide(erreurs.levure)}>
          <span class="unite">g</span>
        </span>
      </label>
    </div>
    <div id="aide-temp">${aideTemperature(recette, f, erreurs.tempPiece)}</div>
    <div id="aide-levure">${aideLevure(recette, f, erreurs.levure)}</div>
    <div id="doses-fournee">${dosesFournee(recette, f)}</div>
    <button type="button" class="btn btn-primaire btn-geant btn-large" data-action="valider-fournee">Valider</button>
    <p class="aide centre">Valider ouvre le récap : température de l’eau, pointage, frigo et remise à température.</p>`;
}

/** Chiffres clés d'une recette : nombre en gras, unité en gris, séparés par des points. */
function chiffresRecette(r) {
  const chiffres = [
    [r.boules, r.boules >= 2 ? 'pâtons' : 'pâton'],
    [nombre(r.poidsBoule), 'g'],
    [nombre(r.hydratation, 1), '% eau'],
  ];
  if (r.froid.heures != null) chiffres.push([nombre(r.froid.heures, 1), 'h frigo']);
  return chiffres.map(
    ([valeur, unite], i) => html`${i ? html`<span class="point" aria-hidden="true">·</span>` : ''}<span class="chiffre"><b>${valeur}</b> ${unite}</span>`,
  );
}

/** Valeur lue dans la grille, avec « ≈ » si calculée et « plus de / moins de » au-delà de la grille. */
function texteLu(lu, format) {
  const texte = format(lu.valeur);
  if (lu.limite) return `${lu.limite === 'plus' ? 'plus de' : 'moins de'} ${texte}`;
  return lu.calculee ? `≈ ${texte}` : texte;
}

const formatDuree = (h) => (Array.isArray(h) ? plageDuree(h.map(cinqMinutes)) : duree(cinqMinutes(h)));

/**
 * Les doses d'une fournée (farine, eau en deux versements, sel, levure), à partir
 * de sa photo figée : sur l'écran Fournée en direct, dans le récap et dans le carnet.
 */
function carteDoses(s, { titre = 'Doses' } = {}) {
  const r = s.recette;
  const d = s.doses;
  const origineLevure = {
    saisie: 'dose saisie pour cette fournée',
    grille: `dose de la grille pour ${s.tempPiece == null ? '' : degres(s.tempPiece)}`,
    calculee: 'calculée entre deux températures de la grille',
  }[s.levure?.source] ?? '';
  const ligne = (nom, detail, valeur, classe = '') => html`<li class="dose ${classe}">
    <span class="dose-nom">${nom}${detail ? html`<small>${detail}</small>` : ''}</span>
    <span class="dose-valeur">${valeur}</span>
  </li>`;
  return html`<section class="carte carte-doses recap-doses">
    <div class="carte-tete">
      <span class="carte-texte">
        <strong class="carte-nom">${titre}</strong>
        <small class="carte-sous"><b>${grammes(d.pate)}</b> de pâte · ${pluriel(s.boules, 'boule')} de ${grammes(r.poidsBoule)}</small>
      </span>
    </div>
    <ul class="doses carte-pied">
      ${ligne('Farine', r.farine, grammes(d.farine))}
      ${ligne('Eau', `${pourcent(r.hydratation)} de la farine`, grammes(s.eau.total))}
      <li class="versement"><span>1<sup>er</sup> versement · ${pourcent(s.eau.pctPremier, 1)}</span><strong>${grammes(s.eau.premier)}</strong></li>
      <li class="versement"><span>Bassinage</span><strong>${grammes(s.eau.bassinage)}</strong></li>
      ${ligne('Sel', pourcent(r.sel), grammes(d.sel))}
      ${d.levure == null
        ? ligne(libelleLevure(r), 'à compléter', '—', 'dose-manquante')
        : ligne(libelleLevure(r), `${pourcent(s.levure.pct, 3)} · ${origineLevure}`, grammes(d.levure, 2))}
    </ul>
  </section>`;
}

/** Doses de la fournée en cours, recalculées à chaque changement de variable. */
export function dosesFournee(recette, variables) {
  return carteDoses(instantane(recette, calculerFournee(recette, variables)), { titre: 'Doses de la fournée' });
}

/**
 * Récap d'une fournée à partir de sa photo figée (voir carnet.js) : sert pour la
 * fournée du jour comme pour une fournée du carnet.
 */
function vueRecap(s) {
  const r = s.recette;
  const [p1, p2] = r.remiseDefaut;
  const notePointage = !s.pointage
    ? 'non précisé dans la recette'
    : s.pointage.source === 'recette'
      ? 'durée de la recette'
      : s.pointage.calculee && !s.pointage.limite
        ? 'calculé entre deux températures de la grille'
        : 'selon la grille de la recette';
  const noteRemise =
    s.remise?.source === 'defaut'
      ? `par défaut : ${duree(p1.heures)} à ${degres(p1.temp)}, ${duree(p2.heures)} à ${degres(p2.temp)}`
      : 'selon la grille de la recette';

  return html`
    <div class="fiche-tete">
      <p class="aide">${pluriel(s.boules, 'boule')} de ${grammes(r.poidsBoule)} · pièce à ${degres(s.tempPiece)}</p>
      <h2 class="fiche-nom">${r.nom}</h2>
    </div>
    ${s.horsGrille
      ? html`<p class="banniere banniere-alerte">${ICONES.alerte}<span>La pièce est hors de la grille de la recette (${plage(s.horsGrille, '°C')}) : durées et température de l’eau sont indicatives.</span></p>`
      : ''}
    ${carteDoses(s)}
    <section class="bloc">
      <h3>Pétrissage</h3>
      <dl class="infos">
        <dt>Eau à</dt><dd>${s.tempEau ? texteLu(s.tempEau, (t) => degres(demiDegre(t))) : '—'}${s.tempEau ? '' : html`<small>la recette n’indique pas de température d’eau</small>`}</dd>
        <dt>Pâte visée</dt><dd>${plage(s.tempPate, '°C')}<small>en fin de pétrissage</small></dd>
      </dl>
    </section>
    <section class="bloc">
      <h3>Fermentation</h3>
      <dl class="infos">
        <dt>Pointage en masse</dt><dd>${s.pointage ? texteLu(s.pointage, formatDuree) : '—'}<small>${notePointage}</small></dd>
        <dt>Frigo</dt><dd>${s.froid.heures != null ? duree(s.froid.heures) : '—'}${s.froid.temp ? html`<small>à ${plage(s.froid.temp, '°C')}</small>` : ''}</dd>
        <dt>Remise à température</dt><dd>${s.remise?.valeur != null ? texteLu(s.remise, formatDuree) : '—'}<small>${noteRemise}</small></dd>
      </dl>
      <p class="aide">Repère de remise à température : pâton gonflé, souple, qui revient lentement au doigt.</p>
    </section>`;
}

export function ecranRecap(etat) {
  const { recette, variables } = variablesFournee(etat);
  return html`${vueRecap(instantane(recette, calculerFournee(recette, variables)))}
    <div class="pile-boutons actions-bas">
      <button type="button" class="btn btn-primaire btn-geant btn-large" data-action="ajouter-carnet">${ICONES.carnet}Ajouter au carnet</button>
      <a class="btn btn-large" href="#/">${ICONES.retour}Modifier les variables</a>
    </div>
    <p class="aide centre">Le carnet garde ce récap ; le résultat s’y note après la cuisson.</p>`;
}

/* ================================================================== */
/* Carnet des fournées                                                 */
/* ================================================================== */

/** « jeudi 13 novembre » (avec l'année si ce n'est pas celle en cours). */
export function dateFournee(iso) {
  const date = new Date(iso);
  const autreAnnee = date.getFullYear() !== new Date().getFullYear();
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', ...(autreAnnee ? { year: 'numeric' } : {}) });
}
const dateCourte = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const etoilesTexte = (note) => '★'.repeat(note) + '☆'.repeat(5 - note);

/** « ★★★★☆ · Facile à étaler · « Très bonne pâte » ». */
function resumeResultat(e) {
  const morceaux = [];
  if (e.resultat.note) morceaux.push(etoilesTexte(e.resultat.note));
  morceaux.push(...e.resultat.constats.map(libelleConstat));
  const commentaire = e.resultat.commentaire.trim();
  if (commentaire) morceaux.push(`« ${commentaire.length > 90 ? `${commentaire.slice(0, 90)}…` : commentaire} »`);
  return morceaux.join(' · ');
}

/** Sur l'écran Fournée : ce qu'a donné la dernière fournée de cette recette. */
function rappelFournees(etat, recette) {
  const { derniere, dernierResultat } = rappelRecette(etat.donnees.fournees, recette.id);
  if (!derniere) return '';
  return html`<div class="rappels">
    ${dernierResultat
      ? html`<a class="rappel" href="#/carnet/${dernierResultat.id}">
          <span class="rappel-titre">Dernier résultat · ${dateCourte(dernierResultat.date)} · pièce à ${degres(dernierResultat.tempPiece)}</span>
          <span>${resumeResultat(dernierResultat)}</span>
        </a>`
      : ''}
    ${derniere !== dernierResultat
      ? html`<a class="rappel rappel-attente" href="#/carnet/${derniere.id}">La fournée du ${dateCourte(derniere.date)} attend son résultat.</a>`
      : ''}
  </div>`;
}

export function ecranCarnet(etat) {
  const { fournees } = etat.donnees;
  if (!fournees.length) {
    return html`<section class="vide">
      <p>Aucune fournée dans le carnet.</p>
      <p class="aide">Sur le récap d’une fournée, « Ajouter au carnet » l’enregistre ici. Après la cuisson, y noter le résultat aide à ajuster les fournées suivantes.</p>
    </section>`;
  }
  return html`<ul class="liste-cartes">${fournees.map(
    (e) => html`<li><a class="carte" href="#/carnet/${e.id}">
      <span class="carte-haut">
        <strong class="carte-nom">${dateFournee(e.date)}</strong>
        ${aUnResultat(e) ? '' : html`<span class="pastille">À compléter</span>`}
      </span>
      <span class="carte-ligne">${e.recette.nom}</span>
      <span class="carte-ligne">${pluriel(e.boules, 'boule')} · pièce à ${degres(e.tempPiece)}</span>
      ${aUnResultat(e) ? html`<span class="carte-ligne resultat-court">${resumeResultat(e)}</span>` : ''}
    </a></li>`,
  )}</ul>`;
}

/** Sous le résultat : enregistré, ou des changements qui attendent « Enregistrer ». */
export function etatResultat(entree, brouillon) {
  if (resultatModifie(entree, brouillon)) {
    return html`<p class="aide alerte">Modifications non enregistrées : toucher « Enregistrer » en haut à droite pour les garder.</p>`;
  }
  return aUnResultat(entree)
    ? html`<p class="aide">Résultat enregistré.</p>`
    : html`<p class="aide">Noter le résultat, puis toucher « Enregistrer » en haut à droite.</p>`;
}

/** Une fournée du carnet : le résultat à compléter (copie de travail), puis son récap figé. */
export function ecranEntree(etat, e, brouillon) {
  const r = brouillon;
  return html`
    <section class="bloc resultat-fournee">
      <h3>Résultat · ${dateFournee(e.date)}</h3>
      <div class="etoiles" role="group" aria-label="Note sur 5">
        ${[1, 2, 3, 4, 5].map(
          (i) => html`<button type="button" class="${i <= (r.note ?? 0) ? 'pleine' : ''}" data-action="noter" data-id="${e.id}" data-note="${i}" aria-label="${i} sur 5" aria-pressed="${String(i === r.note)}">★</button>`,
        )}
      </div>
      <div class="constats">
        ${CONSTATS.map(
          ([code, libelle]) => html`<label class="constat">
            <input type="checkbox" value="${code}" data-champ="constat" data-id="${e.id}" ${coche(r.constats.includes(code))}>
            <span>${libelle}</span>
          </label>`,
        )}
      </div>
      <label class="champ">
        <span class="libelle">Commentaire</span>
        <textarea rows="5" data-champ="commentaire" data-id="${e.id}" placeholder="Pâte facile à étaler ? Cuisson ? À changer la prochaine fois ?">${r.commentaire}</textarea>
      </label>
      <div id="etat-resultat">${etatResultat(e, brouillon)}</div>
    </section>
    ${vueRecap(e)}
    <button type="button" class="btn btn-danger btn-large actions-bas" data-action="supprimer-entree" data-id="${e.id}">Supprimer cette fournée</button>`;
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

// Valeurs calculées entre deux températures : arrondies à ce qui sert en cuisine.
const cinqMinutes = (heures) => Math.round(heures * 12) / 12;
const demiDegre = (temp) => Math.round(temp * 2) / 2;

function blocGrille(r) {
  // [colonne, titre, mise en forme d'une valeur relevée, mise en forme d'une valeur calculée]
  const colonnes = [
    ['levure', libelleLevure(r), (v) => pourcent(v, 3), (v) => pourcent(v, 3)],
    ['tempEau', 'Eau', degres, (v) => degres(demiDegre(v))],
    ['pointage', 'Pointage', dureeCompacte, (v) => dureeCompacte(cinqMinutes(v))],
    ['remise', 'Remise', plageDureeCompacte, (v) => plageDureeCompacte(v.map(cinqMinutes))],
  ].filter(([nom], i) => i === 0 || r.grille.some((g) => g[nom] != null));

  let calculees = false;
  let manquantes = false;
  const lignes = r.grille.map((g) => {
    const lu = lireGrille(r.grille, g.temp);
    const cellules = colonnes.map(([nom, , releve, calcule]) => {
      const { valeur, calculee } = lu[nom];
      if (valeur == null) {
        if (nom === 'levure') manquantes = true;
        return html`<td>${nom === 'levure' ? '—' : ''}</td>`;
      }
      if (!calculee) return html`<td>${releve(valeur)}</td>`;
      calculees = true;
      return html`<td class="calcule">≈ ${calcule(valeur)}</td>`;
    });
    return html`<tr><th scope="row">${degres(g.temp)}</th>${cellules}</tr>`;
  });

  const legende = [
    `${libelleLevure(r)} en % de la farine`,
    calculees && '≈ : calculé entre les deux températures voisines',
    manquantes && '— : dose à compléter',
  ].filter(Boolean);
  return html`<section class="bloc">
    <h3>Grille par température de la pièce</h3>
    <div class="defilement">
      <table class="grille-temp">
        <thead><tr><th scope="col">Pièce</th>${colonnes.map(([, titre]) => html`<th scope="col">${titre}</th>`)}</tr></thead>
        <tbody>${lignes}</tbody>
      </table>
    </div>
    <p class="aide">${legende.join(' ; ')}.${r.grille.some((g) => g.tempEau != null) ? ' Eau : température de l’eau du pétrissage.' : ''}</p>
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
      ${r.pointage != null ? html`<dt>Pointage</dt><dd>${duree(r.pointage)}</dd>` : ''}
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
/* Formulaire : nouvelle recette ou modification du modèle             */
/* ================================================================== */

export function ecranFormulaire(etat, recette = null) {
  const { valeurs: v, erreurs: e, general } = etat.formulaire;
  const nombreSaisi = (nom, libelle, { mode = 'decimal', unite = '', valeur = v[nom] } = {}) => html`
    <label class="champ">
      <span class="libelle">${libelle}</span>
      <span class="champ-unite">
        <input type="text" name="${nom}" value="${valeur ?? ''}" inputmode="${mode}" autocomplete="off" ${invalide(e[nom])}>
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
  const boules = v.boules || '…';

  // Une température de la grille : la pièce, la dose de Pizza App, et ce qui en dépend.
  const ligneGrille = (ligne, i) => {
    const champ = (colonne, libelle, unite) => nombreSaisi(`grille.${i}.${colonne}`, libelle, { unite, valeur: ligne[colonne] });
    return html`<div class="ligne-grille">
      <div class="ligne-grille-tete">
        <strong>${ligne.temp ? `Pièce à ${ligne.temp} °C` : 'Nouvelle température'}</strong>
        <button type="button" class="btn-petit btn-discret" data-action="supprimer-ligne" data-index="${i}">Retirer</button>
      </div>
      <div class="deux-colonnes">
        ${champ('temp', 'Pièce', '°C')}
        ${champ('levure', 'Levure', 'g')}
        ${champ('tempEau', 'Eau', '°C')}
        ${champ('pointage', 'Pointage', 'h')}
        ${champ('remiseMin', 'Remise de', 'h')}
        ${champ('remiseMax', 'à', 'h')}
      </div>
      <input type="hidden" name="grille.${i}.levurePct" value="${ligne.levurePct}">
      <input type="hidden" name="grille.${i}.levureG0" value="${ligne.levureG0}">
    </div>`;
  };

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
        ${nombreSaisi('premierVersement', '1er versement d’eau', { unite: '%' })}
      </div>
      <p class="aide">1er versement : part de l’eau versée au début du pétrissage ; le reste est ajouté en bassinage.</p>
    </fieldset>
    <fieldset>
      <legend>Levure et grille par température</legend>
      <label class="champ">
        <span class="libelle">Type de levure</span>
        <select name="typeLevure">${Object.entries(types).map(
          ([code, libelle]) => html`<option value="${code}" ${code === v.typeLevure ? brut('selected') : ''}>${libelle}</option>`,
        )}</select>
      </label>
      <p class="aide">Une ligne par température de la pièce. Levure : dose donnée par Pizza App pour ${boules} boules à cette température (« LBF » et « TA »). Eau, pointage et remise : facultatifs.</p>
      ${e.grille ? html`<p class="erreur">${e.grille}</p>` : ''}
      <div class="grille-edition">${v.grille.map(ligneGrille)}</div>
      <button type="button" class="btn btn-large" data-action="ajouter-ligne">${ICONES.plus}Ajouter une température</button>
    </fieldset>
    <fieldset>
      <legend>Fermentation</legend>
      <div class="deux-colonnes">
        ${nombreSaisi('pointage', 'Pointage', { unite: 'h' })}
        ${nombreSaisi('froidHeures', 'Frigo', { unite: 'h' })}
      </div>
      <p class="aide">Pointage : durée fixe (« Levage à TA » dans Pizza App), utilisée quand la grille n’en donne pas. Frigo : « Levage à CT ».</p>
      <input type="hidden" name="froidMin" value="${v.froidMin ?? ''}">
      <input type="hidden" name="froidMax" value="${v.froidMax ?? ''}">
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
  const { reglages, meta, recettes, fournees } = etat.donnees;
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
      <p>Les recettes et le carnet sont enregistrés sur ce téléphone uniquement. Exporter régulièrement une sauvegarde dans Fichiers.</p>
      <p class="aide">Dernière sauvegarde : ${meta.derniereSauvegarde ? dateLisible(meta.derniereSauvegarde) : 'jamais'}</p>
      <div class="pile-boutons">
        <button type="button" class="btn btn-large" data-action="exporter">${ICONES.exporter}Exporter une sauvegarde</button>
        <button type="button" class="btn btn-large" data-action="restaurer">${ICONES.restaurer}Restaurer une sauvegarde</button>
      </div>
    </section>
    <section class="bloc">
      <h3>À propos</h3>
      <p>Pizzeria Ensen · ${pluriel(recettes.length, 'recette')} · ${pluriel(fournees.length, 'fournée')} au carnet</p>
      <p class="aide">Version <span id="version">${etat.version ?? '…'}</span> · stockage ${etat.persistant ? 'persistant' : 'standard'}</p>
    </section>`;
}
