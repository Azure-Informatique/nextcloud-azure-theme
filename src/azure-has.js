/**
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Jetons :has() du thème (voir scripts/lower-has.js).
 *
 * Les feuilles compilées ne contiennent plus de :has() hors de l'élément ciblé : chaque condition
 * « X contient ARG » y est devenue l'attribut [data-azure-has-<jeton>]. Ce script, chargé avant les
 * scripts des apps (script d'initialisation de Nextcloud), pose cet attribut sur chaque élément de
 * départ possible qui vérifie :has(ARG), puis le tient à jour. Le CSS donne donc exactement le même
 * résultat qu'avec :has(), sans le coût que Chromium paie pour ces règles à chaque modification du
 * DOM (recalcul du style de tous les éléments qui ressemblent à leur cible).
 *
 * Un nom d'attribut par jeton, sans valeur, et non une liste de jetons dans un seul attribut :
 * Chromium range ses ensembles d'invalidation et son filtre de Bloom des ancêtres par NOM
 * d'attribut. Avec un attribut commun, poser n'importe quel jeton (sur <body> à l'ouverture d'une
 * fenêtre…) faisait recalculer tous les éléments visés par n'importe quelle règle à jeton, et aucune
 * de ces règles ne pouvait être écartée d'emblée (le nom commun était sur <body>).
 *
 * Tenue à jour : un MutationObserver (rappel en microtâche, donc avant l'affichage suivant) ne
 * réévalue que les jetons concernés : nœud ajouté ou retiré qui contient le composé final d'un
 * argument (ou un élément qui porte déjà un jeton), changement d'une classe, d'un identifiant ou
 * d'un attribut cité par un argument ou par un élément de départ. L'évaluation est celle du
 * navigateur (Element.matches(':has(…)')), sur les seuls éléments de départ possibles.
 * Sans effet hors des pages qui chargent une feuille du thème.
 */
