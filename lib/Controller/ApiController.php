<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\Controller;

use OCA\AzureTheme\ThemeConfig;
use OCP\App\IAppManager;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\JSONResponse;
use OCP\Config\IUserConfig;
use OCP\IRequest;
use OCP\IUserSession;

class ApiController extends Controller {
	public function __construct(
		string $appName,
		IRequest $request,
		private IUserSession $userSession,
		private IUserConfig $userConfig,
		private IAppManager $appManager,
	) {
		parent::__construct($appName, $request);
	}

	#[NoAdminRequired]
	public function status(): JSONResponse {
		$user = $this->userSession->getUser();
		$payload = [
			'themeVariant' => $user === null ? ThemeConfig::VARIANT_OFF : $this->userConfig->getValueString(
				$user->getUID(),
				ThemeConfig::APP_ID,
				ThemeConfig::CONFIG_KEY_VARIANT,
				ThemeConfig::DEFAULT_VARIANT,
			),
			'themeLastVariant' => $user === null ? ThemeConfig::DEFAULT_LAST_VARIANT : $this->userConfig->getValueString(
				$user->getUID(),
				ThemeConfig::APP_ID,
				ThemeConfig::CONFIG_KEY_LAST_VARIANT,
				ThemeConfig::DEFAULT_LAST_VARIANT,
			),
			// The installed version from appinfo/info.xml, so the overview page never shows a stale build-time number.
			'appVersion' => $this->appManager->getAppVersion(ThemeConfig::APP_ID),
		];
		return new JSONResponse($payload);
	}
}
