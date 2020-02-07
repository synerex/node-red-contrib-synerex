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
const pagent_path = __dirname + '/proto_people_agent/pagent.proto'

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
// pagent
const pagentRoot = Protobuf.loadSync(pagent_path)
const Pagent = pagentRoot.lookup('PAgent')

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

  subscribe(sxServClient, node_id, channel, subscType, callback) {
    const ch = {
      client_id: node_id,
      channel_type: channel,
      arg_json: 'Test...'
    }

    let call
    if (subscType == 'supply') {
      call = sxServClient.SubscribeSupply(ch)
    } else {
      call = sxServClient.SubscribeDemand(ch)
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
          decoded = Fluentd.decode(supply.cdata.entity)
          break

        case CHANNEL.PT_SERVICE:
          decoded = Ptransit.decode(supply.cdata.entity)
          break

        case CHANNEL.PEOPLE_AGENT_SVC:
          decoded = Pagent.decode(supply.cdata.entity)
          break

        case CHANNEL.GEOGRAPHIC_SVC:
          decoded = Geography.decode(supply.cdata.entity)
          break

        default:
          decoded = undefined
          break
      }
      decoded.timestamp = supply.ts
      callback(null, decoded)
    })
    call.on('error', function (e) {
      callback(e, null)
    })

    call.on('status', function (st) {
      console.log('Subscribe Status', st)
    })
    call.on('end', function () {
      console.log('Subscribe end!')
    })
  }

  notifyA(sxServClient, node_id, channel, notifyType, sendData) {
    let notifData
    let buffer

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

      case CHANNEL.PEOPLE_AGENT_SVC:
        notifData = Pagent.create(sendData)
        buffer = Pagent.encode(notifData).finish()
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
      sxServClient.NotifySupply(sp, (err, resp) => {
        if (!err) {
          console.log('NotifySupply Sent OK', resp)
        } else {
          console.log('NotifySupply error', err)
        }
      })
    } else {
      sxServClient.NotifyDemand(sp, (err, resp) => {
        if (!err) {
          console.log('NotifyDemand Sent OK', resp)
        } else {
          console.log('NotifyDemand error', err)
        }
      })
    }
  }

  notify(sxServClient, node_id, channel, notifyType, sendData) {
    return new Promise((resolve, reject) => {
      let notifData
      let buffer

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

        case CHANNEL.PEOPLE_AGENT_SVC:
          notifData = Pagent.create(sendData)
          buffer = Pagent.encode(notifData).finish()
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
        sxServClient.NotifySupply(sp, (err, resp) => {
          if (!err) {
            console.log('NotifySupply Sent OK', resp)
            resolve(resp)
          } else {
            console.log('NotifySupply error', err)
            reject(err)
          }
        })
      } else {
        sxServClient.NotifyDemand(sp, (err, resp) => {
          if (!err) {
            console.log('NotifyDemand Sent OK', resp)
            resolve(resp)
          } else {
            console.log('NotifyDemand error', err)
            reject(err)
          }
        })
      }
    })
  }

  subscribeFormatter(channel, successData) {
    console.log('successData', successData)
    let result
    switch (channel) {
      case this.CHANNEL.RIDE_SHARE:
        result = {
          coord: {
            lat: successData.coord.lat,
            lon: successData.coord.lon
          },
          angle: successData.angle,
          speed: successData.speed,
          vehicleId: successData.vehicleId,
          timestamp: successData.timestamp
        }
        break
      case this.CHANNEL.FLUENTD_SERVICE:
        result = {
          tag: successData.tag,
          time: successData.time,
          record: successData.record,
          timestamp: successData.timestamp
        }
        break
      case this.CHANNEL.PT_SERVICE:
        result = {
          coord: {
            lat: successData.lat,
            lon: successData.lon
          },
          angle: successData.angle,
          speed: successData.speed,
          timestamp: successData.timestamp
        }
        break

      case this.CHANNEL.PEOPLE_AGENT_SVC:
        result = {
          id: successData.id,
          point: successData.point
        }
        break

      case this.CHANNEL.GEOGRAPHIC_SVC:
        result = {
          type: successData.type,
          id: successData.id,
          label: successData.label,
          data: successData.data,
          options: successData.options,
          timestamp: successData.timestamp
        }
        break

      default:
        break
    }
    return result
  }

  unRegisterNode(nodeServClient, resp) {
    return new Promise((resolve, reject) => {
      console.log('unRegisterNode', resp)
      if (resp) {
        let nodeid = {
          node_id: resp.node_id,
          secret: resp.secret,
          server_info: resp.server_info,
          keepalive_duration: resp.keepalive_duration
        }
        nodeServClient.UnRegisterNode(nodeid, (err, resp) => {
          if (err) {
            reject(err)
          } else {
            resolve(resp)
          }
        })
      }
    })
  }

  // channel ... ex) fleet = 1,
  // type ... supply/demand
  closeChannel(sxServClient, node_id, channel, type) {
    return new Promise((resolve, reject) => {
      const ch = {
        client_id: node_id,
        channel_type: channel,
        arg_json: 'Test...'
      }

      if (type == 'supply') {
        sxServClient.CloseSupplyChannel(ch, (err, resp) => {
          if (err) {
            reject(err)
          } else {
            resolve(resp)
          }
        })
      } else {
        sxServClient.CloseDemandChannel(ch, (err, resp) => {
          if (err) {
            reject(err)
          } else {
            resolve(resp)
          }
        })
      }
    })
  }

  propose(sxServClient, node_id, channel, notifyType, sendData) {
    return new Promise((resolve, reject) => {
      console.log('PROPOSE!!!')

      let notifData
      let buffer

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

        case CHANNEL.PEOPLE_AGENT_SVC:
          notifData = Pagent.create(sendData)
          buffer = Pagent.encode(notifData).finish()
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

      if (notifyType == 'supply') {
        sxServClient.ProposeSupply(sp, (err, resp) => {
          if (!err) {
            console.log('ProposeSupply Sent OK', resp)
            resolve(resp)
          } else {
            console.log('ProposeSupply error', err)
            reject(err)
          }
        })
      } else {
        sxServClient.ProposeDemand(sp, (err, resp) => {
          if (!err) {
            console.log('ProposeDemand Sent OK', resp)
            resolve(resp)
          } else {
            console.log('NotifyDemand error', err)
            reject(err)
          }
        })
      }
    })
  }

  /*
  synerex select api
  */
  select(sxServClient, nodeResp, channel, type) {
    return new Promise((resolve, reject) => {
      const target = {
        id: 1,
        sender_id: nodeResp.node_id,
        target_id: 0,
        channel_type: channel
      }

      switch (type) {
        case 'supply':
          sxServClient.SelectSupply(target, (err, resp) => {
            if (err) {
              console.log('error', err)
              reject(err)
            } else {
              console.log('resp', resp)
              resolve(resp)
            }
          })
          break

        case 'demand':
          sxServClient.SelectDemand(target, (err, resp) => {
            if (err) {
              console.log(err)
              reject(err)
            } else {
              console.log(resp)
              resolve(resp)
            }
          })
          break
        default:
          break
      }
    })
  }
}
