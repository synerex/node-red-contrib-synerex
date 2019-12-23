const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')
// const program = require('commander')
const Protobuf = require('protobufjs')
const channel_RIDESHARE = 1 // should read from synerex_proto .
const api_path = __dirname + '/synerex_api/synerex.proto'
const nodeapi_path = __dirname + '/synerex_nodeapi/nodeapi.proto'
const fleet_path = __dirname + '/synerex_proto/fleet/fleet.proto'

// program
//   .version('1.0.0')
//   .option('-s, --nodesrv [address]', 'Node ID Server', '127.0.0.1:9990')
//   .option('-n, --hostname [name]', 'Hostname for provider', 'NodeJS_Sample')
//   .parse(process.argv)

const nodeApiDefinition = protoLoader.loadSync(nodeapi_path, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
})

const nodeApiProto = grpc.loadPackageDefinition(nodeApiDefinition)

const synerexApiDefinition = protoLoader.loadSync(api_path, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
})

const synerexApiProto = grpc.loadPackageDefinition(synerexApiDefinition)
// const synerexApi = synerexApiProto.api

const fleetRoot = Protobuf.loadSync(fleet_path)

//console.log("Fleet",fleetRoot.lookup("Fleet"))

const Fleet = fleetRoot.lookup('Fleet')

module.exports = class Sxutil {
  constructor() {
    this.nodeapi = nodeApiProto.nodeapi
    this.synerexApi = synerexApiProto.api
  }

  sendNotifySupply(client, node_id) {
    // we need to encode protocol
    var flt = Fleet.create({
      coord: { lat: 34.85, lon: 137.15 },
      vehicle_id: 1,
      angle: 160,
      speed: 280
    })

    console.log('Send Fleet Info', flt)

    var buffer = Fleet.encode(flt).finish()
    var sp = {
      id: 0, // should use snowflake id..
      sendr_id: node_id,
      channel_type: channel_RIDESHARE,
      supply_name: 'RS Notify',
      arg_json: '',
      cdata: { entity: buffer }
    }

    client.NotifySupply(sp, (err, resp) => {
      if (!err) {
        console.log('Sent OK', resp)
      } else {
        console.log('error', err)
      }
    })
  }

  subscribeDemand(client, node_id) {
    var ch = {
      client_id: node_id,
      channel_type: channel_RIDESHARE,
      arg_json: 'Test...'
    }

    var call = client.SubscribeSupply(ch)

    call.on('data', function (supply) {
      console.log('receive Supply:', supply)
      //        console.log("CDATA:",supply.cdata.entity);
      var flt = Fleet.decode(supply.cdata.entity)
      console.log(flt)
    })
    call.on('status', function (st) {
      console.log('Subscribe Status', st)
    })

    call.on('end', function () {
      console.log('Subscribe Done!')
    })
  }

  connectSynerexServer(resp) {
    console.log('Connecting synerex Server ', resp.server_info)
    const sClient = new this.synerexApi.Synerex(
      resp.server_info,
      grpc.credentials.createInsecure()
    )

    this.sendNotifySupply(sClient, resp.node_id)

    console.log('Subscribe RIDE_SHARE Channel')

    this.subscribeDemand(sClient, resp.node_id)
  }

  startKeepAlive(nClient, resp) {
    global.update = 0
    setInterval(() => {
      var updt = {
        node_id: resp.node_id,
        secret: resp.secret,
        update_count: global.udpate++,
        node_status: 0,
        node_arg: 'OK'
      }
      nClient.KeepAlive(updt, (err, resp) => {
        if (!err) {
          console.log('KeepAlive OK', resp)
        } else {
          console.log('Error!', err)
        }
      })
    }, resp.keepalive_duration * 1000)
  }
}