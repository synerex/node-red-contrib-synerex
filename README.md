this is custom node for synerex!

# instalation

```
$ git clone git@github.com:synerex/node-red-contrib-synerex.git
$ cd node-red-contrib-synerex
$ git submodule update --init --recursive
$ cd /Users/yourname/.node-red  
$ npm install [CLONED PROJECT PATH]

```

# sample flow

## notify
```
[{"id":"3cf56abc.49f226","type":"debug","z":"5ebbf484.903f8c","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"false","x":850,"y":480,"wires":[]},{"id":"252e305d.1a149","type":"Notify","z":"5ebbf484.903f8c","name":"","protcol":"fleet","nottype":"supply","login":"489ec64d.73feb8","x":650,"y":480,"wires":[["3cf56abc.49f226"]]},{"id":"f0e93661.7108c8","type":"json","z":"5ebbf484.903f8c","name":"","property":"payload","action":"","pretty":false,"x":470,"y":480,"wires":[["40042e81.82176","252e305d.1a149"]]},{"id":"40042e81.82176","type":"debug","z":"5ebbf484.903f8c","name":"","active":false,"tosidebar":true,"console":false,"tostatus":false,"complete":"false","x":630,"y":580,"wires":[]},{"id":"a2fb8c52.ddf4c","type":"template","z":"5ebbf484.903f8c","name":"","field":"payload","fieldType":"msg","format":"json","syntax":"mustache","template":"{\n    \"coord\": { \"lat\": 99.85, \"lon\": 199.15 },\n    \"vehicle_id\": 1,\n    \"angle\": 160,\n    \"speed\": 300\n}","output":"str","x":320,"y":480,"wires":[["f0e93661.7108c8"]]},{"id":"fd4f8c71.c4d92","type":"inject","z":"5ebbf484.903f8c","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":140,"y":480,"wires":[["a2fb8c52.ddf4c"]]},{"id":"489ec64d.73feb8","type":"synerex-credentials","z":"","nickname":"Default","nodeserv":"127.0.0.1:9990","hostname":"Node-RED"}]
```

# if you add new protocol, Edit sxutil.js
1. add protocol repository to git submodule
2. add `require()`
``` example
const examole_path = __dirname + '/example_proto/example.proto'
```
3. add locadsync
``` example
const exampleRoot = Protobuf.loadSync(example_path)
const Example = exampleRoot.lookup('Example')
``` 
4. if you add new channel, edit `getChannel(protcol)`
5. edit `switch` in `call.on` in `subscribe()` 
6. edit `switch` in `notify()` 
7. edit `switch` in `subscribeFormatter()` 