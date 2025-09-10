import type { getInput } from "@actions/core";
import type { context } from "@actions/github";

import type { Repository } from "./Repository";

type core_getInput = typeof getInput;
type github_context = typeof context;

class Input {
    private readonly getInput: core_getInput;
    private readonly context: github_context;
    constructor(getInput: core_getInput, context: github_context) {
        this.context = context;
        this.getInput = getInput;
    }

    /**
     * Get the tag filtering regular expression if provided.
     */
    getFilter(): RegExp {
        const filterString = this.getInput("filter");
        if (filterString.length === 0) {
            return /^.+$/;
        }

        return new RegExp(filterString);
    }

    /**
     * Get the ref to get the preceding tag of.
     */
    getRef(): string {
        const ref = this.getInput("ref");
        return ref.length > 0 ? ref : "HEAD";
    }

    /**
     * Generate a Repository object, either from the action inputs or the context this action is running in.
     */
    getRepository(): Repository {
        const inputString = this.getInput("repository");
        if (inputString.length === 0) {
            return {
                owner: this.context.repo.owner,
                repo: this.context.repo.repo
            };
        }

        const matcher = inputString.match(/^(?<owner>[^/]+)\/(?<repo>[^/]+)$/);
        if (matcher == null || matcher.groups == null) {
            throw new Error(`Invalid repository "${inputString}". Expected format {owner}/{repo}`);
        }

        return {
            owner: matcher.groups.owner,
            repo: matcher.groups.repo
        };
    }

    /**
     * Return the token if it exists, or undefined.
     */
    getToken(): string | undefined {
        const token = this.getInput("token");
        if (token.length === 0) {
            return undefined;
        }

        return token;
    }
}

export { Input };