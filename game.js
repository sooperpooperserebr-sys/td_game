// script.js
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация игры
    const game = {
        gold: 150,
        wave: 1,
        tavernHealth: 100,
        maxHealth: 100,
        isNight: false,
        waveActive: false,
        towers: [],
        enemies: [],
        projectiles: [],
        selectedTowerType: null,
        selectedTower: null,
        placingTower: false,
        cellSize: 4,
        grid: [],
        path: [],
        lastSpawn: 0,
        spawnInterval: 2000,
        enemiesInWave: 5,
        enemiesSpawned: 0,
        lastFrameTime: 0
    };

    // Элементы DOM
    const goldElement = document.getElementById('goldValue');
    const waveElement = document.getElementById('waveValue');
    const healthElement = document.getElementById('healthValue');
    const healthBar = document.getElementById('tavernHealth');
    const nightIndicator = document.getElementById('nightIndicator');
    const nightStatus = document.getElementById('nightStatus');
    const startWaveBtn = document.getElementById('startWaveBtn');
    const upgradeBtn = document.getElementById('upgradeBtn');
    const sellBtn = document.getElementById('sellBtn');
    const selectedTowerInfo = document.getElementById('selectedTowerInfo');
    const gameMessage = document.getElementById('gameMessage');
    const gameCanvas = document.getElementById('gameCanvas');

    // Инициализация Three.js сцены
    let scene, camera, renderer, controls;
    let towerCards = document.querySelectorAll('.tower-card');
    
    // Инициализация Three.js
    function initThreeJS() {
        // Создание сцены
        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);
        
        // Создание камеры
        camera = new THREE.PerspectiveCamera(75, gameCanvas.clientWidth / gameCanvas.clientHeight, 0.1, 1000);
        camera.position.set(25, 20, 25);
        camera.lookAt(0, 0, 0);
        
        // Создание рендерера
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(gameCanvas.clientWidth, gameCanvas.clientHeight);
        renderer.setClearColor(0x1a1a2e);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        gameCanvas.appendChild(renderer.domElement);
        
        // Орбитальные контролы для камеры
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2;
        controls.minDistance = 10;
        controls.maxDistance = 50;
        
        // Освещение
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        
        // Лунный свет (для ночи)
        const moonLight = new THREE.DirectionalLight(0x6688cc, 0);
        moonLight.position.set(-10, 20, -5);
        moonLight.castShadow = true;
        scene.add(moonLight);
        game.moonLight = moonLight;
        
        // Создание игрового поля
        createGameField();
        
        // Создание таверны
        createTavern();
        
        // Создание пути для врагов
        createPath();
        
        // Запуск анимации
        animate();
    }
    
    // Создание игрового поля
    function createGameField() {
        const fieldSize = 30;
        const gridHelper = new THREE.GridHelper(fieldSize, fieldSize/2, 0x444444, 0x222222);
        scene.add(gridHelper);
        
        // Создание земли
        const groundGeometry = new THREE.PlaneGeometry(fieldSize, fieldSize);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3d2b1f,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
        
        // Создание дороги
        const roadGeometry = new THREE.PlaneGeometry(6, fieldSize);
        const roadMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x5d4037,
            roughness: 0.9,
            metalness: 0.1
        });
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.rotation.x = -Math.PI / 2;
        road.position.z = 5;
        road.receiveShadow = true;
        scene.add(road);
        
        // Создание области для размещения башен
        const gridPositions = [];
        for (let x = -12; x <= 12; x += game.cellSize) {
            for (let z = -12; z <= 12; z += game.cellSize) {
                // Не размещаем башни на дороге
                if (Math.abs(z - 5) < 3 && Math.abs(x) < 3) continue;
                
                gridPositions.push({x, z});
                
                // Визуализация ячеек для отладки
                const cellGeometry = new THREE.BoxGeometry(game.cellSize - 0.2, 0.1, game.cellSize - 0.2);
                const cellMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.1,
                    visible: false // Скрываем для финальной версии
                });
                const cell = new THREE.Mesh(cellGeometry, cellMaterial);
                cell.position.set(x, 0.05, z);
                cell.userData = { type: 'cell', x, z };
                scene.add(cell);
                game.grid.push({x, z, occupied: false, mesh: cell});
            }
        }
    }
    
    // Создание таверны
    function createTavern() {
        // Основание таверны
        const baseGeometry = new THREE.BoxGeometry(8, 6, 8);
        const baseMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.9,
            metalness: 0.1
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(0, 3, -12);
        base.castShadow = true;
        base.receiveShadow = true;
        scene.add(base);
        
        // Крыша таверны
        const roofGeometry = new THREE.ConeGeometry(6, 4, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b0000,
            roughness: 0.8,
            metalness: 0.2
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(0, 8, -12);
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        scene.add(roof);
        
        // Дверь таверны
        const doorGeometry = new THREE.BoxGeometry(2, 4, 0.5);
        const doorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x5d4037,
            roughness: 0.8,
            metalness: 0.3
        });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 2, -8.5);
        door.castShadow = true;
        scene.add(door);
        
        // Окна таверны
        for (let i = -1; i <= 1; i += 2) {
            const windowGeometry = new THREE.BoxGeometry(1.5, 1.5, 0.2);
            const windowMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x87CEEB,
                emissive: 0x222222,
                roughness: 0.1,
                metalness: 0.9
            });
            const window = new THREE.Mesh(windowGeometry, windowMaterial);
            window.position.set(i * 2, 4, -8.5);
            window.castShadow = true;
            scene.add(window);
        }
        
        game.tavern = { base, roof, door, health: game.tavernHealth };
    }
    
    // Создание пути для врагов
    function createPath() {
        // Путь состоит из контрольных точек
        game.path = [
            {x: -15, z: 5},
            {x: -5, z: 5},
            {x: -5, z: 15},
            {x: 5, z: 15},
            {x: 5, z: 5},
            {x: 0, z: 5},
            {x: 0, z: -8}  // Таверна
        ];
        
        // Визуализация пути (для отладки)
        const pathPoints = game.path.map(p => new THREE.Vector3(p.x, 0.1, p.z));
        const pathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
        const pathMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, visible: false }); // Скрываем в финальной версии
        const pathLine = new THREE.Line(pathGeometry, pathMaterial);
        scene.add(pathLine);
    }
    
    // Создание башни
    function createTower(type, x, z) {
        const tower = {
            type,
            x,
            z,
            level: 1,
            damage: type === 'archer' ? 10 : type === 'knight' ? 20 : 15,
            range: type === 'archer' ? 12 : type === 'knight' ? 6 : 10,
            attackSpeed: type === 'archer' ? 1.5 : type === 'knight' ? 1 : 2,
            lastAttack: 0,
            target: null,
            mesh: null
        };
        
        let geometry, material, height;
        
        // Создание 3D модели башни в зависимости от типа
        switch(type) {
            case 'archer':
                height = 5;
                geometry = new THREE.CylinderGeometry(1.5, 2, height, 8);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0x8B4513,
                    roughness: 0.8,
                    metalness: 0.2
                });
                break;
            case 'knight':
                height = 6;
                geometry = new THREE.BoxGeometry(3, height, 3);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0x808080,
                    roughness: 0.7,
                    metalness: 0.3
                });
                break;
            case 'mage':
                height = 5;
                geometry = new THREE.ConeGeometry(2, height, 6);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0x4b0082,
                    roughness: 0.5,
                    metalness: 0.5,
                    emissive: 0x220022
                });
                break;
        }
        
        const towerMesh = new THREE.Mesh(geometry, material);
        towerMesh.position.set(x, height/2, z);
        towerMesh.castShadow = true;
        towerMesh.receiveShadow = true;
        scene.add(towerMesh);
        
        // Добавление платформы под башней
        const platformGeometry = new THREE.CylinderGeometry(2.5, 2.5, 0.5, 8);
        const platformMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x5d4037,
            roughness: 0.9,
            metalness: 0.1
        });
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.set(x, 0.25, z);
        platform.castShadow = true;
        platform.receiveShadow = true;
        scene.add(platform);
        
        tower.mesh = towerMesh;
        tower.platform = platform;
        game.towers.push(tower);
        
        return tower;
    }
    
    // Создание врага
    function createEnemy(type) {
        const enemy = {
            type,
            health: type === 'peasant' ? 30 : type === 'bandit' ? 60 : 100,
            maxHealth: type === 'peasant' ? 30 : type === 'bandit' ? 60 : 100,
            speed: type === 'peasant' ? 1.5 : type === 'bandit' ? 2 : 0.8,
            damage: type === 'peasant' ? 5 : type === 'bandit' ? 10 : 20,
            goldReward: type === 'peasant' ? 10 : type === 'bandit' ? 20 : 30,
            pathIndex: 0,
            position: {x: game.path[0].x, z: game.path[0].z},
            mesh: null
        };
        
        let geometry, material, size, color;
        
        // Создание 3D модели врага в зависимости от типа
        switch(type) {
            case 'peasant':
                size = 1.5;
                color = 0x6b8e23;
                geometry = new THREE.ConeGeometry(size, 3, 4);
                break;
            case 'bandit':
                size = 2;
                color = 0x8b0000;
                geometry = new THREE.CylinderGeometry(size, size, 3, 6);
                break;
            case 'knight-enemy':
                size = 2.5;
                color = 0x2f4f4f;
                geometry = new THREE.BoxGeometry(size, 4, size);
                break;
        }
        
        material = new THREE.MeshStandardMaterial({ 
            color,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const enemyMesh = new THREE.Mesh(geometry, material);
        enemyMesh.position.set(enemy.position.x, size, enemy.position.z);
        enemyMesh.castShadow = true;
        enemyMesh.receiveShadow = true;
        scene.add(enemyMesh);
        
        enemy.mesh = enemyMesh;
        game.enemies.push(enemy);
        
        return enemy;
    }
    
    // Создание снаряда
    function createProjectile(from, to, damage, type) {
        const projectile = {
            from: {x: from.x, y: from.y, z: from.z},
            to: {x: to.x, y: to.y, z: to.z},
            damage,
            type,
            progress: 0,
            speed: 0.1,
            mesh: null
        };
        
        let geometry, material, size;
        
        switch(type) {
            case 'archer':
                size = 0.3;
                geometry = new THREE.SphereGeometry(size, 8, 8);
                material = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
                break;
            case 'knight':
                size = 0.5;
                geometry = new THREE.BoxGeometry(size, size, size);
                material = new THREE.MeshBasicMaterial({ color: 0x808080 });
                break;
            case 'mage':
                size = 0.4;
                geometry = new THREE.OctahedronGeometry(size);
                material = new THREE.MeshBasicMaterial({ 
                    color: 0x9400d3,
                    emissive: 0x4b0082
                });
                break;
        }
        
        const projectileMesh = new THREE.Mesh(geometry, material);
        projectileMesh.position.set(from.x, from.y, from.z);
        scene.add(projectileMesh);
        
        projectile.mesh = projectileMesh;
        game.projectiles.push(projectile);
        
        return projectile;
    }
    
    // Обновление игры
    function updateGame(currentTime) {
        const deltaTime = Math.min((currentTime - game.lastFrameTime) / 1000, 0.1);
        game.lastFrameTime = currentTime;
        
        // Обновление врагов
        for (let i = game.enemies.length - 1; i >= 0; i--) {
            const enemy = game.enemies[i];
            
            // Движение по пути
            if (enemy.pathIndex < game.path.length - 1) {
                const targetPoint = game.path[enemy.pathIndex + 1];
                const dx = targetPoint.x - enemy.position.x;
                const dz = targetPoint.z - enemy.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < 0.5) {
                    enemy.pathIndex++;
                } else {
                    enemy.position.x += (dx / distance) * enemy.speed * deltaTime;
                    enemy.position.z += (dz / distance) * enemy.speed * deltaTime;
                    enemy.mesh.position.set(enemy.position.x, enemy.mesh.position.y, enemy.position.z);
                    
                    // Поворот врага в направлении движения
                    if (distance > 0.1) {
                        enemy.mesh.lookAt(
                            enemy.position.x + dx / distance,
                            enemy.mesh.position.y,
                            enemy.position.z + dz / distance
                        );
                    }
                }
            } else {
                // Враг достиг таверны
                game.tavernHealth -= enemy.damage;
                updateHealthBar();
                showMessage(`Таверна атакована! -${enemy.damage} HP`, 'error');
                
                // Удаление врага
                scene.remove(enemy.mesh);
                game.enemies.splice(i, 1);
                
                // Проверка поражения
                if (game.tavernHealth <= 0) {
                    gameOver();
                }
                continue;
            }
            
            // Проверка смерти врага
            if (enemy.health <= 0) {
                // Награда за убийство
                game.gold += enemy.goldReward;
                updateGold();
                showMessage(`+${enemy.goldReward} золота`, 'gold');
                
                // Удаление врага
                scene.remove(enemy.mesh);
                game.enemies.splice(i, 1);
            }
        }
        
        // Обновление башен
        game.towers.forEach(tower => {
            // Поиск цели
            if (!tower.target || tower.target.health <= 0) {
                tower.target = null;
                
                // Поиск ближайшего врага в радиусе действия
                let closestEnemy = null;
                let closestDistance = tower.range;
                
                game.enemies.forEach(enemy => {
                    const dx = enemy.position.x - tower.x;
                    const dz = enemy.position.z - tower.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestEnemy = enemy;
                    }
                });
                
                tower.target = closestEnemy;
            }
            
            // Атака цели
            if (tower.target && currentTime - tower.lastAttack > 1000 / tower.attackSpeed) {
                // Создание снаряда
                const from = {
                    x: tower.x,
                    y: tower.mesh.position.y,
                    z: tower.z
                };
                const to = {
                    x: tower.target.position.x,
                    y: tower.target.mesh.position.y,
                    z: tower.target.position.z
                };
                
                createProjectile(from, to, tower.damage, tower.type);
                tower.lastAttack = currentTime;
                
                // Поворот башни в сторону цели
                const dx = to.x - from.x;
                const dz = to.z - from.z;
                tower.mesh.lookAt(to.x, from.y, to.z);
            }
        });
        
        // Обновление снарядов
        for (let i = game.projectiles.length - 1; i >= 0; i--) {
            const projectile = game.projectiles[i];
            projectile.progress += projectile.speed;
            
            if (projectile.progress >= 1) {
                // Снаряд достиг цели
                const enemy = game.enemies.find(e => 
                    e.position.x === projectile.to.x && 
                    e.position.z === projectile.to.z
                );
                
                if (enemy) {
                    enemy.health -= projectile.damage;
                    
                    // Эффект попадания
                    if (projectile.type === 'mage') {
                        // Магический урон по области
                        game.enemies.forEach(e => {
                            const dx = e.position.x - enemy.position.x;
                            const dz = e.position.z - enemy.position.z;
                            const distance = Math.sqrt(dx * dx + dz * dz);
                            
                            if (distance < 3) {
                                e.health -= projectile.damage * 0.5;
                            }
                        });
                    }
                }
                
                // Удаление снаряда
                scene.remove(projectile.mesh);
                game.projectiles.splice(i, 1);
            } else {
                // Движение снаряда
                const x = projectile.from.x + (projectile.to.x - projectile.from.x) * projectile.progress;
                const y = projectile.from.y + (projectile.to.y - projectile.from.y) * projectile.progress;
                const z = projectile.from.z + (projectile.to.z - projectile.from.z) * projectile.progress;
                projectile.mesh.position.set(x, y, z);
            }
        }
        
        // Спавн врагов во время волны
        if (game.waveActive && game.enemiesSpawned < game.enemiesInWave) {
            if (currentTime - game.lastSpawn > game.spawnInterval) {
                let enemyType;
                const rand = Math.random();
                
                if (rand < 0.5) enemyType = 'peasant';
                else if (rand < 0.8) enemyType = 'bandit';
                else enemyType = 'knight-enemy';
                
                createEnemy(enemyType);
                game.enemiesSpawned++;
                game.lastSpawn = currentTime;
                
                // Увеличение сложности с каждой волной
                if (game.enemiesSpawned === game.enemiesInWave && game.enemies.length === 0) {
                    endWave();
                }
            }
        }
        
        // Обновление ночного освещения
        updateNightCycle(currentTime);
    }
    
    // Обновление цикла дня/ночи
    function updateNightCycle(currentTime) {
        const cycleDuration = 60000; // 60 секунд на полный цикл
        const nightStart = 0.7; // Ночь начинается на 70% цикла
        const dayStart = 0.3; // День начинается на 30% цикла
        
        const cycleProgress = (currentTime % cycleDuration) / cycleDuration;
        
        // Обновление индикатора
        nightIndicator.style.width = `${cycleProgress * 100}%`;
        
        if (cycleProgress > nightStart && !game.isNight) {
            game.isNight = true;
            nightStatus.textContent = 'Ночь!';
            showMessage('Наступает ночь! Враг усиливается!', 'warning');
            
            // Усиление врагов ночью
            game.enemies.forEach(enemy => {
                enemy.speed *= 1.2;
                enemy.damage *= 1.3;
            });
            
            // Включение лунного света
            game.moonLight.intensity = 0.3;
            
        } else if (cycleProgress < dayStart && game.isNight) {
            game.isNight = false;
            nightStatus.textContent = 'День';
            
            // Выключение лунного света
            game.moonLight.intensity = 0;
        }
    }
    
    // Начало волны
    function startWave() {
        if (game.waveActive) return;
        
        game.waveActive = true;
        game.enemiesSpawned = 0;
        game.lastSpawn = Date.now();
        game.enemiesInWave = 5 + game.wave * 2;
        
        startWaveBtn.disabled = true;
        startWaveBtn.innerHTML = '<i class="fas fa-fighter-jet"></i> Волна в процессе';
        
        showMessage(`Волна ${game.wave} началась!`, 'info');
    }
    
    // Завершение волны
    function endWave() {
        game.waveActive = false;
        game.wave++;
        updateWave();
        
        // Награда за волну
        const waveReward = 50 + game.wave * 10;
        game.gold += waveReward;
        updateGold();
        
        startWaveBtn.disabled = false;
        startWaveBtn.innerHTML = '<i class="fas fa-moon"></i> Начать волну ' + game.wave;
        
        showMessage(`Волна пройдена! +${waveReward} золота`, 'success');
        
        // Проверка победы
        if (game.wave > 10) {
            victory();
        }
    }
    
    // Размещение башни
    function placeTower(type, x, z) {
        const cost = getTowerCost(type);
        
        if (game.gold < cost) {
            showMessage('Недостаточно золота!', 'error');
            return false;
        }
        
        // Поиск свободной ячейки
        const cell = game.grid.find(c => 
            Math.abs(c.x - x) < game.cellSize/2 && 
            Math.abs(c.z - z) < game.cellSize/2
        );
        
        if (!cell || cell.occupied) {
            showMessage('Нельзя разместить здесь!', 'error');
            return false;
        }
        
        // Создание башни
        createTower(type, cell.x, cell.z);
        cell.occupied = true;
        
        // Списание золота
        game.gold -= cost;
        updateGold();
        
        showMessage(`${getTowerName(type)} размещена!`, 'success');
        return true;
    }
    
    // Выбор башни
    function selectTower(tower) {
        game.selectedTower = tower;
        upgradeBtn.disabled = false;
        sellBtn.disabled = false;
        
        // Обновление информации о выбранной башне
        selectedTowerInfo.innerHTML = `
            <h4>${getTowerName(tower.type)} (Уровень ${tower.level})</h4>
            <p>Урон: ${tower.damage}</p>
            <p>Дальность: ${tower.range}</p>
            <p>Скорость атаки: ${tower.attackSpeed}/сек</p>
            <p>Стоимость улучшения: <i class="fas fa-coins"></i> ${getUpgradeCost(tower)}</p>
        `;
    }
    
    // Улучшение башни
    function upgradeTower() {
        if (!game.selectedTower) return;
        
        const cost = getUpgradeCost(game.selectedTower);
        
        if (game.gold < cost) {
            showMessage('Недостаточно золота для улучшения!', 'error');
            return;
        }
        
        // Улучшение характеристик
        game.selectedTower.level++;
        game.selectedTower.damage *= 1.5;
        game.selectedTower.range *= 1.2;
        game.selectedTower.attackSpeed *= 1.1;
        
        // Списание золота
        game.gold -= cost;
        updateGold();
        
        // Визуальное улучшение башни
        game.selectedTower.mesh.scale.multiplyScalar(1.1);
        
        showMessage(`${getTowerName(game.selectedTower.type)} улучшена до уровня ${game.selectedTower.level}!`, 'success');
        selectTower(game.selectedTower); // Обновление информации
    }
    
    // Продажа башни
    function sellTower() {
        if (!game.selectedTower) return;
        
        // Возврат золота (50% от стоимости улучшений)
        const refund = Math.floor(getTowerCost(game.selectedTower.type) * 0.5 * game.selectedTower.level);
        game.gold += refund;
        updateGold();
        
        // Освобождение ячейки
        const cell = game.grid.find(c => 
            Math.abs(c.x - game.selectedTower.x) < 0.1 && 
            Math.abs(c.z - game.selectedTower.z) < 0.1
        );
        if (cell) cell.occupied = false;
        
        // Удаление башни со сцены
        scene.remove(game.selectedTower.mesh);
        scene.remove(game.selectedTower.platform);
        
        // Удаление из массива башен
        const index = game.towers.indexOf(game.selectedTower);
        if (index > -1) game.towers.splice(index, 1);
        
        // Сброс выбора
        game.selectedTower = null;
        upgradeBtn.disabled = true;
        sellBtn.disabled = true;
        selectedTowerInfo.innerHTML = `<p>Выберите башню для просмотра информации</p>`;
        
        showMessage(`Башня продана! +${refund} золота`, 'success');
    }
    
    // Вспомогательные функции
    function getTowerCost(type) {
        switch(type) {
            case 'archer': return 50;
            case 'knight': return 100;
            case 'mage': return 150;
            default: return 0;
        }
    }
    
    function getTowerName(type) {
        switch(type) {
            case 'archer': return 'Лучник';
            case 'knight': return 'Рыцарь';
            case 'mage': return 'Маг';
            default: return 'Башня';
        }
    }
    
    function getUpgradeCost(tower) {
        return getTowerCost(tower.type) * tower.level * 2;
    }
    
    function updateGold() {
        goldElement.textContent = game.gold;
    }
    
    function updateWave() {
        waveElement.textContent = game.wave;
    }
    
    function updateHealthBar() {
        const healthPercent = (game.tavernHealth / game.maxHealth) * 100;
        healthBar.style.width = `${healthPercent}%`;
        healthElement.textContent = game.tavernHealth;
        
        // Изменение цвета в зависимости от здоровья
        if (healthPercent > 50) {
            healthBar.style.background = 'linear-gradient(to right, #ff0000, #00ff00)';
        } else if (healthPercent > 20) {
            healthBar.style.background = 'linear-gradient(to right, #ff0000, #ffff00)';
        } else {
            healthBar.style.background = 'linear-gradient(to right, #ff0000, #ff0000)';
        }
    }
    
    function showMessage(text, type) {
        gameMessage.innerHTML = `<p class="${type}">${text}</p>`;
        
        // Автоматическое скрытие сообщения
        setTimeout(() => {
            gameMessage.innerHTML = '';
        }, 3000);
    }
    
    function gameOver() {
        showMessage('Игра окончена! Таверна разрушена!', 'error');
        game.waveActive = false;
        startWaveBtn.disabled = true;
        
        // Предложение рестарта
        setTimeout(() => {
            if (confirm('Таверна разрушена! Хотите начать заново?')) {
                restartGame();
            }
        }, 1000);
    }
    
    function victory() {
        showMessage('Победа! Вы защитили таверну от всех волн!', 'success');
        game.waveActive = false;
        startWaveBtn.disabled = true;
    }
    
    function restartGame() {
        // Сброс игрового состояния
        game.gold = 150;
        game.wave = 1;
        game.tavernHealth = 100;
        game.isNight = false;
        game.waveActive = false;
        game.enemies = [];
        game.towers = [];
        game.projectiles = [];
        game.selectedTower = null;
        game.enemiesSpawned = 0;
        
        // Обновление UI
        updateGold();
        updateWave();
        updateHealthBar();
        nightStatus.textContent = 'День';
        nightIndicator.style.width = '0%';
        startWaveBtn.disabled = false;
        startWaveBtn.innerHTML = '<i class="fas fa-moon"></i> Начать волну';
        upgradeBtn.disabled = true;
        sellBtn.disabled = true;
        selectedTowerInfo.innerHTML = `<p>Выберите башню для размещения</p>`;
        
        // Очистка сцены
        while(scene.children.length > 0) { 
            scene.remove(scene.children[0]); 
        }
        
        // Пересоздание игрового мира
        initThreeJS();
        
        showMessage('Игра перезапущена! Удачи!', 'info');
    }
    
    // Обработчики событий
    function setupEventListeners() {
        // Выбор типа башни
        towerCards.forEach(card => {
            card.addEventListener('click', function() {
                towerCards.forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
                
                game.selectedTowerType = this.dataset.tower;
                game.placingTower = true;
                
                selectedTowerInfo.innerHTML = `
                    <h4>${getTowerName(game.selectedTowerType)}</h4>
                    <p>Кликните на игровом поле, чтобы разместить башню</p>
                    <p>Стоимость: <i class="fas fa-coins"></i> ${getTowerCost(game.selectedTowerType)}</p>
                `;
                
                showMessage(`Выбрана башня: ${getTowerName(game.selectedTowerType)}`, 'info');
            });
        });
        
        // Начало волны
        startWaveBtn.addEventListener('click', startWave);
        
        // Улучшение башни
        upgradeBtn.addEventListener('click', upgradeTower);
        
        // Продажа башни
        sellBtn.addEventListener('click', sellTower);
        
        // Клик по игровому полю для размещения башни
        renderer.domElement.addEventListener('click', function(event) {
            if (!game.placingTower || !game.selectedTowerType) return;
            
            // Получение координат клика в 3D пространстве
            const rect = this.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1
            );
            
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);
            
            // Проверка пересечения с землей
            const intersects = raycaster.intersectObjects(scene.children.filter(obj => obj.userData.type === 'cell'));
            
            if (intersects.length > 0) {
                const point = intersects[0].point;
                const placed = placeTower(game.selectedTowerType, point.x, point.z);
                
                if (placed) {
                    game.placingTower = false;
                    towerCards.forEach(c => c.classList.remove('selected'));
                    game.selectedTowerType = null;
                }
            }
        });
        
        // Клик по башне для выбора
        renderer.domElement.addEventListener('click', function(event) {
            // Отмена, если мы в режиме размещения
            if (game.placingTower) return;
            
            const rect = this.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1
            );
            
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);
            
            // Проверка пересечения с башнями
            const towerMeshes = game.towers.map(t => t.mesh);
            const intersects = raycaster.intersectObjects(towerMeshes);
            
            if (intersects.length > 0) {
                const towerMesh = intersects[0].object;
                const tower = game.towers.find(t => t.mesh === towerMesh);
                if (tower) {
                    selectTower(tower);
                }
            } else {
                // Сброс выбора при клике на пустое место
                game.selectedTower = null;
                upgradeBtn.disabled = true;
                sellBtn.disabled = true;
                selectedTowerInfo.innerHTML = `<p>Выберите башню для просмотра информации</p>`;
            }
        });
        
        // Обработка изменения размера окна
        window.addEventListener('resize', function() {
            camera.aspect = gameCanvas.clientWidth / gameCanvas.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(gameCanvas.clientWidth, gameCanvas.clientHeight);
        });
    }
    
    // Анимация игры
    function animate(currentTime = 0) {
        requestAnimationFrame(animate);
        updateGame(currentTime);
        controls.update();
        renderer.render(scene, camera);
    }
    
    // Инициализация игры
    function initGame() {
        initThreeJS();
        setupEventListeners();
        
        // Инициализация UI
        updateGold();
        updateWave();
        updateHealthBar();
        
        // Приветственное сообщение
        setTimeout(() => {
            showMessage('Добро пожаловать в "Защиту Таверны"! Выберите башню и разместите ее на поле.', 'info');
        }, 1000);
    }
    
    // Запуск игры
    initGame();
});
