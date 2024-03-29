import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import {Pool} from "./pool.model"

@Entity_()
export class PoolLiquidity {
  constructor(props?: Partial<PoolLiquidity>) {
    Object.assign(this, props)
  }

  @PrimaryColumn_()
  id!: string

  @Index_()
  @ManyToOne_(() => Pool, {nullable: false})
  pool!: Pool

  @Column_("numeric", {nullable: false})
  usdPriceZero!: number

  @Column_("numeric", {nullable: false})
  usdPriceOne!: number

  @Column_("numeric", {nullable: false})
  usdTotalLiquidity!: number

  @Column_("int4", {nullable: false})
  timestamp!: number
}
