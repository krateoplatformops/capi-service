const express = require('express')
const router = express.Router()
const { logger } = require('../helpers/logger.helpers')
const k8s = require('@kubernetes/client-node')
const request = require('request')
const yaml = require('js-yaml')

router.get('/:deploymentId', async (req, res, next) => {
  try {
    const kc = new k8s.KubeConfig()
    kc.loadFromDefault()

    const opts = {}
    kc.applyToRequest(opts)

    const selector = `deploymentId=${req.params.deploymentId}`
    logger.debug(selector)

    const yamlData = await new Promise((resolve, reject) => {
      request(
        encodeURI(
          `${
            kc.getCurrentCluster().server
          }/api/v1/secrets?labelSelector=${selector}`
        ),
        opts,
        (error, response, data) => {
          if (error) {
            logger.error(error)
            reject(error)
          } else resolve(data)
        }
      )
    })

    let response = null

    const payload = yaml.load(yamlData)
    logger.debug(JSON.stringify(payload))

    if (payload.items && payload.items.length > 0) {
      response = payload.items[0].data.kubeconfig
    }

    if (!response) {
      logger.warn(`Not found ${selector}`)
      return res.status(404).send(`Not found ${selector}`)
    }

    res.status(200).json({
      name: 'config',
      content: response
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
