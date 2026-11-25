<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\UserMigration;

use OCA\AzureTheme\ThemeConfig;
use OCP\Config\IUserConfig;
use OCP\IL10N;
use OCP\IUser;
use OCP\UserMigration\IExportDestination;
use OCP\UserMigration\IImportSource;
use OCP\UserMigration\IMigrator;
use Symfony\Component\Console\Output\OutputInterface;

class VariantMigrator implements IMigrator {
	private const EXPORT_PATH = ThemeConfig::APP_ID . '/variant.json';

	public function __construct(
		private IUserConfig $userConfig,
		private IL10N $l,
	) {
	}

	public function export(IUser $user, IExportDestination $exportDestination, OutputInterface $output): void {
		$userId = $user->getUID();
		$variant = $this->userConfig->getValueString($userId, ThemeConfig::APP_ID, ThemeConfig::CONFIG_KEY_VARIANT, ThemeConfig::DEFAULT_VARIANT);
		$lastVariant = $this->userConfig->getValueString($userId, ThemeConfig::APP_ID, ThemeConfig::CONFIG_KEY_LAST_VARIANT, ThemeConfig::DEFAULT_LAST_VARIANT);

		if ($variant === ThemeConfig::DEFAULT_VARIANT && $lastVariant === ThemeConfig::DEFAULT_LAST_VARIANT) {
			return;
		}

		$exportDestination->addFileContents(self::EXPORT_PATH, json_encode([
			'variant' => $variant,
			'last_variant' => $lastVariant,
		], JSON_THROW_ON_ERROR));
	}

	public function import(IUser $user, IImportSource $importSource, OutputInterface $output): void {
		if (!$importSource->pathExists(self::EXPORT_PATH)) {
			return;
		}

		// Une archive d'import vient de l'extérieur : seules les valeurs connues sont reprises,
		// et un fichier illisible n'empêche pas le reste de la migration du compte.
		try {
			$data = json_decode($importSource->getFileContents(self::EXPORT_PATH), true, 4, JSON_THROW_ON_ERROR);
		} catch (\JsonException) {
			$output->writeln('Azure theme: unreadable settings file, skipped.');
			return;
		}
		if (!\is_array($data)) {
			return;
		}
		$userId = $user->getUID();

		$variant = $data['variant'] ?? null;
		if (\is_string($variant) && \in_array($variant, ThemeConfig::VARIANTS, true)) {
			$this->userConfig->setValueString($userId, ThemeConfig::APP_ID, ThemeConfig::CONFIG_KEY_VARIANT, $variant);
		}
		$lastVariant = $data['last_variant'] ?? null;
		if (\is_string($lastVariant) && \in_array($lastVariant, ThemeConfig::ENABLED_VARIANTS, true)) {
			$this->userConfig->setValueString($userId, ThemeConfig::APP_ID, ThemeConfig::CONFIG_KEY_LAST_VARIANT, $lastVariant);
		}
	}

	public function getId(): string {
		return ThemeConfig::APP_ID;
	}

	// Nom et description affichés dans « Migration des données » : traduits dans la langue du compte.
	public function getDisplayName(): string {
		return $this->l->t('Azure theme');
	}

	public function getDescription(): string {
		return $this->l->t('Your selected Azure theme variant (system/light/dark/off).');
	}

	public function getVersion(): int {
		return 1;
	}

	/**
	 * Toujours vrai : une archive sans réglage du thème (instance sans l'app, ou variante par défaut)
	 * ne doit jamais bloquer la migration du compte ; import() ne fait alors rien.
	 */
	public function canImport(IImportSource $importSource): bool {
		return true;
	}
}
