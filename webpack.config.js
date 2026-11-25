/**
 * SPDX-FileCopyrightText: 2026 Nexeno contributors
 * SPDX-FileCopyrightText: 2026 Azure Informatique
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
const path = require('path')
const { VueLoaderPlugin } = require('vue-loader')
const { DefinePlugin } = require('webpack')
const { name, version } = require('./package.json')

module.exports = {
	mode: 'production',
	entry: {
		main: path.join(__dirname, 'src', 'main.js'),
	},
	output: {
		path: path.join(__dirname, 'js', 'page'),
		filename: '[name].js',
		clean: true,
	},
	resolve: {
		extensions: ['.js', '.vue'],
	},
	module: {
		rules: [
			{ test: /\.vue$/, loader: 'vue-loader' },
			{ test: /\.css$/, use: ['style-loader', 'css-loader'] },
			{
				test: /\.(png|jpe?g|webp|gif|svg)$/,
				type: 'asset/resource',
				generator: { filename: 'img/[name].[contenthash:8][ext]' },
			},
		],
	},
	plugins: [
		new VueLoaderPlugin(),
		new DefinePlugin({
			appName: JSON.stringify(name),
			appVersion: JSON.stringify(version),
			// Indicateurs de compilation de Vue 3 : rien des outils de développement dans le paquet livré.
			__VUE_OPTIONS_API__: JSON.stringify(true),
			__VUE_PROD_DEVTOOLS__: JSON.stringify(false),
			__VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
		}),
	],
}
