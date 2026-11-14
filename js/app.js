// Pizzeria Ensen : démarrage, état de l'appli, navigation et actions.
// Les écrans (ecrans.js) ne font qu'afficher ; tout ce qui modifie les données passe ici.

import * as stockage from './db.js';
import {
  creerSauvegarde,
  donneesInitiales,
  donneesVides,
  lireSauvegarde,
  nomFichierSauvegarde,
  normaliserDonnees,
} from './donnees.js';
import {
  actionsRecettes,
  aideLevure,
  aideTemperature,
  boutonEnregistrer,
  boutonsFormulaire,
  dosesFournee,
  ecranCarnet,
  ecranEntree,
  ecranFormulaire,
  ecranFournee,
  ecranImport,
  ecranRecap,
  ecranRecette,
  ecranRecettes,
  ecranReglages,
  enteteGrand,
  enteteTitre,
  etatResultat,
  texteLevure,
  variablesFournee,
  zoneDoublon,
} from './ecrans.js';
import { basculerConstat, brouillonResultat, enregistrerResultat, nouvelleEntree, resultatModifie } from './carnet.js';
import { levureSaisie, lireVariable, verifierVariables } from './fournee.js';
import { ErreurImport, lireRecettes } from './import.js';
import { grammes, html, pluriel } from './outils.js';
import {
  champsDepuisEntrees,
  LIGNE_VIDE,
  nomLibre,
  recetteDepuisFormulaire,
  recetteDuMemeNom,
  valeursEnTexte,
  valeursFormulaire,
} from './recettes.js';
import { confirmer, fermerFeuille, ICONES, ouvrirFeuille, toast } from './ui.js';

const $ = (selecteur) => document.querySelector(selecteur);
const CLE_THEME = 'pizzeria-theme'; // distincte de celle de Brasserie Ensen (même domaine github.io)

const etat = {
  donnees: donneesVides(),
  lectureImpossible: false,
  persistant: false,
  version: null,
  peutColler: Boolean(navigator.clipboard?.readText),
  import: { texte: '', resultats: null, erreur: null },
  formulaire: null, // { cle, recetteId, valeurs, erreurs, general, origine }
  erreursFournee: {}, // { tempPiece, levure } après un « Valider » refusé
  brouillon: null, // résultat en cours de saisie d'une fournée du carnet (perdu sans « Enregistrer »)
  routeAffichee: null,
};

/* ================================================================== */
/* Enregistrement local                                                */
/* ================================================================== */

let fileEcriture = Promise.resolve();
let minuteurSauvegarde = null;

function sauver() {
  clearTimeout(minuteurSauvegarde);
  minuteurSauvegarde = null;
  if (etat.lectureImpossible) {
    toast('Enregistrement bloqué : les données existantes n’ont pas pu être lues.');
    return fileEcriture;
  }
  const copie = JSON.parse(JSON.stringify(etat.donnees));
  fileEcriture = fileEcriture
    .then(() => stockage.ecrire('donnees', copie))
    .catch((erreur) => {
      console.error(erreur);
      toast(`Erreur d’enregistrement : ${erreur.message}`, { duree: 10000 });
    });
  return fileEcriture;
}

/** Pour les changements rapides (boutons + et −) : un seul enregistrement après une courte pause. */
function sauverBientot() {
  clearTimeout(minuteurSauvegarde);
  minuteurSauvegarde = setTimeout(sauver, 400);
}

function appliquerTheme(theme) {
  const choisi = theme === 'clair' || theme === 'sombre' ? theme : null;
  if (choisi) document.documentElement.dataset.theme = choisi;
  else delete document.documentElement.dataset.theme;
  try {
    if (choisi) localStorage.setItem(CLE_THEME, choisi);
    else localStorage.removeItem(CLE_THEME);
  } catch {
    /* stockage indisponible : le thème reste appliqué pour cette ouverture */
  }
}

/* ================================================================== */
/* Navigation                                                          */
/* ================================================================== */

