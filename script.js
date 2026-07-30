const heartBtn = document.getElementById('heart-btn');
const lockScreen = document.getElementById('lock-screen');
const letterScreen = document.getElementById('letter-screen');
const finalScreen = document.getElementById('final-screen');
const letterText = document.getElementById('letter-text');
const questionSection = document.getElementById('question-section');
const btnSi = document.getElementById('btn-si');
const btnNo = document.getElementById('btn-no');
const buttonsArea = document.getElementById('buttons-area');
const finalPhoto = document.getElementById('final-photo');
const finalMessage = document.getElementById('final-message');
const friendDay = document.getElementById('friend-day');
const imagePlaceholder = document.getElementById('image-placeholder');
const confettiLayer = document.getElementById('confetti-layer');
const clippySound = document.getElementById('clippy-sound');

const message = 'En este mapa de la vida, no podría haber pedido a una mejor compañera de equipo. Tener tu amistad es un regalo enorme; eres una amiga sencillamente increíble que hace que cada momento sea mil veces más bonito y divertido. Gracias por estar siempre ahí, por sacarme sonrisas incluso en los días difíciles y por tu apoyo incondicional. No te imaginas cuánto valoro tenerte en mi vida... ¡Te quiero con todo mi corazón!';
const finalLoveMessage = 'Te quiero como π y como tangente de 90°';

let letterStarted = false;
let attemptsNo = 0;
let audioContext = null;
let clippyLooping = false;
let clippySourceNode = null;
let clippyFilter = null;
let clippyGainNode = null;
let optionB = true;
let noClicks = 0;
let gridPositions = null;
let gridIndex = 0;
let autoMoving = false;
// Circular motion state
let circleAnimating = false;
let circleAngle = 0; // radians
let circleAngularVelocity = 0; // radians per second
let circleRAF = null;
let circleCenter = { x: 0, y: 0 };
let circleRadius = 0;
let lastTimestamp = null;
// Square motion state
let squareAnimating = false;
let squareT = 0; // 0..1 param along square perimeter
let squareSpeed = 0; // cycles per second
let squareRAF = null;
let squareCenter = { x: 0, y: 0 };
let squareHalf = 0;

function playPopSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1320, audioContext.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.12);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.14);
  } catch {
    // Si el audio no está disponible, la experiencia sigue funcionando.
  }
}

function playErrorSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillatorA = audioContext.createOscillator();
    const oscillatorB = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillatorA.type = 'sawtooth';
    oscillatorB.type = 'square';
    oscillatorA.frequency.setValueAtTime(260, audioContext.currentTime);
    oscillatorA.frequency.exponentialRampToValueAtTime(160, audioContext.currentTime + 0.18);
    oscillatorB.frequency.setValueAtTime(140, audioContext.currentTime);
    oscillatorB.frequency.exponentialRampToValueAtTime(90, audioContext.currentTime + 0.18);

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.14, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);

    oscillatorA.connect(gainNode);
    oscillatorB.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillatorA.start();
    oscillatorB.start();
    oscillatorA.stop(audioContext.currentTime + 0.24);
    oscillatorB.stop(audioContext.currentTime + 0.24);
  } catch {
    // Si el audio no está disponible, la experiencia sigue funcionando.
  }
}

function startClippySound() {
  if (!clippySound) {
    return;
  }
  // Prepare Web Audio processing (high-pass + gain) to remove the gloomy low end
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass && !audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext && !clippySourceNode) {
      try {
        clippySourceNode = audioContext.createMediaElementSource(clippySound);
        clippyFilter = audioContext.createBiquadFilter();
        clippyFilter.type = 'highpass';
        clippyFilter.frequency.value = 700; // elimina graves que dan sensación tétrica
        clippyGainNode = audioContext.createGain();
        clippyGainNode.gain.value = 0.55; // un poco más bajo

        clippySourceNode.connect(clippyFilter);
        clippyFilter.connect(clippyGainNode);
        clippyGainNode.connect(audioContext.destination);
      } catch (err) {
        // si falla la creación del nodo, seguimos sin procesamiento
        clippySourceNode = null;
      }
    }

    clippySound.loop = true;
    clippySound.playbackRate = 1.18; // un poco más rápido para quitar esa atmósfera lenta
    clippySound.currentTime = 0;
    const playPromise = clippySound.play();
    clippyLooping = true;

    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        clippyLooping = false;
        playPopSound();
      });
    }
  } catch (err) {
    clippySound.loop = true;
    clippySound.currentTime = 0;
    clippySound.play();
    clippyLooping = true;
  }
}

