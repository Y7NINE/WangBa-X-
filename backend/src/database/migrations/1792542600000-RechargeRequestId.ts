import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/** Additive migration; existing and non-recharge transactions retain NULL request IDs. */
export class RechargeRequestId1792542600000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('transactions', 'request_id'))) {
      await queryRunner.addColumn('transactions', new TableColumn({
        name: 'request_id', type: 'varchar', length: '36', isNullable: true,
      }));
    }
    const table = await queryRunner.getTable('transactions');
    if (!table?.indices.some(index => index.name === 'UQ_transactions_recharge_request_id')) {
      await queryRunner.createIndex('transactions', new TableIndex({
        name: 'UQ_transactions_recharge_request_id', columnNames: ['request_id'], isUnique: true,
      }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('transactions', 'UQ_transactions_recharge_request_id');
    await queryRunner.dropColumn('transactions', 'request_id');
  }
}
