const core = require('@actions/core');
const github = require('@actions/github');
const { context } = require('@actions/github');

function validateRequest (request) {
  let isValid = true;
  if (request.failIfExists && request.failIfNotExists) {
    console.error('Both fail_if_exists and fail_if_not_exist cannot be set to true');
    isValid = false;
  }

  return isValid;
}

async function getMatchingTags (request) {
  console.log(`Searching for tag: ${request.tag}`);
  const octokit = github.getOctokit(request.githubToken);

  try {
    return await octokit.request('GET /repos/{owner}/{repository}/git/matching-refs/tags/{tag}', {
      owner: request.owner,
      repository: request.repository,
      tag: request.tag
    });
  } catch (error) {
    if (error.status === 404) {
      core.error(`Unable to find repository ${request.owner}/${request.repository}`);
    } else {
      core.error('An unexpected error occurred when communicating with GitHub');
    }
    throw error;
  }
}

async function tagExists (request) {
  const response = await getMatchingTags(request);
  const tagExists = response.data.length !== 0;

  if (tagExists) {
    console.log(`A matching tag was found: ${JSON.stringify(response.data)}`);
  } else {
    console.log('A matching tag was not found');
  }

  return tagExists;
}

function getRequest () {
  const { owner: currentOwner, repo: currentRepository } = context.repo;
  return {
    owner: core.getInput('owner', { required: false }) || currentOwner,
    repository: core.getInput('repository', { required: false }) || currentRepository,
    tag: core.getInput('tag', { required: true }),
    githubToken: core.getInput('github_token', { required: true }),
    failIfExists: core.getBooleanInput('fail_if_exists', { required: false }),
    failIfNotExists: core.getBooleanInput('fail_if_not_exists', { required: false })
  };
}

async function run () {
  const request = getRequest();

  if (!validateRequest(request)) {
    core.error('Invalid request');
    throw new Error('Invalid request');
  }

  const tagExistsResult = await tagExists(request);
  if ((tagExistsResult && request.failIfExists) || (!tagExistsResult && request.failIfNotExists)) {
    core.setFailed('Failing action per input.');
  }

  core.setOutput('tag_exists', tagExistsResult);
}

module.exports = { run, getRequest };
