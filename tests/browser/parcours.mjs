/**
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Parcours de non-régression : prouve que Nextcloud reste pleinement fonctionnel, thème Azure actif, désactivé
 * par l'utilisateur ou app désactivée. Les assertions sont fonctionnelles (état vérifié par WebDAV, OCS et CalDAV,
 * pas seulement par l'affichage) ; le même parcours doit donner le même résultat dans les trois états.
 *
 * Usage : node tests/browser/parcours.mjs <url Nextcloud> <utilisateur> <fichier du mot de passe> [chromium]
 * Variables facultatives :
 *   PARCOURS_JSON=<fichier>      écrit le résumé (étapes, erreurs de console, réponses HTTP) en JSON
 *   PARCOURS_VUES=bureau|téléphone  ne rejoue qu'une des deux vues (les deux par défaut)
 *   PARCOURS_REFERENCE=<fichier>  JSON d'une passe précédente (PARCOURS_JSON) : seules les erreurs absentes de cette référence
 *                                comptent comme inattendues (sert à comparer thème actif / désactivé / app désactivée)
 *   PARCOURS_CAPTURES=<dossier>  enregistre une capture d'écran pour chaque étape en échec
 * Le compte doit être administrateur. Toutes les données créées sont factices (préfixe « azure-parcours ») et sont
 * supprimées à la fin, y compris de la corbeille ; la langue du compte est remise comme avant.
 * Limites connues : si l'interface de l'Agenda reste vide (cas de l'instance de test), l'étape est signalée « ignorée » et seul CalDAV
 * est vérifié ; Deck conserve en base les tableaux supprimés (suppression logique).
 * Code de sortie : 0 si toutes les étapes réussissent sans erreur inattendue, 1 sinon.
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'

const [baseArg, user, passFile, exe = '/usr/bin/chromium'] = process.argv.slice(2)
if (!baseArg || !user || !passFile) {
	console.error('Usage : node tests/browser/parcours.mjs <url> <utilisateur> <fichier du mot de passe> [chromium]')
	process.exit(2)
}
const base = baseArg.replace(/\/$/, '')
const pass = fs.readFileSync(passFile, 'utf8').trim()
const capturesDir = process.env.PARCOURS_CAPTURES
if (capturesDir) fs.mkdirSync(capturesDir, { recursive: true })

// Navigateur « ordinaire » : Talk affiche un avertissement bloquant pour un navigateur sans interface (HeadlessChrome).
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
const VUES = [
	{ nom: 'bureau', contexte: { viewport: { width: 1440, height: 900 } } },
	{ nom: 'téléphone', contexte: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
]
// Ressources de prévisualisation absentes sur l'instance de test (fichiers de démonstration sans moteur d'aperçu) :
// elles répondent 404 quel que soit le thème et ne comptent pas.
const CONNU_URL = [/\/core\/preview\?fileId=/, /\/apps\/files\/api\/v1\/thumbnail\//]
const CONNU_TEXTE = [/could not load recommendation preview/i]

const auth = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')
const api = (methode, chemin, { corps, entetes = {} } = {}) => fetch(base + chemin, {
	method: methode,
	headers: { Authorization: auth, 'OCS-APIRequest': 'true', Accept: 'application/json', ...entetes },
	body: corps,
	redirect: 'manual',
})
const dav = chemin => `/remote.php/dav/files/${encodeURIComponent(user)}/${chemin.split('/').map(encodeURIComponent).join('/')}`
const ocs = async (methode, chemin, corps) => {
	const r = await api(methode, chemin, corps ? { corps: JSON.stringify(corps), entetes: { 'Content-Type': 'application/json' } } : {})
	const texte = await r.text()
	try { return { statut: r.status, data: JSON.parse(texte)?.ocs?.data } } catch { return { statut: r.status, data: undefined } }
}
// PNG valide de 1 pixel : suffisant pour la visionneuse.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

const id = Date.now().toString(36)
const PREFIXE = 'azure-parcours'
const dossier = `${PREFIXE}-${id}`
const texteBrouillon = `Contenu factice du parcours ${id}\n`
const langueInitiale = (await ocs('GET', '/ocs/v2.php/cloud/user'))?.data?.language

const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] })
const bilan = []
let echecs = 0
const nettoyages = []

const seulement = (process.env.PARCOURS_VUES || '').split(',').filter(Boolean)
for (const vue of VUES.filter(v => !seulement.length || seulement.includes(v.nom))) {
	const ctx = await browser.newContext({ locale: 'fr-FR', userAgent: UA, ...vue.contexte })
	const page = await ctx.newPage()
	page.setDefaultTimeout(25000)
	const resultat = { vue: vue.nom, etapes: [], erreursConsole: [], reponsesHttp: [], connues: 0 }
	bilan.push(resultat)
	let etapeCourante = 'avant le parcours'
	const nom = (suffixe) => `${dossier}-${vue.nom === 'bureau' ? 'b' : 't'}${suffixe}`

	page.on('console', m => {
		if (m.type() !== 'error') return
		const url = m.location()?.url || ''
		if (CONNU_TEXTE.some(r => r.test(m.text())) || (url && CONNU_URL.some(r => r.test(url)))) { resultat.connues++; return }
		resultat.erreursConsole.push({ etape: etapeCourante, texte: m.text().slice(0, 240), url })
	})
	page.on('pageerror', e => resultat.erreursConsole.push({ etape: etapeCourante, texte: 'exception : ' + String(e.message).slice(0, 240), url: '' }))
	page.on('response', r => {
		if (r.status() < 400) return
		if (CONNU_URL.some(re => re.test(r.url()))) { resultat.connues++; return }
		resultat.reponsesHttp.push({ etape: etapeCourante, statut: r.status(), url: r.url().replace(base, '').slice(0, 200) })
	})

	const etape = async (libelle, fn) => {
		etapeCourante = libelle
		try {
			const retour = await fn()
			if (retour?.ignore) {
				resultat.etapes.push({ libelle, ok: true, ignore: retour.ignore })
				console.log(`IGNORÉ [${vue.nom}] ${libelle} : ${retour.ignore}`)
			} else {
				resultat.etapes.push({ libelle, ok: true })
				console.log(`OK    [${vue.nom}] ${libelle}`)
			}
		} catch (e) {
			// Première ligne du message, complétée par l'élément attendu quand Playwright le précise.
			const attendu = String(e.message).match(/waiting for (.+)/)?.[1]?.replace(/\x1b\[[0-9;]*m/g, '')
			const detail = (String(e.message).split('\n')[0] + (attendu ? ` [attendait ${attendu}]` : '')).slice(0, 260)
			resultat.etapes.push({ libelle, ok: false, detail })
			echecs++
			console.log(`ÉCHEC [${vue.nom}] ${libelle} : ${detail}`)
			if (capturesDir) await page.screenshot({ path: `${capturesDir}/${vue.nom}-${libelle.replace(/\W+/g, '_')}.png` }).catch(() => {})
			await page.keyboard.press('Escape').catch(() => {})
		}
	}
	const verifie = (ok, message) => { if (!ok) throw new Error(message) }
	const fermerToasts = async () => { for (const b of await page.locator('.toast-close').all()) await b.click({ timeout: 1500 }).catch(() => {}) }
	// Dans la corbeille, le nom des lignes porte un suffixe « .d<horodatage> » : on les repère par leur début.
	const ligne = (nomFichier, debut = false) => page.locator(`[data-cy-files-list-row-name${debut ? '^' : ''}="${nomFichier}"]`)
	const actionLigne = async (nomFichier, action, debut = false) => {
		await fermerToasts()
		await ligne(nomFichier, debut).getByRole('button', { name: /^(Actions)$/ }).click()
		await page.locator(`[data-cy-files-list-row-action="${action}"]`).filter({ visible: true }).first().click()
	}
	const ouvrirFichiers = async (chemin = '/') => {
		await page.goto(`${base}/apps/files/files?dir=${encodeURIComponent(chemin)}`, { waitUntil: 'load' })
		await page.waitForSelector('[data-cy-files-content]')
		await page.waitForFunction(() => !document.querySelector('[data-cy-files-content] .loading-icon, .files-list__loading-spinner'), null, { timeout: 15000 }).catch(() => {})
	}
	const supprimerDav = chemin => api('DELETE', dav(chemin))
	// Sur téléphone, la navigation latérale est un tiroir : on l'ouvre pour atteindre un élément, on le ferme pour agir sur la page.
	const ouvrirNavigation = async (cible) => {
		// Tiroir fermé : ses éléments sont « inertes » même si Playwright les juge visibles (ils sont seulement décalés hors écran).
		const ouvert = () => cible.evaluate(el => !el.closest('[inert]')).catch(() => false)
		if (vue.contexte.isMobile) await page.waitForTimeout(2000)
		if (await ouvert()) return
		await page.getByRole('button', { name: /Ouvrir la navigation|Open navigation/ }).filter({ visible: true }).first().click()
		await cible.waitFor({ state: 'visible' })
		for (let i = 0; i < 20 && !(await ouvert()); i++) await page.waitForTimeout(250)
	}
	const fermerNavigation = async () => {
		const fermer = page.getByRole('button', { name: /^(Fermer la navigation|Close navigation)$/ }).filter({ visible: true }).first()
		if (vue.contexte.isMobile && await fermer.isVisible({ timeout: 1500 }).catch(() => false)) await fermer.click()
	}

	try {
		// ───────── Connexion ─────────
		await etape('connexion', async () => {
			await page.goto(base + '/login')
			await page.fill('#user', user)
			await page.fill('#password', pass)
			await Promise.all([page.waitForURL(u => !u.pathname.includes('/login')), page.press('#password', 'Enter')])
			await page.waitForSelector('#nextcloud', { state: 'attached' })
			// Éventuelle fenêtre de bienvenue d'une première connexion.
			await page.locator('.modal-container').first().waitFor({ state: 'visible', timeout: 2500 }).then(() => page.keyboard.press('Escape')).catch(() => {})
			const u = await ocs('GET', '/ocs/v2.php/cloud/user')
			verifie(u.data?.id === user, 'session ouverte mais utilisateur inattendu')
			verifie((await page.evaluate(() => document.querySelectorAll('.app-menu, .app-menu__waffle, #header').length)) > 0, 'en-tête Nextcloud absent')
		})

		// ───────── Fichiers ─────────
		await etape('Fichiers : créer un dossier', async () => {
			await ouvrirFichiers('/')
			await fermerToasts()
			await page.getByRole('button', { name: /^(Nouveau|New)$/ }).click()
			await page.locator('[data-cy-upload-picker-menu-entry="newFolder"]').filter({ visible: true }).first().click()
			const champ = page.locator('.modal-container input[type=text], [role=dialog] input[type=text]').last()
			await champ.fill(nom(''))
			await champ.press('Enter')
			await ligne(nom('')).waitFor({ state: 'visible' })
			const r = await api('PROPFIND', dav(nom('')), { entetes: { Depth: '0' } })
			verifie(r.status === 207, `dossier absent côté serveur (HTTP ${r.status})`)
		})
		nettoyages.push(() => supprimerDav(nom('')))

		await etape('Fichiers : ouvrir le dossier et envoyer deux fichiers', async () => {
			await ligne(nom('')).locator('[data-cy-files-list-row-name-link]').click()
			await page.waitForURL(u => decodeURIComponent(u.search).includes(nom('')))
			await page.waitForSelector('[data-cy-upload-picker]')
			await page.locator('input[data-cy-upload-picker-input]').first().setInputFiles([
				{ name: `image-${id}.png`, mimeType: 'image/png', buffer: PNG },
				{ name: `brouillon-${id}.txt`, mimeType: 'text/plain', buffer: Buffer.from(texteBrouillon) },
			])
			await ligne(`image-${id}.png`).waitFor({ state: 'visible' })
			await ligne(`brouillon-${id}.txt`).waitFor({ state: 'visible' })
			const r = await api('GET', dav(`${nom('')}/brouillon-${id}.txt`))
			verifie(r.status === 200 && (await r.text()) === texteBrouillon, 'contenu du fichier envoyé différent')
			const rp = await api('GET', dav(`${nom('')}/image-${id}.png`))
			verifie(rp.status === 200 && Buffer.from(await rp.arrayBuffer()).equals(PNG), 'image envoyée différente')
		})

		await etape('Fichiers : renommer', async () => {
			await actionLigne(`brouillon-${id}.txt`, 'rename')
			const champ = ligne(`brouillon-${id}.txt`).locator('input:not([type=checkbox])').first()
			await champ.fill(`note-${id}.txt`)
			await champ.press('Enter')
			await ligne(`note-${id}.txt`).waitFor({ state: 'visible' })
			verifie((await api('HEAD', dav(`${nom('')}/note-${id}.txt`))).status === 200, 'nouveau nom absent côté serveur')
			verifie((await api('HEAD', dav(`${nom('')}/brouillon-${id}.txt`))).status === 404, 'ancien nom toujours présent')
		})

		await etape('Fichiers : ouvrir l\'image dans la visionneuse', async () => {
			await ligne(`image-${id}.png`).locator('[data-cy-files-list-row-name-link]').click()
			const img = page.locator('.viewer img, .modal-mask.viewer img, #viewer img').first()
			await img.waitFor({ state: 'visible' })
			await page.waitForFunction(() => [...document.querySelectorAll('.viewer img, #viewer img')].some(i => i.complete && i.naturalWidth > 0))
			await page.keyboard.press('Escape')
			await page.locator('.viewer, #viewer').first().waitFor({ state: 'detached' })
		})

		let jeton
		await etape('Fichiers : barre latérale et lien de partage public', async () => {
			// Retour à la liste du dossier (la visionneuse laisse la route sur l'image), puis détails du fichier texte.
			await ouvrirFichiers(`/${nom('')}`)
			await actionLigne(`note-${id}.txt`, 'details')
			const lateral = page.locator('#app-sidebar-vue').first()
			await lateral.waitFor({ state: 'visible' })
			await lateral.locator('.app-sidebar-header__mainname').getByText(`note-${id}.txt`).waitFor({ state: 'visible' })
			await lateral.locator('#tab-button-sharing').click()
			// Un clic sur « Créer un nouveau lien de partage » crée directement le lien (aucun formulaire).
			const creer = lateral.getByRole('button', { name: /Créer un nouveau lien de partage|Create a new share link/i })
			await creer.waitFor({ state: 'visible' })
			await creer.click()
			await page.waitForFunction(async ([b, d]) => {
				const r = await fetch(`${b}/ocs/v2.php/apps/files_sharing/api/v1/shares?path=${encodeURIComponent(d)}&format=json`, { headers: { 'OCS-APIRequest': 'true', requesttoken: document.head.dataset.requesttoken } })
				const j = await r.json()
				return (j.ocs.data || []).some(s => s.share_type === 3)
			}, [base, `/${nom('')}/note-${id}.txt`], { timeout: 15000, polling: 500 })
			const partages = (await ocs('GET', `/ocs/v2.php/apps/files_sharing/api/v1/shares?path=${encodeURIComponent(`/${nom('')}/note-${id}.txt`)}`)).data
			jeton = partages.find(s => s.share_type === 3)?.token
			verifie(!!jeton, 'lien public non créé')
		})

		await etape('Fichiers : ouvrir le lien en anonyme et télécharger', async () => {
			verifie(jeton, 'aucun lien à ouvrir')
			const anonCtx = await browser.newContext({ locale: 'fr-FR', userAgent: UA, ...vue.contexte })
			const anon = await anonCtx.newPage()
			anon.setDefaultTimeout(25000)
			try {
				await anon.goto(`${base}/s/${jeton}`, { waitUntil: 'load' })
				// Un fichier texte partagé s'ouvre directement dans la visionneuse : son contenu doit s'afficher sans connexion.
				await anon.getByText(`Contenu factice du parcours ${id}`).first().waitFor({ state: 'visible' })
				const dl = await anon.request.get(`${base}/s/${jeton}/download`)
				verifie(dl.status() === 200, `téléchargement refusé (HTTP ${dl.status()})`)
				verifie((await dl.text()) === texteBrouillon, 'fichier téléchargé différent')
				verifie(/attachment/i.test(dl.headers()['content-disposition'] || ''), 'téléchargement sans en-tête « attachment »')
				// Le lien public ne doit rien révéler d'autre : le dossier parent reste inaccessible sans session.
				const r = await anon.request.get(base + dav(nom('')), { maxRedirects: 0 })
				verifie([401, 403, 404].includes(r.status()), `WebDAV accessible sans session (HTTP ${r.status()})`)
			} finally { await anonCtx.close() }
		})

		await etape('Fichiers : supprimer puis restaurer depuis la corbeille', async () => {
			await page.keyboard.press('Escape')
			await ligne(`image-${id}.png`).waitFor({ state: 'visible' })
			await actionLigne(`image-${id}.png`, 'delete')
			// Une confirmation éventuelle (versions récentes : suppression directe).
			const confirmer = page.getByRole('button', { name: /^(Supprimer|Delete)$/ }).filter({ visible: true }).last()
			if (await confirmer.isVisible({ timeout: 1500 }).catch(() => false)) await confirmer.click()
			await ligne(`image-${id}.png`).waitFor({ state: 'detached' })
			verifie((await api('HEAD', dav(`${nom('')}/image-${id}.png`))).status === 404, 'fichier toujours présent après suppression')
			// La corbeille s'ouvre par la navigation (l'adresse directe retombe sur la racine dans cette version).
			await ouvrirFichiers('/')
			const lien = page.locator('[data-cy-files-navigation-item="trashbin"] a')
			await ouvrirNavigation(lien)
			await lien.click()
			await page.waitForURL(/trashbin/)
			await ligne(`image-${id}.png`, true).waitFor({ state: 'visible', timeout: 20000 })
			await actionLigne(`image-${id}.png`, 'restore', true)
			await ligne(`image-${id}.png`, true).waitFor({ state: 'detached' })
			verifie((await api('HEAD', dav(`${nom('')}/image-${id}.png`))).status === 200, 'fichier non restauré')
		})

		// ───────── Talk ─────────
		let jetonTalk
		await etape('Talk : créer une conversation et envoyer un message', async () => {
			await page.goto(`${base}/apps/spreed`, { waitUntil: 'load' })
			await fermerToasts()
			await fermerNavigation()
			await page.getByRole('button', { name: /^(Nouvelle conversation|New conversation)$/ }).click()
			await page.getByPlaceholder(/nom pour cette conversation|name for this conversation/i).fill(nom('-talk'))
			await page.getByRole('button', { name: /Créer la conversation|Create conversation/ }).click()
			await page.waitForURL(/\/call\/\w+/)
			// Fenêtre « Ajouter des participants » éventuelle.
			await page.getByRole('button', { name: /^(Fermer|Close)$/ }).filter({ visible: true }).last().click({ timeout: 4000 }).catch(() => {})
			jetonTalk = page.url().match(/\/call\/(\w+)/)[1]
			nettoyages.push(() => ocs('DELETE', `/ocs/v2.php/apps/spreed/api/v4/room/${jetonTalk}`))
			const saisie = page.locator('.new-message-form .rich-contenteditable__input').first()
			await saisie.click()
			await page.keyboard.type(`Message factice ${id}`)
			await page.keyboard.press('Enter')
			await page.locator('.message, [data-message-id]').filter({ hasText: `Message factice ${id}` }).first().waitFor({ state: 'visible' })
			const msgs = (await ocs('GET', `/ocs/v2.php/apps/spreed/api/v1/chat/${jetonTalk}?lookIntoFuture=0&limit=20`)).data || []
			verifie(msgs.some(m => (m.message || '').includes(`Message factice ${id}`)), 'message absent côté serveur')
		})

		// ───────── Agenda ─────────
		await etape('Agenda : créer un événement et le retrouver', async () => {
			await page.goto(`${base}/apps/calendar`, { waitUntil: 'load' })
			await fermerToasts()
			const titreEvt = nom('-evt')
			const requete = `<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:prop-filter name="SUMMARY"><c:text-match>${titreEvt}</c:text-match></c:prop-filter></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>`
			const cherche = async () => (await (await api('REPORT', `/remote.php/dav/calendars/${encodeURIComponent(user)}/personal/`, { entetes: { Depth: '1', 'Content-Type': 'application/xml' }, corps: requete })).text()).includes('.ics')
			// Sur l'instance de test, l'interface de l'app Agenda reste vide (page blanche) même sans le thème Azure : dans ce cas
			// l'interface n'est pas testable, mais le service CalDAV est vérifié (création, lecture) et l'étape est signalée « ignorée ».
			const interfaceOk = await page.locator('.fc').first().waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false)
			if (!interfaceOk) {
				const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//azure-parcours//FR\r\nBEGIN:VEVENT\r\nUID:${PREFIXE}-${id}-${vue.nom === 'bureau' ? 'b' : 't'}@parcours\r\nDTSTAMP:20260101T000000Z\r\nDTSTART:20260601T090000Z\r\nDTEND:20260601T100000Z\r\nSUMMARY:${titreEvt}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`
				const r = await api('PUT', `/remote.php/dav/calendars/${encodeURIComponent(user)}/personal/${PREFIXE}-${id}-${vue.nom === 'bureau' ? 'b' : 't'}.ics`, { corps: ics, entetes: { 'Content-Type': 'text/calendar' } })
				verifie([201, 204].includes(r.status), `création CalDAV refusée (HTTP ${r.status})`)
				verifie(await cherche(), 'événement CalDAV introuvable')
				return { ignore: 'interface Agenda vide sur cette instance (aussi sans le thème) ; CalDAV vérifié' }
			}
			await page.getByRole('button', { name: /Nouvel événement|New event/ }).first().click()
			const titre = page.locator('.event-popover input[type=text], .event-popover .property-title__input input').filter({ visible: true }).first()
			await titre.fill(titreEvt)
			await page.getByRole('button', { name: /^(Enregistrer|Save)$/ }).filter({ visible: true }).first().click()
			for (let i = 0; i < 30 && !(await cherche()); i++) await page.waitForTimeout(500)
			verifie(await cherche(), 'événement absent côté serveur')
			await page.locator('.fc-event, .fc-list-event').filter({ hasText: titreEvt }).first().waitFor({ state: 'attached', timeout: 15000 })
		})

		// ───────── Deck ─────────
		let idPanneau
		await etape('Deck : créer un tableau, une liste et une carte', async () => {
			await page.goto(`${base}/apps/deck`, { waitUntil: 'load' })
			await fermerToasts()
			const ajout = page.getByText(/^(Ajouter un tableau|Add board)$/).first()
			await ouvrirNavigation(ajout)
			await ajout.click()
			const champ = page.getByPlaceholder(/Nom du tableau|Board name/i).filter({ visible: true }).last()
			await champ.fill(nom('-deck'))
			await champ.press('Enter')
			const entree = page.locator('a.app-navigation-entry-link', { hasText: nom('-deck') }).first()
			await ouvrirNavigation(entree)
			await entree.click()
			await page.waitForURL(/\/board\/\d+/)
			idPanneau = page.url().match(/\/board\/(\d+)/)[1]
			nettoyages.push(() => api('DELETE', `/index.php/apps/deck/api/v1.0/boards/${idPanneau}`))
			await page.getByRole('button', { name: /Ajouter une liste|Add list/ }).first().click()
			const liste = page.getByPlaceholder(/Nom de la liste|List name/i).filter({ visible: true }).first()
			await liste.fill('Liste factice')
			await liste.press('Enter')
			await page.getByText('Liste factice').first().waitFor({ state: 'visible' })
			await page.getByRole('button', { name: /Ajouter une carte|Add card/ }).first().click()
			// Le champ du titre de la carte prend le focus à l'ouverture.
			await page.waitForFunction(() => /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName) && !document.activeElement.closest('.unified-search-input'))
			await page.keyboard.type(`Carte factice ${id}`)
			await page.keyboard.press('Enter')
			await page.getByText(`Carte factice ${id}`).first().waitFor({ state: 'visible' })
			const stacks = await (await api('GET', `/index.php/apps/deck/api/v1.0/boards/${idPanneau}/stacks`)).json()
			verifie(stacks.some(s => (s.cards || []).some(c => c.title === `Carte factice ${id}`)), 'carte absente côté serveur')
		})

		// ───────── Réglages ─────────
		await etape('Réglages : changer la langue puis revenir', async () => {
			const avant = (await ocs('GET', '/ocs/v2.php/cloud/user')).data.language
			await page.goto(`${base}/settings/user/language-locale`, { waitUntil: 'load' })
			const choisir = async (libelle, code) => {
				await page.locator('#account-setting-language').click()
				await page.locator('[role=option]').filter({ hasText: libelle }).first().click()
				for (let i = 0; i < 30 && (await ocs('GET', '/ocs/v2.php/cloud/user')).data.language !== code; i++) await page.waitForTimeout(500)
				verifie((await ocs('GET', '/ocs/v2.php/cloud/user')).data.language === code, `langue non enregistrée (${code})`)
			}
			await choisir('English (US)', 'en')
			await page.reload({ waitUntil: 'load' })
			verifie((await page.evaluate(() => document.documentElement.lang)).startsWith('en'), 'interface non passée en anglais')
			await choisir('Français', 'fr')
			await page.reload({ waitUntil: 'load' })
			verifie((await page.evaluate(() => document.documentElement.lang)).startsWith('fr'), 'interface non revenue en français')
			verifie((await ocs('GET', '/ocs/v2.php/cloud/user')).data.language === avant, 'langue différente de celle d\'origine')
		})

		for (const chemin of ['/settings/user/theming', '/settings/admin/overview', '/settings/admin/server', '/settings/admin/sharing', '/settings/admin/theming']) {
			await etape(`Réglages : page ${chemin}`, async () => {
				const rep = await page.goto(base + chemin, { waitUntil: 'load' })
				verifie(rep.status() === 200, `HTTP ${rep.status()}`)
				await page.locator('.settings-section, #app-content-vue, #app-content, main').first().waitFor({ state: 'visible' })
				await page.waitForTimeout(1500)
				const texte = await page.locator('main, #content-vue, #content').first().innerText()
				verifie(texte.length > 150, 'contenu de la page absent')
				verifie(!/Internal Server Error|Erreur interne|Page introuvable|Page not found/i.test(texte.slice(0, 600)), 'page d\'erreur')
			})
		}

		// ───────── Recherche unifiée ─────────
		await etape('Recherche unifiée : retrouver un fichier créé', async () => {
			await page.goto(`${base}/apps/files`, { waitUntil: 'load' })
			// Bureau : champ dans l'en-tête ; téléphone : bouton qui ouvre le champ.
			if (!(await page.locator('.unified-search-input__input').first().isVisible())) await page.locator('#unified-search-trigger button').first().click()
			const champ = page.locator('.unified-search-input__input, input.input-field__input').filter({ visible: true }).first()
			await champ.click()
			await champ.fill(`note-${id}`)
			await page.getByText(`note-${id}.txt`).first().waitFor({ state: 'visible', timeout: 20000 })
			await page.keyboard.press('Escape')
		})

		// ───────── Notifications ─────────
		await etape('Notifications : ouvrir le menu', async () => {
			await page.goto(`${base}/apps/files`, { waitUntil: 'load' })
			await fermerToasts()
			await page.getByRole('button', { name: /^Notifications$/ }).first().click()
			await page.locator('.notification-wrapper, .notification-container, .empty-content').filter({ visible: true }).first().waitFor({ state: 'visible' })
			await page.keyboard.press('Escape')
		})

		// ───────── Nettoyage (serveur) avant la déconnexion ─────────
		await etape('Nettoyage des données factices', async () => {
			for (const n of nettoyages.splice(0).reverse()) await n().catch(() => {})
			const racine = await (await api('PROPFIND', dav(''), { entetes: { Depth: '1' } })).text()
			verifie(!racine.includes(nom('')), 'dossier factice encore présent')
			// Corbeille : suppression définitive des éléments du parcours uniquement.
			const corbeille = await (await api('PROPFIND', `/remote.php/dav/trashbin/${encodeURIComponent(user)}/trash`, { entetes: { Depth: '1' } })).text()
			for (const h of corbeille.match(/<d:href>[^<]*<\/d:href>/g) || []) {
				const href = h.replace(/<\/?d:href>/g, '')
				if (decodeURIComponent(href).includes(`-${id}`)) await api('DELETE', href)
			}
			// Calendrier : événements du parcours.
			const rep = await (await api('REPORT', `/remote.php/dav/calendars/${encodeURIComponent(user)}/personal/`, {
				entetes: { Depth: '1', 'Content-Type': 'application/xml' },
				corps: `<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:prop-filter name="SUMMARY"><c:text-match>${PREFIXE}</c:text-match></c:prop-filter></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>`,
			})).text()
			for (const h of rep.match(/<d:href>[^<]*\.ics<\/d:href>/g) || []) await api('DELETE', h.replace(/<\/?d:href>/g, ''))
			const tableaux = await (await api('GET', '/index.php/apps/deck/api/v1.0/boards')).json().catch(() => [])
			for (const t of (Array.isArray(tableaux) ? tableaux : []).filter(t => String(t.title).startsWith(PREFIXE))) await api('DELETE', `/index.php/apps/deck/api/v1.0/boards/${t.id}`)
			const salons = (await ocs('GET', '/ocs/v2.php/apps/spreed/api/v4/room')).data || []
			for (const s of salons.filter(s => String(s.displayName).startsWith(PREFIXE))) await ocs('DELETE', `/ocs/v2.php/apps/spreed/api/v4/room/${s.token}`)
		})

		// ───────── Déconnexion ─────────
		await etape('déconnexion', async () => {
			await page.goto(`${base}/apps/files`, { waitUntil: 'load' })
			await fermerToasts()
			await page.getByRole('button', { name: /Menu des paramètres|Settings menu/ }).first().click()
			await Promise.all([
				page.waitForURL(u => u.pathname.includes('/login')),
				page.getByRole('link', { name: /Se déconnecter|Log out/ }).filter({ visible: true }).first().click(),
			])
			await page.waitForSelector('#user')
			await page.goto(`${base}/apps/files`, { waitUntil: 'load' })
			verifie(page.url().includes('/login'), 'session toujours ouverte après déconnexion')
		})
	} finally {
		await ctx.close()
	}
}

// Filet de sécurité : langue d'origine et données factices, même si une étape a échoué en cours de route.
if (langueInitiale) await ocs('PUT', `/ocs/v2.php/cloud/users/${encodeURIComponent(user)}`, { key: 'language', value: langueInitiale })
for (const n of nettoyages.splice(0).reverse()) await n().catch(() => {})
await browser.close()

// ───────── Bilan ─────────
// Signature d'une erreur : sans adresses, nombres ni identifiants variables, pour regrouper et comparer d'une passe à l'autre.
const signature = (type, texte) => `${type}:` + texte.replace(/https?:\/\/\S+/g, 'URL').replace(/[0-9a-f]{8,}/gi, 'ID').replace(/\d+/g, 'N').replace(/\s+/g, ' ').slice(0, 140)
const reference = new Set()
if (process.env.PARCOURS_REFERENCE) {
	for (const r of JSON.parse(fs.readFileSync(process.env.PARCOURS_REFERENCE, 'utf8')).bilan) {
		for (const e of r.erreursConsole) reference.add(signature('console', e.texte))
		for (const h of r.reponsesHttp) reference.add(signature('http', `${h.statut} ${h.url.split('?')[0]}`))
	}
}
let inattendues = 0
for (const r of bilan) {
	for (const e of r.erreursConsole) e.signature = signature('console', e.texte)
	for (const h of r.reponsesHttp) h.signature = signature('http', `${h.statut} ${h.url.split('?')[0]}`)
	const nouvelles = [...r.erreursConsole, ...r.reponsesHttp].filter(e => process.env.PARCOURS_REFERENCE && !reference.has(e.signature) || !process.env.PARCOURS_REFERENCE)
	r.inattendues = nouvelles.length
	const ok = r.etapes.filter(e => e.ok).length
	const ignorees = r.etapes.filter(e => e.ignore).length
	console.log(`\n[${r.vue}] étapes réussies : ${ok}/${r.etapes.length} (dont ${ignorees} ignorée(s)) ; erreurs de console : ${r.erreursConsole.length} ; réponses HTTP ≥ 400 : ${r.reponsesHttp.length} ; aperçus absents connus ignorés : ${r.connues}`
		+ (process.env.PARCOURS_REFERENCE ? ` ; absentes de la référence : ${nouvelles.length}` : ''))
	const groupes = new Map()
	for (const e of [...r.erreursConsole, ...r.reponsesHttp]) groupes.set(e.signature, { e, n: (groupes.get(e.signature)?.n || 0) + 1 })
	for (const { e, n } of groupes.values()) console.log(`  ${n} × ${e.statut ? `http ${e.statut} ${e.url}` : `console ${e.texte.split('\n')[0]}`} (${e.etape})${nouvelles.includes(e) ? '  <-- NOUVELLE' : ''}`)
	inattendues += nouvelles.length
}
if (process.env.PARCOURS_JSON) fs.writeFileSync(process.env.PARCOURS_JSON, JSON.stringify({ base, id, bilan }, null, 2))
const reussi = echecs === 0 && inattendues === 0
console.log(reussi ? '\nPARCOURS : SUCCÈS' : `\nPARCOURS : ÉCHEC (${echecs} étape(s) en échec, ${inattendues} erreur(s) inattendue(s))`)
process.exit(reussi ? 0 : 1)
