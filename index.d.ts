interface CompositeSignal extends AbortSignal {
    clear(): void
}

declare function anySignal(signals: Array<AbortSignal | undefined | null>): AbortSignal;

export {anySignal, type CompositeSignal};

export default anySignal;
