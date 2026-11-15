# Pizzeria Ensen : guide de style

Le style de référence pour tous les écrans. Il ne touche ni à la logique ni aux données.

Depuis la version 0.3.0, l'appli suit la même démarche que Brasserie Ensen, aux couleurs de la pizzeria :
- des jetons sémantiques (`--e-…`) et des composants (`.e-…`) dans `css/systeme.css` et `js/composants.js` ;
- la mise en page et les composants propres à l'appli dans `css/app.css` (cartes en deux parties, compteur, doses, grille).

L'appli doit ressembler à une appli iOS récente et chaleureuse :
- un fond crème plutôt que blanc ;
- de grands titres ;
- des cartes très arrondies en deux parties ;
- des commandes flottantes ;
- beaucoup d'espace, des ombres à peine visibles et des animations discrètes.

Inspirée d'applis iOS récentes, sans en reprendre les icônes ni les illustrations : tout est dessiné pour l'appli en SVG.

Elle s'utilise en cuisine, les mains pleines de farine :
- grandes cibles tactiles ;
- chiffres lisibles de loin ;
- aucune action importante cachée.

## Règles

- **Contrastes AA** : 4,5:1 au moins pour tout texte, en clair comme en sombre, sur chaque fond où il est posé.
- **Jamais la couleur seule** : une alerte ou une erreur a toujours son icône (triangle, horloge). Une étoile vide est ☆, une pleine ★. Un constat choisi porte une coche.
- **Taille du texte de l'iPhone** : le contenu est en `rem`, et `html` prend la taille « corps » de l'iPhone (Dynamic Type).
  - La barre d'onglets, la barre de titre et le bouton « + » restent en px, comme sur iOS.
  - Quand le texte grandit, la page se réorganise sans rien couper : l'illustration passe sous le nom, les champs et les boutons l'un sous l'autre, la dose sous son ingrédient, les libellés au-dessus des valeurs.
- **Cibles tactiles** : 44 px au moins. Les commandes de cuisine (−, +, boutons) font 56 à 64 px.
- **Champs** : 16 px au moins, sinon l'iPhone zoome à la saisie. Les styles des champs sont sous `:where()` (spécificité nulle) : un champ particulier (compteur, champ géant) les remplace sans surenchère.

## Couleurs

Toutes les couleurs sont des jetons de `css/systeme.css`. Le thème sombre redéfinit les mêmes jetons. Il suit le réglage de l'iPhone, ou le choix fait dans Réglages.

| Jeton | Clair | Sombre | Rôle |
|---|---|---|---|
| `--e-fond` | `#f4efe8` crème chaud | `#141210` | fond des écrans |
| `--e-surface` | `#ffffff` | `#1f1c19` | pied des cartes, blocs, fenêtres, boutons ronds |
| `--e-surface-2` | `#ebe4da` | `#3a3430` | champs, pistes des sélecteurs, versements d'eau |
| `--e-bordure` | `#e8e1d7` | `#38322d` | séparateurs très légers (décor) |
| `--e-texte` | `#1d1a17` | `#f3eee7` | texte principal, chiffres |
| `--e-texte-2` | `#6d6359` | `#b3aa9e` | sous-titres, unités, aides |
| `--e-texte-3` | `#a69b8e` | `#847a6f` | décor seulement : points de séparation |
| `--e-tomate` | `#b8341b` | `#ff7a5c` | action principale, onglet actif, sélection, liens |
| `--e-tomate-doux` / `--e-tomate-texte` | `#fbe4dc` / `#9e2c16` | `#3d221b` / `#ff9a80` | constat choisi |
| `--e-farine` | `#f7ecd8` | `#2b251d` | en-tête des cartes recettes, du carnet et des doses |
| `--e-farine-fonce` | `#ecdcbf` | `#3a3126` | disque des illustrations |
| `--e-basilic-doux` / `--e-basilic-texte` | `#e2efda` / `#2f6a2b` | `#1f2e1d` / `#8fcf86` | succès, « identique à Pizza App », dernier résultat |
| `--e-alerte-fond` / `--e-alerte-texte` | `#fbe9cc` / `#9c5600` | `#3b2a12` / `#f3b25c` | à compléter, hors grille, non enregistré |
| `--e-erreur` / `--e-erreur-fond` | `#b3261e` / `#f9e0dc` | `#ff8e85` / `#3e1e17` | erreurs de saisie, suppression |
| `--e-info` / `--e-info-doux` | `#255f7e` / `#dae9f1` | `#8cc4e3` / `#16293a` | nouvelle version, valeurs lues dans Pizza App |
| `--e-tomate-teinte` / `--e-creme-teinte` | `#f8dcd2` / `#f6eedf` | `#3a201a` / `#2d281f` | en-tête des pizzas types (étape 4) |

