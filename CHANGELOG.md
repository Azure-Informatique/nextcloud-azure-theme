<!--
  - SPDX-FileCopyrightText: 2026 Nexeno contributors
  - SPDX-FileCopyrightText: 2026 Azure Informatique
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->
# Journal des modifications

Les changements notables de ce projet sont consignés dans ce fichier.

## 1.1.5

### Corrections
- **Sites externes, fenêtre « Configurer le site »** et **Stockages externes, fenêtre « Ajouter un stockage »** : les champs étaient collés au bord gauche de la fenêtre alors que le titre et les boutons avaient une marge. Contenu et boutons sont désormais alignés sur le titre, à 16 px de chaque bord. Dans « Ajouter un stockage », le libellé du premier champ ne chevauche plus le filet sous le titre. Ordinateur et téléphone.
- **Tableau de bord au téléphone** : le statut et la météo étaient sur une même ligne, et une météo au libellé long débordait de l'écran à droite. Ils sont de nouveau l'un sous l'autre, centrés ; un libellé très long se termine par « … ». Rien ne change sur ordinateur.
- **Sélecteur de fichiers en thème sombre** (Assistant, Fichiers › Déplacer ou copier…) : le « + » du bouton « Nouveau » était noir sur le bleu du bouton ; il est blanc, comme le texte, dans les deux thèmes.
- **Agenda, éditeur complet d'un événement (« Plus de détails »)** sur ordinateur : la croix de fermeture touchait presque le coin arrondi de la fenêtre, ce qui se voyait surtout au survol. Elle est placée comme dans les autres fenêtres (10 px du haut, 16 px de la droite). Rien ne change au téléphone, où l'éditeur est en plein écran.
- **Contacts, en-tête de la fiche** : en modification, le bloc Nom / Fonction / Société était 13 px plus haut que le centre de l'avatar, à cause d'une zone d'actions vide sous les champs. Cette zone est masquée quand elle ne contient aucune action : le bloc est centré sur l'avatar, en modification comme pour un contact sans e-mail ni téléphone. Ordinateur et téléphone.
- **Fichiers, onglet Partage en thème sombre** : dans les pastilles bleues « Lien interne » et « Créer un lien de partage public » (puis « Lien de partage »), le dessin de l'icône était noir. Il est blanc, comme en thème clair, grâce à la variante d'origine fournie par Nextcloud. La pastille grise « Autres utilisateurs ayant accès » ne change pas.
- **LibreSign, listes de révocation des certificats** : les avatars de la première colonne étaient coupés à droite. La cellule retrouve la marge prévue par LibreSign (défaut de l'app, présent sans le thème) et l'avatar y est centré.
- **Réglages d'administration, Flux** : dans les cartes des flux disponibles, l'icône était collée en haut de la carte (13 px) mais à 32 px de son titre. Les marges sont équilibrées (20 px au-dessus, 12 px jusqu'au titre, 16 px sur les côtés et en bas), identiques pour toutes les cartes, y compris « Plus de flux » ; même chose dans les réglages personnels.
- **Réglages personnels, Disponibilités** : chaque créneau empilait l'heure de début, « à », l'heure de fin et la corbeille sur quatre lignes. Un créneau tient maintenant sur une ligne : le jour à gauche, puis « [début] à [fin] [corbeille] », et le « + » à droite (hauteur d'un jour : 157 → 60 px sur ordinateur, 241 → 121 px au téléphone). Au téléphone, les deux champs se partagent la largeur, sans débordement à 360 px, et la corbeille garde sa cible tactile de 44 px. Le bloc **Absence** occupe toute la largeur de la carte (600 px auparavant).

### Non-régression, sécurité et performances
- **Sécurité** : seules des feuilles de style changent ; aucun code PHP, JavaScript ou gabarit modifié, aucune dépendance ajoutée, aucune ressource externe. Le script d'accompagnement du thème est régénéré par la compilation avec une seule condition de plus (la fenêtre des Sites et Stockages externes). Psalm (y compris l'analyse des flux de données) et gitleaks : aucun signalement.
- **CSS compilé** comparé au paquet 1.1.4 règle par règle : seules les règles des corrections ci-dessus changent, dans les feuilles des écrans concernés.
- **Non-régression au pixel sur Nextcloud 34 et 35** (ordinateur et téléphone tactile, clair et sombre), 1.1.4 et 1.1.5 comparées dans les mêmes conditions : les écrans corrigés ne changent que dans les zones visées, et les écrans voisins (autres fenêtres, pages sans fenêtre, tableau de bord sur ordinateur, autres vues de LibreSign, flux configurés, fiche de contact en lecture, onglet Partage en clair) sont identiques.
- **Performances** mesurées en passes alternées 1.1.4 / 1.1.5 sur Nextcloud 34 et 35 (tableau de bord au téléphone, Disponibilités, Flux, Contacts, Fichiers) : aucune mesure en défaveur de la 1.1.5.

## 1.1.4

### Corrections
- **Tâches, fiche d'une tâche** : l'indication « Sélectionner un statut » n'apparaissait pas quand aucune valeur n'était encore choisie — le champ qui la porte était rétréci à zéro pixel par le thème ; il reprend sa largeur (elle était intacte sans le thème). Les listes qui affichent déjà une valeur ne changent pas.
- **Talk, nouvelle conversation au téléphone** : dans la fenêtre de création, les deux choix (conversation publique ou privée) débordaient de la fenêtre vers la droite de 32 à 35 px ; ils s'empilent désormais l'un au-dessus de l'autre et tiennent dans l'écran.
- **Talk au téléphone, actions sur un message** : la rangée de boutons qui apparaît au survol ou à l'appui débordait de l'écran à droite (le troisième bouton était coupé) ; ses boutons reviennent à la taille de Nextcloud au téléphone (24 px) et la rangée tient entièrement dans l'écran. La conversation au repos ne change pas, et le décalage de la liste qui survenait à l'ouverture du menu des actions disparaît.
- **Contacts au téléphone, croix d'effacement** : la croix qui efface une valeur (téléphone, adresse…) offrait une zone tactile de 18 px de côté ; elle monte à 24 px, sans occuper davantage de place à l'écran.
- **Notes, liste des notes** : chaque ligne ne pouvait être saisie que sur la bande de son texte (20 px de haut) ; la zone qui réagit au doigt couvre désormais toute la ligne, sans changer son aspect.
- **Tableau de bord (Nextcloud 35), fenêtre de statut** : le champ « Effacer le statut après » était écrasé à 18 px de haut (34 px sans le thème) ; il reprend la hauteur des autres champs.
- **Réglages, chevrons et croix des listes déroulantes au téléphone** (Langue et paramètres régionaux, fiche Tâches…) : leur zone tactile passe de 20 à 24 px, l'aspect à l'écran ne change pas (la marge compense).
- **Réglages d'administration, Équipes (Nextcloud 35) au téléphone** : les en-têtes de tri des colonnes offrent une zone tactile de 24 px de haut, au lieu de 20, sans changer l'aspect de la ligne.
- **Réglages d'administration, audit des partages en sombre** : l'icône de la carte « Total » retrouvait un contraste suffisant (elle passait sous le seuil de lisibilité des éléments d'interface en thème sombre).

### Présentation du projet
- **Fiche de l'app (App Store)** : huit captures en PNG (le magasin d'applications ne sert pas les captures WebP) — aperçu clair, aperçu sombre, Fichiers, Agenda, Talk, tableau de bord, téléphone et page de connexion.

### Non-régression, sécurité et performances
- **Sécurité** : seules des feuilles de style changent ; aucun code PHP, JavaScript ou gabarit modifié, aucune dépendance ajoutée, aucune ressource externe. Psalm (y compris l'analyse des flux de données) et gitleaks : aucun signalement.
- **CSS compilé** comparé au paquet 1.1.3 règle par règle : seules les règles des corrections ci-dessus changent ; le script d'accompagnement du thème est inchangé octet par octet.
- **Parcours complet 1.1.3 / 1.1.4 comparé au pixel sur Nextcloud 34 et 35** (4802 paires d'écrans : toutes les applications du parcours d'audit, ordinateur, tablette et téléphone tactile, clair et sombre) : aucun écart en dehors des éléments corrigés, aucune régression ; les 234 écarts relevés sont cantonnés aux zones des correctifs.
- **Performances mesurées sur Nextcloud 34** (12 passes alternées 1.1.3 / 1.1.4, 264 mesures, 11 écrans en ordinateur et téléphone) : aucune plage de mesures en défaveur de la 1.1.4 ; quatre plages vont dans son sens (jusqu'à 9,9 % plus vite vers l'élément utile).
- **Feuilles de style plus légères** : les règles dupliquées du menu des listes déroulantes, émises jusqu'ici une fois par feuille de réglages, ne sont plus produites qu'une fois (158 Ko de CSS en moins).

## 1.1.3

### Corrections
- **Agenda, événement en lecture seule** (agenda auquel on est abonné, par exemple un agenda Google) : l'icône du calendrier flottait seule au-dessus des dates, au milieu de la fenêtre sur ordinateur ; l'Agenda empilait l'icône et les dates. Elle est désormais dans la colonne des icônes, sur la ligne de la première date, et la ligne « Ne se répète pas » est alignée de même. Ordinateur et téléphone.
- **Agenda, champ Catégories de l'éditeur** : son libellé, posé dans le champ, collait à la bordure (2 px) ; il est aligné sur le texte des listes voisines (Statut, Lors du partage, Afficher comme).
- **Agenda au téléphone, barre du haut de l'éditeur** : la croix à gauche et *Enregistrer* à droite sur la même ligne, comme dans les applications mobiles, le titre en dessous, aligné sur les champs. Avant : *Enregistrer* seul en haut à gauche, croix et titre sur la ligne suivante.
- **Agenda au téléphone, haut de l'éditeur** : le titre, les dates (« De », « À », fuseau horaire) et la case « Journée entière » étaient décalés de 6 à 7 px vers la droite par rapport aux champs du dessous (lieu, description…) ; ils sont alignés sur le bord des champs. Le titre d'un événement modifiable reste toujours sur sa propre ligne, sur toute la largeur, sous la croix et le bouton (il venait à côté du bouton sur les téléphones de 390 px et plus).
- **Agenda, « Abandonner les modifications ? » depuis l'éditeur complet** (téléphone et ordinateur) : la fenêtre reçoit le cadre des autres confirmations ; son texte collait au bord gauche (la correction de la 1.1.1 ne couvrait que la fenêtre ouverte depuis la popup).
- **Paramètres, Intégration GitHub** (administration et personnel) : le contenu occupe toute la largeur de la carte ; le thème lui-même le bridait à 600 px.
- **Paramètres, Intégration Immich** : le formulaire occupe toute la largeur de la carte (bridé à 600 px par l'app).
- **Paramètres, Transfert de propriété** : le bloc « Transfert de fichiers » occupe toute la largeur de la carte (bridé à 450 px) ; sur ordinateur, les deux listes de comptes se partagent la largeur et la flèche est centrée sur les champs (elle était 15 px trop basse). Rien ne change au téléphone.

### Présentation du projet
- **Slogan** : « Nextcloud, upgraded by design » / « Votre Nextcloud, en version augmentée », repris dans le résumé de la fiche de l'app (App Store).
- **README** en deux fichiers, anglais (`README.md`) et français (`README.fr.md`), avec la mosaïque de l'app en visuel d'accueil (clair ou sombre selon le visiteur), une vitrine des écrans et les vraies captures de chaque langue.
- **Image de partage** du dépôt renouvelée (1280 × 640) ; **soutien** au projet par Ko-fi et Liberapay (`.github/FUNDING.yml`).

### Non-régression, sécurité et performances
- **Sécurité** : seules des feuilles de style changent ; aucun code PHP, JavaScript ou gabarit modifié, aucune dépendance ajoutée. Psalm (y compris l'analyse des flux de données) et gitleaks : aucun signalement.
- **CSS compilé** comparé au paquet 1.1.2 règle par règle : règles ajoutées uniquement dans la feuille de l'Agenda et dans celles des sections Comptes connectés, Immich et Transfert de propriété ; dans la feuille commune, une seule condition ajoutée au cadre des confirmations, vraie uniquement sur les pages de l'Agenda.
- **Parcours complet 1.1.2 / 1.1.3 comparé au pixel** (266 paires d'écrans : tableau de bord, Fichiers, Deck, Talk, Agenda dont un agenda Google en abonnement, Tâches, Formulaires, recherche, fenêtres, 46 pages de paramètres ; clair et sombre ; ordinateur et téléphone tactile) : seuls les éléments corrigés changent.
- **Nextcloud 34 et 35** : mêmes mesures au pixel près.
- **Performances identiques à la 1.1.2** (6 passes alternées) : éditeur d'Agenda 142,7 → 143,6 ms, page de paramètres GitHub 111,4 → 113,7 ms sur 20 chargements, défilement inchangé.

## 1.1.2

### Corrections
- **Agenda, éditeur complet d'un événement** (*Plus de détails*, ou création d'un événement quand l'Agenda ouvre directement l'éditeur complet) : sur ordinateur (1024 px et plus), fenêtre centrée aux coins arrondis, à la hauteur de son contenu (au plus la hauteur de l'écran, contenu défilant), au lieu d'occuper tout l'écran ; la mise en page sur deux colonnes de l'Agenda est conservée. Au téléphone, l'éditeur reste en plein écran, sans les 64 px vides au-dessus des boutons.
- **Agenda au téléphone, agenda de l'événement** (pastille de couleur et nom, par exemple « Personnel ») : la pastille est alignée sur la colonne des icônes et le nom sur le bord des champs ; elle tombait 33 à 38 px plus à droite. Rien ne change sur ordinateur.
- **Tableau de bord au téléphone** : Statut et Météo sur une seule ligne ; chaque pilule rétrécit au besoin et son texte se termine par « … ». Rien ne change sur ordinateur.
- **Fenêtres au téléphone (écran tactile)** : la croix de fermeture, agrandie à 44 px pour le doigt, est recentrée dans l'en-tête ; elle touchait la ligne sous le titre (recherche unifiée et autres fenêtres). Rien ne change à la souris.

### Publication
- Fiche de l'app (`info.xml`) : site du projet et quatre captures d'écran pour le Nextcloud App Store.

### Non-régression et performances
- CSS compilé comparé au paquet 1.1.1 : seules les règles ci-dessus changent.
- Parcours complet 1.1.1 / 1.1.2 comparé au pixel, en clair et en sombre, sur ordinateur et téléphone : seuls les éléments corrigés changent.
- Performances mesurées identiques à la 1.1.1.

## 1.1.1

### Corrections
- **Icônes des onglets de barre latérale** (Fichiers : Partage, Activité… ; Deck : Détails, Pièces jointes, Commentaires, Activité) : l'icône prend désormais exactement la couleur de son libellé. En clair, l'icône de l'onglet sélectionné restait noire sur le fond bleu, sous un libellé blanc ; elle est maintenant blanche. Les onglets non sélectionnés ont une icône du même gris que leur libellé, comme dans Talk, Formulaires et Tâches. Nextcloud imposait la couleur du texte principal à ces icônes (ancienne génération d'onglets).
- **Tableau de bord, fenêtre « Modifier les widgets »** (bouton *Personnaliser*) : les coins du haut sont arrondis comme ceux du bas ; le bandeau de titre, collant et à fond plein, les masquait.
- **Tableau de bord, message d'accueil** (« Bonjour… ») : 32 px d'espace sous l'en-tête sur ordinateur, 24 px au téléphone, au lieu de 15 px ; une règle de Nextcloud chargée après le thème annulait la marge prévue.
- **Agenda, « Abandonner les modifications ? »** (fermeture d'un nouvel événement non enregistré) : la fenêtre reçoit le cadre des autres confirmations ; son texte collait au bord gauche.
- **Transfert de propriété, « Confirmer le transfert »** : même cadre ; le bouton *Annuler* et l'encadré d'avertissement touchaient le bord gauche, et une bande vide restait sous les boutons.

### Non-régression et performances
- CSS et scripts compilés comparés au paquet 1.1.0 : seules les règles ci-dessus changent (vérifié règle par règle après normalisation des noms de jetons).
- Parcours complet 1.1.0 / 1.1.1 comparé au pixel, en clair et en sombre, sur ordinateur et téléphone : seuls les éléments corrigés changent.
- Aucune condition `:has()` coûteuse ajoutée ; performances mesurées identiques à la 1.1.0 (passes alternées, écarts sous 4 % dans les deux sens).

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
