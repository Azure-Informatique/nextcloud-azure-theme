<!--
  - SPDX-FileCopyrightText: 2026 Azure Informatique
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->
# Certification du Thème Azure 1.1.1

Ce document rassemble les vérifications menées avant la publication du Thème Azure 1.1.1 et de la 1.1.0 qu'elle corrige. Elles ont été faites sur des instances de test dédiées (jamais sur des données réelles), puis la version a été déployée et vérifiée sur une instance de production Nextcloud 34.0.6.

| Élément | Valeur |
|---|---|
| Version certifiée | 1.1.1 — étiquette `v1.1.1` (correctif de la 1.1.0, certifiée en totalité ci-dessous) |
| Nextcloud | **34.0.6 : vérification complète** ; 35.0.3 et 36.0.0 (préversion du 24 novembre 2026) : contrôle des écrans clés |
| Navigateur | Chromium 156 (ordinateur 1440 × 900, tablette 1024 et 768, téléphone 390 et 360 par émulation) |
| Outils | Playwright, axe-core 4.14, PHPUnit 13, Psalm 6 (avec `--taint-analysis`), REUSE 3.3, gitleaks 8 |
| Date | 25 novembre 2026 |

## Version 1.1.1 : correctifs et non-régression

La 1.1.1 corrige cinq points d'affichage, sans autre changement :

1. **Onglets de barre latérale** (ancienne génération : Fichiers, Deck) : l'icône prend la couleur de son libellé ; en clair, celle de l'onglet sélectionné était noire sur le fond bleu, elle est blanche.
2. **Tableau de bord, « Modifier les widgets »** : coins du haut arrondis.
3. **Tableau de bord, message d'accueil** : 32 px sous l'en-tête (24 px au téléphone) au lieu de 15 px.
4. **Agenda, « Abandonner les modifications ? »** : cadre des confirmations (texte collé au bord gauche).
5. **Transfert de propriété, « Confirmer le transfert »** : cadre des confirmations (bouton et avertissement collés au bord gauche, bande vide sous les boutons).

| Contrôle | Résultat |
|---|---|
| CSS et scripts compilés, comparés au paquet 1.1.0 publié | 5 fichiers sur 157 changent ; après normalisation des noms de jetons `:has`, il ne reste que les règles des cinq corrections ; la liste des fenêtres de confirmation est identique à l'ajout de `.transfer-graph` près |
| Couleur icône / libellé des onglets (Fichiers, Deck, Talk, Formulaires, Tâches ; clair et sombre ; ordinateur et téléphone) | 0 écart sur 112 onglets relevés ; avant correction, toutes les icônes de Fichiers et Deck étaient en écart, aucune ailleurs |
| Parcours complet 1.1.0 / 1.1.1 au pixel (16 écrans : tableau de bord, Fichiers, Deck, Talk, Agenda, Tâches, Formulaires, paramètres, six fenêtres de confirmation ; clair et sombre ; 1440 × 900 et 390 × 844) | seuls les éléments corrigés changent : icônes d'onglets (Fichiers, Deck, y compris derrière une fenêtre), tableau de bord descendu, fenêtres « Modifier les widgets » et « Confirmer le transfert » ; tout le reste est identique au pixel. Trois écarts sans lien avec le thème, vérifiés : exemple de pronoms tiré au hasard par Nextcloud, panneau « Tâches non planifiées » de l'Agenda resté ouvert (paire refaite : identique), 5 px de lissage sur l'arrondi d'un onglet de Talk |
| Fenêtres de confirmation (Nextcloud standard dans 8 apps, Contacts, AppAPI) | mesures identiques à la 1.1.0 (texte à 21 px, boutons à 17 ou 21 px des bords) |
| Performances (recalcul de style et mise en page, passes alternées 1.1.0 / 1.1.1) | médianes de 3 tours (recalcul de style, ms) : barre latérale de Fichiers 792 → 815, changement d'onglet 286 → 296, défilement 26,9 → 21,6, fenêtre de confirmation 69 → 63, « Personnaliser » 52 → 54 ; écarts dans les deux sens, sous 4 % : bruit de mesure, aucune baisse |
| Tests PHPUnit | 113 tests, 217 assertions : tout passe |
| Tests navigateur `jetons.mjs` et `variantes.mjs` | tout passe |
| Psalm, ESLint, Stylelint | aucun nouveau signalement (remarques existantes inchangées) |
| gitleaks | aucune fuite |
| Production (Nextcloud 34.0.6) | déployée et vérifiée le 25 novembre 2026 |

