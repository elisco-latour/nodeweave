export class CanvasPort extends HTMLElement {
    connectedCallback(): void;
    set portId(value: string);
    get portId(): string;
    set direction(value: string);
    get direction(): string;
    set nodeId(value: string);
    get nodeId(): string;
    #private;
}
