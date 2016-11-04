module.exports = function(RED) {
    function CanListenNode(config) {
        RED.nodes.createNode(this,config);
        
        this.can = config.can;
        this.canConnection = RED.nodes.getNode(this.can);
        this.message = config.message;
        this.signal = config.signal;
        this.name = config.name;

        var node = this;

        this.update = function(value) {
            node.send({payload:value});
        };

        // no can no action
        if (!this.canConnection) {
            this.error(RED._("can.errors.missing-config"));
            return;
        }

        node.canConnection.register(this);

        this.on('close', function(done) {
            node.canConnection.deregister(node, function() {
                node.log('Node was '+node.id+' was deregistered.');
                done();
            });
        });
    }
    RED.nodes.registerType("can-listen",CanListenNode);
}