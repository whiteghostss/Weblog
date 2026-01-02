import homeright from '../src/components/hoemright.vue';
import typewriter from './components/typewriter.vue';
import tab1 from './components/tabs/tab1.vue';
import tab2 from './components/tabs/tab2.vue';
import tab3 from './components/tabs/tab3.vue';
import loader from './components/loader.vue';
import polarchart from './components/polarchart.vue';
import config from './config.js';
import { getCookie, setCookie } from './utils/cookieUtils.js';
import { setMeta,getFormattedTime,getFormattedDate,dataConsole } from './utils/common.js';
import { useDisplay } from 'vuetify'
import { db } from './utils/db.js';

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
    
    // 初始化壁纸逻辑
    // 检查自动播放状态和播放列表配置
    try {
        const autoPlay = getCookie('leleoAutoPlay') === 'true';
        if (autoPlay) {
            // 获取播放列表
            const savedPlaylists = localStorage.getItem('leleoPlaylists');
            const savedIndex = localStorage.getItem('leleoActivePlaylistIndex');
            
            if (savedPlaylists && savedIndex !== null) {
                const playlists = JSON.parse(savedPlaylists);
                const activeIndex = parseInt(savedIndex);
                const activeList = playlists[activeIndex] || [];
                
                if (activeList.length > 0) {
                    console.log(`检测到自动轮播：列表 ${activeIndex + 1}，共 ${activeList.length} 张`);
                    this.wallpaperList = activeList.map(item => item.url);
                    // 立即加载第一张
                    this.loadNextImage();
                    // 启动 60s 轮播
                    this.wallpaperTimer = setInterval(this.loadNextImage, 60000); 
                } else {
                     console.log("当前播放列表为空，降级到本地配置");
                     this.setCookie('leleoAutoPlay', 'false', 365);
                     imageurl = this.setMainProperty(imageurl);
                }
            } else {
                // 如果没有新版播放列表，尝试兼容旧版逻辑（全部收藏）
                const favorites = await db.getAllFavorites();
                if (favorites && favorites.length > 0) {
                    console.log("检测到旧版收藏数据，自动迁移到轮播模式");
                    this.wallpaperList = favorites.map(f => f.url);
                    this.loadNextImage();
                    this.wallpaperTimer = setInterval(this.loadNextImage, 60000); 
                } else {
                    imageurl = this.setMainProperty(imageurl);
                }
            }
        } else {
            console.log("自动轮播未开启，使用本地配置");
            imageurl = this.setMainProperty(imageurl);
        }
    } catch (error) {
        console.error("初始化壁纸失败，回退到本地配置:", error);
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
            if(imageurl || (this.wallpaperList.length > 0)){
              // 如果有 imageurl (静态背景) 或 wallpaperList (动态轮播)，且不是纯视频模式
              // 这里的判断略复杂，简化为：如果不是明确的视频模式，尝试预加载第一张
              const firstBg = imageurl || (this.wallpaperList.length > 0 ? this.wallpaperList[this.wallpaperIndex === 0 ? 0 : this.wallpaperIndex - 1] : '');
              if (firstBg && !firstBg.endsWith('.mp4') && !firstBg.endsWith('.webm')) {
                  const img = new Image();
                  img.src = firstBg;
                  img.onload = () => {resolve();};
                  img.onerror = (err) => {reject(err);};
              } else {
                  // 视频或空
                  resolve();
              }
            }else{
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
    getCookie,setCookie,setMeta,getFormattedTime,getFormattedDate,dataConsole,

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
      
      const isXs = this.xs ? this.xs.value : false;
      
      if(leleodatabackground){
        if(isXs){
          if(leleodatabackground.mobile.type == "pic"){
            this.updateBackgroundLayer(leleodatabackground.mobile.datainfo.url);
            imageurl = leleodatabackground.mobile.datainfo.url;
            return imageurl;
          }else{
            this.videosrc = leleodatabackground.mobile.datainfo.url;
          }
        }else{
          if(leleodatabackground.pc.type == "pic"){
            this.updateBackgroundLayer(leleodatabackground.pc.datainfo.url);
            imageurl = leleodatabackground.pc.datainfo.url;
            return imageurl;
          }else{
            this.videosrc = leleodatabackground.pc.datainfo.url;
          }
        }
          
      }else{
        if(isXs){
          if(this.configdata.background.mobile.type == "pic"){
            this.updateBackgroundLayer(this.configdata.background.mobile.datainfo.url);
            imageurl = this.configdata.background.mobile.datainfo.url;
            return imageurl;
          }else{
            this.videosrc = this.configdata.background.mobile.datainfo.url;
          }
        }else{
          if(this.configdata.background.pc.type == "pic"){
            this.updateBackgroundLayer(this.configdata.background.pc.datainfo.url);
            imageurl = this.configdata.background.pc.datainfo.url;
            return imageurl;
          }else{
            this.videosrc = this.configdata.background.pc.datainfo.url;
          }
          
        }
      }
      return imageurl;
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
    
    // 初始化收藏夹轮播引擎 (已弃用，逻辑直接写在 mounted 中)
    async initFavoritesEngine() {
        // ...
    },

    // 通用：加载列表中的下一张
    loadNextImage() {
        if (this.wallpaperList.length === 0) return;
        const nextImageUrl = this.wallpaperList[this.wallpaperIndex];
        
        // 检查是图片还是视频
        // 我们的 db 存了 type，但这里 wallpaperList 只是 url 数组
        // 简单通过后缀判断，或者改进 initFavoritesEngine 存对象
        const isVideo = nextImageUrl.endsWith('.mp4') || nextImageUrl.endsWith('.webm');
        
        if (isVideo) {
             this.videosrc = nextImageUrl;
             this.bg1Url = ''; // 清除图片
             this.bg2Url = '';
             this.activeLayer = 0; // 0 表示都不显示，或者不影响
        } else {
             this.updateBackgroundLayer(nextImageUrl);
             // 如果当前是视频模式，需要切换回图片模式
             // updateBackgroundLayer 会设置 css 变量
        }
        
        this.wallpaperIndex = (this.wallpaperIndex + 1) % this.wallpaperList.length;
    },

    // 通用：更新背景图层（带预加载）
    updateBackgroundLayer(url) {
        // 更新 CSS 变量，以防 App.vue 仍依赖它
        const root = document.documentElement;
        root.style.setProperty('--leleo-background-image-url', `url('${url}')`);
        
        this.videosrc = ''; // 停止视频

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
