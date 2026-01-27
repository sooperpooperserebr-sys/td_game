// Основные переменные игры
const gameState = {
    gold: 150,
    health: 100,
    wave: 1,
    maxWaves: 10,
    enemiesAlive: 0,
    enemiesTotal: 0,
    gameRunning: false,
    gameOver: false,
    selectedTowerType: 'archer',
    selectedTower: null,
    towers: [],
    enemies: [],
    bullets: [],
    pathCells: [],
    waveTimer: 30,
    waveInterval: null,
    gameLoopInterval: null
};

// Настройки башен
const towerConfig = {
    archer: { name: 'Лучник', cost: 50, damage: 10, range: 120, speed: 1.0, color: '#32cd32', icon: '🏹' },
    knight: { name: 'Рыцарь', cost: 100, damage: 25, range: 80, speed: 0.7, color: '#ff6347', icon: '⚔️' },
    wizard: { name: 'Маг', cost: 150, damage: 15, range: 150, speed: 0.9, color: '#9370db', icon: '🔮' }
};

// Настройки врагов
const enemyConfig = {
    drunkard: { name: 'Пьяница', health: 60, damage: 5, speed: 0.5, gold: 20, color: '#8b4513', icon: '🍺' },
    thief: { name: 'Вор', health: 30, damage: 10, speed: 1.0, gold: 15, color: '#696969', icon: '🗡️' },
    barbarian: { name: 'Варвар', health: 100, damage: 15, speed: 0.3, gold: 30, color: '#b22222', icon: '🪓' }
};

// DOM элементы
const elements = {
    health: document.getElementById('health'),
    healthFill: document.getElementById('healthFill'),
    gold: document.getElementById('gold'),
    wave: document.getElementById('wave'),
    enemiesLeft: document.getElementById('enemiesLeft'),
    waveTimer: document.getElementById('waveTimer'),
    gameGrid: document.getElementById('gameGrid'),
    startWave: document.getElementById('startWave'),
    upgradeTower: document.getElementById('upgradeTower'),
    sellTower: document.getElementById('sellTower'),
    restart: document.getElementById('restart'),
    log: document.getElementById('log'),
    nextWaveInfo: document.getElementById('nextWaveInfo'),
    selectedTowerText: document.getElementById('selectedTowerText'),
    towerStats: document.getElementById('towerStats')
};

// Путь для врагов (координаты в пикселях относительно gameGrid)
const path = [
    { x: 40, y: 40 },    // Начало пути (левая верхняя часть)
    { x: 40, y: 150 },
    { x: 150, y: 150 },
    { x: 150, y: 260 },
    { x: 260, y: 260 },
    { x: 260, y: 370 },
    { x: 370, y: 370 },
    { x: 370, y: 480 },
    { x: 480, y: 480 },
    { x: 480, y: 520 },
    { x: 520, y: 520 }   // Таверна (правая нижняя часть)
];

// Инициализация игры
function initGame() {
    createGrid();
    createPathCells();
    setupEventListeners();
    updateUI();
    startWaveTimer();
    addLogEntry("Добро пожаловать в 'Защиту Таверны'!", "success");
    addLogEntry("День 1. Таверна открыта! Приготовьтесь к ночи.");
    addLogEntry("Выберите охранников и расставьте их на поле.");
}

// Создание игровой сетки
function createGrid() {
    elements.gameGrid.innerHTML = '';
    
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 12; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // Сохраняем позицию клетки
            const rect = elements.gameGrid.getBoundingClientRect();
            const cellSize = rect.width / 12;
            cell.dataset.x = col * cellSize + cellSize / 2;
            cell.dataset.y = row * cellSize + cellSize / 2;
            
            cell.addEventListener('click', () => onCellClick(row, col, cell));
            elements.gameGrid.appendChild(cell);
        }
    }
}

