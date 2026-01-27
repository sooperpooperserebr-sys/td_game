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
    towerStats: {
        archer: { damage: 10, range: 4, speed: 2.0, cost: 50, level: 1 },
        knight: { damage: 25, range: 2, speed: 1.2, cost: 100, level: 1 },
        wizard: { damage: 15, range: 5, speed: 1.5, cost: 150, level: 1 }
    },
    enemyStats: {
        drunkard: { health: 60, damage: 5, speed: 0.8, gold: 20 },
        thief: { health: 30, damage: 10, speed: 1.5, gold: 15 },
        barbarian: { health: 100, damage: 15, speed: 0.6, gold: 30 }
    },
    waveTimer: 30,
    waveInterval: null,
    gameLoopInterval: null,
    lastUpdateTime: Date.now()
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

// Путь для врагов (координаты в процентах)
const pathPoints = [
    { x: 4, y: 4 },    // Начало пути
    { x: 4, y: 20 },
    { x: 12, y: 20 },
    { x: 12, y: 36 },
    { x: 28, y: 36 },
    { x: 28, y: 52 },
    { x: 44, y: 52 },
    { x: 44, y: 68 },
    { x: 60, y: 68 },
    { x: 60, y: 84 },
    { x: 76, y: 84 },
    { x: 76, y: 92 },  // Таверна
];

// Инициализация игры
function initGame() {
    createGrid();
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
            
            // Проверяем, находится ли клетка на пути
            const cellX = (col / 12) * 100;
            const cellY = (row / 10) * 100;
            const isOnPath = isPointOnPath(cellX, cellY);
            
            if (isOnPath) {
                cell.classList.add('path');
            }
            
            cell.addEventListener('click', () => onCellClick(row, col));
            elements.gameGrid.appendChild(cell);
        }
    }
}

// Проверка, находится ли точка на пути
function isPointOnPath(x, y) {
    for (let i = 0; i < pathPoints.length - 1; i++) {
        const p1 = pathPoints[i];
        const p2 = pathPoints[i + 1];
        
        // Проверяем, находится ли точка около линии между p1 и p2
        const distance = pointToLineDistance(x, y, p1.x, p1.y, p2.x, p2.y);
        if (distance < 8) { // 8% - ширина пути
            return true;
        }
    }
    return false;
}

