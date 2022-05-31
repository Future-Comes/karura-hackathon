module.exports = class Init1654006275058 {
  name = 'Init1654006275058'

  async up(db) {
    await db.query(`ALTER TABLE "liquidity_change" ADD "pool_id" character varying NOT NULL`)
    await db.query(`CREATE INDEX "IDX_59f7403843cb6443f368122bb8" ON "liquidity_change" ("pool_id") `)
    await db.query(`ALTER TABLE "liquidity_change" ADD CONSTRAINT "FK_59f7403843cb6443f368122bb89" FOREIGN KEY ("pool_id") REFERENCES "pool"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
  }

  async down(db) {
    await db.query(`ALTER TABLE "liquidity_change" DROP COLUMN "pool_id"`)
    await db.query(`DROP INDEX "public"."IDX_59f7403843cb6443f368122bb8"`)
    await db.query(`ALTER TABLE "liquidity_change" DROP CONSTRAINT "FK_59f7403843cb6443f368122bb89"`)
  }
}