// Создание клеток пути
function createPathCells() {
    gameState.pathCells = [];
    
    // Проходим по пути и отмечаем ближайшие клетки как путь
    path.forEach(point => {
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            const x = parseFloat(cell.dataset.x);
            const y = parseFloat(cell.dataset.y);
            const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
            
            if (distance < 35) { // 35px - радиус пути
                cell.classList.add('path');
                gameState.pathCells.push({
                    x: x,
                    y: y,
                    element: cell
                });
            }
        });
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопки выбора башен
    document.querySelectorAll('.buy-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const type = e.target.closest('.tower-card').dataset.type;
            selectTowerType(type);
        });
    });

    // Клики по карточкам башен
    document.querySelectorAll('.tower-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('buy-btn')) {
                const type = card.dataset.type;
                selectTowerType(type);
            }
        });
    });

    // Кнопки управления
    elements.startWave.addEventListener('click', startWave);
    elements.upgradeTower.addEventListener('click', upgradeSelectedTower);
    elements.sellTower.addEventListener('click', sellSelectedTower);
    elements.restart.addEventListener('click', restartGame);
}

// Выбор типа башни
function selectTowerType(type) {
    gameState.selectedTowerType = type;
    gameState.selectedTower = null;
    
    // Обновляем визуальное выделение
    document.querySelectorAll('.tower-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`.tower-card[data-type="${type}"]`).classList.add('selected');
    
    elements.selectedTowerText.innerHTML = `Выбрана башня: <strong>${towerConfig[type].name}</strong>`;
    elements.towerStats.textContent = `Уровень: 1 | Урон: ${towerConfig[type].damage} | Цена улучшения: 75 золота`;
    
    addLogEntry(`Выбрана башня: ${towerConfig[type].name}. Кликните на свободную клетку для установки.`);
}

// Обработка клика по клетке
function onCellClick(row, col, cell) {
    // Проверяем, находится ли клетка на пути
    if (cell.classList.contains('path')) {
        addLogEntry("Нельзя ставить башни на пути врагов!", "error");
        return;
    }
    
    // Проверяем, есть ли уже башня на этой клетке
    const cellX = parseFloat(cell.dataset.x);
    const cellY = parseFloat(cell.dataset.y);
    
    const existingTower = gameState.towers.find(t => 
        Math.abs(t.x - cellX) < 20 && Math.abs(t.y - cellY) < 20
    );
    
    if (existingTower) {
        // Выбираем существующую башню
        selectExistingTower(existingTower);
        return;
    }
    
    // Если выбрана башня для покупки
    if (gameState.selectedTowerType) {
        placeTower(row, col, cellX, cellY);
    }
}

// Размещение новой башни
function placeTower(row, col, x, y) {
    const towerType = gameState.selectedTowerType;
    const cost = towerConfig[towerType].cost;
    
    if (gameState.gold < cost) {
        addLogEntry(`Недостаточно золота! Нужно ${cost} золота.`, "error");
        return;
    }
    
    gameState.gold -= cost;
    
    const tower = {
        id: Date.now(),
        type: towerType,
        x: x,
        y: y,
        row: row,
        col: col,
        damage: towerConfig[towerType].damage,
        range: towerConfig[towerType].range,
        speed: towerConfig[towerType].speed,
        level: 1,
        lastShot: 0,
        target: null
    };
    
    gameState.towers.push(tower);
    updateUI();
    
    // Создаем визуальный элемент башни
    createTowerElement(tower);
    
    // Помечаем клетку как занятую башней
    const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
        cell.classList.add('tower');
    }
    
    addLogEntry(`Построен ${towerConfig[towerType].name} за ${cost} золота.`, "success");
}

// Создание визуального элемента башни
function createTowerElement(tower) {
    const towerElement = document.createElement('div');
    towerElement.className = `tower-placed ${tower.type}`;
    towerElement.dataset.id = tower.id;
    towerElement.innerHTML = towerConfig[tower.type].icon;
    towerElement.style.left = `${tower.x}px`;
    towerElement.style.top = `${tower.y}px`;
    
    towerElement.addEventListener('click', (e) => {
        e.stopPropagation();
        selectExistingTower(tower);
    });
    
    elements.gameGrid.appendChild(towerElement);
    return towerElement;
}

