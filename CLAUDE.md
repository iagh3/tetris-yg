# CLAUDE.md

Контекст для Claude Code. Цель — за две минуты восстановить картину и не
сломать существующие договорённости.

## Что это за проект

Однопользовательский тетрис для платформы
[Яндекс Игры](https://yandex.ru/dev/games/doc/dg/concepts/about.html).
Никаких сборщиков и фреймворков: статические HTML / CSS / JS, ESM не
используется, всё на глобальных объектах вида `window.Tetris`, `window.SDK`.

Игра работает в двух средах:
- iframe `yandex.ru/games/...` — там доступен `YaGames` и все SDK-функции,
- статический сервер — SDK тихо вырождается, игра работает полностью.

## Архитектурные правила

- **Никаких внешних JS-зависимостей.** Размер архива под Яндекс Игры важен.
- **Ядро (`js/tetris.js`) не трогает DOM.** Публикует события через
  `game.on(event, cb)`. Рендер и UI только слушают.
- **SDK всегда опционален.** Любой вызов проверяет `SDK.ready` или обёрнут
  в try/catch с silent fallback.
- **Хранилище двойное.** `localStorage` всегда + `player.setData` когда
  доступно. При загрузке — merge: числа по `Math.max`, кампания по лучшим
  звёздам за уровень, серия дней по более свежей дате.
- **Локализация через `data-i18n`.** Все строки — в `js/i18n.js` (RU / EN).
  Не вшивать текст напрямую в JS.
- **Дизайн без неона.** Четыре темы: Neon, Minimal, Wood, Retro. Не добавлять
  Orbitron, радужные градиенты, glow-анимации.
- **Мобильное управление через CSS.** Блок `#settingCtrlMode` скрыт на
  `> 768px` через медиазапрос — не трогать JS для этого.

## Карта файлов

| Файл             | Зона ответственности |
|------------------|----------------------|
| `index.html`     | Каркас, оверлеи (menu/pause/gameover/settings), SDK-скрипт. |
| `css/style.css`  | Все стили. Один файл, никаких дополнительных. |
| `js/i18n.js`     | RU/EN словари. `I18N.t(key, params)`, `apply()` по DOM. |
| `js/storage.js`  | `Storage.get/set` + облако. Ключи: best, lines, кампания, серия. |
| `js/sdk.js`      | YaGames: реклама, лидерборд `best`, deviceInfo, shortcut, review. |
| `js/audio.js`    | WebAudio-синтез. Mute в localStorage. |
| `js/tetris.js`   | Чистое ядро: SRS, 7-bag, hold, lock delay, T-spin, scoring. |
| `js/renderer.js` | Hi-DPI canvas, ghost, очередь ×5, hold, line-clear flash. |
| `js/input.js`    | Клавиатура DAS/ARR (133/17мс), жесты, кнопочная панель. `InputPrefs`. |
| `js/main.js`     | Бутстрап, оверлеи, кампания, Game Over, реклама, темы. |

## Важные константы

- **DAS = 133 мс, ARR = 17 мс** — зашиты в `js/input.js`, не настраиваются пользователем.
- **LB_NAME = "best"** — имя лидерборда в `js/sdk.js`. Должно совпадать с консолью Яндекс.
- **INTERSTITIAL_COOLDOWN_MS = 65 000** — в `js/sdk.js`, поверх системного лимита SDK.
- **Жест hard drop**: скорость ≥ 0.4 px/мс И смещение ≥ 20 px вниз (или ≥ 35 px вверх).
- **Long press hold**: 350 мс без движения.

## Мобильное управление

`InputPrefs` (глобально) хранит `controlMode`: `"gesture"` или `"buttons"`.
Сохраняется в `localStorage` под ключом `"tetris.input.v1"`.

`input.applyControlMode()` устанавливает `touchpad.style.display` инлайном,
перебивая CSS-медиазапросы. Вызывать при смене режима и при бутстрапе.

Настройка `#settingCtrlMode` скрыта CSS (`display:none`) и показывается
только через `@media (max-width: 768px)` — JS не участвует.

## Облачные сохранения

`Storage.set({ campaignJson, streakJson, best, ... })` сразу пишет в
`localStorage` и ставит 600 мс дебаунс на `player.setData(this.data, false)`.

`getCampaignData()` и `getStreakData()` в `main.js` читают из `Storage.get()`,
не из `localStorage` напрямую. Не ломать эту цепочку.

## SDK — что уже реализовано

- `LoadingAPI.ready()` после готовности UI
- `GameplayAPI.start/stop` вокруг каждой игровой сессии
- Interstitial после Game Over и level complete (кулдаун 65 с)
- Rewarded video — возрождение в марафоне (одна попытка)
- Sticky banner на десктопе
- `player.getData/setData` — все игровые данные
- `SDK.isMobile()` — через `deviceInfo.type`, fallback на `pointer: coarse`
- `SDK.showShortcutPrompt()` — после 3-й и 10-й игры
- `SDK.requestReview()` — при первом новом рекорде

## Что не сделано (backlog)

- Полноценная модалка лидерборда с аватарами и именами (`player.publicName`).
- Marathon / Sprint / Ultra режимы выбора длины партии.
- Дашборд статистики PPS, lines/min после партии.
- T-spin mini → full upgrade при kick (частично есть, нет тестов).

## Не делать

- Не добавлять магазин с бонусами — убивает баланс.
- Не добавлять фоновые анимации частиц / glow-эффекты.
- Не использовать `alert()` — есть `showToast()` в `main.js`.
- Не вызывать `showFullscreenAdv` напрямую — только через `SDK.showInterstitial()`.
- Не писать `console.log/warn` в production-пути — SDK-файл чистый.

## Стиль кода

- Одинарные кавычки в JS, двойные в JSON/HTML-атрибутах.
- `const` / `let`, без `var`.
- Без TypeScript.
- Комментарии только там, где неочевидно «почему».

## Локальный запуск

```bash
python3 -m http.server 8080
```

`http://localhost:8080` — игра, `?lang=en` — английский интерфейс.

## Деплой

```bash
zip -r tetris.zip index.html css/ js/
```

Загрузить в консоль Яндекс.Игр. Лидерборд создать с именем `best`.
