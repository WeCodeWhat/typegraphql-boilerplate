import "reflect-metadata";
import "dotenv/config";
import { GraphQLServer, Options } from "graphql-yoga";
import { genSchema } from "./utils/genSchema";
import { sessionConfiguration } from "./helper/session";
import { REDIS } from "./helper/redis";
import { DEV_BASE_URL } from "./constants/global-variables";
import { env, EnvironmentType } from "./utils/environmentType";
import { formatValidationError } from "./utils/formatValidationError";
import { GQLContext } from "./utils/graphql-utils";
import { ContextParameters } from "graphql-yoga/dist/types";
import { genORMConnection } from "./config/orm.config";
import { printSchema } from "graphql";
import * as morgan from "morgan";
import { genREST_API } from "./utils/genREST";
import { logger } from "./config/winston.config";
import * as fs from "fs";

export const startServer = async () => {
	if (!env(EnvironmentType.PROD)) {
		await new REDIS().server.flushall();
	}

	const conn = await genORMConnection();
	const schema = await genSchema();

	const sdl = printSchema(schema);
	await fs.writeFileSync(__dirname + "/schema.graphql", sdl);

	const server = new GraphQLServer({
		schema,
		context: ({ request }: ContextParameters): Partial<GQLContext> => ({
			request,
			redis: new REDIS().server,
			session: request?.session,
			url: request?.protocol + "://" + request?.get("host"),
		}),
	} as any);

	const corsOptions = { credentials: true, origin: DEV_BASE_URL };
	server.express.use(sessionConfiguration);

	genREST_API(schema, server.express);

	const PORT = process.env.PORT || 5000;

	await server
		.start(
			Object.assign(
				{
					cors: corsOptions,
					port: env(EnvironmentType.TEST) ? 8080 : PORT,
					formatError: formatValidationError,
					subscriptions: {
						onConnect: () => console.log("Subscription server connected!"),
						onDisconnect: () =>
							console.log("Subscription server disconnected!"),
					},
				} as Options,
				env(EnvironmentType.PROD)
					? {
							playground: false as any,
					  }
					: {
							endpoint: "/graphql",
					  }
			),
			(options) => {
				logger.info(
					env(EnvironmentType.PROD)
						? {
								ENDPOINT: `${process.env.SERVER_URI}:${options?.port}${process.env.SERVER_ENDPOINT}`,
								ENVIRONMENT: process.env.NODE_ENV?.trim(),
								DATABASE_URL: process.env.DATABASE_URL,
								REDIS_HOST: process.env.REDIS_HOST,
								REDIS_PORT: process.env.REDIS_PORT,
						  }
						: {
								ENDPOINT: `${process.env.SERVER_URI}:${options?.port}${process.env.SERVER_ENDPOINT}`,
								ENVIRONMENT: process.env.NODE_ENV?.trim(),
								PORT: options.port,
								DATABASE: conn.options.database,
						  }
				);
			}
		)
		.catch((err) => console.log(err));
};
