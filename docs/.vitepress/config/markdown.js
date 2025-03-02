import mdFootnote from "markdown-it-footnote";
import {groupIconMdPlugin} from "vitepress-plugin-group-icons";
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
    },
}