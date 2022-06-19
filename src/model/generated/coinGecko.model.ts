import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToOne as OneToOne_} from "typeorm"
import {Currency} from "./currency.model"

@Entity_()
export class CoinGecko {
  constructor(props?: Partial<CoinGecko>) {
    Object.assign(this, props)
  }

  @PrimaryColumn_()
  id!: string

  @Column_("text", {nullable: false})
  symbol!: string

  @Column_("text", {nullable: false})
  name!: string

  @OneToOne_(() => Currency)
  currency!: Currency | undefined | null
}
