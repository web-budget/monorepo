<template>
  <div class="bg-background flex min-h-screen items-center justify-center p-4">
    <div class="flex max-w-xl flex-col items-center text-center">
      <span class="text-primary text-3xl font-bold">
        <slot name="error-title" />
      </span>
      <h1 class="mb-2 text-3xl font-bold lg:text-5xl">
        <slot name="error-detail" />
      </h1>
      <div class="text-muted-foreground mb-8">
        <slot name="error-description" />
      </div>
      <slot name="action" />
    </div>
  </div>
</template>
