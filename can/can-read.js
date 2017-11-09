module.exports = function(RED) {
    function CanReadNode(config) {
        RED.nodes.createNode(this, config);

        this.can = config.can;
        this.canConnection = RED.nodes.getNode(this.can);
        this.message = config.message;
        this.signal = config.signal;
        //this.oneshoot = config.oneshoot;
        this.name = config.name;

        var node = this;

        // no can no action
        if (!this.canConnection) {
            this.error(RED._('can.errors.missing-config'));
            return;
        }

        if (this.message) {

            this.status({
                fill: 'green',
                shape: 'ring',
                text: 'Ready to query ' + this.message
            });
        }

        node.canConnection.register(this);

        this.on('input', function(msg) {
            var usePayloadConf = msg.payload && msg.payload.message;
            var actualMessage = usePayloadConf ? msg.payload.message : this.message;
            var actualSignal = usePayloadConf ? msg.payload.signal : this.signal;

            if (!actualMessage || actualMessage === '' || actualSignal === undefined || actualSignal === '') {
                this.status({
                    fill: 'red',
                    shape: 'ring',
                    text: 'empty CAN message/signal'
                });
                return;
            }

            var value = node.canConnection.controller.readCurrentSignal(actualMessage, actualSignal);

            this.status({
                fill: 'green',
                shape: 'ring',
                text: 'Queried ' + actualMessage + ' - ' + actualSignal
            });

            node.send({
                payload: value
            });
        });

        this.on('close', function(done) {

            node.canConnection.deregister(node, function() {
                var name = node.name === '' ? node.id : node.name;
                node.log('Node ' + name + ' was deregistered.');
                done();
            });
        });
    }
    RED.nodes.registerType('can-read', CanReadNode);
};
