<!--
  - SPDX-FileCopyrightText: 2026 Nexeno contributors
  - SPDX-FileCopyrightText: 2026 Azure Informatique
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->
<template>
	<NcContent appName="azure_theme">
		<AppSidebar />
		<NcAppContent>
			<div class="azure-content">
				<router-view />
			</div>
		</NcAppContent>
	</NcContent>
</template>

<script>
import NcAppContent from '@nextcloud/vue/components/NcAppContent'
import NcContent from '@nextcloud/vue/components/NcContent'
import AppSidebar from './components/AppSidebar.vue'
import { refresh } from './store.js'

export default {
	name: 'App',
	components: {
		NcContent,
		NcAppContent,
		AppSidebar,
	},

	mounted() {
		refresh()
	},
}
</script>
