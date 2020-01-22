const Sxutil = require('../../sxutil.js')
const Keepalive = require('../../keepalive.js')
const grpc = require('grpc')
const Protobuf = require('protobufjs')

module.exports = function (RED) {
  'use strict'
  function SelectNode(config) {
    RED.nodes.createNode(this, config)
    var node = this
    var util = new Sxutil()
    const context = this.context().global
    // get subscribe info
    const seltype = config.seltype

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
    } else {
      node.status({})
    }

    const nodesvClient = new util.nodeapi.Node(
      this.login.nodeserv,
      grpc.credentials.createInsecure()
    )
    const NodeType = Protobuf.Enum.fromDescriptor(util.nodeapi.NodeType.type)

    // Input Action
    node.on('input', function (msg) {
      // get from global
      console.log('HELLO SELECT!!')
      console.log('payload :: ', msg.payload)
      console.log('seltype:: ', seltype)

      var nodeResp = context.get('nodeResp')
      var sxClient = context.get('sxServerClient')

      if (nodeResp && sxClient) {
        console.log('has context!!! ============')
        util.select(sxClient, nodeResp.node_id, 1, seltype)
        Keepalive.startKeepAlive(nodesvClient, nodeResp)
        return
      }

      // node.status({ fill: 'green', shape: 'dot', text: 'request...' })
      // // connecting server
      // nodesvClient.RegisterNode(
      //   {
      //     node_name: this.login.hostname,
      //     node_type: NodeType.values.PROVIDER,
      //     channelTypes: [channel]
      //   },
      //   (err, resp) => {
      //     if (!err) {
      //       node.status({ fill: 'green', shape: 'dot', text: 'success' })
      //       console.log('NodeServer connect success!')
      //       console.log(resp)
      //       console.log('Node ID is ', resp.node_id)
      //       console.log('Server Info is ', resp.server_info)
      //       console.log('KeepAlive is ', resp.keepalive_duration)

      //       const client = util.synerexServerClient(resp)
      //       // set context
      //       context.set('nodeResp', resp)
      //       context.set('sxServerClient', client)

      //       util.notify(client, resp.node_id, channel, nottype, msg.payload)
      //       Keepalive.startKeepAlive(nodesvClient, resp)
      //     } else {
      //       node.status({ fill: 'red', shape: 'dot', text: 'error' })
      //       console.log('Error connecting NodeServ.')
      //       console.log(err)
      //     }
      //   }
      // )
    })
    node.on('close', function () {
      let nodeResp = context.get('nodeResp')
      util.unRegisterNode(nodesvClient, nodeResp)
      node.status({})
      context.set('nodeResp', undefined)
      context.set('sxServerClient', undefined)
      Keepalive.stopKeepAlive()
    })
  }
  RED.nodes.registerType('Select', SelectNode)
}
