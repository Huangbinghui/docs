import { defineConfig } from "vitepress";
import {nav, sidebar} from "./router.js";
import mdFootnote from "markdown-it-footnote";

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
  markdown: {
    lineNumbers: true,
    math:true,
    container: {
      tipLabel: '提示',
      warningLabel: '警告',
      dangerLabel: '危险',
      infoLabel: '信息',
      detailsLabel: '详细信息'
    },
    config: (md) => {
      md.use(mdFootnote)
    },
  }
});
