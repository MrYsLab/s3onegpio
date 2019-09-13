const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const log = require('../../util/log');

class Scratch3OneGPIO {
    constructor(runtime) {
        this.runtime = runtime;
        this.text = "";
        this.changed = 0;
        this.lasthat = false;
    }

    getInfo() {
        return {
            id: 'onegpio',
            name: 'OneGPIO',
            blocks: [
                {
                    opcode: 'connect',
                    blockType: BlockType.COMMAND,
                    text: 'Connect To: [TEXT]',
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: '1',
                            menu: "boards"
                        }
                    }
                },

            ],
            menus: {
                boards: {
                    acceptReporters: true,
                    items: [{text: "Arduino", value: '1'}, {text: "ESP-8266", value: '2'},
                        {text: "Raspberry Pi", value: '3'}]
                }
            }
        };
    }


    connect(args) {
        //    var rtn = this.changed && (!this.lasthat);
        //    this.changed = false;
        //    this.lasthat = rtn;
        //    return rtn;
        console.log('connect');
        console.log(args);
        window.socket = new WebSocket("ws://127.0.0.1:9000");
        if(args['TEXT'] === '1'){
            var msg = JSON.stringify({"id": "to_arduino_gateway"});
        }
        else if (args['TEXT'] === '2'){
            msg = JSON.stringify({"id": "to_esp8266_gateway"});

        }
        else if (args['TEXT'] === '3'){
            msg = JSON.stringify({"id": "to_rpi_gateway"});

        }
        else {
            alert("ERROR: Unknown Board Type");

        }

        window.socket.onopen = function () {
            //var msg = JSON.stringify({"id": "to_rpi_gateway"});
            //var msg = JSON.stringify({
            //    "command": "ready"
            //});
            console.log(msg);
            window.socket.send(msg);

        };
        window.socket.onclose = function (e) {
            console.log("Connection closed.");
            alert("WebSocket Connection Is Closed.");
            //socket = null;
            //connected = false;
            //myStatus = 1;
            // myMsg = 'not_ready'
        };

    }

}

module.exports = Scratch3OneGPIO;
