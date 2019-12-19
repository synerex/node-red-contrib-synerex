module.exports = function(RED) {
  'use strict'

  function SynerexCredentialsNode(config) {
    RED.nodes.createNode(this, config)
    this.bosh = config.bosh
    this.xmpp = config.xmpp
    if (this.credentials) {
      this.jid = this.credentials.jid
      this.password = this.credentials.password
    }
  }
  RED.nodes.registerType('synerex-credentials', SynerexCredentialsNode, {
    credentials: {
      jid: { type: 'text' },
      password: { type: 'password' }
    }
  })
}
