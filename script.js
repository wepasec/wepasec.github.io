const hero = document.getElementById('hero');
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const bgTextDiv = document.getElementById('bg-text');

function resize() {
  const heroWidth = hero.clientWidth;
  const heroHeight = hero.clientHeight;

  canvas.width = heroWidth;
  canvas.height = heroHeight;

  const bgString = "A SINGLE VOICE RAISES THE CLAMOR OF BEING ";

  // Use the actual computed line-height so vertical tiling matches
  const styles = window.getComputedStyle(bgTextDiv);
  const lineHeight = parseFloat(styles.lineHeight);

  // Fallback in case line-height is "normal" or unparsable
  const effectiveLineHeight = Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 24;

  // Match canvas font to background text to accurately measure width
  const fontSize = styles.fontSize || '24px';
  const fontFamily = styles.fontFamily || 'monospace';
  ctx.font = fontSize + ' ' + fontFamily;

  // Measure actual width of one bgString and compute columns so we fully cover the hero
  const singleWidth = ctx.measureText(bgString).width;

  // Extra margin so the wrap point is well off-screen to the right
  const rightMargin = heroWidth * 1.5; // 150% of hero width

  const cols = singleWidth > 0
    ? Math.ceil((heroWidth + rightMargin) / singleWidth)
    : 1;
  const rows = Math.ceil(heroHeight / effectiveLineHeight);

  let textContent = '';
  for (let i = 0; i < rows; i++) {
    textContent += bgString.repeat(cols);
  }
  bgTextDiv.textContent = textContent;
}

window.addEventListener('resize', resize);
resize();

const logone = [
  "                     /$$ /$$                                        ",
  "                    | $$| $$                                        ",
  "  /$$$$$$$  /$$$$$$ | $$| $$  /$$$$$$   /$$$$$$   /$$$$$$$  /$$$$$$ ",
  " /$$_____/ /$$__  $$| $$| $$ |____  $$ /$$__  $$ /$$_____/ /$$__  $$",
  "| $$      | $$  \\ $$| $$| $$  /$$$$$$$| $$  \\ $$|  $$$$$$ | $$$$$$$$",
  "| $$      | $$  | $$| $$| $$ /$$__  $$| $$  | $$ \\____  $$| $$_____/",
  "|  $$$$$$$|  $$$$$$/| $$| $$|  $$$$$$$| $$$$$$$/ /$$$$$$$/|  $$$$$$$",
  " \\_______/ \\______/ |__/|__/ \\_______/| $$____/ |_______/  \\_______/",
  "                                      | $$                          ",
  "                                      | $$                          ",
  "                                      |__/                          "
];

const logonw = [
  "                    $$\\ $$\\                                         ",
  "                    $$ |$$ |                                        ",
  " $$$$$$$\\  $$$$$$\\  $$ |$$ | $$$$$$\\   $$$$$$\\   $$$$$$$\\  $$$$$$\\  ",
  "$$  _____|$$  __$$\\ $$ |$$ | \\____$$\\ $$  __$$\\ $$  _____|$$  __$$\\ ",
  "$$ /      $$ /  $$ |$$ |$$ | $$$$$$$ |$$ /  $$ |\\$$$$$$\\  $$$$$$$$ |",
  "$$ |      $$ |  $$ |$$ |$$ |$$  __$$ |$$ |  $$ | \\____$$\\ $$   ____|",
  "\\$$$$$$$\\ \\$$$$$$  |$$ |$$ |\\$$$$$$$ |$$$$$$$  |$$$$$$$  |\\$$$$$$$\\ ",
  " \\_______| \\______/ \\__|\\__| \\_______|$$  ____/ \\_______/  \\_______|",
  "                                      $$ |                          ",
  "                                      $$ |                          ",
  "                                      \\__|                          ",
];

