/**
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Retire des feuilles compilées les :has() placés hors de l'élément ciblé.
 *
 *   node scripts/lower-has.js css/a.css [css/b.css …]
 *
 * Pourquoi : dans Chromium, une règle dont un :has() n'est pas sur l'élément ciblé
 * (« .modal-container:has(.x) .y span », « :root:has(.app-mail) .z svg »…) fait recalculer le style
 * de tous les éléments qui ressemblent à sa cible (chaque span, svg, bouton…) à chaque modification
 * voisine du DOM, même quand la condition est fausse et même quand l'élément de départ n'existe pas
 * dans la page. Avec les milliers de règles de ce type du thème, défiler dans Fichiers recalculait
 * ainsi le style de toute la liste à chaque image (×16 éléments, ×12 de temps, mesuré).
 *
 * Trois traitements, du plus sûr au plus général, sans jamais changer la spécificité :
 *  1. Conditions connues du serveur, évaluées ici une fois pour toutes :
 *     - dans la feuille d'une app (azure-app-<app>.css, chargée sur les seules pages de cette app,
 *       où #content porte la classe app-<app>), « :root:has(.app-<app>) » est toujours vrai ;
 *     - la feuille des réglages est déclinée en une variante par section (azure-app-settings--<section>.css,
 *       choisie par le serveur) : la condition « entrée active de la navigation des réglages »
 *       (reglage() de _variables.scss) y est vraie ou fausse. Les sélecteurs qui ne peuvent plus
 *       rien désigner sont retirés : chaque variante ne garde que les règles de sa section.
 *     Une condition vraie devient :not(<sélecteur qui ne trouve jamais rien>), une condition fausse
 *     :is(<même sélecteur>), au poids exact du :has() remplacé.
 *  2. Les autres :has() sur l'élément ciblé (sujet) restent tels quels : ils ne coûtent rien de plus,
 *     sauf si leur argument cite l'attribut class ou style ([class*="_module_"] des classes de
 *     modules CSS, [style*=…]) : Chromium tient alors CHAQUE changement de classe (ou de style en
 *     ligne) de la page pour un changement possible de :has() et recalcule, à chacun, les éléments
 *     visés par les :has() hors sujet de Nextcloud (toutes les icônes svg de la page…). Ceux-là
 *     passent au traitement 3 quand leur élément de départ se reconnaît à une classe ou un
 *     identifiant (mesuré à l'ouverture d'un .md dans Text : un seul de ces :has() suffisait).
 *  3. Les autres :has(ARG) hors sujet (fenêtres reconnues à leur contenu…) deviennent l'attribut
 *     [data-azure-has-<jeton>], porté par les seuls éléments qui vérifient :has(ARG) ;
 *     js/azure-has.js le pose avant le rendu des apps et le tient à jour. Un :has() dont l'argument
 *     dépend d'un état que le DOM ne trahit pas (:focus, :checked…) reste natif.
 *     Un nom d'attribut par jeton (et non une liste de jetons dans un attribut commun) : Chromium
 *     range ses ensembles d'invalidation et son filtre de Bloom des ancêtres par nom d'attribut.
 *     Avec un nom commun, poser un seul jeton (sur <body> à l'ouverture de la visionneuse…)
 *     recalculait tous les éléments visés par une règle à jeton quelconque, et le filtre ne
 *     pouvait écarter aucune de ces règles (ouverture d'un .md dans Text : +38 % d'éléments
 *     recalculés, mesuré).
 * Il écrit enfin js/azure-has.js : le moteur (src/azure-has.js) et la table des jetons.
 *
 * Contrôle : la spécificité de chaque sélecteur modifié est recalculée ; au moindre écart, la
 * compilation échoue.
 */
const fs = require('fs')
const path = require('path')
const postcss = require('postcss')
const selectorParser = require('postcss-selector-parser')

const HAS = 'data-azure-has-'
// Éléments de départ que le moteur sait énumérer à moindre coût (getElementsByClassName…).
const NAMED_ANCHORS = new Set(['class', 'id', 'root'])
const NEVER = 'azure-jamais'
const ENGINE = path.join(__dirname, '..', 'src', 'azure-has.js')
const OUTPUT = path.join(__dirname, '..', 'js', 'azure-has.js')
const TABLE_MARK = '{} // @@AZURE_HAS_TABLE@@'

