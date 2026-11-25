<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\Service;

use OCA\AzureTheme\ThemeConfig;
use OCP\IConfig;

/**
 * Lit les thèmes Nextcloud de l'utilisateur (module Theming) sans jamais les modifier :
 * le thème Azure s'applique par des feuilles de style, et les réglages d'apparence de
 * l'utilisateur restent intacts.
 */
class CoreTheming {
	/** Thèmes Nextcloud qui restent actifs avec le thème Azure (police dyslexie). */
	private const KEEP_THEMES = ['opendyslexic'];
	/** Thèmes d'accessibilité prioritaires : avec eux, le thème Azure ne se charge pas. */
	public const HIGH_CONTRAST_THEMES = ['light-highcontrast', 'dark-highcontrast'];

	public function __construct(
		private IConfig $config,
	) {
	}

	/**
	 * @return list<string>
	 */
	public function enabledThemes(string $userId): array {
		// Même lecture que le module Theming lui-même (ThemesService, Nextcloud 34 à 36), propriétaire de cette
		// valeur : IUserConfig risquerait un conflit de type sur une valeur écrite par IConfig.
		$raw = $this->config->getUserValue($userId, ThemeConfig::THEMING_APP_ID, 'enabled-themes', '');
		$themes = $raw === '' ? null : json_decode($raw, true);
		if (!\is_array($themes)) {
			return ['default'];
		}
		$themes = array_values(array_filter($themes, static fn ($id): bool => \is_string($id) && preg_match('/^[a-z0-9-]+$/', $id) === 1));

		return $themes !== [] ? $themes : ['default'];
	}

	/**
	 * Thème imposé à tous par l'administrateur (config.php, « enforce_theme »), ou chaîne vide.
	 */
	public function enforcedTheme(): string {
		$theme = $this->config->getSystemValueString('enforce_theme', '');
		return preg_match('/^[a-z0-9-]+$/', $theme) === 1 ? $theme : '';
	}

	/**
	 * @param list<string> $themes
	 */
	public function usesHighContrast(array $themes): bool {
		return array_intersect($themes, self::HIGH_CONTRAST_THEMES) !== [];
	}

	/**
	 * Thèmes à poser sur <body> pendant qu'une variante Azure est active, pour que les composants
	 * de Nextcloud voient le même clair ou sombre que le thème Azure. Pour « système », le
	 * navigateur remplace « default » par « light » ou « dark » selon le réglage de l'appareil.
	 *
	 * @return list<string>
	 */
	public function bodyThemes(string $userId, string $variant): array {
		$themes = $this->enabledThemes($userId);
		if (!in_array($variant, ThemeConfig::ENABLED_VARIANTS, true) || $this->usesHighContrast($themes)) {
			return $themes;
		}
		$base = $variant === ThemeConfig::VARIANT_SYSTEM ? 'default' : $variant;

		return array_merge([$base], array_values(array_intersect($themes, self::KEEP_THEMES)));
	}
}
