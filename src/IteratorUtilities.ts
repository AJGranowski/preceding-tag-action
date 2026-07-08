class IteratorUtilities {
    static *map<T, U>(iterable: Iterable<T>, callbackfn: (value: T, index: number) => U): Iterable<U> {
        let index = 0;
        for (const value of iterable) {
            yield callbackfn(value, index);
            index++;
        }
    }

    static *filter<T>(iterable: Iterable<T>, predicate: (value: T, index: number) => unknown): Iterable<T> {
        let index = 0;
        for (const value of iterable) {
            if (predicate(value, index)) {
                yield value;
            }

            index++;
        }
    }

    static reduce<T>(iterable: Iterable<T>, callbackfn: (previousValue: T, currentValue: T, currentIndex: number) => T): T;
    static reduce<T>(iterable: Iterable<T>, callbackfn: (previousValue: T, currentValue: T, currentIndex: number) => T, initialValue: T): T;
    static reduce<T, U>(iterable: Iterable<T>, callbackfn: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue?: U): U;
    static reduce<T, U>(iterable: Iterable<T>, callbackfn: (previousValue: U, currentValue: T, currentIndex: number) => U, initialValue?: U): U {
        let index: number = 0;
        let previousValue: T | U;
        const iterator = iterable[Symbol.iterator]();
        let iteratorResult: IteratorResult<T> = iterator.next();
        if (arguments.length <= 2) {
            if (iteratorResult.done != null && iteratorResult.done) {
                throw new TypeError("Reduce of empty array with no initial value");
            }

            previousValue = iteratorResult.value;
            iteratorResult = iterator.next();
            index++;
        } else {
            previousValue = initialValue!;
        }

        while (iteratorResult.done != null && !iteratorResult.done) {
            previousValue = callbackfn(previousValue as any, iteratorResult.value, index);
            iteratorResult = iterator.next();
            index++;
        }

        return previousValue as any;
    }
}

export { IteratorUtilities };