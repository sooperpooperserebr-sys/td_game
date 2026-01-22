// Основные переменные игры
let scene, camera, renderer, controls;
let gameState = {
    gold: 100,
    health: 100,
    wave: 1,
    enemiesLeft: 0,
    selectedTowerType: null,
    selectedTower: null,
    isWaveActive: false,
    towers: [],
    enemies: [],
    projectiles: [],
    pathPoints: [],
    isGameOver: false,
    isGameWon: false
};

// Элементы интерфейса
const goldElement = document.getElementById('gold');
const healthElement = document.getElementById('health');
const waveElement = document.getElementById('wave');
const enemiesLeftElement = document.getElementById('enemies-left');
const startWaveButton = document.getElementById('start-wave');
const upgradeTowerButton = document.getElementById('upgrade-tower');
const sellTowerButton = document.getElementById('sell-tower');
const restartButton = document.getElementById('restart-game');
const gameMessage = document.getElementById('game-message');
const towerOptions = document.querySelectorAll('.tower-option');

// Конфигурация игры
const gameConfig = {
    gridSize: 8,
    cellSize: 3,
    groundSize: 30,
    tavernPosition: { x: 0, y: 0, z: -10 }
};

// Инициализация Three.js сцены
function initScene() {
    // Создание сцены
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);
    
    // Создание камеры
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(20, 25, 20);
    camera.lookAt(0, 0, 0);
    
    // Создание рендерера
    const canvas = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight);
    renderer.setClearColor(0x1a1a2e);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Добавление элементов управления камерой
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    
    // Добавление освещения
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 30, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    scene.add(directionalLight);
    
    // Создание игрового поля
    createGameField();
    
    // Создание таверны
    createTavern();
    
    // Создание дорожки для врагов
    createEnemyPath();
    
    // Обработка изменения размера окна
    window.addEventListener('resize', onWindowResize);
    
    // Обработка кликов по игровому полю
    canvas.addEventListener('click', onCanvasClick);
    
    // Инициализация обработчиков событий интерфейса
    initEventListeners();
    
    // Запуск игрового цикла
    animate();
}

// Создание игрового поля
function createGameField() {
    // Создание земли
    const groundGeometry = new THREE.PlaneGeometry(gameConfig.groundSize, gameConfig.groundSize);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x3a2c1a,
        side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Создание сетки для размещения башен
    const gridHelper = new THREE.GridHelper(gameConfig.groundSize, gameConfig.gridSize, 0x8b7355, 0x5d4a2e);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);
    
    // Создание клеток для размещения башен
    for (let x = -gameConfig.groundSize/2 + gameConfig.cellSize/2; x < gameConfig.groundSize/2; x += gameConfig.cellSize) {
        for (let z = -gameConfig.groundSize/2 + gameConfig.cellSize/2; z < gameConfig.groundSize/2; z += gameConfig.cellSize) {
            // Не размещаем клетки слишком близко к таверне
            if (Math.sqrt(x*x + (z - gameConfig.tavernPosition.z)*(z - gameConfig.tavernPosition.z)) < 5) continue;
            
            const cellGeometry = new THREE.BoxGeometry(gameConfig.cellSize - 0.1, 0.1, gameConfig.cellSize - 0.1);
            const cellMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x5d4a2e,
                transparent: true,
                opacity: 0.3
            });
            const cell = new THREE.Mesh(cellGeometry, cellMaterial);
            cell.position.set(x, 0.05, z);
            cell.userData = { type: 'cell', x: Math.round(x), z: Math.round(z) };
            cell.receiveShadow = true;
            scene.add(cell);
        }
    }
}

