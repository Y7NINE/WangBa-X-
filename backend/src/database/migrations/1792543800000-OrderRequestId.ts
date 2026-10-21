import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class OrderRequestId1792543800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const columns = [
      new TableColumn({ name: 'request_id', type: 'varchar', length: '36', isNullable: true }),
      new TableColumn({ name: 'request_fingerprint', type: 'varchar', length: '64', isNullable: true }),
      new TableColumn({ name: 'created_by_id', type: 'int', isNullable: true }),
      new TableColumn({ name: 'created_by_type', type: 'varchar', length: '10', isNullable: true }),
    ];
    for (const column of columns) {
      if (!(await queryRunner.hasColumn('orders', column.name))) await queryRunner.addColumn('orders', column);
    }
    const table = await queryRunner.getTable('orders');
    if (!table?.indices.some(index => index.name === 'UQ_orders_request_id')) {
      await queryRunner.createIndex('orders', new TableIndex({ name: 'UQ_orders_request_id', columnNames: ['request_id'], isUnique: true }));
    }
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('orders', 'UQ_orders_request_id');
    for (const name of ['created_by_type', 'created_by_id', 'request_fingerprint', 'request_id']) {
      await queryRunner.dropColumn('orders', name);
    }
  }
}
