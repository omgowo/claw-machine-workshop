PImage img, img1;
float cx = 350;
float cy =265;
float i=0;
PFont CFont;
String title = "2D點陣彩圖置入與換圖";
String title1 = "by 41547006S 程靖庭";
float t =0;
float d=0;
float bx = 500;
float by =460;

void setup(){
   size(1024,768);
   CFont = createFont("NotoSerifTC-VariableFont_wght.ttf", 28);
   
   img = loadImage("cat.png");
   img1 = loadImage("girl.png");
   background(#FFFCD6);
   surface.setTitle("DrawKitty");
   surface.setLocation(100, 0);
}
void drawBall() {
  float dx = 360 * sin(t);          

  pushMatrix();
  translate(bx + dx, by);          
  rotate(dx / 61);                 
  translate(-bx, -by);             

  //fuzz ball
  stroke(0);
  strokeWeight(1.2);
  fill(91, 155, 213);
  ellipse(bx, by, 127, 122);
  //line
  noFill();
  stroke(30, 60, 110);
  strokeWeight(3);
  bezier(bx-55, by-4,  bx-25, by+2,  bx+9,  by-12, bx+16, by-39);
  bezier(bx-26, by+24, bx+7,  by+24, bx+39, by-4,  bx+32, by-44);
  bezier(bx-44, by+34, bx-17, by+54, bx+35, by+46, bx+43, by+15);
  stroke(0, 114, 188);
  ellipse(bx-81, by-18, 23, 21);
  bezier(bx-92, by-16, bx-87, by+4, bx-95, by+28, bx-114, by+39);
  bezier(bx-82, by-28, bx-73, by-34, bx-61, by-34, bx-53, by-32);
  noStroke();

  popMatrix();
}


void drawEar(){
  pushMatrix();
  translate(cx,cy+98);
  rotate(radians(20*sin(t-0.3)));
  //ear
  fill(132, 116, 106);
  ellipse(69,-76-100, 84, 140);
  ellipse(-69,-76-100, 84, 140);
  popMatrix();
}
void drawHead(){
   pushMatrix();
   translate(cx,cy+105);
   rotate(radians(20*sin(t)));
  //body
  fill(196, 180, 175);
  ellipse(0, -100, 243, 208);
  fill(132,116,106);
  ellipse(0,-100,145,115);
  //brush
  fill(215, 153,180);
  ellipse(-77, 37-100, 42, 32);
  ellipse(76,37-100,42,32);
  //eyes
  fill(218, 227, 243);
  ellipse(-61,-3-100,84,80);
  ellipse(64, - 3-100, 84, 80);
  fill(0);
  ellipse(- 59, - 6-100, 72, 64);
  ellipse(+ 61,- 6-100, 70, 64);
  fill(255);
  ellipse(- 47,- 22-100, 15, 15);
  ellipse(49,- 22-100, 15, 15);
  //whiskers
  stroke(65,46,35);
  strokeWeight(3);
  line(- 150, +36-100, -115,34-100);
  line(- 148,77-100, - 106,51-100);
  line(115, 36-100,150,40-100);
  line(103, 55-100,140,76-100);
  noStroke();
  popMatrix();
}

void draw(){
  background(#FFFCD6);
  
  textFont(CFont);
  textSize(50);
  textAlign(CENTER,CENTER);
  fill(#5A3B3B);
  text(title, width/2,50);
  
  textFont(CFont);
  textSize(25);
  textAlign(CENTER,CENTER);
  fill(#9A76AA);
  text(title1,width/2,85);
  
  imageMode(CENTER);
  if(mousePressed==true){
      image(img1,mouseX,mouseY,200,200);
  }
  else{
    image(img, mouseX,mouseY,100,100);
  }
  //cat1
  //shadow
  noStroke();
  fill(191);
  ellipse(cx+24, cy + 194, 160, 42);
  ellipse(cx+1, cy+140, 159, 122);
  //tail body 
  fill(196, 180, 175);
  ellipse(cx+111, cy+170, 130, 26);
  ellipse(cx+1, cy+140, 159, 122);
  fill(187, 167 ,161);
  ellipse(cx + 8, cy +104, 108, 40);
  
  t+=0.05;
  drawEar();
  drawHead();
  drawBall();
 
}
