module.exports = function (RED) {
  function CanListenNode(config) {
    RED.nodes.createNode(this, config);

    this.can = config.can;
    this.canConnection = RED.nodes.getNode(this.can);
    this.message = config.message.trim();
    this.signal = config.signal.trim();
    this.name = config.name;
    this.onupdate = config.onupdate;

    var node = this;

    // no can no action
    if (!this.canConnection) {
      this.error(RED._("can.errors.missing-config"));
      return;
    }

    this.update = function (value) {
      node.send({
        payload: value,
      });
    };

    node.canConnection.register(this);

    this.on("close", function (done) {
      node.canConnection.deregister(node, function () {
        var name = node.name === "" ? node.id : node.name;
        node.log("Node " + name + " was deregistered.");
        done();
      });
    });
  }
  RED.nodes.registerType("can-listen", CanListenNode);
};
