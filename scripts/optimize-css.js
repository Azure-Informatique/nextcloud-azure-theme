/**
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Allège les feuilles compilées par Sass sans rien changer à la cascade.
 *
 *   node scripts/optimize-css.js css/a.css [css/b.css …]
 *
 * Ce script :
 *  1. retire les déclarations mortes : doublon exact dans une règle, ou propriété redéclarée plus
 *     loin, dans le même bloc conditionnel, par une règle au sélecteur identique (donc même poids
 *     et mêmes éléments) qui l'emporte forcément ;
 *  2. fusionne deux règles voisines au même sélecteur.
 * Aucune règle ne change de place. Les règles à pseudo-classes ou pseudo-éléments préfixés
 * (-webkit-, -moz-…) ne sont jamais fusionnées : un navigateur qui ne les connaît pas ignore toute
 * la règle, il ne faut donc rien leur accoler.
 *
 * La sortie reste à plat. Regrouper les règles sous leur préfixe commun en imbrication CSS native
 * divisait la taille par deux, mais rendait le recalcul des styles de Chromium plus lent d'environ
 * 10 % (mesuré sur Fichiers) : la performance d'affichage passe avant les octets, que gzip
 * compresse de toute façon très bien.
 *
 * Après coup, le script vérifie que le résultat redonne exactement la suite d'origine (sélecteur,
 * propriété, valeur, !important, conditions), aux seules déclarations mortes près. Au moindre
 * écart, la compilation échoue.
 */
const fs = require('fs')
const postcss = require('postcss')

const FRAGILE = /:-(?:webkit|moz|ms|o)-|::?-(?:webkit|moz|ms|o)-/

// ---------------------------------------------------------------------------------------------
// Déclarations.

const declText = (d) => `${d.prop}:${d.value}${d.important ? '!important' : ''}`

/**
 * Une valeur que tout navigateur visé sait lire : une déclaration plus loin qui la porte l'emporte
 * à coup sûr (une valeur illisible serait ignorée et laisserait gagner la précédente).
 *
 * @param {string} prop
 * @param {string} value
 */
function surelyParsed(prop, value) {
	if (prop.startsWith('--') || value.includes('var(')) {
		return true
	}
	if (/[()]/.test(value)) {
		return false
	}
	return !/\d(?:[dsl]v[hwib]|[dsl]vmin|[dsl]vmax|cq[a-z]+|r?lh|ic|cap)\b/.test(value)
}

/**
 * Déclarations mortes d'une suite de nœuds frères (même bloc conditionnel), marquées sur place.
 * Une déclaration est morte si, plus loin, une règle sans sélecteur fragile porte le même sélecteur
 * complexe (pour chacun des sélecteurs de la règle) et la même propriété, avec une importance au
 * moins égale et une valeur lue à coup sûr (ou identique).
 *
 * @param {Array} nodes Nœuds postcss frères.
 * @return {Set} déclarations mortes
 */
function deadDeclarations(nodes) {
	const dead = new Set()
	const later = new Map() // sélecteur\0propriété → { norm: bool, imp: bool, vals: Set<string> }
	for (let r = nodes.length - 1; r >= 0; r--) {
		const rule = nodes[r]
		if (rule.type !== 'rule') {
			continue
		}
		const sels = rule.selectors
		const decls = rule.nodes.filter((n) => n.type === 'decl')
		for (let i = decls.length - 1; i >= 0; i--) {
			const d = decls[i]
			const ok = sels.every((s) => {
				const e = later.get(s + '\0' + d.prop)
				if (!e) {
					return false
				}
				return d.important
					? e.impSure || e.impVals.has(d.value)
					: e.normSure || e.impSure || e.normVals.has(d.value) || e.impVals.has(d.value)
			})
			// Doublon dans la même règle : vu plus bas dans la boucle, enregistré ci-dessous.
			if (ok) {
				dead.add(d)
				continue
			}
			if (!FRAGILE.test(rule.selector)) {
				for (const s of sels) {
					const k = s + '\0' + d.prop
					const e = later.get(k) || { normSure: false, impSure: false, normVals: new Set(), impVals: new Set() }
					const sure = surelyParsed(d.prop, d.value)
					if (d.important) {
						e.impSure ||= sure
						e.impVals.add(d.value)
					} else {
						e.normSure ||= sure
						e.normVals.add(d.value)
					}
					later.set(k, e)
				}
			}
		}
	}
	return dead
}

