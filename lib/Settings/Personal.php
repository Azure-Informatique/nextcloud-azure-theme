<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\Settings;

use OCA\AzureTheme\Service\AppMenuEntry;
use OCA\AzureTheme\Service\LoginStyle;
use OCA\AzureTheme\ThemeConfig;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\Config\IUserConfig;
use OCP\IGroupManager;
use OCP\IUserSession;
use OCP\Settings\ISettings;

class Personal implements ISettings {
	public function __construct(
		private IUserSession $userSession,
		private IUserConfig $userConfig,
		private IGroupManager $groupManager,
		private LoginStyle $loginStyle,
		private AppMenuEntry $appMenuEntry,
	) {
	}

	public function getForm(): TemplateResponse {
		$user = $this->userSession->getUser();
		$variant = $user === null ? ThemeConfig::VARIANT_OFF : $this->userConfig->getValueString(
			$user->getUID(),
			ThemeConfig::APP_ID,
			ThemeConfig::CONFIG_KEY_VARIANT,
			ThemeConfig::DEFAULT_VARIANT,
		);
		$lastVariant = $user === null ? ThemeConfig::DEFAULT_LAST_VARIANT : $this->userConfig->getValueString(
			$user->getUID(),
			ThemeConfig::APP_ID,
			ThemeConfig::CONFIG_KEY_LAST_VARIANT,
			ThemeConfig::DEFAULT_LAST_VARIANT,
		);
		return new TemplateResponse(ThemeConfig::APP_ID, 'settings-personal', [
			'variant' => $variant,
			'lastVariant' => $lastVariant,
			// The login page switch is site-wide, so only admins see it.
			'isAdmin' => $user !== null && $this->groupManager->isAdmin($user->getUID()),
			'loginStyleEnabled' => $this->loginStyle->isEnabled(),
			'appMenuShown' => $this->appMenuEntry->isShown(),
		]);
	}

	public function getSection(): string {
		return 'theming';
	}

	public function getPriority(): int {
		return 10;
	}
}
