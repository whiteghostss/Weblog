
`net::ERR_BLOCKED_BY_ORB` 是 Chrome 浏览器为了防止跨站脚本攻击（XSS）和数据泄露而引入的一种极其严格的保护机制。简单来说，浏览器认为这个图片请求**不安全**或者**不符合规范**，因此在数据到达网页之前就直接拦截了。

在使用 Wallhaven 图片作为背景时，这个问题通常由 **跨域配置不一致** 引起。以下是几种从易到难的解决办法：

### 方法一：在 JS 预加载时显式声明 `crossOrigin`（最有效）

如果你在 JavaScript 中使用 `new Image()` 来预加载图片，必须明确告诉浏览器这是一个跨域请求，并且你不需要携带 Cookie（匿名模式）。

**修改后的 JS 代码：**

```javascript
function rotateBackground() {
    const nextUrl = selectedUrls[currentRotateIndex];
    const proxy = "https://images.weserv.nl/?url=";
  
    const img = new Image();
    // 【关键步骤】必须设置这行，否则会被 ORB 或 CORS 拦截
    img.crossOrigin = "anonymous"; 
  
    img.src = proxy + encodeURIComponent(nextUrl); // 建议对 URL 进行编码

    img.onload = () => {
        // ... 原有的切换逻辑
        document.getElementById('bg-next').style.backgroundImage = `url('${img.src}')`;
    };
}
```

---

### 方法二：在 HTML 中添加 Meta 标签（绕过 Referrer 检查）

Wallhaven 等网站会检查 `Referer` 头。如果你的网页没有设置，浏览器会默认发送当前网址，Wallhaven 发现不是自家网址就会拒绝，从而触发浏览器的拦截报错。

在 `<head>` 标签中加入：

```html
<meta name="referrer" content="no-referrer">
```

*这行代码的作用是：告诉浏览器在请求图片时不要告诉对方“我是从哪个网站来的”，这样可以绕过 90% 的图片防盗链。*

---

### 方法三：改用 Cloudflare Workers 搭建私有代理（最稳定）

如果你有 Clash，说明你已经有科学上网环境，但 `wsrv.nl` 这种公共代理可能还是会被 ORB 拦截。你可以利用免费的 **Cloudflare Workers** 搭建一个属于你自己的图片中转站。

1. 登录 Cloudflare，创建一个新的 Worker。
2. 粘贴以下代码：
   ```javascript
   addEventListener('fetch', event => {
     event.respondWith(handleRequest(event.request))
   })

   async function handleRequest(request) {
     const url = new URL(request.url)
     const imageUrl = url.searchParams.get('url') // 获取参数里的图片地址

     if (!imageUrl) return new Response('Missing URL', { status: 400 })

     const response = await fetch(imageUrl, {
       headers: { 'Referer': 'https://wallhaven.cc/' } // 伪装成 Wallhaven 自己在请求
     })

     const newResponse = new Response(response.body, response)
     // 【核心】强制添加 CORS 允许头，彻底解决 ORB 和跨域问题
     newResponse.headers.set('Access-Control-Allow-Origin', '*')
     newResponse.headers.set('Cache-Control', 'public, max-age=86400')
     return newResponse
   }
   ```
3. 部署后，你会得到一个网址，比如 `https://my-proxy.workers.dev/`。
4. 在你的项目中使用：`const proxy = "https://my-proxy.workers.dev/?url=";`

---

### 方法四：既然有 Clash，尝试直接请求（不带公共代理）

如果你电脑上的 Clash 运行正常，**其实你完全不需要 `wsrv.nl`**。直接请求 Wallhaven 的原图链接，配合 `no-referrer` 往往就能成功。

1. 去掉代码里所有的 `https://images.weserv.nl/?url=`。
2. 确保 `index.html` 有 `<meta name="referrer" content="no-referrer">`。
3. **在 Clash 中检查逻辑**：
   * 打开 Clash 仪表盘（Dashboard）。
   * 在“规则”或“连接”中，确认 `w.wallhaven.cc` 这个域名没有被拦截，且确实走的是代理节点。
   * 如果报错，尝试在 Clash 里开启 **"Global" (全局模式)** 测试。如果全局模式下图片能显示，说明是之前的规则分流问题。

---

### 为什么 `net::ERR_BLOCKED_BY_ORB` 这么难搞？

这是因为 Chrome 现在要求：如果一个资源声明自己是图片（MIME 类型是 `image/jpeg` 等），那么它的返回头里必须带有 `Access-Control-Allow-Origin`，或者请求时不能带有敏感信息。

**总结建议：**

1. 先加上 `<meta name="referrer" content="no-referrer">`。
2. 在 JS 预加载图片时加上 `img.crossOrigin = "anonymous";`。
3. 如果这两步做了还报错，说明 `wsrv.nl` 这个代理服务器的返回头不符合 Chrome 的新安全标准，建议按照**方法三**用 Cloudflare 自己搭一个。
