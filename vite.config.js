import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(getGitShortSha() || 'dev'),
  },
  plugins: [
    react(),
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
})
