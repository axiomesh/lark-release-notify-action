import * as core from '@actions/core'
import {context} from '@actions/github'
import {generateMessage, notify} from './dingtalk'

async function run(): Promise<void> {
    try {
        const ref = context.ref
        if (!ref.startsWith('refs/tags/')) {
            throw new Error('dingtalk-release-notify require a tag')
        }
        const tagName = ref.replace('refs/tags/', '')
        // release on all os is success
        let status = core.getInput('status')
        const notificationTitle = core.getInput('notification_title')
        if (status === '') {
            status = 'success'
        }
        core.info(`the release actions status of ${tagName} is ${status}`)

        const users = core.getInput('users')
        const message = generateMessage(notificationTitle, users, status)
        // need notify
        if (message != null) {
            core.info('send notification to dingtalk')
            const webhook = core.getInput('webhook')
            await notify(webhook, message)
        }
        core.info('finalize')
    } catch (error) {
        if (error instanceof Error) core.setFailed(error.message)
    }
}

run()
