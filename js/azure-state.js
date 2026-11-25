/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
(function() {
	'use strict'

	const VARIANTS = ['off', 'system', 'light', 'dark']
	const ENABLED_VARIANTS = ['system', 'light', 'dark']

	// "system" follows the device's light or dark setting, also when it changes while the page is open.
	const darkSchemeQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null

	function isEnabled(variant) {
		return ENABLED_VARIANTS.indexOf(variant) !== -1
	}

	function resolveVariant(variant) {
		if (variant !== 'system') {
			return variant
		}
		return darkSchemeQuery && darkSchemeQuery.matches ? 'dark' : 'light'
	}

	/**
	 * For "system" the server sends Nextcloud's "default" theme as a placeholder. Swap it for "light" or
	 * "dark" so the page gets exactly the same Nextcloud colours as the Azure light or dark option.
	 *
	 * @param {string[]} themes Theme ids, e.g. ['default', 'opendyslexic'].
	 * @param {string} variant 'off', 'system', 'light' or 'dark'.
	 * @return {string[]} Theme ids to put on <body>.
	 */
	function resolveThemes(themes, variant) {
		if (variant !== 'system' || !Array.isArray(themes)) {
			return themes
		}
		return themes.map(function(id) {
			return id === 'default' ? resolveVariant('system') : id
		})
	}

	// Seuls les thèmes clair/sombre de Nextcloud sont remplacés par la variante Azure : le contraste
	// élevé et la police dyslexie restent toujours accessibles (le contraste élevé met Azure en pause).
	const CORE_THEME_INPUTS = ['default', 'light', 'dark']
		.map(function(id) {
			return '.theming__preview--' + id + ' input'
		})
		.join(', ')

	// Nextcloud themes that stay on while a Azure variant is active (mirrors CoreTheming::KEEP_THEMES).
	const KEEP_THEMES = ['opendyslexic']

	let currentVariant = null
	// Page chargée sans le thème : il faut la recharger pour l'activer.
	let needsReload = false
	let userThemes = null

	let channel = null
	try {
		channel = new BroadcastChannel('azure_theme-variant')
	} catch {
		channel = null
	}

	function readInitialState(key) {
		const el = document.getElementById('initial-state-azure_theme-' + key)
		if (!el) {
			return null
		}
		try {
			return JSON.parse(atob(el.value))
		} catch {
			return null
		}
	}

	function syncCoreThemeLock() {
		// En contraste élevé, le thème Azure est en pause : l'utilisateur doit pouvoir en sortir.
		const locked = isEnabled(currentVariant) && !usesHighContrast()
		const inputs = document.querySelectorAll(CORE_THEME_INPUTS)
		for (let i = 0; i < inputs.length; i++) {
			inputs[i].disabled = locked
		}
	}

	function syncSubOptionLock() {
		const enabled = isEnabled(currentVariant)
		const radios = document.querySelectorAll('input[name="azure_theme-variant"]')
		for (let i = 0; i < radios.length; i++) {
			radios[i].disabled = !enabled
		}
		const toggle = document.getElementById('azure_theme-enabled')
		if (toggle) {
			toggle.checked = enabled
		}
	}

	function updateFontOverrideGuard() {
		const body = document.body
		if (!body) {
			return
		}
		document.documentElement.toggleAttribute('data-azure-no-font-override', body.hasAttribute('data-theme-opendyslexic'))
	}

	function setVariant(variant) {
		const body = document.body
		if (!body) {
			return
		}
		currentVariant = variant
		needsReload = !syncStylesheets(variant)
		const resolved = usesHighContrast() ? 'off' : resolveVariant(variant)
		const html = document.documentElement
		body.removeAttribute('data-azure')
		body.removeAttribute('data-azure-light')
		body.removeAttribute('data-azure-dark')
		html.removeAttribute('data-azure')
		html.removeAttribute('data-azure-light')
		html.removeAttribute('data-azure-dark')
		if (resolved === 'light') {
			body.setAttribute('data-azure', '')
			body.setAttribute('data-azure-light', '')
			html.setAttribute('data-azure', '')
			html.setAttribute('data-azure-light', '')
		} else if (resolved === 'dark') {
			body.setAttribute('data-azure', '')
			body.setAttribute('data-azure-dark', '')
			html.setAttribute('data-azure', '')
			html.setAttribute('data-azure-dark', '')
		}
		updateFontOverrideGuard()
		syncCoreThemeLock()
		syncSubOptionLock()
	}

	const HIGH_CONTRAST = ['data-theme-light-highcontrast', 'data-theme-dark-highcontrast']

	function azureLinks() {
		return Array.prototype.filter.call(document.querySelectorAll('link[rel="stylesheet"]'), function(link) {
			// Dossier d'apps quelconque : apps/, custom_apps/ (image Docker officielle, magasin d'apps)…
			return link.href.indexOf('/azure_theme/css/azure-') !== -1
				&& link.href.indexOf('/azure-login') === -1
				&& link.href.indexOf('/azure-page') === -1
				&& link.href.indexOf('/azure-settings') === -1
		})
	}

	function usesHighContrast() {
		const body = document.body
		return !!body && HIGH_CONTRAST.some(function(name) {
			return body.hasAttribute(name)
		})
	}

	/**
	 * Fait correspondre les feuilles Azure de la page à la variante : palette échangée sur place,
	 * feuilles désactivées pour « off » ou quand un thème à contraste élevé est actif.
	 * Renvoie false si la page a été chargée sans thème et doit être rechargée pour l'activer.
	 *
	 * @param {string} variant 'off', 'system', 'light' ou 'dark'.
	 * @return {boolean}
	 */
	function syncStylesheets(variant) {
		const links = azureLinks()
		const enabled = isEnabled(variant) && !usesHighContrast()
		if (enabled && links.length === 0) {
			return false
		}
		links.forEach(function(link) {
			link.disabled = !enabled
			if (enabled) {
				const match = /azure-palette-(light|dark|system)\.css/.exec(link.href)
				if (match && match[1] !== variant) {
					link.href = link.href.replace('azure-palette-' + match[1] + '.css', 'azure-palette-' + variant + '.css')
				}
			}
		})
		return true
	}

	function apply() {
		userThemes = readInitialState('user-themes')
		// Variante enregistrée (même mise en pause par un thème à contraste élevé), pour l'affichage des réglages.
		setVariant(readInitialState('saved_variant') || readInitialState('variant'))
		syncBodyThemes(readInitialState('variant'))

		// Le contraste élevé choisi dans « Apparence et accessibilité » met le thème Azure en pause aussitôt.
		if (document.body && window.MutationObserver) {
			new MutationObserver(function() {
				if (currentVariant !== null) {
					syncStylesheets(currentVariant)
					syncCoreThemeLock()
				}
			}).observe(document.body, { attributes: true, attributeFilter: HIGH_CONTRAST })
		}

		// NC33+ wraps the Appearance section in #settings-personal-theming. NC32 mounts it
		// over <span id="theming">, which Vue 2 replaces, so watch the settings content instead.
		const mount = document.getElementById('settings-personal-theming')
			|| document.getElementById('app-content')
		if (mount && window.MutationObserver) {
			new MutationObserver(syncCoreThemeLock).observe(mount, { childList: true, subtree: true })
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', apply)
	} else {
		apply()
	}

	if (darkSchemeQuery && darkSchemeQuery.addEventListener) {
		darkSchemeQuery.addEventListener('change', function() {
			if (currentVariant === 'system') {
				setVariant('system')
				syncBodyThemes('system')
			}
		})
	}

	/**
	 * Put Nextcloud's own theme markers on <body> (data-theme-<id> and data-themes). Nextcloud's colour
	 * variables (--color-main-background and the rest) follow these, so without this step the page
	 * stays half in the old variant until it is reloaded.
	 *
	 * @param {string[]} themes Theme ids from the server, e.g. ['dark', 'opendyslexic'].
	 */
	function setBodyThemes(themes) {
		const body = document.body
		if (!body || !Array.isArray(themes) || themes.length === 0) {
			return
		}
		Array.prototype.slice.call(body.attributes)
			.map(function(attribute) { return attribute.name })
			.filter(function(name) { return name.indexOf('data-theme-') === 0 })
			.forEach(function(name) { body.removeAttribute(name) })
		themes.forEach(function(id) {
			if (/^[a-z0-9-]+$/.test(id)) {
				body.setAttribute('data-theme-' + id, '')
			}
		})
		body.setAttribute('data-themes', themes.join(','))
		updateFontOverrideGuard()
	}

	/**
	 * Marqueurs de thème Nextcloud du <body> accordés à la variante Azure active : les composants qui
	 * lisent body.dataset.themes ou data-theme-light|dark (Excalidraw de Whiteboard, éditeurs…)
	 * suivent alors le clair ou le sombre d'Azure, y compris « système ». Sans effet quand le thème
	 * est coupé ou qu'un thème à contraste élevé le met en pause.
	 *
	 * @param {string|null} variant Variante active ('off', 'system', 'light' ou 'dark').
	 */
	function syncBodyThemes(variant) {
		if (!isEnabled(variant) || usesHighContrast()) {
			return
		}
		const themes = bodyThemesFor(variant)
		if (themes && themes.join(',') !== currentBodyThemes().join(',')) {
			setBodyThemes(themes)
		}
	}

	if (channel) {
		// Other tabs send {variant, themes}; older pages send the variant name only.
		channel.onmessage = function(event) {
			const data = event.data
			const variant = data && typeof data === 'object' ? data.variant : data
			if (VARIANTS.indexOf(variant) !== -1) {
				setVariant(variant)
				if (data && typeof data === 'object') {
					setBodyThemes(resolveThemes(data.themes, variant))
				}
			}
		}
	}

	/**
	 * Shows a Nextcloud toast (top right). OCP.Toast is core's wrapper around @nextcloud/dialogs; the
	 * older OC.Notification is only a fallback and has no success or error styling.
	 *
	 * @param {string} message The translated text.
	 * @param {'success'|'error'} type The toast style.
	 */
	function toast(message, type = 'success') {
		if (window.OCP && OCP.Toast && typeof OCP.Toast[type] === 'function') {
			OCP.Toast[type](message)
		} else if (window.OC && OC.Notification && OC.Notification.showTemporary) {
			OC.Notification.showTemporary(message)
		}
	}

	function refreshThemeStyles() {
		const links = document.head.querySelectorAll('link.theme')
		Array.prototype.forEach.call(links, function(link) {
			const url = new URL(link.href)
			url.searchParams.set('v', String(Date.now()))
			const clone = link.cloneNode()
			clone.href = url.toString()
			clone.onload = function() {
				link.remove()
			}
			document.head.appendChild(clone)
		})
	}

	function currentBodyThemes() {
		const value = document.body ? document.body.getAttribute('data-themes') : null
		return value ? value.split(',').filter(Boolean) : []
	}

	/**
	 * The theme ids <body> needs for a variant, worked out in the browser so the whole page switches at
	 * once. The server sends the same list back (CoreTheming::bodyThemes) and that answer wins.
	 *
	 * @param {string} variant 'off', 'system', 'light' or 'dark'.
	 * @return {string[]|null} Theme ids, or null when they are not known yet.
	 */
	function bodyThemesFor(variant) {
		if (isEnabled(variant)) {
			const kept = (userThemes || currentBodyThemes()).filter(function(id) {
				return KEEP_THEMES.indexOf(id) !== -1
			})
			return [resolveVariant(variant)].concat(kept)
		}
		return Array.isArray(userThemes) && userThemes.length > 0 ? userThemes : null
	}

	/**
	 * @param {string} variant 'off', 'system', 'light' or 'dark'.
	 * @param {string} [successMessage] Toast shown once the server has saved it (the on/off switch only).
	 */
	function persistVariant(variant, successMessage) {
		if (VARIANTS.indexOf(variant) === -1) {
			return
		}

		// Extinction : la page est rechargée une fois l'enregistrement fait, comme à l'allumage. Sans
		// cela, désactiver les feuilles Azure laissait une page à moitié Azure (fond, arrière-plan) sous
		// un message annonçant l'apparence Nextcloud rétablie.
		const turningOff = variant === 'off' && isEnabled(currentVariant)

		// While the theme is off, <body> shows the user's own themes; they may have changed them on this page.
		if (!isEnabled(currentVariant)) {
			const live = currentBodyThemes()
			if (live.length > 0) {
				userThemes = live
			}
		}

		setVariant(variant)
		const themes = bodyThemesFor(variant)
		if (themes) {
			setBodyThemes(themes)
			if (channel) {
				channel.postMessage({ variant, themes })
			}
		}

		fetch(OC.generateUrl('/apps/azure_theme/variant'), {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				requesttoken: OC.requestToken,
			},
			body: JSON.stringify({ variant }),
		})
			.then(function(response) {
				if (!response.ok) {
					throw new Error('HTTP ' + response.status)
				}
				return response.json()
			})
			.then(function(data) {
				// The server answers with the theme ids <body> needs for this variant.
				const themes = resolveThemes(data.enabledThemes, variant)
				setBodyThemes(themes)
				if (channel) {
					channel.postMessage({ variant, themes })
				}
				if ((needsReload && isEnabled(variant)) || turningOff) {
					window.location.reload()
					return
				}
				refreshThemeStyles()
				if (successMessage) {
					toast(successMessage)
				}
			})
			.catch(function() {
				toast(t('azure_theme', 'Could not save the Azure theme setting.'), 'error')
			})
	}

	/**
	 * Saves the site-wide login page switch (admins only). On failure the switch flips back, so it
	 * always shows what the server actually stores.
	 *
	 * @param {HTMLInputElement} input The login page checkbox.
	 */
	function persistLoginStyle(input) {
		const enabled = input.checked
		input.disabled = true
		fetch(OC.generateUrl('/apps/azure_theme/login-style'), {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				requesttoken: OC.requestToken,
			},
			body: JSON.stringify({ enabled }),
		})
			.then(function(response) {
				if (!response.ok) {
					throw new Error('HTTP ' + response.status)
				}
				toast(enabled
					? t('azure_theme', 'The login page now shows the Azure look for everyone.')
					: t('azure_theme', 'The login page now shows the standard Nextcloud look.'))
			})
			.catch(function() {
				input.checked = !enabled
				toast(t('azure_theme', 'Could not save the login page setting.'), 'error')
			})
			.finally(function() {
				input.disabled = false
			})
	}

	/**
	 * Saves the site-wide app menu switch (admins only). The menu changes on the next page load.
	 *
	 * @param {HTMLInputElement} input The app menu checkbox.
	 */
	function persistAppMenu(input) {
		const shown = input.checked
		input.disabled = true
		fetch(OC.generateUrl('/apps/azure_theme/app-menu'), {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				requesttoken: OC.requestToken,
			},
			body: JSON.stringify({ shown }),
		})
			.then(function(response) {
				if (!response.ok) {
					throw new Error('HTTP ' + response.status)
				}
				toast(shown
					? t('azure_theme', 'Azure Theme is back in the app menu. Reload the page to see it.')
					: t('azure_theme', 'Azure Theme is no longer in the app menu. Reload the page to see the change.'))
			})
			.catch(function() {
				input.checked = !shown
				toast(t('azure_theme', 'Could not save the app menu setting.'), 'error')
			})
			.finally(function() {
				input.disabled = false
			})
	}

	document.addEventListener('change', function(event) {
		const input = event.target
		if (!input) {
			return
		}

		if (input.id === 'azure_theme-login-style-enabled' && input.type === 'checkbox') {
			persistLoginStyle(input)
			return
		}

		if (input.id === 'azure_theme-app-menu-shown' && input.type === 'checkbox') {
			persistAppMenu(input)
			return
		}

		if (input.id === 'azure_theme-enabled' && input.type === 'checkbox') {
			if (input.checked) {
				const selected = document.querySelector('input[name="azure_theme-variant"]:checked')
				const message = t('azure_theme', 'Azure theme turned on. Your account now uses the Azure look.')
				persistVariant(selected ? selected.value : 'system', message)
			} else {
				const message = t('azure_theme', 'Azure theme turned off. Your standard Nextcloud appearance is back.')
				persistVariant('off', message)
			}
			return
		}

		if (input.type === 'radio' && input.name === 'azure_theme-variant') {
			persistVariant(input.value)
		}
	})
})()
