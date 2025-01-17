<script setup></script>

<template>
  <div class="container-g mt-12">
    <div class="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">精选</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="flex flex-col justify-between rounded-lg border dark:border-none p-4 text-base hover:shadow-sm hover:-translate-y-1 transition-all hover:cursor-pointer bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600">
        <span class="font-bold text-primary leading-5 line-clamp2 overflow-ellipsis h-10 mb-4 sm:mb-6">Web怎么工作的</span>
        <div class="flex space-x-2 items-center">
          <div class="flex">
            <button class="transform transition-all cursor-pointer ml-0">
              <div class="rounded-full h-8 w-8 bg-secondary">
                <img class="rounded-full h-8 w-8" src="/avatar.jpg" alt="头像">
              </div>
            </button>
          </div>
          <div class="flex flex-col justify-center">
            <span class="text-sm text-primary">
              <button class="h-8">WHATEVER</button>
            </span>
          </div>
        </div>
        <div class="flex justify-between mt-4 sm:mt-8">
          <span class="text-xs text-muted-foreground">2024-08-19</span>
          <div class="flex space-x-2">
            <span class="flex items-center text-[9px] uppercase font-semibold text-purple-500">
              web
            </span> 
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
