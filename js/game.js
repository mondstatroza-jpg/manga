// game.js - Игровая логика "Поймай котейку"

class CatGame {
    constructor() {
        // Настройки игры
        this.config = {
            canvasWidth: 800,
            canvasHeight: 500,
            playerSpeed: 8,
            playerWidth: 80,
            playerHeight: 80,
            itemSize: 60,
            spawnRate: 1000, // ms
            gameTime: 60, // seconds
            initialLives: 3
        };

        // Состояние игры
        this.gameState = {
            isPlaying: false,
            isPaused: false,
            score: 0,
            highScore: localStorage.getItem('catGameHighScore') || 0,
            lives: this.config.initialLives,
            time: this.config.gameTime,
            level: 1,
            items: [],
            activeBoosts: {
                speed: { active: false, duration: 0, multiplier: 2 },
                slow: { active: false, duration: 0, multiplier: 0.5 },
                shield: { active: false, duration: 0 }
            },
            player: {
                x: this.config.canvasWidth / 2 - this.config.playerWidth / 2,
                y: this.config.canvasHeight - this.config.playerHeight - 20,
                width: this.config.playerWidth,
                height: this.config.playerHeight
            },
            keys: {
                left: false,
                right: false
            },
            powerups: {
                speed: 0,
                slow: 0,
                shield: 0
            }
        };

        // Предметы (очки, эффекты)
        this.items = {
            good: [
                { type: 'fish', points: 10, icon: '🐟' },
                { type: 'sushi', points: 20, icon: '🍣' },
                { type: 'milk', points: 15, icon: '🥛' },
                { type: 'cake', points: 30, icon: '🍰' }
            ],
            bad: [
                { type: 'bomb', damage: 1, icon: '💣' },
                { type: 'chili', damage: 1, icon: '🌶️' },
                { type: 'lemon', damage: 1, icon: '🍋' }
            ],
            boosters: [
                { type: 'speed', duration: 5000, icon: '⚡' },
                { type: 'slow', duration: 5000, icon: '🐌' },
                { type: 'shield', duration: 10000, icon: '🛡️' }
            ]
        };

        // Инициализация
        this.init();
    }

    init() {
        // Загрузка сохраненного
        this.loadGame();

        // Настройка канваса
        this.setupCanvas();

        // Настройка событий
        this.setupEvents();

        // Обновление интерфейса
        this.updateUI();

        // Показать стартовое сообщение
        this.showStartScreen();
    }

    setupCanvas() {
        const canvas = document.getElementById('gameCanvas');
        canvas.innerHTML = '';

        // Создаем котика
        this.createPlayer();
    }

    createPlayer() {
        const canvas = document.getElementById('gameCanvas');
        const player = document.createElement('div');
        player.id = 'playerCat';
        player.className = 'player-cat';
        player.style.left = `${this.gameState.player.x}px`;
        player.style.top = `${this.gameState.player.y}px`;

        player.innerHTML = `
            <div class="cat-body">
                <div class="cat-ear left"></div>
                <div class="cat-ear right"></div>
                <div class="cat-eye left"><div class="cat-pupil"></div></div>
                <div class="cat-eye right"><div class="cat-pupil"></div></div>
                <div class="cat-nose"></div>
                <div class="cat-mouth"></div>
            </div>
        `;

        canvas.appendChild(player);
    }

