import fastifySwaggerUi from "@fastify/swagger-ui";

import { Command } from "@oclif/core";
import { DevNetCommand } from "./command.js";
import { DevNetContext } from "./context.js";

export const createRPC = async (
  port: number,
  ctx: DevNetContext<typeof Command>,
  commands: Record<string, typeof DevNetCommand>,
) => {
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
    console.log("originalParams", commandID, originalParams);
    const commandURL = commandID.replaceAll(":", "/");

    const schemaProperties = (Object.values(originalParams) as any).reduce(
      (acc: any, param: any) => {
        acc[param.key ?? param.name] = {
          type: param.paramParserType || "string", // Укажите дефолтный тип, если `paramParserType` отсутствует
          description: param.summary || "No description provided",
        };
        return acc;
      },
      {},
    );
    console.log(
      (Object.values(originalParams) as any)
        .filter((p: any) => p.required)
        .map((p: any) => p.key ?? p.name)
        .filter((p: any) => !!p),
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
                required: (Object.values(originalParams) as any)
                  .filter((p: any) => p.required)
                  .map((p: any) => p.key ?? p.name)
                  .filter((p: any) => !!p),
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
          console.error(`Error executing ${commandID}:`, error);
          reply
            .status(500)
            .send({ error: error?.message ?? "Internal server error" });
        }
      },
    );

    console.log(`Registered command ${commandID}:`, originalParams);
  });
  await fastify.ready();
  fastify.swagger();

  await fastify.listen({ port: 4555 });
  console.log(`Server listening on http://localhost:4555`);
  console.log(`Swagger UI available at http://localhost:4555/docs`);
};
