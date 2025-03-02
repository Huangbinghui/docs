import { defineConfig } from "vitepress";
import { nav, sidebar } from "./router.js";
import mdFootnote from "markdown-it-footnote";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: "/docs/",
  lang: "zh-CN",
  title: "herberth",
  description: "herberth 技术博客",
  head: [
    ["link", { rel: "icon", href: "/docs/favicon.ico" }],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        size: "16x16",
        href: "/docs/favicon-16x16.png",
      },
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        size: "32x32",
        href: "/docs/favicon-32x32.png",
      },
    ],
    [
      "link",
      {
        rel: "apple-touch-icon",
        type: "image/png",
        size: "32x32",
        href: "/docs/apple-touch-icon.png",
      },
    ],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav,
    sidebar,
    aside: false,
    logo: "/logo.svg",
    socialLinks: [
      { icon: "github", link: "https://github.com/Huangbinghui" },
      { icon: "x", link: "..." },
    ],
    search: {
      provider: "local",
    },
    footer: {
      copyright: "Copyright © 2019-present Herberth",
    },
  },
  lastUpdated: true,
  markdown: {
    lineNumbers: true,
    math: true,
    container: {
      tipLabel: "提示",
      warningLabel: "警告",
      dangerLabel: "危险",
      infoLabel: "信息",
      detailsLabel: "详细信息",
    },
    config: (md) => {
      md.use(mdFootnote);
    },
  },
  vite: {
    //阅读增强 插件
    optimizeDeps: {
      exclude: [
        '@nolebase/vitepress-plugin-enhanced-readabilities/client',
      ],
    },
    ssr: {
      noExternal: [
        // 如果还有别的依赖需要添加的话，并排填写和配置到这里即可
        '@nolebase/vitepress-plugin-enhanced-readabilities',
        //闪烁高亮当前的目标标题
        '@nolebase/vitepress-plugin-highlight-targeted-heading',
      ],
    },
    css: {
      postcss: {
        plugins: [tailwindcss(), autoprefixer()],
      },
    },
  },
});
