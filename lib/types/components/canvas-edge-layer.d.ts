export class CanvasEdgeLayer extends HTMLElement {
    disconnectedCallback(): void;
    set state(canvasState: any);
    get state(): any;
    _getPortPosition(portId: any): {
        x: any;
        y: any;
    };
    setVisibleNodes(visibleNodeIds: any): void;
    #private;
}
