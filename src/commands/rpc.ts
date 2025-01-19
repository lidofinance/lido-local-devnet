import fastifySwaggerUi from "@fastify/swagger-ui";
import { DevNetCommand } from "../lib/command/command.js";
import { DevNetContext } from "../lib/command/context.js";
import { createRPC } from "../lib/command/rpc.js";

function arrayToObject<T extends typeof DevNetCommand>(
  array: T[],
): Record<string, T> {
  return array.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<string, T>,
  );
}

export default class DevNetConfig extends DevNetCommand {
  static description = "Print public DevNet config";

  public async run(): Promise<void> {
    const fastify = (await import("fastify")).default();

    await fastify.register((await import("@fastify/swagger")).default, {
      openapi: {
        openapi: "3.0.0",
        info: {
          title: "Test swagger",
          description: "Testing the Fastify swagger API",
          version: "0.1.0",
        },
        servers: [
          {
            url: "http://localhost:4555",
            description: "Development server",
          },
        ],
        tags: [
          { name: "RPC", description: "User related end-points" },
        ],
      },
    });

    await fastify.register(fastifySwaggerUi, {
      routePrefix: "/docs", // Путь для доступа к UI
      uiConfig: {
        docExpansion: "list",
        deepLinking: false,
      },
    });

    fastify.put(
      "/some-route/:id",
      {
        schema: {
          description: "post some data",
          tags: ["RPC"],
          summary: "qwerty",
          params: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "user id",
              },
            },
          },
          body: {
            type: "object",
            properties: {
              hello: { type: "string" },
              obj: {
                type: "object",
                properties: {
                  some: { type: "string" },
                },
              },
            },
          },
          response: {
            201: {
              description: "Successful response",
              type: "object",
              properties: {
                hello: { type: "string" },
              },
            },
            default: {
              description: "Default response",
              type: "object",
              properties: {
                foo: { type: "string" },
              },
            },
          },
        },
      },
      () => {},
    );

    await fastify.ready();
    fastify.swagger();

    await fastify.listen({ port: 4555 });
    console.log(`Server listening on http://localhost:4555`);
    console.log(`Swagger UI available at http://localhost:4555/docs`);
  }
}