// Выбор существующей башни
function selectExistingTower(tower) {
    gameState.selectedTower = tower;
    gameState.selectedTowerType = null;
    
    // Снимаем выделение со всех башен
    document.querySelectorAll('.tower-placed').forEach(t => {
        t.classList.remove('selected');
    });
    
    // Выделяем выбранную башню
    const towerElement = document.querySelector(`.tower-placed[data-id="${tower.id}"]`);
    if (towerElement) {
        towerElement.classList.add('selected');
    }
    
    // Снимаем выделение с карточек башен
    document.querySelectorAll('.tower-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    elements.selectedTowerText.innerHTML = `Выбрана башня: <strong>${towerConfig[tower.type].name} (уровень ${tower.level})</strong>`;
    elements.towerStats.textContent = `Урон: ${tower.damage} | Дальность: ${tower.range} | Стоимость продажи: ${Math.floor(tower.level * towerConfig[tower.type].cost * 0.7)} золота`;
}

// Улучшение выбранной башни
function upgradeSelectedTower() {
    if (!gameState.selectedTower) {
        addLogEntry("Сначала выберите башню для улучшения!", "error");
        return;
    }
    
    const upgradeCost = 75;
    
    if (gameState.gold < upgradeCost) {
        addLogEntry(`Недостаточно золота для улучшения! Нужно ${upgradeCost} золота.`, "error");
        return;
    }
    
    const tower = gameState.selectedTower;
    tower.level++;
    tower.damage += 5;
    tower.range += 20;
    tower.speed += 0.1;
    
    gameState.gold -= upgradeCost;
    updateUI();
    
    // Обновляем отображение башни
    const towerElement = document.querySelector(`.tower-placed[data-id="${tower.id}"]`);
    if (towerElement) {
        towerElement.style.fontSize = `${1.5 + tower.level * 0.1}rem`;
    }
    
    elements.towerStats.textContent = `Урон: ${tower.damage} | Дальность: ${tower.range} | Стоимость продажи: ${Math.floor(tower.level * towerConfig[tower.type].cost * 0.7)} золота`;
    
    addLogEntry(`Башня улучшена до уровня ${tower.level}! Урон увеличен.`, "success");
}

// Продажа выбранной башни
function sellSelectedTower() {
    if (!gameState.selectedTower) {
        addLogEntry("Сначала выберите башню для продажи!", "error");
        return;
    }
    
    const tower = gameState.selectedTower;
    const sellPrice = Math.floor(tower.level * towerConfig[tower.type].cost * 0.7);
    
    // Удаляем башню из массива
    const index = gameState.towers.findIndex(t => t.id === tower.id);
    if (index !== -1) {
        gameState.towers.splice(index, 1);
    }
    
    // Удаляем визуальный элемент
    const towerElement = document.querySelector(`.tower-placed[data-id="${tower.id}"]`);
    if (towerElement) {
        towerElement.remove();
    }
    
    // Убираем отметку с клетки
    const cell = document.querySelector(`.grid-cell[data-row="${tower.row}"][data-col="${tower.col}"]`);
    if (cell) {
        cell.classList.remove('tower');
    }
    
    // Добавляем золото
    gameState.gold += sellPrice;
    updateUI();
    
    // Сбрасываем выбор
    gameState.selectedTower = null;
    elements.selectedTowerText.innerHTML = `Выберите башню для строительства или кликните на существующую`;
    elements.towerStats.textContent = `Уровень: - | Урон: - | Цена улучшения: -`;
    
    addLogEntry(`Башня продана за ${sellPrice} золота.`, "success");
}

// Запуск волны врагов
function startWave() {
    if (gameState.gameRunning) {
        addLogEntry("Волна уже идет! Дождитесь окончания.", "warning");
        return;
    }
    
    clearInterval(gameState.waveInterval);
    gameState.gameRunning = true;
    gameState.waveTimer = 0;
    elements.waveTimer.textContent = gameState.waveTimer;
    
    // Определяем количество и тип врагов для волны
    const baseCount = 3 + gameState.wave;
    gameState.enemiesTotal = Math.min(baseCount, 15);
    gameState.enemiesAlive = gameState.enemiesTotal;
    
    updateUI();
    
    addLogEntry(`Волна ${gameState.wave} началась! ${gameState.enemiesTotal} врагов атакуют!`, "warning");
    
    // Создаем врагов с задержкой
    let delay = 0;
    for (let i = 0; i < gameState.enemiesTotal; i++) {
        setTimeout(() => {
            if (gameState.gameRunning) {
                createEnemy();
            }
        }, delay);
        delay += 1500 - Math.min(gameState.wave * 100, 1000);
    }
    
    // Запускаем игровой цикл
    if (!gameState.gameLoopInterval) {
        gameState.gameLoopInterval = setInterval(gameLoop, 1000 / 60); // 60 FPS
    }
    
    elements.startWave.disabled = true;
}

// Создание врага
function createEnemy() {
    if (!gameState.gameRunning || gameState.gameOver) return;
    
    // Выбираем тип врага в зависимости от волны
    let enemyType;
    const rand = Math.random();
    
    if (gameState.wave <= 3) {
        enemyType = rand < 0.7 ? 'drunkard' : 'thief';
    } else if (gameState.wave <= 6) {
        if (rand < 0.4) enemyType = 'drunkard';
        else if (rand < 0.8) enemyType = 'thief';
        else enemyType = 'barbarian';
    } else {
        if (rand < 0.3) enemyType = 'drunkard';
        else if (rand < 0.6) enemyType = 'thief';
        else enemyType = 'barbarian';
    }
    
    const stats = enemyConfig[enemyType];
    
    const enemy = {
        id: Date.now(),
        type: enemyType,
        health: stats.health,
        maxHealth: stats.health,
        damage: stats.damage,
        speed: stats.speed,
        gold: stats.gold,
        position: 0, // Индекс текущей точки пути
        x: path[0].x,
        y: path[0].y,
        targetIndex: 1,
        reachedTavern: false
    };
    
    gameState.enemies.push(enemy);
    
    // Создаем визуальный элемент врага
    createEnemyElement(enemy);
}

// Создание визуального элемента врага
function createEnemyElement(enemy) {
    const enemyElement = document.createElement('div');
    enemyElement.className = `enemy ${enemy.type}`;
    enemyElement.dataset.id = enemy.id;
    enemyElement.innerHTML = enemyConfig[enemy.type].icon;
    enemyElement.style.left = `${enemy.x}px`;
    enemyElement.style.top = `${enemy.y}px`;
    
    // Добавляем полоску здоровья
    const healthBar = document.createElement('div');
    healthBar.className = 'health-bar';
    const healthFill = document.createElement('div');
    healthFill.className = 'health-fill';
    healthFill.style.width = '100%';
    healthBar.appendChild(healthFill);
    enemyElement.appendChild(healthBar);
    
    elements.gameGrid.appendChild(enemyElement);
    return enemyElement;
}

// Игровой цикл
function gameLoop() {
    if (!gameState.gameRunning || gameState.gameOver) {
        if (gameState.gameLoopInterval) {
            clearInterval(gameState.gameLoopInterval);
            gameState.gameLoopInterval = null;
        }
        return;
    }
    
    const currentTime = Date.now();
    
    // Обновляем врагов
    updateEnemies(currentTime);
    
    // Обновляем башни (атаки)
    updateTowers(currentTime);
    
    // Обновляем пули
    updateBullets(currentTime);
    
    // Проверяем конец волны
    if (gameState.enemiesAlive === 0 && gameState.enemies.length === 0) {
        endWave();
    }
}

// Обновление врагов
function updateEnemies(currentTime) {
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        
        if (enemy.reachedTavern) {
            // Враг достиг таверны
            gameState.health -= enemy.damage;
            updateUI();
            
            // Удаляем врага
            const enemyElement = document.querySelector(`.enemy[data-id="${enemy.id}"]`);
            if (enemyElement) enemyElement.remove();
            gameState.enemies.splice(i, 1);
            gameState.enemiesAlive--;
            
            addLogEntry(`${enemyConfig[enemy.type].name} атаковал таверну! -${enemy.damage} здоровья.`, "error");
            
            // Проверяем проигрыш
            if (gameState.health <= 0) {
                gameOver();
                return;
            }
            
            continue;
        }
        
        // Двигаем врага по пути
        const targetPoint = path[enemy.targetIndex];
        const dx = targetPoint.x - enemy.x;
        const dy = targetPoint.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 5) {
            // Достигли точки пути
            enemy.position = enemy.targetIndex;
            enemy.targetIndex++;
            
            if (enemy.targetIndex >= path.length) {
                enemy.reachedTavern = true;
                continue;
            }
        } else {
            // Двигаемся к точке
            const speed = enemy.speed * 2;
            enemy.x += (dx / distance) * speed;
            enemy.y += (dy / distance) * speed;
        }
        
        // Обновляем визуальную позицию
        const enemyElement = document.querySelector(`.enemy[data-id="${enemy.id}"]`);
        if (enemyElement) {
            enemyElement.style.left = `${enemy.x}px`;
            enemyElement.style.top = `${enemy.y}px`;
            
            // Обновляем полоску здоровья
            const healthFill = enemyElement.querySelector('.health-fill');
            if (healthFill) {
                const healthPercent = (enemy.health / enemy.maxHealth) * 100;
                healthFill.style.width = `${healthPercent}%`;
                
                // Меняем цвет в зависимости от здоровья
                if (healthPercent > 50) {
                    healthFill.style.background = 'linear-gradient(to right, #00ff00, #ffff00)';
                } else if (healthPercent > 25) {
                    healthFill.style.background = 'linear-gradient(to right, #ffff00, #ff9900)';
                } else {
                    healthFill.style.background = 'linear-gradient(to right, #ff9900, #ff0000)';
                }
            }
        }
    }
}

