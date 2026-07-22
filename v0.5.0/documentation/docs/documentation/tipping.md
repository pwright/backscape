# Why are components laid out across two axes?

<div id="tipping-component" class="tipping-component">
  <style>
    #tipping-component {
      --bg-a: #f4fbf8;
      --bg-b: #e7f0ff;
      --ink: #1f2430;
      --track: #eef3f8;
      --track-edge: #c8d6e5;
      --coin: #f5c34d;
      --coin-edge: #d39a2e;
      --cell: 64px;
      --gap: 10px;
      --radius: 18px;
      margin: 0 auto;
      padding: 26px 16px 30px;
      display: grid;
      place-items: center;
      max-width: 100%;
      border-radius: 18px;
      background:
        radial-gradient(1200px 500px at 10% -20%, #d3fff1 0%, transparent 65%),
        radial-gradient(1000px 600px at 100% 120%, #d7e4ff 0%, transparent 70%),
        linear-gradient(135deg, var(--bg-a), var(--bg-b));
      color: var(--ink);
      isolation: isolate;
    }

    #tipping-component * { box-sizing: border-box; }

    #tipping-component .panel,
    #tipping-component .game {
      width: min(92vw, 760px);
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.72);
      backdrop-filter: blur(6px);
      border: 1px solid rgba(255, 255, 255, 0.85);
      box-shadow: 0 16px 42px rgba(44, 70, 120, 0.18);
    }

    #tipping-component .panel {
      margin-bottom: 18px;
      padding: 18px 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
    }

    #tipping-component .panel-copy {
      display: grid;
      gap: 6px;
    }

    #tipping-component .panel-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: 0.3px;
      color: #111827;
    }

    #tipping-component .panel-subtitle {
      margin: 0;
      font-size: 0.98rem;
      font-weight: 600;
      line-height: 1.45;
      color: #1f2937;
    }

    #tipping-component .panel-coins {
      display: grid;
      gap: 10px;
      justify-items: center;
      position: relative;
    }

    #tipping-component .game {
      padding: 26px 22px 30px;
    }

    #tipping-component h2 {
      margin: 0 0 10px;
      font-weight: 800;
      letter-spacing: 0.4px;
    }

    #tipping-component .hud {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    #tipping-component .score {
      font-size: 1.1rem;
      font-weight: 700;
      text-align: left;
    }

    #tipping-component #phrase {
      display: block;
      max-width: 560px;
      min-height: 1.5em;
      color: #0f172a;
      font-weight: 600;
      line-height: 1.35;
    }

    #tipping-component .board-wrap {
      position: relative;
      display: inline-block;
      margin: 6px auto 0;
    }

    #tipping-component #slots {
      display: grid;
      grid-template-columns: repeat(8, var(--cell));
      gap: var(--gap);
      padding: 14px;
      background: var(--track);
      border: 2px solid var(--track-edge);
      border-radius: 22px;
    }

    #tipping-component .slot {
      width: var(--cell);
      height: var(--cell);
      border-radius: var(--radius);
      background: linear-gradient(180deg, #f7fbff, #dde9f5);
      border: 2px dashed #b9cad9;
    }

    #tipping-component #coinLayer {
      position: absolute;
      inset: 14px;
      pointer-events: none;
    }

    #tipping-component .coin {
      position: absolute;
      width: var(--cell);
      height: var(--cell);
      border-radius: 50%;
      border: 4px solid color-mix(in srgb, var(--coin-color, var(--coin-edge)) 68%, #111 32%);
      background: radial-gradient(
        circle at 28% 25%,
        color-mix(in srgb, var(--coin-color, var(--coin)) 40%, #fff 60%) 8%,
        var(--coin-color, var(--coin)) 45%,
        color-mix(in srgb, var(--coin-color, var(--coin)) 74%, #000 26%) 100%
      );
      box-shadow: 0 8px 14px color-mix(in srgb, var(--coin-color, var(--coin)) 40%, transparent 60%);
      display: grid;
      place-items: center;
      user-select: none;
    }

    #tipping-component .stack-coin {
      position: relative;
      width: 56px;
      height: 56px;
      transform: none;
    }

    #tipping-component .stack-coin::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 100%;
      width: 4px;
      height: 32px;
      transform: translateX(-50%);
      background: linear-gradient(180deg, #d1e3ff 0%, #a5c7ff 100%);
      border-radius: 999px;
      box-shadow: 0 6px 10px rgba(44, 70, 120, 0.18);
    }

    #tipping-component .stack-coin:last-child::after { display: none; }

    #tipping-component .badge {
      position: absolute;
      top: 6px;
      right: 6px;
      min-width: 22px;
      height: 22px;
      padding: 0 6px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      font-size: 0.72rem;
      font-weight: 900;
      letter-spacing: 0.3px;
      color: #172554;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.95);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
    }

    #tipping-component button {
      border: 0;
      border-radius: 999px;
      background: #1f6feb;
      color: #fff;
      font-size: 1rem;
      font-weight: 700;
      padding: 10px 18px;
      cursor: pointer;
      transition: transform 120ms ease, background 120ms ease;
    }

    #tipping-component button:hover:not(:disabled) {
      transform: translateY(-1px);
      background: #1758b8;
    }

    #tipping-component button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 720px) {
      #tipping-component {
        --cell: 42px;
        --gap: 7px;
        --radius: 12px;
        padding: 18px 14px 22px;
      }

      #tipping-component .game {
        padding: 18px 14px 22px;
        border-radius: 18px;
      }

      #tipping-component .panel {
        padding: 16px 16px;
        border-radius: 18px;
      }

      #tipping-component h2 {
        font-size: 1.2rem;
        margin-bottom: 8px;
      }

      #tipping-component .score { font-size: 1rem; }
    }
  </style>

  <div class="panel">
    <div class="panel-copy">
      <h2>Value Chain</h2>
      <p class="panel-subtitle">Everyone can understand a value chain showing dependencies, but don't forget components</p>
      <li> UI runs in Frontend
      <li> Middleware provides business logic
      <li> Database 

      <p>Note the letters match the first letter of item</p>

      <p>But also note that Middleware must be expanded</p>
    </div>
    <div class="panel-coins" id="panelCoins"></div>
  </div>

  <div class="game">
    <h2>Component Push</h2>
    <div class="hud">
      <div class="score"><span id="phrase">Do it.</span></div>
      <button id="dropBtn" type="button">New option/component/requirement</button>
    </div>

    <div class="board-wrap">
      <div id="slots"></div>
      <div id="coinLayer"></div>
    </div>
  </div>