// ---------------------------------------------------------------------------------------------
// Représentation intermédiaire : suite d'éléments { sels, decls } ou { raw } par bloc.

/**
 * @param {import('postcss').Container} container
 * @return {Array}
 */
function toItems(container) {
	const nodes = container.nodes || []
	const dead = deadDeclarations(nodes)
	const items = []
	for (const n of nodes) {
		if (n.type === 'comment') {
			continue
		}
		if (n.type === 'rule' && !(container.type === 'atrule' && /keyframes$/i.test(container.name))) {
			if (n.nodes.some((c) => c.type !== 'decl')) {
				throw new Error(`Règle déjà imbriquée inattendue : ${n.selector}`)
			}
			const decls = n.nodes.filter((d) => !dead.has(d)).map(declText)
			if (decls.length === 0) {
				continue
			}
			items.push({ sels: n.selectors, decls, fragile: FRAGILE.test(n.selector) })
		} else if (n.type === 'atrule' && n.nodes && /^(media|supports|container|layer)$/i.test(n.name)) {
			const inner = toItems(n)
			if (inner.length) {
				items.push({ at: `@${n.name} ${n.params}`, items: inner })
			}
		} else {
			items.push({ raw: n.toString() })
		}
	}
	return mergeNeighbours(items)
}

/**
 * Fusion de deux règles voisines au même sélecteur : déclarations mises bout à bout (doublons exacts
 * retirés, la dernière occurrence restant). Jamais avec une règle fragile.
 *
 * @param {Array} items
 */
function mergeNeighbours(items) {
	const out = []
	for (const it of items) {
		const prev = out[out.length - 1]
		if (prev && prev.sels && it.sels && !prev.fragile && !it.fragile) {
			if (prev.sels.join(',') === it.sels.join(',')) {
				prev.decls = dedupe([...prev.decls, ...it.decls])
				continue
			}
		}
		if (it.sels) {
			it.decls = dedupe(it.decls)
		}
		out.push(it)
	}
	return out
}

/**
 * Doublons exacts dans un bloc : seule la dernière occurrence compte.
 *
 * @param decls
 */
function dedupe(decls) {
	const seen = new Set()
	const out = []
	for (let i = decls.length - 1; i >= 0; i--) {
		if (!seen.has(decls[i])) {
			seen.add(decls[i])
			out.unshift(decls[i])
		}
	}
	return out
}

// ---------------------------------------------------------------------------------------------
// Sortie.

/**
 * Sérialise une suite d'éléments, à plat.
 *
 * @param {Array} items
 * @return {string}
 */
function emit(items) {
	return items.map((it) => it.raw ?? (it.at
		? `${it.at}{${emit(it.items)}}`
		: `${it.sels.join(',')}{${it.decls.join(';')}}`)).join('')
}

// ---------------------------------------------------------------------------------------------
// Vérification : la feuille produite, redépliée, redonne la suite d'origine.

/**
 * Suite canonique (contexte, sélecteur, déclaration) d'une feuille, imbrication native dépliée.
 *
 * @param {string} css
 * @param {boolean} withDead Garder les déclarations mortes (feuille d'origine) ou non.
 */
