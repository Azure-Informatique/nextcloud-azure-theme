<!--
  - SPDX-FileCopyrightText: 2026 Azure Informatique
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->
# Charte du Thème Azure

Le Thème Azure est un **dérivé direct de la charte d'azure-informatique.fr** : mêmes couleurs, même police, mêmes formes. Règle absolue : **rien d'inventé**. Chaque choix visuel reprend un précédent du site ou de son panel d'administration ; s'il n'y en a pas, on le signale au lieu d'improviser.

## Principes

- **À plat** : aucune ombre au repos, aucun dégradé sur les cartes, aucun flou ni effet de verre (`backdrop-filter` interdit). Les surfaces se distinguent par des **marches de ton** (paper → canvas → canvas-alt) et des **filets fins** (`line`).
- **Ombre « float » uniquement** pour ce qui flotte : menus, popovers, boîtes de dialogue, bulles.
- **Aucune animation d'arrivée** (cartes, listes). Transitions courtes sur `transform`/`opacity`/couleurs seulement ; repli `prefers-reduced-motion`.
- **Accessibilité** : texte ≥ 4,5:1, contours et éléments non textuels ≥ 3:1, focus clavier toujours visible, cibles tactiles ≥ 40 px (44 px au doigt quand la mise en page le permet). Les thèmes Nextcloud *contraste élevé* et *police dyslexie* restent prioritaires.
- **Mobile d'abord** : jamais de défilement horizontal de la page ; rangées d'onglets sur une seule ligne, sans barre défilante ; champs à 16 px minimum (pas de zoom iPhone).
- **Aucune ressource externe** : tout est servi par l'app.

## Couleurs

Le bleu de marque **`#0078D4` est fixe dans les deux thèmes** pour les fonds, contours et boutons (blanc dessus 4,53:1). Le **texte bleu** passe par `azure-text` (lisible sur tous les fonds).

| Rôle | Clair | Sombre | Variable SCSS |
|---|---|---|---|
| Surface (paper) | `#FFFFFF` | `#0B0F1C` | `$colour-background`, `$main-page-bg` |
| Fond de page (canvas) | `#EEF2F7` | `#0F1626` | `$main-page-bg-dashboard`, `$colour-sidebar-bg` |
| Marche suivante (canvas-alt) | `#E4EAF2` | `#141D30` | `$colour-sidebar-link-bg` |
| Filet (line) | `#D9E1EB` | `#24304A` | `$theme-divider` |
| Texte (ink) | `#0B0F1C` | `#EDF2F9` | `$colour-forground` |
| Texte secondaire (muted) | `#485268` | `#AAB4CA` | `$colour-forground-1` |
| Contour de champ (ink/50) | `#85878E` | `#7C808A` | `--color-border-maxcontrast` |
| Texte bleu (azure-text) | `#0062AD` | `#3D9FF0` | `$colour-blue-600` |
| Bleu de marque | `#0078D4` | `#0078D4` | `$colour-brand` |
| Survol du bleu de marque | `#005CAA` | `#005CAA` | `$colour-brand-hover` |
| Teinte active (azure/10) | `#E6F2FB` | `#08294A` | `$colour-primary-50` |
| Erreur / succès / attention | `#B91C1C` / `#047857` / `#92400E` | `#F87171` / `#34D399` / `#F0A857` | `$colour-red-600`, `$colour-green-700`, `$colour-yellow` |

Les 115 variables de couleur de Nextcloud sont fixées par `scss/_palette.scss` (fichiers `css/azure-palette-*.css`) : **utiliser les variables Nextcloud (`var(--color-…)`) ou les jetons SCSS ci-dessus, jamais une couleur en dur**.

## Typographie

- **Ubuntu Sans** partout (titres compris), graisses 400 à 800. Corps 15 px (taille Nextcloud).
- Titre de page : 1,5 à 2 rem, graisse 700, aligné à gauche, interlignage 1,2, sans césure.
- Titre de section ou de carte : 0,9375 rem (15 px), graisse 700.
- Libellés : graisse 600. Texte secondaire : `muted`, 13 à 14 px.
- **Jamais de capitales espacées** ni de petites capitales pour les étiquettes ou les titres de groupes : casse normale, 0,8125 rem, graisse 600, couleur `muted`.

## Formes

| Élément | Rayon |
|---|---|
| Boutons | pilule (`999px`) ; bouton d'icône seule : rond |
| Champs, onglets, éléments de liste, menus | 12 px |
| Cartes et panneaux | 16 px |
| Grands conteneurs, fenêtres | 24 px |

## Composants (modèle : panel du site)

