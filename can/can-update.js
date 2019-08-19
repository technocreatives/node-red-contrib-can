module.exports = function(RED) {
    function CanUpdateNode(config) {
        RED.nodes.createNode(this, config);

        this.can = config.can;
        this.canConnection = RED.nodes.getNode(this.can);
        this.message = config.message;
        this.signal = config.signal;
        this.oneshoot = config.oneshoot;
        this.name = config.name;

        var node = this;

        // no can no action
        if (!this.canConnection) {
            this.error(RED._('can.errors.missing-config'));
            return;
        }

        node.canConnection.register(this);

        this.on('input', function (msg) {
            if (msg.payload.can) {
                var message = Object.keys(msg.payload.can);
                var signal = Object.keys(msg.payload.can[message]);
                var signalobj = {};

                for (x = 0; x < message.length; x++) {
                    for (i = 0; i < signal.length; i++) {
                        signalobj.name = signal[i];
                        signalobj.value = msg.payload.can[message[x]][signal[i]];
                        node.canConnection.controller.updateCanMessageWithSignal(message[x], signalobj);
                    }
                
                }

            }
            else {
                var signal = {
                    name: node.signal,
                    value: msg.payload
                };
                node.canConnection.controller.updateCanMessageWithSignal(node.message, signal);
            }

            if (msg.can !== 'disable') {
                if (msg.payload.can){
                  var message = Object.keys(msg.payload.can);
                  for (x = 0; x < message.length; x++){
                    node.canConnection.controller.sendCanMessage(message[x]);
                  }
                  
                }
                else {
                  node.canConnection.controller.sendCanMessage(node.message);
                }
            }

            switch (msg.can || 'enable') {

                case 'disable':
                case 'disabled':
                    if (node.oneshoot !== true) {
                        if (msg.payload.can){
                          var message = Object.keys(msg.payload.can);
                          for (x = 0; x < message.length; x++){
                            node.canConnection.controller.removeRetainedCanMessage(message[x]);
                          }
                        }else {
                          node.canConnection.controller.removeRetainedCanMessage(node.message);
                        }
                        node.status({ fill: "red", shape: "dot", text: "Disabled" });
                    }
                    break;
                case 'enable':
                case 'enabled':
                default:
                    if (node.oneshoot !== true) {
                        if (msg.payload.can){
                          var message = Object.keys(msg.payload.can);
                          for (x = 0; x < message.length; x++){
                            node.canConnection.controller.addRetainedCanMessage(message[x]);
                            
                          }
                        }
                        else {
                          node.canConnection.controller.addRetainedCanMessage(node.message);
                        }
                        node.status({ fill: "green", shape: "dot", text: "Cyclic" });
                    }
            }

            if (node.oneshoot === true) {
                node.status({ fill: "grey", shape: "dot", text: "Oneshoot" });
            }
        });

        this.on('close', function (done) {
            if (node.oneshoot !== true) {
                node.canConnection.controller.removeRetainedCanMessage(node.message);
            }
            node.canConnection.deregister(node, function() {
                var name = node.name === '' ? node.id : node.name;
                node.log('Node ' + name + ' was deregistered.');
                done();
            });
        });
    }
    RED.nodes.registerType('can-update', CanUpdateNode);
};
