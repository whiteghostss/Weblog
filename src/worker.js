
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 拦截 Wallhaven API 请求
    if (url.pathname === '/api/wallhaven') {
      // 构建目标 URL: https://wallhaven.cc/api/v1/search?q=...
      const targetUrl = new URL('https://wallhaven.cc/api/v1/search');
      // 复制所有查询参数 (q, purity, sorting, etc.)
      url.searchParams.forEach((value, key) => {
        targetUrl.searchParams.set(key, value);
      });
      
      // 添加 API Key (如果不存在)
      if (!targetUrl.searchParams.has('apikey')) {
        targetUrl.searchParams.set('apikey', 'DOtaleXDscfFDGh6y5ZtKXOkVCy4tFmc');
      }

      // 创建新请求
      const newRequest = new Request(targetUrl, {
        method: request.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://wallhaven.cc'
        }
      });

      try {
        const response = await fetch(newRequest);
        
        // 重新构建响应以允许跨域 (虽然同域下不需要，但为了保险)
        const newResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: new Headers(response.headers)
        });

        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        
        return newResponse;
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }
    
    // 拦截图片代理请求 /proxy?url=...
    if (url.pathname === '/proxy') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response('Missing url parameter', { status: 400 });
      }

      try {
        const newHeaders = new Headers();
        // 伪装 Referer 和 UA
        newHeaders.set('Referer', 'https://wallhaven.cc/');
        newHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: newHeaders
        });

        // 重新构建响应
        const newResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: new Headers(response.headers)
        });

        // 添加跨域头
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        // 图片缓存
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('image')) {
          newResponse.headers.set('Cache-Control', 'public, max-age=604800');
        }

        return newResponse;
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    // 对于其他请求，如果有 ASSETS 绑定（静态资源），则返回静态资源
    // 否则返回 404
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};
