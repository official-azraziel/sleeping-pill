
const nameScreen = document.getElementById("nameScreen");
const loadingScreen = document.getElementById("loadingScreen");
const questionScreen = document.getElementById("questionScreen");
const finalScreen = document.getElementById("finalScreen");

const nameForm = document.getElementById("nameForm");
const nameInput = document.getElementById("nameInput");
const greeting = document.getElementById("greeting");
const finalMessage = document.getElementById("finalMessage");

const progressBar = document.getElementById("progressBar");
const progressTrack = document.getElementById("progressTrack");
const percentage = document.getElementById("percentage");
const loadingMessage = document.getElementById("loadingMessage");

const yesButton = document.getElementById("yesButton");
const restartButton = document.getElementById("restartButton");

const noButtonLayer = document.getElementById("noButtonLayer");
const noButton = document.getElementById("noButton");

let girlfriendName = "";
let loadingFrame = null;
let loadingStartTime = 0;
let lastMoveTime = 0;
let currentX = 0;
let currentY = 0;

const LOADING_DURATION = 10000;
const DODGE_DISTANCE = 55;
const MOVE_COOLDOWN = 100;
const EDGE_PADDING = 12;

// Switch between screens.
function showScreen(target) {
  [nameScreen, loadingScreen, questionScreen, finalScreen].forEach(
    (screen) => {
      screen.classList.toggle("active", screen === target);
    }
  );

  const showNoButton = target === questionScreen;

  noButtonLayer.classList.toggle("active", showNoButton);
  noButtonLayer.setAttribute("aria-hidden", String(!showNoButton));

  if (showNoButton) {
    // Wait for the question screen to become visible before measuring it.
    requestAnimationFrame(placeNoButtonNearYes);
  }
}

// Keep a position inside the current visible viewport.
function clamp(value, min, max) {
  if (max < min) return min;
  return Math.max(min, Math.min(value, max));
}

function getButtonSize() {
  return {
    width: noButton.offsetWidth,
    height: noButton.offsetHeight
  };
}

function setNoButtonPosition(x, y) {
  const { width, height } = getButtonSize();

  const maxX = window.innerWidth - width - EDGE_PADDING;
  const maxY = window.innerHeight - height - EDGE_PADDING;

  currentX = clamp(x, EDGE_PADDING, maxX);
  currentY = clamp(y, EDGE_PADDING, maxY);

  noButton.style.left = `${currentX}px`;
  noButton.style.top = `${currentY}px`;
}

// Put the No button close to Yes when the question first appears.
function placeNoButtonNearYes() {
  if (!noButtonLayer.classList.contains("active")) return;

  const yesRect = yesButton.getBoundingClientRect();
  const { width, height } = getButtonSize();

  let x = yesRect.right + 10;
  let y = yesRect.top + (yesRect.height - height) / 2;

  // If the button will not fit beside Yes, put it just below Yes.
  if (x + width > window.innerWidth - EDGE_PADDING) {
    x = yesRect.left + (yesRect.width - width) / 2;
    y = yesRect.bottom + 12;
  }

  setNoButtonPosition(x, y);
}