// Создание таверны
function createTavern() {
    // Основание таверны
    const baseGeometry = new THREE.BoxGeometry(6, 4, 6);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.copy(gameConfig.tavernPosition);
    base.position.y = 2;
    base.castShadow = true;
    base.receiveShadow = true;
    scene.add(base);
    
    // Крыша таверны
    const roofGeometry = new THREE.ConeGeometry(4, 3, 4);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x5d2e2e });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.copy(gameConfig.tavernPosition);
    roof.position.y = 5.5;
    roof.castShadow = true;
    roof.receiveShadow = true;
    scene.add(roof);
    
    // Дверь таверны
    const doorGeometry = new THREE.BoxGeometry(2, 3, 0.2);
    const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x3a2c1a });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.copy(gameConfig.tavernPosition);
    door.position.z += 3;
    door.position.y = 1.5;
    door.castShadow = true;
    door.receiveShadow = true;
    scene.add(door);
    
    // Окна таверны
    for (let i = -1; i <= 1; i += 2) {
        const windowGeometry = new THREE.BoxGeometry(1, 1, 0.1);
        const windowMaterial = new THREE.MeshLambertMaterial({ color: 0xe6cc80 });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.copy(gameConfig.tavernPosition);
        window.position.x += i * 2;
        window.position.z += 3;
        window.position.y = 3;
        window.castShadow = true;
        window.receiveShadow = true;
        scene.add(window);
    }
    
    // Добавление пользовательских данных для таверны
    base.userData = { type: 'tavern', health: gameState.health };
}

// Создание пути для врагов
function createEnemyPath() {
    // Путь врагов - спираль к таверне
    const path = [];
    const radius = 12;
    const segments = 20;
    
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const r = radius * (1 - i / segments);
        const x = r * Math.cos(angle);
        const z = r * Math.sin(angle);
        path.push(new THREE.Vector3(x, 0.5, z));
    }
    
    // Последняя точка - таверна
    path.push(new THREE.Vector3(gameConfig.tavernPosition.x, 0.5, gameConfig.tavernPosition.z + 3));
    
    gameConfig.pathPoints = path;
    
    // Визуализация пути (для отладки)
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(path);
    const pathMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, opacity: 0.3, transparent: true });
    const pathLine = new THREE.Line(pathGeometry, pathMaterial);
    scene.add(pathLine);
}

// Создание башни
function createTower(type, position) {
    const tower = {
        type: type,
        position: position,
        level: 1,
        damage: 0,
        range: 0,
        fireRate: 0,
        lastShot: 0,
        mesh: null,
        target: null
    };
    
    let geometry, material, color;
    
    // Настройки в зависимости от типа башни
    switch(type) {
        case 'archer':
            color = 0x2e5d3a;
            tower.damage = 10;
            tower.range = 8;
            tower.fireRate = 1000; // мс
            break;
        case 'knight':
            color = 0x5d5d5d;
            tower.damage = 15;
            tower.range = 4;
            tower.fireRate = 1500;
            break;
        case 'wizard':
            color = 0x3a2c5d;
            tower.damage = 20;
            tower.range = 10;
            tower.fireRate = 2000;
            break;
    }
    
    // Создание 3D модели башни
    // Основание
    const baseGeometry = new THREE.CylinderGeometry(0.5, 0.7, 1, 8);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: color });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.copy(position);
    base.position.y = 0.5;
    base.castShadow = true;
    base.receiveShadow = true;
    
    // Верхняя часть (зависит от типа башни)
    let topGeometry;
    if (type === 'archer') {
        topGeometry = new THREE.ConeGeometry(0.4, 1.5, 8);
    } else if (type === 'knight') {
        topGeometry = new THREE.BoxGeometry(0.8, 1.5, 0.8);
    } else {
        topGeometry = new THREE.SphereGeometry(0.6, 8, 8);
    }
    
    const topMaterial = new THREE.MeshLambertMaterial({ color: color });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.copy(position);
    top.position.y = 1.75;
    top.castShadow = true;
    top.receiveShadow = true;
    
    // Группировка частей башни
    const towerGroup = new THREE.Group();
    towerGroup.add(base);
    towerGroup.add(top);
    towerGroup.position.copy(position);
    
    // Добавление пользовательских данных
    towerGroup.userData = { type: 'tower', tower: tower };
    tower.mesh = towerGroup;
    
    scene.add(towerGroup);
    gameState.towers.push(tower);
    
    return tower;
}

