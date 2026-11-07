// ===== 可調參數（打磨手感主要改這裡）=====
const CONFIG={
  moveSpeed:2.4, dropSpeed:2.2, riseSpeed:1.6, returnSpeed:2.2,
  limX:0.72, limZ:0.7, maxDepth:0.9,
  // 抓取判定：先鎖定最接近爪心的球，再以機率加入相鄰球。
  grabRadius:0.32, heightTolerance:0.25, chainRadius:0.5,
  snapRadius:0.42, maxHeld:2, gripStrength:0.88, chainGrabChance:0.55, slipChance:0.18,
  fingerRadius:0.08, fingerReach:0.22,
  ballCount:18, ballRadius:0.22, gravity:-20, bounce:0.35, friction:0.3,
  zoomIn:3.0, camLerp:3
};

const canvas=document.getElementById('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
// 素材載入預留：將 PNG 放入 ./assets/textures/ 後，可用以下方式套用到 Mesh。
// const shellTexture = textureLoader.load('./assets/textures/machine-shell.png');
// machineMaterial.map = shellTexture;
// const prizeTexture = textureLoader.load('./assets/textures/prize.png');
// prizeMaterial.map = prizeTexture;
const textureLoader = new THREE.TextureLoader();
// 去背小貓咪素材：透明 PNG 只會顯示貓咪輪廓。
const kittyTexture=textureLoader.load('./assets/textures/kitty-2.png');

renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xd5e3e7); // 作品集配色：低飽和淺藍（原本 0xffe9ed 粉色）
const camera=new THREE.PerspectiveCamera(45,1,0.1,100);
scene.add(new THREE.HemisphereLight(0xfff7fb,0x5269a8,1.05));
scene.add(new THREE.AmbientLight(0xffffff,0.42));
const sun=new THREE.DirectionalLight(0xffffff,0.8);
sun.position.set(4,8,6);
sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-7;sun.shadow.camera.right=7;
sun.shadow.camera.top=9;sun.shadow.camera.bottom=-3;
scene.add(sun);
const rim=new THREE.DirectionalLight(0x9fe8ff,0.45);
rim.position.set(-5,4,-6);scene.add(rim);

const COL={body:0xff7aa2,trim:0xffd166,glass:0x9fe8ff,claw:0x4a4e69,ink:0x2b2d42,balls:[0xff7aa2,0xffd166,0x06d6a0,0x4cc9f0,0xb28dff]};
// Colorfigures 的三段式扁平明暗：讓機台更像手繪插畫，而不是平滑塑膠。
const toonGradient=new THREE.DataTexture(
  new Uint8Array([72,72,72,170,170,170,255,255,255]),
  3,1,THREE.RGBFormat
);
toonGradient.magFilter=THREE.NearestFilter;
toonGradient.minFilter=THREE.NearestFilter;
toonGradient.needsUpdate=true;
const toon=c=>{
  const material=new THREE.MeshToonMaterial({color:c,gradientMap:toonGradient});
  return material;
};
const machine=new THREE.Group();scene.add(machine);
// 正式版外觀由拆分後的 GLB 提供；legacyVisual 僅在模型載入失敗時顯示。
const legacyVisual=new THREE.Group();
machine.add(legacyVisual);
const gltfLoader=THREE.GLTFLoader?new THREE.GLTFLoader():null;
const formalModel=new THREE.Group();
machine.add(formalModel);

// Colorfigures 風格的藍色扁平投影，讓機台與背景有明確接地關係。
const castShadow=new THREE.Mesh(
  new THREE.CircleGeometry(2.8,40),
  new THREE.MeshBasicMaterial({
    color:0x5269a8,
    transparent:true,
    opacity:0.22,
    depthWrite:false
  })
);
castShadow.rotation.x=-Math.PI/2;
castShadow.scale.set(1.35,0.62,1);
castShadow.position.set(0,0.03,0.25);
scene.add(castShadow);