    setupEvents() {
        // Управление клавиатурой
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Кнопки управления
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseGameBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartGameBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('submitNicknameBtn').addEventListener('click', () => this.submitNickname());

        // Мобильное управление
        document.getElementById('leftBtn').addEventListener('touchstart', () => this.gameState.keys.left = true);
        document.getElementById('leftBtn').addEventListener('touchend', () => this.gameState.keys.left = false);
        document.getElementById('rightBtn').addEventListener('touchstart', () => this.gameState.keys.right = true);
        document.getElementById('rightBtn').addEventListener('touchend', () => this.gameState.keys.right = false);

        // Покупка бустеров
        document.querySelectorAll('.buy-booster').forEach(btn => {
            btn.addEventListener('click', (e) => this.buyBooster(e.target.dataset.booster));
        });

        // Активация бустеров
        document.querySelectorAll('.activate-booster').forEach(btn => {
            btn.addEventListener('click', (e) => this.activateBooster(e.target.dataset.booster));
        });
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.gameState.keys.left = true;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.gameState.keys.right = true;
                break;
            case ' ':
                if (this.gameState.isPlaying) {
                    this.togglePause();
                } else {
                    this.startGame();
                }
                e.preventDefault();
                break;
            case 'r':
            case 'R':
                this.restartGame();
                break;
        }
    }

    handleKeyUp(e) {
        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.gameState.keys.left = false;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.gameState.keys.right = false;
                break;
        }
    }

    startGame() {
        if (this.gameState.isPlaying) return;

        this.gameState.isPlaying = true;
        this.gameState.isPaused = false;
        this.gameState.score = 0;
        this.gameState.lives = this.config.initialLives;
        this.gameState.time = this.config.gameTime;
        this.gameState.level = 1;
        this.gameState.items = [];

        // Очистка поля
        this.clearField();

        // Скрытие сообщений
        document.getElementById('startModal').style.display = 'none';
        document.getElementById('gameOverModal').style.display = 'none';

        // Запуск игрового цикла
        this.gameLoop = setInterval(() => this.update(), 16); // ~60 FPS
        this.spawnLoop = setInterval(() => this.spawnItem(), this.config.spawnRate);
        this.timeLoop = setInterval(() => this.updateTime(), 1000);

        this.updateUI();
        this.updateBoostsUI();
    }

    togglePause() {
        if (!this.gameState.isPlaying) return;

        this.gameState.isPaused = !this.gameState.isPaused;

        if (this.gameState.isPaused) {
            document.getElementById('pauseGameBtn').innerHTML = '<i class="fas fa-play"></i> Продолжить';
        } else {
            document.getElementById('pauseGameBtn').innerHTML = '<i class="fas fa-pause"></i> Пауза';
        }
    }

    restartGame() {
        clearInterval(this.gameLoop);
        clearInterval(this.spawnLoop);
        clearInterval(this.timeLoop);

        this.gameState.isPlaying = false;
        this.gameState.isPaused = false;

        this.clearField();
        this.updateUI();

        this.showStartScreen();
    }

    update() {
        if (this.gameState.isPaused || !this.gameState.isPlaying) return;

        // Движение игрока
        this.movePlayer();

        // Движение предметов
        this.moveItems();

        // Проверка столкновений
        this.checkCollisions();

        // Обновление бустеров
        this.updateBoosts();

        // Обновление уровня
        this.updateLevel();

        // Проверка окончания времени
        if (this.gameState.time <= 0) {
            this.gameOver(true);
        }
    }

    movePlayer() {
        let speed = this.config.playerSpeed;

        // Учет бустера скорости
        if (this.gameState.activeBoosts.speed.active) {
            speed *= this.gameState.activeBoosts.speed.multiplier;
        }
        if (this.gameState.activeBoosts.slow.active) {
            speed *= this.gameState.activeBoosts.slow.multiplier;
        }

        if (this.gameState.keys.left && this.gameState.player.x > 0) {
            this.gameState.player.x -= speed;
        }
        if (this.gameState.keys.right && this.gameState.player.x < this.config.canvasWidth - this.config.playerWidth) {
            this.gameState.player.x += speed;
        }

        const player = document.getElementById('playerCat');
        if (player) {
            player.style.left = `${this.gameState.player.x}px`;
        }
    }

    spawnItem() {
        if (!this.gameState.isPlaying || this.gameState.isPaused) return;

        const canvas = document.getElementById('gameCanvas');
        const type = this.getItemType();
        const item = document.createElement('div');

        item.className = `falling-item item-${type}`;
        item.dataset.type = type;

        const x = Math.random() * (this.config.canvasWidth - this.config.itemSize);
        item.style.left = `${x}px`;
        item.style.top = `-${this.config.itemSize}px`;

        canvas.appendChild(item);

        this.gameState.items.push({
            element: item,
            x: x,
            y: -this.config.itemSize,
            type: type,
            speed: 2 + Math.random() * 2 + this.gameState.level * 0.3
        });
    }

    getItemType() {
        const rand = Math.random() * 100;

        // Вероятности (меняются с уровнем)
        let goodChance = 70 - this.gameState.level * 2;
        let badChance = 25 + this.gameState.level * 1.5;
        let boosterChance = 5;

        if (rand < goodChance) {
            const goodItems = this.items.good;
            return goodItems[Math.floor(Math.random() * goodItems.length)].type;
        } else if (rand < goodChance + badChance) {
            const badItems = this.items.bad;
            return badItems[Math.floor(Math.random() * badItems.length)].type;
        } else {
            const boosters = this.items.boosters;
            return boosters[Math.floor(Math.random() * boosters.length)].type;
        }
    }

    moveItems() {
        const canvas = document.getElementById('gameCanvas');

        this.gameState.items = this.gameState.items.filter(item => {
            let speed = item.speed;

            // Учет бустера замедления
            if (this.gameState.activeBoosts.slow.active) {
                speed *= this.gameState.activeBoosts.slow.multiplier;
            }

            item.y += speed;
            item.element.style.top = `${item.y}px`;

            // Удаление предметов, упавших за экран
            if (item.y > this.config.canvasHeight) {
                item.element.remove();
                return false;
            }

            return true;
        });
    }

    checkCollisions() {
        const playerRect = {
            x: this.gameState.player.x,
            y: this.gameState.player.y,
            width: this.config.playerWidth,
            height: this.config.playerHeight
        };

        this.gameState.items.forEach((item, index) => {
            const itemRect = {
                x: item.x,
                y: item.y,
                width: this.config.itemSize,
                height: this.config.itemSize
            };

            // Проверка пересечения
            if (playerRect.x < itemRect.x + itemRect.width &&
                playerRect.x + playerRect.width > itemRect.x &&
                playerRect.y < itemRect.y + itemRect.height &&
                playerRect.y + playerRect.height > itemRect.y) {

                this.handleCollision(item, index);
            }
        });
    }

    handleCollision(item, index) {
        const isGood = this.items.good.find(i => i.type === item.type);
        const isBad = this.items.bad.find(i => i.type === item.type);
        const isBooster = this.items.boosters.find(i => i.type === item.type);

        if (isGood) {
            // Сбор хорошего предмета
            this.gameState.score += isGood.points;
            this.createEffect(item.element, `+${isGood.points}`, 'good');
        } else if (isBad) {
            // Столкновение с плохим предметом
            if (this.gameState.activeBoosts.shield.active) {
                this.createEffect(item.element, 'Щит сработал!', 'good');
                this.gameState.activeBoosts.shield.active = false;
                this.updateBoostsUI();
            } else {
                this.gameState.lives -= isBad.damage;
                this.createExplosion(item.element);

                if (this.gameState.lives <= 0) {
                    this.gameOver(false);
                } else {
                    this.createEffect(item.element, `-${isBad.damage} жизнь`, 'bad');
                }
            }
        } else if (isBooster) {
            // Активация бустера
            this.activateBooster(isBooster.type, isBooster.duration);
            this.createEffect(item.element, `${isBooster.icon} Бустер!`, 'good');
        }

        // Удаление предмета
        item.element.remove();
        this.gameState.items.splice(index, 1);

        // Обновление рекорда
        if (this.gameState.score > this.gameState.highScore) {
            this.gameState.highScore = this.gameState.score;
            localStorage.setItem('catGameHighScore', this.gameState.highScore);
        }

        this.updateUI();
    }

    createEffect(element, text, type) {
        const rect = element.getBoundingClientRect();
        const canvas = document.getElementById('gameCanvas');
        const effect = document.createElement('div');

        effect.className = `collect-effect ${type}-effect`;
        effect.textContent = text;
        effect.style.left = `${rect.left}px`;
        effect.style.top = `${rect.top}px`;

        canvas.appendChild(effect);

        setTimeout(() => effect.remove(), 1000);
    }

    createExplosion(element) {
        const rect = element.getBoundingClientRect();
        const canvas = document.getElementById('gameCanvas');
        const explosion = document.createElement('div');

        explosion.className = 'explosion';
        explosion.style.left = `${rect.left - 20}px`;
        explosion.style.top = `${rect.top - 20}px`;

        canvas.appendChild(explosion);

        setTimeout(() => explosion.remove(), 500);
    }

    activateBooster(type, duration = null) {
        const boost = this.gameState.activeBoosts[type];

        if (duration) {
            boost.duration = duration;
        } else if (this.gameState.powerups[type] > 0) {
            this.gameState.powerups[type]--;
            boost.duration = this.items.boosters.find(b => b.type === type).duration;
        } else {
            return;
        }

        boost.active = true;
        this.showBoostEffect(type);
        this.updateBoostsUI();
        this.updatePowerupsUI();
    }

    showBoostEffect(type) {
        const player = document.getElementById('playerCat');
        if (!player) return;

        let effect = document.createElement('div');

        switch (type) {
            case 'speed':
                effect.className = 'speed-effect';
                break;
            case 'slow':
                effect.className = 'slow-effect';
                break;
            case 'shield':
                effect.className = 'shield-effect';
                break;
        }

        player.appendChild(effect);

        setTimeout(() => {
            if (effect.parentNode) {
                effect.remove();
            }
        }, 1000);
    }

    updateBoosts() {
        Object.keys(this.gameState.activeBoosts).forEach(type => {
            const boost = this.gameState.activeBoosts[type];

            if (boost.active && boost.duration > 0) {
                boost.duration -= 16; // 60 FPS

                if (boost.duration <= 0) {
                    boost.active = false;
                    boost.duration = 0;
                    this.updateBoostsUI();
                }
            }
        });
    }

    updateLevel() {
        const newLevel = Math.floor(this.gameState.score / 100) + 1;
        if (newLevel > this.gameState.level) {
            this.gameState.level = newLevel;

            // Увеличение сложности
            this.config.spawnRate = Math.max(300, 1000 - this.gameState.level * 50);

            // Обновление интервала спавна
            clearInterval(this.spawnLoop);
            this.spawnLoop = setInterval(() => this.spawnItem(), this.config.spawnRate);

            this.createEffect(
                document.getElementById('playerCat'),
                `Уровень ${this.gameState.level}!`,
                'good'
            );
        }
    }

    updateTime() {
        if (!this.gameState.isPlaying || this.gameState.isPaused) return;

        this.gameState.time--;
        this.updateUI();
    }

    gameOver(timeout = false) {
        clearInterval(this.gameLoop);
        clearInterval(this.spawnLoop);
        clearInterval(this.timeLoop);

        this.gameState.isPlaying = false;

        // Показать экран завершения
        this.showGameOverScreen(timeout);

        // Сохранение игры
        this.saveGame();
    }

    buyBooster(type) {
        const costs = {
            speed: 50,
            slow: 75,
            shield: 100
        };

        const cost = costs[type];

        if (this.gameState.score >= cost && !this.gameState.isPlaying) {
            this.gameState.score -= cost;
            this.gameState.powerups[type]++;

            this.updateUI();
            this.updatePowerupsUI();
            this.saveGame();

            this.showMessage(`Бустер "${type}" куплен!`);
        } else {
            this.showMessage('Недостаточно очков или игра активна!');
        }
    }

    clearField() {
        // Удаление всех предметов
        document.querySelectorAll('.falling-item').forEach(item => item.remove());
        document.querySelectorAll('.collect-effect').forEach(effect => effect.remove());
        document.querySelectorAll('.explosion').forEach(exp => exp.remove());
        document.querySelectorAll('.shield-effect').forEach(shield => shield.remove());
        document.querySelectorAll('.speed-effect').forEach(speed => speed.remove());
        document.querySelectorAll('.slow-effect').forEach(slow => slow.remove());

        this.gameState.items = [];
    }

    showStartScreen() {
        document.getElementById('startModal').style.display = 'block';
    }

    showGameOverScreen(timeout) {
        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('gameOverTitle');
        const message = document.getElementById('gameOverMessage');

        if (timeout) {
            title.textContent = 'Время вышло! ⏰';
            message.textContent = 'Котик не успел наесться, но он старался!';
        } else {
            title.textContent = 'Мяяяяяя... 😿';
            message.textContent = 'Кажется твой котик скушал что-то не то. Давай попробуем еще раз!';
        }

        document.getElementById('finalScore').textContent = this.gameState.score;
        document.getElementById('finalHighScore').textContent = this.gameState.highScore;

        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('startModal').style.display = 'none';
        document.getElementById('gameOverModal').style.display = 'none';
    }

    submitNickname() {
        const nickname = document.getElementById('nicknameInput').value.trim();

        if (nickname) {
            this.saveToLeaderboard(nickname, this.gameState.score);
            this.showMessage(`Результат сохранен как "${nickname}"!`);
            document.getElementById('nicknameInput').value = '';
            this.closeModal();
        } else {
            this.showMessage('Введите никнейм!');
        }
    }

    saveToLeaderboard(name, score) {
        const leaderboard = JSON.parse(localStorage.getItem('catGameLeaderboard')) || [];

        leaderboard.push({
            name: name,
            score: score,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
        });

        // Сортировка по очкам
        leaderboard.sort((a, b) => b.score - a.score);

        // Оставить только топ-10
        const top10 = leaderboard.slice(0, 10);

        localStorage.setItem('catGameLeaderboard', JSON.stringify(top10));
        this.updateLeaderboard();
    }

    updateLeaderboard() {
        const leaderboard = JSON.parse(localStorage.getItem('catGameLeaderboard')) || [];
        const list = document.getElementById('leaderboardList');

        list.innerHTML = '';

        leaderboard.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';

            item.innerHTML = `
                <div class="leaderboard-rank">${index + 1}</div>
                <div class="leaderboard-name">${entry.name}</div>
                <div class="leaderboard-score">${entry.score}</div>
            `;

            list.appendChild(item);
        });
    }

    updateUI() {
        // Обновление статистики
        document.getElementById('currentScore').textContent = this.gameState.score;
        document.getElementById('highScore').textContent = this.gameState.highScore;
        document.getElementById('livesCount').textContent = this.gameState.lives;
        document.getElementById('timeCount').textContent = this.gameState.time;
        document.getElementById('levelCount').textContent = this.gameState.level;

        // Обновление игрового UI
        document.getElementById('gameScore').textContent = this.gameState.score;
        document.getElementById('gameTime').textContent = this.gameState.time;
        document.getElementById('gameLives').textContent = this.gameState.lives;

        // Обновление кнопок
        document.getElementById('startGameBtn').style.display = this.gameState.isPlaying ? 'none' : 'block';
        document.getElementById('pauseGameBtn').style.display = this.gameState.isPlaying ? 'block' : 'none';
        document.getElementById('restartGameBtn').style.display = 'block';

        if (this.gameState.isPaused) {
            document.getElementById('pauseGameBtn').innerHTML = '<i class="fas fa-play"></i> Продолжить';
        } else {
            document.getElementById('pauseGameBtn').innerHTML = '<i class="fas fa-pause"></i> Пауза';
        }
    }

    updateBoostsUI() {
        Object.keys(this.gameState.activeBoosts).forEach(type => {
            const boost = this.gameState.activeBoosts[type];
            const element = document.getElementById(`${type}BoostStatus`);

            if (element) {
                if (boost.active) {
                    element.textContent = `Активен (${Math.ceil(boost.duration / 1000)}с)`;
                    element.style.color = 'var(--success-color)';
                } else {
                    element.textContent = 'Не активен';
                    element.style.color = 'var(--text-secondary)';
                }
            }
        });
    }

    updatePowerupsUI() {
        Object.keys(this.gameState.powerups).forEach(type => {
            const element = document.getElementById(`${type}PowerupCount`);
            if (element) {
                element.textContent = this.gameState.powerups[type];
            }
        });
    }

    showMessage(text) {
        // Создаем элемент сообщения
        const message = document.createElement('div');
        message.className = 'game-message';
        message.textContent = text;
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 5px 20px var(--shadow-color);
            border-left: 4px solid var(--accent-color);
            z-index: 10000;
            transform: translateX(150%);
            transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            max-width: 300px;
        `;

        document.body.appendChild(message);

        // Показываем сообщение
        setTimeout(() => {
            message.style.transform = 'translateX(0)';
        }, 10);

        // Убираем через 3 секунды
        setTimeout(() => {
            message.style.transform = 'translateX(150%)';
            setTimeout(() => message.remove(), 500);
        }, 3000);
    }

    saveGame() {
        const saveData = {
            score: this.gameState.score,
            powerups: this.gameState.powerups,
            highScore: this.gameState.highScore
        };

        localStorage.setItem('catGameData', JSON.stringify(saveData));
    }

    loadGame() {
        const savedData = JSON.parse(localStorage.getItem('catGameData'));

        if (savedData) {
            this.gameState.score = savedData.score || 0;
            this.gameState.powerups = savedData.powerups || { speed: 0, slow: 0, shield: 0 };
            this.gameState.highScore = savedData.highScore || 0;
        }
    }
}

// Инициализация игры при загрузке страницы
let game;

document.addEventListener('DOMContentLoaded', function () {
    game = new CatGame();
    game.updateLeaderboard();
    game.updatePowerupsUI();

    // Переключение темы
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            setTheme(this.dataset.theme);
        });
    });

    // Загрузка сохраненной темы
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
});

// Функция переключения темы (из theme-switcher.js)
function setTheme(theme) {
    document.body.className = `${theme}-theme`;
    localStorage.setItem('theme', theme);

    // Обновление логотипа
    const logo = document.getElementById('themeLogo');
    if (theme === 'light') logo.className = 'fas fa-sun';
    else if (theme === 'dark') logo.className = 'fas fa-moon';
    else logo.className = 'fas fa-heart';

    // Обновление активной кнопки
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === theme) {
            btn.classList.add('active');
        }
    });

    // Обновление анимированного фона
    createBackgroundAnimation(theme);
}

// Функция создания анимированного фона
function createBackgroundAnimation(theme) {
    const container = document.getElementById('backgroundAnimation');
    if (!container) return;

    container.innerHTML = '';
    container.className = 'background-animation';

    if (theme === 'light') {
        container.classList.add('light-background');
    } else if (theme === 'dark') {
        container.classList.add('dark-background');
    } else if (theme === 'anime') {
        container.classList.add('anime-background');
    }
}