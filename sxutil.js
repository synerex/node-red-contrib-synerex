const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')
const Protobuf = require('protobufjs')
const FlakeId = require('flake-idgen')
const intformat = require('biguint-format')
const channel_RIDESHARE = 1 // should read from synerex_proto .
const channel_STRAGE = 9 // temp json
const api_path = __dirname + '/synerex_api/synerex.proto'
const nodeapi_path = __dirname + '/synerex_nodeapi/nodeapi.proto'
const fleet_path = __dirname + '/synerex_proto/fleet/fleet.proto'
const json_path = __dirname + '/proto_json/json.proto'

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
const Fleet = fleetRoot.lookup('Fleet')

const jsonRoot = Protobuf.loadSync(json_path)
const JsonRecord = jsonRoot.lookup('JsonRecord')

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

    // create snowflake id
    var flakeIdGen = new FlakeId({ id: node_id })
    var spid = intformat(flakeIdGen.next(), 'dec')

    var sp = {
      id: spid, // should use snowflake id
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
      console.log('==================')
      console.log('receive Supply:', supply)
      //        console.log("CDATA:",supply.cdata.entity);
      var flt = Fleet.decode(supply.cdata.entity)
      console.log(flt)
      console.log('==================')
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

    // send fleet data
    this.sendNotifySupply(sClient, resp.node_id)

    console.log('Subscribe RIDE_SHARE Channel')
    // subscribe
    this.subscribeDemand(sClient, resp.node_id)
  }

  /*
   *  Client
   */

  synerexServerClient(resp) {
    console.log('Connecting synerex Server ', resp.server_info)
    const sClient = new this.synerexApi.Synerex(
      resp.server_info,
      grpc.credentials.createInsecure()
    )
    return sClient
  }

  /*
   *  Json Actions
   */

  sendJsonNotifySupply(json, client, node_id) {
    var jsonrc = JsonRecord.create({
      json: json
    })

    console.log('Send json Info', jsonrc)

    var buffer = JsonRecord.encode(jsonrc).finish()

    // create snowflake id
    var flakeIdGen = new FlakeId({ id: node_id })
    var spid = intformat(flakeIdGen.next(), 'dec')

    var sp = {
      id: spid,
      sendr_id: node_id,
      channel_type: channel_STRAGE,
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

  jsonSubscribeDemand(client, node_id) {
    console.log('jsonSubscribeDemand =======================')
    var ch = {
      client_id: node_id,
      channel_type: channel_STRAGE,
      arg_json: 'Test...'
    }

    var call = client.SubscribeDemand(ch)

    call.on('data', function (supply) {
      console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~')
      console.log('json receive Supply:', supply)
      //        console.log("CDATA:",supply.cdata.entity);
      var jsonRc = JsonRecord.decode(supply.cdata.entity)
      console.log(jsonRc)
      console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~')
    })
    call.on('status', function (st) {
      console.log('Subscribe Status', st)
    })

    call.on('end', function () {
      console.log('Subscribe Done!')
    })
  }

  /*
   *  Fleet Actins
   */

  fleetNotifySupply(client, node_id) {
    // we need to encode protocol
    var flt = Fleet.create({
      coord: { lat: 99.85, lon: 199.15 },
      vehicle_id: 1,
      angle: 160,
      speed: 280
    })

    console.log('Send Fleet Info', flt)
    var flakeIdGen = new FlakeId({ id: node_id })
    var spid = intformat(flakeIdGen.next(), 'dec')

    var buffer = Fleet.encode(flt).finish()
    var sp = {
      id: spid, // should use snowflake id..
      sendr_id: node_id,
      channel_type: channel_RIDESHARE,
      supply_name: 'RS Notify',
      arg_json: '',
      cdata: { entity: buffer }
    }
    console.log('===========::', sp)

    client.NotifySupply(sp, (err, resp) => {
      if (!err) {
        console.log('Sent OK', resp)
      } else {
        console.log('error', err)
      }
    })
  }

  fleetNotifyDemand(client, node_id) {
    var flt = Fleet.create({
      coord: { lat: 55.55, lon: 155.55 },
      vehicle_id: 1,
      angle: 150,
      speed: 250
    })

    console.log('fleetNotifyDemand', flt)
    // const uid = new UniqueID()
    var flakeIdGen = new FlakeId({ id: node_id })
    var spid = intformat(flakeIdGen.next(), 'dec')

    var buffer = Fleet.encode(flt).finish()
    var sp = {
      id: spid, // should use snowflake id..
      sendr_id: node_id,
      channel_type: channel_RIDESHARE,
      supply_name: 'RS Notify',
      arg_json: '',
      cdata: { entity: buffer }
    }

    client.NotifyDemand(sp, (err, resp) => {
      if (!err) {
        console.log('NotifyDemand Sent OK', resp)
      } else {
        console.log('NotifyDemand error', err)
      }
    })
  }

  fleetSubscribeDemand(client, node_id, callback) {
    var ch = {
      client_id: node_id,
      channel_type: channel_RIDESHARE,
      arg_json: 'Test...'
    }

    var call = client.SubscribeDemand(ch)

    call.on('data', function (supply) {
      console.log('==================')
      console.log('receive Supply:', supply)
      var flt = Fleet.decode(supply.cdata.entity)
      console.log(flt)
      console.log('==================')
      callback(null, flt)
    })
    call.on('status', function (st) {
      console.log('Subscribe Status', st)
    })

    call.on('end', function () {
      console.log('Subscribe Done!')
    })
  }

  fleetSubscribeSupply(client, node_id, callback) {
    var ch = {
      client_id: node_id,
      channel_type: channel_RIDESHARE,
      arg_json: 'Test...'
    }

    var call = client.SubscribeSupply(ch)

    call.on('data', function (supply) {
      console.log('==================')
      console.log('receive Supply:', supply)
      var flt = Fleet.decode(supply.cdata.entity)
      console.log(flt)
      console.log('==================')
      callback(null, flt)
    })
    call.on('status', function (st) {
      console.log('Subscribe Status', st)
    })

    call.on('end', function () {
      console.log('Subscribe Done!')
    })
  }

  startKeepAlive(nClient, resp) {
    console.log('startKeepAlive')
    console.log('resp.secret', resp.secret)
    global.update = 0
    this.keepaliveIterval = setInterval(() => {
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

  stopKeepAlive() {
    console.log('KP STOP!!!!!!!!!!!!!')
    clearInterval(this.keepaliveIterval)
  }
}
