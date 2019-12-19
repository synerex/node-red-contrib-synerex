module.exports = function(RED) {
  'use strict'
  function FleetNode(config) {
    RED.nodes.createNode(this, config)
    var node = this
  }
  RED.nodes.registerType('Fleet', FleetNode)
}
