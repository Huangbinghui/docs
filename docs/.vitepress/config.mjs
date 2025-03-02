import {defineConfig} from "vitepress";
import {themeConfig} from "./config/theme.js";
import {head} from "./config/head.js";
import {withMermaid} from "vitepress-plugin-mermaid";
import {markdown} from "./config/markdown.js";
import {vite} from "./config/vite.js";

// https://vitepress.dev/reference/site-config
export default withMermaid(
    defineConfig({
        base: "/docs/",
        lang: "zh-CN",
        title: "herberth",
        description: "herberth 技术博客",
        lastUpdated: true,
        head,
        themeConfig,
        markdown,
        vite,
        mermaid: {
            // refer https://mermaid.js.org/config/setup/modules/mermaidAPI.html#mermaidapi-configuration-defaults for options
        },
        // optionally set additional config for plugin itself with MermaidPluginConfig
        mermaidPlugin: {
            class: "mermaid my-class", // set additional css classes for parent container
        },
    })
);
