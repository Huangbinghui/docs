---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Herberth's Blog"
  text: "笔记&生活"
  tagline: My great project tagline
  image:
    src: /logo.svg
    alt: VitePress
---
<script setup>
  import Home from './.vitepress/theme/components/Home.vue';
</script>

<Home/>
<ClientOnly>
  <Confetti />
</ClientOnly>

