import {
    describe,
    expect,
    test
} from "vitest";

import { AsyncIteratorUtilities } from "../src/AsyncIteratorUtilities";

describe("IteratorUtilities", () => {
    describe("map", () => {
        test("[1, 2, 3] * 2", async () => {
            const callbackfn = (x: number) => x * 2;
            const input = [1, 2, 3];
            const expected = input.map(callbackfn);
            const actual = await Array.fromAsync(AsyncIteratorUtilities.map(input, callbackfn));

            expect(actual).toEqual(expected);
        });

        test("[1, 2, 3] + index", async () => {
            const callbackfn = (x: number, i: number) => x + i;
            const input = [1, 2, 3];
            const expected = input.map(callbackfn);
            const actual = await Array.fromAsync(AsyncIteratorUtilities.map(input, callbackfn));

            expect(actual).toEqual(expected);
        });
    });

    describe("filter", () => {
        test("[1, 2, 3, 4] => isEven", async () => {
            const predicate = (x: number) => x % 2 === 0;
            const input = [1, 2, 3, 4];
            const expected = input.filter(predicate);
            const actual = await Array.fromAsync(AsyncIteratorUtilities.filter(input, predicate));

            expect(actual).toEqual(expected);
        });

        test("[0, 9, 2, 8] => matchesIndex", async () => {
            const predicate = (x: number, i: number) => x === i;
            const input = [0, 9, 2, 8];
            const expected = input.filter(predicate);
            const actual = await Array.fromAsync(AsyncIteratorUtilities.filter(input, predicate));

            expect(actual).toEqual(expected);
        });
    });

    describe("reduce", () => {
        test("[1, 2, 3] ▼ sum", async () => {
            const callbackfn = (prev: number, next: number) => prev + next;
            const input = [1, 2, 3];
            const expected = input.reduce(callbackfn);
            const actual = await AsyncIteratorUtilities.reduce(input, callbackfn);

            expect(actual).toEqual(expected);
        });

        test("[] ▼ sum", async () => {
            const callbackfn = (prev: number, next: number) => prev + next;
            const input: number[] = [];
            const expected = () => input.reduce(callbackfn);
            const actual = async () => await AsyncIteratorUtilities.reduce(input, callbackfn);

            expect(expected).toThrowError("Reduce of empty array with no initial value");
            expect(actual).rejects.toThrowError("Reduce of empty array with no initial value");
        });

        test("[] + initialValue ▼ sum", async () => {
            const callbackfn = (prev: number, next: number) => prev + next;
            const input: number[] = [];
            const expected = input.reduce(callbackfn, 0);
            const actual = await AsyncIteratorUtilities.reduce(input, callbackfn, 0);

            expect(actual).toEqual(expected);
        });

        test("[2, 1, 0] ▼ sum + index", async () => {
            const callbackfn = (prev: number, next: number, index: number) => prev + next + index;
            const input = [2, 1, 0];
            const expected = input.reduce(callbackfn);
            const actual = await AsyncIteratorUtilities.reduce(input, callbackfn);

            expect(actual).toEqual(expected);
        });
    });
});