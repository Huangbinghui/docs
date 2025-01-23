<script setup>
import { useRouter, withBase } from "vitepress";
const props = defineProps(["title", "link", "createtime", "tags"]);
const link = withBase(props.link)
const router = useRouter()

const toLink = () => {
  router.go(link)
}
</script>

<template>
  <div
    class="flex flex-col justify-between rounded-lg border dark:border-none p-4 text-base hover:shadow-sm hover:-translate-y-1 transition-all hover:cursor-pointer bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600" @click="toLink"
  >
    <span
      class="font-bold text-primary leading-5 line-clamp2 overflow-ellipsis h-10 mb-4 sm:mb-6"
      >{{ props.title }}</span
    >
    <!-- 头像用户名 -->
    <div class="flex space-x-2 items-center">
      <div class="flex">
        <button class="transform transition-all cursor-pointer ml-0">
          <div class="rounded-full h-8 w-8 bg-secondary">
            <img class="rounded-full h-8 w-8" :src="withBase('/avatar.jpg')" alt="头像" />
          </div>
        </button>
      </div>
      <div class="flex flex-col justify-center">
        <span class="text-sm text-primary">
          <button class="h-8">Herberth</button>
        </span>
      </div>
    </div>

    <!-- 创建时间和标签 -->
    <div class="flex justify-between mt-4 sm:mt-8">
      <span class="text-xs text-muted-foreground"> {{ props.createtime }}</span>
      <div class="flex space-x-2">
        <span
          class="flex items-center text-[9px] uppercase font-semibold text-purple-500"
        >
          {{ props.tags }}
        </span>
      </div>
    </div>
  </div>
</template>
