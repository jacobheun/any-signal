interface ClearableSignal extends AbortSignal {
    clear(): void
}

declare function anySignal(signals: Array<AbortSignal | undefined | null>): ClearableSignal;

export {anySignal, type ClearableSignal};

export default anySignal;