function stopClippySound() {
  if (!clippySound || !clippyLooping) {
    return;
  }
  // fade out gently if we have a gain node
  if (clippyGainNode && audioContext) {
    try {
      const now = audioContext.currentTime;
      clippyGainNode.gain.cancelScheduledValues(now);
      clippyGainNode.gain.setValueAtTime(clippyGainNode.gain.value, now);
      clippyGainNode.gain.linearRampToValueAtTime(0.0001, now + 0.12);
      setTimeout(() => {
        clippySound.pause();
        clippySound.currentTime = 0;
        clippyLooping = false;
      }, 160);
      return;
    } catch (e) {
      // fall through to hard stop
    }
  }

  clippySound.pause();
  clippySound.currentTime = 0;
  clippyLooping = false;
}

function typeLetter(text, onComplete) {
  letterText.textContent = '';
  let index = 0;
  let typedSinceSound = 0;
  startClippySound();

  const timer = window.setInterval(() => {
    letterText.textContent += text[index];
    index += 1;
    typedSinceSound += 1;

    if (typedSinceSound >= 6) {
      typedSinceSound = 0;
      if (clippySound && clippyLooping && !clippySound.paused) {
        clippySound.currentTime = 0;
      }
    }

    if (index >= text.length) {
      window.clearInterval(timer);
      stopClippySound();
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }
  }, 38);
}

function getNoButtonGridPositions() {
  if (!buttonsArea) {
    return [];
  }

  const areaRect = buttonsArea.getBoundingClientRect();
  const stepX = areaRect.width / 3;
  const stepY = areaRect.height / 3;
  const positions = [];

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (row === 1 && col === 1) continue;
      positions.push({
        x: col * stepX + stepX / 2,
        y: row * stepY + stepY / 2,
      });
    }
  }

  return positions;
}

function revealQuestion() {
  questionSection.classList.remove('is-hidden');
  // prepare option B behaviour: center yes and make no movable
  if (optionB) {
    btnSi.classList.add('yes-centered');
    btnNo.classList.add('no-moving');
    gridPositions = getNoButtonGridPositions();
    gridIndex = 0;

    const start = gridPositions[gridIndex];
    btnNo.style.left = `${start.x}px`;
    btnNo.style.top = `${start.y}px`;
    btnNo.style.right = 'auto';
    btnNo.style.minWidth = '';
    btnNo.style.transform = 'translate(-50%, -50%) scale(1)';
  }
}

function openLetter() {
  if (letterStarted) {
    return;
  }

  letterStarted = true;
  playPopSound();
  lockScreen.classList.add('is-hidden');
  letterScreen.classList.remove('is-hidden');

  window.setTimeout(() => {
    typeLetter(message, () => {
      window.setTimeout(revealQuestion, 250);
    });
  }, 180);
}

function updateYesButton() {
  const scale = 1 + Math.min(attemptsNo, 4) * 0.2;
  const translateX = Math.min(attemptsNo, 4) * 24;
  const translateY = -Math.min(attemptsNo, 4) * 7;

  if (attemptsNo < 4) {
    btnSi.classList.remove('is-dominant');
    btnSi.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    btnSi.style.width = '';
    btnSi.style.height = '';
    btnSi.style.inset = '';
    btnSi.style.zIndex = '';
    btnNo.style.transform = `translate(${-translateX * 0.75}px, ${translateY * -0.4}px)`;
    btnNo.style.opacity = '1';
    btnNo.style.pointerEvents = 'auto';
    return;
  }

  btnSi.classList.add('is-dominant');
  btnSi.style.transform = 'none';
  btnNo.style.opacity = '0';
  btnNo.style.pointerEvents = 'none';
}

