class Keepalive {
  startKeepAlive(nClient, resp) {
    console.log('startKeepAlive')
    console.log('resp.secret', resp.secret)
    if (!this.keepaliveIterval) {
      console.log('DO keepalive')
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
  }

  stopKeepAlive() {
    console.log('stop keepalive')
    clearInterval(this.keepaliveIterval)
    this.keepaliveIterval = undefined
  }
}

module.exports = new Keepalive()
