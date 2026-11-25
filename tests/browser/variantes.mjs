/**
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Test navigateur des variantes : changement de palette sans rechargement, pause en contraste élevé.
 * Usage : node tests/browser/variantes.mjs <url Nextcloud> <utilisateur> <fichier du mot de passe> [chromium]
 * Il modifie les réglages d'apparence du compte de test, puis les remet comme avant.
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'

const [base, user, passFile, exe = '/usr/bin/chromium'] = process.argv.slice(2)
const pass = fs.readFileSync(passFile, 'utf8').trim()
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
let failures = 0
const check = (ok, label) => { console.log(`${ok ? 'OK ' : 'ÉCHEC'} ${label}`); if (!ok) failures++ }
const palette = page => page.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet]')]
	.filter(l => l.href.includes('azure-palette-')).map(l => (l.disabled ? 'désactivée:' : '') + l.href.match(/azure-palette-\w+/)[0]).join(','))

try {
	const page = await (await browser.newContext({ locale: 'fr-FR', viewport: { width: 1440, height: 900 } })).newPage()
	await page.goto(base + '/login')
	await page.fill('#user', user); await page.fill('#password', pass)
	await Promise.all([page.waitForURL(u => !u.pathname.startsWith('/login')), page.press('#password', 'Enter')])
	await page.goto(base + '/settings/user/theming', { waitUntil: 'load' })
	await page.waitForSelector('#azure_theme-enabled', { timeout: 20000 })
	// Thème Nextcloud d'origine du compte, remis à la fin.
	// Identifiant lu dans la classe de la carte cochée (« theming__preview--<id> ») : en Nextcloud 34 les boutons
	// radio n'ont pas d'attribut value (lu « on »), et le thème d'origine ne pouvait pas être remis.
	const originalTheme = await page.evaluate(() => {
		const card = document.querySelector('[class*="theming__preview--"] input:checked')?.closest('[class*="theming__preview--"]')
		const id = card && [...card.classList].map(c => /^theming__preview--([\w-]+)$/.exec(c)?.[1]).find(Boolean)
		return id || 'default'
	})

	// Point de départ : thème actif en variante système.
	await page.evaluate(() => { const t = document.getElementById('azure_theme-enabled'); if (!t.checked) t.click() })
	await page.click('label[for="azure_theme-variant-system"]')
	await page.waitForTimeout(1500)
	await page.reload({ waitUntil: 'load' }); await page.waitForSelector('#azure_theme-enabled')
	check((await palette(page)) === 'azure-palette-system', 'variante système chargée par le serveur')

	const marker = await page.evaluate(() => (window.__azureMarker = Math.random()))
	await page.click('label[for="azure_theme-variant-dark"]')
	await page.waitForTimeout(2000)
	check((await palette(page)) === 'azure-palette-dark', 'palette sombre échangée sur place')
	check((await page.evaluate(() => window.__azureMarker)) === marker, 'aucun rechargement de la page')
	const bg = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--color-main-background').trim())
	check(bg.toLowerCase() === '#0b0f1c', `fond sombre appliqué (${bg})`)

	await page.click('label[for="azure_theme-variant-light"]')
	await page.waitForTimeout(2000)
	check((await palette(page)) === 'azure-palette-light', 'palette claire échangée sur place')

	// Contraste élevé : le thème Azure se met en pause sans rechargement, puis revient.
	const hc = page.locator('.theming__preview--light-highcontrast input').first()
	check(!(await hc.isDisabled()), 'le contraste élevé reste sélectionnable')
	await page.evaluate(() => document.querySelector('.theming__preview--light-highcontrast input').click())
	await page.waitForTimeout(2500)
	check((await palette(page)).startsWith('désactivée:'), 'thème Azure en pause en contraste élevé')
	await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500)
	check((await palette(page)) === '', 'aucune feuille Azure chargée en contraste élevé (côté serveur)')
	const card = await page.locator('label[for="azure_theme-variant-dark"].azure_theme-theme-card__preview').boundingBox()
	check(!!card && card.width > 100 && card.height > 50, 'carte de réglages et aperçus visibles en contraste élevé')
	await page.evaluate(id => document.querySelector(`.theming__preview--${id} input`)?.click(), originalTheme)
	await page.waitForTimeout(1500)
	await page.reload({ waitUntil: 'load' }); await page.waitForSelector('#azure_theme-enabled')
	check(!(await page.evaluate(() => document.body.hasAttribute('data-theme-light-highcontrast'))), `thème Nextcloud d'origine remis (${originalTheme})`)
	await page.waitForTimeout(1500)
	await page.click('label[for="azure_theme-variant-system"]').catch(() => {})
	await page.waitForTimeout(1500)
} finally {
	await browser.close()
}
console.log(failures === 0 ? 'Tous les contrôles passent.' : `${failures} contrôle(s) en échec.`)
process.exit(failures === 0 ? 0 : 1)