// Создание врага
function createEnemy(type) {
    const enemy = {
        type: type,
        health: 0,
        maxHealth: 0,
        speed: 0,
        damage: 0,
        reward: 0,
        position: gameConfig.pathPoints[0].clone(),
        pathIndex: 0,
        mesh: null
    };
    
    let geometry, color;
    
    // Настройки в зависимости от типа врага
    switch(type) {
        case 'drunk': // Пьяный посетитель
            color = 0x8b7355;
            enemy.health = 30;
            enemy.maxHealth = 30;
            enemy.speed = 0.03;
            enemy.damage = 5;
            enemy.reward = 10;
            geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
            break;
        case 'bandit': // Разбойник
            color = 0x5d2e2e;
            enemy.health = 20;
            enemy.maxHealth = 20;
            enemy.speed = 0.05;
            enemy.damage = 10;
            enemy.reward = 15;
            geometry = new THREE.ConeGeometry(0.5, 1.5, 8);
            break;
        case 'darkmage': // Темный маг
            color = 0x3a2c5d;
            enemy.health = 50;
            enemy.maxHealth = 50;
            enemy.speed = 0.02;
            enemy.damage = 20;
            enemy.reward = 25;
            geometry = new THREE.SphereGeometry(0.7, 8, 8);
            break;
    }
    
    const material = new THREE.MeshLambertMaterial({ color: color });
    const enemyMesh = new THREE.Mesh(geometry, material);
    enemyMesh.position.copy(enemy.position);
    enemyMesh.castShadow = true;
    enemyMesh.receiveShadow = true;
    
    // Добавление пользовательских данных
    enemyMesh.userData = { type: 'enemy', enemy: enemy };
    enemy.mesh = enemyMesh;
    
    scene.add(enemyMesh);
    gameState.enemies.push(enemy);
    
    return enemy;
}

// Создание снаряда
function createProjectile(tower, target) {
    const projectile = {
        tower: tower,
        target: target,
        damage: tower.damage,
        position: tower.position.clone(),
        mesh: null
    };
    
    let geometry, color;
    
    // Настройки в зависимости от типа башни
    switch(tower.type) {
        case 'archer':
            color = 0x2e5d3a;
            geometry = new THREE.ConeGeometry(0.1, 0.5, 4);
            break;
        case 'knight':
            color = 0x5d5d5d;
            geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
            break;
        case 'wizard':
            color = 0x9b30ff;
            geometry = new THREE.SphereGeometry(0.2, 8, 8);
            break;
    }
    
    const material = new THREE.MeshLambertMaterial({ color: color });
    const projectileMesh = new THREE.Mesh(geometry, material);
    projectileMesh.position.copy(projectile.position);
    projectileMesh.position.y = 2;
    projectileMesh.castShadow = true;
    projectileMesh.receiveShadow = true;
    
    projectile.mesh = projectileMesh;
    scene.add(projectileMesh);
    gameState.projectiles.push(projectile);
    
    return projectile;
}

// Обновление игры
function updateGame(deltaTime) {
    // Если игра окончена, не обновляем
    if (gameState.isGameOver || gameState.isGameWon) return;
    
    // Обновление врагов
    updateEnemies(deltaTime);
    
    // Обновление башен
    updateTowers(deltaTime);
    
    // Обновление снарядов
    updateProjectiles(deltaTime);
    
    // Проверка условий победы/поражения
    checkGameConditions();
}

// Обновление врагов
function updateEnemies(deltaTime) {
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        
        // Движение врага по пути
        if (enemy.pathIndex < gameConfig.pathPoints.length - 1) {
            const targetPoint = gameConfig.pathPoints[enemy.pathIndex + 1];
            const direction = targetPoint.clone().sub(enemy.position).normalize();
            
            enemy.position.add(direction.multiplyScalar(enemy.speed * deltaTime));
            enemy.mesh.position.copy(enemy.position);
            
            // Проверка достижения точки пути
            if (enemy.position.distanceTo(targetPoint) < 0.2) {
                enemy.pathIndex++;
            }
        } else {
            // Враг достиг таверны
            gameState.health -= enemy.damage;
            updateUI();
            
            // Удаление врага
            scene.remove(enemy.mesh);
            gameState.enemies.splice(i, 1);
            gameState.enemiesLeft = gameState.enemies.length;
            
            continue;
        }
        
        // Проверка здоровья врага
        if (enemy.health <= 0) {
            // Награда за убийство врага
            gameState.gold += enemy.reward;
            updateUI();
            
            // Удаление врага
            scene.remove(enemy.mesh);
            gameState.enemies.splice(i, 1);
            gameState.enemiesLeft = gameState.enemies.length;
        }
    }
}