function lireRoute() {
  const morceaux = location.hash.replace(/^#\/?/, '').split('/').map((m) => decodeURIComponent(m));
  const [page = '', id = null, sousPage = null] = morceaux;
  return { page, id, sousPage, cle: `#/${morceaux.join('/')}` };
}

function naviguer(chemin) {
  if (location.hash === chemin) afficher();
  else location.hash = chemin;
}

const trouverRecette = (id) => etat.donnees.recettes.find((r) => r.id === id) ?? null;
const trouverEntree = (id) => etat.donnees.fournees.find((e) => e.id === id) ?? null;
const recetteFournee = () => trouverRecette(etat.donnees.fournee.recetteId) ?? etat.donnees.recettes[0] ?? null;

/** Après un ajout ou une suppression : la fournée pointe toujours vers une recette existante. */
function corrigerFournee() {
  const { fournee } = etat.donnees;
  const recette = recetteFournee();
  fournee.recetteId = recette?.id ?? null;
  if (fournee.boules == null && recette) fournee.boules = recette.boules;
}

function preparerFormulaire(cle, recette) {
  if (etat.formulaire?.cle === cle) return; // déjà ouvert : garde la saisie et les erreurs
  etat.formulaire = { cle, recetteId: recette?.id ?? null, valeurs: valeursFormulaire(recette), erreurs: {}, general: null, origine: null };
}

function afficher() {
  const route = lireRoute();
  const nouvellePage = route.cle !== etat.routeAffichee;
  if (etat.formulaire && etat.formulaire.cle !== route.cle) etat.formulaire = null; // formulaire quitté
  if (etat.brouillon && !(route.page === 'carnet' && route.id === etat.brouillon.id)) etat.brouillon = null; // fiche quittée sans enregistrer

  let entete;
  let contenu;
  let actions = '';
  let onglet = null;
  let collant = true;

  switch (route.page) {
    case '':
      onglet = 'fournee';
      entete = enteteGrand('Fournée', 'Pizzeria Ensen · la pâte du jour');
      collant = false; // grand titre : défile avec l'écran, comme sur iOS
      contenu = ecranFournee(etat, etat.erreursFournee);
      break;
    case 'recap': {
      const { recette, variables } = variablesFournee(etat);
      if (!recette || Object.keys(verifierVariables(recette, variables)).length) return naviguer('#/');
      onglet = 'fournee';
      entete = enteteTitre('Récap de la fournée', '#/');
      contenu = ecranRecap(etat);
      break;
    }
    case 'recettes':
      onglet = 'recettes';
      entete = enteteGrand('Recettes', `${pluriel(etat.donnees.recettes.length, 'recette enregistrée', 'recettes enregistrées')}`, actionsRecettes());
      collant = false; // grand titre : défile avec l'écran, comme sur iOS
      contenu = ecranRecettes(etat);
      break;
    case 'recette': {
      const recette = trouverRecette(route.id);
      if (!recette) return naviguer('#/recettes');
      if (route.sousPage === 'modifier') {
        preparerFormulaire(route.cle, recette);
        entete = enteteTitre('Modifier la recette', `#/recette/${recette.id}`);
        contenu = ecranFormulaire(etat, recette);
        actions = boutonsFormulaire(`#/recette/${recette.id}`);
      } else {
        onglet = 'recettes';
        entete = enteteTitre(recette.nom, '#/recettes', html`<a class="bouton-rond bouton-rond-petit droite" href="#/recette/${recette.id}/modifier" aria-label="Modifier la recette">${ICONES.crayon}</a>`);
        contenu = ecranRecette(etat, recette);
      }
      break;
    }
    case 'nouvelle':
      preparerFormulaire(route.cle, null);
      entete = enteteTitre('Nouvelle recette', '#/recettes');
      contenu = ecranFormulaire(etat);
      actions = boutonsFormulaire('#/recettes');
      break;
    case 'importer':
      onglet = 'recettes';
      entete = enteteTitre('Importer une recette', '#/recettes');
      contenu = ecranImport(etat);
      break;
    case 'carnet': {
      onglet = 'carnet';
      if (!route.id) {
        entete = enteteGrand('Carnet', `${pluriel(etat.donnees.fournees.length, 'fournée', 'fournées')} au carnet`);
        collant = false; // grand titre : défile avec l'écran, comme sur iOS
        contenu = ecranCarnet(etat);
        break;
      }
      const entree = trouverEntree(route.id);
      if (!entree) return naviguer('#/carnet');
      etat.brouillon ??= brouillonResultat(entree);
      entete = enteteTitre(entree.recette.nom, '#/carnet', boutonEnregistrer(resultatModifie(entree, etat.brouillon)));
      contenu = ecranEntree(etat, entree, etat.brouillon);
      break;
    }
    case 'reglages':
      onglet = 'reglages';
      entete = enteteGrand('Réglages', 'Thème, sauvegarde, version');
      collant = false; // grand titre : défile avec l'écran, comme sur iOS
      contenu = ecranReglages(etat);
      break;
    default:
      return naviguer('#/');
  }

  const zoneEntete = $('#entete');
  zoneEntete.innerHTML = String(entete);
  zoneEntete.classList.toggle('collant', collant);
  $('#vue').innerHTML = String(contenu);
  $('#barre-actions').innerHTML = String(actions);

  const avecActions = String(actions).trim() !== '';
  const onglets = $('#onglets');
  onglets.hidden = avecActions;
  $('#bouton-plus').hidden = avecActions;
  document.body.classList.toggle('avec-onglets', !avecActions);
  document.body.classList.toggle('avec-actions', avecActions);
  for (const lien of onglets.querySelectorAll('a')) {
    const actif = lien.dataset.onglet === onglet;
    lien.classList.toggle('actif', actif);
    if (actif) lien.setAttribute('aria-current', 'page');
    else lien.removeAttribute('aria-current');
  }

  if (nouvellePage) {
    // Petite apparition de l'écran (désactivée si l'iPhone demande moins d'animations).
    const vue = $('#vue');
    vue.classList.remove('apparait');
    void vue.offsetWidth;
    vue.classList.add('apparait');
    window.scrollTo(0, 0);
    $('#vue').focus({ preventScroll: true });
  }
  etat.routeAffichee = route.cle;
}

/* ================================================================== */
/* Fournée                                                             */
/* ================================================================== */

/**
 * Met à jour les aides de l'écran Fournée sans redessiner les champs en cours de saisie.
 * remplirLevure : réécrit aussi le champ de la levure (dose saisie ou proposée par la grille).
 */
function rafraichirVariables({ remplirLevure = true } = {}) {
  const { recette, variables } = variablesFournee(etat);
  if (!recette) return;
  etat.erreursFournee = {};
  const champLevure = $('#levure');
  if (champLevure && remplirLevure) champLevure.value = texteLevure(recette, variables);
  for (const champ of document.querySelectorAll('#temp-piece, #levure')) champ.removeAttribute('aria-invalid');
  const zones = {
    '#aide-boules': html`${pluriel(variables.boules, 'boule')} de ${grammes(recette.poidsBoule)}`,
    '#aide-temp': aideTemperature(recette, variables),
    '#aide-levure': aideLevure(recette, variables),
    '#doses-fournee': dosesFournee(recette, variables),
  };
  for (const [selecteur, contenu] of Object.entries(zones)) {
    const zone = $(selecteur);
    if (zone) zone.innerHTML = String(contenu);
  }
}

function changerBoules(valeur, { depuisSaisie = false } = {}) {
  const n = Number(valeur);
  if (!Number.isInteger(n) || n < 1 || n > 99) return; // saisie en cours ou hors limites
  etat.donnees.fournee.boules = n;
  const champ = $('#boules');
  if (champ && !depuisSaisie) champ.value = String(n);
  rafraichirVariables(); // la dose saisie est gardée en pourcentage : ses grammes suivent les boules
  sauverBientot();
}

function changerTemperature(texte) {
  etat.donnees.fournee.tempPiece = lireVariable(texte);
  rafraichirVariables({ remplirLevure: etat.donnees.fournee.levurePct == null });
  sauverBientot();
}

/** Dose tapée dans le champ de la fournée : elle ne vaut que pour cette fournée. */
function changerLevure(texte) {
  const { recette, variables } = variablesFournee(etat);
  const g = lireVariable(texte);
  const pate = variables.boules * recette.poidsBoule;
  etat.donnees.fournee.levurePct = g != null && g > 0 && g < pate / 2 ? levureSaisie(recette, variables.boules, g) : null;
  rafraichirVariables({ remplirLevure: false });
  sauverBientot();
}

function validerFournee() {
  const { recette, variables } = variablesFournee(etat);
  if (!recette) return;
  document.activeElement?.blur();
  const erreurs = verifierVariables(recette, variables);
  if (Object.keys(erreurs).length) {
    etat.erreursFournee = erreurs;
    afficher();
    etat.erreursFournee = {};
    return;
  }
  sauver();
  naviguer('#/recap');
}

/* ================================================================== */
/* Import d'une recette                                                */
/* ================================================================== */

function lireImport() {
  const imp = etat.import;
  imp.resultats = null;
  imp.erreur = null;
  try {
    imp.resultats = lireRecettes(imp.texte).resultats.map((res) => ({ ...res, nom: res.recette.nom, choix: 'remplacer' }));
  } catch (erreur) {
    if (!(erreur instanceof ErreurImport)) throw erreur;
    imp.erreur = { message: erreur.message, valeurs: erreur.valeurs };
  }
  document.activeElement?.blur(); // referme le clavier pour laisser voir le résultat
  afficher();
  $('#resultat-import')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function coller() {
  let texte;
  try {
    texte = await navigator.clipboard.readText();
  } catch {
    toast('Collage refusé : appuyer longuement dans la zone de texte, puis « Coller ».', { duree: 7000 });
    return;
  }
  if (!texte.trim()) {
    toast('Rien à coller : copier d’abord le texte de la recette dans Pizza App.');
    return;
  }
  etat.import.texte = texte;
  lireImport();
}

function enregistrerImport() {
  const { resultats } = etat.import;
  if (!resultats?.length) return;
  const avant = { recettes: [...etat.donnees.recettes], fournee: { ...etat.donnees.fournee } };
  const enregistrees = [];
  let remplacees = 0;

  for (const res of resultats) {
    const nom = res.nom.trim() || res.recette.nom;
    const existante = recetteDuMemeNom(etat.donnees.recettes, nom);
    const recette = { ...res.recette, nom };
    if (existante && res.choix === 'remplacer') {
      Object.assign(recette, { id: existante.id, creeLe: existante.creeLe });
      etat.donnees.recettes[etat.donnees.recettes.indexOf(existante)] = recette;
      remplacees += 1;
    } else {
      if (existante) recette.nom = nomLibre(etat.donnees.recettes, nom);
      etat.donnees.recettes.push(recette);
    }
    enregistrees.push(recette);
  }

  corrigerFournee();
  sauver();
  etat.import = { texte: '', resultats: null, erreur: null };
  naviguer(enregistrees.length === 1 ? `#/recette/${enregistrees[0].id}` : '#/recettes');
  let message = remplacees ? 'Recette remplacée.' : 'Recette enregistrée.';
  if (enregistrees.length > 1) message = `${pluriel(enregistrees.length, 'recette')} enregistrées.`;
  toast(message, {
    action: () => {
      etat.donnees.recettes = avant.recettes;
      etat.donnees.fournee = avant.fournee;
      corrigerFournee();
      sauver();
      naviguer('#/recettes');
    },
  });
}

/** Import refusé : ouvre le formulaire avec ce qui a pu être lu. */
function saisieDepuisImport() {
  const { erreur, texte } = etat.import;
  if (!erreur?.valeurs) return;
  const valeurs = valeursEnTexte(erreur.valeurs);
  etat.formulaire = {
    cle: '#/nouvelle',
    recetteId: null,
    valeurs,
    erreurs: recetteDepuisFormulaire(valeurs).erreurs,
    general: 'Valeurs lues dans le texte de Pizza App : compléter ou corriger les champs en rouge, puis enregistrer.',
    origine: { source: 'pizzapp', texteImporte: texte.trim() },
  };
  naviguer('#/nouvelle');
}

/* ================================================================== */
/* Formulaire et suppression                                           */
/* ================================================================== */

/** Fiche d'une fournée du carnet : bouton « Enregistrer » allumé seulement s'il y a des changements. */
function majEtatResultat() {
  const b = etat.brouillon;
  const entree = b && trouverEntree(b.id);
  if (!entree) return;
  const bouton = $('#enregistrer-resultat');
  if (bouton) bouton.disabled = !resultatModifie(entree, b);
  const zone = $('#etat-resultat');
  if (zone) zone.innerHTML = String(etatResultat(entree, b));
}

/** Garde ce qui est tapé dans le formulaire avant de le redessiner (ligne de grille ajoutée ou retirée). */
function lireFormulaireOuvert() {
  const form = $('#form-recette');
  if (form && etat.formulaire) {
    etat.formulaire.valeurs = { ...etat.formulaire.valeurs, ...champsDepuisEntrees(new FormData(form)) };
  }
}

function enregistrerFormulaire(form) {
  const f = etat.formulaire;
  if (!f) return;
  const champs = champsDepuisEntrees(new FormData(form));
  const existante = f.recetteId ? trouverRecette(f.recetteId) : null;
  const { recette, erreurs } = recetteDepuisFormulaire(champs, existante, f.origine ?? {});
  if (recette && recetteDuMemeNom(etat.donnees.recettes, recette.nom, existante?.id)) {
    erreurs.nom = 'Une autre recette porte déjà ce nom.';
  }
  if (Object.keys(erreurs).length) {
    Object.assign(f, { valeurs: { ...f.valeurs, ...champs }, erreurs, general: null });
    afficher();
    const premier = document.querySelector('[aria-invalid="true"]');
    premier?.scrollIntoView({ block: 'center' });
    premier?.focus({ preventScroll: true });
    return;
  }
  if (existante) etat.donnees.recettes[etat.donnees.recettes.indexOf(existante)] = recette;
  else etat.donnees.recettes.push(recette);
  corrigerFournee();
  sauver();
  etat.formulaire = null;
  naviguer(`#/recette/${recette.id}`);
  toast(existante ? 'Modifications enregistrées.' : 'Recette enregistrée.');
}

async function supprimerRecette(id) {
  const recette = trouverRecette(id);
  if (!recette) return;
  const ok = await confirmer({
    titre: 'Supprimer cette recette ?',
    message: `« ${recette.nom} » sera supprimée de ce téléphone.`,
    ok: 'Supprimer',
    danger: true,
  });
  if (!ok) return;
  const index = etat.donnees.recettes.indexOf(recette);
  const fournee = { ...etat.donnees.fournee };
  etat.donnees.recettes.splice(index, 1);
  corrigerFournee();
  sauver();
  naviguer('#/recettes');
  toast(`« ${recette.nom} » supprimée.`, {
    action: () => {
      etat.donnees.recettes.splice(index, 0, recette);
      etat.donnees.fournee = fournee;
      corrigerFournee();
      sauver();
      afficher();
    },
  });
}

/* ================================================================== */
/* Sauvegarde : export et restauration                                 */
/* ================================================================== */

async function exporter() {
  // Tout est préparé sans attendre : iOS n'autorise le partage que juste après le toucher.
  const maintenant = new Date();
  const contenu = JSON.stringify(creerSauvegarde(etat.donnees, maintenant), null, 2);
  const fichier = new File([contenu], nomFichierSauvegarde(maintenant), { type: 'application/json' });

  let partage = false;
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier] }); // feuille de partage iOS : « Enregistrer dans Fichiers »
      partage = true;
    } catch (erreur) {
      if (erreur.name === 'AbortError') return; // partage annulé : rien n'est exporté
    }
  }
  if (!partage) telecharger(fichier);

  etat.donnees.meta.derniereSauvegarde = maintenant.toISOString();
  await sauver();
  afficher();
  toast('Sauvegarde exportée.');
}

