import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import {Currency} from "./currency.model"

@Entity_()
export class CurrPrice {
  constructor(props?: Partial<CurrPrice>) {
    Object.assign(this, props)
  }

  @PrimaryColumn_()
  id!: string

  @Index_()
  @ManyToOne_(() => Currency, {nullable: false})
  currency!: Currency

  @Column_("numeric", {nullable: false})
  usdPrice!: number

  @Column_("int4", {nullable: false})
  timestamp!: number
}
