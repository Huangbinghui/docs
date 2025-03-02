<template>
  <Column
    v-for="column in columns"
    :column-name="column.cloumnName"
    :posts="column.posts"
  />
</template>

<script setup>
import { reactive } from "vue";
import Column from "./Column.vue";

const columnList = [
  {
    cloumnName: "WEB",
    posts: [
      {
        title: "Vue",
        link: "/Vue",
        createtime: "2024-09-18",
        tags: "web,vue",
      },
      {
        title: "Vue",
        link: "/Vue",
        createtime: "2024-09-18",
        tags: "web,vue",
      },
      {
        title: "Vue",
        link: "/Vue",
        createtime: "2024-09-18",
        tags: "web,vue",
      },
      {
        title: "Vue",
        link: "/Vue",
        createtime: "2024-09-18",
        tags: "web,vue",
      },
    ],
  },
  {
    cloumnName: "WEB1",
    posts: [
      {
        title: "React",
        link: "/React",
        createtime: "2025-01-19",
        tags: "web-react",
      },
    ],
  },
];

const columns = reactive(columnList);
</script>
