import * as httpm from '@actions/http-client'
import {context} from '@actions/github'
import * as core from '@actions/core'

interface message {
    msgtype: string
    markdown: markdown
    at: at
}

interface markdown {
    title: string
    text: string
}

interface at {
    atMobiles: string[]
    atUserIds: string[]
    isAtAll: boolean
}

interface dingtalkResponse {
    errcode: number
    errmsg: string
}

function generateAt(
    contentWorkflowsStatus: string,
    phoneNums: string[]
): {contentAt: string; paramAt: at} {
    let contentAt = ''
    const paramAt = {
        atMobiles: [] as string[],
        atUserIds: [] as string[],
        isAtAll: false
    }
    switch (contentWorkflowsStatus.toLowerCase()) {
        case 'success':
            paramAt.isAtAll = true
            contentAt = '通知到：@所有人 '.toString()
            break
        default:
            contentAt = '创建人：'.toString()
            for (const number of phoneNums) {
                contentAt = contentAt + `@${number} `.toString()
                paramAt.atMobiles.push(number)
            }
    }

    return {contentAt, paramAt}
}

export function generateMessage(
    notificationTitle: string,
    users: string,
    contentWorkflowsStatus: string
): message | undefined {
    users = users.trim()
    contentWorkflowsStatus = contentWorkflowsStatus.toUpperCase()
    console.log("ref: " + context.payload.ref)
    const contentTagName = context.payload.ref.replace('refs/tags/', '')
    let contentWorkflowsStatusColor
    let buttonUrl
    switch (contentWorkflowsStatus) {
        case 'SUCCESS':
            contentWorkflowsStatusColor = 'green'
            // go to release page
            buttonUrl = `${context.payload.repository?.html_url}/releases/tag/${contentTagName}`
            break
        default:
            contentWorkflowsStatusColor = 'red'
            buttonUrl = `${context.payload.repository?.html_url}/actions/runs/${context.runId}`
    }

    let openIDs: string[] = []
    // success, notify reviewers
    if (contentWorkflowsStatus === 'FAILURE') {
        // fail, notify creator
        const userArr = users.split(',')
        for (const user of userArr) {
            const userMapping = user
                .split(':')
                .map(word => word.trim())
                .filter(elm => elm)
            if (userMapping.length !== 2) {
                throw new Error(
                    'the secret users is error, perhaps not split by ":"'
                )
            }
            if (userMapping[0] === context.actor) {
                openIDs.push(userMapping[1])
                break
            }
        }
        // release's actor is not in users, skip notify
        if (openIDs.length === 0) {
            core.info('no this user in secret users, skip notify')
            return
        }
    }
    const contentAt = generateAt(contentWorkflowsStatus, openIDs)
    const rlContent =
        `Release Binary：[${contentTagName}](${buttonUrl})\n\n${contentAt.contentAt}\n\n工作流状态：<font color='${contentWorkflowsStatusColor}'>${contentWorkflowsStatus}</font>\n![screenshot](https://i0.wp.com/saixiii.com/wp-content/uploads/2017/05/github.png?fit=573%2C248&ssl=1)\n`.toString()

    const msgCard: markdown = {
        title: notificationTitle,
        text: rlContent
    }
    return {
        msgtype: 'markdown',
        markdown: msgCard,
        at: contentAt.paramAt
    }
}

export async function notify(webhook: string, msg: message): Promise<void> {
    const jsonStr = JSON.stringify(msg)
    const http = new httpm.HttpClient()
    const headers = {
        'Content-Type': 'application/json' // Set the correct Content-Type
    }
    const response = await http.post(webhook, jsonStr, headers)
    if (response.message.statusCode !== httpm.HttpCodes.OK) {
        throw new Error(
            `send request to webhook error, status code is ${response.message.statusCode}`
        )
    }
    const body = await response.readBody()
    const dingtalkResp: dingtalkResponse = JSON.parse(body)
    if (dingtalkResp.errcode !== 0) {
        throw new Error(
            `send request to webhook error, err msg is ${dingtalkResp.errmsg}`
        )
    }
}
