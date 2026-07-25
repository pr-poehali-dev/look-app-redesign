#!/bin/bash
# Автоустановка TURN-сервера coturn для Look на Ubuntu (Beget VPS)
# Запуск: sudo bash install-coturn.sh

set -e

DOMAIN="turn.look.com.ru"
TURN_USER="lookuser"
TURN_PASS=$(openssl rand -hex 16)
REALM="look.com.ru"

echo ""
echo "=========================================="
echo "  Установка TURN-сервера для Look"
echo "=========================================="
echo ""

if [ "$EUID" -ne 0 ]; then
  echo "Запусти через sudo: sudo bash install-coturn.sh"
  exit 1
fi

echo "[1/7] Определяем публичный IP..."
PUBLIC_IP=$(curl -s https://api.ipify.org)
if [ -z "$PUBLIC_IP" ]; then
  echo "Не удалось определить IP. Введи вручную:"
  read -r PUBLIC_IP
fi
echo "    IP сервера: $PUBLIC_IP"

echo "[2/7] Обновляем систему и ставим пакеты..."
apt update -qq
DEBIAN_FRONTEND=noninteractive apt install -y coturn certbot ufw curl

echo "[3/7] Включаем coturn в автозагрузке..."
sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn || \
  echo "TURNSERVER_ENABLED=1" > /etc/default/coturn

echo "[4/7] Получаем TLS-сертификат для $DOMAIN..."
echo "    ВАЖНО: домен $DOMAIN должен быть направлен на $PUBLIC_IP (A-запись в DNS)"
echo ""
read -p "    Готово? Нажми Enter чтобы продолжить (или Ctrl+C чтобы остановить и настроить DNS)..."

if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  certbot certonly --standalone --non-interactive --agree-tos \
    --email admin@look.com.ru -d "$DOMAIN" --preferred-challenges http || {
    echo "Сертификат не получен. Будем работать без TLS (только turn:// без turns://)"
    DOMAIN=""
  }
fi

if [ -n "$DOMAIN" ] && [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  chgrp turnserver /etc/letsencrypt/live /etc/letsencrypt/archive 2>/dev/null || true
  chmod g+rx /etc/letsencrypt/live /etc/letsencrypt/archive 2>/dev/null || true
fi

echo "[5/7] Пишем конфиг /etc/turnserver.conf..."
cat > /etc/turnserver.conf <<EOF
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
external-ip=$PUBLIC_IP
relay-ip=$PUBLIC_IP
min-port=49152
max-port=65535
fingerprint
lt-cred-mech
realm=$REALM
user=$TURN_USER:$TURN_PASS
no-cli
no-tlsv1
no-tlsv1_1
log-file=/var/log/turnserver.log
simple-log
EOF

if [ -n "$DOMAIN" ] && [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  cat >> /etc/turnserver.conf <<EOF
cert=/etc/letsencrypt/live/$DOMAIN/fullchain.pem
pkey=/etc/letsencrypt/live/$DOMAIN/privkey.pem
EOF
fi

echo "[6/7] Открываем порты в фаерволе..."
ufw allow 22/tcp >/dev/null 2>&1 || true
ufw allow 3478/tcp >/dev/null 2>&1 || true
ufw allow 3478/udp >/dev/null 2>&1 || true
ufw allow 5349/tcp >/dev/null 2>&1 || true
ufw allow 5349/udp >/dev/null 2>&1 || true
ufw allow 49152:65535/udp >/dev/null 2>&1 || true
echo "y" | ufw enable >/dev/null 2>&1 || true

echo "[7/7] Запускаем coturn..."
systemctl enable coturn >/dev/null 2>&1
systemctl restart coturn
sleep 2

if systemctl is-active --quiet coturn; then
  echo ""
  echo "=========================================="
  echo "  УСПЕШНО! TURN-сервер работает"
  echo "=========================================="
  echo ""
  echo "Передай Юре эти 3 значения:"
  echo ""
  if [ -n "$DOMAIN" ]; then
    echo "  VITE_TURN_URL=turn:$DOMAIN:3478,turns:$DOMAIN:5349"
  else
    echo "  VITE_TURN_URL=turn:$PUBLIC_IP:3478"
  fi
  echo "  VITE_TURN_USERNAME=$TURN_USER"
  echo "  VITE_TURN_CREDENTIAL=$TURN_PASS"
  echo ""
  echo "Проверка работы: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/"
  echo "Логи: tail -f /var/log/turnserver.log"
  echo ""
else
  echo "Ошибка: coturn не запустился. Смотри: journalctl -u coturn -n 50"
  exit 1
fi
