Подразумевается настройка как минимум двух окружений: Тестового и Продакшн.

# Frontend

## Тестовое окружение

Создать Dockerfile.test в корне папки с проектом

```dockerfile
FROM node:11.10.1-alpine

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .
```

 Прочитать подробнее о Dockerfile и его структуре можно [тут](https://docs.docker.com/engine/reference/builder/)

## Продакшн окружение

В большинстве случаев нам необходим nginx в качестве сервера раздачи статических файлов. Чтобы разградить nginx файлы от файлов проекта рекомендуется создать следующую структуру.

```
nginx/Dockerfile
nginx/nginx.conf
nginx/ssl/private.key # В случае, если нужно настроить https
nginx/ssl/host.crt    # В случае, если нужно настроить https
```

Содержание файла **nginx/Dockerfile**

```dockerfile
FROM node:11.10.1-alpine AS builder
WORKDIR '/app'
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

FROM nginx

RUN mkdir /nginx

RUN rm -v /etc/nginx/nginx.conf
ADD ./nginx/nginx.conf /etc/nginx/
ADD ./nginx/ssl/private.key /etc/ssl/private.key # В случае, если нужно настроить https
ADD ./nginx/ssl/domain.crt /etc/ssl/domain.crt     # В случае, если нужно настроить https

COPY --from=builder /app/dist /nginx/static
```

Обратите внимание, что пролижение собирается в контейнере `node:11.10.1-alpine`, затем только необходимые файлы копируются в контейнер с `nginx`.



Содержание файла **nginx/nginx.conf**

```nginx
user nginx;
worker_processes auto;

error_log  /var/log/nginx/error.log warn;

events {
    worker_connections  1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    tcp_nodelay on;
    tcp_nopush on;
    sendfile on;

    server_tokens off;

    keepalive_timeout 65;

    server_names_hash_bucket_size 64;

    client_max_body_size 15m;

    gzip on;
    gzip_disable "msie6";
    gzip_comp_level 2;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        text/js
        text/javascript
        application/javascript
        application/x-javascript
        application/json
        application/xml
        image/svg+xml
        font/ttf
        application/vnd.ms-fontobject
        application/x-font-ttf
        application/font-woff
        application/font-woff2
        font/opentype;

    # В случае, если нужно настроить https
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri ;
    }

    server {
        listen 443;

        ssl on;
        ssl_certificate /etc/ssl/domain.crt;
        ssl_certificate_key /etc/ssl/private.key;
        ssl_protocols TLSv1 TLSv1.1 TLSv1.2;

        server_name  _;

        client_max_body_size 75M;

        location / {
            root /nginx/static;
            try_files $uri /index.html;
        }
    }
    #####################################
  
  	# Если https не нужен
  	server {
        listen 80;
        listen [::]:80;

        root /nginx/static;

        index index.html;

        server_name _;

        location / {
            try_files $uri $uri/ @rewrites;
        }

        location @rewrites {
            rewrite ^(.+)$ /index.html last;
        }

        location ~* \.(?:ico|css|js|gif|jpe?g|png)$ {
            # Some basic cache-control for static files to be sent to the browser
            expires max;
            add_header Pragma public;
            add_header Cache-Control "public, must-revalidate, proxy-revalidate";
        }

    }
  	###############################
}


```

Если необходимо настроить https, то в конфигурационном файле nginx вам потребуется указать:

1. Запросы на 80 порт должны перенаправляться на 443 порт
2. Расположение приватного ключа и сертификата ssl



Содержание фала **nginx/ssl/private.key**

```
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----

```



Содержание фала **nginx/ssl/domain.crt**

Вам необходимо объединить 3 сертификата (сам SSL-сертификат, промежуточный и корневой сертификаты) в один файл. 

Поочередно скопируйте и вставьте в созданный документ каждый сертификат. После вставки всех сертификатов файл должен иметь такой вид:

```
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----
```



Скорее всего вам потребуется docker-compose, для запуска приложения на сервере. Создайте `docker-compose.prod.yml` в корне проекта со следующим содержанием:

```yml
version: '3.3'

services:
  client:
    image: <Ссылка на образ в gitlab registry>
    ports:
      - 80:80
      - 443:443
```

Теперь при запуске команды `docker-compose -f docker-compose.prod.yml up` будет запускаться образ из реетста, а не ваш локальный код. Код для запуска приложения таким способом вообще не нужен.

