<!--
  - SPDX-FileCopyrightText: 2026 Nexeno contributors
  - SPDX-FileCopyrightText: 2026 Azure Informatique
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->
# Journal des modifications

Les changements notables de ce projet sont consignés dans ce fichier.

## 1.1.0

### Performances

Avec le thème, les pages de Nextcloud sont utilisables aussi vite que sans lui, voire plus vite, et défilement, menus, barre latérale et recherche réagissent aussi vite (la version 1.0.0 doublait ou triplait le travail de mise en forme du navigateur).

- **Plus de `:has()` hors de l'élément ciblé dans les feuilles livrées.** Dans Chromium, chacune de ces règles faisait recalculer le style de tous les éléments ressemblant à sa cible à chaque modification de la page (défilement de Fichiers à 8 images/s, ouverture de la barre latérale ou d'un menu plusieurs fois plus lente). La compilation résout les conditions connues du serveur et remplace les autres par des attributs `data-azure-has` posés par un petit script (`js/azure-has.js`) ; la spécificité de chaque sélecteur est vérifiée identique.
- **Un attribut par condition (`data-azure-has-<jeton>`)** au lieu d'une liste dans un attribut commun : Chromium range ses invalidations et son filtre des ancêtres par nom d'attribut, si bien que poser une seule condition (ouverture de la visionneuse…) faisait recalculer tous les éléments visés par n'importe quelle règle conditionnelle. Les `:has()` sur l'élément ciblé dont l'argument cite l'attribut `class` (classes de modules CSS) passent aussi par ces attributs : un seul suffisait pour que chaque changement de classe de la page recalcule toutes ses icônes. Ouverture d'un document Markdown dans Text : 38 % d'éléments recalculés en trop ramenés à 5 %.
- **Feuille des réglages par section** : chaque page de réglages ne charge que les règles de sa section (environ 80 Ko au lieu de 1 Mo).
- **Transitions** limitées aux couleurs, fonds, bordures, opacité et transformations, en 200 ms, jamais `all`, coupées quand le système demande moins d'animations.
- La feuille d'une app n'est plus chargée sur les pages de cette app sans mise en page Nextcloud (pages invité ou d'erreur, qui gardent l'apparence de la connexion).
- Nouveau test navigateur `tests/browser/jetons.mjs`.

### Nouveautés
- **Entrée du menu des applications** : un interrupteur réservé aux administrateurs (*Apparence et accessibilité*) retire l'icône Thème Azure du menu pour tout le monde ; le choix de variante reste dans les paramètres, la page de l'app reste accessible. Aussi par `occ config:app:set azure_theme app_menu --value=no`.
- **Commande `occ azure_theme:purge-settings --force`** : efface toutes les préférences du thème avant de supprimer l'app.

### Corrections
- **Désactiver l'app ne perd plus rien.** Nextcloud joue les étapes de désinstallation à chaque désactivation : la 1.0.0 effaçait alors la variante de chaque compte et les réglages de l'app. L'effacement passe désormais par la commande ci-dessus, explicite.
- **Affichage revu sur tout Nextcloud 34**, après un audit complet (ordinateur et téléphone, clair et sombre, cinq largeurs, 90 applications) : connexion et double authentification, pages publiques, en-tête et barre de recherche (contour lisible, champ de 40 px), menus d'actions, fenêtres et sélecteur de fichiers, Fichiers, Photos, Text (tableaux), Talk, Agenda, Tâches, Signets, tableau de bord centré, paramètres personnels et d'administration (pastilles de groupe, Partage, Paramètres de base, Sécurité, Disponibilités, Share Audit, OpenID Connect, LibreSign, Flux…), chiffrement de bout en bout, notes d'avertissement, profil public. Aucun débordement, aucun mot coupé, textes d'au moins 13 px, cibles tactiles de 44 px au téléphone.
- **Nextcloud 36** : pages de réglages remises en cartes (nouvelle structure de Nextcloud 36).
- Désactiver le thème depuis sa carte recharge la page pour rétablir aussitôt l'apparence de Nextcloud.
- Plus aucune règle ne dépend d'un libellé traduit (interface identique dans toutes les langues).
- Entrée du thème traduite dans la migration de compte.
- Changement de variante sur place (sans rechargement) aussi quand l'app est installée dans `custom_apps/` (image Docker officielle, magasin d'applications).
- Tableau de bord : boutons de statut et de météo centrés sous le titre.
- Menu de gauche : de l'air au-dessus et au-dessous du filet du bloc du bas (quota, réglages, corbeille).

### Langues
- Anglais et français uniquement (les autres traductions sont retirées).


## 1.0.0

Première version.

- **Identité Azure Informatique** : couleurs, police Ubuntu Sans et formes du site azure-informatique.fr, à plat, sans effet de verre ni ombre au repos.
- **Variantes** Thème du système, Azure clair et Azure sombre, choisies par chaque utilisateur, ou thème désactivé ; actif par défaut en variante « Thème du système ». Changement de variante sans rechargement de la page.
- **Tout Nextcloud** : en-tête, navigation, menus, fenêtres, réglages, magasin d'applications, et les applications courantes (Fichiers, Photos, Talk, Agenda, Contacts, Tâches, Deck, Notes, Mail, Formulaires, Signets…), pour Nextcloud 34, 35 et 36. Les applications sans règle dédiée héritent du thème par les variables de Nextcloud.
- **Pages invité et publiques** : connexion, double authentification, erreurs, partages par lien, formulaires et rendez-vous publics. Les administrateurs peuvent désactiver l'apparence de la page de connexion.
- **Accessibilité** : contrastes WCAG AA ; les thèmes contraste élevé, la préférence de contraste renforcé de l'appareil et la police pour la dyslexie restent prioritaires ; focus clavier visible.
- **Administration** : respect du thème imposé (`enforce_theme`) et de la restriction de l'application à des groupes ; suppression propre de l'application.
- **Sécurité et durabilité** : uniquement l'API publique de Nextcloud, aucun script en ligne, aucune ressource externe ; une seule feuille commune légère et une feuille par application.
- **Page de l'application** avec aperçu des variantes ; variante incluse dans la migration de compte.
- **Traductions** : anglais, allemand (tutoiement et vouvoiement), français, néerlandais, italien, espagnol, suédois, danois, norvégien, finnois, tchèque et portugais (Brésil).