### Contrastes mesurés

| Couleur | Clair | Sombre |
|---|---|---|
| Texte secondaire | 4,7:1 (surface 2) à 5,9:1 (carte) | 5,3:1 à 8,2:1 |
| Rouge tomate | 4,7:1 (surface 2) à 5,9:1 (carte) ; blanc dessus 5,9:1 | 4,8:1 à 7,3:1 |
| Basilic sur basilic doux | 5,5:1 | 7,8:1 |
| Alerte sur son fond | 4,7:1 | 7,4:1 |
| Erreur | 5,2:1 à 6,5:1 | 6,7:1 à 7,6:1 |

Avant la version 0.3.0, le texte secondaire (`#877d72`) descendait à 3,2:1, et le rouge tomate (`#c2391f`) à 4,3:1 sous l'onglet actif. Le basilic était à 4,4:1 sur son fond. En sombre, les champs (`#2c2824`) ne se détachaient presque pas des cartes : 1,16:1, contre 1,38:1 aujourd'hui.

## Typographie

Police système de l'iPhone (SF Pro), sans police à télécharger. Les chiffres clés utilisent la variante arrondie (SF Pro Rounded), à chasse fixe.

Tailles pour un texte de base de 17 px. Elles suivent la taille du texte de l'iPhone.

| Usage | Taille | Graisse | Détails |
|---|---|---|---|
| Grand titre d'écran | 2 rem (34 px) | 800 | interlettrage −0,02 em, comme les grands titres iOS |
| Sous-titre d'écran | 0,875 rem | 400 | `--e-texte-2`, exemple « 2 recettes enregistrées » |
| Titre de section (`.e-titre-section`) | 0,8125 rem | 650 | capitales, interlettrage 0,05 em, `--e-texte-2` |
| Nom dans une carte | 1,125 rem | 700 | |
| Ligne secondaire d'une carte | 0,875 rem | 400 | `--e-texte-2` |
| Chiffre clé | 1 rem | 700 | arrondi ; unité juste après, en `--e-texte-2` |
| Dose | 2 rem | 800 | arrondi, chiffres à chasse fixe |
| Texte courant | 1 rem | 400 | jamais moins de 16 px dans un champ |

Pour les chiffres clés, le nombre est en gras et l'unité en gris, et les éléments sont séparés par un point médian : **5** pâtons · **285** g · **70** % eau · **20** h frigo. Quand la ligne passe à la ligne, aucun point ne commence la ligne suivante (`.e-points`).

## Espacements et arrondis

- Unité de base : 4 px (`--e-1` à `--e-6` : 4, 8, 12, 16, 24, 32).
- Marges d'écran : 20 px. Entre deux cartes : 14 px. Entre deux sections : 26 px.
- Arrondis :
  - cartes et blocs (`--e-r-carte`) : 26 px ;
  - groupes et messages (`--e-r-champ`) : 18 px ;
  - champs : 14 px ;
  - fenêtre du bas : 28 px en haut ;
  - boutons, pastilles, sélecteurs et boutons ronds : arrondi complet.
- Icônes : 1,25 rem, au trait fin (1,75). Celles des barres restent à 20 px.

## Ombres et matières

- `--e-ombre` : `0 1px 2px` à 4 % et `0 8px 24px` à 6 %, teinte brune. Pour les cartes, les blocs et les boutons ronds.
- `--e-ombre-flottante` : `0 10px 30px` à 12 %. Pour la barre d'onglets, le bouton « + » et le message temporaire.
- Barre d'onglets et en-têtes collants : fond translucide (88 %) avec flou d'arrière-plan.
- Pas de bordure épaisse : la séparation vient de l'ombre et du changement de teinte.

## Boutons : trois styles

| Style | Classe | Dessin | Exemples |
|---|---|---|---|
| Principal | `.e-btn--principal` | pilule rouge tomate pleine, texte blanc | Valider, Ajouter au carnet, Préparer une fournée, Enregistrer |
| Secondaire | `.e-btn--secondaire` | contour et texte tomate | Annuler, Modifier, Coller, Ajouter une température |
| Discret | `.e-btn--discret` | texte tomate seul | Retirer, Effacer le texte, Reprendre la dose de la grille |

