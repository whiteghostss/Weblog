在国内直接调用 Wallhaven API，主要面临两个问题：**网络连接不稳定（甚至无法连接）**以及**浏览器的跨域/ORB 限制**。

既然你已经在使用 **Cloudflare Workers**，最完美的解决方案是利用 Worker 搭建一个“**全能中转站**”。这个中转站不仅可以代理 **API 请求**（获取图片列表），还可以代理 **图片数据**（显示高清原图）。

以下是具体实现步骤：

### 第一步：编写全能代理 Worker

这个 Worker 可以同时处理 API 和图片的转发，并强制添加跨域头。

1. 在 Cloudflare 控制台创建一个新的 Worker。
2. 粘贴以下代码：

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    // 获取客户端传来的 target 参数（即你要访问的 Wallhaven API 地址或图片地址）
    let targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('请在 URL 后添加 ?url=目标地址', { status: 400 });
    }

    // 1. 构造请求头，伪装成合法访问
    const newHeaders = new Headers();
    newHeaders.set('Referer', 'https://wallhaven.cc/');
    newHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    try {
      // 2. 发起对 Wallhaven 的真实请求
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: newHeaders,
      });

      // 3. 处理返回数据
      const contentType = response.headers.get('content-type');
    
      // 构造新的返回头，解决跨域问题
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
      // 如果是图片，设置长缓存以提高加载速度
      if (contentType && contentType.includes('image')) {
        responseHeaders.set('Cache-Control', 'public, max-age=604800'); // 缓存一周
      }

      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });

    } catch (e) {
      return new Response('代理请求失败: ' + e.message, { status: 500 });
    }
  },
};
```

3. 部署后，你会得到一个地址，例如：`https://api-proxy.xxxx.workers.dev`。

---

### 第二步：在前端代码中使用代理

在你的个人主页 JS 代码中，现在你需要通过这个中转站来获取数据和显示图片。

#### 1. 获取图片列表 (调用 API)

不要直接请求 `wallhaven.cc`，而是请求你的 Worker。

```javascript
async function getWallpapers() {
    const myProxy = "https://api-proxy.xxxx.workers.dev/?url=";
    const wallhavenApi = "https://wallhaven.cc/api/v1/search?q=nature&sorting=random&atleast=1920x1080";
  
    // 拼接成：代理地址 + 编码后的 API 地址
    const finalUrl = myProxy + encodeURIComponent(wallhavenApi);

    try {
        const response = await fetch(finalUrl);
        const data = await response.json();
        const list = data.data; // 这里就拿到了图片数组
        console.log("获取成功：", list);
        return list;
    } catch (err) {
        console.error("API 调用失败：", err);
    }
}
```

#### 2. 显示图片 (设置背景)

同理，图片的 URL 也要经过中转，否则国内加载会极慢且可能被 ORB 拦截。

```javascript
function setBackground(imageUrl) {
    const myProxy = "https://api-proxy.xxxx.workers.dev/?url=";
    const finalImageUrl = myProxy + encodeURIComponent(imageUrl);

    const img = new Image();
    img.crossOrigin = "anonymous"; // 必须配合 Worker 里的 CORS 头
    img.src = finalImageUrl;

    img.onload = () => {
        document.body.style.backgroundImage = `url('${finalImageUrl}')`;
    };
}
```

---

### 方案的优势：

1. **绕过 GFW**：Cloudflare Workers 的服务器在全球（包括离中国较近的香港、新加坡等），它访问 Wallhaven 是极速的。
2. **解决 ORB 错误**：通过在 Worker 中手动设置 `Access-Control-Allow-Origin: *`，浏览器会认为这是一个安全的跨域请求，不会进行拦截。
3. **隐藏 Referer**：Worker 自动帮你在请求头里补上了 `Referer: https://wallhaven.cc/`，绕过了 Wallhaven 的防盗链检测。
4. **速度优化**：Cloudflare 会自动缓存这些图片和 API 结果，国内用户第二次访问时会非常快。

### 💡 进阶：如果你有 API Key

如果你想搜索更多内容（如 NSFW 或更高权限内容），Wallhaven 的 API 需要 Key。你可以在 Worker 的代码里直接加上它，保护你的 Key 不被前端看到：

```javascript
// 在 Worker 内部拼接 Key
const finalApiUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'apikey=你的KEY';
const response = await fetch(finalApiUrl, { ... });
```

### 总结

这就是目前**最标准、最高效**的国内调用方案。核心就是：**所有发往 Wallhaven 的请求（无论是 JSON 数据还是 JPG 图片），全部塞进你的 Cloudflare Worker 中转一下。**zheshi
