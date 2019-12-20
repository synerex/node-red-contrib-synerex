const Sxutil = require('../sxutil.js')

const channel_RIDESHARE = 1 // should read from synerex_proto .

module.exports = function (RED) {
  'use strict'
  function FleetNode(config) {
    RED.nodes.createNode(this, config)
    var node = this
    console.log('hoo!!!fleet!')

    var util = new Sxutil()

    console.log(util.nodeapi)
  }
  RED.nodes.registerType('Fleet', FleetNode)
}
