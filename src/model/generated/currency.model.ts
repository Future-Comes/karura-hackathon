import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, ManyToOne as ManyToOne_, OneToMany as OneToMany_} from "typeorm"
import {CoinGecko} from "./coinGecko.model"
import {CurrVolumeDay} from "./currVolumeDay.model"
import {CurrLiquidity} from "./currLiquidity.model"
import {CurrPrice} from "./currPrice.model"
import {LiquidityChange} from "./liquidityChange.model"

@Entity_()
export class Currency {
  constructor(props?: Partial<Currency>) {
    Object.assign(this, props)
  }

  /**
   * Currency address
   */
  @PrimaryColumn_()
  id!: string

  @Index_({unique: true})
  @Column_("text", {nullable: false})
  symbol!: string

  @Column_("int4", {nullable: false})
  decimal!: number

  @Index_()
  @ManyToOne_(() => CoinGecko, {nullable: true})
  coinGecko!: CoinGecko | undefined | null

  @OneToMany_(() => CurrVolumeDay, e => e.currency)
  volumeDayHistory!: CurrVolumeDay[]

  @OneToMany_(() => CurrLiquidity, e => e.currency)
  liquidityHistory!: CurrLiquidity[]

  @OneToMany_(() => CurrPrice, e => e.currency)
  priceHistory!: CurrPrice[]

  @OneToMany_(() => LiquidityChange, e => e.currencyZero)
  transactions!: LiquidityChange[]
}
