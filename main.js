const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

let score = 0, lives = 3, gameOver = false;
let fishTimer = 0, trashTimer = 0;
let gameStarted = false; 
let isPaused = false;
// Versucht, einen gespeicherten Score zu laden. Wenn keiner da ist, nimm 0.
let highScore = localStorage.getItem('cyberHaiHighScore') || 0;
// Zeigt den Highscore sofort beim Start an
document.getElementById('highScore').innerText = highScore;
const fishes = [], trash = [];

const player = {
  x: 60, y: H/2 - 40, w: 140, h: 80, speed: 300, vy: 0, vx: 0 
};

//  Müll-Bilder GLOBAL laden ---
const trashImages = {
    Reifen: new Image(),
    Dose: new Image(),
    Chipstüte: new Image()
};

trashImages.Reifen.src = 'assets/Reifen.png';     
trashImages.Dose.src = 'assets/Dose.png';         
trashImages.Chipstüte.src = 'assets/Chipstüte.png'; 

// Fisch-Bild laden ---
const FischImg = new Image();
FischImg.src = 'assets/Fisch.png'; // Pfad zum neuen Fisch-Bild

// Hintergrund-Bild für das Spiel laden ---
const bgImg = new Image();
bgImg.src = 'assets/spiel_hintergrund.png'; // Pfad zum neuen Hintergrund
// -----------------------------------------------------------------------

// Shark sprite loader
const sharkImg = new Image();
let sharkLoaded = false;
let sharkGlow = true; 

sharkImg.onload = () => { 
  sharkLoaded = true; 
  console.log('shark.png loaded');
};
sharkImg.onerror = (e) => { 
  sharkLoaded = false; 
  console.error('Failed to load shark.png', e);
};
sharkImg.src = 'assets/shark.png';

// Fallback Check für den Hai
if(sharkImg.complete && sharkImg.naturalWidth > 0){
  sharkLoaded = true; 
}

function resetGame() {
  score = 0; lives = 3; gameOver = false;
  fishes.length = 0; trash.length = 0;
  player.y = H/2 - player.h/2;
  document.getElementById('overlay').classList.add('hidden');
  updateHUD();
}

function spawnFish() {
  // Basisgröße festlegen 
  let baseSize = 20 + Math.random() * 5; 
  let w = baseSize * 1, h = baseSize;

  // Größe basierend auf dem Bildformat anpassen, falls geladen
  if (FischImg.complete && FischImg.naturalWidth > 0) {
      const ratio = FischImg.naturalWidth / FischImg.naturalHeight;
      w = baseSize * ratio; 
      h = baseSize;
  }

  fishes.push({ 
      x: W + 60, 
      y: Math.random() * (H - h - 60) + 30, 
      w: w, 
      h: h, 
      speed: 120 + Math.random() * 140,
      img: FischImg 
  });
}

function spawnTrash() {
  const types = ['Reifen', 'Dose', 'Chipstüte'];
  const type = types[Math.floor(Math.random() * types.length)];
  const img = trashImages[type];
  
  // Basisgröße festlegen
  let baseSize = 55; 
  let w = baseSize, h = baseSize;

  // Größe basierend auf dem Bildformat anpassen, falls geladen
  if (img.complete && img.naturalWidth > 0) {
      const ratio = img.naturalWidth / img.naturalHeight;
      // Wenn breiter als hoch, Breite anpassen, sonst Höhe
      if (ratio >= 1) { w = baseSize * ratio; h = baseSize; }
      else { w = baseSize; h = baseSize / ratio; }
  }

  let obj = {
    x: W + 60,
    y: Math.random() * (H - h - 40) + 20, // Innerhalb des Canvas bleiben
    w: w,
    h: h,
    type: type,
    speed: 80 + Math.random() * 80, // Zufällige Geschwindigkeit
    img: img 
  };
  trash.push(obj);
}

