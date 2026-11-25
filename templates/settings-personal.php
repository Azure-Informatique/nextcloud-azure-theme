<?php
/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

script('azure_theme', 'azure-state');
style('azure_theme', 'azure-settings');

$variant = $_['variant'];
$lastVariant = $_['lastVariant'];
$enabled = $variant !== 'off';
$selectedVariant = $enabled ? $variant : $lastVariant;
$options = [
	'system' => [
		'title' => $l->t('System'),
		'description' => $l->t('Azure light or dark, matching the light or dark setting of your device.'),
		'label' => $l->t('Follow my device'),
	],
	'light' => [
		'title' => $l->t('Light'),
		'description' => $l->t('The Azure brand colours on a clean light appearance.'),
		'label' => $l->t('Always light'),
	],
	'dark' => [
		'title' => $l->t('Dark'),
		'description' => $l->t('The Azure brand colours on a dark appearance that reduces overall luminosity.'),
		'label' => $l->t('Always dark'),
	],
];
?>
<div id="azure_theme-settings" class="section">
	<h3><?php p($l->t('Azure theme')); ?></h3>
	<p class="settings-hint">
		<?php p($l->t('The Azure theme gives the standard Nextcloud apps a consistent, modern look.')); ?>
		<?php p($l->t('Turn on "Enable Azure theme" below, then choose System, Light or Dark. When you turn it off, your account goes back to your standard Nextcloud appearance.')); ?>
	</p>

	<p id="azure_theme-master-toggle" class="azure_theme-switch">
		<input type="checkbox"
			id="azure_theme-enabled"
			class="checkbox"
			<?php if ($enabled) {
				print_unescaped(' checked');
			} ?>>
		<label for="azure_theme-enabled"><?php p($l->t('Enable Azure theme')); ?></label>
	</p>

	<div class="azure_theme-theme-card">
		<?php foreach ($options as $value => $option): ?>
			<div class="azure_theme-theme-card__item">
				<?php // The preview is a label for the radio below, so clicking the image selects that theme.?>
				<label for="azure_theme-variant-<?php p($value); ?>"
					class="azure_theme-theme-card__preview azure_theme-theme-card__preview--<?php p($value); ?>"
					aria-hidden="true"></label>
				<div class="azure_theme-theme-card__body">
					<h3><?php p($option['title']); ?></h3>
					<p><?php p($option['description']); ?></p>
					<p>
						<input type="radio"
							id="azure_theme-variant-<?php p($value); ?>"
							class="radio"
							name="azure_theme-variant"
							value="<?php p($value); ?>"
								<?php if (!$enabled) {
									print_unescaped(' disabled');
								} ?>
							<?php if ($selectedVariant === $value) {
								print_unescaped(' checked');
							} ?>>
						<label for="azure_theme-variant-<?php p($value); ?>"><?php p($option['label']); ?></label>
					</p>
				</div>
			</div>
		<?php endforeach; ?>
	</div>

	<?php /* Site-wide, so only admins see it. It works whether or not the admin uses the Azure theme themselves. */ ?>
	<?php if ($_['isAdmin']): ?>
		<div id="azure_theme-login-style" class="azure_theme-login-style">
			<p class="azure_theme-switch">
				<input type="checkbox"
					id="azure_theme-login-style-enabled"
					class="checkbox"
					aria-describedby="azure_theme-login-style-hint"
					<?php /* Stops the browser restoring an old position on reload, so the switch always shows the saved value. */ ?>
					autocomplete="off"
					<?php if ($_['loginStyleEnabled']) {
						print_unescaped(' checked');
					} ?>>
				<label for="azure_theme-login-style-enabled"><?php p($l->t('Use Azure look on the login page')); ?></label>
			</p>
			<?php /* Chaque explication suit son interrupteur, comme celle du menu des applications. */ ?>
			<p class="settings-hint" id="azure_theme-login-style-hint">
				<?php p($l->t('Shows the Azure look on the login page for everyone. Turn it off to use the standard Nextcloud login page.')); ?>
				<strong><?php p($l->t('Only admins see this setting.')); ?></strong>
			</p>
			<p class="azure_theme-switch">
				<input type="checkbox"
					id="azure_theme-app-menu-shown"
					class="checkbox"
					aria-describedby="azure_theme-app-menu-hint"
					autocomplete="off"
					<?php if ($_['appMenuShown']) {
						print_unescaped(' checked');
					} ?>>
				<label for="azure_theme-app-menu-shown"><?php p($l->t('Show Azure Theme in the app menu')); ?></label>
			</p>
			<p class="settings-hint" id="azure_theme-app-menu-hint">
				<?php p($l->t('When hidden, everyone still chooses their variant here, in Appearance and accessibility.')); ?>
			</p>
		</div>
	<?php endif; ?>
</div>
