#!/bin/bash
# Очистка docker и логов
docker system prune -af --volumes --filter "until=168h" || true
journalctl --vacuum-time=7d || true
find /var/log -type f -name "*.gz" -mtime +14 -delete 2>/dev/null || true
echo "Cleanup done at $(date)"