// Обновление башен
function updateTowers(currentTime) {
    gameState.towers.forEach(tower => {
        // Проверяем, можно ли стрелять
        if (currentTime - tower.lastShot < 1000 / tower.speed) {
            return;
        }
        
        // Ищем цель для атаки
        const target = findTargetForTower(tower);
        
        if (target) {
            // Стреляем по цели
            shootAtTarget(tower, target, currentTime);
            tower.lastShot = currentTime;
        }
    });
}

// Поиск цели для башни
function findTargetForTower(tower) {
    let closestEnemy = null;
    let closestDistance = Infinity;
    
    gameState.enemies.forEach(enemy => {
        if (enemy.reachedTavern) return;
        
        const dx = enemy.x - tower.x;
        const dy = enemy.y - tower.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= tower.range && distance < closestDistance) {
            closestDistance = distance;
            closestEnemy = enemy;
        }
    });
    
    return closestEnemy;
}

// Выстрел по цели
function shootAtTarget(tower, target, currentTime) {
    const bullet = {
        id: currentTime,
        towerId: tower.id,
        targetId: target.id,
        x: tower.x,
        y: tower.y,
        damage: tower.damage,
        type: tower.type,
        speed: 8 // пикселей за кадр
    };
    
    gameState.bullets.push(bullet);
    
    // Создаем визуальный элемент пули
    createBulletElement(bullet);
}

