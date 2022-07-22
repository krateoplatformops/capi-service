const express = require('express')
const router = express.Router()
const { logger } = require('../helpers/logger.helpers')
const k8s = require('@kubernetes/client-node')
const request = require('request')
const yaml = require('js-yaml')
const { getResource } = require('../helpers/k8s.helper')

router.get('/:deploymentId/kubeconfig', async (req, res, next) => {
  try {
    const selector = `deploymentId=${req.params.deploymentId}`
    logger.debug(selector)

    const yamlData = await getResource(
      `/api/v1/secrets?labelSelector=${selector}`
    )

    let response = null

    const payload = yaml.load(yamlData)
    logger.debug(JSON.stringify(payload))

    if (payload.items && payload.items.length > 0) {
      const sec = payload.items.find((x) => x.data.kubeconfig)
      if (sec) {
        response = sec.data.kubeconfig
      }
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

router.get('/:deploymentId/cluster', async (req, res, next) => {
  try {
    const selector = `deploymentId=${req.params.deploymentId}`
    logger.debug(selector)

    const response = {}

    // Name
    const cluster = await getResource(
      `/apis/templates.krateo.io/v1alpha1/capi?labelSelector=${selector}`
    )
    const payload = yaml.load(cluster)
    if (payload && payload.items) {
      response.name = payload.items[0].spec.name
      response.region = payload.items[0].spec.region
      response.version = payload.items[0].spec.kubernetes.version
      response.flavor = payload.items[0].spec.flavor
      response.autoscaling = payload.items[0].spec.autoscaling
      response.nodes = payload.items[0].spec.worker.machine.count
      response.ha = payload.items[0].spec.controlplane.ha
      response.tags = payload.items[0].spec.tags
    }

    // Status
    const clusterStatus = await getResource(
      `/apis/infrastructure.cluster.x-k8s.io/v1alpha5/openstackclusters?labelSelector=${selector}`
    )
    const payloadStatus = yaml.load(clusterStatus)
    if (payloadStatus && payloadStatus.items) {
      response.ready = payloadStatus.items[0].status?.ready || false
      response.creationDate = payloadStatus.items[0].metadata.creationTimestamp
    }

    res.status(200).json({
      values: Object.keys(response).map((x) => ({
        name: x,
        value: response[x]
      }))
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
