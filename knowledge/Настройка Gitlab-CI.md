##Общий порядок работ

1. Создать файл `.gitlab-ci.yml`

2. Насписать конфигурацию для gitlab-runner в `.gitlab-ci.yml` в соответствии с [документацией](https://docs.gitlab.com/ee/ci/), ознакомиться с возможностями конфигурации можно [тут](https://docs.gitlab.com/ee/ci/yaml/README.html)
3. Commit и Push в репозиторий.

## Пример конфигурации для frontend

```yml
# This file is a template, and might need editing before it works on your project.
# Official docker image.
image: docker:latest

services:
  - docker:dind

variables:
  STAGE_SSH_USER: sibdev
  SSH_OPT: "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

stages:
  - test
  - build
  - deploy

before_script:
  - apk add --update --no-cache openssh sshpass
  - docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" $CI_REGISTRY

test:
  stage: test
  script:
    - docker build --pull -t "$CI_REGISTRY_IMAGE:$CI_COMMIT_REF_SLUG" -f Dockerfile.dev .
    - docker run "$CI_REGISTRY_IMAGE:$CI_COMMIT_REF_SLUG" npm run test:unit -- --coverage
  only:
    - merge_request

lint:
  stage: test
  script:
    - docker build --pull -t "$CI_REGISTRY_IMAGE:$CI_COMMIT_REF_SLUG" -f Dockerfile.dev .
    - docker run "$CI_REGISTRY_IMAGE:$CI_COMMIT_REF_SLUG" npm run lint
  only:
    - merge_request

build:
  stage: build
  script:
    - docker build --pull -t "$CI_REGISTRY_IMAGE" -f nginx/Dockerfile .
    - docker push "$CI_REGISTRY_IMAGE"
  only:
    - master


deploy-stage:
  stage: deploy
  script:
    - sshpass -V
    - export SSHPASS=$STAGE_SSH_PASS
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "docker --version"
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "docker-compose --version"
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY"
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "mkdir -p /data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME"
    - sshpass -e scp $SSH_OPT ./docker-compose.prod.yml root@$STAGE_SSH_HOST:/data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME/docker-compose.yml
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "cd /data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME/ && docker-compose pull"
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "cd /data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME/ && docker-compose up -d"
  only:
    - master

```

## Пример конфогурации для Backend

```yml
image:
  name: docker/compose:1.24.0 # update tag to whatever version you want to use.
  entrypoint: ["/bin/sh", "-c"]

services:
  - docker:dind

variables:
  DOCKER_HOST: tcp://docker:2375/
  DOCKER_DRIVER: overlay2
  STAGE_SSH_USER: sibdev
  SSH_OPT: "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

before_script:
  - apk add --update --no-cache openssh sshpass
  - docker version
  - docker-compose version
  - docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" $CI_REGISTRY

stages:
  - test
  - build
  - deploy

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


deploy-stage:
  stage: deploy
  script:
    - sshpass -V
    - export SSHPASS=$STAGE_SSH_PASS
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "docker --version"
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "docker-compose --version"
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY"
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "mkdir -p /data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME"
    - sshpass -e scp $SSH_OPT ./docker-compose.prod.yml root@$STAGE_SSH_HOST:/data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME/docker-compose.yml
    - sshpass -e scp $SSH_OPT ./.env root@$STAGE_SSH_HOST:/data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME/.env
    - sshpass -e scp $SSH_OPT ./.env.db root@$STAGE_SSH_HOST:/data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME/.env.db
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "cd /data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME/ && docker-compose pull"
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "cd /data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME/ && docker-compose run --rm server bash -c \"python manage.py migrate --noinput\""
    - sshpass -e ssh $SSH_OPT root@$STAGE_SSH_HOST "cd /data/$CI_PROJECT_NAMESPACE/$CI_PROJECT_NAME/ && docker-compose up -d"
  only:
    - master

test:
  stage: test
  script:
    - docker-compose -f docker-compose.test.yml run server python manage.py test --verbosity 2
  only:
    - merge_request
```