// Расстояние от точки до линии
function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопки выбора башен
    document.querySelectorAll('.buy-btn').forEach(button => {
        button.addEventListener('click', (e) => {
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

    // Обновление статистики башен в интерфейсе
    updateTowerStatsDisplay();
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
    
    const towerNames = {
        archer: 'Лучник',
        knight: 'Рыцарь',
        wizard: 'Маг'
    };
    
    elements.selectedTowerText.innerHTML = `Выбрана башня: <strong>${towerNames[type]}</strong>`;
    elements.towerStats.textContent = `Уровень: ${gameState.towerStats[type].level} | Урон: ${gameState.towerStats[type].damage} | Цена улучшения: 75 золота`;
    
    addLogEntry(`Выбрана башня: ${towerNames[type]}. Кликните на свободную клетку для установки.`);
}

// Обработка клика по клетке
function onCellClick(row, col) {
    const cellX = (col / 12) * 100;
    const cellY = (row / 10) * 100;
    
    if (isPointOnPath(cellX, cellY)) {
        addLogEntry("Нельзя ставить башни на пути врагов!", "error");
        return;
    }
    
    // Проверяем, есть ли уже башня на этой клетке
    const existingTower = gameState.towers.find(t => 
        Math.abs(t.x - cellX) < 5 && Math.abs(t.y - cellY) < 5
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
    const cost = gameState.towerStats[towerType].cost;
    
    if (gameState.gold < cost) {
        addLogEntry(`Недостаточно золота! Нужно ${cost} золота.`, "error");
        return;
    }
    
    gameState.gold -= cost;
    
    const tower = {
        id: Date.now() + Math.random(),
        type: towerType,
        x: x,
        y: y,
        row: row,
        col: col,
        damage: gameState.towerStats[towerType].damage,
        range: gameState.towerStats[towerType].range,
        speed: gameState.towerStats[towerType].speed,
        level: 1,
        lastShot: 0,
        target: null
    };
    
    gameState.towers.push(tower);
    updateUI();
    
    // Создаем визуальный элемент башни
    createTowerElement(tower);
    
    const towerNames = {
        archer: 'Лучник',
        knight: 'Рыцарь',
        wizard: 'Маг'
    };
    
    addLogEntry(`Построен ${towerNames[towerType]} за ${cost} золота.`);
}

// Создание визуального элемента башни
function createTowerElement(tower) {
    const towerElement = document.createElement('div');
    towerElement.className = `tower-placed ${tower.type}`;
    towerElement.dataset.id = tower.id;
    towerElement.innerHTML = getTowerIcon(tower.type);
    towerElement.style.left = `${tower.x}%`;
    towerElement.style.top = `${tower.y}%`;
    
    towerElement.addEventListener('click', (e) => {
        e.stopPropagation();
        selectExistingTower(tower);
    });
    
    elements.gameGrid.appendChild(towerElement);
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
    
    const towerNames = {
        archer: 'Лучник',
        knight: 'Рыцарь',
        wizard: 'Маг'
    };
    
    elements.selectedTowerText.innerHTML = `Выбрана башня: <strong>${towerNames[tower.type]} (уровень ${tower.level})</strong>`;
    elements.towerStats.textContent = `Урон: ${tower.damage} | Дальность: ${tower.range} | Стоимость продажи: ${Math.floor(tower.level * gameState.towerStats[tower.type].cost * 0.7)} золота`;
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
    tower.range += 0.5;
    tower.speed += 0.2;
    
    gameState.gold -= upgradeCost;
    updateUI();
    
    // Обновляем отображение башни
    const towerElement = document.querySelector(`.tower-placed[data-id="${tower.id}"]`);
    if (towerElement) {
        towerElement.style.fontSize = `${1.8 + tower.level * 0.2}rem`;
    }
    
    elements.towerStats.textContent = `Урон: ${tower.damage} | Дальность: ${tower.range} | Стоимость продажи: ${Math.floor(tower.level * gameState.towerStats[tower.type].cost * 0.7)} золота`;
    
    addLogEntry(`Башня улучшена до уровня ${tower.level}! Урон увеличен.`, "success");
}

// Продажа выбранной башни
function sellSelectedTower() {
    if (!gameState.selectedTower) {
        addLogEntry("Сначала выберите башню для продажи!", "error");
        return;
    }
    
    const tower = gameState.selectedTower;
    const sellPrice = Math.floor(tower.level * gameState.towerStats[tower.type].cost * 0.7);
    
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
        delay += 1500 - Math.min(gameState.wave * 100, 1000); // Увеличиваем частоту с волнами
    }
    
    // Запускаем игровой цикл
    if (!gameState.gameLoopInterval) {
        gameState.lastUpdateTime = Date.now();
        gameState.gameLoopInterval = setInterval(gameLoop, 16); // ~60 FPS
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
    
    const stats = gameState.enemyStats[enemyType];
    
    const enemy = {
        id: Date.now() + Math.random(),
        type: enemyType,
        health: stats.health,
        maxHealth: stats.health,
        damage: stats.damage,
        speed: stats.speed,
        gold: stats.gold,
        position: 0, // Позиция на пути (от 0 до 1)
        x: pathPoints[0].x,
        y: pathPoints[0].y,
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
    enemyElement.innerHTML = getEnemyIcon(enemy.type);
    enemyElement.style.left = `${enemy.x}%`;
    enemyElement.style.top = `${enemy.y}%`;
    
    // Добавляем полоску здоровья
    const healthBar = document.createElement('div');
    healthBar.className = 'enemy health-bar';
    const healthFill = document.createElement('div');
    healthFill.className = 'enemy health-fill';
    healthFill.style.width = '100%';
    healthBar.appendChild(healthFill);
    enemyElement.appendChild(healthBar);
    
    elements.gameGrid.appendChild(enemyElement);
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
    const deltaTime = (currentTime - gameState.lastUpdateTime) / 1000;
    gameState.lastUpdateTime = currentTime;
    
    // Обновляем врагов
    updateEnemies(deltaTime);
    
    // Обновляем башни (атаки)
    updateTowers(deltaTime);
    
    // Обновляем пули
    updateBullets(deltaTime);
    
    // Проверяем конец волны
    if (gameState.enemiesAlive === 0 && gameState.enemies.length === 0) {
        endWave();
    }
}

// Обновление врагов
function updateEnemies(deltaTime) {
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
            
            addLogEntry(`${getEnemyName(enemy.type)} атаковал таверну! -${enemy.damage} здоровья.`, "error");
            
            // Проверяем проигрыш
            if (gameState.health <= 0) {
                gameOver();
                return;
            }
            
            continue;
        }
        
        // Двигаем врага по пути
        enemy.position += enemy.speed * deltaTime * 0.05;
        
        if (enemy.position >= 1) {
            enemy.reachedTavern = true;
            continue;
        }
        
        // Вычисляем позицию на пути
        const segmentIndex = Math.floor(enemy.position * (pathPoints.length - 1));
        const segmentProgress = (enemy.position * (pathPoints.length - 1)) - segmentIndex;
        
        const p1 = pathPoints[segmentIndex];
        const p2 = pathPoints[segmentIndex + 1];
        
        enemy.x = p1.x + (p2.x - p1.x) * segmentProgress;
        enemy.y = p1.y + (p2.y - p1.y) * segmentProgress;
        
        // Обновляем визуальную позицию
        const enemyElement = document.querySelector(`.enemy[data-id="${enemy.id}"]`);
        if (enemyElement) {
            enemyElement.style.left = `${enemy.x}%`;
            enemyElement.style.top = `${enemy.y}%`;
            
            // Обновляем полоску здоровья
            const healthFill = enemyElement.querySelector('.health-fill');
            if (healthFill) {
                healthFill.style.width = `${(enemy.health / enemy.maxHealth) * 100}%`;
            }
        }
    }
}

// Обновление башен
function updateTowers(deltaTime) {
    gameState.towers.forEach(tower => {
        tower.lastShot += deltaTime;
        
        if (tower.lastShot >= 1 / tower.speed) {
            // Ищем цель для атаки
            const target = findTargetForTower(tower);
            
            if (target) {
                // Стреляем по цели
                shootAtTarget(tower, target);
                tower.lastShot = 0;
            }
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
        
        if (distance <= tower.range * 8 && distance < closestDistance) { // 8% на единицу дальности
            closestDistance = distance;
            closestEnemy = enemy;
        }
    });
    
    return closestEnemy;
}

// Выстрел по цели
function shootAtTarget(tower, target) {
    const bullet = {
        id: Date.now() + Math.random(),
        towerId: tower.id,
        targetId: target.id,
        x: tower.x,
        y: tower.y,
        damage: tower.damage,
        type: tower.type,
        speed: 10
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
    bulletElement.style.left = `${bullet.x}%`;
    bulletElement.style.top = `${bullet.y}%`;
    
    elements.gameGrid.appendChild(bulletElement);
}

// Обновление пуль
function updateBullets(deltaTime) {
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
        
        if (distance < bullet.speed * deltaTime * 50) {
            // Попадание
            target.health -= bullet.damage;
            
            // Удаляем пулю
            const bulletElement = document.querySelector(`.bullet[data-id="${bullet.id}"]`);
            if (bulletElement) bulletElement.remove();
            gameState.bullets.splice(i, 1);
            
            // Проверяем, убит ли враг
            if (target.health <= 0) {
                killEnemy(target);
            }
            
            // Эффект попадания
            createHitEffect(bullet.x, bullet.y);
        } else {
            // Продолжаем движение
            bullet.x += (dx / distance) * bullet.speed * deltaTime * 50;
            bullet.y += (dy / distance) * bullet.speed * deltaTime * 50;
            
            // Обновляем позицию
            const bulletElement = document.querySelector(`.bullet[data-id="${bullet.id}"]`);
            if (bulletElement) {
                bulletElement.style.left = `${bullet.x}%`;
                bulletElement.style.top = `${bullet.y}%`;
            }
        }
    }
}

// Эффект попадания
function createHitEffect(x, y) {
    const effect = document.createElement('div');
    effect.className = 'hit-effect';
    effect.style.left = `${x}%`;
    effect.style.top = `${y}%`;
    effect.style.position = 'absolute';
    effect.style.width = '20px';
    effect.style.height = '20px';
    effect.style.borderRadius = '50%';
    effect.style.backgroundColor = '#ff4444';
    effect.style.opacity = '0.7';
    effect.style.transform = 'translate(-50%, -50%)';
    effect.style.zIndex = '6';
    
    elements.gameGrid.appendChild(effect);
    
    // Анимация исчезновения
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
    
    // Удаляем врага
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
    addLogEntry(`${getEnemyName(enemy.type)} уничтожен! +${enemy.gold} золота.`, "success");
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
    
    if (gameState.gameLoopInterval) {
        clearInterval(gameState.gameLoopInterval);
        gameState.gameLoopInterval = null;
    }
    
    if (gameState.waveInterval) {
        clearInterval(gameState.waveInterval);
    }
    
    addLogEntry("ПОБЕДА! Вы успешно защитили таверну от всех врагов!", "success");
    addLogEntry("Игра завершена. Нажмите 'Новая игра' для повторной игры.", "success");
    
    elements.startWave.disabled = true;
    alert("ПОБЕДА! Вы защитили таверну от всех 10 волн врагов!");
}

// Конец игры (проигрыш)
function gameOver() {
    gameState.gameRunning = false;
    gameState.gameOver = true;
    
    if (gameState.gameLoopInterval) {
        clearInterval(gameState.gameLoopInterval);
        gameState.gameLoopInterval = null;
    }
    
    if (gameState.waveInterval) {
        clearInterval(gameState.waveInterval);
    }
    
    addLogEntry("ПОРАЖЕНИЕ! Таверна разрушена!", "error");
    addLogEntry("Игра окончена. Нажмите 'Новая игра' для повторной игры.", "error");
    
    elements.startWave.disabled = true;
    alert("Игра окончена! Ваша таверна была разрушена врагами!");
}

// Перезапуск игры
function restartGame() {
    // Очищаем все интервалы
    if (gameState.gameLoopInterval) {
        clearInterval(gameState.gameLoopInterval);
        gameState.gameLoopInterval = null;
    }
    
    if (gameState.waveInterval) {
        clearInterval(gameState.waveInterval);
    }
    
    // Сбрасываем состояние игры
    Object.assign(gameState, {
        gold: 150,
        health: 100,
        wave: 1,
        enemiesAlive: 0,
        enemiesTotal: 0,
        gameRunning: false,
        gameOver: false,
        selectedTowerType: 'archer',
        selectedTower: null,
        towers: [],
        enemies: [],
        bullets: [],
        towerStats: {
            archer: { damage: 10, range: 4, speed: 2.0, cost: 50, level: 1 },
            knight: { damage: 25, range: 2, speed: 1.2, cost: 100, level: 1 },
            wizard: { damage: 15, range: 5, speed: 1.5, cost: 150, level: 1 }
        },
        waveTimer: 30
    });
    
    // Очищаем игровое поле
    document.querySelectorAll('.tower-placed, .enemy, .bullet, .hit-effect').forEach(el => {
        if (el.parentNode) el.parentNode.removeChild(el);
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
    elements.health.textContent = gameState.health;
    elements.healthFill.style.width = `${gameState.health}%`;
    elements.gold.textContent = gameState.gold;
    elements.wave.textContent = gameState.wave;
    elements.enemiesLeft.textContent = gameState.enemiesAlive;
    
    // Обновляем информацию о следующей волне
    let waveDifficulty = "легкая";
    if (gameState.wave > 3 && gameState.wave <= 6) waveDifficulty = "средняя";
    else if (gameState.wave > 6) waveDifficulty = "тяжелая";
    
    elements.nextWaveInfo.textContent = `${gameState.wave} (${waveDifficulty})`;
    
    // Обновляем статистику башен
    updateTowerStatsDisplay();
}

// Обновление отображения статистики башен
function updateTowerStatsDisplay() {
    document.getElementById('archerDamage').textContent = gameState.towerStats.archer.damage;
    document.getElementById('archerRange').textContent = gameState.towerStats.archer.range;
    document.getElementById('archerSpeed').textContent = gameState.towerStats.archer.speed;
    
    document.getElementById('knightDamage').textContent = gameState.towerStats.knight.damage;
    document.getElementById('knightRange').textContent = gameState.towerStats.knight.range;
    document.getElementById('knightSpeed').textContent = gameState.towerStats.knight.speed;
    
    document.getElementById('wizardDamage').textContent = gameState.towerStats.wizard.damage;
    document.getElementById('wizardRange').textContent = gameState.towerStats.wizard.range;
    document.getElementById('wizardSpeed').textContent = gameState.towerStats.wizard.speed;
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

// Вспомогательные функции
function getTowerIcon(type) {
    const icons = { archer: '🏹', knight: '⚔️', wizard: '🔮' };
    return icons[type] || '🛡️';
}

function getEnemyIcon(type) {
    const icons = { drunkard: '🍺', thief: '🗡️', barbarian: '🪓' };
    return icons[type] || '👤';
}

function getEnemyName(type) {
    const names = { drunkard: 'Пьяница', thief: 'Вор', barbarian: 'Варвар' };
    return names[type] || type;
}

// Инициализация игры при загрузке страницы
window.addEventListener('DOMContentLoaded', initGame);