function createConfetti() {
  const palette = ['confetti-piece', 'confetti-piece alt', 'confetti-piece gold'];
  const pieceCount = 36;

  confettiLayer.innerHTML = '';

  for (let index = 0; index < pieceCount; index += 1) {
    const piece = document.createElement('span');
    piece.className = palette[index % palette.length];
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDuration = `${2.8 + Math.random() * 2.4}s`;
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    piece.style.opacity = String(0.7 + Math.random() * 0.3);
    piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 260}px`);
    confettiLayer.appendChild(piece);
  }
}

function showFinalScreen() {
  letterScreen.classList.add('is-hidden');
  finalScreen.classList.remove('is-hidden');
  finalMessage.textContent = finalLoveMessage;
  if (friendDay) friendDay.classList.remove('is-hidden');
  finalPhoto.onload = () => {
    finalPhoto.style.opacity = '1';
    imagePlaceholder.classList.add('is-hidden');
  };
  finalPhoto.onerror = () => {
    finalPhoto.style.display = 'none';
    imagePlaceholder.classList.remove('is-hidden');
  };
  finalPhoto.src = finalPhoto.dataset.src;
  createConfetti();
}

function resetToStart() {
  // stop any animations
  if (circleRAF) cancelAnimationFrame(circleRAF);
  if (squareRAF) cancelAnimationFrame(squareRAF);
  circleRAF = null;
  squareRAF = null;
  circleAnimating = false;
  squareAnimating = false;

  // reset state variables
  letterStarted = false;
  attemptsNo = 0;
  noClicks = 0;
  gridPositions = null;
  gridIndex = 0;

  // reset UI
  finalScreen.classList.add('is-hidden');
  lockScreen.classList.remove('is-hidden');
  letterScreen.classList.add('is-hidden');
  questionSection.classList.add('is-hidden');
  friendDay.classList.add('is-hidden');

  // reset buttons
  btnSi.classList.remove('is-dominant', 'yes-centered');
  btnSi.style.transform = '';
  btnSi.style.width = '';
  btnSi.style.height = '';
  btnSi.style.zIndex = '';

  btnNo.style.opacity = '1';
  btnNo.style.pointerEvents = 'auto';
  btnNo.style.left = '';
  btnNo.style.top = '';
  btnNo.style.right = '';
  btnNo.style.transform = '';

  // reset letter
  letterText.textContent = '';

  // stop any sounds
  stopClippySound();

  // reset final photo placeholder
  finalPhoto.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  finalPhoto.style.opacity = '0';
  imagePlaceholder.classList.remove('is-hidden');

  // ensure initial focus
  heartBtn.focus();
}

heartBtn.addEventListener('click', openLetter);
btnNo.addEventListener('click', () => {
  if (optionB) {
    handleNoOptionB();
    return;
  }
  attemptsNo += 1;
  playErrorSound();
  updateYesButton();
});
btnSi.addEventListener('click', showFinalScreen);

// Reset button listener
const btnReset = document.getElementById('btn-reset');
if (btnReset) btnReset.addEventListener('click', resetToStart);

updateYesButton();

// --- Option B: No moves in circles, shrinks and speeds, after 5 clicks Sí gana ---
function handleNoOptionB() {
  if (!buttonsArea) return;

  noClicks += 1;
  playErrorSound();

  if (!gridPositions || gridPositions.length === 0) {
    gridPositions = getNoButtonGridPositions();
    gridIndex = 0;
  }

  gridIndex = (gridIndex + 1) % gridPositions.length;
  const target = gridPositions[gridIndex];
  const scale = Math.max(0.18, 1 - noClicks * 0.12);
  const btnW = btnNo.offsetWidth || 160;
  const btnH = btnNo.offsetHeight || 48;
  const paddingX = btnW / 2 + 10;
  const paddingY = btnH / 2 + 10;
  const clampedX = Math.max(paddingX, Math.min(buttonsArea.clientWidth - paddingX, target.x));
  const clampedY = Math.max(paddingY, Math.min(buttonsArea.clientHeight - paddingY, target.y));

  btnNo.style.right = 'auto';
  btnNo.style.minWidth = '';
  btnNo.style.left = `${clampedX}px`;
  btnNo.style.top = `${clampedY}px`;
  btnNo.style.transform = `translate(-50%, -50%) scale(${scale})`;

  btnSi.classList.add('yes-centered');

  if (noClicks >= 5) {
    btnSi.classList.add('is-dominant');
    btnNo.style.opacity = '0';
    btnNo.style.pointerEvents = 'none';
    setTimeout(() => showFinalScreen(), 260);
  }
}

// legacy autoMove kept for compatibility but not used in click flow
function startAutoMove() {
  if (autoMoving) return;
  autoMoving = true;
  // fallback: trigger handleNoOptionB repeatedly (not used by default)
  const interval = setInterval(() => {
    if (noClicks >= 5) {
      clearInterval(interval);
      autoMoving = false;
      return;
    }
    handleNoOptionB();
  }, 650);
}