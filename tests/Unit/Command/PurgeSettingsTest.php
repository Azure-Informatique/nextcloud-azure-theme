<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\Tests\Unit\Command;

use OCA\AzureTheme\Command\PurgeSettings;
use OCA\AzureTheme\ThemeConfig;
use OCP\Config\IUserConfig;
use OCP\IAppConfig;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Tester\CommandTester;

final class PurgeSettingsTest extends TestCase {
	public function testRefusesWithoutForce(): void {
		$userConfig = $this->createMock(IUserConfig::class);
		$userConfig->expects(self::never())->method('deleteApp');
		$appConfig = $this->createMock(IAppConfig::class);
		$appConfig->expects(self::never())->method('deleteKey');
		$appConfig->expects(self::never())->method('deleteApp');

		$tester = new CommandTester(new PurgeSettings($userConfig, $appConfig));
		self::assertSame(1, $tester->execute([]));
	}

	public function testErasesOnlyTheThemeSettings(): void {
		$userConfig = $this->createMock(IUserConfig::class);
		$userConfig->expects(self::once())->method('deleteApp')->with(ThemeConfig::APP_ID);
		$appConfig = $this->createMock(IAppConfig::class);
		$deleted = [];
		$appConfig->method('deleteKey')->willReturnCallback(static function (string $app, string $key) use (&$deleted): void {
			$deleted[] = [$app, $key];
		});
		// Never the whole app: that would also drop Nextcloud's own keys (enabled, installed version).
		$appConfig->expects(self::never())->method('deleteApp');

		$tester = new CommandTester(new PurgeSettings($userConfig, $appConfig));
		self::assertSame(0, $tester->execute(['--force' => true]));
		self::assertSame([
			[ThemeConfig::APP_ID, ThemeConfig::APP_CONFIG_KEY_LOGIN_STYLE],
			[ThemeConfig::APP_ID, ThemeConfig::APP_CONFIG_KEY_APP_MENU],
		], $deleted);
	}
}
