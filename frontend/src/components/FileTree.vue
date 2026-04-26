<script setup lang="ts">
import { computed, ref } from 'vue'

type FileEntry = {
  path: string
  language: string
}

type Props = {
  /** 文件列表 */
  files: FileEntry[]
  /** 当前选中的文件路径 */
  selectedPath: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  /** 用户点击某个文件 */
  select: [path: string]
}>()

// ─── 树形数据结构 ────────────────────────────────────────────

type FlatNode = {
  /** 显示名称（最后一段） */
  name: string
  /** 缩进层级 */
  depth: number
  /** 是否目录 */
  isDir: boolean
  /** 完整文件路径（仅 file 节点） */
  filePath: string
  /** 语言（仅 file 节点） */
  language: string
  /** 目录 key（用于折叠展开，e.g. "src/components"） */
  dirKey: string
}

/**
 * 将文件路径列表解析为带深度信息的平铺节点列表
 * 目录在前，文件在后（按字母排序）
 */
const flatNodes = computed<FlatNode[]>(() => {
  // ── 1. 构建树形 Map ──────────────────────────────────────
  type TreeNode = {
    name: string
    isDir: boolean
    filePath: string
    language: string
    /** dirPath, e.g. "src/components" */
    dirKey: string
    children: Map<string, TreeNode>
  }

  const root = new Map<string, TreeNode>()

  for (const file of props.files) {
    const parts = file.path.split('/')
    let current = root
    let cumulativePath = ''

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      cumulativePath = cumulativePath ? `${cumulativePath}/${part}` : part

      if (!current.has(part)) {
        current.set(part, {
          name: part,
          isDir: !isLast,
          filePath: isLast ? file.path : '',
          language: isLast ? file.language : '',
          dirKey: cumulativePath,
          children: new Map(),
        })
      } else {
        const node = current.get(part)!
        if (isLast) {
          node.filePath = file.path
          node.language = file.language
          node.isDir = false
        }
      }

      const node = current.get(part)!
      current = node.children
    }
  }

  // ── 2. DFS 展开为平铺列表（目录优先） ────────────────────
  const result: FlatNode[] = []

  function dfs(map: Map<string, TreeNode>, depth: number) {
    const sorted = [...map.values()].sort((a, b) => {
      if (a.isDir && !b.isDir) return -1
      if (!a.isDir && b.isDir) return 1
      return a.name.localeCompare(b.name)
    })

    for (const node of sorted) {
      result.push({
        name: node.name,
        depth,
        isDir: node.isDir,
        filePath: node.filePath,
        language: node.language,
        dirKey: node.dirKey,
      })
      if (node.isDir && node.children.size > 0) {
        dfs(node.children, depth + 1)
      }
    }
  }

  dfs(root, 0)
  return result
})

// ─── 折叠/展开 目录 ──────────────────────────────────────────
/** 已折叠的目录 key 集合 */
const collapsedDirs = ref<Set<string>>(new Set())

function toggleDir(dirKey: string) {
  if (collapsedDirs.value.has(dirKey)) {
    collapsedDirs.value.delete(dirKey)
  } else {
    collapsedDirs.value.add(dirKey)
  }
}

/**
 * 判断某节点是否因祖先目录被折叠而隐藏
 */
function isVisible(node: FlatNode): boolean {
  if (node.depth === 0) return true
  // 检查所有祖先目录是否被折叠
  const parts = node.dirKey.split('/')
  for (let len = 1; len < parts.length; len++) {
    const ancestorKey = parts.slice(0, len).join('/')
    if (collapsedDirs.value.has(ancestorKey)) return false
  }
  return true
}

// ─── 文件图标（按扩展名简单映射颜色） ───────────────────────

/** 根据 language/文件名返回颜色类 */
function fileColor(node: FlatNode): string {
  if (node.isDir) return 'text-gray-400'
  const lang = node.language || ''
  const name = node.name
  if (lang === 'vue' || name.endsWith('.vue')) return 'text-emerald-400'
  if (lang === 'typescript' || name.endsWith('.ts')) return 'text-blue-400'
  if (lang === 'javascript' || name.endsWith('.js')) return 'text-yellow-400'
  if (lang === 'json' || name.endsWith('.json')) return 'text-orange-400'
  if (lang === 'css' || name.endsWith('.css')) return 'text-pink-400'
  if (lang === 'html' || name.endsWith('.html')) return 'text-red-400'
  if (lang === 'markdown' || name.endsWith('.md')) return 'text-gray-300'
  return 'text-gray-400'
}
</script>

<template>
  <div class="select-none">
    <template v-for="node in flatNodes" :key="node.dirKey">
      <div
        v-if="isVisible(node)"
        class="flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer group transition-colors"
        :class="[
          !node.isDir && node.filePath === selectedPath
            ? 'bg-violet-600/20 text-violet-300'
            : 'hover:bg-gray-800 text-gray-300',
        ]"
        :style="{ paddingLeft: `${(node.depth + 1) * 12}px` }"
        @click="node.isDir ? toggleDir(node.dirKey) : emit('select', node.filePath)"
      >
        <!-- 目录图标 -->
        <template v-if="node.isDir">
          <svg
            class="w-4 h-4 flex-shrink-0 text-gray-500 transition-transform"
            :class="collapsedDirs.has(node.dirKey) ? '' : 'rotate-90'"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <svg
            class="w-4 h-4 flex-shrink-0 text-yellow-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
            />
          </svg>
        </template>

        <!-- 文件图标 -->
        <template v-else>
          <svg
            class="w-4 h-4 flex-shrink-0"
            :class="fileColor(node)"
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
        </template>

        <!-- 名称 -->
        <span
          class="font-mono text-sm truncate flex-1"
          :class="
            !node.isDir && node.filePath === selectedPath
              ? 'text-violet-300'
              : 'text-gray-300 group-hover:text-gray-100'
          "
        >
          {{ node.name }}
        </span>
      </div>
    </template>
  </div>
</template>
