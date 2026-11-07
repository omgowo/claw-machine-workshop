// 作品集內容都在這個檔案。要換內容只改這裡，不用動 portfolio.js。
// 圖片欄位留空字串就會顯示佔位色塊；放圖片就填路徑，例如 'assets/works/resin.jpg'。
// 獎品 → 作品頁。抓到對應獎品後，會先在畫面中央展示模型（可拖曳旋轉），再引導到 page 指定的分頁。
// model.kind：'glb'（3D 模型，height 為展示高度）或 'image'（平面圖片，像貓咪立牌）。
window.PRIZES = {
  kitty: {
    name: '小貓咪', page: 'processing',
    blurb: '平面的小貓咪立牌。牠要帶你去看我的 Processing 作品。',
    model: { kind: 'image', src: 'assets/textures/kitty-2.png', height: 1.8 }
  },
  pikmin: {
    name: '黃色皮克敏', page: 'art',
    blurb: '頭上開著小花的皮克敏。牠要帶你去看我的作品集。',
    model: { kind: 'glb', src: 'assets/models/pikmin_yellow_flower.glb', height: 1.7 }
  },
  jukebox: {
    name: 'Minecraft 唱片機', page: 'music',
    blurb: '插著唱片的唱片機。它要帶你去聽我的 Playlist。',
    model: { kind: 'glb', src: 'assets/models/minecraft_jukebox_disc.glb', height: 1.6 }
  }
};

window.WORKS = {
  pages: [
    {
      id: 'processing', label: 'Processing 設計', type: 'grid',
      intro: 'HW2｜2D 點陣彩圖置入與換圖：使用 Processing 製作的影像旋轉與替換作品。',
      items: [
        {
          title: 'HW2｜2D 點陣彩圖置入與換圖',
          desc: 'Processing 影像旋轉與換圖練習。畫面結合自製角色、圖片素材與程式碼展示。',
          demo: 'hw2-image-rotate',
          source: 'assets/works/hw2/Mydraw.pde'
        }
      ]
    },
    {
      id: 'art', label: '作品集', type: 'matchbox',
      intro: '點兩側的盒子、按方向鍵或拖曳可以切換；點開啟的圖片可以看大圖。',
      items: [
        { title: '滴膠作品', alt: '冰棒造型的滴膠鑰匙圈，內嵌金色小齒輪與 Hugs & kisses 字樣', desc: '', img: 'assets/works/resin.jpg' },
        { title: '粉彩', alt: '粉彩畫：街角的拱廊與斑馬線，一位拿著手機的女孩背對畫面', desc: '', img: 'assets/works/pastel.jpg' },
        { title: '手機掛件', alt: '黃色串珠手機掛件，掛著一個黃色透明的小吊飾', desc: '', img: 'assets/works/charm.jpg' }
      ]
    },
    {
      id: 'music', label: 'Playlist', type: 'model-cards',
      intro: '從唱片堆疊中抽出一張，看看它的歌名與歌手；只展示文字，不嵌入音訊。',
      items: [
        { title: '海浪', artist: 'Deca Joins', model: 'assets/vinyl/01_decajoins_go-slow.glb' },
        { title: 'Lover Girl', artist: 'Laufey', model: 'assets/vinyl/02_laufey_lover-girl.glb' },
        { title: '遊蕩的人', artist: 'good band', model: 'assets/vinyl/03_goodband_we-learn-to-let-go.glb' },
        { title: '還願', artist: '草東沒有派對', model: 'assets/vinyl/04_nopartyforcaodong_devotion.glb' },
        { title: 'Birds of a Feather', artist: 'Billie Eilish', model: 'assets/vinyl/05_billieeilish_birds-of-a-feather.glb' }
      ]
    }
  ]
};
