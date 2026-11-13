# Pizzeria Ensen

Appli perso pour l'iPhone : les doses de pâte à pizza napolitaine de chaque fournée, à partir des recettes de Pizza App. Tout est décrit dans [CAHIER_DES_CHARGES.md](CAHIER_DES_CHARGES.md).

Appli web statique (HTML, CSS, JavaScript, sans dépendance), installable sur l'écran d'accueil et utilisable hors ligne. Les recettes restent sur le téléphone ; une sauvegarde s'exporte depuis Réglages.

**Étape 1** : import du texte Pizza App ou d'un bloc JSON, saisie manuelle, recalcul des doses selon le nombre de boules, sauvegarde, fonctionnement hors ligne.

**Étape 2 (version 0.2.0)** : les recettes sont des modèles. Une fournée part des variables du jour : nombre de boules, température de la pièce et dose de levure. La dose est proposée par la grille de la recette, calculée entre deux températures si besoin, et peut être corrigée pour cette fournée seulement. « Valider » ouvre le récap :
- les doses, avec l'eau en deux versements (85 % puis bassinage, réglable dans chaque recette) ;
- la température de l'eau ;
- les durées de pointage, de frigo et de remise à température.

**Carnet des fournées** : depuis le récap, « Ajouter au carnet » enregistre une copie figée de la fournée. Après la cuisson, on y note le résultat : une note sur 5, des constats rapides (facile à étaler, collante…) et un commentaire. Le résultat n'est gardé qu'après avoir touché « Enregistrer », en haut à droite. L'écran Fournée rappelle le dernier résultat de la recette choisie, pour ajuster la fournée suivante.

## Essayer sur l'ordinateur

Avec Node.js installé, depuis ce dossier :

```
node dev/serveur.mjs
```

puis ouvrir <http://localhost:8081/pizza/>. Le port 8081 laisse le 8080 à Brasserie Ensen.

## Tests

```
node --test
```

Ils couvrent la lecture du texte Pizza App et du bloc JSON, le recalcul des doses (5 boules de 285 g → 824 g de farine, 576 g d'eau, 21 g de sel, 4,34 g de LBF), le formulaire, la sauvegarde et la liste des fichiers gardés hors ligne.

## Mettre en ligne sur GitHub Pages

### Première fois

1. Se connecter sur <https://github.com>, ou créer un compte.
2. Créer le dépôt : bouton **+** en haut à droite, puis **New repository**.
   - **Repository name** : `pizza`. L'adresse de l'appli sera `https://<compte>.github.io/pizza/`.
   - Choisir **Public** : c'est obligatoire pour GitHub Pages gratuit. Le code sera visible, mais pas les recettes, qui restent sur le téléphone.
   - Ne rien cocher d'autre, puis **Create repository**.
3. Sur la page du dépôt vide, cliquer sur le lien **uploading an existing file**.
4. Depuis l'explorateur Windows, glisser dans la page ces éléments du dossier `PIZZA` (pas le dossier `PIZZA` lui-même) :
   - `index.html`, `manifest.webmanifest`, `sw.js` et `.nojekyll` ;
   - les dossiers `css`, `js` et `icons`.

   Le dossier `dev`, ce README et le cahier des charges sont facultatifs.
5. Cliquer sur **Commit changes**.
6. Ouvrir **Settings**, puis **Pages** dans la colonne de gauche. Sous **Build and deployment** :
   - **Source** : *Deploy from a branch* ;
   - **Branch** : `main`, dossier `/ (root)`.

   Cliquer sur **Save**.
7. Attendre une à deux minutes, puis recharger la page **Pages** : l'adresse du site s'affiche en haut. Vérifier qu'elle s'ouvre sur l'ordinateur.

### Mises à jour (étapes suivantes)

1. Changer `VERSION` dans `sw.js`. Claude Code le fait à chaque livraison ; sans ce changement, l'iPhone garde l'ancienne copie.
2. Sur la page du dépôt, cliquer sur **Add file**, puis **Upload files**, glisser les mêmes éléments, puis **Commit changes**. Les fichiers existants sont remplacés.
3. Sur l'iPhone, ouvrir l'appli : un bandeau **« Une nouvelle version est disponible »** apparaît, toucher **Mettre à jour**. Si rien ne s'affiche, fermer l'appli et la rouvrir.

## Installer sur l'iPhone

1. Ouvrir l'adresse `https://<compte>.github.io/pizza/` dans **Safari** et attendre que la page soit chargée.
2. Toucher le bouton **Partager** (carré avec une flèche vers le haut).
3. Toucher **Sur l'écran d'accueil**. Il peut être nécessaire de faire défiler la liste ou de toucher **Plus**.
4. Garder le nom **Pizzeria Ensen** ou le raccourcir, puis toucher **Ajouter**.
5. Toujours ouvrir l'appli depuis cette icône : elle a son propre stockage, séparé de celui de Safari.

Une fois ouverte une première fois depuis l'icône, l'appli fonctionne sans réseau, en mode avion par exemple.

## Organisation

```
index.html, manifest.webmanifest   page de l'appli, installation sur l'écran d'accueil
sw.js                              copie hors ligne (caches « pizzeria-… »)
css/app.css                        thème clair/sombre, gros boutons
js/app.js                          démarrage, navigation, actions
js/ecrans.js, js/ui.js             écrans et composants
js/import.js                       lecture du texte Pizza App et du bloc JSON
js/calculs.js                      doses (pourcentages du boulanger), lecture de la grille entre deux températures
js/fournee.js                      fournée : variables du jour (boules, pièce, levure) et récap
js/carnet.js                       carnet des fournées : récap figé et résultat (note, constats, commentaire)
js/recettes.js                     modèle d'une recette, grille par température, formulaire
js/donnees.js, js/db.js            données, sauvegarde, stockage local (IndexedDB)
js/exemples.js                     les deux recettes du cahier des charges, préchargées
icons/                             icon.svg et PNG générés par node dev/icones.mjs (Chrome)
dev/                               serveur local et tests
```

Brasserie Ensen et Pizzeria Ensen peuvent partager le domaine `<compte>.github.io`. Les noms de cache (`pizzeria-…`), de base de données (`pizzeria-ensen`) et de préférence de thème (`pizzeria-theme`) sont donc distincts de ceux de Brasserie Ensen.
