<script setup lang="ts">
import { computed } from 'vue'
import type { GeneratedFile } from '../types'

const props = defineProps<{
  files: GeneratedFile[]
}>()

function buildSrcdoc(files: GeneratedFile[]): string {
  // 找到 index.html
  const indexHtml = files.find((f) => f.path.replace(/^\//, '').endsWith('index.html'))
  if (!indexHtml) return ''

  let html = indexHtml.content

  // 收集所有 .css 文件内容（排除 node_modules）
  const cssContent = files
    .filter((f) => {
      const p = f.path.replace(/^\//, '')
      return p.endsWith('.css') && !p.includes('node_modules')
    })
    .map((f) => f.content)
    .join('\n')

  // 收集所有 .js 文件内容（排除 node_modules，排除 .vue.js 等编译产物歧义可不过滤）
  const jsContent = files
    .filter((f) => {
      const p = f.path.replace(/^\//, '')
      return p.endsWith('.js') && !p.includes('node_modules')
    })
    .map((f) => f.content)
    .join('\n')

  // 注入 CSS 到 </head> 之前
  if (cssContent.trim()) {
    const styleBlock = `<style>\n${cssContent}\n</style>\n`
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${styleBlock}</head>`)
    } else {
      html = styleBlock + html
    }
  }

  // 注入 JS 到 </body> 之前
  if (jsContent.trim()) {
    const scriptBlock = `<script>\n${jsContent}\n<\/script>\n`
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${scriptBlock}</body>`)
    } else {
      html = html + scriptBlock
    }
  }

  return html
}

const srcdoc = computed(() => buildSrcdoc(props.files))
</script>

<template>
  <div class="w-full h-full bg-white rounded overflow-hidden">
    <iframe
      v-if="srcdoc"
      :srcdoc="srcdoc"
      sandbox="allow-scripts"
      class="w-full h-full border-0"
    />
    <div v-else class="flex items-center justify-center h-full text-gray-400 text-sm bg-gray-950">
      无可预览内容
    </div>
  </div>
</template>
