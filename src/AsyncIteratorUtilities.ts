class AsyncIteratorUtilities {
    static async *map<T, U>(iterable: Iterable<T> | AsyncIterable<T>, callbackfn: (value: T, index: number) => U): AsyncIterable<U> {
        let index = 0;
        for await (const value of iterable) {
            yield await callbackfn(value, index);
            index++;
        }
    }

    static async *filter<T>(iterable: Iterable<T> | AsyncIterable<T>, predicate: (value: T, index: number) => unknown): AsyncIterable<T> {
        let index = 0;
        for await (const value of iterable) {
            if (await predicate(value, index)) {
                yield value;
            }

            index++;
        }
    }

    static async reduce<T>(iterable: Iterable<T> | AsyncIterable<T>, callbackfn: (previousValue: T, currentValue: T, currentIndex: number) => T): Promise<T>;
    // eslint-disable-next-line max-len
    static async reduce<T>(iterable: Iterable<T> | AsyncIterable<T>, callbackfn: (previousValue: T, currentValue: T, currentIndex: number) => T, initialValue: T): Promise<T>;
    // eslint-disable-next-line max-len
    static async reduce<T, U>(iterable: Iterable<T> | AsyncIterable<T>, callbackfn: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue?: U): Promise<U> {
        let index: number = 0;
        let previousValue: T | U;
        const iterator = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
        let iteratorResult: IteratorResult<T> = await iterator.next();
        if (arguments.length <= 2) {
            if (iteratorResult.done != null && iteratorResult.done) {
                throw new TypeError("Reduce of empty array with no initial value");
            }

            previousValue = iteratorResult.value;
            iteratorResult = await iterator.next();
            index++;
        } else {
            previousValue = initialValue!;
        }

        while (iteratorResult.done != null && !iteratorResult.done) {
            previousValue = await callbackfn(previousValue as any, iteratorResult.value, index);
            iteratorResult = await iterator.next();
            index++;
        }

        return previousValue as any;
    }
}

export { AsyncIteratorUtilities };