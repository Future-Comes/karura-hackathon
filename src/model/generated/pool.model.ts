import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, OneToMany as OneToMany_} from "typeorm"
import {Currency} from "./currency.model"
import {PoolVolumeDay} from "./poolVolumeDay.model"
import {PoolLiquidity} from "./poolLiquidity.model"
import {LiquidityChange} from "./liquidityChange.model"

@Entity_()
export class Pool {
  constructor(props?: Partial<Pool>) {
    Object.assign(this, props)
  }

  /**
   * Pool address
   */
  @PrimaryColumn_()
  id!: string

  @Index_()
  @ManyToOne_(() => Currency, {nullable: false})
  currencyZero!: Currency

  @Index_()
  @ManyToOne_(() => Currency, {nullable: false})
  currencyOne!: Currency

  @OneToMany_(() => PoolVolumeDay, e => e.pool)
  volumeDaysDay!: PoolVolumeDay[]

  @OneToMany_(() => PoolLiquidity, e => e.pool)
  liquidityHistory!: PoolLiquidity[]

  @OneToMany_(() => LiquidityChange, e => e.pool)
  poolOperations!: LiquidityChange[]
}