// Pseudo-classes dont la valeur se lit dans le DOM (balises, attributs, enfants) : observables.
const STRUCTURAL = new Set([':empty', ':first-child', ':last-child', ':only-child', ':nth-child', ':nth-last-child', ':first-of-type', ':last-of-type', ':only-of-type', ':nth-of-type', ':nth-last-of-type'])
const LOGICAL = new Set([':is', ':where', ':not', ':matches', ':any'])
const BY_ATTRIBUTE = { ':disabled': 'disabled', ':enabled': 'disabled', ':required': 'required', ':optional': 'required' }
const LEGACY_ELEMENTS = new Set([':before', ':after', ':first-line', ':first-letter'])

// ---------------------------------------------------------------------------------------------
// Spécificité (Selectors 4).

const add = (x, y) => [x[0] + y[0], x[1] + y[1], x[2] + y[2]]
const cmp = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
const max = (list) => list.reduce((m, s) => (cmp(s, m) > 0 ? s : m), [0, 0, 0])

/**
 * Poids d'un sélecteur simple.
 *
 * @param {object} n nœud postcss-selector-parser
 * @return {number[]}
 */
function weight(n) {
	if (n.type === 'id') {
		return [1, 0, 0]
	}
	if (n.type === 'class' || n.type === 'attribute') {
		return [0, 1, 0]
	}
	if (n.type === 'tag') {
		return [0, 0, 1]
	}
	if (n.type !== 'pseudo') {
		return [0, 0, 0]
	}
	const v = n.value.toLowerCase()
	if (v.startsWith('::') || LEGACY_ELEMENTS.has(v)) {
		return [0, 0, 1]
	}
	if (v === ':where') {
		return [0, 0, 0]
	}
	if (LOGICAL.has(v) || v === ':has') {
		return max(n.nodes.map(specificity))
	}
	return [0, 1, 0]
}

/**
 * Spécificité d'un sélecteur complexe (Selectors 4).
 *
 * @param {object} selector nœud postcss-selector-parser
 * @return {number[]}
 */
function specificity(selector) {
	let s = [0, 0, 0]
	selector.each((n) => {
		s = add(s, weight(n))
	})
	return s
}

// ---------------------------------------------------------------------------------------------
// Jetons.

/**
 * FNV-1a 32 bits, en base 36 : nom court et stable d'un argument de :has().
 *
 * @param {string} text
 */
function hash(text) {
	let h = 0x811c9dc5
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i)
		h = Math.imul(h, 0x01000193) >>> 0
	}
	return 'h' + h.toString(36)
}

/**
 * Ce qui, dans l'argument, peut faire changer la valeur du :has() : classes, identifiants,
 * attributs, fragments de classe ([class*=…]), dépendance à la structure (enfants, frères) et
 * composé final de chaque argument. null si l'argument dépend d'un état invisible dans le DOM.
 *
 * @param {object} pseudo nœud :has()
 */
function argumentKeys(pseudo) {
	const keys = { classes: new Set(), ids: new Set(), attrs: new Set(), subs: new Set(), structural: false, probe: [] }
	// Composé final de chaque argument : l'élément dont l'apparition ou le départ peut changer la valeur.
	for (const relative of pseudo.nodes) {
		const last = []
		relative.each((n) => {
			if (n.type === 'combinator') {
				last.length = 0
			} else if (n.type !== 'comment') {
				last.push(n.toString().trim())
			}
		})
		keys.probe.push(last.join('') || '*')
	}
	let observable = true
	pseudo.walk((n) => {
		if (n.type === 'class') {
			keys.classes.add(n.value)
		} else if (n.type === 'id') {
			keys.ids.add(n.value)
		} else if (n.type === 'attribute') {
			// [class*="_x_"] : toute classe contenant le fragment ; [id=x] : identifiant.
			if (n.attribute === 'id' && n.operator === '=' && n.value) {
				keys.ids.add(n.value)
			} else if ((n.attribute === 'class' || n.attribute === 'id') && n.value) {
				keys.subs.add(n.value)
			} else {
				keys.attrs.add(n.attribute)
			}
		} else if (n.type === 'combinator') {
			if (n.value.trim() === '+' || n.value.trim() === '~') {
				keys.structural = true
			}
		} else if (n.type === 'pseudo' && n !== pseudo) {
			const v = n.value.toLowerCase()
			if (STRUCTURAL.has(v)) {
				keys.structural = true
			} else if (BY_ATTRIBUTE[v]) {
				keys.attrs.add(BY_ATTRIBUTE[v])
			} else if (!LOGICAL.has(v)) {
				observable = false
			}
		}
	})
	return observable ? keys : null
}

