# MySQL Inventory Concurrency Suite

`MySqlConcurrencyTest` deliberately does not run against SQLite. It starts a second PHP worker while the first worker holds a MySQL `FOR UPDATE` lock on the same vaccine batch.

Use a dedicated, disposable MySQL 8 database only. Never point this suite at the local development, synthetic-demo, or production database.

```powershell
$env:MYSQL_CONCURRENCY_TESTING = '1'
$env:MYSQL_CONCURRENCY_TEST_DATABASE = 'animalbite_concurrency_test'
$env:DB_CONNECTION = 'mysql'
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '3306'
$env:DB_DATABASE = 'animalbite_concurrency_test'
$env:DB_USERNAME = '<test-user>'
$env:DB_PASSWORD = '<test-password>'
php artisan test --filter=MySqlConcurrencyTest
```

The configured `DB_DATABASE` must exactly equal `MYSQL_CONCURRENCY_TEST_DATABASE`. The test runs migrations and rolls them back, so the database must contain no valuable data.
