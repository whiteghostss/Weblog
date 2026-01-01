
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    proxy: {
      '/api/wallhaven': {
        target: 'https://wallhaven.cc/api/v1/search',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wallhaven/, ''),
        headers: {
          'Referer': 'https://wallhaven.cc'
        }
      },
      '/proxy': {
        target: 'https://wallhaven.cc', // 这里其实不太好直接代理到 wallhaven，因为 wallhaven 图片域名是 w.wallhaven.cc
        // 本地开发代理图片比较麻烦，因为目标域名不确定（w.wallhaven.cc）
        // 这里我们简单配置一下，让本地能跑通基本逻辑。
        // 实际上本地开发建议直接连 wallhaven（如果能翻墙），或者手动实现一个本地代理中间件
        // 为了演示，这里我们假设本地开发走 Cloudflare Worker 的线上地址，或者用户接受本地可能图片加载失败
        // 更优雅的方式是写一个自定义插件来处理 /proxy 请求
        changeOrigin: true,
        bypass: (req, res, options) => {
            const url = new URL(req.url, 'http://localhost');
            const targetUrl = url.searchParams.get('url');
            if (targetUrl) {
                // 在本地开发环境，我们尝试直接重定向到目标图片（依赖本地网络环境）
                // 或者，我们可以配置一个特殊的代理规则，但 vite proxy 不支持动态 target
                // 另一种方案：直接返回 302 重定向
                res.writeHead(302, { Location: targetUrl });
                res.end();
                return false; 
            }
        }
      }
    }
  }
})
