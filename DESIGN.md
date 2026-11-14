# Pizzeria Ensen : guide de style

Le style de référence pour tous les écrans. Il ne touche ni à la logique ni aux données.

L'appli doit ressembler à une appli iOS récente et chaleureuse :
- un fond crème plutôt que blanc ;
- de grands titres ;
- des cartes très arrondies en deux parties ;
- des commandes flottantes ;
- beaucoup d'espace, des ombres à peine visibles et des animations discrètes.

Inspirée d'applis iOS récentes, sans en reprendre les icônes ni les illustrations : tout est dessiné pour l'appli en SVG.

Elle s'utilise en cuisine, les mains pleines de farine : grandes cibles tactiles, chiffres lisibles de loin, aucune action importante cachée.

## Couleurs

Toutes les couleurs sont des variables CSS (`css/app.css`). Le thème sombre redéfinit les mêmes variables. Il suit le réglage de l'iPhone, ou le choix fait dans Réglages.

| Variable | Clair | Sombre | Rôle |
|---|---|---|---|
| `--fond` | `#f4efe8` crème chaud | `#141210` | fond des écrans |
| `--surface` | `#ffffff` | `#1f1c19` | pied des cartes, champs, boutons ronds |
| `--surface-2` | `#ebe4da` | `#2c2824` | piste des sélecteurs en pilule, versements d'eau |
| `--texte` | `#1d1a17` presque noir | `#f3eee7` | texte principal, chiffres |
| `--texte-doux` | `#877d72` gris chaud | `#a39a8f` | sous-titres, unités, aides |
| `--bordure` | `#e8e1d7` | `#34302b` | séparateurs très légers |
| `--accent` | `#c2391f` rouge tomate | `#ff7a5c` | action principale, onglet actif, sélection |
| `--accent-doux` | `#fbe4dc` | `#3d221b` | fond d'une sélection |
| `--farine` | `#f7ecd8` | `#2b251d` | en-tête des cartes recettes et des doses |
| `--farine-fonce` | `#ecdcbf` | `#3a3126` | disque des illustrations |
| `--basilic` | `#3d7a37` | `#8fcf86` | succès, « identique à Pizza App », bonne note |
| `--basilic-doux` | `#e2efda` | `#1f2e1d` | fond des messages de succès |
| `--tomate-teinte` | `#f8dcd2` | `#3a201a` | en-tête des pizzas à base tomate |
| `--creme-teinte` | `#f6eedf` | `#2d281f` | en-tête des pizzas blanches |
| `--alerte` / `--alerte-doux` | `#9c5600` / `#fbe9cc` | `#f3b25c` / `#3b2a12` | à compléter, hors grille |
| `--danger` | `#b3261e` | `#ff8e85` | suppression |

Les contrastes respectent le niveau AA. Le rouge tomate sur blanc est à 5,4:1, et à 4,7:1 sur le fond crème.

## Typographie

Police système de l'iPhone (SF Pro), sans police à télécharger.

| Usage | Taille | Graisse | Détails |
|---|---|---|---|
| Grand titre d'écran | 34 px | 800 | interlettrage −0,02 em, comme les grands titres iOS |
| Sous-titre d'écran | 15 px | 400 | `--texte-doux`, exemple « 2 recettes enregistrées » |
| Titre de section | 13 px | 650 | capitales, interlettrage 0,05 em, `--texte-doux` |
| Nom dans une carte | 19 px | 700 | |
| Ligne secondaire d'une carte | 14 px | 400 | `--texte-doux` |
| Chiffre clé | 16 px | 700 | unité juste après en 14 px, 400, `--texte-doux` |
| Dose | 34 px | 800 | chiffres à chasse fixe |
| Compte à rebours | 64 px | 800 | chiffres à chasse fixe |
| Texte courant | 17 px | 400 | jamais moins de 16 px dans un champ : l'iPhone zoomerait |

Pour les chiffres clés, le nombre est en gras et l'unité en gris, et les éléments sont séparés par un point médian gris : **5** pâtons · **285** g · **70** % · **20** h frigo.

## Espacements et arrondis

- Unité de base : 4 px. Marges d'écran : 20 px. Entre deux cartes : 14 px. Entre deux sections : 28 px.
- Arrondis :
  - cartes : 26 px ;
  - champs et boutons rectangulaires : 18 px ;
  - feuille du bas : 28 px en haut ;
  - pilules et boutons ronds : arrondi complet.
