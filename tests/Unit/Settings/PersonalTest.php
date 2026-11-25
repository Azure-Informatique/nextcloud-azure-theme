<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\Tests\Unit\Settings;

use OCA\AzureTheme\Service\AppMenuEntry;
use OCA\AzureTheme\Service\LoginStyle;
use OCA\AzureTheme\Settings\Personal;
use OCP\Config\IUserConfig;
use OCP\IGroupManager;
use OCP\IUser;
use OCP\IUserSession;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class PersonalTest extends TestCase {
	public static function switches(): array {
		return [[true, true], [true, false], [false, true], [false, false]];
	}

	#[DataProvider('switches')]
	public function testPassesBothSiteWideSwitchesAndAdminFlag(bool $isAdmin, bool $menuShown): void {
		$user = $this->createStub(IUser::class);
		$user->method('getUID')->willReturn('alice');
		$session = $this->createStub(IUserSession::class);
		$session->method('getUser')->willReturn($user);
		$userConfig = $this->createStub(IUserConfig::class);
		$userConfig->method('getValueString')->willReturnArgument(3);
		$groups = $this->createStub(IGroupManager::class);
		$groups->method('isAdmin')->willReturn($isAdmin);
		$loginStyle = $this->createStub(LoginStyle::class);
		$loginStyle->method('isEnabled')->willReturn(true);
		$appMenu = $this->createStub(AppMenuEntry::class);
		$appMenu->method('isShown')->willReturn($menuShown);

		$params = (new Personal($session, $userConfig, $groups, $loginStyle, $appMenu))->getForm()->getParams();

		self::assertSame($isAdmin, $params['isAdmin']);
		self::assertSame($menuShown, $params['appMenuShown']);
		self::assertTrue($params['loginStyleEnabled']);
	}
}
