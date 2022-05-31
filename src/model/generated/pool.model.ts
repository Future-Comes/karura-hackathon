import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToMany as OneToMany_} from "typeorm"
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

  @Column_("text", {nullable: false})
  currencyZero!: string

  @Column_("text", {nullable: false})
  currencyOne!: string

  @OneToMany_(() => PoolVolumeDay, e => e.pool)
  volumeDaysDay!: PoolVolumeDay[]

  @OneToMany_(() => PoolLiquidity, e => e.pool)
  liquidityHistory!: PoolLiquidity[]

  @OneToMany_(() => LiquidityChange, e => e.pool)
  poolOperations!: LiquidityChange[]
}
