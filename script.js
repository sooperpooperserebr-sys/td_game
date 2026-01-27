// Основные переменные игры
let gold = 150;
let health = 100;
let wave = 1;
let enemiesLeft = 0;
let gameRunning = false;
let selectedTowerType = null;
let towers = [];
let enemies = [];
let bullets = [];
let path = [];
let towerLevels = { archer: 1, knight: 1, wizard: 1 };

// DOM элементы
const healthElement = document.getElementById('health');
const healthFillElement = document.getElementById('healthFill');
const goldElement = document.getElementById('gold');
const waveElement = document.getElementById('wave');
const enemiesLeftElement = document.getElementById('enemiesLeft');
const gameGrid = document.getElementById('gameGrid');
const startWaveButton = document.getElementById('startWave');
const upgradeTowerButton = document.getElementById('upgradeTower');
const restartButton = document.getElementById('restart');
const logElement = document.getElementById('log');
const buyButtons = document.querySelectorAll('.buy-btn');

// Инициализация игры
function initGame() {
    createGrid();
    createPath();
    setupEventListeners();
    addLogEntry("Игра началась! Защитите свою таверну!");
}

// Создание игровой сетки
function createGrid() {
    gameGrid.innerHTML = '';
    for (let i = 0; i < 96; i++) { // 12x8 = 96 клеток
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.index = i;
        
        // Проверяем, является ли клетка частью пути
        const row = Math.floor(i / 12);
        const col = i % 12;
        const isPath = path.some(p => p.row === row && p.col === col);
        
        if (isPath) {
            cell.classList.add('path');
        }
        
        cell.addEventListener('click', () => placeTower(row, col));
        gameGrid.appendChild(cell);
    }
}

// Создание пути для врагов
function createPath() {
    path = [];
    // Простой путь от левого верхнего угла к таверне (правый нижний угол)
    // Путь идет: верхний левый -> вниз -> направо -> вниз -> направо к таверне
    for (let col = 0; col < 3; col++) {
        path.push({row: 0, col: col});
    }
    for (let row = 0; row < 5; row++) {
        path.push({row: row, col: 3});
    }
    for (let col = 3; col < 9; col++) {
        path.push({row: 5, col: col});
    }
    for (let row = 5; row < 8; row++) {
        path.push({row: row, col: 9});
    }
    for (let col = 9; col < 12; col++) {
        path.push({row: 7, col: col});
    }
}

// Установка обработчиков событий
function setupEventListeners() {
    startWaveButton.addEventListener('click', startWave);
    upgradeTowerButton.addEventListener('click', upgradeTower);
    restartButton.addEventListener('click', restartGame);
    
    buyButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const type = e.target.closest('.tower-card').dataset.type;
            selectTower(type);
        });
    });
}

// Выбор башни для покупки
function selectTower(type) {
    const costs = { archer: 50, knight: 100, wizard: 150 };
    const cost = costs[type];
    
    if (gold >= cost) {
        selectedTowerType = type;
        addLogEntry(`Выбрана башня: ${getTowerName(type)}. Кликните на клетку для установки.`);
    } else {
        addLogEntry(`Недостаточно золота для ${getTowerName(type)}! Нужно ${cost} золота.`, 'error');
    }
}

// Размещение башни на сетке
function placeTower(row, col) {
    if (!selectedTowerType || gameRunning) return;
    
    // Проверяем, не находится ли клетка на пути
    const isPathCell = path.some(p => p.row === row && p.col === col);
    if (isPathCell) {
        addLogEntry("Нельзя ставить башни на пути врагов!", 'error');
        return;
    }
    
    // Проверяем, не занята ли клетка
    const cellIndex = row * 12 + col;
    const cell = document.querySelector(`.grid-cell[data-index="${cellIndex}"]`);
    if (cell.classList.contains('tower')) {
        addLogEntry("Клетка уже занята башней!", 'error');
        return;
    }
    
    const costs = { archer: 50, knight: 100, wizard: 150 };
    const cost = costs[selectedTowerType];
    
    if (gold >= cost) {
        gold -= cost;
        updateGold();
        
        // Добавляем башню в массив
        const tower = {
            id: towers.length,
            type: selectedTowerType,
            row: row,
            col: col,
            damage: getTowerDamage(selectedTowerType),
            range: getTowerRange(selectedTowerType),
            cooldown: 0,
            level: 1
        };
        towers.push(tower);
        
        // Визуализируем башню
        cell.classList.add('tower');
        const towerElement = document.createElement('div');
        towerElement.className = `tower-placed ${selectedTowerType}`;
        towerElement.innerHTML = getTowerIcon(selectedTowerType);
        towerElement.style.left = `${col * (100/12)}%`;
        towerElement.style.top = `${row * (100/8)}%`;
        towerElement.dataset.id = tower.id;
        gameGrid.appendChild(towerElement);
        
        addLogEntry(`Построена ${getTowerName(selectedTowerType)} за ${cost} золота.`);
        selectedTowerType = null;
    } else {
        addLogEntry(`Недостаточно золота! Нужно ${cost} золота.`, 'error');
    }
}

