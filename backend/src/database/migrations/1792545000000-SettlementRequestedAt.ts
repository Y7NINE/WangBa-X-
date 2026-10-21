import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class SettlementRequestedAt1792545000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('sessions', 'settlement_requested_at'))) {
      await queryRunner.addColumn('sessions', new TableColumn({
        name: 'settlement_requested_at', type: queryRunner.connection.options.type === 'postgres' ? 'timestamp' : 'datetime', isNullable: true,
      }));
    }
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('sessions', 'settlement_requested_at');
  }
}
