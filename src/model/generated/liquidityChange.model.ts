import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import * as marshal from "./marshal"
import {Pool} from "./pool.model"
import {Currency} from "./currency.model"
import {LiquidityChangeReason} from "./_liquidityChangeReason"

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

  @Index_()
  @ManyToOne_(() => Pool, {nullable: false})
  pool!: Pool

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

  @Column_("int4", {nullable: false})
  step!: number

  @Column_("numeric", {nullable: false})
  totalValue!: number

  @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
  totalLiquidityZero!: bigint

  @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
  totalLiquidityOne!: bigint

  @Column_("varchar", {length: 6, nullable: false})
  changeReason!: LiquidityChangeReason

  @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
  timestamp!: bigint

  @Column_("int4", {nullable: false})
  blockNumber!: number

  @Column_("int4", {nullable: false})
  eventIdx!: number

  @Column_("text", {nullable: false})
  eventId!: string

  @Column_("text", {nullable: false})
  hash!: string

  @Column_("text", {nullable: false})
  account!: string
}
