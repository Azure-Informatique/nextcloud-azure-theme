<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\Command;

use OCA\AzureTheme\ThemeConfig;
use OCP\Config\IUserConfig;
use OCP\IAppConfig;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * Erases everything the Azure theme stored: each account's variant and the two site-wide switches
 * (login page, app menu). Run it before removing the app for good.
 *
 * This is deliberately a command and not an uninstall repair step: Nextcloud runs uninstall steps on
 * every `app:disable`, so a repair step would wipe every account's choice during a simple disable
 * (troubleshooting, or an automatic disable during a server upgrade). Nextcloud's own keys for the
 * app (enabled, installed version) are left alone.
 */
class PurgeSettings extends Command {
	/** Site-wide values the app writes itself. */
	public const APP_KEYS = [
		ThemeConfig::APP_CONFIG_KEY_LOGIN_STYLE,
		ThemeConfig::APP_CONFIG_KEY_APP_MENU,
	];

	public function __construct(
		private IUserConfig $userConfig,
		private IAppConfig $appConfig,
	) {
		parent::__construct();
	}

	protected function configure(): void {
		$this->setName('azure_theme:purge-settings')
			->setDescription('Erase every Azure theme setting (all accounts\' variants and the site-wide switches)')
			->addOption('force', 'f', InputOption::VALUE_NONE, 'Confirm the erase');
	}

	protected function execute(InputInterface $input, OutputInterface $output): int {
		if ($input->getOption('force') !== true) {
			$output->writeln('<comment>This erases every account\'s Azure theme variant and the site-wide switches. Run again with --force to confirm.</comment>');
			return self::FAILURE;
		}

		$this->userConfig->deleteApp(ThemeConfig::APP_ID);
		foreach (self::APP_KEYS as $key) {
			$this->appConfig->deleteKey(ThemeConfig::APP_ID, $key);
		}
		$output->writeln('<info>Azure theme settings erased.</info>');
		return self::SUCCESS;
	}
}
