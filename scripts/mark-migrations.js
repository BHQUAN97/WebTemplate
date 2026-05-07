// Marks all known migrations as applied in the DB.
// Used by CI after schema:sync to prevent TypeORM from re-running them.
// Run inside the backend container: node dist/../scripts/mark-migrations.js
// (copied via docker cp from VPS /tmp/mark-migrations.js)
const { DataSource } = require('typeorm');

const ds = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'shared-mysql',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'webtemplate',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'webtemplate',
});

const MIGRATIONS = [
  [1713312000000, 'AddAuthHardeningColumns1713312000000'],
  [1713398400000, 'AddWebhookNextRetryAt1713398400000'],
  [1713484800000, 'CreateChatTables1713484800000'],
  [1713571200000, 'CreateChatToolCalls1713571200000'],
  [1713657600000, 'AddCartUniqueAuditIndexes1713657600000'],
  [1713744000000, 'AddDeletedAtIndexes1713744000000'],
];

ds.initialize()
  .then(async () => {
    await ds.query(
      'CREATE TABLE IF NOT EXISTS `migrations` (' +
        '`id` int NOT NULL AUTO_INCREMENT,' +
        '`timestamp` bigint NOT NULL,' +
        '`name` varchar(255) NOT NULL,' +
        'PRIMARY KEY (`id`)' +
        ') ENGINE=InnoDB',
    );
    for (const [ts, name] of MIGRATIONS) {
      await ds
        .query(
          'INSERT IGNORE INTO `migrations` (`timestamp`,`name`) VALUES (?,?)',
          [ts, name],
        )
        .catch(() => {});
    }
    console.log('Migrations marked as applied:', MIGRATIONS.length, 'rows');
    await ds.destroy();
  })
  .catch((e) => {
    console.error('mark-migrations failed:', e.message);
    process.exit(1);
  });