/**
 * Éléments de départ possibles : le composé qui porte le :has(), réduit à ses balise, classes,
 * identifiants, attributs et :root (sur-ensemble des éléments qu'il peut désigner).
 * Renvoie [sélecteur, sorte, clé] ; sorte : id, class, root, tag ou all.
 *
 * @param {object[]} compound sélecteurs simples
 * @return {string[]}
 */
function anchorOf(compound) {
	const parts = []
	let kind = 'all'
	let key = ''
	let rank = 0
	const take = (k, v, r) => {
		if (r > rank) {
			kind = k
			key = v
			rank = r
		}
	}
	for (const n of compound) {
		if (n.type === 'tag') {
			// Une seule balise par composé (celle de l'englobant peut s'y ajouter : sur-ensemble).
			if (!parts.some((p) => /^[a-z]/i.test(p))) {
				parts.unshift(n.toString().trim())
			}
			take('tag', n.value.toLowerCase(), 1)
		} else if (n.type === 'class' || n.type === 'id' || n.type === 'attribute') {
			parts.push(n.toString().trim())
			if (n.type !== 'attribute') {
				take(n.type, n.value, n.type === 'id' ? 4 : 3)
			}
		} else if (n.type === 'pseudo' && n.value.toLowerCase() === ':root') {
			parts.push(':root')
			take('root', '', 5)
		}
	}
	return [parts.join('') || '*', kind, key]
}

/**
 * Sélecteur qui ne trouve jamais rien et pèse exactement [a, b, c].
 *
 * @param {number[]} weight spécificité voulue
 * @return {string}
 */
function never(weight) {
	const [a, b, c] = weight
	const last = (c > 0 ? NEVER : '') + `#${NEVER}`.repeat(a) + `.${NEVER}`.repeat(b)
	return [...Array(Math.max(0, c - 1)).fill(NEVER), last || `.${NEVER}`].join(' ')
}

/**
 * Jeton d'attribut au poids exact du :has() qu'il remplace.
 *
 * @param {string} id jeton
 * @param {number[]} s spécificité du :has()
 * @return {string}
 */
function replacement(id, s) {
	const token = `[${HAS}${id}]`
	if (cmp(s, [0, 1, 0]) === 0) {
		return token
	}
	if (cmp(s, [0, 0, 0]) === 0) {
		return `:where(${token})`
	}
	return `:where(${token}):not(${never(s)})`
}

// ---------------------------------------------------------------------------------------------
// Conditions connues du serveur.

// Apps dont la feuille sert aussi à une autre app (ThemeConfig::APP_STYLESHEET_ALIASES) : leur
// marqueur n'est pas garanti sur toutes les pages qui chargent la feuille.
const BORROWED = new Set(['files'])
const SETTINGS = /^azure-app-settings(-nc\d+)?$/
const SECTION = /^\.app-navigation-entry\.active a:is\(((?:\[href\$="\/(?:user|admin)\/[\w-]+"\](?:, ?)?)+)\)$/

/**
 * Sections (« user/sharing », « admin/sharing »…) que désigne une condition d'entrée active, ou null.
 *
 * @param {string} arg argument du :has()
 * @return {string[]|null}
 */
