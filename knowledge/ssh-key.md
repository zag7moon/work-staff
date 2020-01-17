Выдача прав доступа к серверу:

1. ssh-keygen
2. Указать папку `~/server-keys/<server-name>/<username>_rsa`
3. Опубликовать ключ `ssh-copy-id -i ~/server-keys/<server-name>/<username>_rsa.pub root@X.X.X.X`

Вход по ssh ключу `ssh -i <path-to-key> user@x.x.x.x`
Решение проблемы с правами доступа `chmod 400 <path-to-key>`