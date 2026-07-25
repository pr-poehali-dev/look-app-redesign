# Установка Visov media-стека на VPS 155.212.128.190

Полный стек: signaling (Socket.io) + SFU (mediasoup) + TURN (coturn) + Nginx + автообслуживание.

---

## 0. Предусловия

DNS-записи в `look.com.ru` (создать заранее, дать 5–30 минут на распространение):
- `signal.look.com.ru` → 155.212.128.190
- `sfu.look.com.ru` → 155.212.128.190
- `turn.look.com.ru` → 155.212.128.190

VPS: Ubuntu 22.04+ (или Debian 12), root-доступ, белый IP.

---

## 1. Подготовка VPS

Подключись по SSH:
```bash
ssh root@155.212.128.190
```

Установи Docker и утилиты:
```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg ufw git

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker
```

---

## 2. Файрвол

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 5349/tcp
ufw allow 5349/udp
ufw allow 49160:49200/udp
ufw allow 40000:40200/udp
ufw allow 40000:40200/tcp
ufw --force enable
```

---

## 3. Загрузка кода

Залей папку `server/` из проекта на VPS в `/opt/visov`:

Вариант А (через git, если проект подключён к GitHub):
```bash
mkdir -p /opt && cd /opt
git clone <ваш-репозиторий> visov-src
cp -r visov-src/server /opt/visov
cd /opt/visov
```

Вариант Б (через scp с локального компьютера):
```bash
# на локальной машине
scp -r ./server root@155.212.128.190:/opt/visov
ssh root@155.212.128.190
cd /opt/visov
```

---

## 4. Конфигурация .env

```bash
cd /opt/visov
cp .env.example .env
# Сгенерировать секрет TURN
openssl rand -hex 32
# Скопировать вывод и вставить в .env как TURN_SECRET
nano .env
```

Также подставь `TURN_SECRET` в `coturn/turnserver.conf` (поле `static-auth-secret`).

`AUTH_VERIFY_URL` — URL твоей backend-функции `auth/me` из `func2url.json` проекта. Эта функция должна принимать заголовки `X-Auth-Token` и `X-User-Id` и возвращать `{id, name, avatar}`.

---

## 5. SSL-сертификаты Let's Encrypt

Перед запуском убедись, что DNS-записи уже работают:
```bash
dig +short signal.look.com.ru
dig +short sfu.look.com.ru
dig +short turn.look.com.ru
# должен вернуться 155.212.128.190
```

Получить сертификаты:
```bash
chmod +x scripts/*.sh
LETSENCRYPT_EMAIL=admin@look.com.ru ./scripts/init-ssl.sh
```

---

## 6. Запуск стека

```bash
cd /opt/visov
docker compose build
docker compose up -d
docker compose ps
```

Проверка:
```bash
curl https://signal.look.com.ru/health
curl https://sfu.look.com.ru/health
```

Должны вернуть JSON `{"ok":true,...}`.

---

## 7. Автообслуживание

```bash
./scripts/install-cron.sh
```

Это поставит:
- проверку каждые 2 минуты — рестарт контейнера если упал
- ежедневный бэкап в 03:00 в `/var/backups/visov`
- очистку старых логов и образов в 04:00

---

## 8. Watchdog (защита от зависания ОС)

```bash
apt install -y watchdog
echo "watchdog-device = /dev/watchdog" >> /etc/watchdog.conf
echo "max-load-1 = 24" >> /etc/watchdog.conf
systemctl enable --now watchdog
```

Если ОС зависнет — через 60 секунд аппаратный ребут.

---

## 9. Дальнейшее обслуживание

Логи:
```bash
docker compose logs -f signaling
docker compose logs -f sfu
docker compose logs -f coturn
```

Обновление кода:
```bash
cd /opt/visov
git pull   # или scp заново
docker compose build
docker compose up -d
```

Сертификаты обновляются автоматически контейнером `certbot` каждые 12 часов.

---

## 10. Что отдать разработчику фронта

После установки в проект надо положить эти URL (уже зашиты в клиенте):
- Signaling: `https://signal.look.com.ru`
- SFU: `https://sfu.look.com.ru`
- TURN: `turn:turn.look.com.ru:3478` и `turns:turn.look.com.ru:5349`
- TURN secret — для генерации временных credentials в backend (`backend/ice-servers`)

`TURN_SECRET` нужно добавить как secret проекта на poehali — для backend-функции `ice-servers`.