- **Une seule action principale par écran** ou par fenêtre. Sur l'écran Importer, « Lire la recette » passe en secondaire dès que « Enregistrer la recette » apparaît.
- **Suppression** (`.e-btn--danger`) : fond rouge pâle, texte rouge, sans contour.
  - Le rouge tomate et le rouge d'erreur sont proches : avec un contour rouge, « Supprimer » ressemblerait à un bouton secondaire.
  - Dans la fenêtre de confirmation, le bouton est rouge plein.
- **Hauteur** : 56 px au moins (commandes de cuisine). Les petits boutons (`.e-btn--petit`) font 44 px.
- **Largeur** : `.e-btn--large` occupe toute la largeur. Deux boutons (`.e-actions`, barre du bas) sont côte à côte s'ils tiennent, l'un sous l'autre sinon.
- **Barre du bas** : quand ses boutons s'empilent (texte agrandi), elle prend la classe `empilee` et se resserre ; la page réserve sa vraie hauteur.

## Composants

**Écran.** Il s'ouvre sur un grand titre aligné à gauche, avec un sous-titre discret. Les boutons ronds éventuels sont à droite du titre. Les écrans secondaires (fiche, formulaire) ont une barre compacte avec « ‹ Retour » en rouge tomate et le titre centré.

**Bouton rond flottant.** Disque blanc de 52 px, ombre douce, icône au trait fin de 19 px.

**Carte en deux parties.**
- En-tête farine : nom en gras, ligne secondaire grise, pastilles, illustration ronde de 64 px à droite.
- Pied blanc : chiffres clés.
- Une carte qu'on peut choisir reçoit, une fois choisie, un liseré rouge tomate et une coche ronde.
- Quand le texte grandit, l'illustration passe sous le nom.

**Carte recette.** Sous le nom, des pastilles :
- « Fournée » : recette en cours, pastille rouge tomate pleine avec la part de pizza ;
- l'état de la levure : grille ou référence, avec un thermomètre ; ou « LBF à compléter », en alerte avec le triangle.

Le pied donne les pâtons, le poids, l'hydratation et la durée au frigo. La même carte sert sur l'écran Fournée (à choisir), dans la liste des recettes et en tête de la fiche.

