/**
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Compile les feuilles du thème chargées sur les pages connectées :
 *
 *   scss/azure-theme.scss      → css/azure-theme.css      (base commune, toutes les pages)
 *   scss/azure-app-<app>.scss  → css/azure-app-<app>.css  (pages de l'app seulement)
 *   scss/azure-cadre.scss      → css/azure-cadre.css      (règles communes finales)
 *
 * Toute nouvelle scss/azure-app-<app>.scss est prise en compte sans rien changer ici ; ses
 * compléments par version (azure-app-<app>-vNN.scss) passent par scripts/build-version-css.js.
 * L'ordre de chargement est fixé par lib/Listener/BeforeTemplateRenderedListener.php.
 *
 * Usage : node scripts/build-theme-css.js [--watch]
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const watch = process.argv.includes('--watch')

const entries = ['azure-theme', 'azure-cadre']
for (const file of fs.readdirSync(path.join(root, 'scss')).sort()) {
	const match = /^(azure-app-[a-z0-9_]+)\.scss$/.exec(file)
	if (match && !/-v\d+$/.test(match[1])) {
		entries.push(match[1])
	}
}
const pairs = entries.map((name) => `scss/${name}.scss:css/${name}.css`)
const args = watch
	? ['--no-source-map', '--style=expanded', '--watch', ...pairs]
	: ['--no-source-map', '--style=compressed', ...pairs]

const result = spawnSync(path.join(root, 'node_modules', '.bin', 'sass'), args, { cwd: root, stdio: 'inherit' })
process.exit(result.status ?? 1)
