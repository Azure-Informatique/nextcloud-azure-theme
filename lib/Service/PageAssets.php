<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\Service;

use OCA\AzureTheme\ThemeConfig;
use OCP\Util;

/**
 * Ajoute les feuilles et scripts de l'app à la page en cours (API publique OCP\Util).
 * Isolé dans un service pour que les écouteurs puissent être testés.
 */
class PageAssets {
	private const CSS_DIR = __DIR__ . '/../../css';
	private const NO_SECTION = 'aucune';

	/**
	 * Feuille de l'app, avec ses compléments propres à la version de Nextcloud (-ncNN).
	 */
	public function addStyle(string $name, bool $withVersioned = false): void {
		Util::addStyle(ThemeConfig::APP_ID, $name);
		if ($withVersioned) {
			foreach (VersionedStyles::forBase($name) as $versioned) {
				Util::addStyle(ThemeConfig::APP_ID, $versioned);
			}
		}
	}

	/**
	 * Plusieurs feuilles chargées ensemble, dans l'ordre donné, puis leurs compléments -ncNN version
	 * par version (VersionedStyles::forBases) : la cascade est celle d'une feuille unique.
	 *
	 * @param list<string> $names
	 */
	public function addStyles(array $names): void {
		foreach ([...$names, ...VersionedStyles::forBases($names)] as $name) {
			Util::addStyle(ThemeConfig::APP_ID, $name);
		}
	}

	/**
	 * Feuille propre à l'app qui rend la page (css/azure-app-<app>.css), ou null s'il n'y en a pas.
	 * Les apps qui affichent l'interface d'une autre empruntent sa feuille (ThemeConfig::APP_STYLESHEET_ALIASES).
	 * Une feuille déclinée par section des réglages (azure-app-<app>--<section>.css, écrite par
	 * scripts/lower-has.js) donne la variante de la section affichée, ou « --aucune » hors section.
	 *
	 * @param string $app Identifiant de l'app (TemplateResponse::getApp()).
	 * @param string|null $dir Dossier des feuilles ; par défaut css/ de l'app (les tests en passent un).
	 * @param string|null $section Section des réglages affichée, « user/<id> » ou « admin/<id> ».
	 */
	public function appStylesheet(string $app, ?string $dir = null, ?string $section = null): ?string {
		$app = ThemeConfig::APP_STYLESHEET_ALIASES[$app] ?? $app;
		if (preg_match('/^[a-z0-9_]+$/', $app) !== 1) {
			return null;
		}
		$dir ??= self::CSS_DIR;
		$name = 'azure-app-' . $app;
		if (is_file($dir . '/' . $name . '--' . self::NO_SECTION . '.css')) {
			// Une section ne se termine jamais comme un complément de version (-ncNN) : sinon une adresse
			// fabriquée (ex. /settings/user/server-nc35) chargerait le complément seul, sans sa feuille.
			if ($section !== null && preg_match('#^(user|admin)/([a-z0-9_-]+)$#', $section, $m) === 1
				&& preg_match('/-nc\d+$/', $m[2]) !== 1) {
				foreach ([$m[1] . '-' . $m[2], $m[2]] as $variant) {
					if (is_file($dir . '/' . $name . '--' . $variant . '.css')) {
						return $name . '--' . $variant;
					}
				}
			}
			return $name . '--' . self::NO_SECTION;
		}
		return is_file($dir . '/' . $name . '.css') ? $name : null;
	}

	public function addScript(string $name): void {
		Util::addScript(ThemeConfig::APP_ID, $name);
		foreach (VersionedScripts::forBase($name) as $versioned) {
			Util::addScript(ThemeConfig::APP_ID, $versioned);
		}
	}

	/**
	 * Script d'initialisation de Nextcloud (chargé avec les scripts d'initialisation, avant les scripts
	 * ordinaires des apps), sans complément -ncNN.
	 */
	public function addInitScript(string $name): void {
		Util::addInitScript(ThemeConfig::APP_ID, $name);
	}

	public function addTranslations(): void {
		Util::addTranslations(ThemeConfig::APP_ID);
	}
}
