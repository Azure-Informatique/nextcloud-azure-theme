<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme;

class ThemeConfig {
	public const APP_ID = 'azure_theme';
	public const THEMING_APP_ID = 'theming';

	/**
	 * Apps rendered without the Azure theme (matches the `app-<id>` class on #content).
	 */
	public const EXCLUDED_APPS = [];

	/**
	 * Feuille d'app empruntée par une autre app qui affiche la même interface : les pages de partage
	 * public (files_sharing) montrent la liste de Fichiers. Voir PageAssets::appStylesheet().
	 */
	public const APP_STYLESHEET_ALIASES = ['files_sharing' => 'files'];

	/**
	 * Saved variants. "system" follows the device's light or dark setting and is resolved in the browser.
	 */
	public const VARIANT_OFF = 'off';
	public const VARIANT_SYSTEM = 'system';
	public const VARIANTS = [self::VARIANT_OFF, self::VARIANT_SYSTEM, 'light', 'dark'];
	public const ENABLED_VARIANTS = [self::VARIANT_SYSTEM, 'light', 'dark'];
	/** Variant of users who have not chosen one yet: the theme is on, following the device's light or dark setting. */
	public const DEFAULT_VARIANT = self::VARIANT_SYSTEM;
	/** Variant preselected when a user turns the theme back on. */
	public const DEFAULT_LAST_VARIANT = self::VARIANT_SYSTEM;

	public const CONFIG_KEY_VARIANT = 'variant';
	public const CONFIG_KEY_LAST_VARIANT = 'last_variant';
	/** Initial state : variante enregistrée, même quand un thème à contraste élevé la met en pause. */
	public const CONFIG_KEY_SAVED_VARIANT = 'saved_variant';

	/**
	 * Scripts chargés sur les pages connectées (fichiers js/, avec leurs variantes -ncNN par version).
	 * Un seul : l'état de la variante (bascule sans rechargement, marqueurs de thème du <body>).
	 * Toute l'apparence est en CSS ; aucun script ne modifie le DOM des apps.
	 */
	public const SCRIPTS = ['azure-state'];

	/**
	 * Site-wide switch (app config, "yes" or "no") for the Azure look on the login page. The login page
	 * is shown before anyone signs in, so it cannot follow a per-user choice. Only admins can change it.
	 */
	public const APP_CONFIG_KEY_LOGIN_STYLE = 'login_style';
	public const LOGIN_STYLE_ON = 'yes';
	public const LOGIN_STYLE_OFF = 'no';
	/** On by default, so existing installs keep the styled login page. */
	public const DEFAULT_LOGIN_STYLE = self::LOGIN_STYLE_ON;

	/** Whether "Azure Theme" is listed in the app menu, for the whole instance. */
	public const APP_CONFIG_KEY_APP_MENU = 'app_menu';
	public const APP_MENU_SHOWN = 'yes';
	public const APP_MENU_HIDDEN = 'no';
	public const DEFAULT_APP_MENU = self::APP_MENU_SHOWN;

	/** Initial state with the user's own Nextcloud theme ids, so the browser can switch to "off" without waiting for the server. */
	public const INITIAL_STATE_USER_THEMES = 'user-themes';
}
