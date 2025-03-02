<script setup>
import Post from "./Post.vue";

const porps = defineProps(["columnName", "posts"]);
</script>

<template>
  <div class="container-g mt-12">
    <div class="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">
      {{ porps.columnName }}
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Post
        v-for="post in porps.posts"
        :title="post.title"
        :link="post.link"
        :createtime="post.createtime"
        :tags="post.tags"
      />
    </div>
  </div>
</template>