function rectsOverlap(a,b){
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update(dt){
  if(gameOver || !gameStarted || isPaused) return;

  // Highscore Check
  if (score > highScore) {
      highScore = score;
      localStorage.setItem('cyberHaiHighScore', highScore); 
      document.getElementById('highScore').innerText = highScore;
  }  

  // player movement
  player.y += player.vy * dt; 
  if(player.y < 0) player.y = 0; if(player.y + player.h > H) player.y = H - player.h;

  player.x += player.vx * dt;
  if(player.x < 0) player.x = 0; 
  if(player.x + player.w > W) player.x = W - player.w;

  // spawn logic
  fishTimer += dt;
  if(fishTimer > 0.7){ spawnFish(); fishTimer = 0; }
  trashTimer += dt;
  if(trashTimer > 2.0){ spawnTrash(); trashTimer = 0; }

  // move fishes
  for(let i=fishes.length-1;i>=0;i--){
    const f = fishes[i]; f.x -= f.speed * dt;
    if(f.x + f.w < 0) fishes.splice(i,1);
    else if(rectsOverlap(player,f)) { score += 1; fishes.splice(i,1); updateHUD(); }
  }

  // move trash
  for(let i=trash.length-1;i>=0;i--){
    const t = trash[i]; t.x -= t.speed * dt;
    if(t.x + t.w < 0) trash.splice(i,1);
    else if(rectsOverlap(player,t)) { 
        lives -= 1; 
        trash.splice(i,1); 
        updateHUD(); 
        
        if (lives <= 0 && !gameOver) {
            doGameOver(); 
        }
    }
  }
}

function draw(){
  // Hintergrund zeichnen ---
  // Prüfen, ob das Bild geladen ist
  if (bgImg.complete && bgImg.naturalWidth > 0) {
      // Das Bild auf die volle Größe des Canvas (W x H) strecken
      ctx.drawImage(bgImg, 0, 0, W, H);
  } else {
      // Fallback: Das alte Wasser-Blau, falls das Bild noch lädt
      ctx.fillStyle = '#56c2ff'; 
      ctx.fillRect(0,0,W,H);
  }
  // ----------------------------------
  
// Fisch-Bild zeichnen 
for(const f of fishes){
  if (f.img && f.img.complete && f.img.naturalWidth > 0) {
      ctx.save();
      ctx.shadowColor = '#ff9fbf'; 
      ctx.shadowBlur = 8;
      
      // Einfach normal zeichnen, da das Bild schon passt
      ctx.drawImage(f.img, f.x, f.y, f.w, f.h);
      
      ctx.restore();
  } else {
      ctx.fillStyle = '#ff9fbf';
      ctx.fillRect(f.x, f.y, f.w, f.h);
  }
}

 // Draw trash (Dosen/Müll) 
  for (const t of trash) {
    // Prüfen, ob das Bild geladen ist, bevor wir es zeichnen
    if (t.img && t.img.complete && t.img.naturalWidth > 0) {
        // Optional: Ein leichtes Leuchten hinzufügen, passend zum Stil
        ctx.save();
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 10;
        ctx.drawImage(t.img, t.x, t.y, t.w, t.h);
        ctx.restore();
    } else {
        // Fallback: Rotes Rechteck, falls Bild nicht lädt
        ctx.fillStyle = 'red';
        ctx.fillRect(t.x, t.y, t.w, t.h);
    }
  }

  // Draw player (Hai neon-grün)
  if(sharkLoaded){
    // draw sprite with optional neon glow
    ctx.save();
    if(sharkGlow){ ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 20; }
    // scale sprite to slightly bigger than logical player box for visibility
    const sw = player.w * 1.15; const sh = player.h * 1.15;
    // center the sprite around player.x/y
    const sx = player.x - (sw - player.w) * 0.5;
    const sy = player.y - (sh - player.h) * 0.5;
    ctx.drawImage(sharkImg, sx, sy, sw, sh);
    ctx.restore();
  } else {
    drawShark(player);
  }
  if(isPaused){
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Halbtransparenter Hintergrund
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSE', W/2, H/2);
    ctx.restore();
  }
}



function drawShark(p){
  ctx.save(); ctx.translate(p.x, p.y);
  // body
  ctx.fillStyle = '#39ff14';
  ctx.beginPath(); ctx.ellipse(p.w*0.5, p.h*0.5, p.w*0.55, p.h*0.5, 0, 0, Math.PI*2); ctx.fill();
  // tail
  ctx.beginPath(); ctx.moveTo(p.w*0.95, p.h*0.5); ctx.lineTo(p.w+18, p.h*0.25); ctx.lineTo(p.w+18, p.h*0.75); ctx.closePath(); ctx.fill();
  // dorsal fin
  ctx.fillStyle = '#0c7a0a'; ctx.beginPath(); ctx.moveTo(p.w*0.45, p.h*0.05); ctx.lineTo(p.w*0.6, -p.h*0.15); ctx.lineTo(p.w*0.7, p.h*0.25); ctx.closePath(); ctx.fill();
  // pectoral fin
  ctx.beginPath(); ctx.moveTo(p.w*0.35, p.h*0.65); ctx.lineTo(p.w*0.05, p.h*0.9); ctx.lineTo(p.w*0.55, p.h*0.6); ctx.closePath(); ctx.fill();
  // eye
  ctx.fillStyle = '#001'; ctx.beginPath(); ctx.arc(p.w*0.7, p.h*0.35, 4,0,Math.PI*2); ctx.fill();
  // mouth/teeth (simple)
  ctx.fillStyle = '#e8ffec'; ctx.beginPath(); ctx.moveTo(p.w*0.72, p.h*0.48); ctx.lineTo(p.w*0.95, p.h*0.55); ctx.lineTo(p.w*0.72, p.h*0.62); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function renderHearts(){
  const el = document.getElementById('hearts');
  if(!el) return;
  el.innerHTML = '';
  const max = 3;
  for(let i=0;i<max;i++){
    const span = document.createElement('span');
    span.className = 'heart' + (i < lives ? '' : ' hidden');
    span.textContent = '♥';
    el.appendChild(span);
  }
}

function updateHUD(){
  document.getElementById('score').textContent = score;
  renderHearts();
}



function doGameOver() {
  gameOver = true;
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('overlayScore').textContent = `Punkte: ${score}`;
  document.getElementById('overlayTitle').textContent = 'Game Over';
  showHighScores();      // Zeigt die aktuelle Tabelle
  checkHighScore(score); // Prüft, ob das Eingabefeld erscheinen soll
}

// Controls
window.addEventListener('keydown', e => {
  if (!gameStarted) {
    gameStarted = true;
    document.getElementById('restartBtn').style.display = 'inline-block'; 
    resetGame();
    return;
  }
  if(e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') player.vy = -player.speed;
  if(e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') player.vy = player.speed;
  if(e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') player.vx = player.speed;
  if(e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') player.vx = -player.speed;
  if(e.key === ' ' && gameStarted && !gameOver) isPaused = !isPaused;
});

window.addEventListener('keyup', e => {
  if(e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { if(player.vy < 0) player.vy = 0; }
  if(e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { if(player.vy > 0) player.vy = 0; }

  // Stoppen X 
  if(e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { if(player.vx > 0) player.vx = 0; }
  if(e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { if(player.vx < 0) player.vx = 0; }
});


// Restart
document.getElementById('restartBtn').addEventListener('click', ()=>{ resetGame(); });

// Start Screen Funktion
function showStartScreen() {
  const overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');
  
  document.getElementById('overlayTitle').textContent = 'Cyber Hai'; 
  document.getElementById('overlayScore').textContent = 'Beliebige Taste drücken zum Start';
  
  // Das Eingabefeld verstecken
  document.getElementById('newHighScoreEntry').classList.add('hidden');
  
  showHighScores();

  document.getElementById('restartBtn').style.display = 'none'; 
}


// Main loop
let last = performance.now();
function loop(t){
  const dt = Math.min(0.05, (t - last)/1000);
  last = t;
  update(dt); draw();
  requestAnimationFrame(loop);
}

// Globale Highscore Liste laden
const NO_OF_HIGH_SCORES = 5;
const HIGH_SCORES = 'highScores';
const highScoreString = localStorage.getItem(HIGH_SCORES);
const highScores = JSON.parse(highScoreString) || [];

function showHighScores() {
  const list = document.getElementById('highScoreList');
  list.innerHTML = highScores
    .map(score => `<li><span>${score.name}</span> <span>${score.score}</span></li>`)
    .join('');
}

function checkHighScore(accountScore) {
  const lowestScore = highScores[NO_OF_HIGH_SCORES - 1]?.score ?? 0;

  if (accountScore > lowestScore || highScores.length < NO_OF_HIGH_SCORES) {
    // Erzwingt das Anzeigen des Eingabefeldes
    document.getElementById('newHighScoreEntry').style.display = 'block'; 
    document.getElementById('newHighScoreEntry').classList.remove('hidden'); // Zur Sicherheit
    
    // Versteckt den Neustart-Button
    document.getElementById('restartBtn').style.display = 'none'; 
  } else {
    // Versteckt das Eingabefeld
    document.getElementById('newHighScoreEntry').style.display = 'none';
    
    // Zeigt den Neustart-Button
    document.getElementById('restartBtn').style.display = 'inline-block';
  }
}

function saveHighScore(score, highScores) {
  const name = document.getElementById('playerName').value || 'Unbekannt';
  const newScore = { score, name };
  
  // 1. Hinzufügen
  highScores.push(newScore);
  // 2. Sortieren (höchste zuerst)
  highScores.sort((a, b) => b.score - a.score);
  // 3. Auf Top 5 kürzen
  highScores.splice(NO_OF_HIGH_SCORES);
  
  // 4. Speichern und Update
  localStorage.setItem(HIGH_SCORES, JSON.stringify(highScores));
  showHighScores();
  
  // UI zurücksetzen
  document.getElementById('newHighScoreEntry').classList.add('hidden');
  document.getElementById('restartBtn').classList.remove('hidden');
  document.getElementById('restartBtn').style.display = 'inline-block';
}

// Event Listener für den Speicher-Button
document.getElementById('saveScoreBtn').addEventListener('click', () => {
  saveHighScore(score, highScores);
});
  
  showHighScores(); // Liste anzeigen
  checkHighScore(score); // Prüfen ob wir in die Top 5 kommen


// Init
showStartScreen(); // Startbildschirm zeigen statt direkt resetGame
requestAnimationFrame(loop);
