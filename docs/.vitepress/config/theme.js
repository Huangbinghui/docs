import {nav, sidebar} from "./router.js";

export const themeConfig = {
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
    docFooter: {
        prev: '上一篇',
        next: '下一篇'
    },
    sidebarMenuLabel: '文章',
    returnToTopLabel: '返回顶部',
    lastUpdatedText: '最后更新', // 最后更新时间文本配置, 需先配置lastUpdated为true
}