/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { reactive } from 'vue'

const API_BASE = generateUrl('/apps/azure_theme')

export const state = reactive({
	themeVariant: 'system',
	themeLastVariant: 'system',
	// Installed version, read from the server (appinfo/info.xml).
	appVersion: '',
	themeSaving: false,
	themeError: '',
})

export async function refresh() {
	const { data } = await axios.get(`${API_BASE}/api/status`)
	state.themeVariant = data.themeVariant ?? 'system'
	state.themeLastVariant = data.themeLastVariant ?? 'system'
	state.appVersion = data.appVersion ?? ''
}

let variantChannel = null
try {
	variantChannel = new BroadcastChannel('azure_theme-variant')
} catch {
	variantChannel = null
}

const AZURE_VARIANT_ATTRIBUTES = ['data-azure', 'data-azure-light', 'data-azure-dark']

function applyVariantInPlace(variant, enabledThemes) {
	// "system" shows Azure light or dark to match the device setting.
	const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
	const resolved = variant === 'system' ? (prefersDark ? 'dark' : 'light') : variant
	// The server sends Nextcloud's "default" theme for "system"; use the same light or dark theme as the Azure option.
	if (variant === 'system' && Array.isArray(enabledThemes)) {
		enabledThemes = enabledThemes.map((id) => (id === 'default' ? resolved : id))
	}

	// Other tabs (js/azure-state.js) apply the same variant and theme markers.
	variantChannel?.postMessage({ variant, themes: enabledThemes })

	for (const element of [document.documentElement, document.body]) {
		AZURE_VARIANT_ATTRIBUTES.forEach((attribute) => element.removeAttribute(attribute))
		if (resolved === 'light' || resolved === 'dark') {
			element.setAttribute('data-azure', '')
			element.setAttribute(`data-azure-${resolved}`, '')
		}
	}

	if (Array.isArray(enabledThemes) && enabledThemes.length > 0) {
		const body = document.body
		Array.from(body.attributes)
			.map((attribute) => attribute.name)
			.filter((name) => name.startsWith('data-theme-'))
			.forEach((name) => body.removeAttribute(name))
		enabledThemes.forEach((id) => body.setAttribute(`data-theme-${id}`, ''))
		body.dataset.themes = enabledThemes.join(',')
	}

	document.head.querySelectorAll('link.theme').forEach((link) => {
		const url = new URL(link.href)
		url.searchParams.set('v', String(Date.now()))
		const replacement = link.cloneNode()
		replacement.href = url.toString()
		replacement.onload = () => link.remove()
		document.head.appendChild(replacement)
	})
}

export async function setThemeVariant(variant) {
	const previous = state.themeVariant

	state.themeVariant = variant
	if (variant !== 'off') {
		state.themeLastVariant = variant
	}

	state.themeSaving = true
	try {
		const { data } = await axios.put(`${API_BASE}/variant`, { variant })
		applyVariantInPlace(variant, data.enabledThemes)
	} catch (e) {
		state.themeVariant = previous
		state.themeError = e.response?.data?.message || t('azure_theme', 'Could not save the theme setting.')
	} finally {
		state.themeSaving = false
	}
}
