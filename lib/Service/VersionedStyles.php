<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\Service;

use OCP\Util;

class VersionedStyles {
	private const CSS_DIR = __DIR__ . '/../../css';
	private const BASE_MAJOR = 34;

	/**
	 * File names (without extension) of the version-specific files for $base that apply to this
	 * Nextcloud version, in load order.
	 *
	 * @param int|null $major Nextcloud major version; defaults to the running server (tests pass one).
	 * @param string|null $dir Folder to look in; defaults to the app's css/ folder (tests pass one).
	 * @return list<string>
	 */
	public static function forBase(string $base, ?int $major = null, ?string $dir = null): array {
		$major ??= (int)Util::getVersion()[0];
		$found = self::byVersion($base, $major, $dir ?? self::CSS_DIR);
		$major < self::BASE_MAJOR ? krsort($found) : ksort($found);
		return array_values($found);
	}

	/**
	 * Compléments de plusieurs feuilles chargées ensemble, version par version : pour chaque version,
	 * ceux des feuilles dans l'ordre de $bases. Ainsi azure-theme, azure-app-files donnent
	 * azure-theme-nc35, azure-app-files-nc35, puis azure-theme-nc36…, l'ordre qu'aurait une feuille unique.
	 *
	 * @param list<string> $bases
	 * @param int|null $major Version majeure de Nextcloud ; par défaut celle du serveur (les tests en passent une).
	 * @param string|null $dir Dossier où chercher ; par défaut css/ de l'app (les tests en passent un).
	 * @return list<string>
	 */
	public static function forBases(array $bases, ?int $major = null, ?string $dir = null): array {
		$major ??= (int)Util::getVersion()[0];
		$byVersion = [];
		foreach ($bases as $base) {
			foreach (self::byVersion($base, $major, $dir ?? self::CSS_DIR) as $version => $name) {
				$byVersion[$version][] = $name;
			}
		}
		$major < self::BASE_MAJOR ? krsort($byVersion) : ksort($byVersion);
		return array_merge(...array_values($byVersion));
	}

	/**
	 * @return array<int, string> nom de fichier (sans extension) par version
	 */
	private static function byVersion(string $base, int $major, string $dir): array {
		$found = [];

		foreach (glob($dir . '/' . $base . '-nc*.css') ?: [] as $file) {
			if (preg_match('/-nc(\d+)\.css$/', $file, $m) !== 1) {
				continue;
			}
			$version = (int)$m[1];
			if ($version < self::BASE_MAJOR ? $major <= $version : $version <= $major) {
				$found[$version] = basename($file, '.css');
			}
		}
		return $found;
	}
}
