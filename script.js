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
        lastFrameTime: 0,
        gameTime: 0,
        enemiesDefeated: 0
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
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    
    // Инициализация Three.js
    function initThreeJS() {
        // Создание сцены
        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);
        
        // Создание камеры
        camera = new THREE.PerspectiveCamera(75, gameCanvas.clientWidth / gameCanvas.clientHeight, 0.1, 1000);
        camera.position.set(30, 25, 30);
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
        ground.userData = { type: 'ground' };
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
                const cellGeometry = new THREE.BoxGeometry(game.cellSize - 0.5, 0.1, game.cellSize - 0.5);
                const cellMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.05,
                    visible: false
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
        base.userData = { type: 'tavern' };
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
        
        // Добавляем свет из окон
        for (let i = -1; i <= 1; i += 2) {
            const windowLight = new THREE.PointLight(0xffaa00, 0.5, 10);
            windowLight.position.set(i * 2, 4, -8);
            scene.add(windowLight);
        }
        
        game.tavern = { base, roof, door, health: game.tavernHealth };
    }
    
    // Создание пути для врагов
    function createPath() {
        // Путь состоит из контрольных точек (линия от спавна до таверны)
        game.path = [
            {x: -15, z: 5},
            {x: -8, z: 5},
            {x: -8, z: 12},
            {x: 8, z: 12},
            {x: 8, z: 5},
            {x: 0, z: 5},
            {x: 0, z: -8}  // Таверна
        ];
        
        // Визуализация пути (для отладки)
        const pathPoints = game.path.map(p => new THREE.Vector3(p.x, 0.1, p.z));
        const pathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
        const pathMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, visible: false });
        const pathLine = new THREE.Line(pathGeometry, pathMaterial);
        scene.add(pathLine);
        
        // Добавляем указатели пути
        for (let i = 0; i < game.path.length - 1; i++) {
            const point = game.path[i];
            const nextPoint = game.path[i + 1];
            
            // Создаем стрелку направления
            const dir = new THREE.Vector3(nextPoint.x - point.x, 0, nextPoint.z - point.z);
            const length = dir.length();
            dir.normalize();
            
            const arrowGeometry = new THREE.ConeGeometry(0.3, 1, 4);
            const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });
            const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
            arrow.position.set(point.x + dir.x * 2, 0.2, point.z + dir.z * 2);
            arrow.lookAt(new THREE.Vector3(nextPoint.x, 0.2, nextPoint.z));
            arrow.rotateX(Math.PI / 2);
            scene.add(arrow);
        }
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
            mesh: null,
            rangeMesh: null
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
        towerMesh.userData = { type: 'tower', tower: tower };
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
        
        // Добавление визуализации радиуса атаки (скрытой по умолчанию)
        const rangeGeometry = new THREE.CircleGeometry(tower.range, 32);
        const rangeMaterial = new THREE.MeshBasicMaterial({ 
            color: type === 'archer' ? 0x00ff00 : type === 'knight' ? 0xff0000 : 0x800080,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        const rangeMesh = new THREE.Mesh(rangeGeometry, rangeMaterial);
        rangeMesh.position.set(x, 0.1, z);
        rangeMesh.rotation.x = -Math.PI / 2;
        rangeMesh.visible = false;
        scene.add(rangeMesh);
        
        tower.mesh = towerMesh;
        tower.platform = platform;
        tower.rangeMesh = rangeMesh;
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
            mesh: null,
            healthBar: null
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
        enemyMesh.position.set(enemy.position.x, size/2, enemy.position.z);
        enemyMesh.castShadow = true;
        enemyMesh.receiveShadow = true;
        enemyMesh.userData = { type: 'enemy', enemy: enemy };
        scene.add(enemyMesh);
        
        // Создание полоски здоровья над врагом
        const healthBarGeometry = new THREE.PlaneGeometry(2, 0.2);
        const healthBarMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            side: THREE.DoubleSide
        });
        const healthBarMesh = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
        healthBarMesh.position.set(enemy.position.x, size + 0.5, enemy.position.z);
        healthBarMesh.visible = false; // Показываем только при повреждении
        scene.add(healthBarMesh);
        
        enemy.mesh = enemyMesh;
        enemy.healthBar = healthBarMesh;
        game.enemies.push(enemy);
        
        return enemy;
    }
    
    // Обновление полоски здоровья врага
    function updateEnemyHealthBar(enemy) {
        if (enemy.healthBar) {
            const healthPercent = enemy.health / enemy.maxHealth;
            enemy.healthBar.scale.x = healthPercent;
            
            // Изменение цвета в зависимости от здоровья
            if (healthPercent > 0.5) {
                enemy.healthBar.material.color.setHex(0x00ff00);
            } else if (healthPercent > 0.2) {
                enemy.healthBar.material.color.setHex(0xffff00);
            } else {
                enemy.healthBar.material.color.setHex(0xff0000);
            }
            
            // Показываем полоску здоровья на 2 секунды после получения урона
            enemy.healthBar.visible = true;
            if (enemy.healthTimeout) clearTimeout(enemy.healthTimeout);
            enemy.healthTimeout = setTimeout(() => {
                if (enemy.healthBar) enemy.healthBar.visible = false;
            }, 2000);
        }
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
        if (!game.lastFrameTime) game.lastFrameTime = currentTime;
        const deltaTime = Math.min((currentTime - game.lastFrameTime) / 1000, 0.1);
        game.lastFrameTime = currentTime;
        game.gameTime += deltaTime;
        
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
                    
                    // Обновление полоски здоровья
                    if (enemy.healthBar) {
                        enemy.healthBar.position.set(enemy.position.x, enemy.mesh.position.y + 1, enemy.position.z);
                        // Поворачиваем полоску здоровья к камере
                        enemy.healthBar.lookAt(camera.position);
                    }
                    
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
                if (enemy.healthBar) scene.remove(enemy.healthBar);
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
                game.enemiesDefeated++;
                updateGold();
                showMessage(`+${enemy.goldReward} золота`, 'gold');
                
                // Эффект смерти
                createDeathEffect(enemy.mesh.position);
                
                // Удаление врага
                scene.remove(enemy.mesh);
                if (enemy.healthBar) scene.remove(enemy.healthBar);
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
            
            // Анимация башни (легкое покачивание)
            tower.mesh.position.y = (tower.type === 'archer' ? 2.5 : tower.type === 'knight' ? 3 : 2.5) + 
                                   Math.sin(game.gameTime * 2 + tower.x) * 0.1;
        });
        
        // Обновление снарядов
        for (let i = game.projectiles.length - 1; i >= 0; i--) {
            const projectile = game.projectiles[i];
            projectile.progress += projectile.speed;
            
            if (projectile.progress >= 1) {
                // Снаряд достиг цели
                const enemy = game.enemies.find(e => 
                    Math.abs(e.position.x - projectile.to.x) < 1 && 
                    Math.abs(e.position.z - projectile.to.z) < 1
                );
                
                if (enemy) {
                    enemy.health -= projectile.damage;
                    updateEnemyHealthBar(enemy);
                    
                    // Эффект попадания
                    createHitEffect(projectile.mesh.position, projectile.type);
                    
                    // Магический урон по области
                    if (projectile.type === 'mage') {
                        game.enemies.forEach(e => {
                            const dx = e.position.x - enemy.position.x;
                            const dz = e.position.z - enemy.position.z;
                            const distance = Math.sqrt(dx * dx + dz * dz);
                            
                            if (distance < 3 && e !== enemy) {
                                e.health -= projectile.damage * 0.5;
                                updateEnemyHealthBar(e);
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
                const y = projectile.from.y + (projectile.to.y - projectile.from.y) * projectile.progress + 
                         Math.sin(projectile.progress * Math.PI) * 3; // Дуга траектории
                const z = projectile.from.z + (projectile.to.z - projectile.from.z) * projectile.progress;
                projectile.mesh.position.set(x, y, z);
                
                // Вращение снаряда
                projectile.mesh.rotation.x += 0.1;
                projectile.mesh.rotation.y += 0.1;
            }
        }
        
        // Спавн врагов во время волны
        if (game.waveActive && game.enemiesSpawned < game.enemiesInWave) {
            if (currentTime - game.lastSpawn > game.spawnInterval) {
                let enemyType;
                const rand = Math.random();
                
                // Вероятность появления врагов зависит от волны
                if (game.wave <= 3) {
                    if (rand < 0.7) enemyType = 'peasant';
                    else if (rand < 0.9) enemyType = 'bandit';
                    else enemyType = 'knight-enemy';
                } else if (game.wave <= 6) {
                    if (rand < 0.5) enemyType = 'peasant';
                    else if (rand < 0.8) enemyType = 'bandit';
                    else enemyType = 'knight-enemy';
                } else {
                    if (rand < 0.3) enemyType = 'peasant';
                    else if (rand < 0.6) enemyType = 'bandit';
                    else enemyType = 'knight-enemy';
                }
                
                createEnemy(enemyType);
                game.enemiesSpawned++;
                game.lastSpawn = currentTime;
                
                // Увеличение сложности с каждой волной
                if (game.enemiesSpawned === game.enemiesInWave && game.enemies.length === 0) {
                    setTimeout(() => endWave(), 2000);
                }
            }
        }
        
        // Обновление ночного освещения
        updateNightCycle(currentTime);
    }
    
    // Создание эффекта попадания
    function createHitEffect(position, type) {
        const particleCount = 10;
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        for (let i = 0; i < particleCount; i++) {
            vertices.push(
                position.x, position.y, position.z
            );
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        let particleColor;
        switch(type) {
            case 'archer': particleColor = 0x8B4513; break;
            case 'knight': particleColor = 0x808080; break;
            case 'mage': particleColor = 0x9400d3; break;
        }
        
        const material = new THREE.PointsMaterial({
            color: particleColor,
            size: 0.2,
            transparent: true
        });
        
        const particles = new THREE.Points(geometry, material);
        scene.add(particles);
        
        // Анимация частиц
        const positions = particles.geometry.attributes.position.array;
        const velocities = [];
        
        for (let i = 0; i < particleCount; i++) {
            velocities.push({
                x: (Math.random() - 0.5) * 2,
                y: Math.random() * 2,
                z: (Math.random() - 0.5) * 2
            });
        }
        
        let lifeTime = 0;
        const maxLifeTime = 1;
        
        function animateParticles() {
            lifeTime += 0.05;
            
            for (let i = 0; i < particleCount; i++) {
                const idx = i * 3;
                positions[idx] += velocities[i].x * 0.1;
                positions[idx + 1] += velocities[i].y * 0.1 - lifeTime * 0.5; // Гравитация
                positions[idx + 2] += velocities[i].z * 0.1;
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            material.opacity = 1 - (lifeTime / maxLifeTime);
            
            if (lifeTime < maxLifeTime) {
                requestAnimationFrame(animateParticles);
            } else {
                scene.remove(particles);
                particles.geometry.dispose();
                particles.material.dispose();
            }
        }
        
        animateParticles();
    }
    
    // Создание эффекта смерти
    function createDeathEffect(position) {
        const geometry = new THREE.SphereGeometry(1, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.7
        });
        
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(position);
        scene.add(sphere);
        
        let scale = 1;
        const duration = 0.5;
        let elapsed = 0;
        
        function animate() {
            elapsed += 0.05;
            scale = 1 + elapsed * 2;
            sphere.scale.setScalar(scale);
            material.opacity = 0.7 * (1 - elapsed / duration);
            
            if (elapsed < duration) {
                requestAnimationFrame(animate);
            } else {
                scene.remove(sphere);
                sphere.geometry.dispose();
                sphere.material.dispose();
            }
        }
        
        animate();
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
            
            // Затемнение неба
            scene.fog.color.setHex(0x0a0a1a);
            
        } else if (cycleProgress < dayStart && game.isNight) {
            game.isNight = false;
            nightStatus.textContent = 'День';
            
            // Выключение лунного света
            game.moonLight.intensity = 0;
            
            // Осветление неба
            scene.fog.color.setHex(0x1a1a2e);
        }
    }
    
    // Начало волны
    function startWave() {
        if (game.waveActive) return;
        
        game.waveActive = true;
        game.enemiesSpawned = 0;
        game.lastSpawn = Date.now();
        game.enemiesInWave = 5 + game.wave * 2;
        game.enemiesDefeated = 0;
        
        startWaveBtn.disabled = true;
        startWaveBtn.innerHTML = '<i class="fas fa-fighter-jet"></i> Волна в процессе';
        
        showMessage(`Волна ${game.wave} началась! Приближается ${game.enemiesInWave} врагов!`, 'info');
    }
    
    // Завершение волны
    function endWave() {
        game.waveActive = false;
        game.wave++;
        updateWave();
        
        // Награда за волну
        const waveReward = 50 + game.wave * 10 + game.enemiesDefeated * 5;
        game.gold += waveReward;
        updateGold();
        
        startWaveBtn.disabled = false;
        startWaveBtn.innerHTML = `<i class="fas fa-moon"></i> Начать волну ${game.wave}`;
        
        showMessage(`Волна пройдена! Убито врагов: ${game.enemiesDefeated}. +${waveReward} золота`, 'success');
        
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
        
        // Поиск ближайшей ячейки
        let closestCell = null;
        let closestDistance = Infinity;
        
        game.grid.forEach(cell => {
            if (!cell.occupied) {
                const dx = cell.x - x;
                const dz = cell.z - z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < closestDistance && distance < game.cellSize) {
                    closestDistance = distance;
                    closestCell = cell;
                }
            }
        });
        
        if (!closestCell) {
            showMessage('Нет свободных мест для башни!', 'error');
            return false;
        }
        
        // Создание башни
        createTower(type, closestCell.x, closestCell.z);
        closestCell.occupied = true;
        
        // Списание золота
        game.gold -= cost;
        updateGold();
        
        showMessage(`${getTowerName(type)} размещена за ${cost} золота!`, 'success');
        return true;
    }
    
    // Выбор башни
    function selectTower(tower) {
        // Сброс предыдущего выбора
        if (game.selectedTower && game.selectedTower.rangeMesh) {
            game.selectedTower.rangeMesh.visible = false;
        }
        
        game.selectedTower = tower;
        upgradeBtn.disabled = false;
        sellBtn.disabled = false;
        
        // Показать радиус атаки выбранной башни
        if (tower.rangeMesh) {
            tower.rangeMesh.visible = true;
        }
        
        // Обновление информации о выбранной башне
        selectedTowerInfo.innerHTML = `
            <h4>${getTowerName(tower.type)} (Уровень ${tower.level})</h4>
            <p>Урон: ${tower.damage}</p>
            <p>Дальность: ${tower.range}</p>
            <p>Скорость атаки: ${tower.attackSpeed}/сек</p>
            <p>Стоимость улучшения: <i class="fas fa-coins"></i> ${getUpgradeCost(tower)}</p>
            <p>Стоимость продажи: <i class="fas fa-coins"></i> ${Math.floor(getTowerCost(tower.type) * 0.7 * tower.level)}</p>
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
        game.selectedTower.damage = Math.floor(game.selectedTower.damage * 1.5);
        game.selectedTower.range = Math.floor(game.selectedTower.range * 1.2);
        game.selectedTower.attackSpeed = Math.round(game.selectedTower.attackSpeed * 1.1 * 10) / 10;
        
        // Обновление радиуса атаки
        if (game.selectedTower.rangeMesh) {
            scene.remove(game.selectedTower.rangeMesh);
            const rangeGeometry = new THREE.CircleGeometry(game.selectedTower.range, 32);
            const rangeMaterial = new THREE.MeshBasicMaterial({ 
                color: game.selectedTower.type === 'archer' ? 0x00ff00 : 
                       game.selectedTower.type === 'knight' ? 0xff0000 : 0x800080,
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide
            });
            const rangeMesh = new THREE.Mesh(rangeGeometry, rangeMaterial);
            rangeMesh.position.set(game.selectedTower.x, 0.1, game.selectedTower.z);
            rangeMesh.rotation.x = -Math.PI / 2;
            rangeMesh.visible = true;
            scene.add(rangeMesh);
            game.selectedTower.rangeMesh = rangeMesh;
        }
        
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
        
        // Возврат золота (70% от стоимости улучшений)
        const refund = Math.floor(getTowerCost(game.selectedTower.type) * 0.7 * game.selectedTower.level);
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
        if (game.selectedTower.rangeMesh) {
            scene.remove(game.selectedTower.rangeMesh);
        }
        
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
        return getTowerCost(tower.type) * tower.level * 1.5;
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
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-${type}`;
        messageDiv.innerHTML = `<p>${text}</p>`;
        gameMessage.appendChild(messageDiv);
        
        // Автоматическое скрытие сообщения через 3 секунды
        setTimeout(() => {
            if (messageDiv.parentNode === gameMessage) {
                gameMessage.removeChild(messageDiv);
            }
        }, 3000);
        
        // Ограничение количества сообщений
        if (gameMessage.children.length > 3) {
            gameMessage.removeChild(gameMessage.children[0]);
        }
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
        
        // Показать финальное сообщение
        setTimeout(() => {
            alert('Поздравляем! Вы успешно защитили таверну от всех 10 волн врагов!');
        }, 1500);
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
        game.enemiesDefeated = 0;
        
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
        gameMessage.innerHTML = '';
        
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
                    <p>У вас: <i class="fas fa-coins"></i> ${game.gold}</p>
                `;
                
                showMessage(`Выбрана башня: ${getTowerName(game.selectedTowerType)}. Кликните на поле для размещения.`, 'info');
            });
        });
        
        // Начало волны
        startWaveBtn.addEventListener('click', startWave);
        
        // Улучшение башни
        upgradeBtn.addEventListener('click', upgradeTower);
        
        // Продажа башни
        sellBtn.addEventListener('click', sellTower);
        
        // Клик по игровому полю
        renderer.domElement.addEventListener('click', function(event) {
            // Получение координат мыши
            const rect = this.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Обновление рейкастера
            raycaster.setFromCamera(mouse, camera);
            
            // Проверка на размещение башни
            if (game.placingTower && game.selectedTowerType) {
                // Проверка пересечения с землей
                const intersects = raycaster.intersectObjects(scene.children.filter(obj => 
                    obj.userData && obj.userData.type === 'ground'
                ));
                
                if (intersects.length > 0) {
                    const point = intersects[0].point;
                    const placed = placeTower(game.selectedTowerType, point.x, point.z);
                    
                    if (placed) {
                        game.placingTower = false;
                        towerCards.forEach(c => c.classList.remove('selected'));
                        game.selectedTowerType = null;
                        selectedTowerInfo.innerHTML = `<p>Выберите башню для просмотра информации</p>`;
                    }
                }
                return;
            }
            
            // Проверка на выбор башни
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
                if (game.selectedTower && game.selectedTower.rangeMesh) {
                    game.selectedTower.rangeMesh.visible = false;
                }
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
        
        // Добавляем подсказки при наведении на башни
        towerCards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                const type = this.dataset.tower;
                const cost = getTowerCost(type);
                if (game.gold < cost) {
                    this.style.opacity = '0.7';
                }
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.opacity = '1';
            });
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
            showMessage('Нажмите "Начать волну", когда будете готовы к атаке.', 'info');
        }, 1000);
    }
    
    // Запуск игры
    initGame();
});
