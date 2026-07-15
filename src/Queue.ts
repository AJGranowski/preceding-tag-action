interface QueueType<T> {
    enqueue(item: T): void;
    dequeue(): T | undefined;
    hasItems(): boolean;
    size(): number;
}

class QueueNode<T> {
    public next?: QueueNode<T>;
    public readonly data: T;
    constructor(data: T) {
        this.data = data;
    }
}

class Queue<T> implements QueueType<T> {
    private head?: QueueNode<T>;
    private tail?: QueueNode<T>;
    private queueLength: number;

    constructor(items: IteratorObject<T> = [].values()) {
        this.queueLength = 0;
        for (const item of items) {
            this.enqueue(item);
        }
    }

    enqueue(item: T): void {
        if (this.hasItems()) {
            this.tail!.next = new QueueNode(item);
            this.tail = this.tail!.next;
        } else {
            this.head = new QueueNode(item);
            this.tail = this.head;
        }

        this.queueLength++;
    }

    dequeue(): T | undefined {
        if (!this.hasItems()) {
            return undefined;
        }

        const result = this.head!.data;
        this.head = this.head!.next;
        if (this.head == null) {
            this.head = undefined;
            this.tail = undefined;
        }

        this.queueLength--;
        return result;
    }

    hasItems(): boolean {
        return this.size() > 0;
    }

    size(): number {
        return this.queueLength;
    }
}

export { Queue };