import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_} from "typeorm"
import * as marshal from "./marshal"

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

  @Column_("text", {nullable: false})
  fromCurrency!: string

  @Column_("text", {nullable: false})
  toCurrency!: string

  @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
  fromAmount!: bigint

  @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
  toAmount!: bigint
}
