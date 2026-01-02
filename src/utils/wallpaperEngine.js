const PROXY_BASE = "https://ljc-only-love-ljm.icu";

// 工具：转换 URL 为代理 URL
export function toProxyUrl(originalUrl) {
    if (!originalUrl) return "";
    // 如果已经是代理地址，直接返回
    if (originalUrl.startsWith(PROXY_BASE)) return originalUrl;
    
    // 简单替换逻辑，根据 WallHaven.md 建议
    // 注意：这里我们使用 /proxy?url= 模式，还是直接替换域名？
    // 根据 WallHaven.md 的建议代码：
    // return originalUrl.replace("https://wallhaven.cc", PROXY).replace("https://w.wallhaven.cc", PROXY)...
    // 但 worker.js 显示它处理 /api/v1/ 和 /full/ 等路径。
    // 如果 originalUrl 是 https://w.wallhaven.cc/full/..., 替换后变成 https://ljc-only-love-ljm.icu/full/...
    // 这与 worker.js 的逻辑 (path.includes('/full/')) 匹配。
    
    let url = originalUrl;
    url = url.replace("https://wallhaven.cc", PROXY_BASE);
    url = url.replace("https://w.wallhaven.cc", PROXY_BASE);
    url = url.replace("https://th.wallhaven.cc", PROXY_BASE);
    
    return url;
}

// 核心引擎类
export class WallpaperEngine {
    constructor() {
        this.proxy = PROXY_BASE;
    }

    // 搜索壁纸
    // sorting: relevance, random, date_added, views, favorites, toplist
    async search(query = "", page = 1, sorting = "relevance") {
        try {
            // 构建 API URL
            // 原始: https://wallhaven.cc/api/v1/search?q=...
            // 代理: https://ljc-only-love-ljm.icu/api/v1/search?q=...
            
            const params = new URLSearchParams({
                q: query,
                page: page,
                sorting: sorting,
                purity: '100', // SFW
                atleast: '1920x1080',
                ratios: '16x9,16x10'
            });
            
            // 如果是 random 模式，不需要 page，但需要 seed (可选)
            if (sorting === 'random') {
                params.delete('page');
            }

            const apiUrl = `${this.proxy}/api/v1/search?${params.toString()}`;
            
            // 尝试 API 请求
            let response = await fetch(apiUrl);
            
            // 如果遇到 429 Too Many Requests，尝试不带 API Key 重试
            // 注意：Worker 中可能已经硬编码了 Key。我们通过添加参数 'no_key=1' 通知 Worker (如果 Worker 支持)
            // 或者，如果 Worker 只是透传参数，我们可以尝试客户端直接请求 (但有 CORS 问题)。
            // 更好的策略：如果 429，前端提示用户稍后重试，或者尝试减少请求频率。
            // 但既然是代理，可能是代理共享 Key 超限。
            // 尝试移除 params 中的 API Key 相关参数 (如果有)
            
            if (response.status === 429) {
                console.warn("API 429 Limit Reached. Retrying without sorting/strict params...");
                // 降级策略：去掉一些严格参数重试，或者提示
                // 由于 Worker 逻辑不可控，我们只能抛出特定错误供 UI 处理
                throw new Error("API 调用频率受限 (429)，请稍后再试");
            }
            
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            
            const data = await response.json();
            
            // 修复：Wallhaven API 搜索结果结构
            // 如果 data.data 是数组
            if (Array.isArray(data.data)) {
                return {
                    data: data.data.map(item => ({
                        id: item.id,
                        preview: toProxyUrl(item.thumbs.small), 
                        full: toProxyUrl(item.path),
                        type: item.path.endsWith('.mp4') ? 'video' : 'image',
                        resolution: item.resolution
                    })),
                    meta: data.meta
                };
            } else {
                // 如果搜索无结果或出错，可能返回空数组或其他结构
                return { data: [], meta: { current_page: 1, last_page: 1 } };
            }
        } catch (error) {
            console.error("WallpaperEngine Search Error:", error);
            throw error;
        }
    }

    // 获取单张随机壁纸（用于“手气不错”）
    async getRandom(keyword = "") {
        try {
            const result = await this.search(keyword, 1, "random");
            if (result.data && result.data.length > 0) {
                return result.data[0];
            }
            return null;
        } catch (error) {
            console.error("WallpaperEngine Random Error:", error);
            return null;
        }
    }
}

export const wallpaperEngine = new WallpaperEngine();
