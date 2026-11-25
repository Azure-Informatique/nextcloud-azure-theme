<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\AppInfo;

use OCA\AzureTheme\Listener\BeforeLoginTemplateRenderedListener;
use OCA\AzureTheme\Listener\BeforeTemplateRenderedListener;
use OCA\AzureTheme\Service\AppMenuEntry;
use OCA\AzureTheme\UserMigration\VariantMigrator;
use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\AppFramework\Http\Events\BeforeLoginTemplateRenderedEvent;
use OCP\AppFramework\Http\Events\BeforeTemplateRenderedEvent;
use OCP\INavigationManager;
use OCP\IURLGenerator;
use OCP\IUserSession;
use OCP\L10N\IFactory;

class Application extends App implements IBootstrap {
	public const APP_ID = 'azure_theme';

	public function __construct() {
		parent::__construct(self::APP_ID);
	}

	public function register(IRegistrationContext $context): void {
		$context->registerEventListener(
			BeforeTemplateRenderedEvent::class,
			BeforeTemplateRenderedListener::class,
		);
		$context->registerEventListener(
			BeforeLoginTemplateRenderedEvent::class,
			BeforeLoginTemplateRenderedListener::class,
		);
		$context->registerUserMigrator(VariantMigrator::class);
	}

	public function boot(IBootContext $context): void {
		$context->injectFn(\Closure::fromCallable([$this, 'registerNavigation']));
	}

	private function registerNavigation(
		INavigationManager $navigationManager,
		IUserSession $userSession,
		IURLGenerator $urlGenerator,
		IFactory $l10nFactory,
		AppMenuEntry $appMenuEntry,
	): void {
		// Admins can take the entry out of the app menu for everyone (setting in Appearance and accessibility).
		if ($userSession->getUser() === null || !$appMenuEntry->isShown()) {
			return;
		}

		$navigationManager->add(static function () use ($urlGenerator, $l10nFactory): array {
			return [
				'id' => self::APP_ID,
				'order' => 10,
				'type' => 'link',
				'href' => $urlGenerator->linkToRoute(self::APP_ID . '.page.index'),
				'icon' => $urlGenerator->imagePath(self::APP_ID, 'app.svg'),
				'name' => $l10nFactory->get(self::APP_ID)->t('Azure Theme'),
			];
		});
	}
}
