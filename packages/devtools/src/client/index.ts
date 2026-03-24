import type { World } from "@byloth/micro-ecs";

import type {
    ComponentSnapshot,
    ECSMessage,
    EntitySnapshot,
    ResourceSnapshot,
    SystemSnapshot,
    WorldSnapshot

} from "../shared/protocol.js";

export interface DevToolsOptions
{
    world: World;
    port?: number;
}

function serializeWorld(world: World): WorldSnapshot
{
    const systemTypes = new Set<unknown>(world.systems.keys());

    const entities: EntitySnapshot[] = [];
    for (const entity of world.entities.values())
    {
        const components: ComponentSnapshot[] = [];
        for (const component of entity.components.values())
        {
            components.push({
                name: component.constructor.name,
                isEnabled: component.isEnabled
            });
        }

        entities.push({
            id: entity.id,
            name: entity.constructor.name,
            isEnabled: entity.isEnabled,
            components: components
        });
    }

    const systems: SystemSnapshot[] = [];
    for (const [type, system] of world.systems)
    {
        systems.push({
            name: system.constructor.name,
            priority: system.priority,
            isEnabled: system.isEnabled,
            isService: (world.resources as ReadonlyMap<unknown, unknown>).has(type)
        });
    }

    const resources: ResourceSnapshot[] = [];
    for (const [type, resource] of world.resources)
    {
        if (systemTypes.has(type)) { continue; }

        resources.push({ name: resource.constructor.name });
    }

    return { entities, systems, resources };
}

export function createDevTools({ world, port = 5175 }: DevToolsOptions): () => void
{
    const url = `ws://localhost:${port}`;

    let ws: WebSocket | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let reconnectId: ReturnType<typeof setTimeout> | null = null;

    function send(message: ECSMessage): void
    {
        if (ws?.readyState === WebSocket.OPEN) { ws.send(JSON.stringify(message)); }
    }

    function connect(): void
    {
        ws = new WebSocket(`${url}?type=client`);

        ws.addEventListener("open", () =>
        {
            send({ type: "snapshot", payload: serializeWorld(world) });
            intervalId = setInterval(() => send({ type: "snapshot", payload: serializeWorld(world) }), 100);
        });

        ws.addEventListener("close", () =>
        {
            if (intervalId !== null)
            {
                clearInterval(intervalId);
                intervalId = null;
            }

            reconnectId = setTimeout(connect, 2_000);
        });

        ws.addEventListener("error", () => ws?.close());
    }

    connect();

    return (): void =>
    {
        if (reconnectId !== null) { clearTimeout(reconnectId); }
        if (intervalId !== null) { clearInterval(intervalId); }

        ws?.close();
        ws = null;
    };
}
