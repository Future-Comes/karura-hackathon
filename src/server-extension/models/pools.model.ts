import {Field, Float, ObjectType, registerEnumType} from "type-graphql";
import {Paginated} from "./paginated.model";

export enum PoolSort {
  id_ASC,
  id_DESC,
  volume1D_ASC,
  volume1D_DESC,
  volume7D_ASC,
  volume7D_DESC,
  tvl_ASC,
  tvl_DESC
}

registerEnumType(PoolSort, { name: "PoolSort" });

@ObjectType()
export class PoolInfoToday {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  fromName!: string;

  @Field(() => String)
  fromSymbol!: string

  @Field(() => String)
  toName!: string;

  @Field(() => String)
  toSymbol!: string

  @Field(() => Float, { nullable: true })
  volume1D?: number;

  @Field(() => Float, { nullable: true })
  volume7D?: number;

  @Field(() => Float, { nullable: true })
  tvl?: number;
}

@ObjectType()
export class PoolsPagination extends Paginated(PoolInfoToday) {}
