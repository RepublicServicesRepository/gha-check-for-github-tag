![Unit Tests](https://github.com/RepublicServicesRepository/gha-check-for-github-tag/actions/workflows/ci.yml/badge.svg)


# GitHub Action - Check for GitHub Tag
This is a lightweight GitHub Action that leverages the GitHub API to determine if a tag exists or not.  This can be used to optimize your pipelines with basic validation before initiating long running processes that might fail much later in your pipeline.  It can be configured to fail your pipeline on condition that your tag does or does not exists.

## Usage
This action is intended to be added to an existing pipeline in your `.github/workflows` directory.  Refer to GitHub's [official documentation](https://docs.github.com/en/actions/using-workflows#creating-a-workflow-file) or the [example workflows](https://github.com/RepublicServicesRepository/gha-check-for-github-tag/.github/workflows) in this repository for more information

### Inputs

- `†ag`:  Required.  The tag to lookup.
- `owner`: Optional.  Uses the current owner by default, or you can override to look at a different owner.
- `repository`: Optional.  Uses the current repository by default, or you can override to look at a different repository.
- `github_token`: Optional.  Uses ${{ github.token }} by default, or you can override if you need to provide a token that has access to a different repository.  Refer to GitHub's [GITHUB_TOKEN documentation](https://docs.github.com/en/actions/security-guides/automatic-token-authentication) for more information.
- `fail_if_exists`:  Optional boolean (defaults to `false`).  Set this to `true` so that your pipeline will fail if a matching tag is found.  This is helpful for preventing build pipelines where the artifact already exists.  Cannot be set to `true` if `fail_if_not_exists` is also set to `true`.
- `fail_if_not_exists`:  Optional boolean (defaults to `false`).  Set this to `true` so that your pipeline will fail if a matching tag is not found.  This is helpful for preventing deployment pipelines where the artifact does not exist.  Cannot be set to `true` if `fail_if_exists` is also set to `true`. 

### Outputs
- `tag_exists`: Indicates if the tag exists or not.  This can be used for conditional logic later in your pipeline.