Agenda 6 ouvre les événements dans une fenêtre sans onglets : il n'est pas concerné par le point 1. Dans l'en-tête, le nom de l'app et le bouton du menu sont centrés sur la même ligne (28 px) ; l'encre des points du bouton est 1,5 px plus bas que celle du texte, ce qui tient au dessin de l'icône : rien n'a été modifié. Les sections suivantes restent celles de la certification complète de la 1.1.0, toujours valables pour la 1.1.1.

**Conclusion : le Thème Azure 1.1.1 est certifié.** Aucune faille de sécurité connue, aucune fuite de données, aucune régression fonctionnelle, aucun défaut d'affichage dû au thème sur les écrans vérifiés, et des performances au moins équivalentes à celles de Nextcloud sans le thème.

## 1. Sécurité

Revue indépendante du code de la 1.1.0 (différence complète avec la 1.0.0) :

- **Nouvelle route d'administration** (`PUT /apps/azure_theme/app-menu`) : anonyme → 401, compte ordinaire → 403, sans jeton CSRF → 412, autres méthodes → 405 ; réservée aux administrateurs.
- **Choix des feuilles par section de réglages** : le nom de section est filtré par liste blanche ; essais de traversée de chemin (`..%2F..`, `%2e%2e`, `%00`, balises, guillemets, 3 000 caractères) sur 34, 35 et 36 : aucune traversée, aucune fuite d'information.
- **Script `js/azure-has.js`** : aucune injection HTML (`innerHTML`, `eval`, `new Function`), aucune donnée de la page dans un sélecteur, pas de boucle de l'observateur, conforme à la CSP (chargé avec nonce), repli propre si le navigateur ou le script échoue.
- **PHP** : rien ne s'exécute sur les requêtes OCS, WebDAV ou AJAX ; coût par page limité à quelques tests de fichiers.
- **Corrigé dans cette version** : désactiver l'app effaçait les réglages de tous les comptes (Nextcloud joue les étapes de désinstallation à chaque désactivation). L'effacement passe désormais par une commande explicite, `occ azure_theme:purge-settings --force`.
- **Contrôles automatiques** : Psalm avec analyse de flux sans erreur ; gitleaks sur tout l'historique (252 commits) et sur le paquet : aucune fuite ; REUSE 3.3 conforme.

## 2. Non-régression fonctionnelle

- **113 tests unitaires** PHPUnit, tous verts (commande de purge, page de réglages, choix des feuilles, migration de compte…).
- **`tests/browser/variantes.mjs`** (10 contrôles) : palette choisie par le serveur, changement de variante sans rechargement, pause en contraste élevé, thème d'origine remis — vérifié avec l'app installée dans `apps/` et dans `custom_apps/`.
- **`tests/browser/jetons.mjs`** (41 relevés) : les conditions converties à la compilation donnent exactement le même résultat que les `:has()` natifs sur toutes les pages et fenêtres testées ; un balayage indépendant a fait 8 millions de comparaisons sans écart.
- Thème imposé par l'administrateur (`enforce_theme`), restriction à des groupes, contraste élevé, police pour la dyslexie, option « Afficher Thème Azure dans le menu des applications » : vérifiés.

## 3. Rendu

**Méthode.** Huit audits indépendants, deux passes de contre-vérification et un dernier balayage, chacun comparant chaque écran à la même page sans le thème : débordements (page et conteneurs), texte coupé, **mots coupés en pleine lettre**, chevauchements, centrages au pixel, boutons ronds, contrastes (axe et pixels), textes d'au moins 13 px, cibles tactiles de 44 px au téléphone, focus clavier, erreurs de console ; puis relecture des captures par un regard design (grilles d'Emil Kowalski et UI/UX Pro Max).

