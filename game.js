class TowerDefenseGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        
        this.gameState = {
            health: 100,
            gold: 150,
            wave: 1,
            waveActive: false,
            waveTimer: 30,
            selectedTower: null,
            towers: [],
            enemies: [],
            projectiles: [],
            lastSpawn: 0,
            spawnInterval: 2000,
            waveEnemiesCount: 0,
            enemiesSpawned: 0
        };
        
        this.tavern = {
            x: this.canvas.width - 150,
            y: this.canvas.height - 150,
            width: 100,
            height: 100
        };
        
        this.path = this.createPath();
        this.init();
        this.gameLoop();
    }

    init() {
        this.setupEventListeners();
        this.updateDisplay();
        
        // События мыши для canvas
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        
        // Автоматическое обновление таймера
        setInterval(() => {
            if (!this.gameState.waveActive && this.gameState.waveTimer > 0) {
                this.gameState.waveTimer--;
                this.updateDisplay();
            }
        }, 1000);
    }

    createPath() {
        return [
            {x: 50, y: this.canvas.height},
            {x: 150, y: this.canvas.height - 100},
            {x: 300, y: this.canvas.height - 150},
            {x: 500, y: this.canvas.height - 200},
            {x: 700, y: this.canvas.height - 150},
            {x: this.canvas.width - 100, y: this.canvas.height - 100}
        ];
    }

    setupEventListeners() {
        // Выбор охранников
        document.querySelectorAll('.tower-card').forEach(card => {
            card.addEventListener('click', (e) => {
                document.querySelectorAll('.tower-card').forEach(c => {
                    c.style.border = '2px solid #d4af37';
                });
                card.style.border = '3px solid #ffd700';
                this.gameState.selectedTower = card.dataset.type;
                this.addLog(`Выбран: ${card.querySelector('h3').textContent}`);
            });
        });

        // Кнопка начала волны
        document.getElementById('start-wave').addEventListener('click', () => {
            this.startWave();
        });

        // Улучшение таверны
        document.getElementById('upgrade-tavern').addEventListener('click', () => {
            this.upgradeTavern();
        });

        // Продажа охранника
        document.getElementById('sell-tower').addEventListener('click', () => {
            this.setSellMode();
        });

        // Изменение размера окна
        window.addEventListener('resize', () => {
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
            this.tavern = {
                x: this.canvas.width - 150,
                y: this.canvas.height - 150,
                width: 100,
                height: 100
            };
            this.path = this.createPath();
        });
    }

    startWave() {
        if (this.gameState.waveActive) return;
        
        this.gameState.waveActive = true;
        this.gameState.waveTimer = 30;
        this.gameState.enemiesSpawned = 0;
        this.gameState.waveEnemiesCount = 5 + this.gameState.wave * 2;
        
        this.addLog(`Волна ${this.gameState.wave} началась!`);
        this.addLog(`На таверну движется ${this.gameState.waveEnemiesCount} врагов!`);
        
        document.getElementById('start-wave').classList.add('wave-starting');
    }

    upgradeTavern() {
        if (this.gameState.gold >= 100) {
            this.gameState.gold -= 100;
            this.gameState.health += 50;
            this.addLog('Таверна улучшена! +50 HP');
            this.updateDisplay();
        } else {
            this.addLog('Недостаточно золота для улучшения!', 'error');
        }
    }

    setSellMode() {
        this.gameState.selectedTower = 'sell';
        this.addLog('Режим продажи: кликните на охранника для продажи');
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.gameState.selectedTower === 'sell') {
            this.sellTowerAt(x, y);
            return;
        }
        
        if (this.gameState.selectedTower) {
            this.placeTower(x, y);
        }
    }

    placeTower(x, y) {
        // Проверка на достаточное количество золота
        const cost = this.getTowerCost(this.gameState.selectedTower);
        if (this.gameState.gold < cost) {
            this.addLog('Недостаточно золота!', 'error');
            return;
        }
        
        // Проверка на слишком близкое расположение к пути
        if (this.isNearPath(x, y)) {
            this.addLog('Нельзя ставить охранника так близко к дороге!', 'error');
            return;
        }
        
        // Проверка на слишком близкое расположение к таверне
        if (Math.abs(x - this.tavern.x) < 150 && Math.abs(y - this.tavern.y) < 150) {
            this.addLog('Нельзя ставить охранника так близко к таверне!', 'error');
            return;
        }
        
        this.gameState.gold -= cost;
        this.gameState.towers.push({
            type: this.gameState.selectedTower,
            x: x,
            y: y,
            level: 1,
            damage: this.getTowerDamage(this.gameState.selectedTower),
            range: this.getTowerRange(this.gameState.selectedTower),
            cooldown: 0,
            lastShot: 0
        });
        
        this.addLog(`${this.getTowerName(this.gameState.selectedTower)} размещён!`);
        this.updateDisplay();
    }

    sellTowerAt(x, y) {
        const towerIndex = this.gameState.towers.findIndex(t => {
            return Math.abs(t.x - x) < 40 && Math.abs(t.y - y) < 40;
        });
        
        if (towerIndex !== -1) {
            const tower = this.gameState.towers[towerIndex];
            const refund = this.getTowerCost(tower.type) * 0.7;
            this.gameState.gold += Math.floor(refund);
            this.gameState.towers.splice(towerIndex, 1);
            this.addLog(`Охранник продан за ${Math.floor(refund)} золота`);
            this.updateDisplay();
        }
    }

    spawnEnemy() {
        const enemyTypes = ['drunk', 'angry', 'baron'];
        const type = this.gameState.wave > 5 ? enemyTypes[2] : 
                    this.gameState.wave > 2 ? enemyTypes[Math.floor(Math.random() * 2)] : 
                    enemyTypes[0];
        
        const stats = {
            drunk: { health: 50, speed: 0.5, gold: 10, icon: '🍺' },
            angry: { health: 30, speed: 1.0, gold: 15, icon: '💢' },
            baron: { health: 200, speed: 0.3, gold: 50, icon: '👑' }
        };
        
        this.gameState.enemies.push({
            type: type,
            x: this.path[0].x,
            y: this.path[0].y,
            health: stats[type].health,
            maxHealth: stats[type].health,
            speed: stats[type].speed,
            gold: stats[type].gold,
            icon: stats[type].icon,
            pathIndex: 0,
            progress: 0
        });
        
        this.gameState.enemiesSpawned++;
    }

    updateEnemies() {
        for (let i = this.gameState.enemies.length - 1; i >= 0; i--) {
            const enemy = this.gameState.enemies[i];
            
            // Движение по пути
            const currentPoint = this.path[enemy.pathIndex];
            const nextPoint = this.path[enemy.pathIndex + 1];
            
            if (nextPoint) {
                const dx = nextPoint.x - currentPoint.x;
                const dy = nextPoint.y - currentPoint.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                enemy.progress += enemy.speed / distance;
                
                if (enemy.progress >= 1) {
                    enemy.progress = 0;
                    enemy.pathIndex++;
                    
                    if (enemy.pathIndex >= this.path.length - 1) {
                        // Враг достиг таверны
                        this.gameState.health -= enemy.type === 'baron' ? 20 : 10;
                        this.gameState.enemies.splice(i, 1);
                        this.addLog(`${this.getEnemyName(enemy.type)} атаковал таверну!`, 'damage');
                        
                        if (this.gameState.health <= 0) {
                            this.gameOver();
                        }
                        continue;
                    }
                }
                
                const current = this.path[enemy.pathIndex];
                const next = this.path[enemy.pathIndex + 1];
                enemy.x = current.x + (next.x - current.x) * enemy.progress;
                enemy.y = current.y + (next.y - current.y) * enemy.progress;
            }
            
            // Проверка смерти врага
            if (enemy.health <= 0) {
                this.gameState.gold += enemy.gold;
                this.gameState.enemies.splice(i, 1);
                this.addLog(`${this.getEnemyName(enemy.type)} побеждён! +${enemy.gold} золота`);
            }
        }
    }

    updateTowers() {
        const now = Date.now();
        
        this.gameState.towers.forEach(tower => {
            tower.cooldown = Math.max(0, tower.cooldown - (now - tower.lastShot));
            
            if (tower.cooldown <= 0) {
                const target = this.findTarget(tower);
                if (target) {
                    this.shoot(tower, target);
                    tower.lastShot = now;
                    tower.cooldown = 1000; // 1 секунда перезарядки
                }
            }
        });
    }

    findTarget(tower) {
        let closest = null;
        let closestDistance = tower.range;
        
        this.gameState.enemies.forEach(enemy => {
            const dx = enemy.x - tower.x;
            const dy = enemy.y - tower.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= tower.range && distance < closestDistance) {
                closest = enemy;
                closestDistance = distance;
            }
        });
        
        return closest;
    }

    shoot(tower, target) {
        this.gameState.projectiles.push({
            x: tower.x,
            y: tower.y,
            target: target,
            damage: tower.damage,
            speed: 5,
            type: tower.type
        });
    }

    updateProjectiles() {
        for (let i = this.gameState.projectiles.length - 1; i >= 0; i--) {
            const proj = this.gameState.projectiles[i];
            const dx = proj.target.x - proj.x;
            const dy = proj.target.y - proj.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < proj.speed) {
                proj.target.health -= proj.damage;
                this.gameState.projectiles.splice(i, 1);
            } else {
                proj.x += (dx / distance) * proj.speed;
                proj.y += (dy / distance) * proj.speed;
            }
        }
    }

    draw() {
        // Очистка canvas
        this.ctx.fillStyle = '#1a472a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем дорогу
        this.drawPath();
        
        // Рисуем таверну
        this.drawTavern();
        
        // Рисуем врагов
        this.drawEnemies();
        
        // Рисуем охранников
        this.drawTowers();
        
        // Рисуем снаряды
        this.drawProjectiles();
    }

    drawPath() {
        this.ctx.strokeStyle = '#8b4513';
        this.ctx.lineWidth = 40;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.path[0].x, this.path[0].y);
        
        for (let i = 1; i < this.path.length; i++) {
            this.ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        this.ctx.stroke();
        
        // Добавляем текстуру дороги
        this.ctx.strokeStyle = '#5d2906';
        this.ctx.lineWidth = 5;
        this.ctx.setLineDash([20, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.path[0].x, this.path[0].y);
        
        for (let i = 1; i < this.path.length; i++) {
            this.ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawTavern() {
        // Основное здание
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(this.tavern.x, this.tavern.y, this.tavern.width, this.tavern.height);
        
        // Крыша
        this.ctx.fillStyle = '#5d2906';
        this.ctx.beginPath();
        this.ctx.moveTo(this.tavern.x - 10, this.tavern.y);
        this.ctx.lineTo(this.tavern.x + this.tavern.width / 2, this.tavern.y - 30);
        this.ctx.lineTo(this.tavern.x + this.tavern.width + 10, this.tavern.y);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Окна
        this.ctx.fillStyle = '#ffd700';
        this.ctx.fillRect(this.tavern.x + 20, this.tavern.y + 30, 15, 20);
        this.ctx.fillRect(this.tavern.x + 65, this.tavern.y + 30, 15, 20);
        
        // Дверь
        this.ctx.fillStyle = '#5d2906';
        this.ctx.fillRect(this.tavern.x + 40, this.tavern.y + 50, 20, 40);
        
        // Название
        this.ctx.fillStyle = '#d4af37';
        this.ctx.font = 'bold 16px MedievalSharp';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Таверна', this.tavern.x + 50, this.tavern.y + 20);
    }

    drawEnemies() {
        this.gameState.enemies.forEach(enemy => {
            // Тело врага
            this.ctx.fillStyle = this.getEnemyColor(enemy.type);
            this.ctx.beginPath();
            this.ctx.arc(enemy.x, enemy.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Иконка
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(enemy.icon, enemy.x, enemy.y);
            
            // Полоска здоровья
            const healthWidth = 30;
            const healthPercent = enemy.health / enemy.maxHealth;
            
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(enemy.x - healthWidth / 2, enemy.y - 25, healthWidth, 5);
            
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillRect(enemy.x - healthWidth / 2, enemy.y - 25, healthWidth * healthPercent, 5);
            
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(enemy.x - healthWidth / 2, enemy.y - 25, healthWidth, 5);
        });
    }

    drawTowers() {
        this.gameState.towers.forEach(tower => {
            // Платформа
            this.ctx.fillStyle = '#696969';
            this.ctx.beginPath();
            this.ctx.arc(tower.x, tower.y, 25, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Охранник
            this.ctx.fillStyle = this.getTowerColor(tower.type);
            this.ctx.beginPath();
            this.ctx.arc(tower.x, tower.y, 20, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Иконка
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.getTowerIcon(tower.type), tower.x, tower.y);
            
            // Радиус атаки (при наведении)
            if (this.gameState.selectedTower === tower.type) {
                this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        });
    }

    drawProjectiles() {
        this.gameState.projectiles.forEach(proj => {
            this.ctx.fillStyle = this.getProjectileColor(proj.type);
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        if (this.gameState.waveActive) {
            const now = Date.now();
            
            // Спавн врагов
            if (this.gameState.enemiesSpawned < this.gameState.waveEnemiesCount && 
                now - this.gameState.lastSpawn > this.gameState.spawnInterval) {
                this.spawnEnemy();
                this.gameState.lastSpawn = now;
            }
            
            // Проверка окончания волны
            if (this.gameState.enemiesSpawned >= this.gameState.waveEnemiesCount && 
                this.gameState.enemies.length === 0) {
                this.endWave();
            }
            
            this.updateEnemies();
            this.updateTowers();
            this.updateProjectiles();
        }
    }

    endWave() {
        this.gameState.waveActive = false;
        this.gameState.wave++;
        this.gameState.waveTimer = 30;
        this.gameState.gold += 50; // Награда за волну
        
        this.addLog(`Волна ${this.gameState.wave - 1} завершена! Награда: 50 золота`);
        document.getElementById('start-wave').classList.remove('wave-starting');
        this.updateDisplay();
    }

    gameOver() {
        this.gameState.waveActive = false;
        this.addLog('Игра окончена! Таверна разрушена!', 'error');
        document.getElementById('start-wave').disabled = true;
    }

    addLog(message, type = 'info') {
        const log = document.getElementById('log');
        const p = document.createElement('p');
        p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        if (type === 'error') {
            p.style.color = '#ff6b6b';
        } else if (type === 'damage') {
            p.classList.add('damage');
        }
        
        log.appendChild(p);
        log.scrollTop = log.scrollHeight;
    }

    updateDisplay() {
        document.getElementById('health').textContent = this.gameState.health;
        document.getElementById('gold').textContent = this.gameState.gold;
        document.getElementById('wave').textContent = this.gameState.wave;
        document.getElementById('wave-timer').textContent = this.gameState.waveTimer;
        
        // Обновляем кнопку начала волны
