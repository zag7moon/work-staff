#Деплой Sibdev

Процесс деплоя должен быть по возможности автоматизирован при помощи gitlab-ci. Изменения ветки master должны автоматически деплоиться на staging сервер. 

Приложения и его части в продакшне должны запускаться в виде [докер](https://www.docker.com/) контейнеров. Контейнеры должны быть собраны при помощи gitlab runner и храниться в gitlab registry, так как сборка это очень ресурсозатратный процесс.

## Предварительные требования

Для деплоя докер контейнеров необходим сервер удовлетворяющий следующим требованиям:

- Поддержкой виртуализации (Linux OpenVZ), так как на KVM сервера невозможно устаноить docker.
- От 1Гб оперативной памяти
- В проекте настроен Docker для продакшна

## Базовая настройка сервера

1. Входим на сервер под root

```bash
ssh root@your_server_ip
```

2. Создаем пользователя

```bash
adduser sibdev
```

3. Даем пользователю права администратора

```bash
usermod -aG sudo sibdev
```

4. Выходим из системы

```bash
exit
```



Далее все действия необходимо выполнять под созданным пользователем.

## Установка Docker на сервер

Актуальную версию инструкции по установки Docker на сервер под управлением разных ОС можно найти по [ссылке](https://docs.docker.com/install/linux/docker-ce/ubuntu/).

Там же слева можно выбрать инструкции для других операционных систем.

## Установка docker-compose (при необходимости)

Актуальную версию инструкции можно посмотреть [тут](https://docs.docker.com/compose/install/)

## Настройка деплоя при помощи Gitlab-CI

1. Добавить учетные данные от сервера в gitlab values: **Settings > CI / CD > Variables**

- STAGE_SSH_PASS
- STAGE_SSH_HOST
- Другие если необходимо...



2. Настроить .gitlab-ci.yml файл для деплоя

Выбрать подходящий образ c описанием сервиса

```yml
image:
  name: docker/compose:1.24.0 # update tag to whatever version you want to use.
  entrypoint: ["/bin/sh", "-c"]

services:
  - docker:dind
```

Описать необходимые переменные окружения

```yml
variables:
  DOCKER_HOST: tcp://docker:2375/
  DOCKER_DRIVER: overlay2
  STAGE_SSH_USER: sibdev
  SSH_OPT: "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
```

Описать действия для выполнения перед скриптом

```yml
before_script:
  - apk add --update --no-cache openssh sshpass
  - docker version
  - docker-compose version
  - docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" $CI_REGISTRY
```

Описать стадии runner`a

```yml
stages:
  - build # stage для сборки контейнеров
  - deploy # stage для скрипта деплоя
```

Описать инструкции сборки. Такие инструкции должны быть для всех составных частей приложения, требующих сборки.

```yml
build-server:
  stage: build
  script:
    - docker build --pull -t "$CI_REGISTRY_IMAGE/server" -f ./server/Dockerfile .
    - docker push "$CI_REGISTRY_IMAGE/server"
  only:
    - master

build-nginx:
  stage: build
  script:
    - docker build --pull -t "$CI_REGISTRY_IMAGE/nginx" -f ./nginx/Dockerfile .
    - docker push "$CI_REGISTRY_IMAGE/nginx"
  only:
    - master
```

Описать скрипт деплоя

```yml
deploy-stage:
  stage: deploy
  script:
  	# Проверяем, что sshpass установлен
    - sshpass -V
    # Объявляем переменную окружения SSHPASS, в которую передаем значение переменной окружения STAGE_SSH_PASS, ранее объявленной в gitlab variables, содержащей пароль он сервера.
    - export SSHPASS=$STAGE_SSH_PASS
    # Проверяем, что docker установлен
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "docker --version"
    # Проверяем, что docker-compose установлено
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "docker-compose --version"
    # Авторизуемся в реестр контейнеров gitlab
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY"
    # Создаем рабочую директорию на сервере
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "mkdir -p /data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME"
    # Копируем на сервер файл docker-compose.yml
    - sshpass -e scp $SSH_OPT ./docker-compose.prod.yml root@$STAGE_SSH_HOST:/data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME/docker-compose.yml
    # Копируем на сервер файл .env с переменными окружения для запуска приложения
    - sshpass -e scp $SSH_OPT ./.env root@$STAGE_SSH_HOST:/data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME/.env
    # Копируем на сервер файл .env.db с переменными окружения для запуска контейнера с БД
    - sshpass -e scp $SSH_OPT ./.env.db root@$STAGE_SSH_HOST:/data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME/.env.db
    # Вытягиваем из реестра контейнеров новые версии
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "cd /data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME/ && docker-compose pull"
    # Запускаем миграции в каонтейнере
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "cd /data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME/ && docker-compose run --rm server bash -c \"python manage.py migrate --noinput\""
    # Запускаем контейнеры в deatached режиме
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "cd /data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME/ && docker-compose up -d"
  only:
    - master
```

В данном скрипте используется утилита [sshpass](https://linux.die.net/man/1/sshpass), которая позволяет выполнять команды на сервере по ssh без ввода пароля в интерактивном режиме. Обратите внимание, что это утиллита была установлена ранее в блоке before_script.



## После деплоя

После завершения деплоя необходимо перезагрузить сервер командой 

```sh
 sudo reboot
```

 Для того, чтобы удостовериться, что в случае перезагрузки все сервисы запускаются и работают в штатном режиме без вмешательства человека.
