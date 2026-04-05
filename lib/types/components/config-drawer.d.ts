export class ConfigDrawer extends HTMLElement {
    connectedCallback(): void;
    open(nodeId: any, nodeType: any, config: any): void;
    close(): void;
    renderForm(schema: any, currentConfig?: {}): void;
    #private;
}