// Обновление башен
function updateTowers(deltaTime) {
    const currentTime = Date.now();
    
    for (const tower of gameState.towers) {
        // Поиск цели
        if (!tower.target || tower.target.health <= 0) {
            tower.target = findTarget(tower);
        }
        
        // Атака цели
        if (tower.target && currentTime - tower.lastShot > tower.fireRate) {
            const distance = tower.position.distanceTo(tower.target.position);
            
            if (distance <= tower.range) {
                // Создание снаряда
                createProjectile(tower, tower.target);
                tower.lastShot = currentTime;
                
                // Для рыцаря (ближний бой) наносим урон сразу
                if (tower.type === 'knight') {
                    tower.target.health -= tower.damage;
                    
                    // Если враг убит, сбрасываем цель
                    if (tower.target.health <= 0) {
                        tower.target = null;
                    }
                }
            } else {
                tower.target = null;
            }
        }
    }
}

// Поиск цели для башни
function findTarget(tower) {
    let closestEnemy = null;
    let closestDistance = tower.range;
    
    for (const enemy of gameState.enemies) {
        const distance = tower.position.distanceTo(enemy.position);
        
        if (distance < closestDistance) {
            closestDistance = distance;
            closestEnemy = enemy;
        }
    }
    
    return closestEnemy;
}

// Обновление снарядов
function updateProjectiles(deltaTime) {
    for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
        const projectile = gameState.projectiles[i];
        
        // Проверка наличия цели
        if (!projectile.target || projectile.target.health <= 0) {
            scene.remove(projectile.mesh);
            gameState.projectiles.splice(i, 1);
            continue;
        }
        
        // Движение снаряда к цели
        const direction = projectile.target.position.clone().sub(projectile.position).normalize();
        const speed = 0.1 * deltaTime;
        projectile.position.add(direction.multiplyScalar(speed));
        projectile.mesh.position.copy(projectile.position);
        
        // Проверка попадания
        if (projectile.position.distanceTo(projectile.target.position) < 0.5) {
            // Нанесение урона
            projectile.target.health -= projectile.damage;
            
            // Удаление снаряда
            scene.remove(projectile.mesh);
            gameState.projectiles.splice(i, 1);
        }
    }
}

// Проверка условий игры
function checkGameConditions() {
    // Проверка поражения
    if (gameState.health <= 0) {
        gameState.isGameOver = true;
        showGameMessage("Вы проиграли! Таверна разрушена.");
        return;
    }
    
    // Проверка победы
    if (gameState.wave > 10 && gameState.enemies.length === 0 && !gameState.isWaveActive) {
        gameState.isGameWon = true;
        showGameMessage("Победа! Вы защитили таверну!");
        return;
    }
    
    // Проверка окончания волны
    if (gameState.isWaveActive && gameState.enemies.length === 0) {
        gameState.isWaveActive = false;
        
        // Награда за завершение волны
        gameState.gold += 50;
        updateUI();
        
        showGameMessage(`Волна ${gameState.wave} завершена!`, 1500);
        
        // Если не последняя волна, увеличиваем номер волны
        if (gameState.wave <= 10) {
            gameState.wave++;
            updateUI();
        }
    }
}

