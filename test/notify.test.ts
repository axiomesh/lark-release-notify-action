require('./.env.js');
jest.mock('@actions/github', () => ({
    context: {
        actor: process.env.NOTIFY_ACTION_ACTOR as string,
        payload: {
            pull_request: {
                html_url: process.env.NOTIFY_ACTION_GITHUB_URL as string,
                title: 'mock test'
            },
            ref: process.env.NOTIFY_ACTION_REF as string,
            repository: {
                html_url: process.env.NOTIFY_ACTION_GITHUB_URL as string
            }
        },
        runId: process.env.NOTIFY_ACTION_RUN_ID as string
    }
}))

import {test, describe} from '@jest/globals'
import {generateMessage, notify} from '../src/dingtalk'
 // Adjust the path as necessary

describe('test notification to dingtalk', () => {
    let webhook = process.env.NOTIFY_ACTION_WEBHOOK as string
    let title = 'GITHUB NOTIFICATION'
    let users = process.env.NOTIFY_ACTION_USERS as string

    test('test generate success message', async () => {
        const msg = generateMessage(title, users, 'success')
        console.log(msg)
    })

    test('test generate fail message', async () => {
        const msg = generateMessage(title, users, 'fail')
        console.log(msg)
    })

    test('notify dingtalk success msg', async () => {
        const successMsg = generateMessage(title, users, 'success')
        if (successMsg) {
            notify(webhook, successMsg)
        }
    })

    test('notify dingtalk fail msg', async () => {
        const failMsg = generateMessage(title, users, 'fail')
        if (failMsg) {
            notify(webhook, failMsg)
        }
    })
})
