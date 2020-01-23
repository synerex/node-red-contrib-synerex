const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')
const Protobuf = require('protobufjs')
const FlakeId = require('flake-idgen')
const intformat = require('biguint-format')
const api_path = __dirname + '/synerex_api/synerex.proto'
const nodeapi_path = __dirname + '/synerex_nodeapi/nodeapi.proto'
const fleet_path = __dirname + '/synerex_proto/fleet/fleet.proto'
const fluentd_path = __dirname + '/synerex_proto/fluentd/fluentd.proto'
const geography_path = __dirname + '/synerex_proto/geography/geography.proto'
const ptransit_path = __dirname + '/synerex_proto/ptransit/ptransit.proto'
// const json_path = __dirname + '/proto_json/json.proto'

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

// Fleet
const fleetRoot = Protobuf.loadSync(fleet_path)
const Fleet = fleetRoot.lookup('Fleet')
// fluentd
const fluentdRoot = Protobuf.loadSync(fluentd_path)
const Fluentd = fluentdRoot.lookup('FluentdRecord')
// geography
const geographyRoot = Protobuf.loadSync(geography_path)
const Geography = geographyRoot.lookup('Geo')
// ptransit
const ptransitRoot = Protobuf.loadSync(ptransit_path)
const Ptransit = ptransitRoot.lookup('PTService')

// const jsonRoot = Protobuf.loadSync(json_path)
// const JsonRecord = jsonRoot.lookup('JsonRecord')

const CHANNEL = {
  RIDE_SHARE: 1,
  AD_SERVICE: 2,
  LIB_SERVICE: 3,
  PT_SERVICE: 4,
  ROUTING_SERVICE: 5,
  MARKETING_SERVICE: 6,
  FLUENTD_SERVICE: 7,
  MEETING_SERVICE: 8,
  STORAGE_SERVICE: 9,
  RETRIEVAL_SERVICE: 10,
  PEOPLE_COUNTER_SVC: 11,
  AREA_COUNTER_SVC: 12,
  PEOPLE_AGENT_SVC: 13,
  GEOGRAPHIC_SVC: 14
}

module.exports = class Sxutil {
  constructor() {
    this.nodeapi = nodeApiProto.nodeapi
    this.synerexApi = synerexApiProto.api
    this.CHANNEL = CHANNEL
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

  unRegisterNode(client, resp) {
    // hoo
    console.log('resp', resp)
  }

  getChannel(protcol) {
    var channel = 0
    // set channel
    switch (protcol) {
      case 'fleet':
        channel = CHANNEL.RIDE_SHARE
        break
      case 'ad':
        channel = CHANNEL.AD_SERVICE
        break
      case 'lib':
        channel = CHANNEL.LIB_SERVICE
        break
      case 'ptransit':
        channel = CHANNEL.PT_SERVICE
        break
      case 'routing':
        channel = CHANNEL.ROUTING_SERVICE
        break
      case 'marketing':
        channel = CHANNEL.MARKETING_SERVICE
        break
      case 'fluentd':
        channel = CHANNEL.FLUENTD_SERVICE
        break
      case 'meeting':
        channel = CHANNEL.MEETING_SERVICE
        break
      case 'strage':
        channel = CHANNEL.STORAGE_SERVICE
        break
      case 'retrieval':
        channel = CHANNEL.RETRIEVAL_SERVICE
        break
      case 'pcounter':
        channel = CHANNEL.PEOPLE_COUNTER_SVC
        break
      case 'area':
        channel = CHANNEL.AREA_COUNTER_SVC
        break
      case 'pagent':
        channel = CHANNEL.PEOPLE_AGENT_SVC
        break
      case 'geography':
        channel = CHANNEL.GEOGRAPHIC_SVC
        break
      default:
        channel = 0
        break
    }
    return channel
  }

  subscribe(client, node_id, channel, subscType, callback) {
    const ch = {
      client_id: node_id,
      channel_type: channel,
      arg_json: 'Test...'
    }

    let call
    if (subscType == 'supply') {
      call = client.SubscribeSupply(ch)
    } else {
      call = client.SubscribeDemand(ch)
    }

    call.on('data', function (supply) {
      console.log('==================')
      console.log('receive Supply:', supply)
      var decoded
      switch (channel) {
        case CHANNEL.RIDE_SHARE:
          decoded = Fleet.decode(supply.cdata.entity)
          break

        case CHANNEL.FLUENTD_SERVICE:
          console.log('FLUENTD_SERVICE')
          decoded = Fluentd.decode(supply.cdata.entity)
          break

        case CHANNEL.PT_SERVICE:
          console.log('PT_SERVICE')
          decoded = Ptransit.decode(supply.cdata.entity)
          break

        case CHANNEL.GEOGRAPHIC_SVC:
          console.log('GEOGRAPHIC_SVC')
          decoded = Geography.decode(supply.cdata.entity)
          break

        default:
          decoded = undefined
          break
      }
      decoded.timestamp = supply.ts
      console.log(decoded)
      console.log('==================')
      callback(null, decoded)
    })
    call.on('status', function (st) {
      console.log('Subscribe Status', st)
    })

    call.on('end', function () {
      console.log('Subscribe Done!')
    })
  }

  notify(client, node_id, channel, notifyType, sendData) {
    // we need to encode protocol

    let notifData
    let buffer

    console.log('channel:: ', channel)

    switch (channel) {
      case CHANNEL.RIDE_SHARE:
        notifData = Fleet.create(sendData)
        buffer = Fleet.encode(notifData).finish()
        break

      case CHANNEL.FLUENTD_SERVICE:
        notifData = Fluentd.create(sendData)
        buffer = Fluentd.encode(notifData).finish()
        break

      case CHANNEL.PT_SERVICE:
        notifData = Ptransit.create(sendData)
        buffer = Ptransit.encode(notifData).finish()
        break

      case CHANNEL.GEOGRAPHIC_SVC:
        notifData = Geography.create(sendData)
        buffer = Geography.encode(notifData).finish()
        break

      default:
        buffer = undefined
        break
    }

    var flakeIdGen = new FlakeId({ id: node_id })
    var spid = intformat(flakeIdGen.next(), 'dec')

    var sp = {
      id: spid,
      sendr_id: node_id,
      channel_type: channel,
      supply_name: 'RS Notify',
      arg_json: '',
      cdata: { entity: buffer }
    }
    console.log('===========::', sp)

    if (notifyType == 'supply') {
      client.NotifySupply(sp, (err, resp) => {
        if (!err) {
          console.log('NotifySupply Sent OK', resp)
        } else {
          console.log('NotifySupply error', err)
        }
      })
    } else {
      client.NotifyDemand(sp, (err, resp) => {
        if (!err) {
          console.log('NotifyDemand Sent OK', resp)
        } else {
          console.log('NotifyDemand error', err)
        }
      })
    }
  }
}
