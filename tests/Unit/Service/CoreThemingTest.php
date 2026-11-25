<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\Tests\Unit\Service;

use OCA\AzureTheme\Service\CoreTheming;
use OCP\IConfig;
use PHPUnit\Framework\TestCase;

final class CoreThemingTest extends TestCase {
	private function withEnabledThemes(string $raw): CoreTheming {
		$config = $this->createStub(IConfig::class);
		$config->method('getUserValue')->willReturnMap([
			['alice', 'theming', 'enabled-themes', '', $raw],
		]);
		return new CoreTheming($config);
	}

	public function testEnabledThemesDefaultsWhenUnset(): void {
		self::assertSame(['default'], $this->withEnabledThemes('')->enabledThemes('alice'));
	}

	public function testEnabledThemesDefaultsWhenInvalidOrEmpty(): void {
		self::assertSame(['default'], $this->withEnabledThemes('not json')->enabledThemes('alice'));
		self::assertSame(['default'], $this->withEnabledThemes('[]')->enabledThemes('alice'));
		self::assertSame(['default'], $this->withEnabledThemes('"dark"')->enabledThemes('alice'));
	}

	public function testEnabledThemesReadsUserChoice(): void {
		self::assertSame(['dark', 'opendyslexic'], $this->withEnabledThemes('["dark","opendyslexic"]')->enabledThemes('alice'));
	}

	public function testBodyThemesReplacesUserThemesWithVariant(): void {
		self::assertSame(['light'], $this->withEnabledThemes('["dark"]')->bodyThemes('alice', 'light'));
	}

	public function testBodyThemesLeavesHighContrastAlone(): void {
		self::assertSame(['dark-highcontrast'], $this->withEnabledThemes('["dark-highcontrast"]')->bodyThemes('alice', 'light'));
	}

	public function testUsesHighContrast(): void {
		$core = $this->withEnabledThemes('[]');
		self::assertTrue($core->usesHighContrast(['light-highcontrast']));
		self::assertTrue($core->usesHighContrast(['dark-highcontrast', 'opendyslexic']));
		self::assertFalse($core->usesHighContrast(['dark', 'opendyslexic']));
	}

	public function testEnabledThemesDropsMalformedIds(): void {
		self::assertSame(['dark'], $this->withEnabledThemes('["dark","<script>",42]')->enabledThemes('alice'));
	}

	public function testBodyThemesKeepsOpenDyslexicFont(): void {
		self::assertSame(['dark', 'opendyslexic'], $this->withEnabledThemes('["light","opendyslexic"]')->bodyThemes('alice', 'dark'));
	}

	public function testBodyThemesForSystemUsesNextcloudDefaultTheme(): void {
		self::assertSame(['default', 'opendyslexic'], $this->withEnabledThemes('["dark","opendyslexic"]')->bodyThemes('alice', 'system'));
	}

	public function testBodyThemesWhenOffReturnsUserThemesUnchanged(): void {
		self::assertSame(['dark', 'opendyslexic'], $this->withEnabledThemes('["dark","opendyslexic"]')->bodyThemes('alice', 'off'));
	}
}