function canonical(css, withDead) {
	const out = []
	const walk = (container, ctx, parent) => {
		const dead = withDead ? new Set() : null
		for (const n of container.nodes || []) {
			if (n.type === 'comment') {
				continue
			}
			if (n.type === 'rule' && !(container.type === 'atrule' && /keyframes$/i.test(container.name))) {
				const sels = n.selectors.map((s) => {
					if (parent === null) {
						return s
					}
					if (!s.startsWith('&') || s.indexOf('&', 1) !== -1) {
						throw new Error(`Sélecteur imbriqué inattendu : ${s}`)
					}
					return parent + s.slice(1)
				})
				if (parent !== null && n.parent.selectors && n.parent.selectors.length !== 1) {
					throw new Error(`Parent à plusieurs sélecteurs : ${n.parent.selector}`)
				}
				const decls = n.nodes.filter((d) => d.type === 'decl')
				let seenRule = false
				for (const c of n.nodes) {
					if (c.type === 'rule') {
						seenRule = true
					} else if (c.type === 'decl' && seenRule) {
						throw new Error(`Déclaration après une règle imbriquée : ${n.selector}`)
					}
				}
				for (const d of decls) {
					for (const s of sels) {
						out.push({ ctx, s, d: declText(d), prop: d.prop, value: d.value, imp: d.important, fragile: FRAGILE.test(sels.join(',')) })
					}
				}
				const kids = n.nodes.filter((c) => c.type === 'rule')
				if (kids.length) {
					if (sels.length !== 1) {
						throw new Error(`Parent à plusieurs sélecteurs : ${n.selector}`)
					}
					walk({ nodes: kids, type: 'rule' }, ctx, sels[0])
				}
			} else if (n.type === 'atrule' && n.nodes && /^(media|supports|container|layer)$/i.test(n.name)) {
				walk(n, `${ctx}@${n.name} ${n.params};`, parent)
			} else {
				out.push({ ctx, raw: n.toString().replace(/\s+/g, '') })
			}
		}
		return dead
	}
	walk(postcss.parse(css), '', null)
	return out
}

/**
 * Vérifie que `optimised` s'obtient de `original` en ne retirant que des déclarations mortes.
 *
 * @param {string} original
 * @param {string} optimised
 * @param {string} name
 */
function verify(original, optimised, name) {
	const a = canonical(original, true)
	const b = canonical(optimised, false)
	// Les déclarations retirées doivent être dominées plus loin dans la suite d'origine.
	const key = (e) => `${e.ctx}\0${e.s}\0${e.d}`
	// Appariement depuis la fin : ce sont les premières occurrences qui disparaissent.
	let j = b.length - 1
	const removed = []
	for (let i = a.length - 1; i >= 0; i--) {
		const e = a[i]
		const f = j >= 0 ? b[j] : null
		const same = f && (e.raw !== undefined ? f.raw === e.raw && f.ctx === e.ctx : f.raw === undefined && key(e) === key(f))
		if (same) {
			j--
		} else {
			if (e.raw !== undefined) {
				throw new Error(`${name} : bloc @ perdu ou déplacé : ${e.raw.slice(0, 120)} (en face : ${JSON.stringify(f).slice(0, 400)})`)
			}
			removed.push(e)
		}
	}
	if (j !== -1) {
		throw new Error(`${name} : la feuille optimisée ne suit pas l'ordre d'origine (vers ${JSON.stringify(b[j]).slice(0, 300)})`)
	}
	// Chaque retrait : doublon exact plus loin, ou même sélecteur + propriété plus loin, non fragile.
	const positions = new Map()
	a.forEach((e, i) => {
		if (e.raw === undefined) {
			const k = `${e.ctx}\0${e.s}\0${e.prop}`
			if (!positions.has(k)) {
				positions.set(k, [])
			}
			positions.get(k).push(i)
		}
	})
	const index = new Map(a.map((e, i) => [e, i]))
	for (const e of removed) {
		const i = index.get(e)
		const ok = positions.get(`${e.ctx}\0${e.s}\0${e.prop}`).some((p) => {
			if (p <= i) {
				return false
			}
			const f = a[p]
			if (f.d === e.d) {
				return true
			}
			if (f.fragile || (e.imp && !f.imp)) {
				return false
			}
			return surelyParsed(f.prop, f.value)
		})
		if (!ok) {
			throw new Error(`${name} : déclaration retirée à tort : ${e.s} { ${e.d} }`)
		}
	}
	return removed.length
}

// ---------------------------------------------------------------------------------------------

/**
 * @param {string} css Feuille compilée par Sass.
 * @return {string}
 */
function optimise(css) {
	return emit(toItems(postcss.parse(css)))
}

if (require.main === module) {
	for (const file of process.argv.slice(2)) {
		const original = fs.readFileSync(file, 'utf8')
		const optimised = optimise(original)
		const removed = verify(original, optimised, file)
		fs.writeFileSync(file, optimised + '\n')
		console.log(`${file} : ${original.length} → ${optimised.length} octets (${removed} déclarations mortes retirées)`)
	}
}

module.exports = { optimise, verify, canonical }
