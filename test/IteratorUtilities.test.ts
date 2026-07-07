import {
    describe,
    expect,
    test
} from "vitest";

import { IteratorUtilities } from "../src/IteratorUtilities";

describe("IteratorUtilities", () => {
    describe("map", () => {
        test("[1, 2, 3] * 2", () => {
            const callbackfn = (x: number) => x * 2;
            const input = [1, 2, 3];
            const expected = input.map(callbackfn);
            const actual = [...IteratorUtilities.map(input, callbackfn)];

            expect(actual).toEqual(expected);
        });

        test("[1, 2, 3] + index", () => {
            const callbackfn = (x: number, i: number) => x + i;
            const input = [1, 2, 3];
            const expected = input.map(callbackfn);
            const actual = [...IteratorUtilities.map(input, callbackfn)];

            expect(actual).toEqual(expected);
        });
    });

    describe("filter", () => {
        test("[1, 2, 3, 4] => isEven", () => {
            const predicate = (x: number) => x % 2 === 0;
            const input = [1, 2, 3, 4];
            const expected = input.filter(predicate);
            const actual = [...IteratorUtilities.filter(input, predicate)];

            expect(actual).toEqual(expected);
        });

        test("[1, 9, 3, 8] => matchesIndex", () => {
            const predicate = (x: number, i: number) => x === i;
            const input = [1, 2, 3, 4];
            const expected = input.filter(predicate);
            const actual = [...IteratorUtilities.filter(input, predicate)];

            expect(actual).toEqual(expected);
        });
    });

    describe("reduce", () => {
        test("[1, 2, 3] ▼ sum", () => {
            const callbackfn = (prev: number, next: number) => prev + next;
            const input = [1, 2, 3];
            const expected = input.reduce(callbackfn);
            const actual = IteratorUtilities.reduce(input, callbackfn);

            expect(actual).toEqual(expected);
        });

        test("[] ▼ sum", () => {
            const callbackfn = (prev: number, next: number) => prev + next;
            const input: number[] = [];
            const expected = () => input.reduce(callbackfn);
            const actual = () => IteratorUtilities.reduce(input, callbackfn);

            expect(expected).toThrowError("Reduce of empty array with no initial value");
            expect(actual).toThrowError("Reduce of empty array with no initial value");
        });

        test("[] + initialValue ▼ sum", () => {
            const callbackfn = (prev: number, next: number) => prev + next;
            const input: number[] = [];
            const expected = input.reduce(callbackfn, 0);
            const actual = IteratorUtilities.reduce(input, callbackfn, 0);

            expect(actual).toEqual(expected);
        });
    });
});