// Создание визуального элемента пули
function createBulletElement(bullet) {
    const bulletElement = document.createElement('div');
    bulletElement.className = `bullet ${bullet.type}`;
    bulletElement.dataset.id = bullet.id;
    bulletElement.style.left = `${bullet.x}px`;
    bulletElement.style.top = `${bullet.y}px`;
    
    elements.gameGrid.appendChild(bulletElement);
}

// Обновление пуль
function updateBullets() {
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        const bullet = gameState.bullets[i];
        
        // Находим цель
        const target = gameState.enemies.find(e => e.id === bullet.targetId);
        
        if (!target || target.reachedTavern) {
            // Цель исчезла, удаляем пулю
            const bulletElement = document.querySelector(`.bullet[data-id="${bullet.id}"]`);
            if (bulletElement) bulletElement.remove();
            gameState.bullets.splice(i, 1);
            continue;
        }
        
        // Двигаем пулю к цели
        const dx = target.x - bullet.x;
        const dy = target.y - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < bullet.speed) {
            // Попадание
            target.health -= bullet.damage;
            
            // Создаем эффект попадания
            createHitEffect(bullet.x, bullet.y);
            
            // Удаляем пулю
            const bulletElement = document.querySelector(`.bullet[data-id="${bullet.id}"]`);
            if (bulletElement) bulletElement.remove();
            gameState.bullets.splice(i, 1);
            
            // Проверяем, убит ли враг
            if (target.health <= 0) {
                killEnemy(target);
            }
        } else {
            // Продолжаем движение
            bullet.x += (dx / distance) * bullet.speed;
            bullet.y += (dy / distance) * bullet.speed;
            
            // Обновляем позицию
            const bulletElement = document.querySelector(`.bullet[data-id="${bullet.id}"]`);
            if (bulletElement) {
                bulletElement.style.left = `${bullet.x}px`;
                bulletElement.style.top = `${bullet.y}px`;
            }
        }
    }
}

