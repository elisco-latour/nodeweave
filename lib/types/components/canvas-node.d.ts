export class CanvasNode extends HTMLElement {
    connectedCallback(): void;
    disconnectedCallback(): void;
    set nodeId(value: string);
    get nodeId(): string;
    set nodeType(value: string);
    get nodeType(): string;
    set label(value: string);
    get label(): string;
    set ports(portArray: any[]);
    get ports(): any[];
    set state(canvasState: any);
    get state(): any;
    setPosition(x: any, y: any): void;
    setHeaderColor(color: any): void;
    #private;
}
