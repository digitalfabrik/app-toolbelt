import { Command } from 'commander'
import fetch from 'node-fetch'

import { MAIN_BRANCH } from '../constants.js'

const CIRCLECI_URL = 'https://circleci.com/api/v2/project/github/digitalfabrik/integreat-app/pipeline'
const WORKFLOW_TYPES = [
  'none',
  'native_development_delivery',
  'native_production_delivery',
  'native_promotion',
  'web_production_delivery',
  'delivery',
  'promotion',
  'native_beta_delivery',
  'web_promotion',
  'web_beta_delivery'
]

export default (parent: Command) =>
  parent
    .command('trigger <workflow-type>')
    .requiredOption('--api-token <api-token>', 'circleci api token')
    .option('--branch <branch>', 'the branch the workflow will be triggered on', MAIN_BRANCH)
    .description(`trigger a workflow in the ci on the main branch`)
    .action(async (workflowType: string, options: { [key: string]: any }) => {
      try {
        if (!WORKFLOW_TYPES.includes(workflowType)) {
          throw new Error(`Only the following workflow types are supported: ${WORKFLOW_TYPES}`)
        }

        const postData = {
          branch: options.branch,
          parameters: {
            api_triggered: true,
            workflow_type: workflowType
          }
        }

        const response = await fetch(CIRCLECI_URL, {
          method: 'POST',
          body: JSON.stringify(postData),
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Circle-Token': options.apiToken
          }
        })
        const json = await response.json()
        console.log(json)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