// Эффект попадания
function createHitEffect(x, y) {
    const effect = document.createElement('div');
    effect.className = 'hit-effect';
    effect.style.left = `${x}px`;
    effect.style.top = `${y}px`;
    
    elements.gameGrid.appendChild(effect);
    
    // Удаляем эффект через 300 мс
    setTimeout(() => {
        if (effect.parentNode) {
            effect.parentNode.removeChild(effect);
        }
    }, 300);
}

// Убийство врага
function killEnemy(enemy) {
    // Начисляем золото
    gameState.gold += enemy.gold;
    
    // Удаляем врага из массива
    const index = gameState.enemies.findIndex(e => e.id === enemy.id);
    if (index !== -1) {
        gameState.enemies.splice(index, 1);
    }
    
    gameState.enemiesAlive--;
    
    // Удаляем визуальный элемент
    const enemyElement = document.querySelector(`.enemy[data-id="${enemy.id}"]`);
    if (enemyElement) {
        enemyElement.remove();
    }
    
    updateUI();
    addLogEntry(`${enemyConfig[enemy.type].name} уничтожен! +${enemy.gold} золота.`, "success");
}

// Завершение волны
function endWave() {
    if (!gameState.gameRunning) return;
    
    gameState.gameRunning = false;
    
    // Награда за волну
    const waveReward = 50 + gameState.wave * 10;
    gameState.gold += waveReward;
    
    // Переход к следующей волне
    gameState.wave++;
    
    updateUI();
    
    if (gameState.wave > gameState.maxWaves) {
        victory();
        return;
    }
    
    addLogEntry(`Волна завершена! Награда: ${waveReward} золота.`, "success");
    addLogEntry(`Приготовьтесь к волне ${gameState.wave}! Ночь начнется через 30 секунд.`);
    
    // Запускаем таймер до следующей волны
    startWaveTimer();
    elements.startWave.disabled = false;
}

// Старт таймера до следующей волны
function startWaveTimer() {
    if (gameState.waveInterval) {
        clearInterval(gameState.waveInterval);
    }
    
    gameState.waveTimer = 30;
    elements.waveTimer.textContent = gameState.waveTimer;
    
    gameState.waveInterval = setInterval(() => {
        gameState.waveTimer--;
        elements.waveTimer.textContent = gameState.waveTimer;
        
        if (gameState.waveTimer <= 0) {
            clearInterval(gameState.waveInterval);
            if (!gameState.gameRunning && !gameState.gameOver) {
                startWave();
            }
        }
    }, 1000);
}

// Победа в игре
function victory() {
    gameState.gameRunning = false;
    gameState.gameOver = true;
    
    clearInterval(gameState.gameLoopInterval);
    clearInterval(gameState.waveInterval);
    
    gameState.gameLoopInterval = null;
    gameState.waveInterval = null;
    
    addLogEntry("ПОБЕДА! Вы успешно защитили таверну от всех врагов!", "success");
    addLogEntry("Игра завершена. Нажмите 'Новая игра' для повторной игры.", "success");
    
    elements.startWave.disabled = true;
    
    // Показываем сообщение о победе
    setTimeout(() => {
        alert("ПОБЕДА! Вы защитили таверну от всех 10 волн врагов!");
    }, 500);
}