**Couverture (Nextcloud 34.0.6).** Toutes les pages de réglages personnels et d'administration (48), la gestion des comptes, le magasin d'applications ; Fichiers (vues, barre latérale, partage, sélecteur, visionneuses, Text, chiffrement de bout en bout), Photos, Talk (dont l'appel), Agenda, Contacts, Tâches, Deck, Notes, Formulaires, Favoris, Musique, tableau de bord, menus de l'en-tête et recherche ; connexion, double authentification, pages d'erreur et toutes les pages publiques (partages, dépôt, mot de passe, formulaire public, rendez-vous, Talk invité). Cinq largeurs (1440, 1024, 768, 390, 360), clair et sombre.

| Mesure | Résultat |
|---|---|
| Dernier balayage automatique | 3 048 états d'écran : 0 défaut restant dû au thème après corrections |
| Débordement, mot coupé, texte < 13 px, chevauchement dus au thème | **0** |
| Contrastes dus au thème | **0** sous 4,5:1 (texte) / 3:1 (contours) |
| Regard design final | **9,3 / 10**, aucun défaut visible |
| Nextcloud 35.0.3 et 36.0.0 | aucune casse |

## 4. Performances

Mesures sur Nextcloud 34.0.6, banc isolé sur des cœurs dédiés, charge de la machine relevée à chaque passe (1 à 3), trois tours alternés **sans thème / 1.0.0 / 1.1.0** ; médianes.

| Mesure | Sans thème | 1.0.0 | **1.1.0** |
|---|---|---|---|
| Fichiers utilisable, cache froid | 8,0 s | 7,6 s | **6,4 s** |
| Fichiers utilisable, cache chaud | 6,1 s | 5,7 s | **4,6 s** |
| Talk utilisable, cache chaud | 3,4 s | 3,9 s | **3,0 s** |
| Réglages perso utilisables, cache chaud | 2,1 s | 2,6 s | **1,8 s** |
| Défilement de Fichiers (300 fichiers) | 16 img/s | 9,5 img/s | **39 img/s** |
| Ouverture de la barre latérale (INP) | 288 ms | 552 ms | **192 ms** |
| Menu des applications (INP) | 216 ms | 64 ms | **24 ms** |
| Saisie dans la recherche (INP) | 208 ms | 232 ms | **72 ms** |

Causes corrigées depuis la 1.0.0 : les sélecteurs `:has()` portant sur un ancêtre (environ 19 000, qui faisaient recalculer le style de toute la page à chaque modification) sont résolus à la compilation ; chaque page de réglages ne charge que sa section (≈ 80 Ko au lieu de 1 Mo) ; transitions limitées aux couleurs, opacité et transformations. Il reste un surcoût de calcul de style au chargement de certaines pages (+12 à +58 %, soit 50 à 180 ms), sans effet sur les temps perçus.

## 5. Applications testées

Vérifiées sur Nextcloud 34.0.6 avec les versions ci-dessous (écrans de l'app et ses pages de réglages, ordinateur et téléphone, clair et sombre).

| Application | Identifiant | Version testée |
|---|---|---|
| Assistant | `assistant` | 3.5.1 |
| Favoris (Bookmarks) | `bookmarks` | 16.2.7 |
| Agenda (Calendar) | `calendar` | 6.7.0 |
| Contacts | `contacts` | 8.10.0 |
| Context Chat | `context_chat` | 5.6.0 |
| Chiffrement de bout en bout | `end_to_end_encryption` | 2.6.0 |
| Sites externes | `external` | 9.0.1 |
| Visionneuse 3D | `files_3dmodelviewer` | 0.0.21 |
| Contrôle d’accès aux fichiers | `files_accesscontrol` | 5.0.1 |
| Étiquetage automatique | `files_automatedtagging` | 5.0.1 |
| Notifications de Flux | `flow_notifications` | 5.0.0 |
| Formulaires (Forms) | `forms` | 5.4.3 |
| Impersonate | `impersonate` | 5.0.0 |
| Intégration GitHub | `integration_github` | 3.3.0 |
| Intégration Google | `integration_google` | 4.4.0 |
| Intégration Immich | `integration_immich` | 1.7.0 |
| Intégration OpenAI | `integration_openai` | 4.5.2 |
| LibreSign | `libresign` | 14.2.9 |
| Musique | `music` | 3.3.1 |
| Notes | `notes` | 6.1.1 |
| Notifications push | `notify_push` | 1.4.2 |
| Fournisseur OpenID Connect | `oidc` | 2.6.3 |
| ONLYOFFICE | `onlyoffice` | 10.2.1 |
| Transfert de propriété | `ownershiptransfer` | 1.6.0 |
| Preview Generator | `previewgenerator` | 5.15.0 |
| Avertissement de quota | `quota_warning` | 1.25.0 |
| Share Audit | `share_audit_dashboard` | 0.8.2 |
| Partage par e-mail | `socialsharing_email` | 4.1.0 |
| Talk | `spreed` | 24.0.8 |
| Talk Matterbridge | `talk_matterbridge` | 1.35.1026000 |
| Tâches | `tasks` | 0.18.1 |
| 2FA (admin) | `twofactor_admin` | 4.13.0 |
| 2FA par e-mail | `twofactor_email` | 3.6.0 |
| 2FA WebAuthn | `twofactor_webauthn` | 2.7.1 |
| Migration de compte | `user_migration` | 10.5.0 |
| Tableau blanc | `whiteboard` | 2.1.2 |
| Conversion PDF (Flux) | `workflow_pdf_converter` | 5.0.0 |
| Deck | `deck` | 1.18.7 |
| Photos | `photos` | 7.0.0 |

Applications livrées avec Nextcloud 34.0.6 également vérifiées : activity, app_api, appstore, bruteforcesettings, circles, cloud_federation_api, comments, contactsinteraction, dashboard, dav, federatedfilesharing, federation, files, files_downloadlimit, files_external, files_lock, files_pdfviewer, files_reminders, files_sharing, files_trashbin, files_versions, logreader, lookup_server_connector, notifications, oauth2, password_policy, profile, provisioning_api, recommendations, serverinfo, settings, sharebymail, suspicious_login, systemtags, text, theming, twofactor_backupcodes, twofactor_nextcloud_notification, twofactor_totp, user_status, viewer, weather_status, webhook_listeners, workflowengine.

## 6. Dépôt

| Contrôle | Résultat |
|---|---|
| Licences | AGPL-3.0-or-later ; police Ubuntu Sans sous UFL 1.0 ; REUSE 3.3 conforme |
| Secrets | gitleaks : aucune fuite (historique et paquet) |
| Paquet | `make appstore` : archive d'environ 1,8 Mo, fichiers d'exécution uniquement (aucun test, aucune source SCSS, aucune dépendance de développement) |

## 7. Réserves

- **Non thémable par nature :** l'éditeur ONLYOFFICE (servi par son propre serveur), la toile du Tableau blanc, la vidéo des appels Talk, les contenus intégrés d'autres sites, le contenu des courriels.
- **Applications au design propre :** une application qui écrit ses couleurs en dur les garde ; le cadre (en-tête, navigation, menus, fenêtres) reste aux couleurs d'Azure.
- **Nextcloud 35 et 36 :** contrôle des écrans clés seulement ; 36 était en préversion, à revérifier à sa sortie. La navigation entre sections de réglages recharge la page dans ces versions : à revérifier si une version future la rendait instantanée.
- **Non couvert :** Safari, vrais téléphones (émulation), pages d'erreur 500 et de maintenance.
- **Logo d'en-tête :** l'en-tête est blanc en clair ; le logo choisi dans Theming doit être lisible sur fond clair.
