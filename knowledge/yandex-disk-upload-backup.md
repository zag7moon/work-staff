# Загрузка файла на Яндекс.Диск из командной строки

Не стоит хранить backup на том же сервере, что и основные данные. Но как быть, если сервер всего один? На помощь могут прийти облачные хранилища, которые работают по протоколу WebDAV, например Яндекс.Диск. Загрузить туда файл можно обычным HTTP-запросом с помощью утилиты curl из командной строки или bash-скрипта. Делается это так:

```
curl -T локальный_файл https://webdav.yandex.ru/удаленный_файл --user логин:пароль
```

При необходимости у имени удаленного файла можно указать и путь, например, Backups/daily.gz, но тогда все каталоги в пути должны уже существовать на сервере.
