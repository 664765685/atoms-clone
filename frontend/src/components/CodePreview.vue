<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import loader from '@monaco-editor/loader'

type Props = {
  /** 代码内容 */
  content: string
  /** 编程语言（monaco language id） */
  language: string
  /** 文件路径（用于显示） */
  path: string
}

const props = defineProps<Props>()

// ─── Monaco Editor ──────────────────────────────────────────

const containerRef = ref<HTMLElement | null>(null)

/** monaco editor 实例（any 是因为 monaco 类型需要从 loader 动态推断） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let editor: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let monacoInstance: any = null

/** 将通用 language 字符串映射为 Monaco 识别的语言 id */
function toMonacoLanguage(lang: string): string {
  const map: Record<string, string> = {
    vue: 'html',
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    css: 'css',
    html: 'html',
    markdown: 'markdown',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    python: 'python',
    py: 'python',
    go: 'go',
    rust: 'rust',
    java: 'java',
    sh: 'shell',
    bash: 'shell',
    sql: 'sql',
    prisma: 'sql',
    dockerfile: 'dockerfile',
    toml: 'ini',
    ini: 'ini',
    typescript: 'typescript',
    javascript: 'javascript',
  }
  return map[lang.toLowerCase()] ?? lang
}

/**
 * 初始化 Monaco Editor
 */
async function initEditor() {
  if (!containerRef.value) return

  // 设置 CDN 路径（使用 jsDelivr，避免 worker 问题）
  loader.config({
    paths: {
      vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/min/vs',
    },
  })

  monacoInstance = await loader.init()

  editor = monacoInstance.editor.create(containerRef.value, {
    value: props.content,
    language: toMonacoLanguage(props.language),
    theme: 'vs-dark',
    fontSize: 13,
    fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
    lineNumbers: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    readOnly: true,
    padding: { top: 16, bottom: 16 },
    renderLineHighlight: 'none',
    automaticLayout: true,
  })
}

onMounted(() => {
  initEditor()
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
    editor = null
  }
})

// ─── 响应 props 变化 ─────────────────────────────────────────

watch(
  () => props.content,
  (newContent) => {
    if (editor) {
      const model = editor.getModel()
      if (model) {
        model.setValue(newContent)
      }
    }
  }
)

watch(
  () => props.language,
  (newLang) => {
    if (editor && monacoInstance) {
      const model = editor.getModel()
      if (model) {
        monacoInstance.editor.setModelLanguage(model, toMonacoLanguage(newLang))
      }
    }
  }
)
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 空状态 -->
    <div
      v-if="!path"
      class="flex items-center justify-center h-full text-gray-500 text-sm"
    >
      选择左侧文件预览代码
    </div>

    <!-- 文件头部 + Editor -->
    <template v-else>
      <!-- 文件路径 header -->
      <div class="flex items-center gap-2 px-4 py-2 border-b border-gray-800 bg-gray-900 flex-shrink-0">
        <svg
          class="w-4 h-4 text-gray-500 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span class="font-mono text-sm text-gray-300 truncate">{{ path }}</span>
      </div>

      <!-- Monaco Editor 容器 -->
      <div ref="containerRef" class="flex-1 overflow-hidden" />
    </template>
  </div>
</template>