(function() {
	'use strict'

	// Table écrite à la compilation par scripts/lower-has.js.
	const TABLE = {} // @@AZURE_HAS_TABLE@@
	const HAS = 'data-azure-has-'

	if (!TABLE.tokens || typeof MutationObserver === 'undefined' || !document.documentElement) {
		return
	}
	// Navigateur sans :has() : les règles concernées gardent le style générique, sans erreur.
	try {
		document.documentElement.matches(':has(*)')
	} catch {
		return
	}

	// Feuilles du thème présentes dans la page : seuls leurs jetons sont utiles.
	const used = new Set()
	document.querySelectorAll('link[rel="stylesheet"][href*="/azure_theme/css/"]').forEach(function(link) {
		const match = /\/azure_theme\/css\/([\w-]+)\.css/.exec(link.getAttribute('href'))
		;((match && TABLE.sheets[match[1]]) || []).forEach(function(id) {
			used.add(id)
		})
	})
	if (used.size === 0) {
		return
	}

	const byClass = new Map()
	const byIdAttr = new Map()
	const byAttr = new Map()
	const bySub = new Map()
	const structural = []
	const watched = new Set(['class', 'id'])
	const probes = []
	const tokens = []

	function index(map, key, token) {
		if (!map.has(key)) {
			map.set(key, [])
		}
		map.get(key).push(token)
	}

	used.forEach(function(id) {
		const row = TABLE.tokens[id]
		const token = {
			id,
			test: ':has(' + row[0] + ')',
			anchors: row[1].map(function(a) {
				return { selector: a[0], kind: a[1], key: a[2], live: null }
			}),
			probe: row[7],
			holders: new Set(),
		}
		row[2].forEach(function(c) {
			index(byClass, c, token)
		})
		row[3].forEach(function(i) {
			index(byIdAttr, i, token)
		})
		row[4].forEach(function(a) {
			index(byAttr, a, token)
			watched.add(a)
		})
		row[5].forEach(function(s) {
			index(bySub, s, token)
		})
		if (row[6]) {
			structural.push(token)
		}
		// Un élément qui devient élément de départ (classe ou identifiant ajouté) réveille le jeton.
		token.anchors.forEach(function(a) {
			if (a.kind === 'class') {
				index(byClass, a.key, token)
			} else if (a.kind === 'id') {
				index(byIdAttr, a.key, token)
			}
		})
		probes.push(token.probe)
		tokens.push(token)
	})
	const probe = probes.join(', ')

	// Éléments qui portent un attribut du thème → jetons concernés (pour un porteur détaché puis
	// remis, dont le contenu a pu changer entre-temps). Suivi en mémoire plutôt que par une sonde
	// CSS : un sélecteur par jeton rendait chaque querySelectorAll bien plus lent.
	const held = new Map()

	function hold(el, token, on) {
		let list = held.get(el)
		if (on) {
			if (!list) {
				list = new Set()
				held.set(el, list)
			}
			list.add(token)
		} else if (list) {
			list.delete(token)
			if (list.size === 0) {
				held.delete(el)
			}
		}
	}

	function setToken(el, token, on) {
		if (on) {
			el.setAttribute(HAS + token.id, '')
		} else {
			el.removeAttribute(HAS + token.id)
		}
		hold(el, token, on)
	}

	function candidates(a) {
		switch (a.kind) {
			case 'root':
				return [document.documentElement]
			case 'id': {
				const el = document.getElementById(a.key)
				return el ? [el] : []
			}
			case 'class':
				a.live = a.live || document.getElementsByClassName(a.key)
				return a.live
			default:
				return null
		}
	}

	// Un jeton dont le sélecteur serait refusé par le navigateur est mis à l'écart, sans bloquer les autres.
	function evaluate(token) {
		if (token.broken) {
			return
		}
		try {
			evaluateUnsafe(token)
		} catch {
			token.broken = true
		}
	}

	function evaluateUnsafe(token) {
		const next = new Set()
		token.anchors.forEach(function(a) {
			const list = candidates(a)
			if (list === null) {
				document.querySelectorAll(a.selector + token.test).forEach(function(el) {
					next.add(el)
				})
				return
			}
			for (let i = 0; i < list.length; i++) {
				const el = list[i]
				if (el.matches(a.selector) && el.matches(token.test)) {
					next.add(el)
				}
			}
		})
		token.holders.forEach(function(el) {
			if (!next.has(el)) {
				setToken(el, token, false)
			}
		})
		next.forEach(function(el) {
			if (!token.holders.has(el)) {
				setToken(el, token, true)
			}
		})
		token.holders = next
	}

	function mark(dirty, list) {
		if (list) {
			list.forEach(function(token) {
				dirty.add(token)
			})
		}
	}

	function markClass(dirty, name) {
		mark(dirty, byClass.get(name))
		bySub.forEach(function(list, sub) {
			if (name.indexOf(sub) !== -1) {
				mark(dirty, list)
			}
		})
	}

	// Élément ajouté ou retiré qui correspond à une sonde : jetons dont il est le composé final.
	function markFound(dirty, el) {
		for (let i = 0; i < tokens.length; i++) {
			if (!dirty.has(tokens[i]) && el.matches(tokens[i].probe)) {
				dirty.add(tokens[i])
			}
		}
	}

	function markTree(dirty, node) {
		if (node.nodeType !== 1) {
			return
		}
		if (node.matches(probe)) {
			markFound(dirty, node)
		}
		const found = node.querySelectorAll(probe)
		for (let i = 0; i < found.length; i++) {
			markFound(dirty, found[i])
		}
		// Porteurs d'attribut contenus dans le nœud.
		held.forEach(function(list, el) {
			if (node === el || node.contains(el)) {
				list.forEach(function(token) {
					dirty.add(token)
				})
			}
		})
	}

	function split(value) {
		return value ? value.split(/\s+/).filter(Boolean) : []
	}

	function onMutations(records) {
		const dirty = new Set()
		let shape = false
		for (let r = 0; r < records.length; r++) {
			const record = records[r]
			if (record.type === 'childList') {
				shape = true
				record.addedNodes.forEach(function(node) {
					markTree(dirty, node)
				})
				record.removedNodes.forEach(function(node) {
					markTree(dirty, node)
				})
			} else if (record.type === 'characterData') {
				shape = true
			} else if (record.attributeName === 'class') {
				const before = split(record.oldValue)
				const after = split(record.target.getAttribute('class'))
				before.forEach(function(c) {
					if (after.indexOf(c) === -1) {
						markClass(dirty, c)
					}
				})
				after.forEach(function(c) {
					if (before.indexOf(c) === -1) {
						markClass(dirty, c)
					}
				})
			} else if (record.attributeName === 'id') {
				mark(dirty, byIdAttr.get(record.oldValue))
				mark(dirty, byIdAttr.get(record.target.id))
			} else {
				mark(dirty, byAttr.get(record.attributeName))
			}
		}
		if (shape) {
			structural.forEach(function(token) {
				dirty.add(token)
			})
		}
		dirty.forEach(evaluate)
	}

	tokens.forEach(evaluate)
	new MutationObserver(onMutations).observe(document.documentElement, {
		subtree: true,
		childList: true,
		characterData: structural.length > 0,
		attributes: true,
		attributeOldValue: true,
		attributeFilter: Array.from(watched),
	})
})()
