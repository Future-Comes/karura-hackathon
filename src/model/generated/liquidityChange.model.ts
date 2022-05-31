import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import * as marshal from "./marshal"
import {LiquidityChangeReason} from "./_liquidityChangeReason"
import {Currency} from "./currency.model"
import {Pool} from "./pool.model"

@Entity_()
export class LiquidityChange {
  constructor(props?: Partial<LiquidityChange>) {
    Object.assign(this, props)
  }

  /**
   * LiquidityChange address
   */
  @PrimaryColumn_()
  id!: string

  @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
  timestamp!: bigint

  @Column_("int4", {nullable: false})
  blockNumber!: number

  @Column_("int4", {nullable: false})
  eventIdx!: number

  @Column_("int4", {nullable: false})
  step!: number

  @Column_("varchar", {length: 6, nullable: false})
  reason!: LiquidityChangeReason

  @Index_()
  @ManyToOne_(() => Currency, {nullable: false})
  currencyZero!: Currency

  @Index_()
  @ManyToOne_(() => Currency, {nullable: false})
  currencyOne!: Currency

  @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
  amountZero!: bigint

  @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
  amountOne!: bigint

  @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
  balanceZero!: bigint

  @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
  balanceOne!: bigint

  @Index_()
  @ManyToOne_(() => Pool, {nullable: false})
  pool!: Pool
}