function part(geo,color,x,y,z,outline=true){
  const m=new THREE.Mesh(geo,toon(color));
  m.position.set(x,y,z);
  m.castShadow=true;m.receiveShadow=true;
  if(outline)m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:COL.ink})));
  legacyVisual.add(m);return m;
}
part(new THREE.BoxGeometry(4.4,1.6,3.4),COL.body,0,0.8,0);
part(new THREE.BoxGeometry(4.4,0.6,3.4),COL.body,0,5.3,0);
part(new THREE.BoxGeometry(4,0.1,3),COL.trim,0,1.65,0);
[[-2.1,-1.6],[2.1,-1.6],[-2.1,1.6],[2.1,1.6]].forEach(p=>part(new THREE.BoxGeometry(0.2,3.4,0.2),COL.trim,p[0],3.3,p[1]));
// 玻璃罩只負責視覺呈現；實際防穿模由下方加厚的 Cannon.js 靜態牆體負責。
const glass=new THREE.Mesh(new THREE.BoxGeometry(4,3.4,3),new THREE.MeshPhysicalMaterial({
  color:COL.glass,
  transparent:true,
  opacity:0.1,
  roughness:0.08,
  metalness:0.04,
  clearcoat:0.8,
  clearcoatRoughness:0.08,
  transmission:0.08,
  depthWrite:false,
  side:THREE.DoubleSide
}));
glass.position.set(0,3.3,0);legacyVisual.add(glass);
glass.renderOrder=2;
// 玻璃高光條：參考 Colorfigures 的少量白色 streak，不遮住內部球堆。
const glassStreakMaterial=new THREE.MeshBasicMaterial({
  color:0xffffff,transparent:true,opacity:0.22,depthWrite:false
});
[-0.95,0.35].forEach(x=>{
  const streak=new THREE.Mesh(new THREE.BoxGeometry(0.06,2.7,0.012),glassStreakMaterial);
  streak.position.set(x,3.35,1.51);
  streak.renderOrder=3;
  legacyVisual.add(streak);
});
const glassTopStreak=new THREE.Mesh(
  new THREE.BoxGeometry(2.2,0.035,0.012),
  new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.18,depthWrite:false})
);
glassTopStreak.position.set(0.5,4.7,1.51);
glassTopStreak.rotation.z=-0.12;
glassTopStreak.renderOrder=3;
legacyVisual.add(glassTopStreak);
const rail=part(new THREE.BoxGeometry(4,0.12,0.12),COL.ink,0,4.8,0,false);
// ===== 外側角落垂直出貨口 =====
// 不再使用舊的斜坡、導流牆與灰色內嵌結構；洞口直接開在左前角。
const DROP_HOLE={x:-0.6,z:0.6,halfX:0.275,halfZ:0.275};
function isInsideDropHole(x,z,margin=0){
  return Math.abs(x-DROP_HOLE.x)<=DROP_HOLE.halfX+margin &&
    Math.abs(z-DROP_HOLE.z)<=DROP_HOLE.halfZ+margin;
}
function getSafeSpawnXZ(){
  let x,z;
  do{
    x=-0.68+Math.random()*1.36;
    z=-0.58+Math.random()*0.8;
  }while(isInsideDropHole(x,z,CONFIG.ballRadius));
  return {x,z};
}
// 保留空的旋轉節點，讓既有出貨狀態機不需要改動；孔洞已直接切在粉色底座。
const flapPivot=new THREE.Group();
flapPivot.position.set(DROP_HOLE.x,0.82,DROP_HOLE.z);machine.add(flapPivot);
const FLAP_CLOSED=0,FLAP_OPEN=-1.05;

function loadFormalPart(file){
  return new Promise((resolve,reject)=>{
    if(!gltfLoader){
      reject(new Error('GLTFLoader CDN 尚未載入'));
      return;
    }
    gltfLoader.load('./assets/models/formal/'+file,gltf=>resolve(gltf.scene),undefined,reject);
  });
}
async function loadFormalCabinet(){
  try{
    const [cabinet,glass,base,controlPanel]=await Promise.all([
      loadFormalPart('cabinet.glb'),
      loadFormalPart('glass.glb'),
      loadFormalPart('base.glb'),
      loadFormalPart('control_panel.glb')
    ]);
    const parts=[cabinet,glass,base,controlPanel];
    parts.forEach(model=>{
      model.traverse(object=>{
        if(!object.isMesh)return;
        object.castShadow=true;
        object.receiveShadow=true;
        // 控制台 GLB 只保留外觀；搖桿由下方的 Three.js joystickGroup 實際驅動。
        if(/搖桿底座|搖桿桿|搖桿球/.test(object.name))object.visible=false;
        if(object.material){
          const materials=Array.isArray(object.material)?object.material:[object.material];
          materials.forEach(material=>{
            material.needsUpdate=true;
            if(material.transparent)material.depthWrite=false;
          });
        }
      });
      formalModel.add(model);
    });
    legacyVisual.visible=false;
  }catch(error){
    console.warn('正式版 GLB 載入失敗，使用內建 Demo 外觀。',error);
    formalModel.visible=false;
  }
}
loadFormalCabinet();

