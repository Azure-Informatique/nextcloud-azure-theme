<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\Service;

use OCA\AzureTheme\ThemeConfig;
use OCP\IAppConfig;

/**
 * The site-wide switch for the "Azure Theme" entry in the app menu. Hiding it removes the icon only:
 * everyone still picks a variant under Personal settings > Appearance and accessibility, and the app
 * page stays reachable by its address. Admins can also set it with
 * `occ config:app:set azure_theme app_menu --value=no`.
 */
class AppMenuEntry {
	public function __construct(
		private IAppConfig $appConfig,
	) {
	}

	/**
	 * Anything other than an explicit "no" counts as shown, like the login page switch.
	 */
	public function isShown(): bool {
		return $this->appConfig->getValueString(
			ThemeConfig::APP_ID,
			ThemeConfig::APP_CONFIG_KEY_APP_MENU,
			ThemeConfig::DEFAULT_APP_MENU,
		) !== ThemeConfig::APP_MENU_HIDDEN;
	}

	public function setShown(bool $shown): void {
		$this->appConfig->setValueString(
			ThemeConfig::APP_ID,
			ThemeConfig::APP_CONFIG_KEY_APP_MENU,
			$shown ? ThemeConfig::APP_MENU_SHOWN : ThemeConfig::APP_MENU_HIDDEN,
		);
	}
}
