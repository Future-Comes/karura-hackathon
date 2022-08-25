import {Field, Float, InputType, Int, ObjectType, registerEnumType} from "type-graphql";
import {Paginated} from "./paginated.model";
import {PoolsPagination} from "./pools.model";
import {TransactionsPagination} from "./transactions.model";

@ObjectType()
export class ListInfo {
    @Field()
    price!: number

    @Field()
    timestamp!: string
}

@ObjectType()
export class CurrencyInfo {
    @Field(() => String)
    id!: string;

    @Field(() => String)
    name!: string;

    @Field(() => String)
    symbol!: string

    @Field(() => Float)
    price!: number;

    @Field(() => Float)
    priceChange!: number;

    @Field(() => Float)
    volume!: number;

    @Field(() => Float)
    volumeChange!: number;

    @Field(() => Float)
    volume7D!: number;

    @Field(() => Float)
    tvl!: number;

    @Field(() => Float)
    tvlChange!: number;

    @Field(() => [ListInfo])
    tvlList!: ListInfo[]

    @Field(() => [ListInfo])
    volumeList!: ListInfo[]

    @Field(() => [ListInfo])
    priceList!: ListInfo[]

    @Field(() => PoolsPagination)
    pools!: PoolsPagination

    @Field(() => TransactionsPagination)
    transactions!: TransactionsPagination
}

export enum CurrencySort {
    id_ASC,
    id_DESC,
    price_ASC,
    price_DESC,
    priceChange_ASC,
    priceChange_DESC,
    volume_ASC,
    volume_DESC,
    tvl_ASC,
    tvl_DESC
}

registerEnumType(CurrencySort, { name: "CurrencySort" });

@InputType()
export class CurrencyWhereInput {
    @Field(() => Int, { nullable: true })
    price_from?: number

    @Field(() => Int, { nullable: true })
    price_to?: number

    @Field(() => Int, { nullable: true })
    priceChange_from?: number

    @Field(() => Int, { nullable: true })
    priceChange_to?: number
}

@ObjectType()
export class CurrencyInfoToday {
    @Field(() => String)
    id!: string;

    @Field(() => String)
    name!: string;

    @Field(() => String)
    symbol!: string

    @Field(() => Float)
    price!: number;

    @Field(() => Float)
    priceChange!: number;

    @Field(() => Float)
    volume!: number;

    @Field(() => Float)
    tvl!: number;
}

@ObjectType()
export class CurrenciesPagination extends Paginated(CurrencyInfoToday) {}