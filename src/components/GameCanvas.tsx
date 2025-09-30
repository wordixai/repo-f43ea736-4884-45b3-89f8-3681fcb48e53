import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

interface Bullet extends GameObject {
  active: boolean;
}

interface Enemy extends GameObject {
  active: boolean;
  health: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}

export const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const gameLoopRef = useRef<number>();

  const playerRef = useRef<GameObject>({
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    speed: 5
  });

  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const starsRef = useRef<Star[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const lastShotRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    playerRef.current.x = canvas.width / 2 - playerRef.current.width / 2;
    playerRef.current.y = canvas.height - 100;

    // 初始化星星
    for (let i = 0; i < 100; i++) {
      starsRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        speed: Math.random() * 2 + 1
      });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      if (e.key === ' ' && gameState === 'playing') {
        e.preventDefault();
        shoot();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState]);

  const shoot = () => {
    const now = Date.now();
    if (now - lastShotRef.current < 200) return;
    
    lastShotRef.current = now;
    const player = playerRef.current;
    
    bulletsRef.current.push({
      x: player.x + player.width / 2 - 2,
      y: player.y,
      width: 4,
      height: 15,
      speed: 8,
      active: true
    });
  };

  const spawnEnemy = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    enemiesRef.current.push({
      x: Math.random() * (canvas.width - 50),
      y: -50,
      width: 45,
      height: 45,
      speed: 2 + Math.random() * 2,
      active: true,
      health: 1
    });
  };

  const checkCollision = (obj1: GameObject, obj2: GameObject) => {
    return (
      obj1.x < obj2.x + obj2.width &&
      obj1.x + obj1.width > obj2.x &&
      obj1.y < obj2.y + obj2.height &&
      obj1.y + obj1.height > obj2.y
    );
  };

  const update = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const player = playerRef.current;

    // 玩家移动
    if (keysRef.current['ArrowLeft'] && player.x > 0) {
      player.x -= player.speed;
    }
    if (keysRef.current['ArrowRight'] && player.x < canvas.width - player.width) {
      player.x += player.speed;
    }

    // 更新星星
    starsRef.current.forEach(star => {
      star.y += star.speed;
      if (star.y > canvas.height) {
        star.y = 0;
        star.x = Math.random() * canvas.width;
      }
    });

    // 更新子弹
    bulletsRef.current = bulletsRef.current.filter(bullet => {
      bullet.y -= bullet.speed;
      return bullet.y > -bullet.height && bullet.active;
    });

    // 更新敌人
    enemiesRef.current = enemiesRef.current.filter(enemy => {
      enemy.y += enemy.speed;
      
      // 检查敌人是否碰到底部
      if (enemy.y > canvas.height) {
        setLives(prev => prev - 1);
        return false;
      }

      // 检查子弹碰撞
      bulletsRef.current.forEach(bullet => {
        if (bullet.active && checkCollision(bullet, enemy)) {
          bullet.active = false;
          enemy.health--;
          if (enemy.health <= 0) {
            enemy.active = false;
            setScore(prev => prev + 100);
          }
        }
      });

      // 检查玩家碰撞
      if (checkCollision(player, enemy)) {
        enemy.active = false;
        setLives(prev => prev - 1);
        return false;
      }

      return enemy.active && enemy.y < canvas.height + enemy.height;
    });

    // 随机生成敌人
    if (Math.random() < 0.02) {
      spawnEnemy();
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // 清空画布
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制星星
    starsRef.current.forEach(star => {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.random() * 0.5})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // 绘制玩家
    const player = playerRef.current;
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    
    // 飞船主体
    ctx.fillStyle = '#a855f7';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#a855f7';
    ctx.beginPath();
    ctx.moveTo(0, -player.height / 2);
    ctx.lineTo(-player.width / 2, player.height / 2);
    ctx.lineTo(player.width / 2, player.height / 2);
    ctx.closePath();
    ctx.fill();

    // 引擎光效
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.fillRect(-5, player.height / 2 - 5, 10, 8);
    
    ctx.restore();

    // 绘制子弹
    bulletsRef.current.forEach(bullet => {
      if (bullet.active) {
        ctx.fillStyle = '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#06b6d4';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      }
    });

    // 绘制敌人
    enemiesRef.current.forEach(enemy => {
      if (enemy.active) {
        ctx.save();
        ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(0, enemy.height / 2);
        ctx.lineTo(-enemy.width / 2, -enemy.height / 2);
        ctx.lineTo(enemy.width / 2, -enemy.height / 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      }
    });

    ctx.shadowBlur = 0;
  };

  const gameLoop = () => {
    if (gameState !== 'playing') return;

    update();
    draw();

    if (lives <= 0) {
      setGameState('gameover');
      return;
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    bulletsRef.current = [];
    enemiesRef.current = [];
    
    const canvas = canvasRef.current;
    if (canvas) {
      playerRef.current.x = canvas.width / 2 - playerRef.current.width / 2;
      playerRef.current.y = canvas.height - 100;
    }

    gameLoop();
  };

  const restartGame = () => {
    startGame();
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
      />

      {/* HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-6 left-0 right-0 flex justify-between px-8 pointer-events-none">
          <div className="text-2xl font-bold" style={{ color: 'hsl(var(--primary))' }}>
            分数: {score}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: lives }).map((_, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full"
                style={{ 
                  backgroundColor: 'hsl(var(--accent))',
                  boxShadow: '0 0 10px hsl(var(--accent))'
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 开始菜单 */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="p-8 space-y-6 text-center border-2" style={{ 
            borderColor: 'hsl(var(--primary))',
            background: 'rgba(10, 14, 39, 0.9)'
          }}>
            <h1 className="text-6xl font-bold mb-4" style={{ 
              color: 'hsl(var(--primary))',
              textShadow: '0 0 20px hsl(var(--primary))'
            }}>
              星空大战
            </h1>
            <p className="text-xl" style={{ color: 'hsl(var(--foreground))' }}>
              使用方向键移动，空格键射击
            </p>
            <Button
              size="lg"
              onClick={startGame}
              className="text-xl px-8 py-6"
              style={{
                background: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))'
              }}
            >
              开始游戏
            </Button>
          </Card>
        </div>
      )}

      {/* 游戏结束 */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="p-8 space-y-6 text-center border-2" style={{ 
            borderColor: 'hsl(var(--destructive))',
            background: 'rgba(10, 14, 39, 0.9)'
          }}>
            <h1 className="text-6xl font-bold mb-4" style={{ 
              color: 'hsl(var(--destructive))',
              textShadow: '0 0 20px hsl(var(--destructive))'
            }}>
              游戏结束
            </h1>
            <p className="text-3xl font-bold" style={{ color: 'hsl(var(--primary))' }}>
              最终分数: {score}
            </p>
            <Button
              size="lg"
              onClick={restartGame}
              className="text-xl px-8 py-6"
              style={{
                background: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))'
              }}
            >
              重新开始
            </Button>
          </Card>
        </div>
      )}

      {/* 控制提示 */}
      {gameState === 'playing' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm opacity-50 pointer-events-none">
          ← → 移动 | SPACE 射击
        </div>
      )}
    </div>
  );
};