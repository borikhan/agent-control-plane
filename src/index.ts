import { createServer } from "node:http";
import { ControlPlane } from "./engine.js";

const plane = new ControlPlane();
plane.registerTool("knowledge.search", async (input) => ({
  query: input.query,
  matches: [],
}));
plane.registerTool("notification.preview", async (input) => ({
  preview: String(input.message ?? ""),
}));
const port = Number(process.env.PORT ?? 8080);

createServer(async (req, res) => {
  res.setHeader("content-type", "application/json");
  if (req.url === "/healthz") return end(res, 200, { status: "ok" });
  const body = await read(req);
  try {
    if (req.method === "POST" && req.url === "/v1/workflows")
      return end(res, 201, plane.create(body.objective, body.steps));
    const match = req.url?.match(/^\/v1\/workflows\/([^/]+)\/(approve|run)$/);
    if (req.method === "POST" && match?.[2] === "approve")
      return end(res, 200, plane.approve(match[1]!));
    if (req.method === "POST" && match?.[2] === "run")
      return end(res, 200, { results: await plane.run(match[1]!) });
    if (req.method === "GET" && req.url === "/v1/audit")
      return end(res, 200, plane.audit);
    return end(res, 404, { error: "not found" });
  } catch (error) {
    return end(res, 422, { error: String(error) });
  }
}).listen(port, () =>
  console.log(JSON.stringify({ level: "info", message: "listening", port })),
);

async function read(req: any) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString());
}
function end(res: any, status: number, value: unknown) {
  res.statusCode = status;
  res.end(JSON.stringify(value));
}