// Конец игры (проигрыш)
function gameOver() {
    gameState.gameRunning = false;
    gameState.gameOver = true;
    
    clearInterval(gameState.gameLoopInterval);
    clearInterval(gameState.waveInterval);
    
    gameState.gameLoopInterval = null;
    gameState.waveInterval = null;
    
    addLogEntry("ПОРАЖЕНИЕ! Таверна разрушена!", "error");
    addLogEntry("Игра окончена. Нажмите 'Новая игра' для повторной игры.", "error");
    
    elements.startWave.disabled = true;
    
    // Показываем сообщение о проигрыше
    setTimeout(() => {
        alert("Игра окончена! Ваша таверна была разрушена врагами!");
    }, 500);
}

// Перезапуск игры
function restartGame() {
    // Очищаем все интервалы
    clearInterval(gameState.gameLoopInterval);
    clearInterval(gameState.waveInterval);
    
    // Сбрасываем состояние игры
    gameState.gold = 150;
    gameState.health = 100;
    gameState.wave = 1;
    gameState.enemiesAlive = 0;
    gameState.enemiesTotal = 0;
    gameState.gameRunning = false;
    gameState.gameOver = false;
    gameState.selectedTowerType = 'archer';
    gameState.selectedTower = null;
    gameState.towers = [];
    gameState.enemies = [];
    gameState.bullets = [];
    gameState.waveTimer = 30;
    
    // Очищаем игровое поле
    document.querySelectorAll('.tower-placed, .enemy, .bullet, .hit-effect').forEach(el => {
        if (el.parentNode) el.parentNode.removeChild(el);
    });
    
    // Сбрасываем клетки
    document.querySelectorAll('.grid-cell').forEach(cell => {
        cell.classList.remove('tower');
    });
    
    // Обновляем интерфейс
    updateUI();
    selectTowerType('archer');
    
    // Очищаем журнал
    elements.log.innerHTML = '';
    
    addLogEntry("Новая игра началась! Защитите свою таверну!", "success");
    addLogEntry("День 1. Таверна открыта! Приготовьтесь к ночи.", "success");
    
    // Запускаем таймер
    startWaveTimer();
    elements.startWave.disabled = false;
}

// Обновление интерфейса
function updateUI() {
    elements.health.textContent = Math.max(0, gameState.health);
    elements.healthFill.style.width = `${Math.max(0, gameState.health)}%`;
    elements.gold.textContent = gameState.gold;
    elements.wave.textContent = gameState.wave;
    elements.enemiesLeft.textContent = gameState.enemiesAlive;
    
    // Обновляем информацию о следующей волне
    let waveDifficulty = "легкая";
    if (gameState.wave > 3 && gameState.wave <= 6) waveDifficulty = "средняя";
    else if (gameState.wave > 6) waveDifficulty = "тяжелая";
    
    elements.nextWaveInfo.textContent = `${gameState.wave} (${waveDifficulty})`;
    
    // Обновляем цвет здоровья таверны
    if (gameState.health > 70) {
        elements.healthFill.style.background = 'linear-gradient(to right, #00ff00, #00cc00)';
    } else if (gameState.health > 40) {
        elements.healthFill.style.background = 'linear-gradient(to right, #ffff00, #ff9900)';
    } else {
        elements.healthFill.style.background = 'linear-gradient(to right, #ff9900, #ff0000)';
    }
}

// Добавление записи в журнал
function addLogEntry(message, type = "info") {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    entry.textContent = `[${time}] ${message}`;
    
    elements.log.appendChild(entry);
    elements.log.scrollTop = elements.log.scrollHeight;
}

// Инициализация игры при загрузке страницы
window.addEventListener('DOMContentLoaded', initGame);

// Обновление пути при изменении размера окна
window.addEventListener('resize', () => {
    // Пересоздаем сетку и путь
    createGrid();
    createPathCells();
    
    // Перерисовываем башни
    gameState.towers.forEach(tower => {
        const towerElement = document.querySelector(`.tower-placed[data-id="${tower.id}"]`);
        if (towerElement) {
            // Обновляем позицию башни
            const cell = document.querySelector(`.grid-cell[data-row="${tower.row}"][data-col="${tower.col}"]`);
            if (cell) {
                tower.x = parseFloat(cell.dataset.x);
                tower.y = parseFloat(cell.dataset.y);
                towerElement.style.left = `${tower.x}px`;
                towerElement.style.top = `${tower.y}px`;
            }
        }
    });
});
