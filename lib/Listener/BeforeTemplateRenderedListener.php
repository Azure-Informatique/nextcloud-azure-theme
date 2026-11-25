<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\Listener;

use OCA\AzureTheme\Service\CoreTheming;
use OCA\AzureTheme\Service\LoginStyle;
use OCA\AzureTheme\Service\PageAssets;
use OCA\AzureTheme\ThemeConfig;
use OCP\App\IAppManager;
use OCP\AppFramework\Http\Events\BeforeTemplateRenderedEvent;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Services\IInitialState;
use OCP\Config\IUserConfig;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\IRequest;
use OCP\IUserSession;

/**
 * Ajoute le thème Azure aux pages de Nextcloud.
 *
 * Tout passe par des feuilles de style choisies ici, côté serveur : la palette de la variante
 * (claire, sombre ou « système » par media query) puis les règles de mise en page, découpées en une
 * base commune, une feuille par app (chargée sur les seules pages de cette app) et le cadre commun. La page est
 * donc juste dès le premier affichage, sans script en ligne ni classe interne de Nextcloud.
 * Les thèmes d'accessibilité de Nextcloud (contraste élevé) gardent la priorité : quand l'un
 * d'eux est actif, le thème Azure ne se charge pas.
 *
 * @template-implements IEventListener<Event>
 */
class BeforeTemplateRenderedListener implements IEventListener {
	private const STYLESHEET = 'azure-theme';
	private const FINAL_STYLESHEET = 'azure-cadre';
	private const PUBLIC_STYLESHEET = 'azure-public';
	private const HAS_SCRIPT = 'azure-has';

	public function __construct(
		private IUserSession $userSession,
		private IUserConfig $userConfig,
		private IInitialState $initialState,
		private CoreTheming $coreTheming,
		private LoginStyle $loginStyle,
		private PageAssets $assets,
		private IAppManager $appManager,
		private IRequest $request,
	) {
	}

	public function handle(Event $event): void {
		if (!($event instanceof BeforeTemplateRenderedEvent)) {
			return;
		}

		if (!$event->isLoggedIn()) {
			$this->handleAnonymous($event);
			return;
		}

		$user = $this->userSession->getUser();
		if ($user === null) {
			return;
		}
		if (in_array($event->getResponse()->getApp(), ThemeConfig::EXCLUDED_APPS, true)) {
			return;
		}
		// L'administrateur peut réserver l'app à certains groupes : rien pour les autres comptes.
		if (!$this->appManager->isEnabledForUser(ThemeConfig::APP_ID, $user)) {
			return;
		}

		$uid = $user->getUID();
		$variant = $this->userConfig->getValueString($uid, ThemeConfig::APP_ID, ThemeConfig::CONFIG_KEY_VARIANT, ThemeConfig::DEFAULT_VARIANT);
		if (!in_array($variant, ThemeConfig::VARIANTS, true)) {
			$variant = ThemeConfig::DEFAULT_VARIANT;
		}
		// Thème imposé par l'administrateur (config.php « enforce_theme ») : il prime sur le choix de l'utilisateur.
		$enforced = $this->coreTheming->enforcedTheme();
		$userThemes = $enforced !== '' ? [$enforced] : $this->coreTheming->enabledThemes($uid);
		if (in_array($variant, ThemeConfig::ENABLED_VARIANTS, true)) {
			$variant = match ($enforced) {
				'light', 'dark' => $enforced,
				'default' => ThemeConfig::VARIANT_SYSTEM,
				default => $variant,
			};
		}
		$active = in_array($variant, ThemeConfig::ENABLED_VARIANTS, true)
			&& !$this->coreTheming->usesHighContrast($userThemes);

		$this->initialState->provideInitialState(ThemeConfig::CONFIG_KEY_VARIANT, $active ? $variant : ThemeConfig::VARIANT_OFF);
		$this->initialState->provideInitialState(ThemeConfig::CONFIG_KEY_SAVED_VARIANT, $variant);
		$this->initialState->provideInitialState(ThemeConfig::INITIAL_STATE_USER_THEMES, $userThemes);

		$renderAs = $event->getResponse()->getRenderAs();

		$this->assets->addTranslations();
		if ($active) {
			// Jetons des conditions :has() restantes (voir scripts/lower-has.js), posés avant le rendu des apps.
			$this->assets->addInitScript(self::HAS_SCRIPT);
			$this->assets->addStyle('azure-palette-' . $variant);
			$this->assets->addStyles($this->themeStylesheets($event->getResponse()->getApp(), $renderAs));
			if ($renderAs === TemplateResponse::RENDER_AS_PUBLIC) {
				$this->assets->addStyle(self::PUBLIC_STYLESHEET);
			}
		}
		// Pages d'erreur et pages « invité » vues avec une session ouverte : même apparence que la connexion.
		if (in_array($renderAs, [TemplateResponse::RENDER_AS_GUEST, TemplateResponse::RENDER_AS_ERROR], true)
			&& $this->loginStyle->isEnabled()) {
			$this->assets->addStyle('azure-login', true);
		}
		foreach (ThemeConfig::SCRIPTS as $script) {
			$this->assets->addScript($script);
		}
	}

