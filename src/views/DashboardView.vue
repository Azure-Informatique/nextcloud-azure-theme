<!--
  - SPDX-FileCopyrightText: 2026 Nexeno contributors
  - SPDX-FileCopyrightText: 2026 Azure Informatique
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->
<template>
	<div class="suite-app-wrapper">
		<section class="hero-section">
			<div class="hero-section-text">
				<div class="pre-heading">
					<span>{{ t('azure_theme', 'Azure Informatique') }}</span>
				</div>
				<div class="title">
					<h1>{{ t('azure_theme', 'The Azure look') }}<span>{{ t('azure_theme', 'for your Nextcloud.') }}</span></h1>
				</div>
				<div class="content-small">
					<p>{{ t('azure_theme', 'The colours, typeface and shapes of Azure Informatique, in light or dark.') }}</p>
				</div>
				<ul class="hero-listing-wrapper">
					<li>
						<span><strong>{{ t('azure_theme', 'Light, dark or automatic.') }}</strong> {{ t('azure_theme', 'Choose a variant, or follow the setting of your device.') }}</span>
					</li>
					<li>
						<span><strong>{{ t('azure_theme', 'Every app.') }}</strong> {{ t('azure_theme', 'Files, Talk, Calendar, Mail, settings and more share the same look.') }}</span>
					</li>
					<li>
						<span><strong>{{ t('azure_theme', 'Accessible.') }}</strong> {{ t("azure_theme", "High contrast and the dyslexia font always keep priority.") }}</span>
					</li>
				</ul>
			</div>
			<div class="hero-image-wrapper">
				<div class="img-wrapper">
					<!-- Light and dark versions; CSS shows the one that matches the current theme. -->
					<img class="showcase-img--light" :src="images.heroPreviewLight" alt="">
					<img class="showcase-img--dark" :src="images.heroPreviewDark" alt="">
				</div>
			</div>
		</section>

		<section class="apps-system-section">
			<div class="system-apps-wrapper">
				<div class="app-card">
					<div class="app-card__header">
						<div class="icon-name-wrapper">
							<div class="icon">
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									aria-hidden="true"
									xmlns="http://www.w3.org/2000/svg">
									<path d="M17.5 12C17.1022 12 16.7206 11.842 16.4393 11.5607C16.158 11.2794 16 10.8978 16 10.5C16 10.1022 16.158 9.72064 16.4393 9.43934C16.7206 9.15804 17.1022 9 17.5 9C17.8978 9 18.2794 9.15804 18.5607 9.43934C18.842 9.72064 19 10.1022 19 10.5C19 10.8978 18.842 11.2794 18.5607 11.5607C18.2794 11.842 17.8978 12 17.5 12ZM14.5 8C14.1022 8 13.7206 7.84196 13.4393 7.56066C13.158 7.27936 13 6.89782 13 6.5C13 6.10218 13.158 5.72064 13.4393 5.43934C13.7206 5.15804 14.1022 5 14.5 5C14.8978 5 15.2794 5.15804 15.5607 5.43934C15.842 5.72064 16 6.10218 16 6.5C16 6.89782 15.842 7.27936 15.5607 7.56066C15.2794 7.84196 14.8978 8 14.5 8ZM9.5 8C9.10218 8 8.72064 7.84196 8.43934 7.56066C8.15804 7.27936 8 6.89782 8 6.5C8 6.10218 8.15804 5.72064 8.43934 5.43934C8.72064 5.15804 9.10218 5 9.5 5C9.89782 5 10.2794 5.15804 10.5607 5.43934C10.842 5.72064 11 6.10218 11 6.5C11 6.89782 10.842 7.27936 10.5607 7.56066C10.2794 7.84196 9.89782 8 9.5 8ZM6.5 12C6.10218 12 5.72064 11.842 5.43934 11.5607C5.15804 11.2794 5 10.8978 5 10.5C5 10.1022 5.15804 9.72064 5.43934 9.43934C5.72064 9.15804 6.10218 9 6.5 9C6.89782 9 7.27936 9.15804 7.56066 9.43934C7.84196 9.72064 8 10.1022 8 10.5C8 10.8978 7.84196 11.2794 7.56066 11.5607C7.27936 11.842 6.89782 12 6.5 12ZM12 3C9.61305 3 7.32387 3.94821 5.63604 5.63604C3.94821 7.32387 3 9.61305 3 12C3 14.3869 3.94821 16.6761 5.63604 18.364C7.32387 20.0518 9.61305 21 12 21C12.3978 21 12.7794 20.842 13.0607 20.5607C13.342 20.2794 13.5 19.8978 13.5 19.5C13.5 19.11 13.35 18.76 13.11 18.5C12.88 18.23 12.73 17.88 12.73 17.5C12.73 17.1022 12.888 16.7206 13.1693 16.4393C13.4506 16.158 13.8322 16 14.23 16H16C17.3261 16 18.5979 15.4732 19.5355 14.5355C20.4732 13.5979 21 12.3261 21 11C21 6.58 16.97 3 12 3Z" fill="currentColor" />
								</svg>
							</div>
							<div class="app-name">
								<div class="name-wrapper">
									<h3>{{ t('azure_theme', 'Azure theme') }}</h3>
								</div>
								<div v-if="state.appVersion" class="version-wrapper">
									<span>{{ t('azure_theme', 'Version {version}', { version: state.appVersion }) }}</span>
								</div>
							</div>
						</div>
						<div class="app-action">
							<NcCheckboxRadioSwitch
								:modelValue="themeEnabled"
								:disabled="state.themeSaving"
								type="switch"
								@update:modelValue="toggleTheme">
								{{ t('azure_theme', 'Enable Azure theme') }}
							</NcCheckboxRadioSwitch>
						</div>
					</div>
					<div class="app-desc">
						<p>{{ t('azure_theme', 'Azure Light and Dark colour themes for your Nextcloud.') }}</p>
					</div>
					<div class="variant-grid" :class="{ 'variant-grid--disabled': !themeEnabled }">
						<div
							v-for="option in variantOptions"
							:key="option.value"
							class="variant-card"
							:class="{ 'variant-card--selected': selectedVariant === option.value }">
							<!-- The preview selects the variant like the radio below; the radio is the accessible control. -->
							<div class="variant-card__preview" aria-hidden="true" @click="selectVariant(option.value)">
								<img :src="option.preview" :srcset="`${option.preview} 1x, ${option.preview2x} 2x`" alt="">
							</div>
							<div class="variant-card__text">
								<!-- Clicking the title selects the variant too, like the preview above. -->
								<h4 @click="selectVariant(option.value)">
									{{ option.title }}
								</h4>
								<p>{{ option.description }}</p>
							</div>
							<NcCheckboxRadioSwitch
								:modelValue="selectedVariant"
								:value="option.value"
								:disabled="!themeEnabled || state.themeSaving"
								name="azure_theme-overview-variant"
								type="radio"
								@update:modelValue="selectVariant">
								{{ option.label }}
							</NcCheckboxRadioSwitch>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="showcase-section">
			<div class="title">
				<h2>{{ betterExperienceHeading.before }}<span>{{ betterExperienceHeading.highlight }}</span>{{ betterExperienceHeading.after }}</h2>
			</div>
			<div class="content-small">
				<p>
					{{ t('azure_theme', 'Navigation, lists, forms and dialogs follow the same rules in every app.') }}
				</p>
			</div>
			<div class="showcase-grid two-column">
				<div class="showcase-card">
					<div class="title">
						<h3>
							{{ t('azure_theme', 'Files') }}
						</h3>
					</div>
					<div class="content-small">
						<p>
							{{ t('azure_theme', 'Lists, sharing and the detail sidebar.') }}
						</p>
					</div>
					<div class="showcase-card-img">
						<!-- Light and dark screenshots; CSS shows the one that matches the current theme. -->
						<img
							class="showcase-img--light"
							:src="images.filesShowcase"
							:alt="t('azure_theme', 'The Nextcloud Files app in the Azure theme')">
						<img
							class="showcase-img--dark"
							:src="images.filesShowcaseDark"
							:alt="t('azure_theme', 'The Nextcloud Files app in the Azure theme')">
					</div>
				</div>
				<div class="showcase-card">
					<div class="title">
						<h3>
							{{ t('azure_theme', 'Photos') }}
						</h3>
					</div>
					<div class="content-small">
						<p>
							{{ t('azure_theme', 'Albums, people and timeline.') }}
						</p>
					</div>
					<div class="showcase-card-img">
						<img
							class="showcase-img--light"
							:src="images.photosShowcase"
							:alt="t('azure_theme', 'The Nextcloud Photos app in the Azure theme')">
						<img
							class="showcase-img--dark"
							:src="images.photosShowcaseDark"
							:alt="t('azure_theme', 'The Nextcloud Photos app in the Azure theme')">
					</div>
				</div>
			</div>
			<div class="showcase-grid three-column">
				<div class="showcase-card multiple-view">
					<div class="title">
						<h3>
							{{ t('azure_theme', 'Dashboard') }}
						</h3>
					</div>
					<div class="content-small">
						<p>
							{{ t('azure_theme', 'Your widgets as flat cards.') }}
						</p>
					</div>
					<div class="showcase-card-img">
						<img
							class="showcase-img--light"
							:src="images.dashboardShowcase"
							:alt="t('azure_theme', 'The Nextcloud dashboard in the Azure theme')">
						<img
							class="showcase-img--dark"
							:src="images.dashboardShowcaseDark"
							:alt="t('azure_theme', 'The Nextcloud dashboard in the Azure theme')">
						<img
							class="secondary-img showcase-img--light"
							:src="images.dashboardOverlayShowcase"
							alt="">
						<img
							class="secondary-img showcase-img--dark"
							:src="images.dashboardOverlayShowcaseDark"
							alt="">
					</div>
				</div>
				<div class="showcase-card">
					<div class="title">
						<h3>
							{{ t('azure_theme', 'Office') }}
						</h3>
					</div>
					<div class="content-small">
						<p>
							{{ t('azure_theme', 'The frame around your documents.') }}
						</p>
					</div>
					<div class="showcase-card-img">
						<img
							class="showcase-img--light"
							:src="images.officeShowcase"
							:alt="t('azure_theme', 'Nextcloud Office in the Azure theme')">
						<img
							class="showcase-img--dark"
							:src="images.officeShowcaseDark"
							:alt="t('azure_theme', 'Nextcloud Office in the Azure theme')">
					</div>
				</div>
				<div class="showcase-card">
					<div class="title">
						<h3>
							{{ t('azure_theme', 'App store') }}
						</h3>
					</div>
					<div class="content-small">
						<p>
							{{ t('azure_theme', 'Browse and manage your apps.') }}
						</p>
					</div>
					<div class="showcase-card-img">
						<img
							class="showcase-img--light"
							:src="images.appstoreShowcase"
							:alt="t('azure_theme', 'The Nextcloud app store in the Azure theme')">
						<img
							class="showcase-img--dark"
							:src="images.appstoreShowcaseDark"
							:alt="t('azure_theme', 'The Nextcloud app store in the Azure theme')">
					</div>
				</div>
			</div>
		</section>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { imagePath } from '@nextcloud/router'
