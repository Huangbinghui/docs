import { defineConfig } from "vitepress";
import {nav, sidebar} from "./router.js";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: "/docs/",
  lang: "zh-CN",
  title: "herberth",
  description: "herberth 技术博客",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav,
    sidebar,
    socialLinks: [
      { icon: "github", link: "https://github.com/Huangbinghui" },
      { icon: "x", link: "..." },
    ],
    search: {
      provider: "local",
    },
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2019-present Herberth",
    },
  },
  lastUpdated: true,
});
