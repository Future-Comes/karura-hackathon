import {Field, ObjectType, registerEnumType} from "type-graphql";
import {Int} from "@subsquid/graphql-server";
import {Paginated} from "./paginated.model";

enum LiquidityChangeReason {
    INIT,
    SWAP,
    ADD,
    REMOVE,
}

registerEnumType(LiquidityChangeReason, { name: "LiquidityChangeReason" });

@ObjectType()
export class Transaction {
    @Field(() => String)
    id!: string

    @Field(() => BigInt)
    amountZero!: number

    @Field(() => BigInt)
    amountOne!: number

    @Field(() => BigInt)
    totalLiquidityZero!: number

    @Field(() => BigInt)
    totalLiquidityOne!: number

    @Field(() => String)
    currencyZero!: string

    @Field(() => String)
    currencyOne!: string

    @Field(() => BigInt)
    timestamp!: number

    @Field(() => Int)
    blockNumber!: number

    @Field(() => String)
    changeReason!: LiquidityChangeReason

    @Field(() => Int)
    eventIdx!: number

    @Field(() => String)
    eventId!: string

    @Field(() => String)
    hash!: string

    @Field(() => String)
    account!: string
}

@ObjectType()
export class TransactionsPagination extends Paginated(Transaction) {}