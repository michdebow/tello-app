const dgram = require('dgram');

const DEBUG = true;

class TelloInterface {
  constructor() {
    this.HOST = '192.168.10.1';
    this.DRONE_PORT = 8889;

    //for future use to get the drone state.
    this.STATE_PORT = 8890;


    this._drone = null;
    this._droneState = null;


    /*
    * Inner event bus
    */
    this.events = {
      _ok: [],
      emit: (eventName) => {

        if (!eventName in this.events) {
          throw new Error(`EVENT BUS: error -> there is no such event name (${eventName})`);
        }

        this.events[eventName].forEach(action => action());
        DEBUG && console.log(`EVENT BUS: emitting -> ${eventName}`);
      },
      attach: (eventName, callback) => {

        if (!eventName in this.events) {
          throw new Error(`EVENT BUS: error -> there is no such event name (${eventName})`);
        }

        this.events[eventName].push(callback);
        DEBUG && console.log(`EVENT BUS: attaching -> ${eventName} with callback ${callback}`);
      }
    };


    this._droneInitialized = false;


    this._createSockets();
    this._attachListeners();
    this._bindPorts();
    this._prepareDrone();
  }

  // Shorthand for events.attach
  _on(eventName, callback) {
    this.events.attach(eventName, callback);
  }  


  _createSockets() {
    DEBUG && console.log('INTERFACE: Creating sockets...');
    this._drone = dgram.createSocket('udp4');
    this._droneState = dgram.createSocket('udp4');
  };


  _bindPorts() {
    DEBUG && console.log('INTERFACE: Binding ports...');
    this._drone.bind(this.DRONE_PORT);
    this._droneState.bind(this.STATE_PORT);
  }


  _attachListeners() {
    DEBUG && console.log('INTERFACE: Attaching socket listeners...');
    this._drone.on('message', (message) => this._handleMessage(message.toString()));
    this._drone.on('error', this._handleError);
  }


  _prepareDrone() {
    DEBUG && console.log('INTERFACE: Init SDK mode...');
    this.send('command');
  }


  _handleMessage(message) {

    if (message === 'ok') {
      this.events.emit('_ok');
 
      if (!this._droneInitialized) {
        this._droneInitialzed = true;
        DEBUG && console.log('INTERFACE: Tello connected and ready!')
      }       
    }

    console.log(`>> From Tello: ${message}.`);
  }


  _handleError(err) {
    console.log(`!! Error: ${err}.`);
  }


  send(command) {
    return new Promise((resolve, reject) => {
      this._drone.send(command, 0, command.length, this.DRONE_PORT, this.HOST);
      DEBUG && console.log(`INTERFACE: sending command -> ${command}`);

      (command.indexOf('?') > 0)
        ? resolve(`Command >${command}< resolved instantly`)
        : this._on('_ok', () => {
          resolve(`Command >${command}< done`);
        });
    });
  }
  
  async queue(commandsArray) {

    if (!Array.isArray(commandsArray)) {
      throw new Error('This should be an array.');
    }
        
    for (const command of commandsArray) {
      await this.send(command);
    }
  }
  
}


module.exports = TelloInterface;