// Начало волны врагов
function startWave() {
    if (gameRunning) return;
    
    gameRunning = true;
    enemiesLeft = wave * 3 + 2;
    updateEnemiesLeft();
    addLogEntry(`Начинается волна ${wave}! Нападение ${enemiesLeft} врагов!`, 'warning');
    
    // Создаем врагов с задержкой
    let delay = 0;
    for (let i = 0; i < enemiesLeft; i++) {
        setTimeout(() => {
            createEnemy();
        }, delay);
        delay += 1000; // По одному врагу в секунду
    }
    
    // Запускаем игровой цикл
    gameLoop();
}

// Создание врага
function createEnemy() {
    if (!gameRunning) return;
    
    const types = ['drunkard', 'thief', 'barbarian'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const enemy = {
        id: enemies.length,
        type: type,
        health: getEnemyHealth(type),
        maxHealth: getEnemyHealth(type),
        speed: getEnemySpeed(type),
        position: 0, // Позиция на пути (0 = начало)
        x: 0,
        y: 0
    };
    
    enemies.push(enemy);
    updateEnemiesLeft();
    
    // Визуализируем врага
    const enemyElement = document.createElement('div');
    enemyElement.className = `enemy ${type}`;
    enemyElement.innerHTML = getEnemyIcon(type);
    enemyElement.dataset.id = enemy.id;
    gameGrid.appendChild(enemyElement);
    
    updateEnemyPosition(enemy);
}

// Игровой цикл
function gameLoop() {
    if (!gameRunning) return;
    
    // Обновляем врагов
    enemies.forEach(enemy => {
        enemy.position += enemy.speed;
        if (enemy.position >= path.length - 1) {
            // Враг достиг таверны
            enemyReachedTavern(enemy);
        } else {
            updateEnemyPosition(enemy);
        }
    });
    
    // Обновляем перезарядку башен
    towers.forEach(tower => {
        if (tower.cooldown > 0) {
            tower.cooldown--;
        } else {
            attackEnemies(tower);
        }
    });
    
    // Обновляем пули
    updateBullets();
    
    // Проверяем условие завершения волны
    if (enemies.length === 0 && enemiesLeft === 0) {
        endWave();
    } else {
        requestAnimationFrame(gameLoop);
    }
}

// Атака башнями
function attackEnemies(tower) {
    // Находим ближайшего врага в радиусе атаки
    const towerX = tower.col * (100/12) + (100/12)/2;
    const towerY = tower.row * (100/8) + (100/8)/2;
    
    let target = null;
    let minDistance = Infinity;
    
    enemies.forEach(enemy => {
        const distance = Math.sqrt(
            Math.pow(enemy.x - towerX, 2) + 
            Math.pow(enemy.y - towerY, 2)
        );
        
        if (distance <= tower.range && distance < minDistance) {
            minDistance = distance;
            target = enemy;
        }
    });
    
    if (target) {
        // Создаем пулю
        createBullet(tower, target);
        tower.cooldown = getTowerCooldown(tower.type);
    }
}

// Создание пули
function createBullet(tower, target) {
    const towerElement = document.querySelector(`.tower-placed[data-id="${tower.id}"]`);
    const towerRect = towerElement.getBoundingClientRect();
    const gameRect = gameGrid.getBoundingClientRect();
    
    const bullet = {
        towerId: tower.id,
        targetId: target.id,
        x: towerRect.left - gameRect.left + towerRect.width/2,
        y: towerRect.top - gameRect.top + towerRect.height/2,
        targetX: target.x,
        targetY: target.y,
        speed: 10,
        damage: tower.damage,
        type: tower.type
    };
    
    bullets.push(bullet);
    
    // Визуализируем пулю
    const bulletElement = document.createElement('div');
    bulletElement.className = `bullet ${tower.type}`;
    bulletElement.style.left = `${bullet.x}px`;
    bulletElement.style.top = `${bullet.y}px`;
    gameGrid.appendChild(bulletElement);
}

// Обновление пуль
function updateBullets() {
    bullets.forEach((bullet, index) => {
        const target = enemies.find(e => e.id === bullet.targetId);
        
        if (!target) {
            // Цель умерла, удаляем пулю
            bullets.splice(index, 1);
            document.querySelectorAll('.bullet').forEach(el => {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
            return;
        }
        
        // Двигаем пулю к цели
        const dx = bullet.targetX - bullet.x;
        const dy = bullet.targetY - bullet.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        if (distance < bullet.speed) {
            // Попадание по цели
            target.health -= bullet.damage;
            
            if (target.health <= 0) {
                // Уничтожение врага
                enemyKilled(target);
            }
            
            // Удаляем пулю
            bullets.splice(index, 1);
            document.querySelectorAll('.bullet').forEach(el => {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
        } else {
            bullet.x += (dx / distance) * bullet.speed;
            bullet.y += (dy / distance) * bullet.speed;
            
            // Обновляем позицию пули
            const bulletElements = document.querySelectorAll('.bullet');
            if (bulletElements[index]) {
                bulletElements[index].style.left = `${bullet.x}px`;
                bulletElements[index].style.top = `${bullet.y}px`;
            }
        }
    });
}

// Враг убит
function enemyKilled(enemy) {
    // Удаляем врага из массива
    const index = enemies.findIndex(e => e.id === enemy.id);
    if (index !== -1) {
        enemies.splice(index, 1);
        updateEnemiesLeft();
        
        // Награда за убийство
        const rewards = { drunkard: 20, thief: 15, barbarian: 30 };
        gold += rewards[enemy.type];
        updateGold();
        
        // Удаляем визуальный элемент
        const enemyElement = document.querySelector(`.enemy[data-id="${enemy.id}"]`);
        if (enemyElement) enemyElement.remove();
        
        addLogEntry(`${getEnemyName(enemy.type)} уничтожен! +${rewards[enemy.type]} золота.`);
    }
}

// Враг достиг таверны
function enemyReachedTavern(enemy) {
    // Урон таверне
    const damages = { drunkard: 5, thief: 10, barbarian: 15 };
    health -= damages[enemy.type];
    updateHealth();
    
    // Удаляем врага
    const index = enemies.findIndex(e => e.id === enemy.id);
    if (index !== -1) {
        enemies.splice(index, 1);
        updateEnemiesLeft();
        
        // Удаляем визуальный элемент
        const enemyElement = document.querySelector(`.enemy[data-id="${enemy.id}"]`);
        if (enemyElement) enemyElement.remove();
        
        addLogEntry(`${getEnemyName(enemy.type)} атаковал таверну! -${damages[enemy.type]} здоровья.`, 'error');
    }
    
    // Проверка на проигрыш
    if (health <= 0) {
        gameOver();
    }
}

// Обновление позиции врага
function updateEnemyPosition(enemy) {
    if (enemy.position >= path.length) return;
    
    const pathPoint = path[Math.floor(enemy.position)];
    enemy.x = (pathPoint.col * (100/12)) + (100/12)/2;
    enemy.y = (pathPoint.row * (100/8)) + (100/8)/2;
    
    const enemyElement = document.querySelector(`.enemy[data-id="${enemy.id}"]`);
    if (enemyElement) {
        enemyElement.style.left = `calc(${enemy.x}% - 15px)`;
        enemyElement.style.top = `calc(${enemy.y}% - 15px)`;
    }
}

// Завершение волны
function endWave() {
    gameRunning = false;
    wave++;
    gold += 100; // Награда за завершение волны
    updateGold();
    updateWave();
    
    addLogEntry(`Волна ${wave-1} завершена! Награда: 100 золота.`, 'success');
    
    if (wave > 10) {
        gameWin();
    }
}

// Улучшение башни
function upgradeTower() {
    if (gold >= 50 && towers.length > 0) {
        gold -= 50;
        updateGold();
        
        // Улучшаем случайную башню
        const randomIndex = Math.floor(Math.random() * towers.length);
        const tower = towers[randomIndex];
        tower.damage += 5;
        tower.range += 5;
        tower.level++;
        
        addLogEntry(`Башня ${getTowerName(tower.type)} улучшена до уровня ${tower.level}!`);
    } else {
        addLogEntry("Нужно 50 золота и хотя бы одна башня для улучшения!", 'error');
    }
}

// Обновление интерфейса
function updateHealth() {
    health = Math.max(0, health);
    healthElement.textContent = health;
    healthFillElement.style.width = `${health}%`;
}

function updateGold() {
    goldElement.textContent = gold;
}

function updateWave() {
    waveElement.textContent = wave;
}

function updateEnemiesLeft() {
    enemiesLeftElement.textContent = enemies.length;
}

// Добавление записи в журнал
function addLogEntry(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}] ${message}`;
    
    logElement.appendChild(entry);
    logElement.scrollTop = logElement.scrollHeight;
}

// Перезапуск игры
function restartGame() {
    gold = 150;
    health = 100;
    wave = 1;
    enemiesLeft = 0;
    gameRunning = false;
    selectedTowerType = null;
    towers = [];
    enemies = [];
    bullets = [];
    
    // Очистка визуальных элементов
    document.querySelectorAll('.tower-placed, .enemy, .bullet').forEach(el => el.remove());
    document.querySelectorAll('.grid-cell').forEach(cell => {
        cell.classList.remove('tower');
    });
    
    updateHealth();
    updateGold();
    updateWave();
    updateEnemiesLeft();
    
    logElement.innerHTML = '<div class="log-entry">Игра перезапущена! Защитите свою таверну!</div>';
    
    addLogEntry("Новая игра началась!");
}

// Конец игры (проигрыш)
function gameOver() {
    gameRunning = false;
    addLogEntry("Таверна разрушена! Игра окончена!", 'error');
    alert("Игра окончена! Ваша таверна была разрушена!");
}

// Победа в игре
function gameWin() {
    gameRunning = false;
    addLogEntry("Поздравляем! Вы защитили таверну от всех волн врагов!", 'success');
    alert("Победа! Вы успешно защитили таверну!");
}

// Вспомогательные функции
function getTowerName(type) {
    const names = { archer: 'Лучник', knight: 'Рыцарь', wizard: 'Маг' };
    return names[type] || type;
}

function getTowerIcon(type) {
    const icons = { archer: '🏹', knight: '⚔️', wizard: '🔮' };
    return icons[type] || '🛡️';
}

function getTowerDamage(type) {
    const damages = { archer: 15, knight: 25, wizard: 20 };
    return damages[type] || 10;
}

function getTowerRange(type) {
    const ranges = { archer: 40, knight: 20, wizard: 35 };
    return ranges[type] || 30;
}

function getTowerCooldown(type) {
    const cooldowns = { archer: 30, knight: 40, wizard: 50 };
    return cooldowns[type] || 30;
}

function getEnemyName(type) {
    const names = { drunkard: 'Пьяница', thief: 'Вор', barbarian: 'Варвар' };
    return names[type] || type;
}

function getEnemyIcon(type) {
    const icons = { drunkard: '🍺', thief: '🗡️', barbarian: '🪓' };
    return icons[type] || '👤';
}

function getEnemyHealth(type) {
    const healths = { drunkard: 60, thief: 30, barbarian: 100 };
    return healths[type] || 50;
}

function getEnemySpeed(type) {
    const speeds = { drunkard: 0.03, thief: 0.07, barbarian: 0.04 };
    return speeds[type] || 0.05;
}

// Инициализация игры при загрузке страницы
window.addEventListener('DOMContentLoaded', initGame);
