[![CICD][cicd-badge]][cicd-link]
[![Coverage Status][coverage-badge]][coverage-link]
[![OpenSSF Scorecard][ossf-scorecard-badge]][ossf-scorecard-link]
[![OpenSSF Best Practices][ossf-best-practices-badge]][ossf-best-practices-link]

<header align="center">
    <h1 align="center">Preceding Tag Action</h1>
    <p align="center">Find the most recent tag that is reachable from a commit.</p>
    <p align="center"><b>🚧 THIS ACTION IS UNDER ACTIVE DEVELOPMENT, DO NOT USE 🚧</b></p>
</header>

## About
This action functions similar to [`git describe`][git-describe-link] by finding the most recent tag that is reachable from a commit. Since this action uses the GitHub API instead of a local Git database, you can use this action without `actions/checkout`!

## Usage
```yml
- uses: AJGranowski/preceding-tag-action@▒▒▒▒▒▒▒▒▒▒▒▒▒ COMMIT SHA ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ # vX.Y.Z
  id: preceding-tag

- env:
    PRECEDING_TAG: ${{ steps.preceding-tag.outputs.tag }}
  run: |
    echo "Preceding tag: $PRECEDING_TAG"
```

```yml
- uses: AJGranowski/preceding-tag-action@▒▒▒▒▒▒▒▒▒▒▒▒▒ COMMIT SHA ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ # vX.Y.Z
  id: preceding-release-tag
  with:
    filter: ^release-.+$

- env:
    PRECEDING_RELEASE_TAG: ${{ steps.preceding-release-tag.outputs.tag }}
  run: |
    echo "Preceding release tag: $PRECEDING_RELEASE_TAG"
```


Although this project publishes version tags, we strongly recommend [pinning this action to a full-length commit SHA][security-sha-pinning-link]. You can get the SHA of the latest release from the [latest release page][latest-release-link] by clicking the commit link, then and copying the SHA from the URL.

## Inputs
| Name         | Type   | Default                    | Description                                                                 |
|--------------|--------|----------------------------|-----------------------------------------------------------------------------|
| `repository` | String | `${{ github.repository }}` | Repository name with owner. For example, `AJGranowski/preceding-tag-action` |
| `ref`        | String | `${{ github.sha }}`        | The branch, tag, or SHA to find the preceding tag from.                     |
| `filter`     | String | `^.+$`                     | A regular expression used to filter candidate tag names.                    |
| `token`      | String | `${{ github.token }}`      | Personal access token (PAT) used to fetch the tags.                         |

## Outputs
| Name  | Type   | Description  |
|-------|--------|------------------------------------------------------------------------------------------|
| `tag` | String | The preceding tag, or an empty string if no preceding tag matching the filter was found. |

[cicd-badge]: https://github.com/AJGranowski/preceding-tag-action/actions/workflows/cicd.yml/badge.svg?branch=main
[cicd-link]: https://github.com/AJGranowski/preceding-tag-action/actions/workflows/cicd.yml
[coverage-badge]: https://codecov.io/github/AJGranowski/preceding-tag-action/graph/badge.svg?token=709TF09YRV
[coverage-link]: https://codecov.io/github/AJGranowski/preceding-tag-action
[git-describe-link]: https://git-scm.com/docs/git-describe
[latest-release-link]: https://github.com/AJGranowski/preceding-tag-action/releases/latest
[ossf-scorecard-badge]: https://api.securityscorecards.dev/projects/github.com/AJGranowski/preceding-tag-action/badge
[ossf-scorecard-link]: https://securityscorecards.dev/viewer/?uri=github.com/AJGranowski/preceding-tag-action
[security-sha-pinning-link]: https://docs.github.com/en/actions/reference/security/secure-use#using-third-party-actions