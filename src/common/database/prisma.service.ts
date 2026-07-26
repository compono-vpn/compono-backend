import { PrismaClient } from '@prisma/client';

// import { PrismaPg } from '@prisma/adapter-pg';
import { Injectable, OnModuleInit } from '@nestjs/common';

import {
    DEFAULT_CONNECTION_LIMIT,
    DEFAULT_POOL_TIMEOUT_SECONDS,
    buildDatabaseUrl,
    parsePositiveInt,
} from './build-database-url';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    constructor() {
        // const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
        const connectionLimit = parsePositiveInt(
            process.env.DATABASE_CONNECTION_LIMIT,
            DEFAULT_CONNECTION_LIMIT,
        );
        const poolTimeoutSeconds = parsePositiveInt(
            process.env.DATABASE_POOL_TIMEOUT,
            DEFAULT_POOL_TIMEOUT_SECONDS,
        );

        super({
            // log: ['query'],
            // adapter,
            datasourceUrl: buildDatabaseUrl(
                process.env.DATABASE_URL as string,
                connectionLimit,
                poolTimeoutSeconds,
            ),
        });
        // init with config
    }
    async onModuleInit() {
        await this.$connect();
    }

    /**
     * @see https://github.com/eoin-obrien/prisma-extension-kysely
     * @see https://github.com/eoin-obrien/prisma-extension-kysely/issues/71
     */
    // static withKysely(config: ConfigService) {
    //     return new PrismaService(config).$extends(
    //         kyselyExtension({
    //             kysely: () => {
    //                 return new Kysely<DB>({
    //                     log: ['query'],
    //                     dialect: {
    //                         createDriver: () => new DummyDriver(),
    //                         createAdapter: () => new PostgresAdapter(),
    //                         createIntrospector: (db) => new PostgresIntrospector(db),
    //                         createQueryCompiler: () => new PostgresQueryCompiler(),
    //                     },
    //                     plugins: [new CamelCasePlugin()],
    //                 });
    //             },
    //         }),
    //     ) as unknown as PrismaService;
    // }

    /** Don't forget it */
    // declare $kysely: Kysely<DB>;
}
