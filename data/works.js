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
      intro: '（佔位文字）這裡放 Processing 課程的設計作品與說明。',
      items: [
        { title: '作品名稱 1', desc: '（佔位）課程名稱與作品說明', img: '' },
        { title: '作品名稱 2', desc: '（佔位）課程名稱與作品說明', img: '' },
        { title: '作品名稱 3', desc: '（佔位）課程名稱與作品說明', img: '' }
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
      id: 'music', label: 'Playlist', type: 'cards',
      intro: '拖曳可以旋轉，點一張卡牌會轉到正面。',
      items: [
        { title: '歌名 1', artist: '歌手', cover: '' },
        { title: '歌名 2', artist: '歌手', cover: '' },
        { title: '歌名 3', artist: '歌手', cover: '' },
        { title: '歌名 4', artist: '歌手', cover: '' },
        { title: '歌名 5', artist: '歌手', cover: '' },
        { title: '歌名 6', artist: '歌手', cover: '' },
        { title: '歌名 7', artist: '歌手', cover: '' },
        { title: '歌名 8', artist: '歌手', cover: '' }
      ]
    }
  ]
};
