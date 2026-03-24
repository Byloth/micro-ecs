import { defineConfig } from "vitepress";

export default defineConfig({
    lang: "en-US",
    title: "μECS",
    description: "A simple & lightweight Entity Component System library for JavaScript and TypeScript.",

    ignoreDeadLinks: [/^https?:\/\/localhost/],

    themeConfig: {
        logo: "/logo.svg",

        nav: [
            { text: "Guide", link: "/guide/" },
            { text: "API", link: "/api/" },
            {
                text: "Links",
                items: [
                    { text: "npm", link: "https://www.npmjs.com/package/@byloth/micro-ecs" },
                    { text: "GitHub", link: "https://github.com/Byloth/micro-ecs" }
                ]
            }
        ],

        sidebar: {
            "/guide/": [
                {
                    text: "Introduction",
                    items: [
                        { text: "What is μECS?", link: "/guide/" },
                        { text: "Getting Started", link: "/guide/getting-started" }
                    ]
                },
                {
                    text: "Core Concepts",
                    items: [
                        { text: "World", link: "/guide/world" },
                        { text: "Entities", link: "/guide/entities" },
                        { text: "Components", link: "/guide/components" },
                        { text: "Systems", link: "/guide/systems" },
                        { text: "Resources", link: "/guide/resources" },
                        { text: "Queries", link: "/guide/queries" }
                    ]
                },
                {
                    text: "DevTools",
                    items: [
                        { text: "Setup", link: "/guide/devtools" }
                    ]
                }
            ],
            "/api/": [
                {
                    text: "API Reference",
                    items: [
                        { text: "Overview", link: "/api/" }
                    ]
                }
            ]
        },

        socialLinks: [
            { icon: "github", link: "https://github.com/Byloth/micro-ecs" }
        ],

        footer: {
            message: "Released under the Apache 2.0 License.",
            copyright: "Copyright © 2024-present Matteo Bilotta"
        }
    }
});
