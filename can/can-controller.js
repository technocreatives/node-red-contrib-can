'use strict';

var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var can = require('socketcan');
var HashMap = require('hashmap');
var fs = require('fs');

function CanController(socket, bus, dbFile, refreshRate) {
    var self = this;

    self.socket = socket;
    self.bus = bus;
    self.refreshRate = refreshRate || 20;
    self.dbFile = dbFile;

    self.emitter = new EventEmitter();

    self.retainedCanMessages = new HashMap();
}

CanController.prototype = {
    constructor: CanController,

    on: function(event, callback) {
        var self = this;
        self.emitter.on(event, callback);
    },

    connect: function() {
        var self = this;
        try {
            fs.accessSync(self.dbFile);
        } catch (e) {
            console.error('error ' + e.message);
            return;
        }
        if (self.socket === '' || self.socket === undefined) {
            console.error('Must specify socket for can-controller before connect.');
            return;
        }
        if (self.bus === '' || self.bus === undefined) {
            console.error('Must specify bus for can-controller before connect.');
            return;
        }
        self._initializeCanConnection(self.dbFile, self.socket, self.bus);
    },

    disconnect: function() {
        var self = this;
        if (self.channel != undefined) {
            self.channel.stop();
        }

    },

    _emitCanSignalChanged: function(message, signal) {
        var self = this;
        self.emitter.emit('signal', message, signal);
    },

    _emitCanConnected: function(socketName) {
        var self = this;
        self.emitter.emit('connect', socketName);
    },

    _isDatabaseServiceCreated: function() {
        if (this.databaseService === undefined) {
            console.error('error adding listener as databaseService is not created. Run _initializeCanConnection to create.');
            return false;
        }
        return true;
    },

    _initializeCanConnection: function(database, socket, bus) {
        // Parse database
        var self = this;
        var network = can.parseNetworkDescription(database);

        try {
            self.channel = can.createRawChannel(socket, false); // False don't add timestamp to messages
        } catch (e) {
            console.error('error %s when creating channel for socket %s', e.message, socket);
            return;
        }
        this.databaseService = new can.DatabaseService(self.channel, network.buses[bus]);
        self.channel.start();
        this._emitCanConnected(socket);
    },
    registerListener: function(message, signal, callback) {
        var self = this;
        if (!self._isDatabaseServiceCreated())
            return;
        self.databaseService.messages[message].signals[signal].onChange(function(sig) {
            callback(message, sig);
        });
    },

    /**
     * Will send the data conencted with message out on can.
     * message - the can message that you want to send
     */
    sendCanMessage: function(message) {
        var self = this;
        if (message === undefined) {
            console.error('undefined message not valid');
            return;
        }
        // can't send can message if no service is created
        if (!this._isDatabaseServiceCreated())
            return;
        try {
            self.databaseService.send(message);
        } catch (e) {
            console.error('error %s when sending can msg %s', e.message, message);
        }
    },

    sendAllCanMessages: function() {
        var self = this;
        if (!this._isDatabaseServiceCreated()) {
            return;
        }

        _.forEach(self.databaseService.messages, function(message) {
            self.sendCanMessage(message);
        });
    },

    /**
     * Will update one can message with the specified signal and value. Don't forget to send it!
     * message - string representing the message that the signal belong to
     * signal - object with the properties name and value.
     */
    updateCanMessageWithSignal: function(message, signal) {
        var self = this;
        // can't update can message if no service is created
        if (!this._isDatabaseServiceCreated())
            return;
        var value = parseFloat(signal.value);
        self.databaseService.messages[message].signals[signal.name].update(value);
    },

    /**
     * Will add the message to a retained map and initiate a setInterval that will keep sending it.
     * message - the CAN message we want to keep sending.
     */
    addRetainedCanMessage: function(message) {
        var self = this;

        // check that message isn't already in list
        if (self.retainedCanMessages.has(message)) {
            // message already in list return
            return;
        }

        // create interval to send added message
        var intervalId = setInterval(function() {
            self.sendCanMessage(message);
        }, self.refreshRate);

        self.retainedCanMessages.set(message, intervalId);
    },

    /**
     * If the CAN message is retained this will stop the interval that keeps sending it.
     * message - The CAN message that we want to no longer be retained.
     */
    removeRetainedCanMessage: function(message) {
        var self = this;

        // message not already retained, exit
        if (!self.retainedCanMessages.has(message))
            return;

        var intervalId = self.retainedCanMessages.get(message);
        clearInterval(intervalId);

        // Remove message from retained messages
        self.retainedCanMessages.remove(message);
    },
    readCurrentSignal: function(message, signal) {
        var self = this;

        var foundValue = null;

        if (!this._isDatabaseServiceCreated()) {
            return;
        }

        if (self.databaseService.messages[message]) {

            if (signal === undefined || signal === '') {
                foundValue = self.databaseService.messages[message].signals;
            } else {
                if (self.databaseService.messages[message].signals[signal]) {
                    foundValue = self.databaseService.messages[message].signals[signal].value;
                }
            }
        }

        return foundValue;

    }
};

module.exports = CanController;
