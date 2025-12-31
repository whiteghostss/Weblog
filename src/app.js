import homeright from '../src/components/hoemright.vue';
import typewriter from './components/typewriter.vue';
import tab1 from './components/tabs/tab1.vue';
import tab2 from './components/tabs/tab2.vue';
import tab3 from './components/tabs/tab3.vue';
import loader from './components/loader.vue';
import polarchart from './components/polarchart.vue';
import config from './config.js';
import { getCookie } from './utils/cookieUtils.js';
import { setMeta,getFormattedTime,getFormattedDate,dataConsole } from './utils/common.js';
import { useDisplay } from 'vuetify'

export default {
  components: {
    tab1,tab2,tab3,loader,homeright,typewriter,polarchart
  },
  setup() {
    const { xs,sm,md } = useDisplay();
    return { xs,sm,md };
  },
  data() {
    return {
      isloading:false,
      isClearScreen: false,
      formattedTime:"",
      formattedDate:"",
      configdata: config,
      dialog1: false,
      dialog2: false,
      personalizedtags: null,
      videosrc: '',
      ismusicplayer: false,
      isPlaying:false,
      playlistIndex: 0,
      audioLoading: false,
      musicinfo: null,
      musicinfoLoading:false,
      lyrics:{},
      socialPlatformIcons: null,
      isExpanded: false,
      stackicons:[
        {icon:"mdi-vuejs",color:"green", model: false,tip: 'vue'},
        {icon:"mdi-language-javascript",color:"#CAD300", model: false,tip: 'javascript'},
        {icon:"mdi-language-css3",color:"blue", model: false,tip: 'css'},
        {icon:"mdi-language-html5",color:"red", model: false,tip: 'html'},
        {icon:"$vuetify",color:"#1697F6", model: false,tip: 'vuetify'},
      ],
      projectcards:null,
      tab: null,
      tabs: [
        {
          icon: 'mdi-pencil-plus',
          text: '样式预览',
          value: 'tab-1',
          component: "tab1",
        },
        {
          icon: 'mdi-wallpaper',
          text: '背景预览',
          value: 'tab-2',
          component: "tab2",
        },
        {
          icon: 'mdi-music-circle-outline',
          text: '音乐播放',
          value: 'tab-3',
          component: "tab3",
        },
      ],
      // 壁纸配置引擎
      // 可选模式: 'wallhaven', 'custom'
      wallpaperProvider: 'wallhaven', 
      
      // 1. Wallhaven 配置
      wallhavenConfig: {
          keywords: 'landscape', // 搜索关键词: anime, landscape, cyberpunk
          proxy: 'https://corsproxy.io/?', // 代理服务，用于解决跨域和墙的问题
          apiUrl: 'https://wallhaven.cc/api/v1/search?sorting=random&atleast=3840x2160&purity=100&q='
      },

      // 2. 自定义/第三方 API 配置 (适合直接返回图片的接口)
      // 推荐接口:
      // 风景: https://api.ixiaowai.cn/gqapi/gqapi.php
      // 动漫: https://api.ixiaowai.cn/api/api.php
      // 必应: https://api.dujin.org/bing/1920.php
      customApiUrl: 'https://api.ixiaowai.cn/gqapi/gqapi.php',

      wallpaperList: [],
      wallpaperIndex: 0,
      activeLayer: 1,
      bg1Url: '',
      bg2Url: '',
      wallpaperTimer: null,
    };
  },
  async mounted() {
    if(import.meta.env.VITE_CONFIG){
      this.configdata = JSON.parse(import.meta.env.VITE_CONFIG);
    }
    this.projectcards = this.configdata.projectcards;this.socialPlatformIcons = this.configdata.socialPlatformIcons;
    this.personalizedtags = this.configdata.tags;
    this.isloading = true;
    let imageurl = "";
    this.dataConsole();
    this.setMeta(this.configdata.metaData.title,this.configdata.metaData.description,this.configdata.metaData.keywords,this.configdata.metaData.icon);
    
    // 初始化壁纸引擎
    if (this.wallpaperProvider !== 'none') {
        this.initWallpaperEngine();
    } else {
        imageurl = this.setMainProperty(imageurl);
    }
    
    //异步等待背景壁纸包括视频壁纸加载完成后再显示页面
    const loadImage = () => {
        const imageUrls = [
          config.avatar,
          ...config.projectcards.map(item => item.img)
        ];
        return new Promise((resolve, reject) => {
          const imagePromises = imageUrls.map((url) => {
            return new Promise((resolve, reject) => {
                const imgs = new Image();
                imgs.src = url;
                imgs.onload = () => resolve();
                imgs.onerror = (err) => reject(err);
            });
          })

          // 设置超时机制：2.5秒
          const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
              resolve();
            }, 2500);
          });
          
          // 等待所有图片加载完成或超时
          Promise.race([Promise.all(imagePromises), timeoutPromise]).then(()=>{
            if(imageurl){
              const img = new Image();
              img.src = imageurl;
              // resolve() 函数通将一个 Promise 对象从未完成状态转变为已完成状态
              img.onload = () => {resolve();};
              img.onerror = (err) => {reject(err);};
            }else{
                // 如果没有静态图片背景（例如使用动态壁纸模式），则直接 resolve，
                // 避免页面一直卡在 loading 状态。
                // 之前的逻辑是尝试等待视频加载，但如果没有视频 src，会导致永久等待。
                
                // 检查是否有视频源
                if (this.videosrc) {
                   const video = this.$refs.VdPlayer;
                   if (video) {
                        video.onloadedmetadata = () => {
                            setTimeout(() => {
                            }, "200");  
                            resolve();
                        };
                        video.onerror = (err) => {resolve();};
                        // 设置一个兜底超时，防止视频加载也卡住
                        setTimeout(() => resolve(), 3000); 
                   } else {
                       resolve();
                   }
                } else {
                    // 既没有图片也没有视频（例如 Wallhaven/Bing 模式且还没加载完第一张图）
                    // 直接结束 loading，让页面显示出来
                    resolve();
                }
            }
          })
        });
     };

    loadImage().then(() => {
        this.formattedTime =  this.getFormattedTime(new Date());
        this.formattedDate =  this.getFormattedDate(new Date());
        setTimeout(() => {
          this.isloading = false;
        }, "500");          
      }).catch((err) => {
        console.error('壁纸加载失败:', err);
        setTimeout(() => {
          this.isloading = false;
        }, "100");  
      });
 
      setInterval(() => {
        this.formattedTime =  this.getFormattedTime(new Date()) ;
      }, 1000);

      await this.getMusicInfo();  //获取音乐数据
      this.setupAudioListener();  //设置 ended 事件监听器，当歌曲播放结束时自动调用 nextTrack 方法。
  },

  beforeDestroy() {     //在组件销毁前移除事件监听器，防止内存泄漏。
    this.$refs.audioPlayer.removeEventListener('ended',  this.nextTrack);
    if (this.wallpaperTimer) {
        clearInterval(this.wallpaperTimer);
    }
  },

  watch:{
    isClearScreen(val){
      if(!this.videosrc){
        return
      }
      if(val){
        this.$refs.VdPlayer.style.zIndex = 0; 
        this.$refs.VdPlayer.controls = true;
      }else{
        this.$refs.VdPlayer.style.zIndex = -100; 
        this.$refs.VdPlayer.controls = false;
      }
    },
    audioLoading(val){
      this.isPlaying = !val;
    }

  //若弹出框使得页面播放卡顿，可以先停止背景播放
  //   dialog1(val){
  //     if(val){
  //       this.$refs.VdPlayer.pause();
  //     }else{
  //       this.$refs.VdPlayer.play();
  //     }
  //  }
  },

  computed: {
    currentSong() {
      return this.musicinfo[this.playlistIndex];
    },
    audioPlayer() {
      return this.$refs.audioPlayer;
    }
  },
  
  methods: {
    getCookie,setMeta,getFormattedTime,getFormattedDate,dataConsole,

    setMainProperty(imageurl){
      const root = document.documentElement;
      let leleodata = this.getCookie("leleodata");
      if(leleodata){
        root.style.setProperty('--leleo-welcomtitle-color', `${leleodata.color.welcometitlecolor}`);
        root.style.setProperty('--leleo-vcard-color', `${leleodata.color.themecolor}`);
        root.style.setProperty('--leleo-brightness', `${leleodata.brightness}%`);
        root.style.setProperty('--leleo-blur', `${leleodata.blur}px`); 
      }else{
        root.style.setProperty('--leleo-welcomtitle-color', `${this.configdata.color.welcometitlecolor}`);
        root.style.setProperty('--leleo-vcard-color', `${this.configdata.color.themecolor}`);  
        root.style.setProperty('--leleo-brightness', `${this.configdata.brightness}%`);  
        root.style.setProperty('--leleo-blur', `${this.configdata.blur}px`);
      }
  
      let leleodatabackground = this.getCookie("leleodatabackground");
      
      // Fix: Check if xs is available, otherwise default to false or get from this
      const isXs = this.xs ? this.xs.value : false;
      
      if(leleodatabackground){
        if(isXs){
          if(leleodatabackground.mobile.type == "pic"){
            root.style.setProperty('--leleo-background-image-url', `url('${leleodatabackground.mobile.datainfo.url}')`);
            imageurl = leleodatabackground.mobile.datainfo.url;
            return imageurl;
          }else{
            this.videosrc = leleodatabackground.mobile.datainfo.url;
          }
        }else{
          if(leleodatabackground.pc.type == "pic"){
            root.style.setProperty('--leleo-background-image-url', `url('${leleodatabackground.pc.datainfo.url}')`);
            imageurl = leleodatabackground.pc.datainfo.url;
            return imageurl;
          }else{
            this.videosrc = leleodatabackground.pc.datainfo.url;
          }
        }
          
      }else{
        if(isXs){
          if(this.configdata.background.mobile.type == "pic"){
            root.style.setProperty('--leleo-background-image-url', `url('${this.configdata.background.mobile.datainfo.url}')`);
            imageurl = this.configdata.background.mobile.datainfo.url;
            return imageurl;
          }else{
            this.videosrc = this.configdata.background.mobile.datainfo.url;
          }
        }else{
          if(this.configdata.background.pc.type == "pic"){
            root.style.setProperty('--leleo-background-image-url', `url('${this.configdata.background.pc.datainfo.url}')`);
            imageurl = this.configdata.background.pc.datainfo.url;
            return imageurl;
          }else{
            this.videosrc = this.configdata.background.pc.datainfo.url;
          }
          
        }
      }
    },

    projectcardsShow(key){
      this.projectcards.forEach((item,index)=>{
        if(index!= key){
          item.show = false;
        }
      })
    },
    handleCancel(){
      this.dialog1 = false;
    },
    jump(url){
      window.open(url, '_blank').focus();
    },
    
    async getMusicInfo(){
      this.musicinfoLoading = true;
      try {
        const response = await fetch(`https://api.i-meto.com/meting/api?server=${this.configdata.musicPlayer.server}&type=${this.configdata.musicPlayer.type}&id=${this.configdata.musicPlayer.id}`
        );
        if (!response.ok) {
          throw new Error('网络请求失败');
        }
        this.musicinfo = await response.json();
        this.musicinfoLoading = false;
      } catch (error) {
        console.error('请求失败:', error);
      }
      
    },
    musicplayershow(val) {
        this.ismusicplayer = val;
    },

    setupAudioListener() {
      this.$refs.audioPlayer.addEventListener('ended', this.nextTrack);
    },

    togglePlay() {
      if (!this.isPlaying) {
        this.audioPlayer.play();
        this.isVdMuted = true;
      } else {
        this.audioPlayer.pause();
        this.isVdMuted = false;
      }
      this.isPlaying = !this.musicinfoLoading && !this.isPlaying;
    },
    previousTrack() {
      this.playlistIndex = this.playlistIndex > 0 ? this.playlistIndex - 1 : this.musicinfo.length - 1;
      this.updateAudio();
    },
    nextTrack() {
      this.playlistIndex = this.playlistIndex < this.musicinfo.length - 1 ? this.playlistIndex + 1 : 0;
      this.updateAudio();
    },
    updateAudio() {
      this.audioPlayer.src = this.currentSong.url;
      this.$refs.audiotitle.innerText = this.currentSong.title;
      this.$refs.audioauthor.innerText = this.currentSong.author;
      this.isPlaying = true;
      this.audioPlayer.play();
    },
    updateCurrentIndex(index) {
      this.playlistIndex = index;
      this.updateAudio();
    },
    updateIsPlaying(isPlaying) {
      this.isPlaying = isPlaying;
    },
    updateLyrics(lyrics){
      this.lyrics = lyrics;
    },
    // 监听等待事件（缓冲不足）
    onWaiting() {
      this.audioLoading = true;
    },
    // 监听可以播放事件（缓冲足够）
    onCanPlay() {
      this.audioLoading = false;
    },
    expandSwitch() {
      this.isExpanded = true;
    },
    collapseSwitch() {
      this.isExpanded = false;
    },
    
    // 壁纸引擎核心逻辑
    async initWallpaperEngine() {
        if (this.wallpaperProvider === 'wallhaven') {
            await this.fetchWallhaven();
        } else if (this.wallpaperProvider === 'custom') {
            this.loadCustomApi();
        }

        // 只有列表模式需要定时轮播，自定义API模式每次加载都是新的
        if (this.wallpaperProvider !== 'custom') {
            this.wallpaperTimer = setInterval(this.loadNextImage, 20000); 
        } else {
             // 自定义API模式也可以定时刷新
             this.wallpaperTimer = setInterval(this.loadCustomApi, 20000);
        }
    },

    // 1. Wallhaven 模式
    async fetchWallhaven() {
        try {
            const targetUrl = this.wallhavenConfig.apiUrl + this.wallhavenConfig.keywords;
            
            // 尝试直接请求 Wallhaven (配合 no-referrer meta 标签)
            // 如果本地网络（如 Clash）配置正确，这通常是可行的，且比公共代理更稳定
            // 如果直接请求失败（CORS），则捕获错误并尝试使用代理
            
            try {
                const response = await fetch(targetUrl);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.data) {
                        this.wallpaperList = data.data.map(item => item.path);
                        if (this.wallpaperList.length > 0) {
                            this.loadNextImage();
                            return; // 成功则直接返回，不走下面的代理逻辑
                        }
                    }
                }
            } catch (directError) {
                console.log("直连 Wallhaven 失败，尝试使用代理...", directError);
            }

            // 如果直连失败，尝试使用 corsproxy.io
            const response = await fetch(this.wallhavenConfig.proxy + encodeURIComponent(targetUrl));
            if (!response.ok) throw new Error('Proxy network response was not ok');
            const data = await response.json();
            
            if (data && data.data) {
                // 使用 wsrv.nl 进行图片压缩和加速 (可选，如果想用原图可去掉 wsrv.nl)
                this.wallpaperList = data.data.map(item => `https://wsrv.nl/?url=${encodeURIComponent(item.path)}`);
                if (this.wallpaperList.length > 0) this.loadNextImage();
            }
        } catch (error) {
            console.error("Wallhaven 加载失败", error);
             // 如果 Wallhaven 彻底失败，回退到默认设置
             let imageurl = "";
             this.setMainProperty(imageurl);
        }
    },

    // 2. Bing 模式 (已移除)

    // 3. 自定义/第三方 API 模式
    loadCustomApi() {
        // 给 URL 加时间戳防止缓存，实现每次刷新
        const nextImageUrl = this.customApiUrl + (this.customApiUrl.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
        this.updateBackgroundLayer(nextImageUrl);
    },

    // 通用：加载列表中的下一张
    loadNextImage() {
        if (this.wallpaperList.length === 0) return;
        const nextImageUrl = this.wallpaperList[this.wallpaperIndex];
        this.updateBackgroundLayer(nextImageUrl);
        this.wallpaperIndex = (this.wallpaperIndex + 1) % this.wallpaperList.length;
    },

    // 通用：更新背景图层（带预加载）
    updateBackgroundLayer(url) {
        const tempImg = new Image();
        // 设置 crossOrigin 为 anonymous，尝试解决 canvas/ORB 问题
        tempImg.crossOrigin = "anonymous";
        tempImg.src = url;
        tempImg.onload = () => {
            if (this.activeLayer === 1) {
                this.bg2Url = url;
                this.activeLayer = 2;
            } else {
                this.bg1Url = url;
                this.activeLayer = 1;
            }
        };
    },
  }
};