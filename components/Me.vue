<template>
  <VPTeamMembers size="small" :members="members" />
</template>
<script setup>
import { VPTeamMembers } from "vitepress/theme";

const members = [
  {
    avatar: "/docs/avatar.jpg",
    name: "Herberth",
    title: "Creator",
    links: [
      { icon: "github", link: "https://github.com/Huangbinghui" },
      { icon: "twitter", link: "https://github.com/Huangbinghui" },
    ],
  },
];
</script>
