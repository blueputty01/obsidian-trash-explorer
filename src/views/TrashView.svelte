<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import type { Trash, TrashItem } from "../models";
	import { type TrashExplorerViewNode } from "../view";
	import SearchInput from "./SearchInput.svelte";
	import TrashItemView from "./TrashItemView.svelte";

	export let trash: Trash;

	let searchQuery = "";

	$: viewNodes = buildViewNodes(
		trash.items,
		searchQuery.trim().toLocaleUpperCase()
	);

	const dispatch = createEventDispatcher<{
		deleteAll: void;
	}>();

	function buildViewNodes(
		items: TrashItem[],
		filter: string
	): TrashExplorerViewNode[] {
		const nodes: TrashExplorerViewNode[] = [];

		for (const item of items) {
			const childNodes =
				item.kind === "folder"
					? buildViewNodes(item.children, filter)
					: [];

			if (childNodes.length || matchesFilter(item, filter)) {
				nodes.push({ item, nodes: childNodes });
			}
		}

		return nodes;
	}

	function matchesFilter(item: TrashItem, filter: string): boolean {
		return !filter || item.path.toLocaleUpperCase().includes(filter);
	}
</script>

<div class="container">
	{#if trash.isEmpty}
		<div class="pane-empty">The trash is empty.</div>
	{:else}
		<div>
			<SearchInput
				placeholder="Filter by name..."
				bind:query={searchQuery}
			/>
		</div>

		<button
			aria-label="Delete permanently"
			class="mod-warning trash-empty-button"
			on:click={() => dispatch("deleteAll")}
		>
			Empty Trash
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="svg-icon lucide-trash-2"
			>
				<path d="M3 6h18" />
				<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
				<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
				<line x1="10" x2="10" y1="11" y2="17" />
				<line x1="14" x2="14" y1="11" y2="17" />
			</svg>
		</button>

		<div class="node-list">
			{#each viewNodes as viewNode}
				<TrashItemView {viewNode} on:restore on:delete />
			{:else}
				<div class="pane-empty">Filter matched no files.</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.container {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.node-list {
		margin-top: 1em;
		overflow-y: auto;
	}

	.trash-empty-button {
		margin-top: 1em;
	}
</style>
