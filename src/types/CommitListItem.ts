import type { CommitDate } from "./CommitDate";

interface CommitListItem {
    sha: string;
    commitDate: CommitDate;
    parentSHAs: string[];
}

export type { CommitListItem };