function sectionsOf(arg) {
	const m = SECTION.exec(arg)
	return m ? [...m[1].matchAll(/\/(user|admin)\/([\w-]+)"/g)].map((x) => x[1] + '/' + x[2]) : null
}

/**
 * Valeur d'un :has() connue à la compilation (true, false) ou undefined.
 *
 * @param {string[]} alternatives arguments du :has()
 * @param {string[]} anchor élément de départ ([sélecteur, sorte, clé])
 * @param {object} ctx { app, section } de la feuille
 * @return {boolean|undefined}
 */
function known(alternatives, anchor, ctx) {
	const page = anchor[1] === 'root' || (anchor[1] === 'tag' && (anchor[2] === 'body' || anchor[2] === 'html'))
	if (ctx.app && page && alternatives.some((a) => a === `.app-${ctx.app}`)) {
		return true
	}
	// L'entrée active est dans #content (.app-settings), donc dans body et la racine.
	if (ctx.section !== undefined && (page || anchor[0] === '.app-settings')) {
		const sections = sectionsOf(alternatives.join(', '))
		if (sections) {
			return ctx.section !== null && sections.includes(ctx.section)
		}
	}
	return undefined
}

// ---------------------------------------------------------------------------------------------
// Parcours.

const tokens = new Map() // id → { arg, anchors: Map, keys, sheets: Set }
const stats = { lowered: 0, known: 0, dropped: 0, variants: 0, native: new Map(), volatile: [] }

/**
 * L'argument du :has() cite-t-il l'attribut class ou style (voir le traitement 2 en tête) ?
 *
 * @param {object} pseudo nœud :has()
 * @return {boolean}
 */
function citesVolatileAttribute(pseudo) {
	let found = false
	pseudo.walkAttributes((a) => {
		found ||= /^(class|style)$/i.test(a.attribute)
	})
	return found
}

/**
 * @param {import('postcss-selector-parser').Selector} complex
 * @param {boolean} subject le dernier composé de ce sélecteur est-il l'élément ciblé ?
 * @param {object} ctx { sheet, app, section }
 * @param {Array} outer sélecteurs simples du composé englobant (:is(), :where(), :not()), qui
 *   désignent le même élément que le dernier composé de ce sélecteur
 * @return {boolean} true si le sélecteur ne peut plus rien désigner
 */
function processComplex(complex, subject, ctx, outer = []) {
	const compounds = [[]]
	complex.each((n) => {
		if (n.type === 'combinator') {
			compounds.push([])
		} else if (n.type !== 'comment') {
			compounds[compounds.length - 1].push(n)
		}
	})
	let impossible = false
	compounds.forEach((compound, i) => {
		const isLast = i === compounds.length - 1
		const isSubject = subject && isLast
		const same = isLast ? outer : []
		for (const n of compound) {
			if (n.type !== 'pseudo') {
				continue
			}
			const v = n.value.toLowerCase()
			if (LOGICAL.has(v)) {
				const nevers = n.map((arg) => processComplex(arg, isSubject, ctx, [...compound.filter((x) => x !== n), ...same]))
				// :is() ou :where() dont aucun argument ne peut plus rien désigner.
				impossible ||= v !== ':not' && nevers.every(Boolean)
				continue
			}
			if (v !== ':has') {
				continue
			}
			const anchor = anchorOf([...compound.filter((x) => x !== n), ...same])
			const alternatives = n.nodes.map((a) => a.toString().trim())
			const arg = alternatives.join(', ')
			const value = known(alternatives, anchor, ctx)
			const before = specificity(selectorParser.selector({ nodes: [n.clone()] }))
			let text
			if (value !== undefined) {
				text = value ? `:not(${never(before)})` : `:is(${never(before)})`
				impossible ||= !value
				stats.known++
			} else if (isSubject && !(citesVolatileAttribute(n) && NAMED_ANCHORS.has(anchor[1]))) {
				if (citesVolatileAttribute(n)) {
					stats.volatile.push(n.toString())
				}
				continue
			} else {
				const keys = argumentKeys(n)
				if (!keys) {
					stats.native.set(arg, (stats.native.get(arg) || 0) + 1)
					continue
				}
				const id = hash(arg)
				const entry = tokens.get(id) || { arg, anchors: new Map(), keys, sheets: new Set() }
				if (entry.arg !== arg) {
					throw new Error(`Collision de jeton ${id} : ${entry.arg} / ${arg}`)
				}
				entry.anchors.set(anchor[0], anchor)
				entry.sheets.add(ctx.sheet)
				tokens.set(id, entry)
				text = replacement(id, before)
				stats.lowered++
			}
			const fragment = selectorParser().astSync(text).first
			if (cmp(before, specificity(fragment)) !== 0) {
				throw new Error(`Spécificité changée : ${n} → ${fragment}`)
			}
			n.replaceWith(...fragment.nodes.map((x) => x.clone()))
		}
	})
	return impossible
}

/**
 * @param {string} selector liste de sélecteurs d'une règle
 * @param {object} ctx { sheet, app, section }
 * @return {string|null} null si plus aucun sélecteur ne peut rien désigner
 */
function lowerSelector(selector, ctx) {
	if (!selector.includes(':has(')) {
		return selector
	}
	const root = selectorParser().astSync(selector)
	const before = root.nodes.map(specificity)
	const nevers = root.map((complex) => processComplex(complex, true, ctx))
	root.nodes.forEach((complex, i) => {
		if (cmp(before[i], specificity(complex)) !== 0) {
			throw new Error(`Spécificité changée pour ${selector}`)
		}
	})
	root.nodes.filter((complex, i) => nevers[i]).forEach((complex) => complex.remove())
	return root.nodes.length ? root.toString() : null
}

/**
 * @param {string} css feuille compilée
 * @param {object} ctx { sheet, app, section }
 * @return {string}
 */
function lowerSheet(css, ctx) {
	const root = postcss.parse(css)
	root.walkRules((rule) => {
		if (rule.parent && rule.parent.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) {
			return
		}
		const selector = lowerSelector(rule.selector, ctx)
		if (selector === null) {
			const parent = rule.parent
			rule.remove()
			stats.dropped++
			// Bloc conditionnel vidé : retiré aussi.
			if (parent && parent.type === 'atrule' && parent.nodes.length === 0) {
				parent.remove()
			}
		} else {
			rule.selector = selector
		}
	})
	return root.toResult({ map: false }).css
}

// ---------------------------------------------------------------------------------------------

const files = process.argv.slice(2)
if (files.length === 0) {
	console.error('Usage : node scripts/lower-has.js css/a.css [css/b.css ...]')
	process.exit(1)
}
const settings = []
for (const file of files) {
	const sheet = path.basename(file, '.css')
	if (SETTINGS.test(sheet)) {
		settings.push(file)
		continue
	}
	const app = (/^azure-app-([a-z0-9_]+?)(?:-nc\d+)?$/.exec(sheet) || [])[1]
	fs.writeFileSync(file, lowerSheet(fs.readFileSync(file, 'utf8'), { sheet, app: BORROWED.has(app) ? undefined : app }))
}

// Feuille des réglages : une variante par section citée par une condition, plus « aucune ».
// « user/x » et « admin/x » partagent la variante « x » quand aucune condition ne les distingue.
if (settings.length) {
	const sources = settings.map((file) => [file, fs.readFileSync(file, 'utf8')])
	const lists = []
	for (const [, css] of sources) {
		for (const m of css.matchAll(/:has\((\.app-navigation-entry\.active a:is\([^)]*\))\)/g)) {
			lists.push(sectionsOf(m[1]) || [])
		}
	}
	const ids = new Set(lists.flat().map((x) => x.split('/')[1]))
	const variants = [['aucune', null]]
	for (const id of [...ids].sort()) {
		const same = lists.every((l) => l.includes('user/' + id) === l.includes('admin/' + id))
		variants.push(...(same ? [[id, 'user/' + id]] : [['user-' + id, 'user/' + id], ['admin-' + id, 'admin/' + id]]))
	}
	for (const [file, css] of sources) {
		const version = (/(-nc\d+)\.css$/.exec(file) || ['', ''])[1]
		for (const [name, section] of variants) {
			const sheet = `azure-app-settings--${name}${version}`
			fs.writeFileSync(path.join(path.dirname(file), sheet + '.css'), lowerSheet(css, { sheet, app: 'settings', section }))
		}
		fs.unlinkSync(file)
	}
	stats.variants = variants.length
}

// Table : id → [argument, départs [[sélecteur, sorte, clé]…], classes, ids, attributs, fragments de
// classe, structure (0/1), composé final des arguments] ; feuille → ids.
const table = { tokens: {}, sheets: {} }
for (const [id, t] of [...tokens].sort()) {
	const k = t.keys
	table.tokens[id] = [t.arg, [...t.anchors.values()], [...k.classes], [...k.ids], [...k.attrs], [...k.subs], k.structural ? 1 : 0, k.probe.join(', ')]
	for (const s of t.sheets) {
		(table.sheets[s] ||= []).push(id)
	}
}
const engine = fs.readFileSync(ENGINE, 'utf8')
if (!engine.includes(TABLE_MARK)) {
	throw new Error('Marqueur de table absent de src/azure-has.js')
}
fs.writeFileSync(OUTPUT, engine.replace(TABLE_MARK, JSON.stringify(table)))

console.log(`lower-has : ${stats.known} :has() évalués à la compilation (${stats.dropped} règles sans objet retirées, `
	+ `${stats.variants} variantes de la feuille des réglages) ; ${stats.lowered} remplacés par ${tokens.size} jetons ; `
	+ `${[...stats.native.values()].reduce((a, b) => a + b, 0)} laissés natifs (état non observable)`)
for (const [arg, n] of stats.native) {
	console.log(`  natif ×${n} : :has(${arg})`)
}
// Sujet qui cite class/style sans élément de départ nommé : reste natif, à réécrire dans les sources.
for (const text of new Set(stats.volatile)) {
	console.log(`  attention, :has() sujet qui cite class/style, laissé natif : ${text}`)
}