- **Bouton principal** : pilule `#0078D4`, texte blanc 600, hauteur 40 px, survol `#005CAA`, appui `scale(.97)`.
- **Bouton secondaire** : pilule, filet `line`, fond paper, texte ink ; survol : contour bleu de marque.
- **Bouton de danger** : pilule rouge plein `#B91C1C`, texte blanc ; survol `#991B1B`.
- **Champ** : hauteur ≥ 40 px, rayon 12 px, contour `--color-border-maxcontrast` ; focus : contour bleu (azure-text).
- **Carte** : fond paper, filet `line`, rayon 16 px, padding 16 à 24 px, aucune ombre.
- **Navigation d'app** : fond canvas ; élément actif = fond `azure/10` + **liseré intérieur gauche de 3 px `#0078D4`** (`box-shadow: inset 3px 0 0 #0078D4`), texte ink ; survol = canvas-alt.
- **Liste** : rangées séparées par des filets `line`, survol canvas, sélection `azure/10` + liseré.
- **Badge / pastille** : pilule, `azure/12` + texte azure-text.
- **Boîte de dialogue** : fond paper, rayon 24 px, ombre float, voile `nuit/50` ; plein écran sur téléphone.
- **État vide** : icône `muted`, texte `muted`, pas d'illustration colorée.

## Durabilité (règles de code)

Le thème doit traverser les mises à jour de Nextcloud sans casser :

1. **Variables officielles d'abord** (`--color-*`, `--border-radius-*`, `--default-clickable-area`…) : toute app qui respecte Nextcloud hérite du thème sans règle propre. Une surcharge ciblée n'est qu'un dernier recours, et elle est commentée.
2. **Sélecteurs courts et stables** : classes publiques des composants Nextcloud (`.app-navigation-entry`, `.button-vue--primary`…), jamais `data-v-…`, jamais de longue chaîne qui épouse la structure d'un écran, spécificité minimale, `!important` seulement contre une valeur en dur de Nextcloud.
3. **Une règle propre à une version** va dans le fichier `-vNN` correspondant, jamais dans la base.
4. **CSS plutôt que JavaScript** : un script ne se justifie que si le CSS ne peut pas le faire (ou ne le peut qu'à un coût d'affichage inacceptable, voir 7), et il doit être sans effet de bord et tolérer l'absence de l'élément visé.
5. **Aucune dépendance cachée** : ni ressource externe, ni classe interne de Nextcloud (`OC\…`), ni script en ligne.
6. **Vérifié automatiquement** : tests unitaires, test navigateur, Psalm, REUSE, matrice de captures 34/35/36 rejouable à chaque nouvelle version.
7. **Performance d'affichage** : le thème ne doit pas rendre Nextcloud perceptiblement plus lent que sans lui.
   - `:has()` s'écrit librement dans les sources (fonctions `reglage()`, `$fenetres`…), mais aucune feuille livrée ne garde un `:has()` hors de l'élément ciblé : dans Chromium, une seule règle « `X:has(…) … cible` » fait recalculer le style de tous les éléments qui ressemblent à sa cible à chaque modification du DOM. La compilation (`scripts/lower-has.js`) évalue ce que le serveur sait déjà (feuille de l'app, section des réglages) et confie le reste à des jetons posés par `js/azure-has.js` ; ne pas contourner cette étape.
   - Un `:has()` sur l'élément ciblé ne doit pas citer l'attribut `class` ou `style` (`[class*="_module_"]` des modules CSS, `[style*=…]`) : Chromium tiendrait alors chaque changement de classe de la page pour un changement possible de `:has()` (toutes les icônes recalculées à chaque fois). La compilation les confie aux jetons quand l'élément de départ porte une classe ou un identifiant, et signale les autres (« attention, :has() sujet qui cite class/style »), à réécrire.
   - Pas de `:is()` à plusieurs classes comme dernier composé (« `:is(.a, .b, .c) { … }` ») : Chromium ne sait pas ranger une telle règle et l'essaie sur chaque élément ; une liste simple (`.a, .b, .c`) a le même poids quand les classes pèsent autant.
   - Transitions : `transition: var(--azure-transition)` (couleurs, fond, bordure, opacité, transformation ; 200 ms, coupées sous `prefers-reduced-motion`), jamais `all`, jamais d'ombre, de filtre ni de dimension animés, aucun `will-change` permanent.
   - Une règle propre à une app va dans sa feuille (`azure-app-<app>.scss`), une règle propre à une section des réglages derrière `reglage()` : elles ne sont alors chargées que là où elles servent.

## Structure du code

- `scss/_palette.scss` : variables Nextcloud par thème (ne pas modifier sans raison).
- `scss/_themes.scss` : jetons Azure (`$colour-*`).
- `scss/settings/_mixins.scss` : boutons et contrôles partagés.
- `scss/<zone>/_<zone>.scss` : règles par app ; `_<zone>-v35.scss` etc. pour une version précise de Nextcloud.
- `scss/azure-theme.scss` : base commune, chargée sur toutes les pages connectées (composants partagés et tout ce qu'une app affiche hors de ses pages).
- `scss/azure-app-<app>.scss` : règles chargées sur les seules pages de l'app `<app>` (identifiant Nextcloud) ; en cas de doute, la règle va dans la base.
- `scss/azure-cadre.scss` : règles communes finales (cadre, colonne des réglages), chargées après la feuille de l'app.
- `scripts/lower-has.js` : retire des feuilles compilées les `:has()` hors de l'élément ciblé, sans changer la spécificité (vérifié à chaque compilation) ; écrit les variantes par section de la feuille des réglages et `js/azure-has.js` (moteur `src/azure-has.js` + table des jetons).
- `scripts/optimize-css.js` : allège chaque feuille compilée sans changer la cascade (vérifié à chaque compilation).
