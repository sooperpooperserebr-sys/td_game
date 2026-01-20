// Игровые переменные
let gameState = {
    score: 0,
    health: 100,
    level: 1,
    visitorsDefeated: 0,
    gameActive: false,
    gamePaused: false,
    damage: 10,
    attackSpeed: 500, // мс между выстрелами
    lastShotTime: 0,
    visitorSpeed: 2,
    spawnRate: 2000, // мс между появлением посетителей
    maxVisitors: 5,
    activeVisitors: [],
    upgrades: {
        damage: 0,
        speed: 0,
        heal: 0
    },
    wave: 1,
    waveSize: 5,
    visitorsInWave: 0
};

// DOM элементы
const gameField = document.getElementById('gameField');
const healthFill = document.getElementById('healthFill');
const healthValue = document.getElementById('healthValue');
const levelElement = document.getElementById('level');
const visitorsDefeatedElement = document.getElementById('visitorsDefeated');
const scoreElement = document.getElementById('score');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const difficultySelect = document.getElementById('difficulty');
const messageElement = document.getElementById('message');
const upgradeButtons = document.querySelectorAll('.upgrade-btn');

// Звуковые эффекты
const shootSound = document.getElementById('shootSound');
const hitSound = document.getElementById('hitSound');
const upgradeSound = document.getElementById('upgradeSound');

// Инициализация игры
function initGame() {
    gameField.innerHTML = '';
    gameState.activeVisitors = [];
    
    // Сброс состояния игры
    gameState.score = 0;
    gameState.health = 100;
    gameState.level = 1;
    gameState.visitorsDefeated = 0;
    gameState.wave = 1;
    gameState.waveSize = 5;
    gameState.visitorsInWave = 0;
    
    // Сброс улучшений
    gameState.damage = 10;
    gameState.attackSpeed = 500;
    gameState.upgrades = {
        damage: 0,
        speed: 0,
        heal: 0
    };
    
    updateUI();
    setDifficulty();
    
    // Активация кнопок улучшений
    upgradeButtons.forEach(btn => {
        btn.disabled = false;
    });
}

// Обновление интерфейса
function updateUI() {
    healthFill.style.width = `${gameState.health}%`;
    healthValue.textContent = gameState.health;
    levelElement.textContent = gameState.level;
    visitorsDefeatedElement.textContent = gameState.visitorsDefeated;
    scoreElement.textContent = gameState.score;
    
    // Изменение цвета здоровья в зависимости от уровня
    if (gameState.health > 50) {
        healthFill.style.background = "linear-gradient(90deg, #78e08f, #38ada9)";
    } else if (gameState.health > 20) {
        healthFill.style.background = "linear-gradient(90deg, #fa983a, #e55039)";
    } else {
        healthFill.style.background = "linear-gradient(90deg, #e55039, #b71540)";
        healthFill.classList.add('pulse');
    }
}

// Установка сложности
function setDifficulty() {
    const difficulty = difficultySelect.value;
    
    switch(difficulty) {
        case 'easy':
            gameState.visitorSpeed = 1.5;
            gameState.spawnRate = 2500;
            gameState.maxVisitors = 4;
            break;
        case 'normal':
            gameState.visitorSpeed = 2;
            gameState.spawnRate = 2000;
            gameState.maxVisitors = 5;
            break;
        case 'hard':
            gameState.visitorSpeed = 2.5;
            gameState.spawnRate = 1500;
            gameState.maxVisitors = 6;
            break;
    }
}

