<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\Listener;

use OCA\AzureTheme\Service\LoginStyle;
use OCA\AzureTheme\Service\PageAssets;
use OCP\AppFramework\Http\Events\BeforeLoginTemplateRenderedEvent;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;

/**
 * @template-implements IEventListener<Event>
 */
class BeforeLoginTemplateRenderedListener implements IEventListener {
	public function __construct(
		private LoginStyle $loginStyle,
		private PageAssets $assets,
	) {
	}

	public function handle(Event $event): void {
		if (!($event instanceof BeforeLoginTemplateRenderedEvent)) {
			return;
		}
		// Un administrateur peut désactiver l'apparence Azure de la page de connexion pour toute l'instance.
		if (!$this->loginStyle->isEnabled()) {
			return;
		}

		$this->assets->addStyle('azure-login', true);
	}
}
