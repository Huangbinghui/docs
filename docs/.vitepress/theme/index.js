// https://vitepress.dev/guide/custom-theme
import DefaultTheme from "vitepress/theme";
import Layout from "./components/Layout.vue";
import "./style/style.css";
import "./style/blur.css";
import "./style/code-title.css";
import Confetti from "./components/Confetti.vue";
import TableCaption from "./components/TableCaption.vue";
import "virtual:group-icons.css";

import "@nolebase/vitepress-plugin-enhanced-readabilities/client/style.css";

//导入 mark增强
import "@nolebase/vitepress-plugin-enhanced-mark/client/style.css";

import "@nolebase/vitepress-plugin-highlight-targeted-heading/client/style.css";

/** @type {import('vitepress').Theme} */
export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app, router }) {
    app.component("Confetti", Confetti); //注册全局组件
		app.component("TableCaption",TableCaption);
  },
};
