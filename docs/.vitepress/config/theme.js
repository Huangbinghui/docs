import {nav, sidebar} from "./router.js";

export const themeConfig = {
    // https://vitepress.dev/reference/default-theme-config
    nav,
    sidebar,
    aside: false,
    logo: "/logo.svg",
    socialLinks: [
        {icon: "github", link: "https://github.com/Huangbinghui"},
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
    articleMetadataConfig: {
        author: '查尔斯', // 文章全局默认作者名称
        authorLink: '/about/me', // 点击作者名时默认跳转的链接
        showViewCount: false, // 是否显示文章阅读数, 需要在 docs/.vitepress/theme/api/config.js 及 interface.js 配置好相应 API 接口
      },
}