// ===== 物理世界 =====
const world=new CANNON.World();
world.gravity.set(0,CONFIG.gravity,0);
world.defaultContactMaterial.friction=CONFIG.friction;
world.defaultContactMaterial.restitution=CONFIG.bounce;
function addStaticBox(halfExtents,position,quaternion){
  const body=new CANNON.Body({mass:0});
  body.addShape(new CANNON.Box(new CANNON.Vec3(halfExtents.x,halfExtents.y,halfExtents.z)));
  body.position.set(position.x,position.y,position.z);
  if(quaternion)body.quaternion.copy(quaternion);
  world.addBody(body);
  return body;
}
// 台面在粉色底座左前角留出與黃色框同寬的 0.55 x 0.55 垂直缺口。
const floorY=1.56,floorHalfY=0.08;
addStaticBox({x:1.0,y:floorHalfY,z:0.6625},{x:0,y:floorY,z:-0.3375});
addStaticBox({x:1.0,y:floorHalfY,z:0.0625},{x:0,y:floorY,z:0.9375});
addStaticBox({x:0.0625,y:floorHalfY,z:0.275},{x:-0.9375,y:floorY,z:0.6});
addStaticBox({x:0.6625,y:floorHalfY,z:0.275},{x:0.3375,y:floorY,z:0.6});
// 避免未抓取的獎品從視覺出貨孔直接掉出機台。
// 成功抓取的獎品會在進入 chute 狀態前移除 Cannon body，因此仍可播放落穴動畫。
addStaticBox(
  {x:DROP_HOLE.halfX,y:0.025,z:DROP_HOLE.halfZ},
  {x:DROP_HOLE.x,y:floorY+0.02,z:DROP_HOLE.z}
);
// 四面加厚玻璃牆：半寬/半高/半深，牆體上下端都與底座重疊。
[
  {x:0.94,y:2.7,z:0,sx:0.08,sy:1.25,sz:0.92},   // 右牆
  {x:-0.94,y:2.7,z:0,sx:0.08,sy:1.25,sz:0.92},  // 左牆
  {x:0,y:2.7,z:-0.94,sx:0.92,sy:1.25,sz:0.08},  // 後牆
  {x:0,y:2.7,z:0.94,sx:0.92,sy:1.25,sz:0.08}    // 前牆
].forEach(w=>{
  addStaticBox({x:w.sx,y:w.sy,z:w.sz},{x:w.x,y:w.y,z:w.z});
});
// ===== 獎品球 =====
const balls=[];
const bGeo=new THREE.SphereGeometry(CONFIG.ballRadius,20,16);
for(let i=0;i<CONFIG.ballCount;i++){
  // 索引 0 使用雙面去背立牌，保留 kitty-2.png 的原始貓咪輪廓。
  const mesh=i===0
    ? new THREE.Mesh(
        new THREE.PlaneGeometry(0.8,0.8),
        new THREE.MeshBasicMaterial({
          map:kittyTexture,
          transparent:true,
          alphaTest:0.5,
          side:THREE.DoubleSide
        })
      )
    : (i===1||i===2)
      ? new THREE.Group() // 索引 1、2 使用 GLB 模型（載入完成前先顯示彩色球）
      : new THREE.Mesh(bGeo,toon(COL.balls[i%5]));
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  machine.add(mesh);
  const body=new CANNON.Body({mass:1,linearDamping:0.15,angularDamping:0.3});
  // 立牌使用球形物理代理，避免碰撞盒外露破壞視覺輪廓。
  body.addShape(new CANNON.Sphere(CONFIG.ballRadius));
  const row=Math.floor(i/6),col=i%6;
  const initialX=-0.68+col*0.27+(row%2)*0.08;
  const initialZ=-0.58+(row%3)*0.34;
  const safeInitial=isInsideDropHole(initialX,initialZ,CONFIG.ballRadius)
    ? {x:-0.68,z:-0.58}
    : {x:initialX,z:initialZ};
  body.position.set(safeInitial.x,1.9+row*0.38,safeInitial.z);
  world.addBody(body);
  balls.push({mesh,body,idx:i%5,held:false,off:new THREE.Vector3(),slipDepth:null});
}

// ===== GLB 獎品（assets/models/*.glb）=====
// 物理仍用球形代理（與其他獎品相同）；GLB 只負責外觀。載入前或失敗時保留彩色球。
function loadPrizeModel(holder,file,height,ballIdx){
  const placeholder=new THREE.Mesh(bGeo,toon(COL.balls[ballIdx%5]));
  placeholder.castShadow=true;
  holder.add(placeholder);
  if(!gltfLoader)return;
  gltfLoader.load('./assets/models/'+file,gltf=>{
    const model=gltf.scene;
    // 模型尺寸各不相同：依高度縮放到 height，並把中心移到原點，才會與物理球對齊。
    const box=new THREE.Box3().setFromObject(model);
    const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    const s=height/size.y;
    model.scale.setScalar(s);
    model.position.set(-center.x*s,-center.y*s,-center.z*s);
    // 換成與場景一致的卡通材質；glTF 顏色是線性值，轉成 sRGB 才會是正確的顏色。
    model.traverse(o=>{
      if(!o.isMesh)return;
      const c=o.material&&o.material.color?o.material.color.clone().convertLinearToSRGB():new THREE.Color(0xffd166);
      const mat=toon(c.getHex());
      mat.side=o.material.side;
      o.material=mat;
      o.castShadow=true;o.receiveShadow=true;
    });
    holder.remove(placeholder);
    holder.add(model);
  },undefined,err=>console.warn(file+' 載入失敗，保留彩色球：',err));
}
loadPrizeModel(balls[1].mesh,'pikmin_yellow_flower.glb',0.72,1);   // 皮克敏
loadPrizeModel(balls[2].mesh,'minecraft_jukebox_disc.glb',0.6,2);  // Minecraft 唱片機
// 獎品 id：抓到時由作品集（data/works.js 的 PRIZES）決定要展示什麼、連到哪一頁
balls[0].prizeId='kitty';balls[1].prizeId='pikmin';balls[2].prizeId='jukebox';

