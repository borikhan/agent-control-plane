import { randomUUID } from "node:crypto";

export type Risk = "low" | "high";
export type Step = { tool: string; input: Record<string, unknown>; risk: Risk };
export type Workflow = {
  id: string;
  objective: string;
  steps: Step[];
  approved: boolean;
  status: "pending" | "approved" | "completed" | "failed";
};
export type AuditEvent = {
  at: string;
  workflowId: string;
  action: string;
  detail?: string;
};

type Tool = (input: Record<string, unknown>) => Promise<unknown>;

export class ControlPlane {
  private workflows = new Map<string, Workflow>();
  private tools = new Map<string, Tool>();
  readonly audit: AuditEvent[] = [];

  registerTool(name: string, handler: Tool) {
    this.tools.set(name, handler);
  }

  create(objective: string, steps: Step[]): Workflow {
    if (!objective || steps.length === 0)
      throw new Error("objective and steps are required");
    for (const step of steps)
      if (!this.tools.has(step.tool))
        throw new Error(`tool not allowlisted: ${step.tool}`);
    const workflow: Workflow = {
      id: randomUUID(),
      objective,
      steps,
      approved: !steps.some((s) => s.risk === "high"),
      status: "pending",
    };
    if (workflow.approved) workflow.status = "approved";
    this.workflows.set(workflow.id, workflow);
    this.record(workflow.id, "created");
    return workflow;
  }

  approve(id: string): Workflow {
    const workflow = this.require(id);
    workflow.approved = true;
    workflow.status = "approved";
    this.record(id, "approved");
    return workflow;
  }

  async run(id: string): Promise<unknown[]> {
    const workflow = this.require(id);
    if (!workflow.approved) throw new Error("human approval required");
    const results: unknown[] = [];
    try {
      for (const step of workflow.steps) {
        results.push(await this.tools.get(step.tool)!(step.input));
        this.record(id, "tool.executed", step.tool);
      }
      workflow.status = "completed";
      this.record(id, "completed");
      return results;
    } catch (error) {
      workflow.status = "failed";
      this.record(id, "failed", String(error));
      throw error;
    }
  }

  get(id: string) {
    return this.require(id);
  }
  private require(id: string) {
    const value = this.workflows.get(id);
    if (!value) throw new Error("workflow not found");
    return value;
  }
  private record(workflowId: string, action: string, detail?: string) {
    this.audit.push({
      at: new Date().toISOString(),
      workflowId,
      action,
      detail,
    });
  }
}
