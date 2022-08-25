import {Arg, Int, Query, Resolver} from "type-graphql";
import {EntityManager} from "typeorm";
import {IPaginatedType} from "../models/paginated.model";
import {pagination} from "../../mappings/utility";
import {Transaction, TransactionsPagination} from "../models/transactions.model";
import {getCountTransactions, getTransactionsQuery} from "../services/transactions.service";

@Resolver()
export class TransactionsResolver {
    constructor(private tx: () => Promise<EntityManager>) {}

    @Query(() => TransactionsPagination)
    async transactionsPagination(
        @Arg('limit', () => Int, { defaultValue: 10, validate: true }) limit: number,
        @Arg('offset', () => Int, { defaultValue: 0, validate: true }) offset: number,
    ): Promise<IPaginatedType<Transaction>> {
        const connection = await this.tx()
        const query = await getTransactionsQuery(connection)

        if (offset) {
            query.offset(offset)
        }

        const node = await query.limit(limit).getRawMany()
        const totalCount = await getCountTransactions(connection)

        return pagination<Transaction>(limit, offset, totalCount, node)
    }
}