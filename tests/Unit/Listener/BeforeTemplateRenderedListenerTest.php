<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\AzureTheme\Tests\Unit\Listener;

use OCA\AzureTheme\Listener\BeforeTemplateRenderedListener;
use OCA\AzureTheme\Service\CoreTheming;
use OCA\AzureTheme\Service\LoginStyle;
use OCA\AzureTheme\Service\PageAssets;
use OCA\AzureTheme\ThemeConfig;
use OCP\App\IAppManager;
use OCP\AppFramework\Http\Events\BeforeTemplateRenderedEvent;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Services\IInitialState;
use OCP\Config\IUserConfig;
use OCP\IConfig;
use OCP\IRequest;
use OCP\IUser;
use OCP\IUserSession;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class BeforeTemplateRenderedListenerTest extends TestCase {
	/** @var list<string> */
	private array $styles = [];
	/** @var list<string> */
	private array $initScripts = [];
	/** @var array<string, mixed> */
	private array $initialState = [];
	/** Dossier css/ factice : feuilles d'app de Fichiers, Talk et des réglages seulement. */
	private string $cssDir;

	protected function setUp(): void {
		$this->cssDir = sys_get_temp_dir() . '/azure-theme-css-' . bin2hex(random_bytes(4));
		mkdir($this->cssDir);
		foreach (['azure-app-files', 'azure-app-spreed', 'azure-app-files-nc35', 'azure-app-settings--aucune', 'azure-app-settings--sharing', 'azure-app-settings--user-security', 'azure-app-settings--admin-security', 'azure-app-settings--server-nc35'] as $name) {
			touch($this->cssDir . '/' . $name . '.css');
		}
	}

	protected function tearDown(): void {
		array_map('unlink', glob($this->cssDir . '/*') ?: []);
		rmdir($this->cssDir);
	}

	private function listener(?string $variant, string $nextcloudThemes = '["default"]', bool $loginStyle = true, string $enforcedTheme = '', bool $enabledForUser = true, string $path = '/apps/files/', ?string $section = null): BeforeTemplateRenderedListener {
		$user = $this->createStub(IUser::class);
		$user->method('getUID')->willReturn('alice');
		$session = $this->createStub(IUserSession::class);
		$session->method('getUser')->willReturn($user);

		$userConfig = $this->createStub(IUserConfig::class);
		$userConfig->method('getValueString')->willReturnCallback(
			static fn (string $uid, string $app, string $key, string $default): string => $variant ?? $default,
		);
		$config = $this->createStub(IConfig::class);
		$config->method('getUserValue')->willReturnMap([['alice', 'theming', 'enabled-themes', '', $nextcloudThemes]]);
		$config->method('getSystemValueString')->willReturnMap([['enforce_theme', '', $enforcedTheme]]);
		$appManager = $this->createStub(IAppManager::class);
		$appManager->method('isEnabledForUser')->willReturn($enabledForUser);

		$state = $this->createStub(IInitialState::class);
		$state->method('provideInitialState')->willReturnCallback(function (string $key, mixed $value): void {
			$this->initialState[$key] = $value;
		});
		$login = $this->createStub(LoginStyle::class);
		$login->method('isEnabled')->willReturn($loginStyle);
		$assets = $this->createStub(PageAssets::class);
		$assets->method('addStyle')->willReturnCallback(function (string $name): void {
			$this->styles[] = $name;
		});
		$assets->method('addStyles')->willReturnCallback(function (array $names): void {
			array_push($this->styles, ...$names);
		});
		$assets->method('addInitScript')->willReturnCallback(function (string $name): void {
			$this->initScripts[] = $name;
		});
		$real = new PageAssets();
		$assets->method('appStylesheet')->willReturnCallback(fn (string $app, ?string $dir = null, ?string $sectionId = null): ?string => $real->appStylesheet($app, $this->cssDir, $sectionId));
		$request = $this->createStub(IRequest::class);
		$request->method('getPathInfo')->willReturn($path);
		$request->method('getParam')->willReturnMap([['section', null, $section]]);

		return new BeforeTemplateRenderedListener($session, $userConfig, $state, new CoreTheming($config), $login, $assets, $appManager, $request);
	}

	private function event(bool $loggedIn, string $renderAs = TemplateResponse::RENDER_AS_USER, string $app = 'files'): BeforeTemplateRenderedEvent {
		return new BeforeTemplateRenderedEvent($loggedIn, new TemplateResponse($app, 'main', [], $renderAs));
	}

	public static function variants(): array {
		return [['system'], ['light'], ['dark']];
	}

	#[DataProvider('variants')]
	public function testLoadsThePaletteOfTheVariant(string $variant): void {
		$this->listener($variant)->handle($this->event(true));
		self::assertSame(['azure-palette-' . $variant, 'azure-theme', 'azure-app-files', 'azure-cadre'], $this->styles);
		self::assertSame($variant, $this->initialState[ThemeConfig::CONFIG_KEY_VARIANT]);
	}

	public function testOnByDefaultFollowingTheDevice(): void {
		$this->listener(null)->handle($this->event(true));
		self::assertSame(['azure-palette-system', 'azure-theme', 'azure-app-files', 'azure-cadre'], $this->styles);
	}

	public function testActiveThemeLoadsTheHasTokenScript(): void {
		$this->listener('dark')->handle($this->event(true));
		self::assertSame(['azure-has'], $this->initScripts);
	}

	public function testOffLoadsNoStylesheet(): void {
		$this->listener('off')->handle($this->event(true));
		self::assertSame([], $this->styles);
		self::assertSame([], $this->initScripts);
		self::assertSame('off', $this->initialState[ThemeConfig::CONFIG_KEY_VARIANT]);
	}

	public function testUnknownSavedValueFallsBackToDefault(): void {
		$this->listener('<script>')->handle($this->event(true));
		self::assertSame(['azure-palette-system', 'azure-theme', 'azure-app-files', 'azure-cadre'], $this->styles);
	}

	public function testHighContrastPausesTheTheme(): void {
		$this->listener('dark', '["dark-highcontrast"]')->handle($this->event(true));
		self::assertSame([], $this->styles);
		self::assertSame([], $this->initScripts);
		self::assertSame('off', $this->initialState[ThemeConfig::CONFIG_KEY_VARIANT]);
		self::assertSame('dark', $this->initialState[ThemeConfig::CONFIG_KEY_SAVED_VARIANT]);
	}

	public function testDyslexiaFontKeepsTheTheme(): void {
		$this->listener('light', '["light","opendyslexic"]')->handle($this->event(true));
		self::assertSame(['azure-palette-light', 'azure-theme', 'azure-app-files', 'azure-cadre'], $this->styles);
	}

	public function testPublicPageForSignedInUserAddsPublicStylesheet(): void {
		$this->listener('dark')->handle($this->event(true, TemplateResponse::RENDER_AS_PUBLIC, 'files_sharing'));
		self::assertSame(['azure-palette-dark', 'azure-theme', 'azure-app-files', 'azure-cadre', 'azure-public'], $this->styles);
	}

	public function testPublicPageWithoutAccountUsesSystemPalette(): void {
		$this->listener(null)->handle($this->event(false, TemplateResponse::RENDER_AS_PUBLIC, 'files_sharing'));
		self::assertSame(['azure-palette-system', 'azure-public'], $this->styles);
	}

	public function testGuestPageWithoutAccountUsesLoginLook(): void {
		$this->listener(null)->handle($this->event(false, TemplateResponse::RENDER_AS_GUEST, 'core'));
		self::assertSame(['azure-login'], $this->styles);
	}

	public function testGuestPageFollowsTheAdminSwitch(): void {
		$this->listener(null, '["default"]', false)->handle($this->event(false, TemplateResponse::RENDER_AS_ERROR, 'core'));
		self::assertSame([], $this->styles);
	}

	public function testErrorPageForSignedInUserUsesLoginLook(): void {
		$this->listener('light')->handle($this->event(true, TemplateResponse::RENDER_AS_ERROR, 'core'));
		self::assertSame(['azure-palette-light', 'azure-theme', 'azure-cadre', 'azure-login'], $this->styles);
	}

	public static function appPages(): array {
		return [
			'Fichiers' => ['files', 'azure-app-files'],
			'partage public : la liste de Fichiers' => ['files_sharing', 'azure-app-files'],
			'Talk (identifiant spreed)' => ['spreed', 'azure-app-spreed'],
			'réglages hors section : variante « aucune »' => ['settings', 'azure-app-settings--aucune'],
			'app sans feuille propre' => ['dashboard', null],
			'page du cœur' => ['core', null],
			'identifiant hors motif' => ['../files', null],
			'majuscules refusées' => ['Files', null],
			'complément de version, pas une feuille d\'app' => ['files-nc35', null],
		];
	}

	#[DataProvider('appPages')]
	public function testLoadsTheStylesheetOfTheAppBetweenBaseAndFrame(string $app, ?string $sheet): void {
		$this->listener('light')->handle($this->event(true, TemplateResponse::RENDER_AS_USER, $app));
		$expected = $sheet === null
			? ['azure-palette-light', 'azure-theme', 'azure-cadre']
			: ['azure-palette-light', 'azure-theme', $sheet, 'azure-cadre'];
		self::assertSame($expected, $this->styles);
	}

	public static function settingsSections(): array {
		return [
			'section commune aux deux pages' => ['/settings/admin/sharing', 'sharing', 'azure-app-settings--sharing'],
			'section propre à la page personnelle' => ['/settings/user/security', 'security', 'azure-app-settings--user-security'],
			'section propre à l\'administration' => ['/settings/admin/security', 'security', 'azure-app-settings--admin-security'],
			'section sans règle propre' => ['/settings/admin/server', 'server', 'azure-app-settings--aucune'],
			'comptes (pas une section)' => ['/settings/users', null, 'azure-app-settings--aucune'],
			'identifiant de section hors motif' => ['/settings/admin/x', '../sharing', 'azure-app-settings--aucune'],
			'nom d\'un complément de version (adresse fabriquée)' => ['/settings/user/server-nc35', 'server-nc35', 'azure-app-settings--aucune'],
		];
	}

	#[DataProvider('settingsSections')]
	public function testSettingsPagesGetTheVariantOfTheirSection(string $path, ?string $section, string $sheet): void {
		$this->listener('light', '["default"]', true, '', true, $path, $section)->handle($this->event(true, TemplateResponse::RENDER_AS_USER, 'settings'));
		self::assertSame(['azure-palette-light', 'azure-theme', $sheet, 'azure-cadre'], $this->styles);
	}

	public function testAppStylesheetOnlyOnPagesLaidOutByNextcloud(): void {
		$this->listener('light')->handle($this->event(true, TemplateResponse::RENDER_AS_BASE, 'spreed'));
		self::assertSame(['azure-palette-light', 'azure-theme', 'azure-cadre'], $this->styles);
	}

	public function testNoAppStylesheetWhenTheThemeIsOff(): void {
		$this->listener('off')->handle($this->event(true, TemplateResponse::RENDER_AS_USER, 'spreed'));
		self::assertSame([], $this->styles);
	}

	public function testOtherPagesNeverGetAnotherAppsStylesheet(): void {
		$this->listener('dark')->handle($this->event(true, TemplateResponse::RENDER_AS_USER, 'spreed'));
		self::assertNotContains('azure-app-files', $this->styles);
		self::assertNotContains('azure-app-settings--aucune', $this->styles);
	}

	public function testNothingForAccountsOutsideTheAllowedGroups(): void {
		$this->listener('dark', '["default"]', true, '', false)->handle($this->event(true));
		self::assertSame([], $this->styles);
		self::assertSame([], $this->initialState);
	}

	public function testEnforcedDarkThemeWins(): void {
		$this->listener('light', '["light"]', true, 'dark')->handle($this->event(true));
		self::assertSame('azure-palette-dark', $this->styles[0]);
	}

	public function testEnforcedHighContrastPausesTheTheme(): void {
		$this->listener('light', '["light"]', true, 'dark-highcontrast')->handle($this->event(true));
		self::assertSame([], $this->styles);
	}

	public function testEnforcedThemeKeepsUserOptOut(): void {
		$this->listener('off', '["light"]', true, 'dark')->handle($this->event(true));
		self::assertSame([], $this->styles);
	}
}
