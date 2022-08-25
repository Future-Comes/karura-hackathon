import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import * as marshal from "./marshal"
import {Currency} from "./currency.model"

@Entity_()
export class CurrVolumeDay {
  constructor(props?: Partial<CurrVolumeDay>) {
    Object.assign(this, props)
  }

  @PrimaryColumn_()
  id!: string

  @Index_()
  @ManyToOne_(() => Currency, {nullable: false})
  currency!: Currency

  @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
  volumeDayNative!: bigint

  @Column_("numeric", {nullable: false})
  volumeDayUSD!: number

  @Column_("int4", {nullable: false})
  timestamp!: number
}
