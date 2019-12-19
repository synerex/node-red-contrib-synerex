module.exports = function(RED) {
  'use strict'
  function FleetNode(config) {
    RED.nodes.createNode(this, config)
    var node = this
    console.log('hoo!!!fleet!')
  }
  RED.nodes.registerType('Fleet', FleetNode)
}
