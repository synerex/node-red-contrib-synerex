const Sxutil = require('../sxutil.js')

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
  function FleetNotifyDemandNode(config) {
    RED.nodes.createNode(this, config)
    var node = this
    var util = new Sxutil()

    const nodesvClient = new util.nodeapi.Node(
      program.nodesrv,
      grpc.credentials.createInsecure()
    )
    const NodeType = Protobuf.Enum.fromDescriptor(util.nodeapi.NodeType.type)

    node.on('input', function (msg) {
      console.log('on here!')

      // connecting server
      nodesvClient.RegisterNode(
        {
          node_name: program.hostname,
          node_type: NodeType.values.PROVIDER,
          channelTypes: [channel_RIDESHARE] // RIDE_SHARE
        },
        (err, resp) => {
          if (!err) {
            console.log('NodeServer connect success!')
            console.log(resp)
            console.log('Node ID is ', resp.node_id)
            console.log('Server Info is ', resp.server_info)
            console.log('KeepAlive is ', resp.keepalive_duration)

            const client = util.synerexServerClient(resp)
            util.fleetNotifyDemand(client, resp.node_id)

            // util.sendJsonNotifySupply('{"hoo": "bar"}', client, resp.node_id)
            // util.startKeepAlive(nodesvClient, resp)
          } else {
            console.log('Error connecting NodeServ.')
            console.log(err)
          }
        }
      )
    })
    node.on('close', function () {
      console.log('close')
    })
  }
  RED.nodes.registerType('FleetNotifyDemand', FleetNotifyDemandNode)
}
