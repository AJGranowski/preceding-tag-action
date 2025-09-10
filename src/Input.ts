import type { getBooleanInput, getInput } from "@actions/core";
import type { context } from "@actions/github";

import type { Repository } from "./Repository";

type core_getBooleanInput = typeof getBooleanInput;
type core_getInput = typeof getInput;
type github_context = typeof context;

class Input {
    private readonly context: github_context;
    private readonly getBooleanInput: core_getBooleanInput;
    private readonly getInput: core_getInput;
    constructor(getInput: core_getInput, getBooleanInput: core_getBooleanInput, context: github_context) {
        this.context = context;
        this.getBooleanInput = getBooleanInput;
        this.getInput = getInput;
    }

    /**
     * Get the tag filtering regular expression, defaults to matching every non-zero string.
     */
    getFilter(): RegExp {
        const filterString = this.getInput("regex");
        if (filterString.length === 0) {
            return /^.+$/;
        }

        return new RegExp(filterString);
    }

    /**
     * Return the include-ref option, defaults to false.
     */
    getIncludeRef(): boolean {
        if (this.getInput("include-ref").length === 0) {
            return false;
        }

        return this.getBooleanInput("include-ref");
    }

    /**
     * Get the ref to get the preceding tag of. Defaults to HEAD if not supplied for some reason.
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