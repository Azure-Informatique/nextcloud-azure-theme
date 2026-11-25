<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\Tests\Unit\Controller;

use OCA\AzureTheme\Controller\ApiController;
use OCA\AzureTheme\ThemeConfig;
use OCP\App\IAppManager;
use OCP\Config\IUserConfig;
use OCP\IRequest;
use OCP\IUser;
use OCP\IUserSession;
use PHPUnit\Framework\TestCase;

final class ApiControllerTest extends TestCase {
	private function appManager(): IAppManager {
		$appManager = $this->createStub(IAppManager::class);
		$appManager->method('getAppVersion')->willReturn('1.1.0');
		return $appManager;
	}

	public function testStatusReturnsTheUsersSettings(): void {
		$user = $this->createStub(IUser::class);
		$user->method('getUID')->willReturn('alice');
		$session = $this->createStub(IUserSession::class);
		$session->method('getUser')->willReturn($user);
		$config = $this->createStub(IUserConfig::class);
		$config->method('getValueString')->willReturnMap([
			['alice', ThemeConfig::APP_ID, ThemeConfig::CONFIG_KEY_VARIANT, ThemeConfig::DEFAULT_VARIANT, false, 'dark'],
			['alice', ThemeConfig::APP_ID, ThemeConfig::CONFIG_KEY_LAST_VARIANT, 'system', false, 'dark'],
		]);

		$controller = new ApiController(ThemeConfig::APP_ID, $this->createStub(IRequest::class), $session, $config, $this->appManager());

		self::assertSame(['themeVariant' => 'dark', 'themeLastVariant' => 'dark', 'appVersion' => '1.1.0'], $controller->status()->getData());
	}

	public function testStatusDefaultsWithoutUser(): void {
		$session = $this->createStub(IUserSession::class);
		$session->method('getUser')->willReturn(null);

		$controller = new ApiController(ThemeConfig::APP_ID, $this->createStub(IRequest::class), $session, $this->createStub(IUserConfig::class), $this->appManager());

		self::assertSame(['themeVariant' => 'off', 'themeLastVariant' => 'system', 'appVersion' => '1.1.0'], $controller->status()->getData());
	}
}
