<script setup>
const props = defineProps(["title"]);
</script>

<template>
  <div class="flex justify-center text-xl text-center font-semibold my-0">{{ props.title }}</div>
</template>
