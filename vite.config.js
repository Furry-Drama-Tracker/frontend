import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// index.html 里的 __API_BASE_URL__ 是构建期占位符：CSP connect-src、RSS 链接、
// 启动遮罩里的备案号请求都需要提前知道 API 源站（跨域部署时不能再用相对路径）。
// 生产构建默认使用内置的后端源站，与 src/utils/apiBase.js 的 DEFAULT_API_BASE_URL 保持一致；
// 显式设置 VITE_API_BASE_URL 时以该值为准（空字符串表示同源相对路径）。
const DEFAULT_API_BASE_URL = 'https://fdt-api.xiedada.net';

function htmlApiBasePlugin(apiBase) {
  return {
    name: 'html-api-base',
    transformIndexHtml(html) {
      return html.replaceAll('__API_BASE_URL__', apiBase)
    },
  }
}

function getGitShortSha() {
  try {
    const gitDir = resolve(process.cwd(), '.git')
    const head = readFileSync(resolve(gitDir, 'HEAD'), 'utf8').trim()
    const hash = head.startsWith('ref: ')
      ? readFileSync(resolve(gitDir, head.slice('ref: '.length)), 'utf8').trim()
      : head
    return hash.slice(0, 8)
  } catch {
    return ''
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const configured = env.VITE_API_BASE_URL
  const apiBase = (configured === undefined
    ? (mode === 'production' ? DEFAULT_API_BASE_URL : '')
    : configured || ''
  ).trim().replace(/\/+$/, '')

  return {
    define: {
      __APP_VERSION__: JSON.stringify(getGitShortSha() || 'dev'),
    },
    plugins: [
      react(),
      htmlApiBasePlugin(apiBase),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png'],
        manifest: {
          name: '兽剧聚合平台',
          short_name: '兽剧',
          description: '兽剧内容聚合平台 - 发现和追踪你喜爱的兽剧内容',
          start_url: '/',
          display: 'standalone',
          orientation: 'any',
          background_color: '#f8fafc',
          theme_color: '#1777ff',
          categories: ['entertainment', 'social'],
          scope: '/',
          icons: [
            { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
          ],
          shortcuts: [
            { name: '最新剧集', short_name: '最新', url: '/?tab=latest', icons: [{ src: '/icon-192x192.png', sizes: '192x192' }] },
            { name: '搜索', short_name: '搜索', url: '/?action=search', icons: [{ src: '/icon-192x192.png', sizes: '192x192' }] }
          ],
          share_target: {
            action: '/',
            method: 'GET',
            enctype: 'application/x-www-form-urlencoded',
            params: { title: 'title', text: 'text', url: 'url' }
          }
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // API 响应不应进入 Service Worker 缓存：其中可能包含当前用户的追番/历史/
          // 通知状态，甚至超管的站点配置。登出后 Cache Storage 不会被自动清理，
          // 共享设备上会造成隐私泄露。
          navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
          runtimeCaching: []
        },
        devOptions: { enabled: false }
      })
    ],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-dev-runtime',
        'react/jsx-runtime',
        'react-router-dom',
        'axios',
        'qrcode',
      ],
      noDiscovery: true,
    },
    server: {
      port: 3000,
      headers: {
        'Cache-Control': 'no-store',
      },
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        },
        '/uploads': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      target: 'es2019',
    },
    oxc: {
      drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    }
  }
})
