import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToMany as OneToMany_} from "typeorm"
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

  @Column_("text", {nullable: false})
  currencyName!: string

  @OneToMany_(() => CurrVolumeDay, e => e.currency)
  volumeDayHistory!: CurrVolumeDay[]

  @OneToMany_(() => CurrLiquidity, e => e.currency)
  liquidityHistory!: CurrLiquidity[]

  @OneToMany_(() => CurrPrice, e => e.currency)
  priceHistory!: CurrPrice[]

  @OneToMany_(() => LiquidityChange, e => e.currencyZero)
  transactions!: LiquidityChange[]
}
