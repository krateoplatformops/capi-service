const k8s = require('@kubernetes/client-node')
const request = require('request')

const { logger } = require('./logger.helpers')

const getResource = async (api) => {
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()

  const opts = {}
  kc.applyToRequest(opts)

  return await new Promise((resolve, reject) => {
    request(
      encodeURI(`${kc.getCurrentCluster().server}${api}`),
      opts,
      (error, response, data) => {
        if (error) {
          logger.error(error)
          reject(error)
        } else resolve(data)
      }
    )
  })
}

module.exports = {
  getResource
}
