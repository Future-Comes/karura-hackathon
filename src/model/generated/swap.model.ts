import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import * as marshal from "./marshal"
import {Currency} from "./currency.model"

@Entity_()
export class Swap {
  constructor(props?: Partial<Swap>) {
    Object.assign(this, props)
  }

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

  @Index_()
  @ManyToOne_(() => Currency, {nullable: false})
  fromCurrency!: Currency

  @Index_()
  @ManyToOne_(() => Currency, {nullable: false})
  toCurrency!: Currency

  @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
  fromAmount!: bigint

  @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
  toAmount!: bigint
}
