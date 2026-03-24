import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import type { Plugin } from "vite";

import type { ECSMessage } from "../shared/protocol.js";

export interface ServerOptions
{
    port?: number;
}

export function createDevServer({ port = 5175 }: ServerOptions = {}): () => void
{
    const wss = new WebSocketServer({ port });

    let latestSnapshot: ECSMessage | null = null;
    const viewers = new Set<WebSocket>();

    wss.on("connection", (socket, req) =>
    {
        const params = new URL(req.url ?? "/", `http://localhost:${port}`).searchParams;
        const type = params.get("type");

        if (type === "viewer")
        {
            viewers.add(socket);

            if (latestSnapshot) { socket.send(JSON.stringify(latestSnapshot)); }

            socket.on("close", () => viewers.delete(socket));
        }
        else
        {
            socket.on("message", (data) =>
            {
                try
                {
                    const message = JSON.parse(data.toString()) as ECSMessage;

                    latestSnapshot = message;

                    const serialized = JSON.stringify(message);
                    for (const viewer of viewers) { viewer.send(serialized); }
                }
                catch { /* Ignore malformed messages. */ }
            });
        }
    });

    // eslint-disable-next-line no-console
    console.log(`  \x1b[36m➜\x1b[0m  \x1b[1mμECS DevTools:\x1b[0m ws://localhost:${port}`);

    return () => wss.close();
}

export function microECSDevToolsPlugin(options: ServerOptions = {}): Plugin
{
    let dispose: (() => void) | null = null;

    return {
        name: "micro-ecs-devtools",
        apply: "serve",

        configureServer: () =>
        {
            dispose = createDevServer(options);
        },
        buildEnd: () =>
        {
            dispose?.();
            dispose = null;
        }
    };
}