function telecharger(fichier) {
  const url = URL.createObjectURL(fichier);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = fichier.name;
  document.body.append(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function restaurer() {
  const champ = document.createElement('input');
  champ.type = 'file';
  champ.accept = '.json,application/json';
  champ.hidden = true;
  document.body.append(champ);
  champ.addEventListener('cancel', () => champ.remove(), { once: true });
  champ.addEventListener(
    'change',
    async () => {
      const fichier = champ.files?.[0];
      champ.remove();
      if (!fichier) return;
      try {
        const { donnees, exporteLe } = lireSauvegarde(await fichier.text());
        const date = exporteLe ? ` du ${new Date(exporteLe).toLocaleDateString('fr-FR')}` : '';
        const ok = await confirmer({
          titre: 'Restaurer cette sauvegarde ?',
          message: `Sauvegarde${date} : ${pluriel(donnees.recettes.length, 'recette')}, ${pluriel(donnees.fournees.length, 'fournée')} au carnet. Les données actuelles de ce téléphone seront remplacées.`,
          ok: 'Restaurer',
          danger: true,
        });
        if (!ok) return;
        etat.donnees = donnees;
        etat.lectureImpossible = false;
        appliquerTheme(donnees.reglages.theme);
        await sauver();
        naviguer('#/');
        toast(`Sauvegarde restaurée : ${pluriel(donnees.recettes.length, 'recette')}.`);
      } catch (erreur) {
        toast(erreur.message, { duree: 10000 });
      }
    },
    { once: true },
  );
  champ.click();
}

/* ================================================================== */
/* Écouteurs                                                           */
/* ================================================================== */

const ACTIONS = {
  moins: () => changerBoules((etat.donnees.fournee.boules ?? 2) - 1),
  plus: () => changerBoules((etat.donnees.fournee.boules ?? 0) + 1),
  utiliser: (bouton) => {
    Object.assign(etat.donnees.fournee, { recetteId: bouton.dataset.id, levurePct: null });
    corrigerFournee();
    sauver();
    naviguer('#/');
  },
  'valider-fournee': () => validerFournee(),
  'ajouter-carnet': () => {
    const { recette, variables } = variablesFournee(etat);
    if (!recette || Object.keys(verifierVariables(recette, variables)).length) return;
    const entree = nouvelleEntree(recette, variables);
    etat.donnees.fournees.unshift(entree);
    sauver();
    naviguer(`#/carnet/${entree.id}`);
    toast('Fournée ajoutée au carnet. Le résultat se note ici après la cuisson.');
  },
  noter: (bouton) => {
    const b = etat.brouillon;
    if (!b || b.id !== bouton.dataset.id) return;
    const note = Number(bouton.dataset.note);
    b.note = b.note === note ? null : note; // toucher la même étoile retire la note
    document.querySelectorAll('.etoiles button').forEach((etoile) => {
      const i = Number(etoile.dataset.note);
      etoile.classList.toggle('pleine', i <= (b.note ?? 0));
      etoile.setAttribute('aria-pressed', String(i === b.note));
    });
    majEtatResultat();
  },
  'enregistrer-resultat': () => {
    const b = etat.brouillon;
    const entree = b && trouverEntree(b.id);
    if (!entree) return;
    document.activeElement?.blur();
    enregistrerResultat(entree, b);
    sauver();
    majEtatResultat();
    toast('Résultat enregistré.', { duree: 3000 });
  },
  'supprimer-entree': async (bouton) => {
    const entree = trouverEntree(bouton.dataset.id);
    if (!entree) return;
    const ok = await confirmer({
      titre: 'Supprimer cette fournée ?',
      message: 'Elle sera retirée du carnet, avec son résultat.',
      ok: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    const index = etat.donnees.fournees.indexOf(entree);
    etat.donnees.fournees.splice(index, 1);
    sauver();
    naviguer('#/carnet');
    toast('Fournée supprimée.', {
      action: () => {
        etat.donnees.fournees.splice(index, 0, entree);
        sauver();
        afficher();
      },
    });
  },
  'levure-grille': () => {
    etat.donnees.fournee.levurePct = null;
    rafraichirVariables();
    sauver();
  },
  'ajouter-ligne': () => {
    lireFormulaireOuvert();
    etat.formulaire.valeurs.grille.push({ ...LIGNE_VIDE });
    afficher();
    const lignes = document.querySelectorAll('.ligne-grille');
    lignes[lignes.length - 1]?.querySelector('input')?.focus();
  },
  'supprimer-ligne': (bouton) => {
    lireFormulaireOuvert();
    etat.formulaire.valeurs.grille.splice(Number(bouton.dataset.index), 1);
    afficher();
  },
  supprimer: (bouton) => supprimerRecette(bouton.dataset.id),
  coller: () => coller(),
  'effacer-import': () => {
    etat.import = { texte: '', resultats: null, erreur: null };
    afficher();
    $('#texte-import')?.focus();
  },
  'enregistrer-import': () => enregistrerImport(),
  'saisie-depuis-import': () => saisieDepuisImport(),
  exporter: () => exporter(),
  restaurer: () => restaurer(),
  'fermer-feuille': () => fermerFeuille(),
  'ajouter-recette': () => {
    ouvrirFeuille(html`<div class="feuille-contenu">
      <h2 tabindex="-1" autofocus>Ajouter une recette</h2>
      <div class="pile-boutons">
        <button type="button" class="btn btn-primaire btn-geant btn-large" data-action="aller" data-cible="#/importer">${ICONES.coller}Importer depuis Pizza App</button>
        <button type="button" class="btn btn-geant btn-large" data-action="aller" data-cible="#/nouvelle">${ICONES.crayon}Saisir une recette</button>
        <button type="button" class="btn btn-discret btn-large" data-action="fermer-feuille">Annuler</button>
      </div>
    </div>`);
  },
  aller: (bouton) => {
    fermerFeuille();
    naviguer(bouton.dataset.cible);
  },
};

const FORMULAIRES = {
  'lire-import': () => {
    etat.import.texte = $('#texte-import').value;
    lireImport();
  },
  recette: (form) => enregistrerFormulaire(form),
};

function signalerErreur(erreur) {
  console.error(erreur);
  toast(erreur?.message || 'Une erreur est survenue.', { duree: 8000 });
}

function installerEcouteurs() {
  window.addEventListener('hashchange', afficher);

  document.addEventListener('click', (e) => {
    const element = e.target.closest('[data-action]');
    const action = element && ACTIONS[element.dataset.action];
    if (!action) return;
    e.preventDefault();
    try {
      Promise.resolve(action(element)).catch(signalerErreur); // appel immédiat : garde le « geste » pour le partage iOS
    } catch (erreur) {
      signalerErreur(erreur);
    }
  });

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    try {
      FORMULAIRES[form.dataset.form]?.(form);
    } catch (erreur) {
      signalerErreur(erreur);
    }
  });

  document.addEventListener('input', (e) => {
    const element = e.target;
    switch (element.dataset?.champ) {
      case 'boules':
        changerBoules(element.value.trim(), { depuisSaisie: true });
        break;
      case 'temp-piece':
        changerTemperature(element.value);
        break;
      case 'levure':
        changerLevure(element.value);
        break;
      case 'texte-import':
        etat.import.texte = element.value;
        break;
      case 'commentaire':
        if (etat.brouillon?.id === element.dataset.id) {
          etat.brouillon.commentaire = element.value;
          majEtatResultat();
        }
        break;
      case 'nom-import': {
        const i = Number(element.dataset.index);
        const res = etat.import.resultats?.[i];
        if (!res) break;
        res.nom = element.value;
        const zone = document.getElementById(`doublon-${i}`);
        const doublon = recetteDuMemeNom(etat.donnees.recettes, res.nom.trim() || res.recette.nom);
        if (zone) zone.innerHTML = String(zoneDoublon(res, i, doublon));
        break;
      }
      default:
    }
  });

  document.addEventListener('change', (e) => {
    const element = e.target;
    if (element.dataset?.reglage === 'theme') {
      etat.donnees.reglages.theme = element.value;
      appliquerTheme(element.value);
      sauver();
      return;
    }
    switch (element.dataset?.champ) {
      case 'recette':
        // Autre recette : la dose saisie pour la précédente ne vaut plus.
        Object.assign(etat.donnees.fournee, { recetteId: element.value, levurePct: null });
        sauver();
        afficher();
        break;
      case 'boules':
        // Saisie abandonnée (vide, 0, 120…) : on réaffiche le nombre retenu.
        element.value = String(etat.donnees.fournee.boules ?? '');
        break;
      case 'levure':
        rafraichirVariables(); // remet en forme (« 1,2 » → « 1,20 ») ou reprend la dose de la grille si vidé
        break;
      case 'constat':
        if (etat.brouillon?.id === element.dataset.id) {
          basculerConstat(etat.brouillon, element.value, element.checked);
          majEtatResultat();
        }
        break;
      case 'choix-doublon': {
        const res = etat.import.resultats?.[Number(element.dataset.index)];
        if (res) res.choix = element.value;
        break;
      }
      default:
    }
  });

  // Touche « OK » du clavier : referme le clavier.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches?.('#boules, #temp-piece, #levure, [data-champ="nom-import"]')) {
      e.preventDefault();
      e.target.blur();
    }
  });

  const feuille = $('#feuille');
  feuille.addEventListener('click', (e) => {
    if (e.target === feuille) fermerFeuille(); // toucher le fond grisé referme la feuille
  });

  // L'iPhone peut fermer l'appli en arrière-plan : enregistrer tout de suite ce qui attend.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && minuteurSauvegarde) sauver();
  });
}