// Начало волны врагов
function startWave() {
    if (gameState.isWaveActive || gameState.isGameOver || gameState.isGameWon) return;
    
    gameState.isWaveActive = true;
    showGameMessage(`Волна ${gameState.wave} началась!`, 1500);
    
    // Создание врагов в зависимости от номера волны
    let enemyCount = 5 + gameState.wave * 2;
    if (enemyCount > 25) enemyCount = 25;
    
    gameState.enemiesLeft = enemyCount;
    updateUI();
    
    // Создание врагов с задержкой
    for (let i = 0; i < enemyCount; i++) {
        setTimeout(() => {
            if (!gameState.isWaveActive) return;
            
            let enemyType;
            const rand = Math.random();
            
            if (gameState.wave <= 3) {
                enemyType = rand < 0.7 ? 'drunk' : 'bandit';
            } else if (gameState.wave <= 6) {
                if (rand < 0.5) enemyType = 'drunk';
                else if (rand < 0.8) enemyType = 'bandit';
                else enemyType = 'darkmage';
            } else {
                if (rand < 0.3) enemyType = 'drunk';
                else if (rand < 0.6) enemyType = 'bandit';
                else enemyType = 'darkmage';
            }
            
            createEnemy(enemyType);
        }, i * 1000);
    }
}

// Обработка клика по игровому полю
function onCanvasClick(event) {
    if (gameState.isGameOver || gameState.isGameWon) return;
    
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    
    // Преобразование координат мыши в координаты Three.js
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Raycasting для определения объекта
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        const userData = clickedObject.userData;
        
        // Если клик по клетке и выбрана башня
        if (userData.type === 'cell' && gameState.selectedTowerType) {
            const position = new THREE.Vector3(userData.x, 0, userData.z);
            
            // Проверка стоимости башни
            const cost = getTowerCost(gameState.selectedTowerType);
            if (gameState.gold >= cost) {
                // Проверка, нет ли уже башни на этой клетке
                const towerHere = gameState.towers.find(t => 
                    Math.abs(t.position.x - position.x) < 0.1 && 
                    Math.abs(t.position.z - position.z) < 0.1
                );
                
                if (!towerHere) {
                    // Создание башни
                    createTower(gameState.selectedTowerType, position);
                    
                    // Вычитание стоимости
                    gameState.gold -= cost;
                    updateUI();
                    
                    // Сброс выбора башни
                    deselectTower();
                }
            } else {
                showGameMessage("Недостаточно золота!", 1000);
            }
        }
        // Если клик по башне
        else if (userData.type === 'tower') {
            // Выбор башни для улучшения/продажи
            selectTower(userData.tower);
        }
    }
}

// Получение стоимости башни
function getTowerCost(type) {
    switch(type) {
        case 'archer': return 30;
        case 'knight': return 50;
        case 'wizard': return 70;
        default: return 0;
    }
}

