# Структура хранилища (стора)

```txt
addressStore/
  assets/
    countries.json
  utils/
    smartUtil.ts
  index.ts
  addressStore.ts
  addressStore.service.ts
```

## Файл index.ts

Устроен аналогично файлу `index.ts` компонента - определяет API хранилища для использования извне.

```ts
import addressStore from './addressStore';
export default addressStore;
```

## Папка assets

Может содержать любые ресурсы и данные, используемые в хранилище и размещаемые внутри фронтенд-приложения. Как правило, в этом нет необходимости, так как основная часть данных поступает с сервера, для её получения используется **сервис**.

## Сервисы

Сервис - stateless-объект. Его определение размещается в отдельном файле, название которого оканчивается на `.service.js`.
Каждый метод сервиса отвечает за вызов одного из методов серверного API (как правило, речь идет об HTTP RESTful API).
Для вызова RESTful API рекомендуется использовать библиотеку [axios](https://github.com/axios/axios).

## Основной файл хранилища

При создании хранилища следует использовать синтаксис декораторов.

Простой пример файла `addressStore.ts`:

```ts
import { observable, action, computed } from 'mobx';

import countries from './countries.json';
import service from './addressStore.service.js';
import { isAddressSuspicious } from './utils/smartUtil';

class AddressStore {
  constructor() {
    this.addresses = [];
    this.reloadAddresses();
  }

  @observable addresses: string[];

  @action
  reloadAddresses() {
    service.getAddresses().then((result) => {
      this.addresses = result;
    });
  }

  @computed
  suspiciousAddresses() {
    return this.addresses.filter(isAddressSuspicious);
  }

  countries() {
    return countries;
  }

}

export default new AddressStore();
```