/* ================================================================== */
/* Mode hors ligne et mises à jour                                     */
/* ================================================================== */

function enregistrerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  let miseAJourDemandee = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (miseAJourDemandee) location.reload();
  });
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type !== 'version') return;
    etat.version = e.data.version;
    const zone = document.getElementById('version');
    if (zone) zone.textContent = e.data.version;
  });
  navigator.serviceWorker
    .register('./sw.js')
    .then((inscription) => {
      const proposer = () => {
        if (!inscription.waiting || !navigator.serviceWorker.controller) return;
        const zone = $('#maj');
        zone.innerHTML = String(html`<span>Une nouvelle version est disponible.</span>
          <button type="button" class="btn-petit">Mettre à jour</button>`);
        zone.hidden = false;
        zone.querySelector('button').addEventListener('click', () => {
          miseAJourDemandee = true;
          inscription.waiting?.postMessage('activer');
        });
      };
      proposer();
      inscription.addEventListener('updatefound', () => {
        const nouveau = inscription.installing;
        nouveau?.addEventListener('statechange', () => {
          if (nouveau.state === 'installed') proposer();
        });
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') inscription.update().catch(() => {});
      });
      return navigator.serviceWorker.ready;
    })
    .then((pret) => pret?.active?.postMessage('version'))
    .catch((erreur) => console.warn('Mode hors ligne indisponible :', erreur));
}

/* ================================================================== */
/* Démarrage                                                           */
/* ================================================================== */

async function demarrer() {
  installerEcouteurs();
  try {
    const lu = await stockage.lire('donnees');
    if (lu) {
      etat.donnees = normaliserDonnees(lu);
    } else {
      etat.donnees = donneesInitiales(); // premier lancement : les deux recettes du cahier des charges
      await sauver();
    }
  } catch (erreur) {
    console.error(erreur);
    etat.lectureImpossible = true;
  }
  appliquerTheme(etat.donnees.reglages.theme);
  afficher();
  if (etat.lectureImpossible) {
    toast('Les données enregistrées n’ont pas pu être lues. Rien ne sera écrasé : restaurer une sauvegarde pour repartir.', { duree: 0 });
  }
  enregistrerServiceWorker();
  etat.persistant = await stockage.demanderPersistance();
}

demarrer();
