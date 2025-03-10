import { groupIconVitePlugin } from "vitepress-plugin-group-icons";
import tailwindcss from '@tailwindcss/vite'

export const vite = {
  //阅读增强 插件
  optimizeDeps: {
    exclude: ["@nolebase/vitepress-plugin-enhanced-readabilities/client"],
  },
  ssr: {
    noExternal: [
      // 如果还有别的依赖需要添加的话，并排填写和配置到这里即可
      "@nolebase/vitepress-plugin-enhanced-readabilities",
      //闪烁高亮当前的目标标题
      "@nolebase/vitepress-plugin-highlight-targeted-heading",
    ],
  },
  plugins: [
    groupIconVitePlugin({
      customIcon: {
        java: "devicon:java-wordmark",
      },
    }), //代码组图标
    tailwindcss(),
  ],
};