// Создание посетителя
function createVisitor() {
    if (!gameState.gameActive || gameState.gamePaused) return;
    
    if (gameState.activeVisitors.length >= gameState.maxVisitors) return;
    
    if (gameState.visitorsInWave >= gameState.waveSize) return;
    
    gameState.visitorsInWave++;
    
    const visitor = document.createElement('div');
    visitor.classList.add('visitor');
    
    // Определяем тип посетителя
    let visitorType = 'normal';
    let health = 30;
    let speed = gameState.visitorSpeed;
    let points = 10;
    
    // Шанс появления быстрого посетителя
    if (Math.random() < 0.2) {
        visitorType = 'fast';
        health = 20;
        speed = gameState.visitorSpeed * 1.5;
        points = 15;
    }
    
    // Шанс появления босса на высоких уровнях
    if (gameState.level >= 3 && Math.random() < 0.1) {
        visitorType = 'boss';
        health = 100;
        speed = gameState.visitorSpeed * 0.7;
        points = 100;
    }
    
    visitor.classList.add(visitorType);
    
    // Устанавливаем иконку в зависимости от типа
    let icon = '';
    switch(visitorType) {
        case 'normal':
            icon = 'fas fa-user';
            break;
        case 'fast':
            icon = 'fas fa-running';
            break;
        case 'boss':
            icon = 'fas fa-crown';
            break;
    }
    
    visitor.innerHTML = `
        <i class="${icon}"></i>
        <div class="visitor-health">
            <div class="visitor-health-fill" data-health="${health}"></div>
        </div>
    `;
    
    // Позиционируем посетителя справа за пределами экрана
    const topPosition = Math.random() * (gameField.clientHeight - 100);
    visitor.style.top = `${topPosition}px`;
    visitor.style.right = `-100px`;
    
    // Добавляем данные посетителя
    visitor.dataset.health = health;
    visitor.dataset.maxHealth = health;
    visitor.dataset.speed = speed;
    visitor.dataset.points = points;
    visitor.dataset.type = visitorType;
    
    gameField.appendChild(visitor);
    gameState.activeVisitors.push(visitor);
    
    // Обработчик клика по посетителю
    visitor.addEventListener('click', () => attackVisitor(visitor));
    
    // Запускаем движение посетителя
    moveVisitor(visitor);
}

// Движение посетителя
function moveVisitor(visitor) {
    if (!gameState.gameActive || gameState.gamePaused) return;
    
    const speed = parseFloat(visitor.dataset.speed);
    const currentRight = parseFloat(visitor.style.right) || -100;
    
    // Двигаем посетителя влево
    const newRight = currentRight + speed;
    visitor.style.right = `${newRight}px`;
    
    // Если посетитель достиг башни
    if (newRight >= gameField.clientWidth - 150) {
        damageTower(visitor);
        return;
    }
    
    // Продолжаем движение
    if (gameState.gameActive && !gameState.gamePaused) {
        requestAnimationFrame(() => moveVisitor(visitor));
    }
}

// Атака посетителя
function attackVisitor(visitor) {
    if (!gameState.gameActive || gameState.gamePaused) return;
    
    const now = Date.now();
    if (now - gameState.lastShotTime < gameState.attackSpeed) return;
    
    gameState.lastShotTime = now;
    
    // Воспроизводим звук выстрела
    shootSound.currentTime = 0;
    shootSound.play();
    
    // Создаем эффект выстрела
    createBulletEffect(visitor);
    
    // Наносим урон
    let currentHealth = parseInt(visitor.dataset.health);
    currentHealth -= gameState.damage;
    visitor.dataset.health = currentHealth;
    
    // Обновляем полоску здоровья
    const healthFill = visitor.querySelector('.visitor-health-fill');
    const maxHealth = parseInt(visitor.dataset.maxHealth);
    const healthPercent = (currentHealth / maxHealth) * 100;
    healthFill.style.width = `${healthPercent}%`;
    
    // Если здоровье закончилось
    if (currentHealth <= 0) {
        destroyVisitor(visitor);
    } else {
        // Эффект попадания
        visitor.classList.add('shake');
        setTimeout(() => {
            visitor.classList.remove('shake');
        }, 500);
        
        // Воспроизводим звук попадания
        hitSound.currentTime = 0;
        hitSound.play();
    }
}

