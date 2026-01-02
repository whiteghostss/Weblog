<template>
    <v-container fluid class="pa-0 tab2">
      <v-tabs
          v-model="tab"
          align-tabs="center"
          height="30"
          slider-color="var(--leleo-vcard-color)"
          show-arrows
        >
          <v-tab value="tab-1" class="text-none"><v-icon start>mdi-panorama-variant-outline</v-icon>本地精选</v-tab>
          <v-tab value="tab-2" class="text-none"><v-icon start>mdi-video-input-svideo</v-icon>动态精选</v-tab>
          <v-tab value="tab-3" class="text-none"><v-icon start>mdi-web</v-icon>在线探索</v-tab>
          <v-tab value="tab-4" class="text-none"><v-icon start>mdi-heart</v-icon>我的收藏</v-tab>
        </v-tabs>
        
        <v-tabs-window v-model="tab" class="pa-2">
            <!-- Tab 1: 本地图片 -->
            <v-tabs-window-item value="tab-1">
                <div class="mb-2 d-flex justify-space-between" style="width: 100%;align-items: center;">
                    <div class="itemText"><strong>{{ radios.title || '请选择壁纸' }}</strong></div>
                    <v-menu location="bottom" :offset="[0, 15]">
                        <template v-slot:activator="{ props }">
                            <v-btn variant="tonal" v-bind="props" :density="smAndDown?'compact':'default'">
                            <v-icon>mdi-arrow-down</v-icon>
                            </v-btn>
                        </template>
                        <v-card class="d-flex flex-column">
                            <v-btn variant="tonal" v-for="(item, index) in staticType" :key="index" @click="switchType(item.type,'static')">
                                {{ item.name }}
                            </v-btn>
                        </v-card>
                    </v-menu>
                </div>
                
                <v-row class="scroll-container">
                    <v-col :cols="type == 'mobile' ? 6:12" :sm="type == 'mobile' ? 4:6" :md="type == 'mobile' ? 3:4" v-for="item in paginatedPICItems" :key="item.preview" class="d-flex justify-center">
                        <v-img rounded="lg" @click="radios = item" style="cursor: pointer"
                        :class="{'selected-item':radios === item }"
                        :max-width="smAndDown ? (type == 'mobile' ? 100 : 200) : (type == 'mobile' ? 160 : 250)"
                        :max-height="smAndDown ? (type == 'mobile' ? 170 : 120) : (type == 'mobile' ? 272 : 150)"
                        cover
                        :src="item.preview"
                        >
                            <template v-slot:placeholder>
                                <v-row align="center" class="fill-height ma-0" justify="center">
                                    <v-progress-circular color="grey-lighten-5" indeterminate></v-progress-circular>
                                </v-row>
                            </template>
                        </v-img>
                    </v-col>
                </v-row>
                <v-pagination v-model="currentPICPage" :length="totalPICPages" :density="smAndDown? 'compact':'default'"></v-pagination>
            </v-tabs-window-item>

            <!-- Tab 2: 本地视频 -->
            <v-tabs-window-item value="tab-2">
                 <div class="mb-2 d-flex justify-space-between" style="width: 100%;align-items: center;">
                    <div class="itemText"><strong>{{ radios.title || '请选择壁纸' }}</strong></div>
                     <v-menu location="bottom" :offset="[0, 15]">
                        <template v-slot:activator="{ props }">
                            <v-btn variant="tonal" :density="smAndDown?'compact':'default'" v-bind="props">
                            <v-icon>mdi-arrow-down</v-icon>
                            </v-btn>
                        </template>
                        <v-card class="d-flex flex-column">
                            <v-btn variant="tonal" v-for="(item, index) in staticType" :key="index" @click="switchType(item.type,'dynamic')">
                                {{ item.name }}
                            </v-btn>
                        </v-card>
                    </v-menu>
                </div>
                
                 <v-row class="scroll-container">
                    <v-col :cols="type == 'mobile' ? 6:12" :sm="type == 'mobile' ? 4:6" :md="type == 'mobile' ? 3:4" v-for="item in paginatedVDItems" :key="item.preview" class="d-flex justify-center">
                        <div class="video-container" @click="radios = item" style="cursor: pointer">
                            <div v-if="!item.loaded" class="loading-spinner">
                                <v-progress-circular indeterminate></v-progress-circular>
                            </div>
                            <video autoplay loop muted 
                                :class="{'selected-item':radios === item }"
                                :style="type == 'mobile'?(smAndDown ?{width: '100px',height:'170px'}:{width: '160px',height:'272px'}):(smAndDown ?{width: '200px'}:{width: '250px'})"
                                style="object-fit: cover;"
                                rounded="lg" @loadeddata="item.loaded = true"
                            >
                                <source :src="item.preview" type="video/mp4">
                            </video>
                        </div>
                    </v-col>
                </v-row>
                 <v-pagination v-model="currentVDPage" :length="totalVDPages" :density="smAndDown? 'compact':'default'"></v-pagination>
            </v-tabs-window-item>

            <!-- Tab 3: 在线探索 -->
            <v-tabs-window-item value="tab-3">
                <v-row dense class="align-center mb-2">
                    <v-col cols="8" sm="9">
                        <v-text-field
                            v-model="searchQuery"
                            label="搜索 Wallhaven..."
                            density="compact"
                            variant="outlined"
                            hide-details
                            prepend-inner-icon="mdi-magnify"
                            @keyup.enter="performSearch"
                        ></v-text-field>
                    </v-col>
                    <v-col cols="4" sm="3" class="d-flex justify-end">
                        <v-btn color="primary" variant="tonal" @click="performSearch" :loading="isSearching" class="mr-1">搜索</v-btn>
                        <v-btn icon="mdi-dice-3" variant="text" @click="performRandom" title="手气不错"></v-btn>
                    </v-col>
                </v-row>

                <div class="scroll-container" ref="onlineScroll" style="max-height: 400px; overflow-y: auto;">
                    <div v-if="isSearching" class="d-flex justify-center pa-4">
                        <v-progress-circular indeterminate color="primary"></v-progress-circular>
                    </div>
                    <div v-else-if="onlineWallpapers.length === 0" class="text-center pa-4 text-grey">
                        输入关键词搜索，或点击骰子随机获取
                    </div>
                    
                    <v-row v-else dense>
                        <v-col v-for="wp in onlineWallpapers" :key="wp.id" cols="6" sm="4" md="3">
                            <v-card class="fill-height" hover>
                                <v-img
                                    :src="wp.preview"
                                    aspect-ratio="1.7"
                                    cover
                                    class="align-end"
                                >
                                    <template v-slot:placeholder>
                                        <v-row class="fill-height ma-0" align="center" justify="center">
                                            <v-progress-circular indeterminate color="grey-lighten-5"></v-progress-circular>
                                        </v-row>
                                    </template>
                                    
                                    <!-- 操作遮罩 -->
                                    <div class="d-flex justify-space-between px-2 py-1" style="background: rgba(0,0,0,0.6); width: 100%">
                                        <v-btn icon size="x-small" variant="text" color="white" @click="previewOnline(wp)" title="预览/设定">
                                            <v-icon>mdi-eye</v-icon>
                                        </v-btn>
                                        <v-btn icon size="x-small" variant="text" :color="wp.isFav ? 'red' : 'white'" @click="toggleFavorite(wp)">
                                            <v-icon>{{ wp.isFav ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
                                        </v-btn>
                                    </div>
                                </v-img>
                            </v-card>
                        </v-col>
                    </v-row>
                    
                    <div v-if="onlineWallpapers.length > 0" class="d-flex justify-center mt-2">
                        <v-pagination
                            v-model="onlineMeta.current_page"
                            :length="onlineMeta.last_page"
                            :total-visible="5"
                            :density="smAndDown ? 'compact' : 'default'"
                            @update:model-value="handlePageChange"
                        ></v-pagination>
                    </div>
                </div>
            </v-tabs-window-item>

            <!-- Tab 4: 我的收藏 (升级版) -->
            <v-tabs-window-item value="tab-4">
                <!-- 1. 所有收藏滑动视图 -->
                <div class="mb-2">
                    <div class="d-flex justify-space-between align-center px-2 mb-1">
                        <span class="text-subtitle-2 font-weight-bold">所有收藏 ({{ favorites.length }})</span>
                        <span class="text-caption text-grey">点击图片添加到下方列表</span>
                    </div>
                    
                    <v-sheet class="mx-auto" elevation="0" color="transparent" rounded="lg" border>
                        <v-slide-group show-arrows center-active>
                             <div v-if="favorites.length === 0" class="pa-4 text-center text-grey" style="width: 100%">
                                暂无收藏
                            </div>
                            <v-slide-group-item v-for="fav in favorites" :key="fav.id" v-slot="{ isSelected, toggle }">
                                <v-card
                                    :color="isSelected ? 'primary' : ''"
                                    class="ma-2"
                                    height="100"
                                    width="160"
                                    @click="addToActivePlaylist(fav)"
                                >
                                    <v-img :src="fav.preview" cover height="100">
                                        <div class="d-flex justify-end pa-1">
                                             <v-btn icon size="x-small" variant="flat" color="rgba(0,0,0,0.5)" @click.stop="removeFavorite(fav)">
                                                <v-icon color="white" size="small">mdi-close</v-icon>
                                            </v-btn>
                                        </div>
                                    </v-img>
                                </v-card>
                            </v-slide-group-item>
                        </v-slide-group>
                    </v-sheet>
                </div>

                <!-- 2. 三个播放列表 -->
                <v-divider class="my-3"></v-divider>
                
                <div class="d-flex justify-space-between align-center px-2 mb-2">
                    <span class="text-subtitle-2 font-weight-bold">播放列表配置</span>
                    <v-switch 
                        v-model="autoPlayEnabled" 
                        label="60s 轮播" 
                        color="primary" 
                        density="compact" 
                        hide-details 
                        inset
                        @update:model-value="toggleAutoPlay"
                    ></v-switch>
                </div>

                <v-row dense>
                    <v-col v-for="(list, index) in playlists" :key="index" cols="4">
                        <v-card variant="outlined" :color="activePlaylistIndex === index ? 'primary' : ''" class="fill-height d-flex flex-column">
                            <v-card-title class="text-subtitle-2 px-2 py-1 d-flex justify-space-between align-center bg-grey-lighten-4">
                                <span>列表 {{ index + 1 }}</span>
                                <v-btn size="x-small" variant="text" icon="mdi-check-circle" 
                                    :color="activePlaylistIndex === index ? 'primary' : 'grey'"
                                    @click="setActivePlaylist(index)"
                                    title="设为当前轮播列表"
                                ></v-btn>
                            </v-card-title>
                            <v-card-text class="px-1 py-1 flex-grow-1" style="min-height: 150px; max-height: 150px; overflow-y: auto;">
                                <div v-if="list.length === 0" class="text-caption text-center text-grey mt-4">
                                    空列表<br>点击上方收藏添加
                                </div>
                                <v-chip v-for="(item, i) in list" :key="i" size="small" class="ma-1" closable @click:close="removeFromPlaylist(index, i)">
                                    图 {{ item.id || i+1 }}
                                </v-chip>
                            </v-card-text>
                            <v-card-actions class="py-0 px-1" style="min-height: 30px;">
                                <v-spacer></v-spacer>
                                <v-btn size="x-small" variant="text" color="error" @click="clearPlaylist(index)">清空</v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-col>
                </v-row>

            </v-tabs-window-item>

        </v-tabs-window>
        
        <div style="text-align: center;font-size: 12px;" class="mt-2 text-grey">
            <span v-if="tab==='tab-3'">数据来源: Wallhaven (Via Proxy)</span>
            <span v-else>不同壁纸在相应设备下响应</span>
        </div>
    </v-container>
    
    <div class="d-flex justify-center mt-3">
        <v-btn :loading="loading1" variant="tonal" class="ma-2" @click="redefault()">恢复默认</v-btn>
        <v-btn variant="tonal" class="ma-2" @click="cancel()">关闭</v-btn>
        <v-btn :loading="loading2" variant="tonal" class="ma-2" @click="submitdata()" v-if="tab==='tab-1' || tab==='tab-2'">确认设定</v-btn>
        <v-btn variant="tonal" class="ma-2" color="primary" @click="applyOnlineWallpaper()" v-if="(tab==='tab-3' || tab==='tab-4') && selectedOnline" >应用当前</v-btn>
    </div>

    <v-snackbar :timeout="2000" color="info" rounded="pill" location="top" v-model="snackbar">
        {{ snackbarText }}
    </v-snackbar>
</template>

<script>
import { useDisplay } from 'vuetify';
import { setCookie, getCookie, eraseCookie } from '../../utils/cookieUtils.js';
import config from '../../config.js';
import { wallpaperEngine } from '../../utils/wallpaperEngine.js';
import { db } from '../../utils/db.js';

export default {
    emits: ['cancel'],
    setup() {
        const { smAndDown } = useDisplay();
        return { smAndDown };
    },
    data () {
        return {
            loading1: false,
            loading2: false,
            snackbar: false,
            snackbarText: '请选择壁纸',
            configdata: config,
            background: {'pc':{},'mobile':{}},
            
            // 本地壁纸数据
            wallpaperPIC: [], // 修复: 初始化为数组
            wallpaperVD: [],  // 修复: 初始化为数组
            radios: {}, // 选中的本地壁纸
            currentVDPage: 1,
            currentPICPage: 1,
            itemsPerPage: 6,
            staticType: [
                { type: 'pc',name: '电脑壁纸' },
                { type: 'mobile',name: '手机壁纸' },
            ],
            type:'pc',
            
            // Tab 控制
            tab: 'tab-1',
            
            // 在线壁纸数据
            searchQuery: '',
            isSearching: false,
            onlineWallpapers: [],
            onlineMeta: { current_page: 1, last_page: 1 },
            selectedOnline: null, 
            
            // 收藏与播放列表数据
            favorites: [],
            autoPlayEnabled: false,
            playlists: [[], [], []], // 3个播放列表
            activePlaylistIndex: 0, // 当前激活的列表索引
        }
    },
    async mounted() {
        if(import.meta.env.VITE_CONFIG){
            this.configdata = JSON.parse(import.meta.env.VITE_CONFIG);
        }
        this.wallpaperPIC = this.configdata.wallpaper.pic || [];
        this.wallpaperVD = this.configdata.wallpaper.video || [];
        this.radios.title = "请选择壁纸";
        
        // 加载收藏
        this.loadFavorites();
        
        // 加载播放列表配置
        const savedPlaylists = localStorage.getItem('leleoPlaylists');
        if (savedPlaylists) {
            this.playlists = JSON.parse(savedPlaylists);
        }
        const savedIndex = localStorage.getItem('leleoActivePlaylistIndex');
        if (savedIndex) {
            this.activePlaylistIndex = parseInt(savedIndex);
        }
        
        // 检查自动播放状态
        const autoPlay = getCookie('leleoAutoPlay');
        this.autoPlayEnabled = autoPlay === 'true';
    },
    watch: {
        tab(val) {
            // 切换 Tab 时重置一些状态
            if(val == 'tab-1'){
                this.type = 'pc';
                this.itemsPerPage = 6;
                this.wallpaperPIC = this.configdata.wallpaper.pic || [];
            } else if (val == 'tab-2') {
                this.type = 'pc';
                this.itemsPerPage = 6;
                this.wallpaperVD = this.configdata.wallpaper.video || [];
            } else if (val == 'tab-4') {
                this.loadFavorites();
            }
        },
        playlists: {
            handler(val) {
                localStorage.setItem('leleoPlaylists', JSON.stringify(val));
            },
            deep: true
        },
        activePlaylistIndex(val) {
            localStorage.setItem('leleoActivePlaylistIndex', val);
        }
    },
    computed: {
        totalVDPages() {
            return Math.ceil(this.wallpaperVD.length / this.itemsPerPage);
        },
        totalPICPages() {
            return Math.ceil(this.wallpaperPIC.length / this.itemsPerPage);
        },
        paginatedPICItems(){
            if (!this.wallpaperPIC) return [];
            const start = (this.currentPICPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.wallpaperPIC.slice(start, end);
        },
        paginatedVDItems() {
            if (!this.wallpaperVD) return [];
            const start = (this.currentVDPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.wallpaperVD.slice(start, end);
        },
    },
    methods: {
        setCookie,
        getCookie,
        eraseCookie,
        
        submitdata() {
            if(!this.radios.url){
                this.snackbarText = "请选择壁纸";
                this.snackbar = true;
                return;
            }
            let leleodatabackground = this.getCookie("leleodatabackground");
            // 移除临时属性
            const selected = { ...this.radios };
            delete selected.loaded;
            
            if(this.type == 'mobile'){
                this.background.mobile.type= this.tab === 'tab-1'? 'pic' : 'video';
                this.background.mobile.datainfo = selected;
                if(leleodatabackground){
                    this.background.pc = leleodatabackground.pc;
                }else{
                    this.background.pc = this.configdata.background.pc;
                }
            }else{
                this.background.pc.type= this.tab === 'tab-1'? 'pic' : 'video';
                this.background.pc.datainfo = selected;
                if(leleodatabackground){
                    this.background.mobile = leleodatabackground.mobile;
                }else{
                    this.background.mobile = this.configdata.background.mobile;
                }
            }

            this.loading2 = true
            setTimeout(() => {
                this.loading2 = false;
                // 关闭自动轮播，避免冲突
                this.setCookie('leleoAutoPlay', 'false', 365);
                this.setCookie('leleodatabackground', this.background, 365);
                location.reload();
            }, 800)   
        },
        
        redefault(){              
            this.loading1 = true
            setTimeout(() => {
                this.loading1 = false;
                this.eraseCookie('leleodatabackground');
                this.setCookie('leleoAutoPlay', 'false', 365);
                location.reload();
            }, 800) 
        },
        
        cancel() {
            this.$emit('cancel');
        },
        
        updateVDPage(page) { this.currentVDPage = page; },
        updatePICPage(page) { this.currentPICPage = page; },
        
        switchType(type,tabtype){
            if(tabtype == 'static'){
                if(type == 'mobile'){
                    this.type='mobile';
                    this.itemsPerPage = 8;
                    this.wallpaperPIC = this.configdata.wallpaper.picMobile;
                }else if(type == 'pc'){
                    this.type='pc';
                    this.itemsPerPage = 6;
                    this.wallpaperPIC = this.configdata.wallpaper.pic;
                }
                this.currentPICPage = 1;;
            }else{
                if(type == 'mobile'){
                    this.type='mobile';
                    this.itemsPerPage = 8;
                    this.wallpaperVD = this.configdata.wallpaper.videoMobile;
                }else if(type == 'pc'){
                    this.type='pc';
                    this.itemsPerPage = 6;
                    this.wallpaperVD = this.configdata.wallpaper.video;
                }
                this.currentVDPage = 1;
            }
        },

        // --- 新增逻辑：Wallhaven 集成 ---
        
        async performSearch() {
            if (!this.searchQuery) return;
            this.isSearching = true;
            try {
                const result = await wallpaperEngine.search(this.searchQuery, 1);
                this.onlineWallpapers = result.data;
                this.onlineMeta = result.meta;
                await this.checkFavoritesStatus();
            } catch (e) {
                this.snackbarText = "搜索失败，请检查网络";
                this.snackbar = true;
            } finally {
                this.isSearching = false;
            }
        },

        async performRandom() {
            this.isSearching = true;
            try {
                const result = await wallpaperEngine.search("", 1, "random");
                this.onlineWallpapers = result.data;
                // 重置分页信息
                this.onlineMeta = { current_page: 1, last_page: 1 };
                await this.checkFavoritesStatus();
            } catch (e) {
                this.snackbarText = e.message || "获取随机壁纸失败";
                this.snackbar = true;
            } finally {
                this.isSearching = false;
            }
        },
        
        async handlePageChange(page) {
            const container = this.$refs.onlineScroll;
            const prevScrollTop = container ? container.scrollTop : null;
            this.isSearching = true;
            try {
                const result = await wallpaperEngine.search(this.searchQuery, page);
                this.onlineWallpapers = result.data;
                this.onlineMeta = result.meta;
                await this.checkFavoritesStatus();
            } catch (e) {
                this.snackbarText = e.message || "加载失败";
                this.snackbar = true;
            } finally {
                this.isSearching = false;
                this.$nextTick(() => {
                    if (container && prevScrollTop !== null) {
                        container.scrollTop = prevScrollTop;
                    }
                });
            }
        },

        previewOnline(wp) {
            this.selectedOnline = wp;
            this.snackbarText = `已选中: ${wp.id}`;
            this.snackbar = true;
        },
        
        applyOnlineWallpaper() {
            if (!this.selectedOnline) return;
            
            const wpData = {
                title: `Wallhaven-${this.selectedOnline.id}`,
                url: this.selectedOnline.full,
                type: this.selectedOnline.type === 'video' ? 'video' : 'pic'
            };
            
            this.loading2 = true;
            
            let leleodatabackground = this.getCookie("leleodatabackground") || { pc: {}, mobile: {} };
            
            if (this.smAndDown) {
                 leleodatabackground.mobile = { type: wpData.type, datainfo: wpData };
                 if (!leleodatabackground.pc.datainfo) leleodatabackground.pc = { type: wpData.type, datainfo: wpData };
            } else {
                 leleodatabackground.pc = { type: wpData.type, datainfo: wpData };
                 if (!leleodatabackground.mobile.datainfo) leleodatabackground.mobile = { type: wpData.type, datainfo: wpData };
            }
            
            setTimeout(() => {
                this.loading2 = false;
                this.setCookie('leleodatabackground', leleodatabackground, 365);
                this.setCookie('leleoAutoPlay', 'false', 365); 
                location.reload();
            }, 800);
        },

        // --- 收藏逻辑 ---
        async loadFavorites() {
            this.favorites = await db.getAllFavorites();
        },
        
        async checkFavoritesStatus() {
            for (let wp of this.onlineWallpapers) {
                wp.isFav = await db.isFavorite(wp.full);
            }
        },
        
        async toggleFavorite(wp) {
            if (wp.isFav) {
                await db.removeFavorite(wp.full);
                wp.isFav = false;
            } else {
                await db.addFavorite({
                    url: wp.full,
                    preview: wp.preview,
                    type: wp.type,
                    id: wp.id
                });
                wp.isFav = true;
            }
            if (this.tab === 'tab-4') {
                this.loadFavorites();
            }
        },
        
        async removeFavorite(fav) {
            await db.removeFavorite(fav.url);
            this.loadFavorites();
        },
        
        toggleAutoPlay(val) {
            this.setCookie('leleoAutoPlay', val, 365);
            this.snackbarText = val ? "已开启自动轮播 (刷新生效)" : "已关闭自动轮播";
            this.snackbar = true;
            
            if (val) {
                 setTimeout(() => location.reload(), 1000);
            }
        },

        // --- 播放列表逻辑 ---
        setActivePlaylist(index) {
            this.activePlaylistIndex = index;
            this.snackbarText = `已将 列表 ${index + 1} 设为轮播源`;
            this.snackbar = true;
        },
        
        addToActivePlaylist(fav) {
            const list = this.playlists[this.activePlaylistIndex];
            // 查重
            if (list.some(item => item.url === fav.url)) {
                this.snackbarText = "该壁纸已在列表中";
                this.snackbar = true;
                return;
            }
            list.push(fav);
            this.snackbarText = "已添加";
            this.snackbar = true;
        },
        
        removeFromPlaylist(listIndex, itemIndex) {
            this.playlists[listIndex].splice(itemIndex, 1);
        },
        
        clearPlaylist(index) {
            this.playlists[index] = [];
        }
    }
}
</script>

<style scoped>
@import url(/css/mobile.less);
</style>
<style scoped>
video {
    pointer-events: none;
    border-radius: 0.5rem;
}
.itemText {
    width: 50%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.loading-spinner {
    position: absolute;
     top: 50%;
    left: 50%;
     transform: translate(-50%, -50%); 
    z-index: 1; 
}
.video-container {
    position: relative;
    display: flex;
}

.scroll-container {
    max-height: 300px;
    overflow-y: auto;
    /* Custom Scrollbar */
    &::-webkit-scrollbar { width: 5px; }
    &::-webkit-scrollbar-thumb { background-color: #888; border-radius: 4px; }
}

.selected-item {
  border-color: var(--leleo-vcard-color); 
  box-shadow: 0 0 10px var(--leleo-vcard-color); 
}
</style>
