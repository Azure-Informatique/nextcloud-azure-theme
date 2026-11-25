import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
/**
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Test navigateur des jetons :has() (scripts/lower-has.js, src/azure-has.js).
 *
 * Les feuilles compilées remplacent les :has() hors de l'élément ciblé par l'attribut [data-azure-has-<jeton>],
 * tenu à jour par js/azure-has.js. Ce test vérifie, page par page et après des interactions qui ouvrent
 * fenêtres, menus, visionneuse (image et document Text), barre latérale et recherche, que chaque jeton dit
 * exactement la même chose que le :has() d'origine évalué par le navigateur : pour tout élément de départ
 * possible, attribut présent ⇔ el.matches(':has(ARG)'). Il vérifie aussi qu'aucune feuille chargée ne contient encore
 * de :has() hors sujet, à part ceux que la compilation laisse natifs (état non observable dans le DOM).
 *
 * Usage : node tests/browser/jetons.mjs <url Nextcloud> <utilisateur> <fichier du mot de passe> [chromium]
 * Le compte doit être administrateur (pages d'administration). Le test ne modifie aucune donnée.
 * Code de sortie : 0 si tout concorde, 1 sinon.
 */
import { chromium } from 'playwright-core'

const [baseArg, user, passFile, exe = '/usr/bin/chromium'] = process.argv.slice(2)
if (!baseArg || !user || !passFile) {
	console.error('Usage : node tests/browser/jetons.mjs <url> <utilisateur> <fichier du mot de passe> [chromium]')
	process.exit(2)
}
const base = baseArg.replace(/\/$/, '')
const pass = fs.readFileSync(passFile, 'utf8').trim()
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const engine = fs.readFileSync(path.join(root, 'js', 'azure-has.js'), 'utf8')
const TABLE = JSON.parse(/const TABLE = (\{.*\})\n/.exec(engine)[1])

let failures = 0
let checks = 0
function check(ok, label) {
	console.log(`${ok ? 'OK ' : 'ÉCHEC'} ${label}`)
	if (!ok) {
		failures++
	}
}

