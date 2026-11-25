/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { recommended } from '@nextcloud/eslint-config'

export default [
	{
		// js/page/ is the webpack bundle and js/azure-has.js is written by scripts/lower-has.js from
		// src/azure-has.js (checked there); the other files in js/ are hand-written and are checked.
		ignores: ['js/page/**', 'js/azure-has.js', 'css/**', 'l10n/**', 'vendor/**', 'build/**', 'node_modules/**'],
	},
	...recommended,
	{
		// The Nextcloud preset ignores all of js/ (usually build output); here only js/page/ is built.
		ignores: ['!js/', 'js/page/', 'js/azure-has.js'],
	},
	{
		rules: {
			'jsdoc/require-jsdoc': 'off',
			'jsdoc/require-param-description': 'off',
			'jsdoc/require-param-type': 'off',
			'jsdoc/check-param-names': 'off',
			'jsdoc/no-undefined-types': 'off',
			'jsdoc/require-property-description': 'off',
			'vue/multi-word-component-names': 'off',
		},
	},
	{
		// Defined at build time by webpack's DefinePlugin.
		files: ['src/**'],
		languageOptions: {
			globals: {
				appName: 'readonly',
				appVersion: 'readonly',
			},
		},
	},
	{
		// Plain browser scripts loaded by Nextcloud with Util::addScript, not modules.
		files: ['js/*.js', 'src/azure-has.js'],
		languageOptions: {
			sourceType: 'script',
			globals: {
				OC: 'readonly',
				t: 'readonly',
			},
		},
	},
	{
		files: ['scripts/**/*.js', 'webpack.config.js'],
		languageOptions: {
			sourceType: 'commonjs',
			globals: {
				__dirname: 'readonly',
				module: 'writable',
				process: 'readonly',
				require: 'readonly',
			},
		},
		rules: {
			'no-console': 'off',
		},
	},
]
