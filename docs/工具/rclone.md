```shell
rclone mount mobilesync:/mnt/disk ~/media/disk --cache-dir /tmp --allow-other --attr-timeout 5m  --vfs-cache-mode full --vfs-cache-max-age 48h --vfs-cache-max-size 10G --vfs-read-chunk-size-limit 100M --buffer-size 100M --daemon

rclone mount jianguoyun:/ ~/media/jianguoyun --cache-dir /tmp --allow-other --attr-timeout 5m  --vfs-cache-mode full --vfs-cache-max-age 48h --vfs-cache-max-size 10G --vfs-read-chunk-size-limit 100M --buffer-size 100M --daemon

/usr/local/bin/rclone copy --verbose --transfers 4 --checkers 8 --contimeout 60s --timeout 300s --retries 3 --low-level-retries 10 --exclude .DS_Store --stats 1s --stats-file-name-length 0 --fast-list /Users/huangbinghui/Library/Application Support/MobileSync/Backup mobilesync:/mnt/disk/MobileSync/Backup
```

