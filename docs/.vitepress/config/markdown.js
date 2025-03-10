import mdFootnote from "markdown-it-footnote";
import { groupIconMdPlugin } from "vitepress-plugin-group-icons";
export const markdown = {
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
    md.use(groupIconMdPlugin); //代码组图标
    md.renderer.rules.image = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      let alt = token.content;
      let result = self.renderToken(tokens, idx, options);
      if (alt) {
        result += `\n<ClientOnly><TableCaption title='${alt}' /></ClientOnly>`;
      }
      return result;
    };
    md.renderer.rules.html_block = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        let content = token.content;
        // 解析HTML内容中的img标签的alt属性
        const imgRegex = /<img[^>]+alt=["']([^"']+)["'][^>]*>/g;
        let match;
        let result = content;
        
        // 查找所有img标签并为有alt属性的添加标题
        while ((match = imgRegex.exec(content)) !== null) {
          const fullMatch = match[0];
          const alt = match[1];
          
          if (alt && alt.trim() !== '') {
            // 在img标签后添加TableCaption组件
            const replacement = `${fullMatch}\n<ClientOnly><TableCaption title='${alt}' /></ClientOnly>`;
            result = result.replace(fullMatch, replacement);
          }
        }
        return result;
      };
  },
};