import NcCheckboxRadioSwitch from '@nextcloud/vue/components/NcCheckboxRadioSwitch'
import appstoreShowcaseDark from '../assets/images/showcase/appstore-dark.webp'
import appstoreShowcase from '../assets/images/showcase/appstore.webp'
import dashboardShowcaseDark from '../assets/images/showcase/dashboard-dark.webp'
import dashboardOverlayShowcaseDark from '../assets/images/showcase/dashboard-overlay-dark.webp'
import dashboardOverlayShowcase from '../assets/images/showcase/dashboard-overlay.webp'
import dashboardShowcase from '../assets/images/showcase/dashboard.webp'
import filesShowcaseDark from '../assets/images/showcase/files-dark.webp'
import filesShowcase from '../assets/images/showcase/files.webp'
import heroPreviewDark from '../assets/images/showcase/hero-preview-dark.webp'
import heroPreviewLight from '../assets/images/showcase/hero-preview-light.webp'
import officeShowcaseDark from '../assets/images/showcase/office-dark.webp'
import officeShowcase from '../assets/images/showcase/office.webp'
import photosShowcaseDark from '../assets/images/showcase/photos-dark.webp'
import photosShowcase from '../assets/images/showcase/photos.webp'
import { splitHighlight } from '../highlight.js'
import { setThemeVariant, state } from '../store.js'