const logose = [
  "                     __  __                                         ",
  "                    |  \\|  \\                                        ",
  "  _______   ______  | $$| $$  ______    ______    _______   ______  ",
  " /       \\ /      \\ | $$| $$ |      \\  /      \\  /       \\ /      \\ ",
  "|  $$$$$$$|  $$$$$$\\| $$| $$  \\$$$$$$\\|  $$$$$$\\|  $$$$$$$|  $$$$$$\\",
  "| $$      | $$  | $$| $$| $$ /      $$| $$  | $$ \\$$    \\ | $$    $$",
  "| $$_____ | $$__/ $$| $$| $$|  $$$$$$$| $$__/ $$ _\\$$$$$$\\| $$$$$$$$",
  " \\$$     \\ \\$$    $$| $$| $$ \\$$    $$| $$    $$|       $$ \\$$     \\",
  "  \\$$$$$$$  \\$$$$$$  \\$$ \\$$  \\$$$$$$$| $$$$$$$  \\$$$$$$$   \\$$$$$$$",
  "                                      | $$                          ",
  "                                      | $$                          ",
  "                                       \\$$                          ",
];

const logosw = [
  "                     __  __                                         ",
  "                    /  |/  |                                        ",
  "  _______   ______  $$ |$$ |  ______    ______    _______   ______  ",
  " /       | /      \\ $$ |$$ | /      \\  /      \\  /       | /      \\ ",
  "/$$$$$$$/ /$$$$$$  |$$ |$$ | $$$$$$  |/$$$$$$  |/$$$$$$$/ /$$$$$$  |",
  "$$ |      $$ |  $$ |$$ |$$ | /    $$ |$$ |  $$ |$$      \\ $$    $$ |",
  "$$ \\_____ $$ \\__$$ |$$ |$$ |/$$$$$$$ |$$ |__$$ | $$$$$$  |$$$$$$$$/ ",
  "$$       |$$    $$/ $$ |$$ |$$    $$ |$$    $$/ /     $$/ $$       |",
  " $$$$$$$/  $$$$$$/  $$/ $$/  $$$$$$$/ $$$$$$$/  $$$$$$$/   $$$$$$$/ ",
  "                                      $$ |                          ",
  "                                      $$ |                          ",
  "                                      $$/                           ",
];

const logo = {
  lines: logone,
  lineHeight: 12,
  x: 50,
  y: 100,
  vx: 2,
  vy: 2,
  color: '#ffffff',
  width: 0,
  height: 48
};

function randomColor(currentColor) {
  const colors = [
    "#ffffff", "#ffff00",
    "#ff0000", "#00ff00", "#00ffff", "#ff00ff"
  ];

  let next = currentColor;
  while (next === currentColor) {
    next = colors[Math.floor(Math.random() * colors.length)];
  }
  return next;
}

function drawLogo() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = logo.color;

  // Logo sizing (smaller text on smaller screens)
  if (canvas.width < 480) {
    logo.lineHeight = 8;
  } else if (canvas.width < 768) {
    logo.lineHeight = 10;
  } else {
    logo.lineHeight = 12;
  }

  ctx.font = logo.lineHeight + 'px Courier';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  logo.width = 0;
  logo.height = logo.lines.length * logo.lineHeight;

  logo.lines.forEach((line, i) => {
    const metrics = ctx.measureText(line);
    logo.width = Math.max(logo.width, metrics.width);
    ctx.fillText(line, logo.x, logo.y + i * logo.lineHeight);
  });
}

function updateLogoDirection() {
  if (logo.vx > 0 && logo.vy > 0) {
    logo.lines = logose;
  } else if (logo.vx > 0 && logo.vy <= 0) {
    logo.lines = logone;
  } else if (logo.vx <= 0 && logo.vy <= 0) {
    logo.lines = logonw;
  } else {
    logo.lines = logosw;
  }
}

function update() {
  // Randomize color, update position
  logo.color = '#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');  
  logo.x += logo.vx;
  logo.y += logo.vy;

  // Bounce off edges
  if (logo.x <= 0 || logo.x + logo.width >= canvas.width) {
    logo.vx *= -1;
  }
  if (logo.y <= 0 || logo.y + logo.height >= canvas.height) {
    logo.vy *= -1;
  }

  // Update logo direction (change ASCII art)
  updateLogoDirection();

  drawLogo();
  requestAnimationFrame(update);
}

update();

// Set footer year dynamically
const yearSpan = document.getElementById('year');
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

