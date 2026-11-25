<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\Tests\Unit\Service;

use OCA\AzureTheme\Service\VersionedScripts;
use OCA\AzureTheme\Service\VersionedStyles;
use OCA\AzureTheme\ThemeConfig;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Which version-specific files load on which Nextcloud version. Files for versions below 34 are
 * fixes for older servers (they apply to that version and older); files for 34 and up are fixes for
 * newer servers (they apply to that version and newer).
 */
final class VersionedFilesTest extends TestCase {
	private string $dir;

	protected function setUp(): void {
		$this->dir = sys_get_temp_dir() . '/azure-theme-test-' . bin2hex(random_bytes(4));
		mkdir($this->dir);
		foreach (['32', '33', '35', '36'] as $version) {
			touch($this->dir . '/azure-theme-nc' . $version . '.css');
			touch($this->dir . '/azure-theme-nc' . $version . '.js');
		}
		touch($this->dir . '/azure-login-nc35.css');
		touch($this->dir . '/azure-app-files-nc35.css');
		touch($this->dir . '/azure-app-files-nc36.css');
		touch($this->dir . '/azure-theme-ncXX.css');
	}

	protected function tearDown(): void {
		array_map('unlink', glob($this->dir . '/*') ?: []);
		rmdir($this->dir);
	}

	public static function versions(): array {
		return [
			'Nextcloud 32 gets both older-version fixes, newest first' => [32, ['azure-theme-nc33', 'azure-theme-nc32']],
			'Nextcloud 33 gets only the 33 fixes' => [33, ['azure-theme-nc33']],
			'Nextcloud 34 gets the base stylesheet only' => [34, []],
			'Nextcloud 35 gets the 35 fixes' => [35, ['azure-theme-nc35']],
			'Nextcloud 36 gets the 35 and 36 fixes, oldest first' => [36, ['azure-theme-nc35', 'azure-theme-nc36']],
		];
	}

	#[DataProvider('versions')]
	public function testStylesForVersion(int $major, array $expected): void {
		self::assertSame($expected, VersionedStyles::forBase('azure-theme', $major, $this->dir));
	}

	#[DataProvider('versions')]
	public function testScriptsForVersion(int $major, array $expected): void {
		self::assertSame($expected, VersionedScripts::forBase('azure-theme', $major, $this->dir));
	}

	public function testOtherBaseNamesAreSeparate(): void {
		self::assertSame(['azure-login-nc35'], VersionedStyles::forBase('azure-login', 35, $this->dir));
		self::assertSame([], VersionedStyles::forBase('azure-missing', 35, $this->dir));
	}

	public static function stylesheetSets(): array {
		return [
			'Nextcloud 34: no fixes' => [34, []],
			'Nextcloud 35: base then app' => [35, ['azure-theme-nc35', 'azure-app-files-nc35']],
			'Nextcloud 36: version by version, base before app' => [36, ['azure-theme-nc35', 'azure-app-files-nc35', 'azure-theme-nc36', 'azure-app-files-nc36']],
			'Nextcloud 32: older fixes, newest first' => [32, ['azure-theme-nc33', 'azure-theme-nc32']],
		];
	}

	#[DataProvider('stylesheetSets')]
	public function testFixesOfSeveralStylesheetsInterleaveByVersion(int $major, array $expected): void {
		self::assertSame($expected, VersionedStyles::forBases(['azure-theme', 'azure-app-files', 'azure-cadre'], $major, $this->dir));
	}

	public function testAppStylesheetFixesDoNotLeakIntoTheBase(): void {
		self::assertSame(['azure-theme-nc35', 'azure-theme-nc36'], VersionedStyles::forBase('azure-theme', 36, $this->dir));
		self::assertSame([], VersionedStyles::forBases(['azure-cadre'], 36, $this->dir));
	}

	public function testShippedScriptsAreFound(): void {
		// js/ holds hand-written source, so the real folder can be checked too: every loaded
		// script exists and none has version variants.
		foreach (ThemeConfig::SCRIPTS as $script) {
			self::assertFileExists(__DIR__ . '/../../../js/' . $script . '.js');
			self::assertSame([], VersionedScripts::forBase($script, 35));
		}
		self::assertSame(['azure-state'], ThemeConfig::SCRIPTS);
	}
}