// Создание эффекта пули
function createBulletEffect(target) {
    const tower = document.getElementById('tower');
    const towerRect = tower.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    
    const bullet = document.createElement('div');
    bullet.classList.add('bullet');
    
    // Стартовая позиция (центр башни)
    const startX = towerRect.left + towerRect.width / 2;
    const startY = towerRect.top + towerRect.height / 2;
    
    // Конечная позиция (центр цели)
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;
    
    bullet.style.left = `${startX}px`;
    bullet.style.top = `${startY}px`;
    
    document.body.appendChild(bullet);
    
    // Анимация полета пули
    const duration = 200; // мс
    const startTime = Date.now();
    
    function animateBullet() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Линейная интерполяция
        const x = startX + (endX - startX) * progress;
        const y = startY + (endY - startY) * progress;
        
        bullet.style.left = `${x}px`;
        bullet.style.top = `${y}px`;
        
        if (progress < 1) {
            requestAnimationFrame(animateBullet);
        } else {
            // Удаляем пулю после достижения цели
            bullet.remove();
        }
    }
    
    animateBullet();
}

// Уничтожение посетителя
function destroyVisitor(visitor) {
    // Удаляем из массива активных посетителей
    const index = gameState.activeVisitors.indexOf(visitor);
    if (index > -1) {
        gameState.activeVisitors.splice(index, 1);
    }
    
    // Добавляем очки
    const points = parseInt(visitor.dataset.points);
    gameState.score += points;
    gameState.visitorsDefeated++;
    
    // Обновляем интерфейс
    updateUI();
    
    // Эффект уничтожения
    visitor.style.transform = 'scale(0)';
    visitor.style.opacity = '0';
    
    // Удаляем элемент после анимации
    setTimeout(() => {
        if (visitor.parentNode) {
            visitor.parentNode.removeChild(visitor);
        }
    }, 300);
    
    // Проверяем, закончена ли волна
    checkWaveCompletion();
}

// Урон башне
function damageTower(visitor) {
    // Урон зависит от типа посетителя
    let damage = 5;
    if (visitor.dataset.type === 'boss') damage = 20;
    if (visitor.dataset.type === 'fast') damage = 8;
    
    gameState.health -= damage;
    
    // Эффект повреждения башни
    const tower = document.getElementById('tower');
    tower.classList.add('shake');
    setTimeout(() => {
        tower.classList.remove('shake');
    }, 500);
    
    // Уничтожаем посетителя
    destroyVisitor(visitor);
    
    // Обновляем интерфейс
    updateUI();
    
    // Проверяем, проиграна ли игра
    if (gameState.health <= 0) {
        gameState.health = 0;
        endGame(false);
    }
}

// Проверка завершения волны
function checkWaveCompletion() {
    if (gameState.activeVisitors.length === 0 && gameState.visitorsInWave >= gameState.waveSize) {
        // Волна завершена
        gameState.wave++;
        gameState.visitorsInWave = 0;
        
        // Увеличиваем уровень каждые 3 волны
        if (gameState.wave % 3 === 0) {
            gameState.level++;
            
            // Увеличиваем сложность
            gameState.waveSize += 2;
            if (gameState.spawnRate > 800) {
                gameState.spawnRate -= 100;
            }
        }
        
        // Обновляем интерфейс
        updateUI();
        
        // Сообщение о новой волне
        showMessage(`Волна ${gameState.wave}`, 1500);
        
        // Запускаем следующую волну через 2 секунды
        setTimeout(() => {
            if (gameState.gameActive && !gameState.gamePaused) {
                // Создаем посетителей для новой волны
                for (let i = 0; i < Math.min(3, gameState.waveSize); i++) {
                    setTimeout(() => createVisitor(), i * 500);
                }
            }
        }, 2000);
    }
}

