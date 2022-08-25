import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import {Pool} from "./pool.model"

@Entity_()
export class PoolVolumeDay {
  constructor(props?: Partial<PoolVolumeDay>) {
    Object.assign(this, props)
  }

  @PrimaryColumn_()
  id!: string

  @Index_()
  @ManyToOne_(() => Pool, {nullable: false})
  pool!: Pool

  @Column_("numeric", {nullable: false})
  volumeDayUSD!: number

  @Column_("int4", {nullable: false})
  timestamp!: number
}