for(let i=0;i<240;i++)world.step(1/60); // 先讓球堆自然落下

// ===== 爪子 =====
const claw=new THREE.Group();claw.position.set(0,4.2,0);machine.add(claw);
claw.add(new THREE.Mesh(new THREE.BoxGeometry(0.5,0.2,0.5),toon(COL.trim)));
const cable=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.2,8),toon(COL.ink));
claw.add(cable);
const arm=new THREE.Group();claw.add(arm);
const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,0.3,16),toon(COL.claw));
hub.position.y=-1.3;arm.add(hub);
const fingers=[];
for(let i=0;i<3;i++){
  const pivot=new THREE.Group();
  pivot.position.y=-1.3;pivot.rotation.y=i*Math.PI*2/3;
  const f=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.7,0.09),toon(COL.claw));
  f.position.set(0.28,-0.35,0);
  pivot.add(f);arm.add(pivot);fingers.push(f);
}
const OPEN=0.3,CLOSED=-0.6;
const clawColliders=[];
for(let i=0;i<3;i++){
  const body=new CANNON.Body({mass:0,type:CANNON.Body.KINEMATIC});
  body.addShape(new CANNON.Sphere(CONFIG.fingerRadius));
  world.addBody(body);
  clawColliders.push(body);
}

// ===== 3D 搖桿 =====
// 控制台是機身的一部分，讓搖桿不會像獨立物件一樣懸浮。
part(new THREE.BoxGeometry(1.0,0.18,0.45),COL.body,0,1.28,1.28);
part(new THREE.BoxGeometry(1.0,0.45,0.1),COL.body,0,1.05,1.47);
part(new THREE.BoxGeometry(0.08,0.45,0.45),COL.body,-0.46,1.05,1.28);
part(new THREE.BoxGeometry(0.08,0.45,0.45),COL.body,0.46,1.05,1.28);
part(new THREE.BoxGeometry(0.86,0.05,0.38),COL.trim,0,1.34,1.28);
const joystickGroup=new THREE.Group();
joystickGroup.position.set(-0.58,1.22,1.3);
machine.add(joystickGroup);
const joystickBase=new THREE.Mesh(
  new THREE.CylinderGeometry(0.16,0.18,0.07,24),
  toon(COL.ink)
);
joystickBase.position.y=0.03;
joystickGroup.add(joystickBase);
const joystickStick=new THREE.Mesh(
  new THREE.CylinderGeometry(0.032,0.045,0.44,12),
  toon(0xb8bec9)
);
joystickStick.position.y=0.27;
joystickGroup.add(joystickStick);
const joystickBall=new THREE.Mesh(
  new THREE.SphereGeometry(0.12,20,14),
  toon(0xe63946)
);
joystickBall.position.y=0.52;
joystickGroup.add(joystickBall);
const joystickHitArea=new THREE.Mesh(
  new THREE.CylinderGeometry(0.38,0.38,1.0,16),
  new THREE.MeshBasicMaterial({
    transparent:true,
    opacity:0.001,
    depthTest:false,
    depthWrite:false
  })
);
joystickHitArea.position.y=0.3;
joystickHitArea.renderOrder=20;
joystickGroup.add(joystickHitArea);
// 正式 control_panel.glb 的搖桿已隱藏，這組 Mesh 是實際可見、可旋轉的搖桿。

// ===== 輸入 =====
let inputPaused=false; // 由 portfolio.js 透過 window.GameControls.setPaused() 控制
const held={L:false,R:false,U:false,D:false};
const raycaster=new THREE.Raycaster();
const pointerNdc=new THREE.Vector2();
const joystickMaxTilt=0.3;
let joystickDragging=false,joystickPointerId=null,joystickLastX=0,joystickLastY=0;
let state='idle',depth=0,t0=0,openK=1,prize=null,shown=false;
const winFrom=new THREE.Vector3();
const chuteEntry=new THREE.Vector3(DROP_HOLE.x,1.82,DROP_HOLE.z);
const chutePipeExit=new THREE.Vector3(DROP_HOLE.x,0.48,DROP_HOLE.z);
const chuteOut=new THREE.Vector3(DROP_HOLE.x,0.42,1.34);
const camPos=new THREE.Vector3(),lookV=new THREE.Vector3(0,2.9,0);
const cameraTarget=new THREE.Vector3(),cameraLookTarget=new THREE.Vector3();
let cameraMode='default';
const ghost=()=>document.getElementById('G');
function startGrab(){if(inputPaused)return;
  if(state==='idle'){
    cameraMode='default';
    state='down';
  }
}
['L','R','U','D'].forEach(k=>{
  const b=document.getElementById(k);
  b.addEventListener('pointerdown',e=>{e.preventDefault();if(inputPaused)return;held[k]=true;b.classList.add('down')});
  const off=()=>{held[k]=false;b.classList.remove('down')};
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,off));
});
ghost().addEventListener('pointerdown',e=>{e.preventDefault();startGrab()});
const keyMap={ArrowLeft:'L',a:'L',ArrowRight:'R',d:'R',ArrowUp:'U',w:'U',ArrowDown:'D',s:'D'};
addEventListener('keydown',e=>{if(inputPaused)return;if(keyMap[e.key])held[keyMap[e.key]]=true;if(e.key===' '){e.preventDefault();startGrab()}});
addEventListener('keyup',e=>{if(keyMap[e.key])held[keyMap[e.key]]=false});