- Icônes : 20 px par défaut, au trait fin. Les cibles tactiles restent grandes même quand l'icône est petite.
- Cibles tactiles : 44 px au minimum. Les commandes de cuisine (−, +, Valider) font 60 à 72 px.

## Ombres et matières

- `--ombre-douce` : `0 1px 2px` à 4 % et `0 8px 24px` à 6 %, teinte brune. Pour les cartes et les boutons ronds.
- `--ombre-flottante` : `0 10px 30px` à 12 %. Pour la barre d'onglets et le bouton « + ».
- Barre d'onglets et en-têtes collants : fond translucide (88 %) avec flou d'arrière-plan.
- Pas de bordure épaisse : la séparation vient de l'ombre et du changement de teinte.

## Composants

**Écran.** Il s'ouvre sur un grand titre aligné à gauche, avec un sous-titre discret. Les boutons ronds éventuels sont à droite du titre. Les écrans secondaires (fiche, formulaire) ont une barre compacte avec « ‹ Retour » en rouge tomate et le titre centré.

**Bouton rond flottant.** Disque blanc de 52 px, ombre douce, icône au trait fin (1,75) de 19 px.

**Bouton principal.** Pilule rouge tomate de 60 px de haut, texte blanc en gras, sur toute la largeur.

**Sélecteur en pilule.** Une piste `--surface-2` portant une pastille blanche ombrée sous l'option choisie. Hauteur 44 px.

**Carte en deux parties.**
- En-tête teinté : nom en gras, ligne secondaire grise, illustration ronde de 64 px à droite.
- Pied blanc : chiffres clés.
- Une carte qu'on peut choisir reçoit, une fois choisie, un liseré rouge tomate et une coche ronde.

**Carte recette.** En-tête `--farine` avec le dessin d'un pâton. Pied : pâtons, poids, hydratation et durée au frigo.

**Carte pizza type** (étape 4).
- En-tête teinté selon la base : `--tomate-teinte` pour une base tomate, `--creme-teinte` pour une base blanche.
- Illustration : pizza tomate ou blanche.
- Pied : ingrédients principaux.

**Carte des doses.** En-tête `--farine` : titre, poids de pâte. Pied : une ligne par ingrédient, avec le nom à gauche et la dose en 34 px à droite. Les versements d'eau sont en pilules `--surface-2` sous l'eau.

**Champ géant.** Carte blanche avec un libellé en haut, la valeur en 34 px gras centrée et l'unité en gris. La température de la pièce et la levure sont côte à côte.

**Compteur.** Valeur géante entre deux boutons ronds − et + de 64 px (symboles de 22 px).

**Rappel.** Petite carte `--basilic-doux` (dernier résultat) ou `--alerte-doux` (résultat à compléter).

**Barre d'onglets.** Pilule flottante translucide, à 16 px des bords, au-dessus de la zone du geste d'accueil. Icônes au trait fin de 20 px, libellé de 11 px. L'onglet actif a une pastille `--surface-2` et la couleur rouge tomate. Le bouton rond « + » de 56 px (icône de 22 px) est séparé, à droite : il ajoute une recette (import Pizza App ou saisie).

**Compte à rebours** (étape 3).
- Grande carte, avec l'étape en cours en titre : « Pointage en masse ».
- Temps restant en 64 px.
- Fine barre de progression rouge tomate, puis l'étape suivante en gris.

**Feuille du bas et message temporaire.** Mêmes arrondis et mêmes ombres que les cartes. Le message temporaire flotte au-dessus de la barre d'onglets.

## Illustrations

Dessinées en SVG dans `js/ui.js`, sur un disque `--farine-fonce` de 64 px :
- **Pâton** : boule de pâte bombée, ombre portée, quelques points de farine.
- **Pizza tomate** et **pizza blanche** (étape 4) : cornicione doré, sauce ou crème, garniture simple.

Les couleurs passent par des variables : les dessins s'adaptent au thème sombre.

## Animations

- Écran qui s'ouvre : fondu avec une montée de 6 px en 180 ms.
- Bouton touché : réduction à 97 % pendant 120 ms.
- Feuille du bas : glissement de 220 ms.
- Sélection d'une carte : transition de 150 ms du liseré et de la teinte.
- Si l'iPhone demande de réduire les animations, elles sont toutes supprimées.

## Barre d'état de l'iPhone

L'appli installée utilise `apple-mobile-web-app-status-bar-style: default` : texte de la barre d'état en noir sur fond clair, en blanc en thème sombre. La couleur `theme-color` suit le thème : crème en clair, presque noir en sombre.
