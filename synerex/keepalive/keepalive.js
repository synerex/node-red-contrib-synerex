const Sxutil = require('../../sxutil.js')

const grpc = require('grpc')
const program = require('commander')
const Protobuf = require('protobufjs')

const channel_RIDESHARE = 1 // should read from synerex_proto .

program
  .version('1.0.0')
  .option('-s, --nodesrv [address]', 'Node ID Server', '127.0.0.1:9990')
  .option(
    '-n, --hostname [name]',
    'Hostname for provider',
    'NODE-RED-KARA-KITA'
  )
  .parse(process.argv)

module.exports = function (RED) {
  'use strict'
  function KeepaliveNode(config) {
    RED.nodes.createNode(this, config)
    var node = this
    var util = new Sxutil()

    // Get credental
    this.login = RED.nodes.getNode(config.login) // Retrieve the config node
    if (!this.login) {
      console.log('not login ??')
      node.status({
        fill: 'red',
        shape: 'dot',
        text: 'Credential error'
      })
      node.error('No credentials specified')
      return
    }

    const nodesvClient = new util.nodeapi.Node(
      // program.nodesrv,
      this.login.nodeserv,
      grpc.credentials.createInsecure()
    )
    const NodeType = Protobuf.Enum.fromDescriptor(util.nodeapi.NodeType.type)

    node.status({ fill: 'green', shape: 'dot', text: 'request...' })
    // connecting server

    var context = this.context().global
    var nodeResp = context.get('nodeResp')
    if (nodeResp) {
      console.log('KP has context!', nodeResp)
      keepalive(nodesvClient, nodeResp)
      // node.status({ fill: 'green', shape: 'dot', text: 'connected' })
      // util.startKeepAlive(nodesvClient, resp)
    }

    nodesvClient.RegisterNode(
      {
        node_name: this.login.hostname,
        node_type: NodeType.values.PROVIDER,
        channelTypes: [channel_RIDESHARE] // RIDE_SHARE
      },
      (err, resp) => {
        if (!err) {
          keepalive(nodesvClient, resp)
        } else {
          console.log('Error connecting NodeServ.')
          node.status({ fill: 'red', shape: 'dot', text: 'error' })
          console.log(err)
        }
      }
    )

    node.on('close', function () {
      util.stopKeepAlive()
    })

    function keepalive(nodesvClient, resp) {
      node.status({ fill: 'green', shape: 'dot', text: 'connected' })
      util.startKeepAlive(nodesvClient, resp)
    }
  }
  RED.nodes.registerType('Keepalive', KeepaliveNode)
}