</div>

<script>
(() => {
  const container = document.getElementById("tipping-component");
  if (!container) return;

  const slotsEl = container.querySelector("#slots");
  const coinLayerEl = container.querySelector("#coinLayer");
  const phraseEl = container.querySelector("#phrase");
  const dropBtn = container.querySelector("#dropBtn");
  const panelCoinsEl = container.querySelector("#panelCoins");
  if (!slotsEl || !coinLayerEl || !phraseEl || !dropBtn || !panelCoinsEl) return;

  const SIZE = 8;
  let board = Array(SIZE).fill(null);
  let currentPhrase = "Start thinking about all the things.";
  let animating = false;
  const LETTER_COLORS = {
    A: "#0284c7",
    B: "#3b82f6",
    C: "#06b6d4",
    D: "#a855f7",
    E: "#f59e0b",
    F: "#f97316",
    G: "#22c55e",
    H: "#84cc16",
    I: "#10b981",
    J: "#14b8a6",
    K: "#0ea5e9",
    L: "#60a5fa",
    M: "#8b5cf6",
    N: "#d946ef",
    O: "#e879f9",
    P: "#67e8f9",
    Q: "#4ade80",
    R: "#facc15",
    S: "#eab308",
    T: "#a3e635",
    U: "#22d3ee",
    V: "#38bdf8",
    W: "#818cf8",
    X: "#a78bfa",
    Y: "#f472b6",
    Z: "#fb7185"
  };
  const LETTER_FREQUENCY_GROUPS = {
    veryCommon: ["E", "T", "A", "O", "I"],
    common: ["N", "S", "H", "R", "D"],
    mid: ["L", "C", "U", "M", "W"],
    lessCommon: ["F", "G", "Y", "P", "B"],
    rare: ["V", "K", "J", "X", "Q", "Z"]
  };
  const LETTER_GROUP_WEIGHTS = {
    veryCommon: 10,
    common: 7,
    mid: 5,
    lessCommon: 3,
    rare: 1
  };
  const WEIGHTED_LETTER_POOL = Object.entries(LETTER_FREQUENCY_GROUPS).flatMap(
    ([group, letters]) => letters.flatMap(letter => Array(LETTER_GROUP_WEIGHTS[group]).fill(letter))
  );
  const LETTER_LEADS = {
    A: "Adaptive",
    B: "Balanced",
    C: "Connected",
    D: "Dynamic",
    E: "Efficient",
    F: "Flexible",
    G: "Guided",
    H: "Hardened",
    I: "Integrated",
    J: "Joined",
    K: "Kinetic",
    L: "Lean",
    M: "Modern",
    N: "Networked",
    O: "Optimized",
    P: "Proactive",
    Q: "Quality-first",
    R: "Reliable",
    S: "Scalable",
    T: "Trusted",
    U: "Unified",
    V: "Verified",
    W: "Workflow-ready",
    X: "X-optimized",
    Y: "Yield-focused",
    Z: "Zero-friction"
  };
  const VERBS = ["Enable", "Leverage", "Optimize", "Streamline", "Accelerate", "Enhance", "Orchestrate", "Deliver"];
  const ADJECTIVES = ["scalable", "secure", "resilient", "cloud-native", "integrated", "enterprise", "agile", "distributed"];
  const NOUNS = ["platform", "infrastructure", "architecture", "solution", "pipeline", "framework", "ecosystem", "capability"];
  const OUTCOMES = [
    "drive innovation",
    "improve efficiency",
    "reduce risk",
    "ensure compliance",
    "accelerate delivery",
    "support transformation",
    "maximize value"
  ];
  const CONTEXTS = [
    "at scale",
    "across the enterprise",
    "in cloud environments",
    "for mission-critical workloads",
    "across distributed teams"
  ];

  function setupSlots() {
    slotsEl.innerHTML = "";
    for (let i = 0; i < SIZE; i++) {
      const slot = document.createElement("div");
      slot.className = "slot";
      slotsEl.appendChild(slot);
    }
  }

  function getSpacing() {
    const styles = getComputedStyle(container);
    const cell = parseFloat(styles.getPropertyValue("--cell"));
    const gap = parseFloat(styles.getPropertyValue("--gap"));
    return { cell, gap, step: cell + gap };
  }

  function positionCoin(el, idx) {
    const { step } = getSpacing();
    el.style.transform = `translate(${idx * step}px, 0px)`;
  }

  function getRandomLetter() {
    return WEIGHTED_LETTER_POOL[Math.floor(Math.random() * WEIGHTED_LETTER_POOL.length)];
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function generatePhrase(startLetter) {
    const template = Math.floor(Math.random() * 4);
    const lead = LETTER_LEADS[startLetter] || startLetter;
    const verb = pick(VERBS);
    const adjective = pick(ADJECTIVES);
    const noun = pick(NOUNS);
    const outcome = pick(OUTCOMES);
    const context = pick(CONTEXTS);

    if (template === 0) return `${lead} ${verb.toLowerCase()} ${adjective} ${noun} to ${outcome}`;
    if (template === 1) return `${lead} ${verb.toLowerCase()} ${adjective} ${noun} to ${outcome} ${context}`;
    if (template === 2) return `${lead} ${noun} modernization with ${adjective} design`;
    return `${lead} ${noun} enabling ${outcome}`;
  }

  function createCoin(idx, letter, staticCoin = false) {
    const coin = document.createElement("div");
    coin.className = "coin";
    coin.style.setProperty("--coin-color", LETTER_COLORS[letter] || "#f5c34d");
    coin.dataset.letter = letter;

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = letter;
    coin.appendChild(badge);

    if (staticCoin) {
      coin.classList.add("stack-coin");
    } else {
      positionCoin(coin, idx);
    }
    return coin;
  }

  function renderPanelCoins() {
    panelCoinsEl.innerHTML = "";
    ["V", "C", "D"].forEach(letter => {
      const coin = createCoin(0, letter, true);
      panelCoinsEl.appendChild(coin);
    });
  }

  function renderBoard() {
    coinLayerEl.innerHTML = "";
    board.forEach((v, idx) => {
      if (!v) return;
      coinLayerEl.appendChild(createCoin(idx, v));
    });
    phraseEl.textContent = currentPhrase;
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function animateCoin(coin, keyframes, options) {
    const anim = coin.animate(keyframes, options);
    return anim.finished;
  }

  async function dropCoin() {
    if (animating) return;
    animating = true;
    dropBtn.disabled = true;

    const { step } = getSpacing();
    const oldBoard = [...board];
    const oldCoins = new Map();
    Array.from(coinLayerEl.children).forEach(coin => {
      const slotIndex = oldBoard.findIndex((v, i) => v && !oldCoins.has(i));
      oldCoins.set(slotIndex, coin);
    });

    const incomingLetter = getRandomLetter();
    currentPhrase = generatePhrase(incomingLetter);
    const boardWasEmptyAtFront = oldBoard[0] === null;

    if (boardWasEmptyAtFront) {
      const newCoin = createCoin(0, incomingLetter);
      newCoin.style.opacity = "0.95";
      coinLayerEl.appendChild(newCoin);

      await animateCoin(newCoin, [
        { transform: `translate(0px, -56px) scale(0.84)` },
        { transform: `translate(0px, 0px) scale(1.04)` },
        { transform: `translate(0px, 0px) scale(1)` }
      ], { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });

      board[0] = incomingLetter;
    } else {
      const movePromises = [];

      for (let i = SIZE - 1; i >= 0; i--) {
        if (!oldBoard[i]) continue;
        const coin = oldCoins.get(i);
        if (!coin) continue;

        if (i === SIZE - 1) {
          movePromises.push(
            animateCoin(coin, [
              { transform: `translate(${i * step}px, 0px) scale(1)`, opacity: 1 },
              { transform: `translate(${(i + 1) * step}px, 10px) scale(0.85)`, opacity: 0 }
            ], { duration: 340, easing: "ease-in", fill: "forwards" })
          );
        } else {
          movePromises.push(
            animateCoin(coin, [
              { transform: `translate(${i * step}px, 0px)` },
              { transform: `translate(${(i + 1) * step}px, 0px)` }
            ], { duration: 280, delay: (SIZE - 1 - i) * 22, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" })
          );
        }
      }

      const entering = createCoin(0, incomingLetter);
      entering.style.transform = `translate(${-0.9 * step}px, 0px)`;
      coinLayerEl.appendChild(entering);
      movePromises.push(
        animateCoin(entering, [
          { transform: `translate(${-0.9 * step}px, 0px) scale(0.92)` },
          { transform: `translate(0px, 0px) scale(1.02)` },
          { transform: `translate(0px, 0px) scale(1)` }
        ], { duration: 300, delay: 40, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" })
      );

      await Promise.all(movePromises);

      const nextBoard = Array(SIZE).fill(null);
      nextBoard[0] = incomingLetter;
      for (let i = 1; i < SIZE; i++) {
        nextBoard[i] = oldBoard[i - 1];
      }
      board = nextBoard;
    }

    await wait(30);
    renderBoard();
    dropBtn.disabled = false;
    animating = false;
  }

  dropBtn.addEventListener("click", dropCoin);
  window.addEventListener("resize", renderBoard);

  setupSlots();
  renderBoard();
  renderPanelCoins();
})();
</script>


What if we joined the two concepts together with a pinch of wardley?


```blockscape
{
  "id": "wardley-minimap",
  "title": "Wardley-Inspired Knowledge Schema",
  "abstract": "A useful Wardley-inspired map for quick conversations is: <br><br>Y-axis = user visibility/value (top = directly user-facing, bottom = back-end/enabling), <br><br>X-axis = evolution/maturity (left = novel/custom, right = commodity/standard). <br><br>This helps teams decide where to build enabling capabilities (bottom-left).",
  "categories": [
    {
      "id": "user-facing",
      "title": "User",
      "items": [
        {
          "id": "idea",
          "name": "Idea",
          "deps": [
            "experiments-learning"
          ]
        },
        {
          "id": "differentiation",
          "name": "Proof of concept",
          "deps": [
            "experiments-learning",
            "custom-build"
          ]
        },
        {
          "id": "productized",
          "name": "Product",
          "deps": [
            "standard-components",
            "managed-service"
          ]
        },
        {
          "id": "service",
          "name": "Service",
          "deps": [
            "productized"
          ]
        }
      ]
    },
    {
      "id": "shared-foundations",
      "title": "Shared Foundations",
      "items": [
        {
          "id": "experiments-learning",
          "name": "Experiments & Learning",
          "deps": []
        },
        {
          "id": "custom-build",
          "name": "Custom Build",
          "deps": []
        },
        {
          "id": "standard-components",
          "name": "Standard Components",
          "deps": []
        }
      ]
    }
  ]
}
```

Clicking around might help. 
If not, try **Next** in top menu.

