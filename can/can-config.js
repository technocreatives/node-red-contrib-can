module.exports = function(RED) {
    "use strict";

    var CanController = require("./can-controller");
    var file = '';
    var socket = '';

    function CanConfigNode(n) {
        RED.nodes.createNode(this, n);

        // Configuration options passed by Node Red
        this.socket = n.socket;
        this.bus = n.bus;
        this.dbFile = n.dbFile;

        file = this.dbFile;
        socket = this.socket;

        // Config node state
        this.refreshRate = 20; //ms
        this.connected = false;
        this.connecting = false;
        this.subscriptions = {};
        this.users = {};

        this.controller = new CanController(this.socket, this.bus, this.dbFile, this.refreshRate);
        var node = this;
        this.controller.on('connect', function(socketName) {
            node.log('Connected to can port '+socketName);
            node.connecting = false;
            node.connected = true;

            // don't continue if we don't have anything to register
            if (Object.keys(node.users).length === 0) {
                return;
            }
            // Here we should tell all registered nodes that it's ok to listen
            for (var user in node.users) {                    
                node.addListener(node.users[user]);
            }
        });
        if (!this.connected && !this.connecting) {
            this.connecting = true;
            this.controller.connect();
        }

        this.register = function(canNode) {
            var name = canNode.name === '' ? canNode.id : canNode.name;
            node.log('Registering '+name);
            node.users[canNode.id] = canNode;

            node.addListener(canNode);
        };

        this.deregister = function(canNode,done) {
            var name = canNode.name === '' ? canNode.id : canNode.name;
            node.log('Deregister '+name);
            node.removeListener(canNode);
            delete node.users[canNode.id];
            done();
        };

        this.addListener = function(canNode) {
            if (!node.connected) {
                node.warn('Can not register listener for '+node.controller.socket+' as it is not connected.');
                return;
            }
            // only if node is a can-listen node
            if (canNode.type !== 'can-listen') {
                return;
            }
            node.log('About to add listener for '+canNode.message+' signal '+canNode.signal);

            if (node.subscriptions[canNode.message] === undefined) {
                node.subscriptions[canNode.message] = {};
                node.subscriptions[canNode.message][canNode.signal] = {};
            }

            var listeners = node.subscriptions[canNode.message][canNode.signal];
            // if we have no listeners (this is the first), register the listener to the can controller
            if (Object.keys(listeners).length === 0) {
            	// register listener
                node.log('Registering real listener for '+canNode.message+' '+canNode.signal);
            	node.controller.registerListener(canNode.message, canNode.signal);
            	node.controller.on('signal', function(message, signal) {
                    // Go trough all listeners and send them updates
                    for (var childNodeId in node.subscriptions[message][signal.name]) {
                        var child = node.subscriptions[message][signal.name][childNodeId];
                        child.update(signal.value);
                    }
            	});
            }

            // Add this can node as a listener
            node.subscriptions[canNode.message][canNode.signal][canNode.id] = canNode;
        };

        this.removeListener = function(canNode) {
            // only if node is a can-listen node
            if (canNode.type !== 'can-listen') {
                return;
            }
            node.log('Removing '+canNode.id+' as lsitener.');
            delete node.subscriptions[canNode.message][canNode.signal][canNode.id];
        }
    }
    
    RED.nodes.registerType("can-config",CanConfigNode);
};
