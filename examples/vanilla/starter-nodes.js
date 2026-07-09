export function registerStarterNodes(
  visualRegistry,
  topologyRegistry,
  schemaRegistry,
) {
  // --- trigger ---
  visualRegistry.register("trigger", {
    label: "Trigger",
    color: "#4caf50",
    icon: "bolt",
  });
  topologyRegistry.register("trigger", {
    inputs: [],
    outputs: [{ id: "out", label: "Out", position: "right" }],
  });
  schemaRegistry.register("trigger", {
    fields: [
      {
        id: "event",
        type: "select",
        label: "Event",
        default: "on_start",
        options: ["on_start", "on_schedule", "on_webhook"],
      },
      {
        id: "schedule",
        type: "string",
        label: "Cron Expression",
        default: "",
        showIf: { field: "event", operator: "equals", value: "on_schedule" },
      },
      {
        id: "description",
        type: "textarea",
        label: "Description",
        default: "",
      },
    ],
  });

  // --- action ---
  visualRegistry.register("action", {
    label: "Action",
    color: "#2196f3",
    icon: "play",
  });
  topologyRegistry.register("action", {
    inputs: [{ id: "in", label: "In", position: "left" }],
    outputs: [{ id: "out", label: "Out", position: "right" }],
  });
  schemaRegistry.register("action", {
    fields: [
      {
        id: "actionType",
        type: "select",
        label: "Action Type",
        default: "http",
        options: ["http", "script", "email"],
      },
      { id: "url", type: "string", label: "URL", default: "" },
      { id: "retries", type: "number", label: "Retries", default: 0 },
    ],
  });

  // --- logic_gate ---
  visualRegistry.register("logic_gate", {
    label: "Logic Gate",
    color: "#ff9800",
    icon: "filter",
  });
  topologyRegistry.register("logic_gate", {
    inputs: [{ id: "in", label: "In", position: "left" }],
    outputs: [
      { id: "true", label: "True", position: "right" },
      { id: "false", label: "False", position: "right" },
    ],
  });
  schemaRegistry.register("logic_gate", {
    fields: [
      { id: "condition", type: "string", label: "Condition", default: "" },
      {
        id: "operator",
        type: "select",
        label: "Operator",
        default: "equals",
        options: [
          "equals",
          "not_equals",
          "greater_than",
          "less_than",
          "contains",
        ],
      },
      {
        id: "caseSensitive",
        type: "boolean",
        label: "Case Sensitive",
        default: false,
        showIf: { field: "operator", operator: "equals", value: "contains" },
      },
    ],
  });

  // --- data_transform ---
  visualRegistry.register("data_transform", {
    label: "Data Transform",
    color: "#9c27b0",
    icon: "transform",
  });
  topologyRegistry.register("data_transform", {
    inputs: [{ id: "in", label: "In", position: "left" }],
    outputs: [{ id: "out", label: "Out", position: "right" }],
  });
  schemaRegistry.register("data_transform", {
    fields: [
      {
        id: "transformType",
        type: "select",
        label: "Transform Type",
        default: "map",
        options: ["map", "filter", "reduce", "custom"],
      },
      { id: "expression", type: "textarea", label: "Expression", default: "" },
      {
        id: "outputFormat",
        type: "select",
        label: "Output Format",
        default: "json",
        options: ["json", "csv", "xml"],
      },
    ],
  });
}
