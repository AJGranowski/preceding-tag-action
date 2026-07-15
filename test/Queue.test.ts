import {
    beforeEach,
    describe,
    expect,
    test
} from "vitest";
import { Queue } from "../src/Queue";

describe("Queue", () => {
    let queue: Queue<any>;

    beforeEach(() => {
        queue = new Queue();
    });

    describe("constructor", () => {
        test("creates an empty queue by default", () => {
            expect(queue.size()).toBe(0);
            expect(queue.hasItems()).toBe(false);
        });

        test("initializes the queue from an iterator", () => {
            queue = new Queue([1, 2, 3].values());

            expect(queue.size()).toBe(3);
            expect(queue.hasItems()).toBe(true);
        });

        test("preserves the iterator order", () => {
            queue = new Queue([1, 2, 3].values());

            expect(queue.dequeue()).toBe(1);
            expect(queue.dequeue()).toBe(2);
            expect(queue.dequeue()).toBe(3);
            expect(queue.dequeue()).toBeUndefined();
        });

        test("accepts an empty iterator", () => {
            queue = new Queue([].values());

            expect(queue.size()).toBe(0);
            expect(queue.hasItems()).toBe(false);
        });
    });

    describe("enqueue", () => {
        test("adds a single item", () => {
            queue.enqueue(42);

            expect(queue.size()).toBe(1);
            expect(queue.hasItems()).toBe(true);
            expect(queue.dequeue()).toBe(42);
        });

        test("adds multiple items in FIFO order", () => {
            queue.enqueue(1);
            queue.enqueue(2);
            queue.enqueue(3);

            expect(queue.dequeue()).toBe(1);
            expect(queue.dequeue()).toBe(2);
            expect(queue.dequeue()).toBe(3);
        });
    });

    describe("dequeue", () => {
        test("returns undefined when the queue is empty", () => {
            expect(queue.dequeue()).toBeUndefined();
            expect(queue.size()).toBe(0);
            expect(queue.hasItems()).toBe(false);
        });

        test("can be reused after becoming empty", () => {
            queue.enqueue(1);

            expect(queue.dequeue()).toBe(1);
            expect(queue.dequeue()).toBeUndefined();

            queue.enqueue(2);
            queue.enqueue(3);

            expect(queue.dequeue()).toBe(2);
            expect(queue.dequeue()).toBe(3);
            expect(queue.dequeue()).toBeUndefined();
        });
    });

    describe("hasItems", () => {
        test("reflects whether the queue contains items", () => {
            expect(queue.hasItems()).toBe(false);

            queue.enqueue(1);
            expect(queue.hasItems()).toBe(true);

            queue.dequeue();
            expect(queue.hasItems()).toBe(false);

            queue.dequeue();
            expect(queue.hasItems()).toBe(false);

            queue.enqueue(2);
            expect(queue.hasItems()).toBe(true);

            queue.dequeue();
            expect(queue.hasItems()).toBe(false);

        });
    });

    describe("size", () => {
        test("tracks the number of queued items", () => {
            expect(queue.size()).toBe(0);

            queue.enqueue(1);
            expect(queue.size()).toBe(1);

            queue.enqueue(2);
            expect(queue.size()).toBe(2);

            queue.dequeue();
            expect(queue.size()).toBe(1);

            queue.dequeue();
            expect(queue.size()).toBe(0);

            queue.dequeue();
            expect(queue.size()).toBe(0);

            queue.enqueue(3);
            expect(queue.size()).toBe(1);
        });
    });

    describe("generic support", () => {
        test("supports non-primitive values", () => {
            interface Item {
                id: number;
                name: string;
            }

            const first: Item = { id: 1, name: "A" };
            const second: Item = { id: 2, name: "B" };

            const typedQueue = queue as Queue<Item>;

            typedQueue.enqueue(first);
            typedQueue.enqueue(second);

            expect(typedQueue.dequeue()).toBe(first);
            expect(typedQueue.dequeue()).toBe(second);
        });
    });
});