	/**
	 * Feuilles du thème d'une page, dans l'ordre de la cascade : la base commune, la feuille de l'app
	 * qui rend la page s'il en existe une, puis les règles communes finales (cadre), qui l'emportent à
	 * poids égal. Leurs compléments -ncNN suivent, version par version (PageAssets::addStyles).
	 * La feuille de l'app ne va qu'aux pages mises en page par Nextcloud (utilisateur ou publique) :
	 * c'est là que #content porte la classe app-<app>, que la compilation tient pour acquise.
	 *
	 * @return list<string>
	 */
	private function themeStylesheets(string $app, string $renderAs): array {
		$appSheet = in_array($renderAs, [TemplateResponse::RENDER_AS_USER, TemplateResponse::RENDER_AS_PUBLIC], true)
			? $this->assets->appStylesheet($app, null, $this->settingsSection())
			: null;
		return $appSheet === null
			? [self::STYLESHEET, self::FINAL_STYLESHEET]
			: [self::STYLESHEET, $appSheet, self::FINAL_STYLESHEET];
	}

	/**
	 * Section des réglages affichée (« user/<id> » ou « admin/<id> »), ou null hors des pages de
	 * réglages par section. Même valeur que l'entrée active de la navigation des réglages : le
	 * paramètre de route « section » (personal-info et server par défaut).
	 */
	private function settingsSection(): ?string {
		if (preg_match('#^/settings/(user|admin)(?:/|$)#', $this->request->getPathInfo() ?: '', $m) !== 1) {
			return null;
		}
		$section = $this->request->getParam('section');
		return is_string($section) && preg_match('/^[a-z0-9_-]+$/', $section) === 1 ? $m[1] . '/' . $section : null;
	}

	/**
	 * Pages sans compte connecté : 2FA, erreurs et autres pages « invité » prennent l'apparence de la
	 * page de connexion (si l'administrateur ne l'a pas désactivée) ; les pages publiques (partages
	 * par lien, formulaires, rendez-vous…) prennent la palette « système » et leur mise en page.
	 */
	private function handleAnonymous(BeforeTemplateRenderedEvent $event): void {
		$renderAs = $event->getResponse()->getRenderAs();

		if ($renderAs === TemplateResponse::RENDER_AS_PUBLIC) {
			$this->assets->addStyle('azure-palette-' . ThemeConfig::VARIANT_SYSTEM);
			$this->assets->addStyle(self::PUBLIC_STYLESHEET);
			return;
		}
		if (in_array($renderAs, [TemplateResponse::RENDER_AS_GUEST, TemplateResponse::RENDER_AS_ERROR], true)
			&& $this->loginStyle->isEnabled()) {
			$this->assets->addStyle('azure-login', true);
		}
	}
}