// Выбор типа башни
function selectTowerType(type) {
    gameState.selectedTowerType = type;
    gameState.selectedTower = null;
    
    // Обновление UI
    towerOptions.forEach(option => {
        if (option.dataset.type === type) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    
    // Отключение кнопок улучшения/продажи
    upgradeTowerButton.disabled = true;
    sellTowerButton.disabled = true;
}

// Выбор башни
function selectTower(tower) {
    gameState.selectedTower = tower;
    gameState.selectedTowerType = null;
    
    // Обновление UI
    towerOptions.forEach(option => option.classList.remove('selected'));
    
    // Включение кнопок улучшения/продажи
    upgradeTowerButton.disabled = false;
    sellTowerButton.disabled = false;
    
    // Подсветка выбранной башни
    gameState.towers.forEach(t => {
        if (t.mesh) {
            t.mesh.children.forEach(child => {
                child.material.emissive = t === tower ? new THREE.Color(0x333333) : new THREE.Color(0x000000);
            });
        }
    });
}

// Сброс выбора башни
function deselectTower() {
    gameState.selectedTowerType = null;
    gameState.selectedTower = null;
    
    // Обновление UI
    towerOptions.forEach(option => option.classList.remove('selected'));
    
    // Отключение кнопок улучшения/продажи
    upgradeTowerButton.disabled = true;
    sellTowerButton.disabled = true;
    
    // Сброс подсветки
    gameState.towers.forEach(t => {
        if (t.mesh) {
            t.mesh.children.forEach(child => {
                child.material.emissive = new THREE.Color(0x000000);
            });
        }
    });
}

// Улучшение башни
function upgradeTower() {
    if (!gameState.selectedTower || gameState.gold < 50) return;
    
    const tower = gameState.selectedTower;
    
    // Улучшение башни
    tower.level++;
    tower.damage += 5;
    tower.range += 1;
    tower.fireRate = Math.max(500, tower.fireRate - 100);
    
    // Вычитание стоимости улучшения
    gameState.gold -= 50;
    updateUI();
    
    // Визуальное улучшение башни
    if (tower.mesh && tower.mesh.children[1]) {
        tower.mesh.children[1].scale.multiplyScalar(1.2);
    }
    
    showGameMessage(`Башня улучшена до уровня ${tower.level}!`, 1000);
}

// Продажа башни
function sellTower() {
    if (!gameState.selectedTower) return;
    
    const tower = gameState.selectedTower;
    const refund = Math.floor(getTowerCost(tower.type) * 0.7);
    
    // Удаление башни
    scene.remove(tower.mesh);
    
    // Удаление из массива башен
    const index = gameState.towers.indexOf(tower);
    if (index > -1) {
        gameState.towers.splice(index, 1);
    }
    
    // Возврат золота
    gameState.gold += refund;
    updateUI();
    
    // Сброс выбора
    deselectTower();
    
    showGameMessage(`Башня продана за ${refund} золота!`, 1000);
}

// Показать сообщение в игре
function showGameMessage(text, duration = 3000) {
    gameMessage.textContent = text;
    gameMessage.style.display = 'block';
    
    if (duration > 0) {
        setTimeout(() => {
            gameMessage.style.display = 'none';
        }, duration);
    }
}

// Обновление интерфейса
function updateUI() {
    goldElement.textContent = gameState.gold;
    healthElement.textContent = gameState.health;
    waveElement.textContent = gameState.wave;
    enemiesLeftElement.textContent = gameState.enemiesLeft;
    
    // Обновление состояния кнопки начала волны
    startWaveButton.disabled = gameState.isWaveActive || gameState.isGameOver || gameState.isGameWon;
    
    // Обновление текста кнопки улучшения
    upgradeTowerButton.textContent = `Улучшить башню (${50})`;
    upgradeTowerButton.disabled = !gameState.selectedTower || gameState.gold < 50;
}

// Перезапуск игры
function restartGame() {
    // Удаление всех объектов из сцены
    while(scene.children.length > 0) { 
        scene.remove(scene.children[0]); 
    }
    
    // Сброс состояния игры
    gameState = {
        gold: 100,
        health: 100,
        wave: 1,
        enemiesLeft: 0,
        selectedTowerType: null,
        selectedTower: null,
        isWaveActive: false,
        towers: [],
        enemies: [],
        projectiles: [],
        isGameOver: false,
        isGameWon: false
    };
    
    // Инициализация сцены заново
    initScene();
    updateUI();
    deselectTower();
    
    showGameMessage("Новая игра началась!", 2000);
}

// Инициализация обработчиков событий
function initEventListeners() {
    // Обработчики для выбора башен
    towerOptions.forEach(option => {
        option.addEventListener('click', () => {
            selectTowerType(option.dataset.type);
        });
    });
    
    // Обработчики для кнопок
    startWaveButton.addEventListener('click', startWave);
    upgradeTowerButton.addEventListener('click', upgradeTower);
    sellTowerButton.addEventListener('click', sellTower);
    restartButton.addEventListener('click', restartGame);
}

// Обработка изменения размера окна
function onWindowResize() {
    const canvas = document.getElementById('game-canvas');
    const container = canvas.parentElement;
    
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Игровой цикл
let lastTime = 0;
function animate(currentTime = 0) {
    requestAnimationFrame(animate);
    
    const deltaTime = Math.min(currentTime - lastTime, 100) / 16;
    lastTime = currentTime;
    
    // Обновление игры
    updateGame(deltaTime);
    
    // Обновление элементов управления камерой
    controls.update();
    
    // Рендеринг сцены
    renderer.render(scene, camera);
}

// Инициализация игры при загрузке страницы
window.addEventListener('load', () => {
    initScene();
    updateUI();
    
    // Показать приветственное сообщение
    setTimeout(() => {
        showGameMessage("Защитите таверну от злых посетителей!", 3000);
    }, 500);
});
