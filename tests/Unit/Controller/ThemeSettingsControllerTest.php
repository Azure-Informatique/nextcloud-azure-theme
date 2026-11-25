<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\Tests\Unit\Controller;

use OCA\AzureTheme\Controller\ThemeSettingsController;
use OCA\AzureTheme\Service\AppMenuEntry;
use OCA\AzureTheme\Service\CoreTheming;
use OCA\AzureTheme\Service\LoginStyle;
use OCA\AzureTheme\ThemeConfig;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\Config\IUserConfig;
use OCP\IL10N;
use OCP\IRequest;
use OCP\IUser;
use OCP\IUserSession;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ThemeSettingsControllerTest extends TestCase {
	private function session(?string $uid): IUserSession {
		$user = null;
		if ($uid !== null) {
			$user = $this->createStub(IUser::class);
			$user->method('getUID')->willReturn($uid);
		}
		$session = $this->createStub(IUserSession::class);
		$session->method('getUser')->willReturn($user);
		return $session;
	}

	private function controller(IUserConfig $userConfig, CoreTheming $coreTheming, IUserSession $session, ?LoginStyle $loginStyle = null, ?AppMenuEntry $appMenuEntry = null): ThemeSettingsController {
		$l = $this->createStub(IL10N::class);
		$l->method('t')->willReturnArgument(0);
		return new ThemeSettingsController(
			ThemeConfig::APP_ID,
			$this->createStub(IRequest::class),
			$userConfig,
			$coreTheming,
			$session,
			$l,
			$loginStyle ?? $this->createStub(LoginStyle::class),
			$appMenuEntry ?? $this->createStub(AppMenuEntry::class),
		);
	}

	/**
	 * A config that records every value saved through it into $saved.
	 */
	private function recordingConfig(array &$saved): IUserConfig {
		$userConfig = $this->createStub(IUserConfig::class);
		$userConfig->method('setValueString')->willReturnCallback(
			static function (string $user, string $app, string $key, string $value) use (&$saved): bool {
				$saved[$user . '/' . $app . '/' . $key] = $value;
				return true;
			},
		);
		return $userConfig;
	}

	public function testRejectsWhenNotLoggedIn(): void {
		$userConfig = $this->createMock(IUserConfig::class);
		$userConfig->expects(self::never())->method('setValueString');

		$response = $this->controller($userConfig, $this->createStub(CoreTheming::class), $this->session(null))
			->setVariant('light');

		self::assertSame(Http::STATUS_UNAUTHORIZED, $response->getStatus());
	}

	public static function invalidVariants(): array {
		return [['purple'], [''], ['Light'], ['off ']];
	}

	#[DataProvider('invalidVariants')]
	public function testRejectsUnknownVariant(string $variant): void {
		$userConfig = $this->createMock(IUserConfig::class);
		$userConfig->expects(self::never())->method('setValueString');
		$coreTheming = $this->createMock(CoreTheming::class);
		$coreTheming->expects(self::never())->method('bodyThemes');

		$response = $this->controller($userConfig, $coreTheming, $this->session('alice'))->setVariant($variant);

		self::assertSame(Http::STATUS_BAD_REQUEST, $response->getStatus());
	}

	public static function enabledVariants(): array {
		return [['system'], ['light'], ['dark']];
	}

	#[DataProvider('enabledVariants')]
	public function testSavesVariantAndRemembersIt(string $variant): void {
		$saved = [];
		$coreTheming = $this->createMock(CoreTheming::class);
		$coreTheming->expects(self::once())->method('bodyThemes')->with('alice', $variant)->willReturn([$variant]);

		$response = $this->controller($this->recordingConfig($saved), $coreTheming, $this->session('alice'))
			->setVariant($variant);

		self::assertSame(Http::STATUS_OK, $response->getStatus());
		self::assertSame(['variant' => $variant, 'enabledThemes' => [$variant]], $response->getData());
		self::assertSame([
			'alice/azure_theme/' . ThemeConfig::CONFIG_KEY_LAST_VARIANT => $variant,
			'alice/azure_theme/' . ThemeConfig::CONFIG_KEY_VARIANT => $variant,
		], $saved);
	}

	public function testTurningOffKeepsLastVariant(): void {
		$saved = [];
		$coreTheming = $this->createStub(CoreTheming::class);
		$coreTheming->method('bodyThemes')->willReturn(['default']);

		$response = $this->controller($this->recordingConfig($saved), $coreTheming, $this->session('alice'))
			->setVariant('off');

		self::assertSame(Http::STATUS_OK, $response->getStatus());
		self::assertSame(['variant' => 'off', 'enabledThemes' => ['default']], $response->getData());
		self::assertSame(['alice/azure_theme/' . ThemeConfig::CONFIG_KEY_VARIANT => 'off'], $saved);
	}

	public static function loginStyleValues(): array {
		return [[true], [false]];
	}

	#[DataProvider('loginStyleValues')]
	public function testSavesLoginStyle(bool $enabled): void {
		$loginStyle = $this->createMock(LoginStyle::class);
		$loginStyle->expects(self::once())->method('setEnabled')->with($enabled);
		$userConfig = $this->createMock(IUserConfig::class);
		$userConfig->expects(self::never())->method('setValueString');

		$response = $this->controller($userConfig, $this->createStub(CoreTheming::class), $this->session('admin'), $loginStyle)
			->setLoginStyle($enabled);

		self::assertSame(Http::STATUS_OK, $response->getStatus());
		self::assertSame(['enabled' => $enabled], $response->getData());
	}

	public function testLoginStyleIsAdminOnly(): void {
		// Nextcloud only lets non-admins call methods marked #[NoAdminRequired]; setLoginStyle must not have it.
		$method = new \ReflectionMethod(ThemeSettingsController::class, 'setLoginStyle');
		self::assertSame([], $method->getAttributes(NoAdminRequired::class));
	}

	#[DataProvider('loginStyleValues')]
	public function testSavesAppMenu(bool $shown): void {
		$appMenuEntry = $this->createMock(AppMenuEntry::class);
		$appMenuEntry->expects(self::once())->method('setShown')->with($shown);
		$userConfig = $this->createMock(IUserConfig::class);
		$userConfig->expects(self::never())->method('setValueString');

		$response = $this->controller($userConfig, $this->createStub(CoreTheming::class), $this->session('admin'), null, $appMenuEntry)
			->setAppMenu($shown);

		self::assertSame(Http::STATUS_OK, $response->getStatus());
		self::assertSame(['shown' => $shown], $response->getData());
	}

	public function testAppMenuIsAdminOnly(): void {
		// Hiding the entry changes the menu for everyone: setAppMenu must not carry #[NoAdminRequired].
		$method = new \ReflectionMethod(ThemeSettingsController::class, 'setAppMenu');
		self::assertSame([], $method->getAttributes(NoAdminRequired::class));
	}
}
