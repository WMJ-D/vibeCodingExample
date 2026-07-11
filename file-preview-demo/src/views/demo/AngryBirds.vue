<template>
  <div class="birds-page">
    <div class="sky-glow"></div>
    <header class="game-header">
      <div class="brand">
        <span class="brand-kicker">FEATHER FURY</span>
        <h1>怒鸟攻城</h1>
      </div>
      <div class="stats">
        <div class="stat"><span>关卡</span><strong>{{ levelIndex + 1 }}/{{ levels.length }}</strong></div>
        <div class="stat score"><span>得分</span><strong>{{ score.toLocaleString() }}</strong></div>
        <div class="stat"><span>最佳</span><strong>{{ bestScore.toLocaleString() }}</strong></div>
      </div>
      <div class="header-actions">
        <button class="icon-button" :aria-label="muted ? '开启音效' : '关闭音效'" @click="muted = !muted">
          {{ muted ? '🔇' : '🔊' }}
        </button>
        <button class="icon-button" aria-label="重新开始" @click="restartLevel">↻</button>
      </div>
    </header>

    <main class="game-shell">
      <section class="canvas-wrap">
        <canvas
          ref="canvasRef"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        ></canvas>

        <div class="bird-deck">
          <span class="deck-label">待命</span>
          <div v-for="(bird, index) in remainingBirds" :key="`${bird.type}-${index}`" class="deck-bird" :class="bird.type">
            <span>{{ birdIcons[bird.type] }}</span>
          </div>
        </div>

        <div class="power-card" :class="currentBird?.type || 'red'">
          <span class="power-icon">{{ currentBird ? birdIcons[currentBird.type] : '✓' }}</span>
          <div>
            <small>{{ currentBird ? birdNames[currentBird.type] : '本轮结束' }}</small>
            <strong>{{ currentBird ? birdPowers[currentBird.type] : '等待结算' }}</strong>
          </div>
        </div>

        <div v-if="message" class="toast">{{ message }}</div>

        <div v-if="gameState === 'paused'" class="game-overlay">
          <div class="result-card compact">
            <span class="eyebrow">TAKE A BREATH</span>
            <h2>战术暂停</h2>
            <button class="primary-button" @click="resumeGame">继续战斗</button>
          </div>
        </div>

        <div v-if="gameState === 'won' || gameState === 'lost'" class="game-overlay">
          <div class="result-card" :class="gameState">
            <span class="eyebrow">{{ gameState === 'won' ? 'FORTRESS DOWN' : 'BIRDS OUT' }}</span>
            <h2>{{ gameState === 'won' ? '漂亮，拿下！' : '差一点，再来。' }}</h2>
            <div class="result-score">{{ score.toLocaleString() }}</div>
            <div v-if="gameState === 'won'" class="stars">
              <span v-for="star in 3" :key="star" :class="{ active: star <= earnedStars }">★</span>
            </div>
            <p>{{ gameState === 'won' ? `剩余 ${remainingBirds.length} 只小鸟，奖励已计入。` : '调整角度，优先打击建筑支点。' }}</p>
            <div class="result-actions">
              <button class="secondary-button" @click="restartLevel">重玩本关</button>
              <button v-if="gameState === 'won'" class="primary-button" @click="nextLevel">
                {{ levelIndex === levels.length - 1 ? '回到第一关' : '下一关' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer class="control-strip">
        <div class="hint"><kbd>拖拽</kbd><span>拉动弹弓瞄准</span></div>
        <div class="hint"><kbd>点击</kbd><span>飞行中触发技能</span></div>
        <div class="hint"><kbd>R</kbd><span>重新开始</span></div>
        <div class="hint"><kbd>ESC</kbd><span>暂停游戏</span></div>
        <button class="pause-button" @click="togglePause">{{ gameState === 'paused' ? '继续' : '暂停' }}</button>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

const canvasRef = ref(null)
const score = ref(0)
const bestScore = ref(Number(localStorage.getItem('angry_birds_best') || 0))
const levelIndex = ref(0)
const gameState = ref('ready')
const muted = ref(false)
const message = ref('拖住小鸟向后拉，松手发射')
const birdQueue = ref([])
const currentBird = ref(null)

const birdIcons = { red: '●', yellow: '▲', blue: '◆' }
const birdNames = { red: '赤焰队长', yellow: '闪电尖兵', blue: '冰晶三杰' }
const birdPowers = { red: '冲击波', yellow: '极速突进', blue: '空中分裂' }
const remainingBirds = computed(() => birdQueue.value.slice(currentBird.value ? 1 : 0))
const earnedStars = computed(() => score.value >= 15000 ? 3 : score.value >= 9000 ? 2 : 1)

const levels = [
  {
    // 第一关：两座独立小屋，猪在屋内地面上
    birds: ['red', 'yellow', 'blue', 'red'],
    pigs: [{ x: 790, y: 541 }, { x: 900, y: 541 }, { x: 1010, y: 541 }],
    blocks: [
      // 左屋：两根立柱(接地) + 顶部横梁
      { x: 760, y: 510, w: 24, h: 110, type: 'wood' }, { x: 820, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 790, y: 448, w: 90, h: 22, type: 'stone' },
      // 中屋：两根立柱(接地) + 顶部横梁
      { x: 870, y: 510, w: 24, h: 110, type: 'ice' }, { x: 930, y: 510, w: 24, h: 110, type: 'ice' },
      { x: 900, y: 448, w: 90, h: 22, type: 'wood' },
      // 右屋：两根立柱(接地) + 顶部横梁
      { x: 980, y: 510, w: 24, h: 110, type: 'stone' }, { x: 1040, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 1010, y: 448, w: 90, h: 22, type: 'wood' }
    ]
  },
  {
    // 第二关：双层建筑，底层四柱接地，上层有保护结构
    birds: ['yellow', 'blue', 'red', 'yellow'],
    pigs: [{ x: 780, y: 541 }, { x: 890, y: 541 }, { x: 1000, y: 541 }, { x: 945, y: 541 }],
    blocks: [
      // 底层立柱(接地)
      { x: 750, y: 510, w: 24, h: 110, type: 'stone' }, { x: 810, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 920, y: 510, w: 24, h: 110, type: 'wood' }, { x: 980, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 1030, y: 510, w: 24, h: 110, type: 'ice' },
      // 底层横梁
      { x: 780, y: 448, w: 90, h: 22, type: 'wood' }, { x: 950, y: 448, w: 90, h: 22, type: 'stone' },
      // 第二层立柱（放在底层横梁上）
      { x: 780, y: 405, w: 22, h: 65, type: 'ice' }, { x: 950, y: 405, w: 22, h: 65, type: 'wood' },
      // 第二层横梁
      { x: 865, y: 365, w: 200, h: 22, type: 'stone' }
    ]
  },
  {
    // 第三关：三段堡垒，猪被多层结构保护
    birds: ['blue', 'red', 'yellow', 'blue', 'red'],
    pigs: [{ x: 770, y: 541 }, { x: 870, y: 541 }, { x: 970, y: 541 }, { x: 1070, y: 541 }],
    blocks: [
      // 第一段：双柱接地 + 横梁 + 顶层保护
      { x: 740, y: 510, w: 24, h: 110, type: 'stone' }, { x: 800, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 770, y: 448, w: 90, h: 22, type: 'wood' }, { x: 770, y: 415, w: 22, h: 65, type: 'ice' },
      // 第二段：双柱接地 + 双层横梁
      { x: 840, y: 510, w: 24, h: 110, type: 'wood' }, { x: 900, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 870, y: 448, w: 90, h: 22, type: 'stone' }, { x: 870, y: 415, w: 22, h: 65, type: 'wood' },
      { x: 870, y: 375, w: 90, h: 20, type: 'ice' },
      // 第三段：双柱接地 + 横梁
      { x: 940, y: 510, w: 24, h: 110, type: 'ice' }, { x: 1000, y: 510, w: 24, h: 110, type: 'ice' },
      { x: 970, y: 448, w: 90, h: 22, type: 'stone' },
      // 第四段：双柱接地 + 横梁 + 顶层
      { x: 1040, y: 510, w: 24, h: 110, type: 'stone' }, { x: 1100, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 1070, y: 448, w: 90, h: 22, type: 'wood' }, { x: 1070, y: 415, w: 22, h: 65, type: 'ice' }
    ]
  },
  {
    // 第四关：金字塔结构
    birds: ['red', 'yellow', 'red', 'blue'],
    pigs: [{ x: 800, y: 541 }, { x: 900, y: 541 }, { x: 1000, y: 541 }],
    blocks: [
      { x: 740, y: 510, w: 24, h: 110, type: 'stone' }, { x: 1060, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 800, y: 510, w: 24, h: 110, type: 'wood' }, { x: 1000, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 900, y: 510, w: 24, h: 110, type: 'ice' },
      { x: 770, y: 448, w: 90, h: 22, type: 'wood' }, { x: 970, y: 448, w: 90, h: 22, type: 'wood' },
      { x: 870, y: 448, w: 90, h: 22, type: 'stone' },
      { x: 870, y: 415, w: 22, h: 65, type: 'ice' }
    ]
  },
  {
    // 第五关：冰墙防线
    birds: ['yellow', 'blue', 'red', 'yellow'],
    pigs: [{ x: 780, y: 541 }, { x: 880, y: 541 }, { x: 980, y: 541 }, { x: 1080, y: 541 }],
    blocks: [
      { x: 750, y: 510, w: 24, h: 110, type: 'ice' }, { x: 810, y: 510, w: 24, h: 110, type: 'ice' },
      { x: 850, y: 510, w: 24, h: 110, type: 'ice' }, { x: 910, y: 510, w: 24, h: 110, type: 'ice' },
      { x: 950, y: 510, w: 24, h: 110, type: 'ice' }, { x: 1010, y: 510, w: 24, h: 110, type: 'ice' },
      { x: 1050, y: 510, w: 24, h: 110, type: 'ice' }, { x: 1110, y: 510, w: 24, h: 110, type: 'ice' },
      { x: 780, y: 448, w: 90, h: 22, type: 'ice' }, { x: 880, y: 448, w: 90, h: 22, type: 'ice' },
      { x: 980, y: 448, w: 90, h: 22, type: 'ice' }, { x: 1080, y: 448, w: 90, h: 22, type: 'ice' }
    ]
  },
  {
    // 第六关：石堡核心
    birds: ['red', 'blue', 'yellow', 'red', 'yellow'],
    pigs: [{ x: 850, y: 541 }, { x: 950, y: 541 }],
    blocks: [
      { x: 780, y: 510, w: 24, h: 110, type: 'stone' }, { x: 820, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 980, y: 510, w: 24, h: 110, type: 'stone' }, { x: 1020, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 800, y: 448, w: 60, h: 22, type: 'stone' }, { x: 1000, y: 448, w: 60, h: 22, type: 'stone' },
      { x: 850, y: 510, w: 24, h: 110, type: 'wood' }, { x: 950, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 900, y: 448, w: 120, h: 22, type: 'stone' },
      { x: 900, y: 415, w: 24, h: 65, type: 'stone' }
    ]
  },
  {
    // 第七关：双子塔
    birds: ['yellow', 'red', 'blue', 'yellow', 'red'],
    pigs: [{ x: 790, y: 541 }, { x: 890, y: 415 }, { x: 990, y: 541 }, { x: 890, y: 541 }],
    blocks: [
      { x: 760, y: 510, w: 24, h: 110, type: 'wood' }, { x: 820, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 960, y: 510, w: 24, h: 110, type: 'wood' }, { x: 1020, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 790, y: 448, w: 90, h: 22, type: 'stone' }, { x: 990, y: 448, w: 90, h: 22, type: 'stone' },
      { x: 790, y: 415, w: 22, h: 65, type: 'ice' }, { x: 990, y: 415, w: 22, h: 65, type: 'ice' },
      { x: 790, y: 365, w: 60, h: 22, type: 'wood' }, { x: 990, y: 365, w: 60, h: 22, type: 'wood' },
      { x: 890, y: 510, w: 24, h: 110, type: 'stone' }, { x: 890, y: 448, w: 60, h: 22, type: 'stone' }
    ]
  },
  {
    // 第八关：迷宫阵
    birds: ['blue', 'yellow', 'red', 'blue', 'red'],
    pigs: [{ x: 780, y: 541 }, { x: 880, y: 541 }, { x: 980, y: 541 }, { x: 1060, y: 541 }],
    blocks: [
      { x: 750, y: 510, w: 24, h: 110, type: 'stone' }, { x: 810, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 910, y: 510, w: 24, h: 110, type: 'stone' }, { x: 970, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 1030, y: 510, w: 24, h: 110, type: 'stone' }, { x: 1090, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 780, y: 448, w: 90, h: 22, type: 'ice' }, { x: 940, y: 448, w: 90, h: 22, type: 'ice' },
      { x: 1060, y: 448, w: 90, h: 22, type: 'ice' },
      { x: 860, y: 510, w: 24, h: 110, type: 'ice' }, { x: 1000, y: 510, w: 24, h: 110, type: 'ice' }
    ]
  },
  {
    // 第九关：空中楼阁
    birds: ['red', 'yellow', 'blue', 'red'],
    pigs: [{ x: 800, y: 541 }, { x: 900, y: 541 }, { x: 1000, y: 541 }],
    blocks: [
      { x: 740, y: 510, w: 24, h: 110, type: 'stone' }, { x: 1060, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 770, y: 448, w: 60, h: 22, type: 'wood' }, { x: 1030, y: 448, w: 60, h: 22, type: 'wood' },
      { x: 800, y: 510, w: 24, h: 110, type: 'ice' }, { x: 1000, y: 510, w: 24, h: 110, type: 'ice' },
      { x: 900, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 850, y: 448, w: 90, h: 22, type: 'stone' }, { x: 950, y: 448, w: 90, h: 22, type: 'stone' },
      { x: 900, y: 415, w: 22, h: 65, type: 'ice' }, { x: 900, y: 365, w: 60, h: 20, type: 'wood' }
    ]
  },
  {
    // 第十关：钢铁城墙
    birds: ['yellow', 'blue', 'red', 'yellow', 'blue'],
    pigs: [{ x: 860, y: 541 }, { x: 940, y: 541 }],
    blocks: [
      { x: 780, y: 510, w: 24, h: 110, type: 'stone' }, { x: 820, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 980, y: 510, w: 24, h: 110, type: 'stone' }, { x: 1020, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 800, y: 448, w: 60, h: 22, type: 'stone' }, { x: 1000, y: 448, w: 60, h: 22, type: 'stone' },
      { x: 800, y: 415, w: 24, h: 65, type: 'stone' }, { x: 1000, y: 415, w: 24, h: 65, type: 'stone' },
      { x: 900, y: 448, w: 200, h: 22, type: 'stone' },
      { x: 860, y: 510, w: 24, h: 110, type: 'wood' }, { x: 940, y: 510, w: 24, h: 110, type: 'wood' }
    ]
  },
  {
    // 第十一关：冰晶圣殿
    birds: ['blue', 'red', 'yellow', 'blue', 'red'],
    pigs: [{ x: 800, y: 541 }, { x: 900, y: 541 }, { x: 1000, y: 541 }, { x: 1100, y: 541 }],
    blocks: [
      { x: 770, y: 510, w: 24, h: 110, type: 'ice' }, { x: 830, y: 510, w: 24, h: 110, type: 'ice' },
      { x: 970, y: 510, w: 24, h: 110, type: 'ice' }, { x: 1030, y: 510, w: 24, h: 110, type: 'ice' },
      { x: 1090, y: 510, w: 24, h: 110, type: 'ice' },
      { x: 800, y: 448, w: 90, h: 22, type: 'ice' }, { x: 1000, y: 448, w: 90, h: 22, type: 'ice' },
      { x: 900, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 900, y: 448, w: 90, h: 22, type: 'stone' },
      { x: 850, y: 415, w: 120, h: 22, type: 'ice' }, { x: 950, y: 415, w: 120, h: 22, type: 'ice' }
    ]
  },
  {
    // 第十二关：木质迷宫
    birds: ['yellow', 'red', 'blue', 'yellow', 'red'],
    pigs: [{ x: 780, y: 541 }, { x: 880, y: 541 }, { x: 980, y: 541 }, { x: 1080, y: 541 }],
    blocks: [
      { x: 750, y: 510, w: 24, h: 110, type: 'wood' }, { x: 810, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 850, y: 510, w: 24, h: 110, type: 'wood' }, { x: 910, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 950, y: 510, w: 24, h: 110, type: 'wood' }, { x: 1010, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 1050, y: 510, w: 24, h: 110, type: 'wood' }, { x: 1110, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 780, y: 448, w: 90, h: 22, type: 'wood' }, { x: 880, y: 448, w: 90, h: 22, type: 'wood' },
      { x: 980, y: 448, w: 90, h: 22, type: 'wood' }, { x: 1080, y: 448, w: 90, h: 22, type: 'wood' }
    ]
  },
  {
    // 第十三关：三层蛋糕
    birds: ['red', 'yellow', 'blue', 'red', 'yellow'],
    pigs: [{ x: 850, y: 541 }, { x: 950, y: 541 }, { x: 900, y: 415 }],
    blocks: [
      { x: 780, y: 510, w: 24, h: 110, type: 'stone' }, { x: 1020, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 820, y: 510, w: 24, h: 110, type: 'wood' }, { x: 980, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 900, y: 510, w: 24, h: 110, type: 'ice' },
      { x: 800, y: 448, w: 60, h: 22, type: 'stone' }, { x: 1000, y: 448, w: 60, h: 22, type: 'stone' },
      { x: 900, y: 448, w: 120, h: 22, type: 'wood' },
      { x: 850, y: 415, w: 24, h: 65, type: 'ice' }, { x: 950, y: 415, w: 24, h: 65, type: 'ice' },
      { x: 900, y: 365, w: 120, h: 22, type: 'stone' }
    ]
  },
  {
    // 第十四关：护城河
    birds: ['blue', 'yellow', 'red', 'blue', 'red'],
    pigs: [{ x: 860, y: 541 }, { x: 940, y: 541 }, { x: 1000, y: 541 }],
    blocks: [
      { x: 780, y: 510, w: 24, h: 110, type: 'stone' }, { x: 820, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 780, y: 448, w: 60, h: 22, type: 'stone' }, { x: 820, y: 415, w: 24, h: 65, type: 'stone' },
      { x: 800, y: 365, w: 60, h: 22, type: 'stone' },
      { x: 860, y: 510, w: 24, h: 110, type: 'wood' }, { x: 940, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 1000, y: 510, w: 24, h: 110, type: 'ice' }, { x: 1060, y: 510, w: 24, h: 110, type: 'ice' },
      { x: 900, y: 448, w: 120, h: 22, type: 'wood' }, { x: 1030, y: 448, w: 90, h: 22, type: 'ice' }
    ]
  },
  {
    // 第十五关：王座大厅
    birds: ['yellow', 'blue', 'red', 'yellow', 'blue'],
    pigs: [{ x: 900, y: 541 }, { x: 800, y: 541 }, { x: 1000, y: 541 }],
    blocks: [
      { x: 760, y: 510, w: 24, h: 110, type: 'stone' }, { x: 840, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 960, y: 510, w: 24, h: 110, type: 'stone' }, { x: 1040, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 800, y: 448, w: 90, h: 22, type: 'wood' }, { x: 1000, y: 448, w: 90, h: 22, type: 'wood' },
      { x: 900, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 900, y: 448, w: 90, h: 22, type: 'stone' },
      { x: 800, y: 415, w: 24, h: 65, type: 'ice' }, { x: 1000, y: 415, w: 24, h: 65, type: 'ice' },
      { x: 900, y: 415, w: 24, h: 65, type: 'wood' },
      { x: 900, y: 365, w: 200, h: 22, type: 'stone' }
    ]
  },
  {
    // 第十六关：冰火两重天
    birds: ['red', 'blue', 'yellow', 'red', 'blue'],
    pigs: [{ x: 790, y: 541 }, { x: 890, y: 541 }, { x: 990, y: 541 }, { x: 1090, y: 541 }],
    blocks: [
      { x: 760, y: 510, w: 24, h: 110, type: 'ice' }, { x: 820, y: 510, w: 24, h: 110, type: 'ice' },
      { x: 790, y: 448, w: 90, h: 22, type: 'ice' }, { x: 790, y: 415, w: 24, h: 65, type: 'ice' },
      { x: 960, y: 510, w: 24, h: 110, type: 'stone' }, { x: 1020, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 990, y: 448, w: 90, h: 22, type: 'stone' }, { x: 990, y: 415, w: 24, h: 65, type: 'stone' },
      { x: 890, y: 510, w: 24, h: 110, type: 'wood' }, { x: 1090, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 890, y: 448, w: 90, h: 22, type: 'wood' }
    ]
  },
  {
    // 第十七关：要塞攻坚战
    birds: ['yellow', 'red', 'blue', 'yellow', 'red', 'blue'],
    pigs: [{ x: 860, y: 541 }, { x: 940, y: 541 }],
    blocks: [
      { x: 780, y: 510, w: 24, h: 110, type: 'stone' }, { x: 820, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 980, y: 510, w: 24, h: 110, type: 'stone' }, { x: 1020, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 800, y: 448, w: 60, h: 22, type: 'stone' }, { x: 1000, y: 448, w: 60, h: 22, type: 'stone' },
      { x: 800, y: 415, w: 24, h: 65, type: 'stone' }, { x: 1000, y: 415, w: 24, h: 65, type: 'stone' },
      { x: 800, y: 365, w: 60, h: 22, type: 'stone' }, { x: 1000, y: 365, w: 60, h: 22, type: 'stone' },
      { x: 860, y: 510, w: 24, h: 110, type: 'wood' }, { x: 940, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 900, y: 448, w: 120, h: 22, type: 'stone' }, { x: 900, y: 365, w: 120, h: 22, type: 'wood' }
    ]
  },
  {
    // 第十八关：悬空寺
    birds: ['blue', 'yellow', 'red', 'blue', 'yellow'],
    pigs: [{ x: 800, y: 541 }, { x: 900, y: 541 }, { x: 1000, y: 541 }],
    blocks: [
      { x: 740, y: 510, w: 24, h: 110, type: 'stone' }, { x: 1060, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 770, y: 448, w: 60, h: 22, type: 'wood' }, { x: 1030, y: 448, w: 60, h: 22, type: 'wood' },
      { x: 770, y: 415, w: 24, h: 65, type: 'ice' }, { x: 1030, y: 415, w: 24, h: 65, type: 'ice' },
      { x: 770, y: 365, w: 60, h: 22, type: 'stone' }, { x: 1030, y: 365, w: 60, h: 22, type: 'stone' },
      { x: 900, y: 448, w: 200, h: 22, type: 'wood' },
      { x: 850, y: 415, w: 24, h: 65, type: 'wood' }, { x: 950, y: 415, w: 24, h: 65, type: 'wood' },
      { x: 900, y: 365, w: 120, h: 22, type: 'stone' }
    ]
  },
  {
    // 第十九关：终极迷宫
    birds: ['red', 'yellow', 'blue', 'red', 'yellow', 'blue'],
    pigs: [{ x: 780, y: 541 }, { x: 880, y: 541 }, { x: 980, y: 541 }, { x: 1080, y: 541 }],
    blocks: [
      { x: 750, y: 510, w: 24, h: 110, type: 'stone' }, { x: 810, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 850, y: 510, w: 24, h: 110, type: 'ice' }, { x: 910, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 950, y: 510, w: 24, h: 110, type: 'wood' }, { x: 1010, y: 510, w: 24, h: 110, type: 'ice' },
      { x: 1050, y: 510, w: 24, h: 110, type: 'stone' }, { x: 1110, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 780, y: 448, w: 90, h: 22, type: 'stone' }, { x: 880, y: 448, w: 90, h: 22, type: 'wood' },
      { x: 980, y: 448, w: 90, h: 22, type: 'ice' }, { x: 1080, y: 448, w: 90, h: 22, type: 'stone' },
      { x: 830, y: 415, w: 24, h: 65, type: 'wood' }, { x: 930, y: 415, w: 24, h: 65, type: 'ice' },
      { x: 1030, y: 415, w: 24, h: 65, type: 'stone' }
    ]
  },
  {
    // 第二十关：终极堡垒
    birds: ['yellow', 'blue', 'red', 'yellow', 'blue', 'red'],
    pigs: [{ x: 860, y: 541 }, { x: 940, y: 541 }, { x: 900, y: 415 }],
    blocks: [
      { x: 780, y: 510, w: 24, h: 110, type: 'stone' }, { x: 820, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 980, y: 510, w: 24, h: 110, type: 'stone' }, { x: 1020, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 800, y: 448, w: 60, h: 22, type: 'stone' }, { x: 1000, y: 448, w: 60, h: 22, type: 'stone' },
      { x: 800, y: 415, w: 24, h: 65, type: 'ice' }, { x: 1000, y: 415, w: 24, h: 65, type: 'ice' },
      { x: 860, y: 510, w: 24, h: 110, type: 'wood' }, { x: 940, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 900, y: 448, w: 120, h: 22, type: 'stone' },
      { x: 860, y: 415, w: 24, h: 65, type: 'wood' }, { x: 940, y: 415, w: 24, h: 65, type: 'wood' },
      { x: 900, y: 365, w: 120, h: 22, type: 'stone' },
      { x: 880, y: 315, w: 24, h: 65, type: 'ice' }, { x: 920, y: 315, w: 24, h: 65, type: 'ice' }
    ]
  },
  {
    // 第二十一关：分散营地
    birds: ['red', 'yellow', 'blue', 'red'],
    pigs: [{ x: 750, y: 541 }, { x: 900, y: 541 }, { x: 1050, y: 541 }],
    blocks: [
      { x: 720, y: 510, w: 24, h: 110, type: 'wood' }, { x: 780, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 750, y: 448, w: 90, h: 22, type: 'stone' },
      { x: 870, y: 510, w: 24, h: 110, type: 'ice' }, { x: 930, y: 510, w: 24, h: 110, type: 'ice' },
      { x: 900, y: 448, w: 90, h: 22, type: 'wood' },
      { x: 1020, y: 510, w: 24, h: 110, type: 'stone' }, { x: 1080, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 1050, y: 448, w: 90, h: 22, type: 'wood' }
    ]
  },
  {
    // 第二十二关：地下堡垒
    birds: ['blue', 'red', 'yellow', 'blue', 'red', 'yellow'],
    pigs: [{ x: 880, y: 541 }, { x: 960, y: 541 }, { x: 1040, y: 541 }],
    blocks: [
      { x: 840, y: 510, w: 24, h: 110, type: 'stone' }, { x: 1000, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 1080, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 880, y: 510, w: 24, h: 110, type: 'wood' }, { x: 960, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 1040, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 860, y: 448, w: 60, h: 22, type: 'stone' }, { x: 920, y: 448, w: 60, h: 22, type: 'stone' },
      { x: 1000, y: 448, w: 60, h: 22, type: 'stone' }, { x: 1060, y: 448, w: 60, h: 22, type: 'stone' },
      { x: 960, y: 415, w: 200, h: 22, type: 'stone' }
    ]
  },
  {
    // 第二十三关：风车阵
    birds: ['yellow', 'blue', 'red', 'yellow', 'blue'],
    pigs: [{ x: 800, y: 541 }, { x: 900, y: 541 }, { x: 1000, y: 541 }],
    blocks: [
      { x: 770, y: 510, w: 24, h: 110, type: 'wood' }, { x: 830, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 970, y: 510, w: 24, h: 110, type: 'wood' }, { x: 1030, y: 510, w: 24, h: 110, type: 'wood' },
      { x: 800, y: 448, w: 90, h: 22, type: 'stone' }, { x: 1000, y: 448, w: 90, h: 22, type: 'stone' },
      { x: 800, y: 415, w: 24, h: 65, type: 'ice' }, { x: 1000, y: 415, w: 24, h: 65, type: 'ice' },
      { x: 900, y: 510, w: 24, h: 110, type: 'stone' },
      { x: 850, y: 448, w: 120, h: 22, type: 'wood' }, { x: 950, y: 448, w: 120, h: 22, type: 'wood' },
      { x: 900, y: 415, w: 24, h: 65, type: 'stone' }, { x: 900, y: 365, w: 60, h: 22, type: 'ice' }
    ]
  }
]

let ctx
let animationFrame
let lastTime = 0
let scale = 1
let worldWidth = 1200
let worldHeight = 650
let groundY = 565
let dragging = false
let launched = false
let skillUsed = false
let settleTimer = 0
let combo = 0
let cameraShake = 0
let activeBirds = []
let pigs = []
let blocks = []
let particles = []
const sling = { x: 210, y: 455 }
// 弹弓弹力参数：大幅增大力度系数与最大拉伸距离，确保初速足够快
const launchPower = 8.5      // 发射力度系数（原 3.75，过小导致初速与射程不足）
const maxDragDistance = 190  // 最大拉伸距离（原 125，限制初速上限）

const materialStats = {
  // 恢复合理血量，需要多鸟配合才能摧毁建筑
  wood: { hp: 55, color: '#c9823b', edge: '#7a3d1d', score: 450 },
  ice: { hp: 35, color: '#a9e9f3', edge: '#4ba9bc', score: 600 },
  stone: { hp: 90, color: '#89939a', edge: '#4c555b', score: 750 }
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.parentElement.getBoundingClientRect()
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = rect.width * ratio
  canvas.height = rect.height * ratio
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`
  scale = Math.min(rect.width / worldWidth, rect.height / worldHeight)
  ctx.setTransform(ratio * scale, 0, 0, ratio * scale, (rect.width - worldWidth * scale) * ratio / 2, 0)
}

function makeBird(type, x = sling.x, y = sling.y) {
  return { type, x, y, vx: 0, vy: 0, radius: type === 'blue' ? 17 : 22, rotation: 0, alive: true, age: 0 }
}

function loadLevel() {
  const level = levels[levelIndex.value]
  score.value = 0
  gameState.value = 'ready'
  birdQueue.value = level.birds.map(type => ({ type }))
  // 大幅降低猪的初始血量，让鸟更容易一击必杀；猪受重力影响可自由散落
  pigs = level.pigs.map(pig => ({ ...pig, radius: 24, hp: 28, alive: true, wobble: Math.random() * 6, vy: 0, falling: false }))
  blocks = level.blocks.map(block => ({ ...block, hp: materialStats[block.type].hp, angle: 0, vx: 0, vy: 0, falling: false, alive: true }))
  particles = []
  activeBirds = []
  launched = false
  skillUsed = false
  settleTimer = 0
  combo = 0
  spawnNextBird()
  showMessage('拖住小鸟向后拉，松手发射')
}

function spawnNextBird() {
  if (!birdQueue.value.length) {
    currentBird.value = null
    return
  }
  currentBird.value = makeBird(birdQueue.value[0].type)
  activeBirds = [currentBird.value]
  launched = false
  skillUsed = false
}

function pointerPosition(event) {
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: (event.clientX - rect.left - (rect.width - worldWidth * scale) / 2) / scale,
    y: (event.clientY - rect.top) / scale
  }
}

function onPointerDown(event) {
  if (gameState.value === 'paused' || gameState.value === 'won' || gameState.value === 'lost') return
  const point = pointerPosition(event)
  if (!launched && currentBird.value && Math.hypot(point.x - currentBird.value.x, point.y - currentBird.value.y) < 45) {
    dragging = true
    canvasRef.value.setPointerCapture(event.pointerId)
    return
  }
  if (launched) activateSkill()
}

function onPointerMove(event) {
  if (!dragging || !currentBird.value) return
  const point = pointerPosition(event)
  const dx = point.x - sling.x
  const dy = point.y - sling.y
  const distance = Math.min(Math.hypot(dx, dy), maxDragDistance)
  const angle = Math.atan2(dy, dx)
  currentBird.value.x = sling.x + Math.cos(angle) * distance
  currentBird.value.y = sling.y + Math.sin(angle) * distance
}

function onPointerUp() {
  if (!dragging || !currentBird.value) return
  dragging = false
  const powerX = sling.x - currentBird.value.x
  const powerY = sling.y - currentBird.value.y
  if (Math.hypot(powerX, powerY) < 18) {
    currentBird.value.x = sling.x
    currentBird.value.y = sling.y
    return
  }
  currentBird.value.vx = powerX * launchPower
  currentBird.value.vy = powerY * launchPower
  launched = true
  gameState.value = 'playing'
  playTone(210, 0.1, 'sine')
  showMessage('飞行中点击画面释放技能')
}

function activateSkill() {
  if (!currentBird.value || skillUsed || currentBird.value.age < 0.08) return
  skillUsed = true
  const bird = currentBird.value
  if (bird.type === 'yellow') {
    bird.vx *= 1.75
    bird.vy *= 1.15
    spawnBurst(bird.x, bird.y, '#ffe35a', 18)
    showMessage('极速突进！')
  } else if (bird.type === 'blue') {
    const clones = [-1, 1].map(direction => ({ ...makeBird('blue', bird.x, bird.y), vx: bird.vx, vy: bird.vy + direction * 155, radius: 13, age: bird.age }))
    activeBirds.push(...clones)
    spawnBurst(bird.x, bird.y, '#bcefff', 18)
    showMessage('冰晶分裂！')
  } else {
    damageArea(bird.x, bird.y, 105, 45)
    spawnBurst(bird.x, bird.y, '#ff5b37', 28)
    cameraShake = 12
    showMessage('怒火冲击！')
  }
  playTone(390, 0.18, 'square')
}

function update(dt) {
  if (gameState.value === 'paused' || gameState.value === 'won' || gameState.value === 'lost') return
  particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 280 * dt; p.life -= dt })
  particles = particles.filter(p => p.life > 0)
  updateBlocks(dt)
  updatePigs(dt)
  if (!launched) return

  let moving = false
  activeBirds.forEach(bird => {
    if (!bird.alive) return
    bird.age += dt
    bird.vy += 520 * dt
    bird.x += bird.vx * dt
    bird.y += bird.vy * dt
    bird.rotation += bird.vx * dt * 0.006
    bird.vx *= Math.pow(0.995, dt * 60)
    collideBird(bird)
    if (bird.y + bird.radius > groundY) {
      bird.y = groundY - bird.radius
      bird.vy *= -0.28
      bird.vx *= 0.72
    }
    if (bird.x > worldWidth + 100 || bird.y > worldHeight + 100 || bird.age > 10) bird.alive = false
    if (Math.hypot(bird.vx, bird.vy) > 25 && bird.alive) moving = true
  })

  if (!moving) settleTimer += dt
  else settleTimer = 0
  if (pigs.every(pig => !pig.alive)) finishLevel(true)
  else if (settleTimer > 1.25) consumeBird()
}

function updateBlocks(dt) {
  blocks.forEach(block => {
    if (!block.alive) return
    // 事件驱动重力：只有被撞击或失去支撑(falling=true)的方块才受重力
    // 初始悬空的方块不会自动下落，避免开局自动坍塌
    if (!block.falling) return
    block.vy += 430 * dt
    block.y += block.vy * dt
    block.angle += block.vx * dt * 0.004
    // 落到地面
    if (block.y + block.h / 2 >= groundY) {
      block.y = groundY - block.h / 2
      if (block.vy > 170) damageBlock(block, block.vy * 0.08)
      block.vy = 0
      block.vx *= 0.5
      block.falling = false
    } else {
      // 落到其他方块顶部——堆叠支撑
      const support = blocks.find(other => other !== block && other.alive && !other.falling &&
        (other.y - other.h / 2) > block.y + block.h / 2 &&
        (other.y - other.h / 2) - (block.y + block.h / 2) < 12 &&
        Math.abs(other.x - block.x) < (other.w + block.w) * 0.42)
      if (support) {
        block.y = support.y - support.h / 2 - block.h / 2
        if (block.vy > 170) damageBlock(block, block.vy * 0.08)
        // 下落方块砸到下方方块，传递冲击伤害
        if (block.vy > 200) damageBlock(support, block.vy * 0.05)
        block.vy = 0
        block.vx *= 0.5
        block.falling = false
      }
    }
    // 下落过程中砸到猪，造成坠落伤害
    if (block.falling && block.vy > 150) {
      pigs.forEach(pig => {
        if (!pig.alive) return
        if (Math.abs(block.x - pig.x) < block.w / 2 + pig.radius &&
            Math.abs((block.y + block.h / 2) - pig.y) < pig.radius + 6) {
          pig.hp -= block.vy * 0.15
          if (pig.hp <= 0) destroyPig(pig)
          else spawnBurst(pig.x, pig.y, '#8fce3c', 8)
        }
      })
    }
  })
}

// 方块被摧毁时，检测周围方块是否失去支撑或左右不平衡，触发下落
function notifySupportLost(destroyedX, destroyedY) {
  blocks.forEach(block => {
    if (!block.alive || block.falling) return
    // 只检测在被摧毁方块附近（上下左右范围内）的方块
    if (Math.abs(block.x - destroyedX) > 80 && Math.abs(block.y - destroyedY) > 80) return

    const onGround = block.y + block.h / 2 >= groundY - 2
    // 检测下方是否有存活方块支撑（正下方或部分重叠都算）
    const supports = blocks.filter(other => other !== block && other.alive && !other.falling &&
      (other.y - other.h / 2) >= block.y + block.h / 2 - 12 &&
      (other.y - other.h / 2) - (block.y + block.h / 2) < 10 &&
      Math.abs(other.x - block.x) < (other.w + block.w) * 0.42)

    if (!onGround && supports.length === 0) {
      // 完全失去支撑，直接下落
      block.falling = true
    } else if (!onGround && supports.length === 1) {
      // 只剩一个支撑点——检测左右不平衡
      const support = supports[0]
      const blockLeft = block.x - block.w / 2
      const blockRight = block.x + block.w / 2
      const supportLeft = support.x - support.w / 2
      const supportRight = support.x + support.w / 2
      // 支撑点偏离方块中心过多，重心不稳则倾覆下落
      const offset = Math.abs(support.x - block.x)
      if (offset > block.w * 0.35) block.falling = true
    }
  })
}

// 猪的重力物理：失去方块支撑后自由下落，落地有坠落伤害
function updatePigs(dt) {
  pigs.forEach(pig => {
    if (!pig.alive) return
    const onGround = pig.y + pig.radius >= groundY - 2
    const onBlock = blocks.some(block => block.alive &&
      Math.abs((block.y - block.h / 2) - (pig.y + pig.radius)) < 8 &&
      Math.abs(block.x - pig.x) < block.w / 2 + pig.radius)
    if (!onGround && !onBlock) {
      pig.falling = true
      pig.vy += 430 * dt
      pig.y += pig.vy * dt
      if (pig.y + pig.radius >= groundY) {
        pig.y = groundY - pig.radius
        if (pig.vy > 220) {
          pig.hp -= pig.vy * 0.12
          if (pig.hp <= 0) destroyPig(pig)
          else spawnBurst(pig.x, pig.y, '#8fce3c', 8)
        }
        pig.vy = 0
        pig.falling = false
      }
    } else if (pig.falling) {
      pig.vy = 0
      pig.falling = false
    }
  })
}

function collideBird(bird) {
  pigs.forEach(pig => {
    if (!pig.alive) return
    const dx = bird.x - pig.x
    const dy = bird.y - pig.y
    const distance = Math.hypot(dx, dy)
    if (distance < bird.radius + pig.radius) {
      const impact = Math.hypot(bird.vx, bird.vy)
      // 极大提升对猪的伤害与穿透力，确保一击必杀且可连击
      pig.hp -= impact * 0.85
      bird.vx *= 0.95
      bird.vy *= 0.95
      pig.x += (dx / Math.max(distance, 1)) * 8
      if (pig.hp <= 0 || impact > 180) destroyPig(pig)
      else spawnBurst(pig.x, pig.y, '#8fce3c', 8)
    }
  })
  blocks.forEach(block => {
    if (!block.alive) return
    const nearestX = Math.max(block.x - block.w / 2, Math.min(bird.x, block.x + block.w / 2))
    const nearestY = Math.max(block.y - block.h / 2, Math.min(bird.y, block.y + block.h / 2))
    const dx = bird.x - nearestX
    const dy = bird.y - nearestY
    if (dx * dx + dy * dy < bird.radius * bird.radius) {
      const impact = Math.hypot(bird.vx, bird.vy)
      const advantage = bird.type === 'yellow' && block.type === 'wood' ? 1.65 : bird.type === 'blue' && block.type === 'ice' ? 1.8 : 1
      // 适中伤害与穿透力：能打穿1-2个方块，但不会一鸟摧毁全部
      damageBlock(block, impact * 0.45 * advantage)
      block.vx += bird.vx * 0.22
      block.vy += bird.vy * 0.12
      // 被撞击的方块受冲击力影响开始倾覆下落（包括石块）
      if (impact > 200) block.falling = true
      bird.vx *= 0.78
      bird.vy *= 0.78
      cameraShake = Math.min(10, impact * 0.018)
    }
  })
}

function damageBlock(block, damage) {
  block.hp -= damage
  if (block.hp <= 0 && block.alive) {
    block.alive = false
    combo += 1
    addScore(materialStats[block.type].score + combo * 80)
    spawnBurst(block.x, block.y, materialStats[block.type].color, 14)
    playTone(block.type === 'stone' ? 95 : 150, 0.09, 'square')
    damageArea(block.x, block.y, 70, 14)
    // 方块被摧毁后，通知上方方块检测是否失去支撑
    notifySupportLost(block.x, block.y)
  }
}

function destroyPig(pig) {
  pig.alive = false
  combo += 1
  addScore(2500 + combo * 250)
  spawnBurst(pig.x, pig.y, '#93d33d', 24)
  cameraShake = 10
  playTone(520, 0.16, 'sine')
}

function damageArea(x, y, radius, damage) {
  blocks.forEach(block => {
    const distance = Math.hypot(block.x - x, block.y - y)
    if (block.alive && distance < radius) damageBlock(block, damage * (1 - distance / radius))
  })
  pigs.forEach(pig => {
    const distance = Math.hypot(pig.x - x, pig.y - y)
    if (pig.alive && distance < radius) {
      pig.hp -= damage * 1.35 * (1 - distance / radius)
      if (pig.hp <= 0) destroyPig(pig)
    }
  })
}

function consumeBird() {
  birdQueue.value.shift()
  currentBird.value = null
  activeBirds = []
  launched = false
  settleTimer = 0
  combo = 0
  if (!birdQueue.value.length) finishLevel(false)
  else {
    setTimeout(() => {
      if (gameState.value === 'playing') {
        spawnNextBird()
        showMessage('下一只就位')
      }
    }, 450)
  }
}

function finishLevel(won) {
  if (gameState.value === 'won' || gameState.value === 'lost') return
  if (won) {
    const bonus = birdQueue.value.length * 1800
    addScore(bonus)
    gameState.value = 'won'
  } else {
    gameState.value = 'lost'
  }
  if (score.value > bestScore.value) {
    bestScore.value = score.value
    localStorage.setItem('angry_birds_best', String(bestScore.value))
  }
}

function addScore(value) {
  score.value += Math.round(value)
}

function spawnBurst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2
    const speed = 45 + Math.random() * 190
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 70, color, size: 3 + Math.random() * 7, life: 0.5 + Math.random() * 0.7 })
  }
}

function showMessage(text) {
  message.value = text
  window.clearTimeout(showMessage.timer)
  showMessage.timer = window.setTimeout(() => { message.value = '' }, 2600)
}

function playTone(frequency, duration, wave) {
  if (muted.value) return
  try {
    const audio = new AudioContext()
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.type = wave
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(55, frequency * 0.55), audio.currentTime + duration)
    gain.gain.setValueAtTime(0.06, audio.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration)
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start()
    oscillator.stop(audio.currentTime + duration)
    oscillator.onended = () => audio.close()
  } catch (_) {}
}

function draw() {
  ctx.save()
  const shakeX = cameraShake ? (Math.random() - 0.5) * cameraShake : 0
  const shakeY = cameraShake ? (Math.random() - 0.5) * cameraShake : 0
  cameraShake *= 0.88
  ctx.translate(shakeX, shakeY)
  drawSky()
  drawLandscape()
  drawTrajectory()
  drawSlingBack()
  blocks.filter(block => block.alive).forEach(drawBlock)
  pigs.filter(pig => pig.alive).forEach(drawPig)
  activeBirds.filter(bird => bird.alive).forEach(drawBird)
  drawSlingFront()
  drawParticles()
  ctx.restore()
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, groundY)
  gradient.addColorStop(0, '#76cde5')
  gradient.addColorStop(0.62, '#d9f1d1')
  gradient.addColorStop(1, '#f6d77b')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, worldWidth, worldHeight)
  ctx.fillStyle = 'rgba(255,246,182,.75)'
  ctx.beginPath(); ctx.arc(1050, 105, 58, 0, Math.PI * 2); ctx.fill()
  for (let i = 0; i < 6; i += 1) {
    const x = 80 + i * 215
    const y = 90 + (i % 3) * 42
    ctx.fillStyle = 'rgba(255,255,255,.55)'
    ctx.beginPath(); ctx.ellipse(x, y, 62, 18, 0, 0, Math.PI * 2); ctx.ellipse(x + 45, y + 3, 45, 14, 0, 0, Math.PI * 2); ctx.fill()
  }
}

function drawLandscape() {
  ctx.fillStyle = '#8dbb62'
  ctx.beginPath(); ctx.moveTo(0, 410); ctx.quadraticCurveTo(180, 320, 360, 430); ctx.quadraticCurveTo(520, 330, 700, 440); ctx.quadraticCurveTo(920, 300, 1200, 430); ctx.lineTo(1200, groundY); ctx.lineTo(0, groundY); ctx.fill()
  ctx.fillStyle = '#5d8e48'
  ctx.beginPath(); ctx.moveTo(0, 485); ctx.quadraticCurveTo(240, 390, 455, 500); ctx.quadraticCurveTo(700, 410, 920, 500); ctx.quadraticCurveTo(1080, 430, 1200, 485); ctx.lineTo(1200, groundY); ctx.lineTo(0, groundY); ctx.fill()
  ctx.fillStyle = '#5e3b24'; ctx.fillRect(0, groundY, worldWidth, worldHeight - groundY)
  ctx.fillStyle = '#78b84e'; ctx.fillRect(0, groundY - 8, worldWidth, 12)
  ctx.fillStyle = '#426e35'
  for (let x = 0; x < worldWidth; x += 24) ctx.fillRect(x, groundY + 20 + (x % 5) * 5, 12, 5)
}

function drawTrajectory() {
  if (!dragging || !currentBird.value) return
  let x = sling.x
  let y = sling.y
  let vx = (sling.x - currentBird.value.x) * launchPower
  let vy = (sling.y - currentBird.value.y) * launchPower
  ctx.fillStyle = 'rgba(255,255,255,.75)'
  for (let i = 1; i <= 18; i += 1) {
    const t = i * 0.085
    x = sling.x + vx * t
    y = sling.y + vy * t + 260 * t * t
    ctx.beginPath(); ctx.arc(x, y, Math.max(2, 5 - i * 0.16), 0, Math.PI * 2); ctx.fill()
  }
}

function drawSlingBack() {
  ctx.strokeStyle = '#4a2417'; ctx.lineWidth = 15; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(sling.x - 17, groundY); ctx.lineTo(sling.x - 20, sling.y - 5); ctx.moveTo(sling.x + 18, groundY); ctx.lineTo(sling.x + 22, sling.y - 14); ctx.stroke()
  if (currentBird.value && !launched) {
    ctx.strokeStyle = '#2e1712'; ctx.lineWidth = 7
    ctx.beginPath(); ctx.moveTo(sling.x - 20, sling.y - 5); ctx.lineTo(currentBird.value.x, currentBird.value.y); ctx.stroke()
  }
}

function drawSlingFront() {
  if (currentBird.value && !launched) {
    ctx.strokeStyle = '#2e1712'; ctx.lineWidth = 7
    ctx.beginPath(); ctx.moveTo(currentBird.value.x, currentBird.value.y); ctx.lineTo(sling.x + 22, sling.y - 14); ctx.stroke()
  }
  ctx.fillStyle = '#7b4124'; ctx.beginPath(); ctx.ellipse(sling.x, groundY + 2, 42, 10, 0, 0, Math.PI * 2); ctx.fill()
}

function drawBird(bird) {
  ctx.save(); ctx.translate(bird.x, bird.y); ctx.rotate(bird.rotation)
  const colors = { red: ['#e53b2f', '#941f26'], yellow: ['#ffd944', '#d68d15'], blue: ['#71d5ed', '#267d9c'] }
  ctx.fillStyle = colors[bird.type][1]; ctx.beginPath(); ctx.arc(0, 2, bird.radius + 3, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = colors[bird.type][0]; ctx.beginPath(); ctx.arc(-2, -1, bird.radius, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#f7dbc1'; ctx.beginPath(); ctx.ellipse(2, 8, bird.radius * .7, bird.radius * .48, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-8, -7, 7, 0, Math.PI * 2); ctx.arc(5, -7, 7, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#171414'; ctx.beginPath(); ctx.arc(-6, -6, 3, 0, Math.PI * 2); ctx.arc(3, -6, 3, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#431a19'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-15, -15); ctx.lineTo(-3, -10); ctx.moveTo(13, -15); ctx.lineTo(2, -10); ctx.stroke()
  ctx.fillStyle = '#f0a52c'; ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(14, 5); ctx.lineTo(0, 9); ctx.closePath(); ctx.fill()
  ctx.restore()
}

function drawPig(pig) {
  ctx.save(); ctx.translate(pig.x, pig.y + Math.sin(performance.now() * .003 + pig.wobble) * 2)
  ctx.fillStyle = '#5d922e'; ctx.beginPath(); ctx.arc(0, 2, pig.radius + 3, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#8dce45'; ctx.beginPath(); ctx.arc(0, 0, pig.radius, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(-13, -19, 8, 0, Math.PI * 2); ctx.arc(13, -19, 8, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#b7e975'; ctx.beginPath(); ctx.ellipse(0, 8, 14, 10, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#497122'; ctx.beginPath(); ctx.arc(-5, 8, 2.5, 0, Math.PI * 2); ctx.arc(5, 8, 2.5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-9, -6, 6, 0, Math.PI * 2); ctx.arc(9, -6, 6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-8, -5, 2.5, 0, Math.PI * 2); ctx.arc(8, -5, 2.5, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawBlock(block) {
  const stats = materialStats[block.type]
  ctx.save(); ctx.translate(block.x, block.y); ctx.rotate(block.angle)
  ctx.fillStyle = stats.edge; ctx.fillRect(-block.w / 2 - 3, -block.h / 2 - 3, block.w + 6, block.h + 6)
  ctx.fillStyle = stats.color; ctx.fillRect(-block.w / 2, -block.h / 2, block.w, block.h)
  ctx.globalAlpha = .23; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3
  for (let p = -block.h / 2 + 12; p < block.h / 2; p += 22) { ctx.beginPath(); ctx.moveTo(-block.w / 2 + 4, p); ctx.lineTo(block.w / 2 - 4, p); ctx.stroke() }
  ctx.globalAlpha = 1
  if (block.hp < materialStats[block.type].hp * .55) {
    ctx.strokeStyle = '#3b2b28'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-block.w * .3, -block.h * .35); ctx.lineTo(0, 0); ctx.lineTo(block.w * .25, block.h * .32); ctx.stroke()
  }
  ctx.restore()
}

function drawParticles() {
  particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size) })
  ctx.globalAlpha = 1
}

function gameLoop(time) {
  const dt = Math.min((time - lastTime) / 1000 || 0, 0.033)
  lastTime = time
  update(dt)
  draw()
  animationFrame = requestAnimationFrame(gameLoop)
}

function restartLevel() { loadLevel() }
function nextLevel() { levelIndex.value = (levelIndex.value + 1) % levels.length; loadLevel() }
function resumeGame() { gameState.value = launched ? 'playing' : 'ready'; lastTime = performance.now() }
function togglePause() {
  if (gameState.value === 'won' || gameState.value === 'lost') return
  if (gameState.value === 'paused') resumeGame()
  else gameState.value = 'paused'
}

function onKeyDown(event) {
  if (event.code === 'KeyR') restartLevel()
  if (event.code === 'Escape') togglePause()
  if (event.code === 'Space' && launched) { event.preventDefault(); activateSkill() }
}

onMounted(async () => {
  await nextTick()
  ctx = canvasRef.value.getContext('2d')
  resizeCanvas()
  loadLevel()
  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('keydown', onKeyDown)
  animationFrame = requestAnimationFrame(gameLoop)
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrame)
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('keydown', onKeyDown)
  window.clearTimeout(showMessage.timer)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@600;700;800;900&display=swap');

.birds-page { --ink: #251917; --cream: #fff5dc; position: relative; min-height: 100%; padding: 22px; overflow: hidden; color: var(--ink); font-family: 'Nunito', sans-serif; background: radial-gradient(circle at 15% 0%, #fff3b8 0, transparent 28%), linear-gradient(145deg, #e5472e 0 18%, #f3a43a 18% 34%, #f7d775 34% 100%); }
.birds-page::before { content: ''; position: absolute; inset: 0; opacity: .12; pointer-events: none; background-image: repeating-linear-gradient(118deg, transparent 0 28px, #5b241b 29px 31px); }
.sky-glow { position: absolute; width: 480px; height: 480px; right: -160px; top: -240px; border: 3px solid rgba(255,255,255,.35); border-radius: 50%; box-shadow: 0 0 0 55px rgba(255,255,255,.07), 0 0 0 110px rgba(255,255,255,.05); }
.game-header, .game-shell { position: relative; z-index: 1; max-width: 1440px; margin: 0 auto; }
.game-header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 24px; margin-bottom: 16px; }
.brand { line-height: .86; transform: rotate(-2deg); }
.brand-kicker, .eyebrow { display: block; color: #6c271d; font-size: 11px; font-weight: 900; letter-spacing: .22em; }
.brand h1 { margin: 5px 0 0; color: #fff8df; font-family: 'Bebas Neue', sans-serif; font-size: clamp(34px, 4vw, 58px); letter-spacing: .05em; text-shadow: 4px 4px 0 #7f251c; }
.stats { display: flex; overflow: hidden; border: 2px solid rgba(69,33,24,.7); border-radius: 18px; background: rgba(255,246,218,.88); box-shadow: 7px 7px 0 rgba(92,41,27,.25); }
.stat { min-width: 94px; padding: 9px 18px; text-align: center; border-right: 1px solid rgba(83,47,31,.18); }
.stat:last-child { border: 0; }
.stat span { display: block; margin-bottom: 1px; color: #8c6151; font-size: 10px; font-weight: 900; letter-spacing: .14em; }
.stat strong { font-family: 'Bebas Neue', sans-serif; font-size: 24px; letter-spacing: .06em; }
.stat.score { color: #bf2b22; background: #fff9ea; }
.header-actions { justify-self: end; display: flex; gap: 10px; }
.icon-button, .pause-button { border: 2px solid #542c22; color: #3b211b; background: #fff3d1; box-shadow: 4px 4px 0 #713525; cursor: pointer; transition: transform .15s, box-shadow .15s; }
.icon-button { width: 46px; height: 46px; border-radius: 14px; font-size: 19px; }
.icon-button:hover, .pause-button:hover, .primary-button:hover, .secondary-button:hover { transform: translate(2px, 2px); box-shadow: 2px 2px 0 #713525; }
.game-shell { border: 3px solid #4d2a21; border-radius: 26px; background: #33221d; box-shadow: 12px 14px 0 rgba(91,37,27,.3), 0 26px 70px rgba(73,31,22,.25); overflow: hidden; }
.canvas-wrap { position: relative; height: min(68vh, 720px); min-height: 480px; overflow: hidden; background: #8dd4e4; }
canvas { display: block; width: 100%; height: 100%; cursor: crosshair; touch-action: none; }
.bird-deck { position: absolute; left: 20px; bottom: 20px; display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 2px solid rgba(39,25,20,.7); border-radius: 16px; background: rgba(255,246,220,.88); backdrop-filter: blur(8px); }
.deck-label { margin-right: 4px; color: #806255; font-size: 10px; font-weight: 900; letter-spacing: .15em; }
.deck-bird { display: grid; width: 30px; height: 30px; place-items: center; border: 2px solid #452923; border-radius: 50%; color: white; font-size: 11px; box-shadow: inset -3px -3px 0 rgba(0,0,0,.18); }
.deck-bird.red { background: #df3f32; }.deck-bird.yellow { background: #f2ba28; }.deck-bird.blue { background: #45b8da; }
.power-card { position: absolute; top: 18px; left: 18px; display: flex; align-items: center; gap: 10px; min-width: 178px; padding: 10px 15px 10px 10px; border: 2px solid #44241e; border-radius: 16px; color: #fff; box-shadow: 5px 5px 0 rgba(48,26,20,.22); }
.power-card.red { background: #cb382e; }.power-card.yellow { background: #d89b17; }.power-card.blue { background: #258faf; }
.power-icon { display: grid; width: 38px; height: 38px; place-items: center; border: 2px solid rgba(255,255,255,.7); border-radius: 50%; }
.power-card small, .power-card strong { display: block; }.power-card small { opacity: .75; font-size: 9px; font-weight: 900; letter-spacing: .14em; }.power-card strong { font-size: 15px; }
.toast { position: absolute; left: 50%; top: 24px; transform: translateX(-50%); padding: 9px 18px; border: 2px solid #463027; border-radius: 999px; color: #493125; background: rgba(255,250,230,.9); font-size: 13px; font-weight: 900; box-shadow: 4px 4px 0 rgba(55,35,28,.2); animation: toast-in .25s ease-out; }
.game-overlay { position: absolute; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(40,24,20,.58); backdrop-filter: blur(7px); }
.result-card { width: min(420px, 90%); padding: 30px; border: 3px solid #49271e; border-radius: 26px; text-align: center; background: #fff3d7; box-shadow: 10px 10px 0 rgba(50,25,20,.35); transform: rotate(-1deg); }
.result-card.compact { width: 330px; }.result-card.won { background: #fff2b9; }.result-card.lost { background: #f7c6ae; }
.result-card h2 { margin: 8px 0 2px; font-family: 'Bebas Neue', sans-serif; font-size: 42px; letter-spacing: .04em; }
.result-score { color: #bd3125; font-family: 'Bebas Neue', sans-serif; font-size: 58px; line-height: 1; }
.stars { margin: 4px 0; color: #a78c70; font-size: 34px; letter-spacing: 5px; }.stars .active { color: #efa91b; text-shadow: 0 3px 0 #a46017; }
.result-card p { color: #74594d; font-size: 13px; }.result-actions { display: flex; justify-content: center; gap: 10px; margin-top: 20px; }
.primary-button, .secondary-button { padding: 11px 20px; border: 2px solid #4c291f; border-radius: 12px; font-family: inherit; font-weight: 900; cursor: pointer; box-shadow: 4px 4px 0 #713525; }
.primary-button { color: white; background: #d94131; }.secondary-button { color: #4b2b22; background: #fffaf0; }
.control-strip { display: flex; align-items: center; gap: 26px; min-height: 66px; padding: 0 20px; color: #f9e9ce; background: #34231e; }
.hint { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; opacity: .84; }.hint kbd { min-width: 30px; padding: 4px 7px; border: 1px solid #a8795d; border-radius: 6px; text-align: center; color: #ffdf9e; background: #5a3a2f; font-family: inherit; }
.pause-button { margin-left: auto; padding: 8px 16px; border-color: #1d1411; background: #f2b13d; font-family: inherit; font-weight: 900; }
@keyframes toast-in { from { opacity: 0; transform: translate(-50%, -8px); } }
@media (max-width: 900px) { .birds-page { padding: 10px; }.game-header { grid-template-columns: 1fr auto; }.stats { grid-row: 2; grid-column: 1 / -1; justify-self: stretch; }.stat { flex: 1; min-width: 0; padding: 8px; }.canvas-wrap { height: 68vh; min-height: 430px; }.control-strip { gap: 10px; overflow-x: auto; }.hint span { display: none; } }
@media (max-width: 560px) { .brand h1 { font-size: 36px; }.header-actions { gap: 6px; }.icon-button { width: 40px; height: 40px; }.power-card { transform: scale(.84); transform-origin: top left; }.toast { top: 82px; white-space: nowrap; }.canvas-wrap { min-height: 520px; }.bird-deck { bottom: 12px; left: 12px; }.result-actions { flex-direction: column; } }
</style>
