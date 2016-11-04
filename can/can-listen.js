module.exports = function(RED) {
    function CanListenNode(config) {
        RED.nodes.createNode(this,config);
        
        this.can = config.can;
        this.canConnection = RED.nodes.getNode(this.can);
        this.message = config.message;
        this.signal = config.signal;

        var node = this;

        this.update = function(value) {
            node.send({payload:value});
        };
        this.connect = function() {
            if (!node.canConnection.connected) {
                node.warn('Can is not connected so can not add listener.');
                return;
            }
            node.log('About to add listener for '+node.message+' signal '+node.signal);
            node.canConnection.addListener(node);
        };

        if (this.canConnection) {
            this.log('About to register '+this.name);
            node.canConnection.register(this);

            this.on('close', function(done) {
                node.log('About to deregister '+node.id);
                if (node.canConnection) {
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
    RED.nodes.registerType("can-listen",CanListenNode);
}