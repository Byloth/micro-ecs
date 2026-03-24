<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

import type { WorldSnapshot } from "../shared/protocol.js";

const PORT = 5175;

const snapshot = ref<WorldSnapshot | null>(null);
const connected = ref(false);

let ws: WebSocket | null = null;
let reconnectId: ReturnType<typeof setTimeout> | null = null;

function connect(): void
{
    ws = new WebSocket(`ws://localhost:${PORT}?type=viewer`);

    ws.addEventListener("open", () => { connected.value = true; });
    ws.addEventListener("message", (event) =>
    {
        const msg = JSON.parse(event.data as string) as { type: string; payload: WorldSnapshot };

        if (msg.type === "snapshot") { snapshot.value = msg.payload; }
    });
    ws.addEventListener("close", () =>
    {
        connected.value = false;
        reconnectId = setTimeout(connect, 2_000);
    });
    ws.addEventListener("error", () => ws?.close());
}

onMounted(() => connect());
onUnmounted(() =>
{
    if (reconnectId !== null) { clearTimeout(reconnectId); }
    ws?.close();
});
</script>

<template>
    <div class="devtools">
        <header class="devtools-header">
            <h1>μECS DevTools</h1>
            <span :class="['status-badge', connected ? 'status-badge--connected' : 'status-badge--disconnected']">
                <span class="status-badge__dot" />
                {{ connected ? "Connected" : "Disconnected" }}
            </span>
        </header>

        <main v-if="snapshot" class="panels">
            <section class="panel">
                <h2 class="panel__title">
                    Entities
                    <span class="panel__count">{{ snapshot.entities.length }}</span>
                </h2>
                <ul class="panel__list">
                    <li
                        v-for="entity in snapshot.entities"
                        :key="entity.id"
                        :class="['entity', { 'entity--disabled': !entity.isEnabled }]"
                    >
                        <div class="entity__header">
                            <span class="entity__id">#{{ entity.id }}</span>
                            <span class="entity__name">{{ entity.name }}</span>
                            <span :class="['tag', entity.isEnabled ? 'tag--enabled' : 'tag--disabled']">
                                {{ entity.isEnabled ? "enabled" : "disabled" }}
                            </span>
                        </div>
                        <div v-if="entity.components.length > 0" class="entity__components">
                            <span
                                v-for="comp in entity.components"
                                :key="comp.name"
                                :class="['component-tag', { 'component-tag--disabled': !comp.isEnabled }]"
                                :title="comp.isEnabled ? 'enabled' : 'disabled'"
                            >
                                {{ comp.name }}
                            </span>
                        </div>
                        <span v-else class="entity__empty">No components</span>
                    </li>
                </ul>
                <p v-if="snapshot.entities.length === 0" class="panel__empty">No entities.</p>
            </section>

            <section class="panel">
                <h2 class="panel__title">
                    Systems
                    <span class="panel__count">{{ snapshot.systems.length }}</span>
                </h2>
                <ul class="panel__list">
                    <li
                        v-for="system in snapshot.systems"
                        :key="system.name"
                        :class="['system', { 'system--disabled': !system.isEnabled }]"
                    >
                        <span class="system__name">{{ system.name }}</span>
                        <div class="system__badges">
                            <span v-if="system.isService" class="tag tag--service">service</span>
                            <span class="tag tag--priority">p={{ system.priority }}</span>
                            <span :class="['tag', system.isEnabled ? 'tag--enabled' : 'tag--disabled']">
                                {{ system.isEnabled ? "enabled" : "disabled" }}
                            </span>
                        </div>
                    </li>
                </ul>
                <p v-if="snapshot.systems.length === 0" class="panel__empty">No systems.</p>
            </section>

            <section class="panel">
                <h2 class="panel__title">
                    Resources
                    <span class="panel__count">{{ snapshot.resources.length }}</span>
                </h2>
                <ul class="panel__list">
                    <li v-for="resource in snapshot.resources" :key="resource.name" class="resource">
                        <span class="resource__name">{{ resource.name }}</span>
                    </li>
                </ul>
                <p v-if="snapshot.resources.length === 0" class="panel__empty">No resources.</p>
            </section>
        </main>

        <div v-else class="waiting">
            <div class="waiting__spinner" />
            <p>Waiting for host app to connect…</p>
            <p class="waiting__hint">Call <code>createDevTools({ world })</code> in your app.</p>
        </div>
    </div>
</template>
