/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// Must run before any module that imports an image, so it stays first.
/* eslint-disable perfectionist/sort-imports */
import './publicPath.js'
import { translate as t } from '@nextcloud/l10n'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
/* eslint-enable perfectionist/sort-imports */

// Titre de l'onglet : Nextcloud le compose à partir de l'entrée active du menu des applications.
// Quand l'administrateur retire Thème Azure de ce menu, il ne reste que « Nextcloud » : le nom de
// l'app est alors ajouté devant (« Thème Azure - Nextcloud »), comme pour les autres apps.
const appName = t('azure_theme', 'Azure Theme')
if (!document.title.startsWith(appName)) {
	document.title = appName + ' - ' + document.title.trim()
}

const mountPoint = document.getElementById('azure_theme')
if (mountPoint) {
	createApp(App).use(router).mount(mountPoint)
}
