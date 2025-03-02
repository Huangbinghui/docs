// https://vitepress.dev/guide/custom-theme
import DefaultTheme from 'vitepress/theme'
import Layout from "./Layout.vue";
import "./style.css";
import "./blur.css";
import Confetti from "canvas-confetti";

import '@nolebase/vitepress-plugin-enhanced-readabilities/client/style.css'

//导入 mark增强
import '@nolebase/vitepress-plugin-enhanced-mark/client/style.css'

import '@nolebase/vitepress-plugin-highlight-targeted-heading/client/style.css'

/** @type {import('vitepress').Theme} */
export default {
    extends: DefaultTheme,
    Layout,
    enhanceApp({ app, router }) {
        app.component("Confetti", Confetti({
            particleCount: 100,
            spread: 170,
            origin: { y: 0.6 },
        })); //注册全局组件
    },
}
