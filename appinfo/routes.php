<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

return [
	'routes' => [
		['name' => 'page#index', 'url' => '/', 'verb' => 'GET'],
		['name' => 'api#status', 'url' => '/api/status', 'verb' => 'GET'],
		['name' => 'theme_settings#setVariant', 'url' => '/variant', 'verb' => 'PUT'],
		// Admin only: the Azure look on the login page, for the whole instance.
		['name' => 'theme_settings#setLoginStyle', 'url' => '/login-style', 'verb' => 'PUT'],
		// Admin only: the "Azure Theme" entry in the app menu, for the whole instance.
		['name' => 'theme_settings#setAppMenu', 'url' => '/app-menu', 'verb' => 'PUT'],
	],
];
