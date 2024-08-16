import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: "/docs",
  title: "My Awesome Project",
  description: "A VitePress Site",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/markdown-examples' }
    ],

    sidebar: [
      {
        text: 'Examples',
        items: [
          { text: 'Markdown Examples', link: '/markdown-examples' },
          { text: 'Runtime API Examples', link: '/api-examples' },
          { text: 'ManimGL', link: '/工具/manim/index' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Huangbinghui' },
      { icon: 'x', link: '...' }
    ],
    search: {
      provider: 'local'
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2019-present Herberth'
    },
    // carbonAds: {
    //   code: 'your-carbon-code',
    //   placement: 'your-carbon-placement'
    // }
  },
  lastUpdated:true
})
