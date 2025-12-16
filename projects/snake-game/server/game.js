const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

class Game {
  constructor() {
    this.config = {
      width: 1200,
      height: 800,
      gridSize: 10,
      initialLength: 5,
      foodCount: 50,
      speed: 3 // pixels per frame
    };

    this.players = new Map();
    this.foods = [];
    this.colorIndex = 0;

    this.spawnInitialFood();
  }

  getConfig() {
    return this.config;
  }

  getState() {
    const players = {};
    this.players.forEach((player, id) => {
      players[id] = {
        id: player.id,
        name: player.name,
        color: player.color,
        segments: player.segments,
        score: player.score,
        alive: player.alive
      };
    });

    return {
      players,
      foods: this.foods
    };
  }

  spawnInitialFood() {
    for (let i = 0; i < this.config.foodCount; i++) {
      this.spawnFood();
    }
  }

  spawnFood() {
    const food = {
      id: Math.random().toString(36).substr(2, 9),
      x: Math.random() * (this.config.width - 20) + 10,
      y: Math.random() * (this.config.height - 20) + 10,
      radius: 5 + Math.random() * 5,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`
    };
    this.foods.push(food);
    return food;
  }

  addPlayer(id) {
    const color = COLORS[this.colorIndex % COLORS.length];
    this.colorIndex++;

    const startX = Math.random() * (this.config.width - 200) + 100;
    const startY = Math.random() * (this.config.height - 200) + 100;
    const angle = Math.random() * Math.PI * 2;

    const segments = [];
    for (let i = 0; i < this.config.initialLength; i++) {
      segments.push({
        x: startX - Math.cos(angle) * i * this.config.gridSize,
        y: startY - Math.sin(angle) * i * this.config.gridSize
      });
    }

    const player = {
      id,
      name: `Player ${this.players.size + 1}`,
      color,
      segments,
      angle,
      targetAngle: angle,
      speed: this.config.speed,
      score: 0,
      alive: true
    };

    this.players.set(id, player);
    return player;
  }

  setPlayerName(id, name) {
    const player = this.players.get(id);
    if (player) {
      // XSS 방지: HTML 태그 및 특수문자 제거
      const sanitized = String(name)
        .replace(/[<>\"'&\/\\]/g, '') // HTML 특수문자 제거
        .replace(/javascript:/gi, '') // javascript: 프로토콜 제거
        .replace(/on\w+=/gi, '') // 이벤트 핸들러 제거
        .replace(/script/gi, '') // script 태그 제거
        .trim()
        .slice(0, 12);
      player.name = sanitized || 'Player';
    }
  }

  removePlayer(id) {
    const player = this.players.get(id);
    if (player && player.alive) {
      // Convert dead snake to food
      this.convertSnakeToFood(player);
    }
    this.players.delete(id);
  }

  convertSnakeToFood(player) {
    player.segments.forEach((segment, index) => {
      if (index % 2 === 0) { // Only some segments become food
        this.foods.push({
          id: Math.random().toString(36).substr(2, 9),
          x: segment.x,
          y: segment.y,
          radius: 6,
          color: player.color
        });
      }
    });
  }

  changeDirection(playerId, direction) {
    const player = this.players.get(playerId);
    if (!player || !player.alive) return;

    // direction is the target angle in radians
    player.targetAngle = direction;
  }

  respawnPlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    const startX = Math.random() * (this.config.width - 200) + 100;
    const startY = Math.random() * (this.config.height - 200) + 100;
    const angle = Math.random() * Math.PI * 2;

    const segments = [];
    for (let i = 0; i < this.config.initialLength; i++) {
      segments.push({
        x: startX - Math.cos(angle) * i * this.config.gridSize,
        y: startY - Math.sin(angle) * i * this.config.gridSize
      });
    }

    player.segments = segments;
    player.angle = angle;
    player.targetAngle = angle;
    player.score = 0;
    player.alive = true;
  }

  update() {
    this.players.forEach((player) => {
      if (!player.alive) return;

      // Smooth angle interpolation
      let angleDiff = player.targetAngle - player.angle;

      // Normalize angle difference to -PI to PI
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Limit turn rate for smooth movement
      const maxTurnRate = 0.15;
      if (Math.abs(angleDiff) > maxTurnRate) {
        angleDiff = Math.sign(angleDiff) * maxTurnRate;
      }
      player.angle += angleDiff;

      // Move head
      const head = player.segments[0];
      const newHead = {
        x: head.x + Math.cos(player.angle) * player.speed,
        y: head.y + Math.sin(player.angle) * player.speed
      };

      // Wall collision (wrap around)
      if (newHead.x < 0) newHead.x = this.config.width;
      if (newHead.x > this.config.width) newHead.x = 0;
      if (newHead.y < 0) newHead.y = this.config.height;
      if (newHead.y > this.config.height) newHead.y = 0;

      // Add new head and remove tail
      player.segments.unshift(newHead);
      player.segments.pop();

      // Check food collision
      this.checkFoodCollision(player);

      // Check snake collision
      this.checkSnakeCollision(player);
    });

    // Maintain food count
    while (this.foods.length < this.config.foodCount) {
      this.spawnFood();
    }
  }

  checkFoodCollision(player) {
    const head = player.segments[0];
    const headRadius = 10;

    for (let i = this.foods.length - 1; i >= 0; i--) {
      const food = this.foods[i];
      const dist = Math.hypot(head.x - food.x, head.y - food.y);

      if (dist < headRadius + food.radius) {
        // Eat food
        player.score += Math.floor(food.radius);

        // Grow snake
        const tail = player.segments[player.segments.length - 1];
        const prevTail = player.segments[player.segments.length - 2] || tail;
        const growCount = Math.ceil(food.radius / 3);

        for (let j = 0; j < growCount; j++) {
          player.segments.push({
            x: tail.x + (tail.x - prevTail.x) * 0.1 * j,
            y: tail.y + (tail.y - prevTail.y) * 0.1 * j
          });
        }

        // Remove food
        this.foods.splice(i, 1);
      }
    }
  }

  checkSnakeCollision(player) {
    const head = player.segments[0];
    const headRadius = 8;

    this.players.forEach((other) => {
      if (!other.alive) return;

      // Skip own head collision check for first few segments
      const startIndex = (other.id === player.id) ? 10 : 0;

      for (let i = startIndex; i < other.segments.length; i++) {
        const segment = other.segments[i];
        const dist = Math.hypot(head.x - segment.x, head.y - segment.y);

        if (dist < headRadius + 5) {
          // Player dies
          player.alive = false;
          this.convertSnakeToFood(player);

          // Give points to killer if it's another player
          if (other.id !== player.id) {
            other.score += Math.floor(player.score / 2);
          }
          return;
        }
      }
    });
  }
}

module.exports = Game;
