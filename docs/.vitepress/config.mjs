import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: "/docs",
  title: "My Awesome Project",
  description: "A VitePress Site",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "主页", link: "/" },
      { text: "后端", link: "/后端/index" },
      { text: "工具", link: "/工具/index" },
    ],

    sidebar: {
      "/后端/": [
        {
          text: "后端",
          items: [
            {
              text: "Linux",
              collapsed: true,
              items: [
                { text: "pgrep", link: "/后端/Linux/pgrep" },
                { text: "xargs", link: "/后端/Linux/xargs" },
              ],
            },
            {
              text: "设计模式",
              collapsed: true,
              items: [
                { text: "SOLID原则", link: "/后端/设计模式/SOLID原则" },
              ],
            }
          ],
        },
      ],
      "/工具/": [
        {
          text: "工具",
          items: [
            {
              text: "oracle",
              items: [
                { text: "dump命令", link: "/工具/oracle/dump命令" },
              ],
            },
            {
              text: "sketch",
              items: [
                { text: "基本操作", link: "/工具/sketch/基本操作" },
              ],
            },
            {
              text: "ManimGL",
              items: [
                { text: "manim", link: "/工具/manim/index" },
              ],
            },
          ],
        },
      ],
    },

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
    // carbonAds: {
    //   code: 'your-carbon-code',
    //   placement: 'your-carbon-placement'
    // }
  },
  lastUpdated: true,
});
