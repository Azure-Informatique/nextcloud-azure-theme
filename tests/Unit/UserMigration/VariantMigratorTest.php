<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\Tests\Unit\UserMigration;

use OCA\AzureTheme\ThemeConfig;
use OCA\AzureTheme\UserMigration\VariantMigrator;
use OCP\Config\IUserConfig;
use OCP\IL10N;
use OCP\IUser;
use OCP\UserMigration\IExportDestination;
use OCP\UserMigration\IImportSource;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Output\OutputInterface;

final class VariantMigratorTest extends TestCase {
	private const PATH = 'azure_theme/variant.json';

	private function user(): IUser {
		$user = $this->createStub(IUser::class);
		$user->method('getUID')->willReturn('alice');
		return $user;
	}

	private function storedSettings(string $variant, string $lastVariant): IUserConfig {
		$config = $this->createStub(IUserConfig::class);
		$config->method('getValueString')->willReturnMap([
			['alice', ThemeConfig::APP_ID, ThemeConfig::CONFIG_KEY_VARIANT, ThemeConfig::DEFAULT_VARIANT, false, $variant],
			['alice', ThemeConfig::APP_ID, ThemeConfig::CONFIG_KEY_LAST_VARIANT, 'system', false, $lastVariant],
		]);
		return $config;
	}

	/** Traduction factice : préfixe « fr: » pour vérifier que les textes passent par IL10N. */
	private function l10n(): IL10N {
		$l = $this->createStub(IL10N::class);
		$l->method('t')->willReturnCallback(static fn (string $text): string => 'fr:' . $text);
		return $l;
	}

	private function source(?string $contents): IImportSource {
		$source = $this->createStub(IImportSource::class);
		$source->method('pathExists')->willReturnMap([[self::PATH, $contents !== null]]);
		$source->method('getFileContents')->willReturnMap([[self::PATH, (string)$contents]]);
		return $source;
	}

	public function testExportSkipsDefaultSettings(): void {
		$destination = $this->createMock(IExportDestination::class);
		$destination->expects(self::never())->method('addFileContents');

		(new VariantMigrator($this->storedSettings('system', 'system'), $this->l10n()))
			->export($this->user(), $destination, $this->createStub(OutputInterface::class));
	}

	public function testExportWritesSettings(): void {
		$destination = $this->createMock(IExportDestination::class);
		$destination->expects(self::once())->method('addFileContents')
			->with(self::PATH, '{"variant":"off","last_variant":"dark"}');

		(new VariantMigrator($this->storedSettings('off', 'dark'), $this->l10n()))
			->export($this->user(), $destination, $this->createStub(OutputInterface::class));
	}

	public function testImportRestoresSettings(): void {
		$saved = [];
		$config = $this->createStub(IUserConfig::class);
		$config->method('setValueString')->willReturnCallback(
			static function (string $user, string $app, string $key, string $value) use (&$saved): bool {
				$saved[$user . '/' . $app . '/' . $key] = $value;
				return true;
			},
		);
		$migrator = new VariantMigrator($config, $this->l10n());
		$source = $this->source('{"variant":"dark","last_variant":"dark"}');

		self::assertTrue($migrator->canImport($source));
		$migrator->import($this->user(), $source, $this->createStub(OutputInterface::class));

		self::assertSame([
			'alice/azure_theme/' . ThemeConfig::CONFIG_KEY_VARIANT => 'dark',
			'alice/azure_theme/' . ThemeConfig::CONFIG_KEY_LAST_VARIANT => 'dark',
		], $saved);
	}

	public function testImportWithoutFileDoesNothing(): void {
		$config = $this->createMock(IUserConfig::class);
		$config->expects(self::never())->method('setValueString');
		$migrator = new VariantMigrator($config, $this->l10n());
		$source = $this->source(null);

		// Une archive sans réglage du thème ne doit jamais bloquer la migration du compte.
		self::assertTrue($migrator->canImport($source));
		$migrator->import($this->user(), $source, $this->createStub(OutputInterface::class));
	}

	public static function untrustedImports(): array {
		return [
			'variante inconnue' => ['{"variant":"<script>","last_variant":"purple"}'],
			'types inattendus' => ['{"variant":["dark"],"last_variant":42}'],
			'json invalide' => ['{variant: dark'],
			'pas un objet' => ['"dark"'],
			'trop profond' => ['{"variant":{"a":{"b":{"c":{"d":1}}}}}'],
		];
	}

	#[\PHPUnit\Framework\Attributes\DataProvider('untrustedImports')]
	public function testImportIgnoresUntrustedValues(string $json): void {
		$config = $this->createMock(IUserConfig::class);
		$config->expects(self::never())->method('setValueString');
		$migrator = new VariantMigrator($config, $this->l10n());

		$migrator->import($this->user(), $this->source($json), $this->createStub(OutputInterface::class));
	}

	public function testImportKeepsOnlyKnownValues(): void {
		$saved = [];
		$config = $this->createStub(IUserConfig::class);
		$config->method('setValueString')->willReturnCallback(
			static function (string $user, string $app, string $key, string $value) use (&$saved): bool {
				$saved[$key] = $value;
				return true;
			},
		);
		$migrator = new VariantMigrator($config, $this->l10n());

		$migrator->import($this->user(), $this->source('{"variant":"off","last_variant":"off"}'), $this->createStub(OutputInterface::class));

		// « off » est une variante valide, mais pas une « dernière variante active ».
		self::assertSame([ThemeConfig::CONFIG_KEY_VARIANT => 'off'], $saved);
	}

	public function testDisplayNameAndDescriptionAreTranslated(): void {
		$migrator = new VariantMigrator($this->createStub(IUserConfig::class), $this->l10n());

		self::assertSame('fr:Azure theme', $migrator->getDisplayName());
		self::assertSame('fr:Your selected Azure theme variant (system/light/dark/off).', $migrator->getDescription());
	}

	/** Les deux textes du migrateur ont une traduction française, identique dans fr.json et fr.js. */
	public function testFrenchTranslationsExist(): void {
		$json = json_decode((string)file_get_contents(__DIR__ . '/../../../l10n/fr.json'), true, 512, JSON_THROW_ON_ERROR);
		$js = (string)file_get_contents(__DIR__ . '/../../../l10n/fr.js');
		foreach (['Azure theme', 'Your selected Azure theme variant (system/light/dark/off).'] as $key) {
			self::assertArrayHasKey($key, $json['translations']);
			self::assertNotSame($key, $json['translations'][$key]);
			self::assertStringContainsString(json_encode($key, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ': ' . json_encode($json['translations'][$key], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $js);
		}
	}
}