// Choose a new position far away from the cursor while staying visible.
function dodgeCursor(pointerX, pointerY, force = false) {
  if (!noButtonLayer.classList.contains("active")) return;

  const now = performance.now();

  if (!force && now - lastMoveTime < MOVE_COOLDOWN) return;

  const { width, height } = getButtonSize();
  const centerX = currentX + width / 2;
  const centerY = currentY + height / 2;

  const distanceToCursor = Math.hypot(
    pointerX - centerX,
    pointerY - centerY
  );

  // Only dodge when the cursor gets close.
  if (!force && distanceToCursor > DODGE_DISTANCE) return;

  lastMoveTime = now;

  const maxX = Math.max(
    EDGE_PADDING,
    window.innerWidth - width - EDGE_PADDING
  );

  const maxY = Math.max(
    EDGE_PADDING,
    window.innerHeight - height - EDGE_PADDING
  );

  let bestPosition = null;
  let bestScore = -Infinity;

  // Test several safe destinations and choose the best one.
  for (let i = 0; i < 22; i++) {
    const candidateX = EDGE_PADDING +
      Math.random() * Math.max(0, maxX - EDGE_PADDING);

    const candidateY = EDGE_PADDING +
      Math.random() * Math.max(0, maxY - EDGE_PADDING);

    const candidateCenterX = candidateX + width / 2;
    const candidateCenterY = candidateY + height / 2;

    const cursorDistance = Math.hypot(
      pointerX - candidateCenterX,
      pointerY - candidateCenterY
    );

    const movementDistance = Math.hypot(
      candidateX - currentX,
      candidateY - currentY
    );

    // Prefer positions far from the cursor and not too close to the old spot.
    const score = cursorDistance + movementDistance * 0.35;

    if (
      movementDistance > 45 &&
      cursorDistance > 95 &&
      score > bestScore
    ) {
      bestScore = score;
      bestPosition = { x: candidateX, y: candidateY };
    }
  }

  // Fallback for small screens or unusually constrained layouts.
  if (!bestPosition) {
    const directions = [
      { x: currentX + 120, y: currentY },
      { x: currentX - 120, y: currentY },
      { x: currentX, y: currentY + 100 },
      { x: currentX, y: currentY - 100 },
      { x: maxX, y: maxY },
      { x: EDGE_PADDING, y: EDGE_PADDING }
    ];

    bestPosition = directions
      .map((position) => ({
        x: clamp(position.x, EDGE_PADDING, maxX),
        y: clamp(position.y, EDGE_PADDING, maxY)
      }))
      .filter(
        (position) =>
          Math.hypot(
            position.x - currentX,
            position.y - currentY
          ) > 25
      )
      .sort((a, b) => {
        const distanceA = Math.hypot(
          pointerX - (a.x + width / 2),
          pointerY - (a.y + height / 2)
        );

        const distanceB = Math.hypot(
          pointerX - (b.x + width / 2),
          pointerY - (b.y + height / 2)
        );

        return distanceB - distanceA;
      })[0];
  }

  if (bestPosition) {
    setNoButtonPosition(bestPosition.x, bestPosition.y);
  }
}

// Detect the cursor anywhere in the window, not just over the button.
document.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;

  dodgeCursor(event.clientX, event.clientY);
});

// If the cursor enters the button, move it immediately.
noButton.addEventListener("pointerenter", (event) => {
  if (event.pointerType === "touch") return;

  dodgeCursor(event.clientX, event.clientY, true);
});

// Clicking or tapping No also makes it dodge.
noButton.addEventListener("click", (event) => {
  event.preventDefault();

  dodgeCursor(
    event.clientX || currentX,
    event.clientY || currentY,
    true
  );
});

// Reposition it if the browser window changes size.
window.addEventListener("resize", () => {
  if (noButtonLayer.classList.contains("active")) {
    setNoButtonPosition(currentX, currentY);
  }
});

// Name form and loading animation.
nameForm.addEventListener("submit", (event) => {
  event.preventDefault();

  girlfriendName = nameInput.value.trim();

  if (!girlfriendName) {
    nameInput.focus();
    return;
  }

  // Cancel any previous loading animation.
  if (loadingFrame !== null) {
    cancelAnimationFrame(loadingFrame);
  }

  greeting.textContent = `Hey, ${girlfriendName}! 💕`;

  progressBar.style.width = "0%";
  progressTrack.setAttribute("aria-valuenow", "0");
  percentage.textContent = "0%";
  loadingMessage.textContent =
    "Sprinkling some extra love... 🌷";

  showScreen(loadingScreen);

  loadingStartTime = performance.now();

  function updateProgress(now) {
    const elapsed = now - loadingStartTime;
    const progress = Math.min(100, (elapsed / LOADING_DURATION) * 100);
    const roundedProgress = Math.floor(progress);

    progressBar.style.width = `${progress}%`;
    progressTrack.setAttribute("aria-valuenow", String(roundedProgress));
    percentage.textContent = `${roundedProgress}%`;

    if (progress < 100) {
      loadingFrame = requestAnimationFrame(updateProgress);
    } else {
      loadingFrame = null;
      loadingMessage.textContent = "Your little surprise is ready! 💗";

      setTimeout(() => {
        showScreen(questionScreen);
      }, 350);
    }
  }

  loadingFrame = requestAnimationFrame(updateProgress);
});

// Yes: show the personalized message.
yesButton.addEventListener("click", () => {
  if (loadingFrame !== null) {
    cancelAnimationFrame(loadingFrame);
    loadingFrame = null;
  }

  finalMessage.textContent =
    `Azraziel has considered ${girlfriendName} is the best person in the world! 💖`;

  showScreen(finalScreen);
});

// Restart the experience.
restartButton.addEventListener("click", () => {
  nameInput.value = "";
  girlfriendName = "";
  showScreen(nameScreen);
  nameInput.focus();
});
