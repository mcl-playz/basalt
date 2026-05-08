<script lang="ts">
	import { store } from "$lib/message/store";
	import { getTabState } from "$lib/state.svelte";
    import { type Message } from "@basalt/types";

    const tabState = getTabState();
    let message = $state<Message>();
    let isLoading = $state(true);

    $effect(() => {
        isLoading = true;
        if(!tabState.activeTab || tabState.activeTab.type !== "message") return;
        store.getMessage(tabState.activeTab.mailbox, tabState.activeTab.uid)
            .then((result) => {message = result; isLoading = false;})
    })
</script>

{JSON.stringify(message)}
