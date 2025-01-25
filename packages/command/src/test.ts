import { command, Params } from "./index.js";

const one = command.isomorphic({
  description: "",
  params: {
    isOk: Params.boolean({
      description: "Operator id.",
      required: true,
    }),
  },
  async handler(ctx) {
    ctx.params;
  },
});

const two = command.cli({
  description: "",
  params: {
    isOk: Params.boolean({
      description: "Operator id.",
      required: true,
    }),
  },
  async handler(ctx) {
    ctx.params;
    one.exec(ctx.dre, {
      isOk: false,
    });
  },
});
