// eslint-disable-next-line import/no-named-as-default
import fastifySwaggerUi from "@fastify/swagger-ui";
import { Command } from "@oclif/core";

import { DevNetCommand } from "./command.js";
import { DevNetContext } from "./context.js";

export const createRPC = async (
  port: number,
  ctx: DevNetContext<typeof Command>,
  commands: Record<string, typeof DevNetCommand>,
) => {
  const { logger } = ctx.dre;
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
      tags: [{ name: "RPC", description: "User related end-points" }],
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });

  Object.entries(commands).forEach(([commandID, CommandClass]) => {
    const { originalParams } = CommandClass;

    // TODO: remove
    if (!originalParams) return;

    const commandURL = commandID.replaceAll(":", "/");

    const paramsWithKey = (Object.entries(originalParams) as any).reduce(
      (acc: any, [key, param]: any[]) => {
        acc[key] = {
          ...param,
          key,
        };
        return acc;
      },
      {},
    );

    const schemaProperties = (Object.entries(paramsWithKey) as any).reduce(
      (acc: any, [key, param]: any[]) => {
        acc[key] = {
          type: param.paramParserType || "string",
          description: param.summary || "No description provided",
        };
        return acc;
      },
      {},
    );

    fastify.post(
      `/rpc/${commandURL}`,
      {
        schema: {
          summary: `Execute ${commandID} command`,
          description: `Endpoint for executing the ${commandID} command`,
          tags: ["RPC"],
          body: {
            type: "object",
            properties: {
              input: {
                type: "object",
                properties: schemaProperties,
                required: Object.values(paramsWithKey)
                  .filter((p: any) => p.required)
                  .map((p: any) => p.key)
                  .filter(Boolean),
              },
            },
            required: ["input"],
          },
          response: {
            200: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                message: { type: "string" },
              },
            },
            400: {
              type: "object",
              properties: {
                error: { type: "string" },
              },
            },
            500: {
              type: "object",
              properties: {
                error: { type: "string" },
              },
            },
          },
        },
      },
      async (request, reply) => {
        const { input } = request.body as { input: any };

        try {
          await CommandClass.handler({
            ...ctx,
            params: input,
          });

          reply.send({
            success: true,
            message: "Command executed successfully",
          });
        } catch (error: any) {
          logger.error(`Error executing ${commandID}: ${error.message}`);
          reply
            .status(500)
            .send({ error: error?.message ?? "Internal server error" });
        }
      },
    );

    logger.log(`Registered command ${commandID}:`);
    logger.logJson(originalParams)
  });
  await fastify.ready();
  fastify.swagger();

  await fastify.listen({ port });
  logger.log(`Server listening on http://localhost:${port}`);
  logger.log(`Swagger UI available at http://localhost:${port}/docs`);
};
