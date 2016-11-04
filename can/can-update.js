module.exports = function(RED) {
    function CanUpdateNode(config) {
        RED.nodes.createNode(this,config);

        this.can = config.can;
        this.canConnection = RED.nodes.getNode(this.can);
        this.message = config.message;
        this.signal = config.signal;
        this.oneshoot = config.oneshoot;

        var node = this;

        this.connect = function() {
            node.log('Do not need to connect can-update node.');
        };

        if (this.canConnection) {
            this.log('About to register '+this.name);
            node.canConnection.register(this);

            this.on('input', function(msg) {
                var signal = {name:node.signal,value:msg.payload};
                node.canConnection.controller.updateCanMessageWithSignal(node.message, signal);
                node.canConnection.controller.sendCanMessage(node.message);

                if (!node.oneshoot) {
                    node.canConnection.controller.addRetainedCanMessage(node.message);
                }
            });

            this.on('close', function(done) {
                node.log('About to deregister '+node.id);
                if (node.canConnection) {
                    if (!node.oneshoot) {
                        node.canConnection.controller.removeRetainedCanMessage(node.message);
                    }
                    node.canConnection.deregister(node, function() {
                        node.log('Node was '+node.id+' was deregistered.');
                        done();
                    });
                }
            });
        } else {
            this.error(RED._("can.errors.missing-config"));
        }
    }
    RED.nodes.registerType("can-update",CanUpdateNode);
}