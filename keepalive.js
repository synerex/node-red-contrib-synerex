class Keepalive {
  startKeepAlive(nClient, resp, errcb) {
    this.initKeepAlive()
    // if (!this.keepaliveIterval) {
    console.log('startKeepAlive')
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
          this.initKeepAlive()
          errcb(err)
        }
      })
    }, resp.keepalive_duration * 1000)
    // }
  }

  initKeepAlive() {
    console.log('init keepalive')
    clearInterval(this.keepaliveIterval)
    this.keepaliveIterval = null
  }
}

module.exports = new Keepalive()
