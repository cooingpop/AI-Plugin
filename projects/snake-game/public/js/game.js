class SnakeGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.minimap = document.getElementById('minimap');
    this.minimapCtx = this.minimap.getContext('2d');

    this.playerId = null;
    this.playerName = '';
    this.config = null;
    this.gameState = { players: {}, foods: [] };
    this.previousState = { players: {}, foods: [] };
    this.interpolatedState = { players: {}, foods: [] };

    this.lastUpdateTime = 0;
    this.interpolationFactor = 0;

    this.camera = { x: 0, y: 0 };
    this.targetCamera = { x: 0, y: 0 };

    this.gameStarted = false;

    this.setupCanvas();
    this.setupStartScreen();
    this.gameLoop();
  }

  setupStartScreen() {
    const nameInput = document.getElementById('player-name');
    const startBtn = document.getElementById('start-btn');

    // 이름 입력 시 버튼 활성화
    nameInput.addEventListener('input', () => {
      const name = nameInput.value.trim();
      startBtn.disabled = name.length === 0;
    });

    // Enter 키로 게임 시작
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && nameInput.value.trim().length > 0) {
        this.startGame();
      }
    });

    // 시작 버튼 클릭
    startBtn.addEventListener('click', () => {
      this.startGame();
    });

    // 입력창에 포커스
    nameInput.focus();
  }

  startGame() {
    const nameInput = document.getElementById('player-name');
    // 클라이언트 측 sanitize (서버에서도 중복 처리)
    const rawName = nameInput.value.trim();
    this.playerName = rawName
      .replace(/[<>\"'&\/\\]/g, '')
      .replace(/script/gi, '')
      .slice(0, 12) || 'Player';

    // 시작 화면 숨기기
    document.getElementById('start-screen').classList.add('hidden');

    // 게임 시작
    this.gameStarted = true;
    this.setupSocket();
    this.setupInput();
    this.setupRespawnButton();
  }

  setupCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.minimap.width = 150;
    this.minimap.height = 100;

    window.addEventListener('resize', () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    });
  }

  setupSocket() {
    this.socket = io();

    this.socket.on('connect', () => {
      this.updateConnectionStatus('connected');
      // 연결 후 닉네임 전송
      this.socket.emit('setName', this.playerName);
    });

    this.socket.on('disconnect', () => {
      this.updateConnectionStatus('disconnected');
      // 게임이 시작된 상태에서 연결이 끊기면 최종 랭킹 표시
      if (this.gameStarted) {
        this.showServerClosedScreen();
      }
    });

    this.socket.on('init', (data) => {
      this.playerId = data.playerId;
      this.config = data.config;
      this.gameState = data.state;
      this.previousState = JSON.parse(JSON.stringify(data.state));
      this.interpolatedState = JSON.parse(JSON.stringify(data.state));
      console.log('Initialized:', this.playerId);
    });

    this.socket.on('gameState', (state) => {
      this.previousState = JSON.parse(JSON.stringify(this.gameState));
      this.gameState = state;
      this.lastUpdateTime = performance.now();

      this.updateUI();
    });

    this.socket.on('playerJoined', (player) => {
      console.log('Player joined:', player.id);
    });

    this.socket.on('playerLeft', (playerId) => {
      console.log('Player left:', playerId);
    });
  }

  setupInput() {
    // 현재 눌린 키 추적 (대각선 이동용)
    this.pressedKeys = new Set();

    // 키 눌림 처리
    document.addEventListener('keydown', (e) => {
      if (!this.playerId || !this.gameState.players[this.playerId]) return;

      const player = this.gameState.players[this.playerId];
      if (!player || !player.alive) return;

      // 방향키/WASD 확인
      const key = e.key.toLowerCase();
      const isDirectionKey = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key);

      if (isDirectionKey) {
        e.preventDefault();
        this.pressedKeys.add(key);
        this.updateDirection();
      }
    });

    // 키 뗌 처리
    document.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      this.pressedKeys.delete(key);

      // 아직 다른 방향키가 눌려있으면 방향 업데이트
      if (this.pressedKeys.size > 0) {
        this.updateDirection();
      }
    });
  }

  // 눌린 키 조합으로 방향 계산
  updateDirection() {
    if (!this.playerId || !this.gameState.players[this.playerId]) return;

    const player = this.gameState.players[this.playerId];
    if (!player || !player.alive) return;

    const keys = this.pressedKeys;

    // 방향 체크
    const up = keys.has('arrowup') || keys.has('w');
    const down = keys.has('arrowdown') || keys.has('s');
    const left = keys.has('arrowleft') || keys.has('a');
    const right = keys.has('arrowright') || keys.has('d');

    let newAngle = null;

    // 8방향 계산
    if (up && right) {
      newAngle = -Math.PI / 4;        // 우상 (45도)
    } else if (up && left) {
      newAngle = -3 * Math.PI / 4;    // 좌상 (135도)
    } else if (down && right) {
      newAngle = Math.PI / 4;         // 우하 (-45도)
    } else if (down && left) {
      newAngle = 3 * Math.PI / 4;     // 좌하 (-135도)
    } else if (up) {
      newAngle = -Math.PI / 2;        // 위 (90도)
    } else if (down) {
      newAngle = Math.PI / 2;         // 아래 (-90도)
    } else if (left) {
      newAngle = Math.PI;             // 왼쪽 (180도)
    } else if (right) {
      newAngle = 0;                   // 오른쪽 (0도)
    }

    if (newAngle !== null) {
      this.socket.emit('changeDirection', newAngle);
    }
  }

  // Respawn 버튼 설정 (startGame에서 호출됨)
  setupRespawnButton() {
    document.getElementById('respawn-btn').addEventListener('click', () => {
      this.socket.emit('respawn');
      document.getElementById('death-screen').classList.add('hidden');
    });
  }

  updateConnectionStatus(status) {
    const el = document.getElementById('connection-status');
    el.className = status;
    el.textContent = status === 'connected' ? 'Connected' : 'Disconnected';
  }

  interpolateState() {
    const now = performance.now();
    const timeSinceUpdate = now - this.lastUpdateTime;
    const serverTickRate = 1000 / 30; // 30fps from server

    this.interpolationFactor = Math.min(timeSinceUpdate / serverTickRate, 1);

    // Interpolate each player
    for (const id in this.gameState.players) {
      const current = this.gameState.players[id];
      const previous = this.previousState.players[id];

      if (!this.interpolatedState.players[id]) {
        this.interpolatedState.players[id] = JSON.parse(JSON.stringify(current));
        continue;
      }

      if (!previous) {
        this.interpolatedState.players[id] = JSON.parse(JSON.stringify(current));
        continue;
      }

      const interpolated = this.interpolatedState.players[id];
      interpolated.score = current.score;
      interpolated.alive = current.alive;
      interpolated.color = current.color;
      interpolated.name = current.name;

      // Interpolate segments
      if (current.segments && previous.segments) {
        const maxLen = Math.max(current.segments.length, previous.segments.length);

        if (!interpolated.segments) {
          interpolated.segments = [];
        }

        for (let i = 0; i < current.segments.length; i++) {
          const curr = current.segments[i];
          const prev = previous.segments[i] || curr;

          if (!interpolated.segments[i]) {
            interpolated.segments[i] = { x: curr.x, y: curr.y };
          }

          // Handle world wrap smoothly
          let dx = curr.x - prev.x;
          let dy = curr.y - prev.y;

          if (Math.abs(dx) > this.config.width / 2) {
            dx = dx > 0 ? dx - this.config.width : dx + this.config.width;
          }
          if (Math.abs(dy) > this.config.height / 2) {
            dy = dy > 0 ? dy - this.config.height : dy + this.config.height;
          }

          interpolated.segments[i].x = prev.x + dx * this.interpolationFactor;
          interpolated.segments[i].y = prev.y + dy * this.interpolationFactor;

          // Wrap coordinates
          if (interpolated.segments[i].x < 0) interpolated.segments[i].x += this.config.width;
          if (interpolated.segments[i].x > this.config.width) interpolated.segments[i].x -= this.config.width;
          if (interpolated.segments[i].y < 0) interpolated.segments[i].y += this.config.height;
          if (interpolated.segments[i].y > this.config.height) interpolated.segments[i].y -= this.config.height;
        }

        // Trim excess segments
        interpolated.segments.length = current.segments.length;
      }
    }

    // Remove players that left
    for (const id in this.interpolatedState.players) {
      if (!this.gameState.players[id]) {
        delete this.interpolatedState.players[id];
      }
    }

    // Copy foods (no interpolation needed, they don't move)
    this.interpolatedState.foods = this.gameState.foods;
  }

  updateCamera() {
    if (!this.playerId || !this.interpolatedState.players[this.playerId]) return;

    const player = this.interpolatedState.players[this.playerId];
    if (!player.segments || !player.segments[0]) return;

    const head = player.segments[0];
    this.targetCamera.x = head.x;
    this.targetCamera.y = head.y;

    // Smooth camera follow
    this.camera.x += (this.targetCamera.x - this.camera.x) * 0.1;
    this.camera.y += (this.targetCamera.y - this.camera.y) * 0.1;
  }

  updateUI() {
    const player = this.gameState.players[this.playerId];

    if (player) {
      document.getElementById('my-score').textContent = `Score: ${player.score}`;
      document.getElementById('my-length').textContent = `Length: ${player.segments ? player.segments.length : 0}`;

      if (!player.alive) {
        document.getElementById('final-score').textContent = player.score;
        document.getElementById('death-screen').classList.remove('hidden');
      }
    }

    // Update leaderboard
    const players = Object.values(this.gameState.players)
      .filter(p => p.alive)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const leaderboard = document.getElementById('leaderboard');
    // 안전한 DOM 생성 (XSS 방지)
    leaderboard.innerHTML = '';
    players.forEach((p, i) => {
      const li = document.createElement('li');
      if (p.id === this.playerId) li.classList.add('me');

      const nameSpan = document.createElement('span');
      const colorSpan = document.createElement('span');
      colorSpan.className = 'player-color';
      colorSpan.style.background = this.escapeHtml(p.color);
      nameSpan.appendChild(colorSpan);
      nameSpan.appendChild(document.createTextNode(`${i + 1}. ${this.escapeHtml(p.name)}`));

      const scoreSpan = document.createElement('span');
      scoreSpan.textContent = p.score;

      li.appendChild(nameSpan);
      li.appendChild(scoreSpan);
      leaderboard.appendChild(li);
    });
  }

  // XSS 방지용 escape 함수
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 서버 종료 시 최종 랭킹 화면 표시
  showServerClosedScreen() {
    this.gameStarted = false;

    // 다른 화면 숨기기
    document.getElementById('death-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.add('hidden');

    // 최종 랭킹 생성
    const players = Object.values(this.gameState.players)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const finalLeaderboard = document.getElementById('final-leaderboard');
    finalLeaderboard.innerHTML = '';

    players.forEach((p, i) => {
      const li = document.createElement('li');
      if (p.id === this.playerId) li.classList.add('me');

      // 순위
      const rankSpan = document.createElement('span');
      rankSpan.className = `rank rank-${i + 1}`;
      rankSpan.textContent = `#${i + 1}`;

      // 플레이어 정보
      const playerInfo = document.createElement('span');
      playerInfo.className = 'player-info';

      const colorSpan = document.createElement('span');
      colorSpan.className = 'player-color';
      colorSpan.style.background = this.escapeHtml(p.color);

      const nameSpan = document.createElement('span');
      nameSpan.textContent = this.escapeHtml(p.name);

      playerInfo.appendChild(colorSpan);
      playerInfo.appendChild(nameSpan);

      // 점수
      const scoreSpan = document.createElement('span');
      scoreSpan.className = 'score';
      scoreSpan.textContent = p.score;

      li.appendChild(rankSpan);
      li.appendChild(playerInfo);
      li.appendChild(scoreSpan);
      finalLeaderboard.appendChild(li);
    });

    // 플레이어가 없는 경우
    if (players.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No players';
      li.style.justifyContent = 'center';
      li.style.color = '#666';
      finalLeaderboard.appendChild(li);
    }

    // 서버 종료 화면 표시
    document.getElementById('server-closed-screen').classList.remove('hidden');
  }

  render() {
    if (!this.gameStarted || !this.config) return;

    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, width, height);

    // Calculate view bounds
    const viewLeft = this.camera.x - width / 2;
    const viewTop = this.camera.y - height / 2;

    // Draw grid
    this.drawGrid(viewLeft, viewTop);

    // Draw world border
    this.drawWorldBorder(viewLeft, viewTop);

    // Draw foods
    this.interpolatedState.foods.forEach(food => {
      const screenX = food.x - viewLeft;
      const screenY = food.y - viewTop;

      // Skip if off screen
      if (screenX < -20 || screenX > width + 20 ||
          screenY < -20 || screenY > height + 20) return;

      ctx.beginPath();
      ctx.arc(screenX, screenY, food.radius, 0, Math.PI * 2);
      ctx.fillStyle = food.color;
      ctx.fill();

      // Glow effect
      ctx.shadowColor = food.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw snakes
    for (const id in this.interpolatedState.players) {
      const player = this.interpolatedState.players[id];
      if (!player.alive || !player.segments) continue;

      this.drawSnake(player, viewLeft, viewTop, id === this.playerId);
    }

    // Draw minimap
    this.drawMinimap();
  }

  drawGrid(viewLeft, viewTop) {
    const ctx = this.ctx;
    const gridSize = 50;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    const startX = Math.floor(viewLeft / gridSize) * gridSize;
    const startY = Math.floor(viewTop / gridSize) * gridSize;

    for (let x = startX; x < viewLeft + this.canvas.width + gridSize; x += gridSize) {
      const screenX = x - viewLeft;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, this.canvas.height);
      ctx.stroke();
    }

    for (let y = startY; y < viewTop + this.canvas.height + gridSize; y += gridSize) {
      const screenY = y - viewTop;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(this.canvas.width, screenY);
      ctx.stroke();
    }
  }

  drawWorldBorder(viewLeft, viewTop) {
    const ctx = this.ctx;

    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);

    ctx.strokeRect(
      -viewLeft,
      -viewTop,
      this.config.width,
      this.config.height
    );

    ctx.setLineDash([]);
  }

  drawSnake(player, viewLeft, viewTop, isMe) {
    const ctx = this.ctx;
    const segments = player.segments;

    if (!segments || segments.length === 0) return;

    // Draw body segments
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i];
      const screenX = segment.x - viewLeft;
      const screenY = segment.y - viewTop;

      // Skip if off screen
      if (screenX < -20 || screenX > this.canvas.width + 20 ||
          screenY < -20 || screenY > this.canvas.height + 20) continue;

      const progress = i / segments.length;
      const radius = 8 + (1 - progress) * 4; // Head is bigger

      // Body segment
      ctx.beginPath();
      ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);

      // Gradient effect from head to tail
      const alpha = 0.6 + (1 - progress) * 0.4;
      ctx.fillStyle = player.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw head with eyes
    const head = segments[0];
    const screenX = head.x - viewLeft;
    const screenY = head.y - viewTop;

    if (screenX >= -20 && screenX <= this.canvas.width + 20 &&
        screenY >= -20 && screenY <= this.canvas.height + 20) {

      // Glow for own snake
      if (isMe) {
        ctx.shadowColor = player.color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 12, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Calculate head direction
      let angle = 0;
      if (segments.length > 1) {
        const neck = segments[1];
        angle = Math.atan2(head.y - neck.y, head.x - neck.x);
      }

      // Eyes
      const eyeOffset = 5;
      const eyeRadius = 3;

      for (let side = -1; side <= 1; side += 2) {
        const eyeAngle = angle + (Math.PI / 2) * side * 0.5;
        const eyeX = screenX + Math.cos(angle) * 3 + Math.cos(eyeAngle) * eyeOffset * 0.5;
        const eyeY = screenY + Math.sin(angle) * 3 + Math.sin(eyeAngle) * eyeOffset * 0.5;

        // Eye white
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        // Pupil
        ctx.beginPath();
        ctx.arc(
          eyeX + Math.cos(angle) * 1,
          eyeY + Math.sin(angle) * 1,
          eyeRadius * 0.5,
          0, Math.PI * 2
        );
        ctx.fillStyle = '#000';
        ctx.fill();
      }
    }

    // Draw name above head
    if (segments[0]) {
      const nameX = segments[0].x - viewLeft;
      const nameY = segments[0].y - viewTop - 25;

      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(player.name, nameX, nameY);
    }
  }

  drawMinimap() {
    const ctx = this.minimapCtx;
    const scale = 150 / this.config.width;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, 150, 100);

    // Draw border
    ctx.strokeStyle = '#444';
    ctx.strokeRect(0, 0, 150, 100);

    // Draw all players on minimap
    for (const id in this.gameState.players) {
      const player = this.gameState.players[id];
      if (!player.alive || !player.segments || !player.segments[0]) continue;

      const head = player.segments[0];
      const x = head.x * scale;
      const y = head.y * (100 / this.config.height);

      ctx.beginPath();
      ctx.arc(x, y, id === this.playerId ? 4 : 2, 0, Math.PI * 2);
      ctx.fillStyle = player.color;
      ctx.fill();
    }

    // Draw view rectangle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.strokeRect(
      (this.camera.x - this.canvas.width / 2) * scale,
      (this.camera.y - this.canvas.height / 2) * (100 / this.config.height),
      this.canvas.width * scale,
      this.canvas.height * (100 / this.config.height)
    );
  }

  gameLoop() {
    this.interpolateState();
    this.updateCamera();
    this.render();

    requestAnimationFrame(() => this.gameLoop());
  }
}

// Start game when page loads
window.addEventListener('load', () => {
  new SnakeGame();
});
