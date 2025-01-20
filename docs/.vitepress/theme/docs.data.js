import { createContentLoader } from 'vitepress'

export default createContentLoader('docs/*.md', {
  excerpt: true,    // 包含摘录?
})