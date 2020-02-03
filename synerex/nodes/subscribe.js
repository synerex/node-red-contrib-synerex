const Sxutil = require('../../sxutil.js')
const Keepalive = require('../../keepalive.js')
const grpc = require('grpc')
const Protobuf = require('protobufjs')

module.exports = function (RED) {
  'use strict'
  function SubscribeNode(config) {
    RED.nodes.createNode(this, config)
    // basic
    const node = this
    const util = new Sxutil()
    const context = this.context().global

    // get subscribe info
    const protcol = config.protcol
    const subtype = config.subtype
    const channel = util.getChannel(protcol)

    // Get credental
    const login = RED.nodes.getNode(config.login) // Retrieve the config node
    if (!login) {
      console.log('not login')
      node.status({
        fill: 'red',
        shape: 'dot',
        text: 'Credential error'
      })
      node.error('No credentials specified')
      return
    }

    // create node server client
    const nodesvClient = new util.nodeapi.Node(
      login.nodeserv,
      grpc.credentials.createInsecure()
    )
    const NodeType = Protobuf.Enum.fromDescriptor(util.nodeapi.NodeType.type)
    // connecting server
    connectToNode()

    function connectToNode() {
      node.status({ fill: 'green', shape: 'dot', text: 'request...' })
      nodesvClient.RegisterNode(
        {
          node_name: login.hostname,
          node_type: NodeType.values.PROVIDER,
          channelTypes: [util.getChannel(protcol)]
        },
        (err, resp) => {
          if (!err) {
            node.status({
              fill: 'green',
              shape: 'dot',
              text: 'connected'
            })
            console.log('NodeServer connect success!')
            console.log(resp)
            console.log('supply Node ID is ', resp.node_id)
            console.log('Server Info is ', resp.server_info)
            console.log('KeepAlive is ', resp.keepalive_duration)

            // create sever client
            const client = util.synerexServerClient(resp)

            // get from context
            let nodeResp = context.get('nodeResp')
            let sxClient = context.get('sxServerClient')

            if (nodeResp && sxClient) {
              // if already have resp and client
              subscribe(sxClient, nodeResp.node_id)
              Keepalive.startKeepAlive(nodesvClient, nodeResp)
            } else {
              // set context
              context.set('nodeResp', resp)
              context.set('sxServerClient', client)
              // // subscribe
              subscribe(client, resp.node_id)
              Keepalive.startKeepAlive(nodesvClient, resp)
            }
          } else {
            console.log('Error connecting NodeServ.')
            node.status({ fill: 'red', shape: 'dot', text: 'error NodeServ' })
            console.log(err)
          }
        }
      )
    }

    // Subscribe Logic
    function subscribe(client, node_id) {
      console.log('come subscribe ================== ')
      util.subscribe(client, node_id, channel, subtype, function (err, success) {
        if (err) {
          switch (err.code) {
            case 2:
            case 14:
              console.log('Stream removed ===========')
              console.log('Try recconect...')
              node.status({ fill: 'red', shape: 'dot', text: 'try recconect' })
              // reconnect
              setTimeout(function () {
                console.log('try subscribr reconnect ....')
                // subscribe(client, node_id)
                connectToNode()
              }, 5000)
              break
            default:
              console.log('subscribe error!', err)
              break
          }
        } else {
          console.log('success :: ', success)
          node.status({ fill: 'green', shape: 'dot', text: 'connected' })
          node.send({ payload: util.subscribeFormatter(channel, success) })
        }
      })
    }

    node.on('close', function () {
      console.log('[CLOSE] =================')
      let nodeResp = context.get('nodeResp')
      util.unRegisterNode(nodesvClient, nodeResp).then(
        function (data) {
          console.log('unRegisterNode SUCESS', data)
        },
        function (err) {
          console.log('unRegisterNode ERROR', err)
        }
      )
      node.status({})
      context.set('nodeResp', undefined)
      context.set('sxServerClient', undefined)
      Keepalive.stopKeepAlive()
    })
  }
  RED.nodes.registerType('Subscribe', SubscribeNode)
}
