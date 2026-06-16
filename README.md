Chef a la Russe — запуск с нуля

Как поднять проект на другом компьютере (Windows, macOS или Linux).

1. Установить Node.js 18 или новее и PostgreSQL.

2. Склонировать или скопировать папку проекта на диск.

3. В корне проекта открыть терминал и выполнить:

```bash
npm install
```

4. Создать в корне проекта файл .env с содержимым:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/chef_championship
JWT_SECRET=любой-длинный-секрет-минимум-32-символа
```

Замените USER, PASSWORD и имя базы на свои. Базу chef_championship нужно создать в PostgreSQL заранее.

5. Применить схему базы и тестовых пользователей:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Если migrate выдаёт ошибку на уже существующей базе, уточните у автора проекта или выполните npm run db:push (осторожно: может затереть данные).

6. Запустить приложение:

```bash
npm run dev
```

7. Открыть в браузере: http://localhost:3000

Учётные записи после npm run db:seed

| Роль  | Email               | Пароль     |
|-------|---------------------|------------|
| Админ | admin@example.com   | Admin123!  |
| Судья | judge@example.com   | Judge123!  |

Участники создаются через регистрацию на сайте (/register).

Файлы загрузок сохраняются в папку uploads/ в корне проекта — у процесса Node должны быть права на запись.
