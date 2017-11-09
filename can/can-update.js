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

        this.on('input', function(msg) {
            var signal = {
                name: node.signal,
                value: msg.payload
            };
            node.canConnection.controller.updateCanMessageWithSignal(node.message, signal);
            node.canConnection.controller.sendCanMessage(node.message);

            if (!node.oneshoot) {
                node.canConnection.controller.addRetainedCanMessage(node.message);
            }
        });

        this.on('close', function(done) {
            if (!node.oneshoot) {
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