// Покупка улучшений
function buyUpgrade(upgradeType) {
    let cost = 0;
    
    switch(upgradeType) {
        case 'damage':
            cost = 50 + gameState.upgrades.damage * 25;
            if (gameState.score >= cost) {
                gameState.score -= cost;
                gameState.damage += 5;
                gameState.upgrades.damage++;
                showMessage("Урон увеличен!", 1000);
            } else {
                showMessage("Недостаточно очков!", 1000);
                return;
            }
            break;
            
        case 'heal':
            cost = 40 + gameState.upgrades.heal * 20;
            if (gameState.score >= cost) {
                gameState.score -= cost;
                gameState.health = Math.min(100, gameState.health + 25);
                gameState.upgrades.heal++;
                showMessage("Здоровье восстановлено!", 1000);
            } else {
                showMessage("Недостаточно очков!", 1000);
                return;
            }
            break;
            
        case 'speed':
            cost = 60 + gameState.upgrades.speed * 30;
            if (gameState.score >= cost) {
                gameState.score -= cost;
                gameState.attackSpeed = Math.max(100, gameState.attackSpeed - 50);
                gameState.upgrades.speed++;
                showMessage("Скорость атаки увеличена!", 1000);
            } else {
                showMessage("Недостаточно очков!", 1000);
                return;
            }
            break;
    }
    
    // Воспроизводим звук улучшения
    upgradeSound.currentTime = 0;
    upgradeSound.play();
    
    updateUI();
}

// Показать сообщение
function showMessage(text, duration = 2000) {
    messageElement.textContent = text;
    messageElement.style.display = 'block';
    
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, duration);
}

// Запуск игры
function startGame() {
    if (gameState.gameActive) return;
    
    initGame();
    gameState.gameActive = true;
    gameState.gamePaused = false;
    
    startBtn.innerHTML = '<i class="fas fa-play"></i> Игра идет...';
    startBtn.disabled = true;
    
    showMessage(`Волна ${gameState.wave}`, 1500);
    
    // Запускаем спавн посетителей
    setTimeout(() => {
        for (let i = 0; i < Math.min(3, gameState.waveSize); i++) {
            setTimeout(() => createVisitor(), i * 800);
        }
    }, 2000);
    
    // Запускаем интервал спавна
    gameState.spawnInterval = setInterval(() => {
        if (gameState.gameActive && !gameState.gamePaused) {
            createVisitor();
        }
    }, gameState.spawnRate);
}

// Пауза игры
function togglePause() {
    if (!gameState.gameActive) return;
    
    gameState.gamePaused = !gameState.gamePaused;
    
    if (gameState.gamePaused) {
        pauseBtn.innerHTML = '<i class="fas fa-play"></i> Продолжить';
        showMessage("Игра на паузе", 1000);
    } else {
        pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Пауза';
        // Возобновляем движение посетителей
        gameState.activeVisitors.forEach(visitor => {
            moveVisitor(visitor);
        });
    }
}

// Конец игры
function endGame(win) {
    gameState.gameActive = false;
    clearInterval(gameState.spawnInterval);
    
    startBtn.innerHTML = '<i class="fas fa-play"></i> Начать игру';
    startBtn.disabled = false;
    
    if (win) {
        showMessage("ПОБЕДА! Вы защитили башню!", 5000);
    } else {
        showMessage("ПОРАЖЕНИЕ! Башня разрушена!", 5000);
    }
}

// Обработчики событий
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);

restartBtn.addEventListener('click', () => {
    if (gameState.gameActive) {
        clearInterval(gameState.spawnInterval);
    }
    initGame();
    gameState.gameActive = false;
    gameState.gamePaused = false;
    
    startBtn.innerHTML = '<i class="fas fa-play"></i> Начать игру';
    startBtn.disabled = false;
    pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Пауза';
    
    showMessage("Готовы к новой игре?", 2000);
});

difficultySelect.addEventListener('change', () => {
    if (!gameState.gameActive) {
        setDifficulty();
    }
});

// Обработчики улучшений
upgradeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const upgradeType = btn.dataset.upgrade;
        buyUpgrade(upgradeType);
    });
});

// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    initGame();
    showMessage("Нажмите 'Начать игру' для старта!", 3000);
});