**Carte du carnet.**
- En-tête farine : la date, la recette, les constats en pastilles blanches (ou « Résultat à compléter » en alerte avec l'horloge), et le dessin d'une pizza.
- Pied : boules, température de la pièce, levure et note « ★ 4/5 », puis le commentaire en italique.

**Pastille** (`.e-badge`). Petite pilule de 1,5 rem, texte de 0,75 rem en gras.
- Blanche sur l'en-tête farine.
- Rouge tomate pour la fournée en cours.
- Alerte (avec icône) pour ce qui reste à compléter.

**Note.** Compacte sur les cartes et les rappels : « ★ 4/5 ». Modifiable dans la fiche : cinq étoiles de 48 px au moins, ★ pleine en tomate, ☆ vide en gris. Toucher l'étoile choisie retire la note.

**Bloc** (`.e-bloc`). Carte blanche de 26 px d'arrondi, sans bordure, titre de section en petites capitales grises. Il sert aux fiches, au récap, à l'import et aux réglages. Ses lignes « libellé · valeur » (`.infos`) passent l'une sous l'autre quand le texte grandit.

**Aide et message.** L'aide (`.e-aide`) est en gris, en 0,875 rem.
- Une aide d'alerte (`.e-aide--alerte`) prend la couleur d'alerte et le triangle.
- Un message (`.e-message`) est un encadré avec son icône : alerte, erreur ou info.
- Une erreur de champ (`.e-erreur`) est en rouge avec le triangle, et le champ prend un contour rouge.

**Formulaire** (`.e-formulaire`).
- Chaque section est un bloc, avec son titre à l'intérieur.
- Champs remplis (`--e-surface-2`), sans bordure, comme sur iOS.
- Deux colonnes, une seule quand le texte est agrandi.
- Chaque température de la grille est un groupe bordé, avec « Retirer » en bouton discret.

**Champ géant.** Carte blanche avec un libellé en haut, la valeur en 2,125 rem gras centrée et l'unité en gris. La température de la pièce et la levure sont côte à côte, l'une sous l'autre en texte agrandi. Le cadre de focus (tomate) ou d'erreur (rouge) est porté par la carte, jamais par le champ.

**Compteur.** Valeur géante entre deux boutons ronds − et + de 64 px (symboles de 22 px).

**Carte des doses.** En-tête farine : titre, poids de pâte. Pied : une ligne par ingrédient, le nom à gauche et la dose en 2 rem à droite. La dose passe sous le nom seulement si la place manque. Les versements d'eau sont en pilules `--e-surface-2` sous l'eau.

**Rappel** (écran Fournée). Lien avec icône, texte et chevron.
- `--e-basilic-doux` : dernier résultat, avec le carnet.
- `--e-alerte-fond` : fournée qui attend son résultat, avec l'horloge.

**Constat.** Pilule `--e-surface-2` de 44 px ; choisie, elle passe en tomate douce avec un liseré et une coche.

**Sélecteur en pilule** (`.e-segments`).
- Une piste `--e-surface-2` porte une pastille sous l'option choisie : blanche en clair, plus claire que la piste en sombre, comme sur iOS.
- Hauteur 44 px.
- Choix l'un sous l'autre en très grand texte.

**Lignes d'action** (`.e-menu-action`). Icône tomate, libellé tomate en gras, explication grise en dessous. Elles servent pour « Exporter / Restaurer une sauvegarde » et dans la fenêtre « Ajouter une recette ».

**État vide** (`.e-vide`). Icône de 2,5 rem, titre, texte éventuel, puis les boutons.

**Barre d'onglets.**
- Pilule flottante translucide, à 16 px des bords, au-dessus de la zone du geste d'accueil.
- Icônes au trait fin de 20 px, libellé de 11 px. L'onglet actif a une pastille `--e-surface-2` et la couleur rouge tomate.
- Le bouton rond « + » de 56 px (icône de 22 px) est séparé, à droite : il ajoute une recette.
- Sous la barre, un voile en dégradé vers la couleur du fond : le contenu s'efface avant d'atteindre la barre, au lieu de passer dessous.

**Fenêtre du bas** (`#feuille`).
- Fond blanc, 28 px d'arrondi en haut, petite barre de saisie comme sur iOS, titre en 1,3125 rem.
- Confirmation : « Annuler » en secondaire, l'action en principal (ou en rouge plein pour une suppression). Les boutons passent l'un sous l'autre en très grand texte.

**Message temporaire.** Fond brun foncé (plus clair que les cartes en sombre, avec un bord léger), texte à la taille de l'iPhone, action en tomate clair. Il flotte au-dessus de la barre d'onglets ou de la barre d'actions.

**Compte à rebours** (étape 3).
- Grande carte, avec l'étape en cours en titre : « Pointage en masse ».
- Temps restant en très grand.
- Fine barre de progression rouge tomate, puis l'étape suivante en gris.

**Carte pizza type** (étape 4).
- En-tête teinté selon la base : `--e-tomate-teinte` pour une base tomate, `--e-creme-teinte` pour une base blanche.
- Pied : ingrédients principaux.

## Illustrations

Dessinées en SVG dans `js/ui.js`, sur un disque `--e-farine-fonce` de 64 px :
- **Pâton** : boule de pâte bombée, ombre portée, quelques points de farine.
- **Pizza** : cornicione doré, sauce tomate, mozzarella, basilic.

Les couleurs du pâton et du disque passent par des jetons : les dessins s'adaptent au thème sombre.

## Animations

- Écran qui s'ouvre : fondu avec une montée de 6 px en 180 ms.
- Bouton touché : réduction à 97 % pendant 120 ms.
- Fenêtre du bas : glissement de 220 ms.
- Sélection d'une carte : transition de 150 ms du liseré et de la teinte.
- Si l'iPhone demande de réduire les animations, elles sont toutes supprimées, y compris la réduction des boutons touchés.

## Barre d'état de l'iPhone

L'appli installée utilise `apple-mobile-web-app-status-bar-style: default` : texte de la barre d'état en noir sur fond clair, en blanc en thème sombre. La couleur `theme-color` suit le thème : crème en clair, presque noir en sombre.

Derrière l'heure et la batterie, la bande est opaque (couleur du fond), prolongée d'un fondu de 10 px : le contenu qui défile ne transparaît jamais derrière la barre d'état.