function updatePointerNdc(e){
  const rect=canvas.getBoundingClientRect();
  pointerNdc.set(
    ((e.clientX-rect.left)/rect.width)*2-1,
    -((e.clientY-rect.top)/rect.height)*2+1
  );
}
function joystickPointerDown(e){
  if(state!=='idle'||inputPaused)return;
  updatePointerNdc(e);
  raycaster.setFromCamera(pointerNdc,camera);
  const hit=raycaster.intersectObject(joystickGroup,true).length>0;
  const joystickScreen=joystickGroup.getWorldPosition(new THREE.Vector3()).project(camera);
  const dx=pointerNdc.x-joystickScreen.x;
  const dy=pointerNdc.y-joystickScreen.y;
  const nearProjectedJoystick=dx*dx+dy*dy<0.08*0.08;
  if(!hit&&!nearProjectedJoystick)return;
  e.preventDefault();
  joystickDragging=true;
  cameraMode='joystick';
  joystickPointerId=e.pointerId;
  joystickLastX=e.clientX;joystickLastY=e.clientY;
  canvas.setPointerCapture(e.pointerId);
}
function joystickPointerMove(e){
  if(!joystickDragging||e.pointerId!==joystickPointerId)return;
  e.preventDefault();
  const dx=e.clientX-joystickLastX,dy=e.clientY-joystickLastY;
  joystickGroup.rotation.z=Math.max(-joystickMaxTilt,Math.min(joystickMaxTilt,
    joystickGroup.rotation.z+dx*0.006));
  joystickGroup.rotation.x=Math.max(-joystickMaxTilt,Math.min(joystickMaxTilt,
    joystickGroup.rotation.x-dy*0.006));
  joystickLastX=e.clientX;joystickLastY=e.clientY;
}
function joystickPointerUp(e){
  if(e.pointerId!==joystickPointerId)return;
  joystickDragging=false;joystickPointerId=null;
  if(state==='idle')cameraMode='default';
  if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener('pointerdown',joystickPointerDown);
canvas.addEventListener('pointermove',joystickPointerMove);
canvas.addEventListener('pointerup',joystickPointerUp);
canvas.addEventListener('pointercancel',joystickPointerUp);

// 拖曳轉視角
let drag=false,lx=0;
canvas.addEventListener('pointerdown',e=>{if(!joystickDragging&&!inputPaused){drag=true;lx=e.clientX}});
addEventListener('pointerup',()=>drag=false);
canvas.addEventListener('pointermove',e=>{
  if(!drag||joystickDragging)return;
  machine.rotation.y=Math.max(-0.7,Math.min(0.7,machine.rotation.y+(e.clientX-lx)*0.008));
  lx=e.clientX;
});

let camZ=11;
let userZoomTarget=0;
let userZoom=0;
const USER_ZOOM_MIN=-3.5;
const USER_ZOOM_MAX=4.5;
const userZoomDirection=new THREE.Vector3();
function applyUserZoom(target,lookTarget,distance){
  userZoomDirection.copy(target).sub(lookTarget).normalize();
  target.addScaledVector(userZoomDirection,distance);
}
function handleWheelZoom(e){
  e.preventDefault();
  const delta=e.deltaMode===1?e.deltaY*16:e.deltaY;
  userZoomTarget=Math.max(
    USER_ZOOM_MIN,
    Math.min(USER_ZOOM_MAX,userZoomTarget+delta*0.018)
  );
}
window.addEventListener('wheel',handleWheelZoom,{passive:false});
function resize(){
  const w=innerWidth,h=innerHeight;
  renderer.setSize(w,h,false);
  camera.aspect=w/h;camZ=w/h<0.8?13.5:11;
  camera.updateProjectionMatrix();
}
addEventListener('resize',resize);resize();

// ===== 抓取邏輯 =====
const tipY=()=>claw.position.y-depth-1.5;
function clawFingerPosition(i){
  const a=i*Math.PI*2/3+Math.PI/2;
  return new CANNON.Vec3(
    claw.position.x+Math.cos(a)*CONFIG.fingerReach,
    tipY()+0.22,
    claw.position.z+Math.sin(a)*CONFIG.fingerReach
  );
}
function sphereOverlapsClaw(b,tx,ty,tz){
  const r=CONFIG.ballRadius;
  // 球體 AABB 與三爪包絡盒的重疊，提供下落時的容錯。
  const aabbHit=Math.abs(b.body.position.x-tx)<=CONFIG.grabRadius+r &&
    Math.abs(b.body.position.y-ty)<=CONFIG.heightTolerance+r &&
    Math.abs(b.body.position.z-tz)<=CONFIG.grabRadius+r;
  if(!aabbHit)return false;
  // 再要求球至少接近其中一根爪指，避免只因 AABB 重疊而誤抓。
  return clawColliders.some((body)=>{
    const dx=b.body.position.x-body.position.x;
    const dy=b.body.position.y-body.position.y;
    const dz=b.body.position.z-body.position.z;
    return dx*dx+dy*dy+dz*dz<=Math.pow(CONFIG.fingerRadius+r+0.12,2);
  });
}
function holdBall(b,tx,ty,tz){
  b.held=true;
  b.off.set(b.body.position.x-tx,b.body.position.y-ty,b.body.position.z-tz);
  b.slipDepth=Math.random()<CONFIG.slipChance?Math.random()*CONFIG.maxDepth:null;
  b.body.type=CANNON.Body.KINEMATIC;b.body.mass=0;b.body.updateMassProperties();
  b.body.velocity.set(0,0,0);b.body.angularVelocity.set(0,0,0);
}
function doGrab(){
  const tx=claw.position.x,ty=tipY(),tz=claw.position.z;
  const candidates=balls.map(b=>{
    const dx=b.body.position.x-tx,dz=b.body.position.z-tz;
    const horizontal=Math.hypot(dx,dz);
    return {b,horizontal,vertical:Math.abs(b.body.position.y-ty),
      overlaps:sphereOverlapsClaw(b,tx,ty,tz)};
  }).filter(o=>!o.b.held&&o.overlaps)
    .sort((a,b)=>a.horizontal-b.horizontal||a.vertical-b.vertical);
  const primary=candidates[0];
  if(!primary||Math.random()>CONFIG.gripStrength)return;

  // 只有接近爪心才會自動校正，避免玩家明顯偏位時仍然穿模抓取。
  if(primary.horizontal<=CONFIG.snapRadius){
    claw.position.x=primary.b.body.position.x;
    claw.position.z=primary.b.body.position.z;
  }
  const grabX=claw.position.x,grabY=tipY(),grabZ=claw.position.z;
  holdBall(primary.b,grabX,grabY,grabZ);
  const chain=candidates.slice(1).find(o=>{
    const dx=o.b.body.position.x-primary.b.body.position.x;
    const dy=o.b.body.position.y-primary.b.body.position.y;
    const dz=o.b.body.position.z-primary.b.body.position.z;
    return Math.hypot(dx,dy,dz)<=CONFIG.chainRadius &&
      Math.hypot(o.b.body.position.x-grabX,o.b.body.position.z-grabZ)<=CONFIG.chainRadius;
  });
  if(chain&&Math.random()<CONFIG.chainGrabChance)holdBall(chain.b,grabX,grabY,grabZ);
}
function release(b){
  b.held=false;
  b.slipDepth=null;
  b.body.type=CANNON.Body.DYNAMIC;b.body.mass=1;b.body.updateMassProperties();
  b.body.velocity.set(0,0,0);
  b.body.angularVelocity.set(0,0,0);
  b.body.wakeUp();
}
const approach=(v,target,step)=>Math.abs(target-v)<=step?target:v+Math.sign(target-v)*step;

// ===== 結果頁與重置 =====
const NAMES=['草莓','奶油','薄荷','天空','葡萄'],EMOJI=['🍓','🧈','🌿','☁️','🍇'];
const ov=document.getElementById('result');
function showResult(){
  // 獎品有 prizeId 時，通知作品集顯示展示畫面；若沒有人處理（preventDefault），退回原本的結果卡。
  if(prize.prizeId&&!window.dispatchEvent(new CustomEvent('prize:caught',{cancelable:true,detail:{id:prize.prizeId}})))return;
  ov.style.background='#'+COL.balls[prize.idx].toString(16).padStart(6,'0');
  document.getElementById('rt').textContent=EMOJI[prize.idx]+' 你抓到了「'+NAMES[prize.idx]+'」！';
  ov.classList.add('show');
}
function resetGame(){
  const b=prize;if(!b)return;
  // 只在玻璃罩與粉色底座內重生，並排除左前角垂直洞口。
  const spawn=getSafeSpawnXZ();
  const spawnY=2.35+Math.random()*0.35;
  b.body.position.set(spawn.x,spawnY,spawn.z);
  b.body.velocity.set(0,0,0);b.body.angularVelocity.set(0,0,0);
  b.body.type=CANNON.Body.DYNAMIC;
  b.body.mass=1;b.body.updateMassProperties();
  b.body.wakeUp();
  world.addBody(b.body);
  prize=null;shown=false;state='idle';cameraMode='default';
  camK=0;depth=0;t0=0;openK=1;
  flapPivot.rotation.x=FLAP_CLOSED;
  ov.classList.remove('show');
}
document.getElementById('again').onclick=resetGame;
// 給作品集使用的控制介面
// 暫停當下：放開按住的方向鍵／畫面按鈕，中斷正在拖曳的 3D 搖桿與視角拖曳，避免回來時卡在按住狀態。
function releaseAllInputs(){
  held.L=held.R=held.U=held.D=false;
  ['L','R','U','D'].forEach(k=>document.getElementById(k).classList.remove('down'));
  if(joystickDragging){
    if(joystickPointerId!==null&&canvas.hasPointerCapture(joystickPointerId))canvas.releasePointerCapture(joystickPointerId);
    joystickDragging=false;joystickPointerId=null;
    if(state==='idle')cameraMode='default';
  }
  drag=false;
}
window.GameControls={
  setPaused(p){
    inputPaused=!!p;
    document.body.classList.toggle('game-paused',inputPaused); // 讓畫面上的按鈕呈現停用狀態
    if(inputPaused)releaseAllInputs();
  },
  resetGame(){resetGame()}
};

const clock=new THREE.Clock();
let camK=0;
function loop(){
  const dt=Math.min(clock.getDelta(),0.05),t=clock.elapsedTime;
  let vx=0;
  if(state==='idle'){
    // 放開後搖桿以阻尼方式回到垂直位置。
    if(!joystickDragging){
      joystickGroup.rotation.x+=
        (0-joystickGroup.rotation.x)*Math.min(1,dt*8);
      joystickGroup.rotation.z+=
        (0-joystickGroup.rotation.z)*Math.min(1,dt*8);
    }
    const joystickVx=joystickGroup.rotation.z/joystickMaxTilt*CONFIG.moveSpeed;
    const joystickVz=-joystickGroup.rotation.x/joystickMaxTilt*CONFIG.moveSpeed;
    const buttonVx=((held.R?1:0)-(held.L?1:0))*CONFIG.moveSpeed;
    const buttonVz=((held.D?1:0)-(held.U?1:0))*CONFIG.moveSpeed;
    vx=joystickDragging?joystickVx:buttonVx;
    const vz=joystickDragging?joystickVz:buttonVz;
    claw.position.x=Math.max(-CONFIG.limX,Math.min(CONFIG.limX,claw.position.x+vx*dt));
    claw.position.z=Math.max(-CONFIG.limZ,Math.min(CONFIG.limZ,claw.position.z+vz*dt));
    openK=1;
  }else if(state==='down'){
    depth+=CONFIG.dropSpeed*dt;
    if(depth>=CONFIG.maxDepth){depth=CONFIG.maxDepth;state='grab';t0=0;doGrab()}
  }else if(state==='grab'){
    t0+=dt;openK=Math.max(0,1-t0/0.5);
    if(t0>=0.6)state='up';
  }else if(state==='up'){
    depth-=CONFIG.riseSpeed*dt;
    balls.forEach(b=>{if(b.held&&b.slipDepth!==null&&depth<=b.slipDepth){release(b);b.slipDepth=null}});
    if(depth<=0){depth=0;state='return'}
  }else if(state==='return'){
    const hx=-CONFIG.limX,hz=CONFIG.limZ,s=CONFIG.returnSpeed*dt;
    claw.position.x=approach(claw.position.x,hx,s);
    claw.position.z=approach(claw.position.z,hz,s);
    if(claw.position.x===hx&&claw.position.z===hz){
      const hb=balls.filter(b=>b.held);
      if(hb.length){
        // 只有第一顆作為獎品送往出口，其餘所有黏住的球都恢復動態並落回球堆。
        prize=hb.shift();
        hb.forEach(b=>release(b));
        winFrom.copy(prize.mesh.position);
        world.removeBody(prize.body);prize.held=false;
        state='chute';t0=0;shown=false;
      }else{state='release';t0=0}
    }
  }else if(state==='release'){
    t0+=dt;openK=Math.min(1,t0/0.4);
    if(t0>=0.9)state='idle';
  }else if(state==='chute'){
    t0+=dt;openK=Math.min(1,t0/0.3);
    if(t0<0.6){
      const k=t0/0.6,e=k*k*(3-2*k);
      prize.mesh.position.lerpVectors(winFrom,chuteEntry,e);
      prize.mesh.position.y+=Math.sin(k*Math.PI)*0.12;
    }else if(t0<1.35){
      // 先沿粉色底座內的垂直管道落下，避免直接穿過機身。
      const k=(t0-0.6)/0.75;
      const e=k*k*(3-2*k);
      prize.mesh.position.lerpVectors(chuteEntry,chutePipeExit,e);
      prize.mesh.rotation.x+=dt*4;
      prize.mesh.rotation.z+=dt*2;
    }else{
      // 從管道底部出來後，才沿機台前方滾到外面。
      const k=Math.min(1,(t0-1.35)/0.85);
      const e=k*k*(3-2*k);
      prize.mesh.position.lerpVectors(chutePipeExit,chuteOut,e);
      prize.mesh.position.y+=Math.sin(k*Math.PI)*0.12;
      prize.mesh.rotation.x+=dt*10;
      prize.mesh.rotation.z+=dt*5;
      prize.mesh.rotation.y+=dt*7;
      const push=Math.min(1,k*1.8);
      flapPivot.rotation.x=FLAP_CLOSED+(FLAP_OPEN-FLAP_CLOSED)*push;
    }
    if(t0>2.2){
      state='win';t0=0;
    }
  }else if(state==='win'){
    t0+=dt;
    flapPivot.rotation.x+=(FLAP_CLOSED-flapPivot.rotation.x)*Math.min(1,dt*4);
    if(t0>0.65&&!shown){shown=true;showResult()}
  }
  if(state!=='idle'&&state!=='chute'&&state!=='win')cameraMode='default';
  ghost().disabled=state!=='idle';
  document.getElementById('hint').textContent=state==='idle'?'移動爪子到球上方，按「抓」':'抓取中…';

  // 爪子外觀
  arm.position.y=-depth;
  cable.scale.y=(1.2+depth)/1.2;cable.position.y=-(1.2+depth)/2;
  fingers.forEach(f=>f.rotation.z=CLOSED+(OPEN-CLOSED)*openK);
  claw.rotation.z=-vx*0.02+Math.sin(t*2)*0.01;
  rail.position.z=claw.position.z;

  // 用三個不可見球體代理爪指碰撞，讓球不會完全穿過爪子。
  clawColliders.forEach((body,i)=>{
    body.position.copy(clawFingerPosition(i));
    body.velocity.set(0,0,0);
  });

  // 被抓住的球跟著爪子
  balls.forEach(b=>{if(b.held){
    b.body.position.set(claw.position.x+b.off.x,tipY()+b.off.y,claw.position.z+b.off.z);
    b.body.velocity.set(0,0,0);
  }});
  world.step(1/60,dt,3);
  // 所有未進入出貨動畫的獎品都與 Cannon.js body 同步，包含小貓咪立牌。
  balls.forEach(b=>{
    if(b===prize)return;
    b.mesh.position.copy(b.body.position);
    b.mesh.quaternion.copy(b.body.quaternion);
  });

  userZoom+=(userZoomTarget-userZoom)*Math.min(1,dt*7);
  const activeUserZoom=state==='idle'?userZoom:0;

  // 運鏡：抓取時拉近並跟隨爪子
  if((state==='chute'||state==='win')&&prize){
    const wp=machine.localToWorld(prize.mesh.position.clone());
    const focus=machine.localToWorld(new THREE.Vector3(-0.6,0.9,1.45));
    camPos.lerpVectors(wp,focus,0.45);
    camPos.z+=3.4;
    camera.position.lerp(camPos,Math.min(1,dt*3));
    lookV.lerp(focus,Math.min(1,dt*4));
    camera.lookAt(lookV);
  }else{
    if(cameraMode==='joystick'&&state==='idle'){
      // 從機台前上方俯瞰，讓爪子與球堆的前後位置清楚可見。
      cameraTarget.copy(machine.localToWorld(new THREE.Vector3(0,5.2,3.8)));
      cameraLookTarget.copy(machine.localToWorld(
        new THREE.Vector3(claw.position.x,2.25,claw.position.z)
      ));
      applyUserZoom(cameraTarget,cameraLookTarget,activeUserZoom);
      camera.position.lerp(cameraTarget,Math.min(1,dt*3.5));
      lookV.lerp(cameraLookTarget,Math.min(1,dt*4));
    }else{
      camK+=((state==='idle'?0:1)-camK)*Math.min(1,dt*CONFIG.camLerp);
      cameraTarget.set(
        Math.sin(t*0.3)*0.5*(1-camK)+claw.position.x*0.5*camK,
        2.25-0.2*camK,
        camZ-CONFIG.zoomIn*camK
      );
      cameraLookTarget.set(
        claw.position.x*camK,
        1.95+0.3*camK,
        claw.position.z*camK*0.5
      );
      applyUserZoom(cameraTarget,cameraLookTarget,activeUserZoom);
      camera.position.lerp(cameraTarget,Math.min(1,dt*3.5));
      lookV.lerp(cameraLookTarget,Math.min(1,dt*4));
    }
    camera.lookAt(lookV);
  }
  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}
loop();