export default {
	name: 'DashboardView',
	components: {
		NcCheckboxRadioSwitch,
	},

	data() {
		return {
			state,
			images: {
				heroPreviewLight,
				heroPreviewDark,
				filesShowcase,
				filesShowcaseDark,
				photosShowcase,
				photosShowcaseDark,
				dashboardShowcase,
				dashboardShowcaseDark,
				dashboardOverlayShowcase,
				dashboardOverlayShowcaseDark,
				officeShowcase,
				officeShowcaseDark,
				appstoreShowcase,
				appstoreShowcaseDark,
			},
		}
	},

	computed: {
		themeEnabled() {
			return state.themeVariant !== 'off'
		},

		/**
		 * The variant shown as chosen: the active one, or while the theme is off the one that comes back
		 * when it is turned on again.
		 */
		selectedVariant() {
			return this.themeEnabled ? state.themeVariant : (state.themeLastVariant || 'system')
		},

		variantOptions() {
			return [
				{
					value: 'system',
					preview: imagePath('azure_theme', 'preview-system.webp'),
					preview2x: imagePath('azure_theme', 'preview-system-2x.webp'),
					title: t('azure_theme', 'System'),
					description: t('azure_theme', 'Azure light or dark, matching the light or dark setting of your device.'),
					label: t('azure_theme', 'Follow my device'),
				},
				{
					value: 'light',
					preview: imagePath('azure_theme', 'preview-light.webp'),
					preview2x: imagePath('azure_theme', 'preview-light-2x.webp'),
					title: t('azure_theme', 'Light'),
					description: t('azure_theme', 'The Azure brand colours on a clean light appearance.'),
					label: t('azure_theme', 'Always light'),
				},
				{
					value: 'dark',
					preview: imagePath('azure_theme', 'preview-dark.webp'),
					preview2x: imagePath('azure_theme', 'preview-dark-2x.webp'),
					title: t('azure_theme', 'Dark'),
					description: t('azure_theme', 'The Azure brand colours on a dark appearance that reduces overall luminosity.'),
					label: t('azure_theme', 'Always dark'),
				},
			]
		},

		betterExperienceHeading() {
			return splitHighlight(t('azure_theme', 'One look <span>across Nextcloud</span>'))
		},
	},

	methods: {
		t,
		toggleTheme(enabled) {
			setThemeVariant(enabled ? (state.themeLastVariant || 'system') : 'off')
		},

		selectVariant(variant) {
			// Variants can only be picked while the theme is on, as on the settings page.
			if (!this.themeEnabled || state.themeSaving || variant === state.themeVariant) {
				return
			}
			setThemeVariant(variant)
		},
	},
}
</script>
