jest.mock('@actions/core');
jest.mock('@actions/github');
const core = require('@actions/core');
const github = require('@actions/github');
const octokit = jest.mock('@octokit/core');
const { context } = require('@actions/github');
const { expect } = require('@jest/globals');
const { when } = require('jest-when');
const { run, getRequest } = require('../src/check-tag.js');
const { RequestError } = require('@octokit/request-error');

beforeEach(() => {
  context.repo = {
    owner: 'ContextOwner',
    repo: 'ContextRepository'
  };

  core.getInput = jest.fn();
  when(core.getInput)
    .calledWith('tag', { required: true })
    .mockReturnValue('InputTag');
  when(core.getInput)
    .calledWith('github_token', { required: true })
    .mockReturnValue('InputToken');

  const octokit = jest.mock('@octokit/core');
  github.getOctokit = jest.fn().mockReturnValue(octokit);
  octokit.request = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Validate Request', () => {
  test('fails if both failIfExists and failIfNotExists are true', async () => {
    when(core.getBooleanInput)
      .calledWith(expect.anything(), { required: false })
      .mockReturnValue(true);

    await expect(run()).rejects.toThrow();
  });

  test('uses context owner and repo if not provided on input', async () => {
    when(core.getBooleanInput)
      .calledWith(expect.anything(), { required: false })
      .mockReturnValue(false);

    const request = getRequest();

    expect(request.owner).toBe('ContextOwner');
    expect(request.repository).toBe('ContextRepository');
  });

  test('uses input owner and repo if provided', async () => {
    when(core.getInput)
      .calledWith('owner', { required: false })
      .mockReturnValue('InputOwner');
    when(core.getInput)
      .calledWith('repository', { required: false })
      .mockReturnValue('InputRepository');
    when(core.getBooleanInput)
      .calledWith(expect.anything(), { required: false })
      .mockReturnValue(false);

    const request = getRequest();

    expect(request.owner).toBe('InputOwner');
    expect(request.repository).toBe('InputRepository');
  });
});

describe('Rethrows error if', () => {
  test('GitHub API returns 404', async () => {
    when(core.getBooleanInput)
      .calledWith(expect.anything(), { required: false })
      .mockReturnValue(false);

    jest
      .spyOn(octokit, 'request')
      .mockImplementation((route, parameters) => { throw stubError(404, 'Not Found'); });

    await expect(run())
      .rejects
      .toMatchObject({ status: 404 });

    expect(core.error).toHaveBeenCalledWith('Unable to find repository ContextOwner/ContextRepository');
  });

  test('GitHub API returns other error', async () => {
    when(core.getBooleanInput)
      .calledWith(expect.anything(), { required: false })
      .mockReturnValue(false);

    jest
      .spyOn(octokit, 'request')
      .mockImplementation((route, parameters) => { throw stubError(500, 'Server error'); });

    await expect(run())
      .rejects
      .toMatchObject({ status: 500 });

    expect(core.error).toHaveBeenCalledWith('An unexpected error occurred when communicating with GitHub');
  });
});

describe('Returns ', () => {
  test('false and fails if GitHub does not find a match when fail_if_not_exists is enabled', async () => {
    when(core.getBooleanInput)
      .calledWith('fail_if_exists', { required: false })
      .mockReturnValue(false);
    when(core.getBooleanInput)
      .calledWith('fail_if_not_exists', { required: false })
      .mockReturnValue(true);
    when(octokit.request)
      .calledWith(expect.anything(), expect.anything())
      .mockReturnValue({ data: [] });

    await run();

    expect(core.setOutput).toHaveBeenCalledWith('tag_exists', false);
    expect(core.setFailed).toHaveBeenCalled();
  });

  test('false and does not fail if GitHub does not find a match when fail_if_not_exists is disabled', async () => {
    when(core.getBooleanInput)
      .calledWith('fail_if_exists', { required: false })
      .mockReturnValue(false);
    when(core.getBooleanInput)
      .calledWith('fail_if_not_exists', { required: false })
      .mockReturnValue(false);
    when(octokit.request)
      .calledWith(expect.anything(), expect.anything())
      .mockReturnValue({ data: [] });

    await run();

    expect(core.setOutput).toHaveBeenCalledWith('tag_exists', false);
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  test('true and fails if GitHub finds a match when fail_if_exists is enabled', async () => {
    when(core.getBooleanInput)
      .calledWith('fail_if_exists', { required: false })
      .mockReturnValue(true);
    when(core.getBooleanInput)
      .calledWith('fail_if_not_exists', { required: false })
      .mockReturnValue(false);
    when(octokit.request)
      .calledWith(expect.anything(), expect.anything())
      .mockReturnValue({ data: [{ ref: 'mockTag', url: 'mockUrl' }] });

    await run();

    expect(core.setOutput).toHaveBeenCalledWith('tag_exists', true);
    expect(core.setFailed).toHaveBeenCalled();
  });

  test('true and does not fail if GitHub finds a match when fail_if_exists is disabled', async () => {
    when(core.getBooleanInput)
      .calledWith('fail_if_exists', { required: false })
      .mockReturnValue(false);
    when(core.getBooleanInput)
      .calledWith('fail_if_not_exists', { required: false })
      .mockReturnValue(false);
    when(octokit.request)
      .calledWith(expect.anything(), expect.anything())
      .mockReturnValue({ data: [{ ref: 'mockTag', url: 'mockUrl' }] });

    await run();

    expect(core.setOutput).toHaveBeenCalledWith('tag_exists', true);
    expect(core.setFailed).not.toHaveBeenCalled();
  });
});

function stubError (status, message) {
  return new RequestError(message, status, {
    headers: {
      'x-github-request-id': 'testId'
    },
    request: {
      method: 'GET',
      url: 'testUrl',
      body: {},
      headers: {
        authorization: 'testToken'
      }
    }
  });
}