/** Compare jetons et :has() natif dans la page ; renvoie le détail des écarts. */
function compare(table) {
	const used = new Set()
	document.querySelectorAll('link[rel="stylesheet"][href*="/azure_theme/css/"]').forEach((link) => {
		const m = /\/azure_theme\/css\/([\w-]+)\.css/.exec(link.getAttribute('href'))
		;((m && table.sheets[m[1]]) || []).forEach((id) => used.add(id))
	})
	const wrong = []
	let compared = 0
	let holders = 0
	const name = (el) => `<${el.localName}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}>`
	for (const id of used) {
		const [arg, anchors] = table.tokens[id]
		const test = ':has(' + arg + ')'
		const attr = 'data-azure-has-' + id
		const seen = new Set()
		for (const [selector] of anchors) {
			for (const el of document.querySelectorAll(selector)) {
				seen.add(el)
				const native = el.matches(test)
				const token = el.hasAttribute(attr)
				compared++
				holders += token ? 1 : 0
				if (native !== token) {
					wrong.push(`${id} ${test} sur ${name(el)} : natif ${native}, jeton ${token}`)
				}
			}
		}
		document.querySelectorAll(`[${attr}]`).forEach((el) => {
			if (!seen.has(el) && el.isConnected) {
				wrong.push(`${id} posé hors des éléments de départ sur ${name(el)}`)
			}
		})
	}
	// Aucun :has() hors sujet ne doit rester dans les feuilles du thème (hors exceptions natives) :
	// analyse liste → sélecteur complexe → composés → :is()/:where()/:not() imbriqués.
	const NATIVE = /:focus|:checked|:placeholder-shown/
	const split = (text, isSep) => {
		const parts = []
		let depth = 0
		let bracket = false
		let start = 0
		for (let i = 0; i < text.length; i++) {
			const c = text[i]
			if (c === '[') {
				bracket = true
			} else if (c === ']') {
				bracket = false
			} else if (!bracket && c === '(') {
				depth++
			} else if (!bracket && c === ')') {
				depth--
			} else if (!bracket && depth === 0 && isSep(c)) {
				parts.push(text.slice(start, i))
				start = i + 1
			}
		}
		parts.push(text.slice(start))
		return parts.map((p) => p.trim()).filter(Boolean)
	}
	const nonSubject = (complex, subject) => {
		const compounds = split(complex, (c) => c === ' ' || c === '>' || c === '+' || c === '~')
		let count = 0
		compounds.forEach((compound, i) => {
			const isSubject = subject && i === compounds.length - 1
			const re = /:(has|is|where|not|matches)\(/g
			let m
			while ((m = re.exec(compound))) {
				let depth = 1
				let j = m.index + m[0].length
				for (; j < compound.length && depth > 0; j++) {
					depth += compound[j] === '(' ? 1 : compound[j] === ')' ? -1 : 0
				}
				const inner = compound.slice(m.index + m[0].length, j - 1)
				if (m[1] === 'has') {
					count += !isSubject && !NATIVE.test(inner) ? 1 : 0
				} else {
					split(inner, (c) => c === ',').forEach((arg) => {
						count += nonSubject(arg, isSubject)
					})
				}
				re.lastIndex = j
			}
		})
		return count
	}
	let leftovers = 0
	for (const sheet of document.styleSheets) {
		if (!sheet.href || !sheet.href.includes('/azure_theme/css/')) {
			continue
		}
		const walk = (rules) => {
			for (const r of rules) {
				if (r.selectorText) {
					split(r.selectorText, (c) => c === ',').forEach((complex) => {
						leftovers += nonSubject(complex, true)
					})
				} else if (r.cssRules) {
					walk(r.cssRules)
				}
			}
		}
		walk(sheet.cssRules)
	}
	return { tokens: used.size, compared, holders, wrong: wrong.slice(0, 15), wrongCount: wrong.length, leftovers }
}

const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--password-store=basic'] })
try {
	const context = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1440, height: 900 } })
	const page = await context.newPage()
	await page.goto(base + '/login')
	await page.fill('#user', user)
	await page.fill('#password', pass)
	await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/login')), page.press('#password', 'Enter')])

	const settle = async (ms = 800) => {
		await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
		await page.waitForTimeout(ms)
	}
	const verify = async (label) => {
		const r = await page.evaluate(compare, TABLE)
		checks++
		check(r.wrongCount === 0 && r.leftovers === 0, `${label} : ${r.tokens} jetons, ${r.compared} éléments comparés, ${r.holders} jetons posés`
		+ (r.wrongCount ? `, ${r.wrongCount} écart(s) : ${r.wrong.join(' | ')}` : '')
		+ (r.leftovers ? `, ${r.leftovers} :has() hors sujet restant(s)` : ''))
	}
	const visit = async (url, label, wait) => {
		await page.goto(base + url, { waitUntil: 'domcontentloaded' })
		if (wait) {
			await page.waitForSelector(wait, { timeout: 20000 }).catch(() => {})
		}
		await settle()
		await verify(label)
	}
	const step = async (label, action) => {
		try {
			await action()
			await page.waitForTimeout(700)
			await verify(label)
		} catch (e) {
			console.log(`(étape « ${label} » non jouée : ${e.message.split('\n')[0]})`)
		}
		await page.keyboard.press('Escape').catch(() => {})
		await page.waitForTimeout(300)
	}

	check(engine.includes('@@AZURE_HAS_TABLE@@') === false && Object.keys(TABLE.tokens).length > 0, `table des jetons compilée (${Object.keys(TABLE.tokens).length} jetons)`)

	await visit('/apps/files/', 'Fichiers', '[data-cy-files-list-row]')
	check(await page.evaluate(() => [...document.scripts].some((s) => s.src.includes('/azure_theme/js/azure-has.js'))), 'script des jetons chargé')
	await step('Fichiers, menu Nouveau', async () => {
		await page.click('[data-cy-upload-picker] button, .upload-picker button')
	})
	await step('Fichiers, fenêtre Nouveau dossier', async () => {
		await page.click('[data-cy-upload-picker] button, .upload-picker button')
		await page.waitForTimeout(400)
		await page.click('[role="menuitem"]:has-text("Nouveau dossier"), button:has-text("Nouveau dossier")')
		await page.waitForSelector('.modal-container', { timeout: 5000 })
	})
	await step('Fichiers, menu d\'actions et barre latérale', async () => {
		await page.click('[data-cy-files-list-row] .files-list__row-actions button[aria-label="Actions"]')
		await page.waitForTimeout(400)
		await verify('Fichiers, menu d\'actions ouvert')
		await page.click('li[data-cy-files-list-row-action="details"] button')
		await page.waitForSelector('.app-sidebar', { timeout: 5000 })
	})
	await step('Fichiers, paramètres de Fichiers', async () => {
		await page.click('[data-cy-files-navigation-settings-button], .app-navigation-entry:has-text("Paramètres de Fichiers") a, button:has-text("Paramètres de Fichiers")')
		await page.waitForSelector('.modal-container', { timeout: 5000 })
	})
	await step('Recherche unifiée', async () => {
		await page.click('.unified-search-input__button, .unified-search-input input, .unified-search__trigger')
		await page.waitForTimeout(300)
		await page.keyboard.type('doc', { delay: 60 })
		await page.waitForTimeout(800)
	})
	await step('Menu des applications', async () => {
		await page.click('.app-menu__waffle')
	})
	await visit('/apps/files/files?dir=/Photos', 'Fichiers, dossier Photos', '[data-cy-files-list-row]')
	await step('Visionneuse', async () => {
		await page.click('[data-cy-files-list-row] .files-list__row-name-link >> nth=0')
		await page.waitForSelector('.viewer__file-wrapper, .viewer', { timeout: 8000 })
		await page.waitForTimeout(800)
	})
	await visit('/apps/files/', 'Fichiers (retour)', '[data-cy-files-list-row]')
	await step('Visionneuse, document Markdown dans Text', async () => {
		await page.click('[data-cy-files-list-row-name$=".md"] .files-list__row-name-link >> nth=0')
		await page.waitForSelector('.viewer__file-wrapper .ProseMirror', { timeout: 15000 })
		await page.waitForTimeout(1500)
	})
	await visit('/apps/dashboard/', 'Tableau de bord', '.panel')
	await step('Tableau de bord, personnaliser', async () => {
		await page.click('button:has-text("Personnaliser"), .edit-panels')
		await page.waitForSelector('.modal-container', { timeout: 5000 })
	})
	const talk = await page.evaluate(async () => {
		const r = await fetch('/ocs/v2.php/apps/spreed/api/v4/room?format=json', { headers: { 'OCS-APIRequest': 'true', requesttoken: OC.requestToken } })
		const rooms = (await r.json()).ocs.data
		return (rooms.find((x) => x.type === 2) || rooms[0] || {}).token || ''
	}).catch(() => '')
	await visit('/apps/spreed/', 'Talk', '#app-content-vue, .app-spreed')
	if (talk) {
		await visit('/call/' + talk, 'Talk, conversation', '.message, .messages-group')
		await step('Talk, actions de la conversation', async () => {
			await page.click('.top-bar button[aria-label="Actions de la conversation"]')
			await page.waitForTimeout(500)
			await verify('Talk, menu des actions de la conversation')
			await page.click('[role="menuitem"]:has-text("Paramètres de la conversation"), button:has-text("Paramètres de la conversation")')
			await page.waitForSelector('.modal-container', { timeout: 5000 })
		})
	}
	await visit('/apps/calendar/', 'Agenda', '.fc, .app-calendar')
	await step('Agenda, nouvel événement', async () => {
		await page.click('button:has-text("Nouvel événement"), .new-event')
		await page.waitForTimeout(800)
	})
	for (const [url, label, wait] of [
		['/apps/contacts/', 'Contacts'],
		['/apps/deck/', 'Deck'],
		['/apps/notes/', 'Notes'],
		['/apps/tasks/', 'Tâches'],
		['/apps/forms/', 'Formulaires'],
		['/apps/bookmarks/', 'Signets'],
		['/apps/music/', 'Musique'],
		['/settings/user', 'Paramètres personnels', 'main h2, main h3'],
		['/settings/user/theming', 'Apparence', 'main h2, main h3'],
		['/settings/user/security', 'Sécurité (perso)', 'main h2, main h3'],
		['/settings/user/notifications', 'Notifications', 'main h2, main h3'],
		['/settings/user/groupware', 'Groupware (perso)', 'main h2, main h3'],
		['/settings/admin', 'Administration', 'main h2, main h3'],
		['/settings/admin/sharing', 'Partage', 'main h2, main h3'],
		['/settings/admin/security', 'Sécurité (admin)', 'main h2, main h3'],
		['/settings/admin/groupware', 'Groupware (admin)', 'main h2, main h3'],
		['/settings/admin/theming', 'Personnaliser l\'apparence', 'main h2, main h3'],
		['/settings/admin/overview', 'Vue d\'ensemble', 'main h2, main h3'],
		['/settings/admin/logging', 'Journalisation', 'main h2, main h3'],
		['/settings/admin/talk', 'Talk (admin)', 'main h2, main h3'],
		['/settings/users', 'Comptes', '.account-management__navigation'],
	]) {
		await visit(url, label, wait || '#app-content-vue, #app-content, #content')
	}
	await step('Comptes, nouveau compte', async () => {
		await page.click('button:has-text("Nouveau compte"), #new-user-button')
		await page.waitForSelector('.modal-container', { timeout: 5000 })
	})
	await visit('/settings/apps', 'Applications', '#app-content-vue, #content')
} finally {
	await browser.close()
}
console.log(failures === 0 ? `Tous les contrôles passent (${checks} relevés).` : `${failures} contrôle(s) en échec.`)
process.exit(failures === 0 ? 0 : 1)
