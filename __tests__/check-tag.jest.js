jest.mock('@actions/core')
jest.mock('@actions/github')
const core = require('@actions/core')
const github = require('@actions/github')
const octokit = jest.mock('@octokit/core')
const { context } = require('@actions/github')
const { expect } = require('@jest/globals')
const { when } = require('jest-when')
const { run, getRequest } = require('../src/check-tag.js')
const { RequestError } = require('@octokit/request-error')

beforeAll(() => {
    context.repo = {
        owner: 'ContextOwner',
        repo: 'ContextRepository'
    }

    core.getInput = jest.fn()
    when(core.getInput).calledWith('tag', { required: true }).mockReturnValue('InputTag')
    when(core.getInput).calledWith('github_token', { required: true }).mockReturnValue('InputToken')

    const octokit = jest.mock('@octokit/core')
    github.getOctokit = jest.fn().mockReturnValue(octokit)
})

describe('Validate Request', () => {
    test('fails if both failIfExists and failIfNotExists are true', async () => {
        core.getBooleanInput = jest.fn().mockReturnValue(true)

        await expect(run()).rejects.toThrow()
    })

    test('uses context owner and repo if not provided on input', async () => {
        core.getBooleanInput = jest.fn().mockReturnValue(false)
        const request = getRequest()

        expect(request.owner).toBe('ContextOwner')
        expect(request.repository).toBe('ContextRepository')
    })

    test('uses input owner and repo if provided', async () => {
        when(core.getInput).calledWith('owner', { required: false }).mockReturnValue('InputOwner')
        when(core.getInput).calledWith('repository', { required: false }).mockReturnValue('InputRepository')
        core.getBooleanInput = jest.fn().mockReturnValue(false)
        const request = getRequest()

        expect(request.owner).toBe('InputOwner')
        expect(request.repository).toBe('InputRepository')
    })
})

describe('Rethrows error if', () => {
    test('GitHub API returns 404', async () => {
        core.getBooleanInput = jest.fn().mockReturnValue(false)
        octokit.request = (route, parameters) => { throw stubError(404, 'Not Found') }

        try {
            await run()
            expect(true).toBe(false)
        } catch (error) {
            expect(error.status).toBe(404)
            expect(core.error).toHaveBeenCalledWith('Unable to find repository %s/%s', 'InputOwner', 'InputRepository')
        }
    })

    test('GitHub API returns other error', async () => {
        core.getBooleanInput = jest.fn().mockReturnValue(false)
        octokit.request = (route, parameters) => { throw stubError(500, 'Server error') }

        try {
            await run()
            expect(true).toBe(false)
        } catch (error) {
            expect(error.status).toBe(500)
            expect(core.error).toHaveBeenCalledWith('An unexpected error occurred when communicating with GitHub')
        }
    })
})

describe('Handles no tags found response', () => {
    test('when fail_if_not_exists is not enabled', async () => {
        when(core.getBooleanInput).calledWith('fail_if_exists', { required: false }).mockReturnValue(false)
        when(core.getBooleanInput).calledWith('fail_if_not_exists', { required: false }).mockReturnValue(false)
        octokit.request = (route, parameters) => ({ data: [] })

        await run()

        expect(core.setOutput).toHaveBeenCalledWith('tag_exists', false)
        expect(core.setFailed).not.toHaveBeenCalled()
    })

    test('when fail_if_not_exists is enabled', async () => {
        when(core.getBooleanInput).calledWith('fail_if_exists', { required: false }).mockReturnValue(false)
        when(core.getBooleanInput).calledWith('fail_if_not_exists', { required: false }).mockReturnValue(true)
        octokit.request = (route, parameters) => ({ data: [] })

        await run()

        expect(core.setOutput).toHaveBeenCalledWith('tag_exists', false)
        expect(core.setFailed).toHaveBeenCalled()
    })
})

describe('Handles tags found response', () => {
    test('when fail_if_exists is not enabled', async () => {
        when(core.getBooleanInput).calledWith('fail_if_exists', { required: false }).mockReturnValue(false)
        when(core.getBooleanInput).calledWith('fail_if_not_exists', { required: false }).mockReturnValue(false)
        octokit.request = (route, parameters) => ({ data: [{ ref: 'mockTag', url: 'mockUrl' }] })

        await run()

        expect(core.setOutput).toHaveBeenCalledWith('tag_exists', true)
        expect(core.setFailed).not.toHaveBeenCalled()
    })

    test('when fail_if_exists is enabled', async () => {
        when(core.getBooleanInput).calledWith('fail_if_exists', { required: false }).mockReturnValue(true)
        when(core.getBooleanInput).calledWith('fail_if_not_exists', { required: false }).mockReturnValue(false)
        octokit.request = (route, parameters) => ({ data: [{ ref: 'mockTag', url: 'mockUrl' }] })

        await run()

        expect(core.setOutput).toHaveBeenCalledWith('tag_exists', true)
        expect(core.setFailed).toHaveBeenCalled()
    })
})

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
    })
}
