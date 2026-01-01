
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. 拦截 API 请求
    if (url.pathname === '/api/wallhaven') {
      const targetUrl = new URL('https://wallhaven.cc/api/v1/search');
      url.searchParams.forEach((value, key) => {
        targetUrl.searchParams.set(key, value);
      });
      
      // 自动补全 API Key
      if (!targetUrl.searchParams.has('apikey')) {
        targetUrl.searchParams.set('apikey', 'DOtaleXDscfFDGh6y5ZtKXOkVCy4tFmc');
      }

      const newRequest = new Request(targetUrl, {
        method: request.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://wallhaven.cc/',
          'Accept': 'application/json'
        }
      });

      try {
        const response = await fetch(newRequest);
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
    
    // 2. 拦截图片代理请求 /proxy?url=...
    if (url.pathname === '/proxy') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response('Missing url parameter', { status: 400 });
      }

      try {
        const newHeaders = new Headers();
        // 伪装成真实浏览器，防止 Wallhaven 拦截
        newHeaders.set('Referer', 'https://wallhaven.cc/');
        newHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        newHeaders.set('Accept', 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8');
        newHeaders.set('Sec-Fetch-Dest', 'image');
        newHeaders.set('Sec-Fetch-Mode', 'no-cors');
        newHeaders.set('Sec-Fetch-Site', 'cross-site');

        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: newHeaders
        });

        const newResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: new Headers(response.headers)
        });

        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        
        // 增强缓存控制
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('image')) {
          newResponse.headers.set('Cache-Control', 'public, max-age=604800, immutable');
        }

        return newResponse;
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
    }

    // 3. 静态资源托管 (兼容 SPA)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};
