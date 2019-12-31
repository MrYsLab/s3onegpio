/*
This is the Scratch 3 extension to remotely control an
Arduino Uno, ESP-8666, or Raspberry Pi


 Copyright (c) 2019 Alan Yorinks All rights reserved.

 This program is free software; you can redistribute it and/or
 modify it under the terms of the GNU AFFERO GENERAL PUBLIC LICENSE
 Version 3 as published by the Free Software Foundation; either
 or (at your option) any later version.
 This library is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 General Public License for more details.

 You should have received a copy of the GNU AFFERO GENERAL PUBLIC LICENSE
 along with this library; if not, write to the Free Software
 Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 */

// Boiler plate from the Scratch Team
const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');

require('sweetalert');

// an array to save the current pin mode
// this is common to all board types since it contains enough
// entries for all the boards.
// Modes are listed above - initialize to invalid mode of -1
let pin_modes = new Array(30).fill(-1);

// has an websocket message already been received
let alerted = false;

let connection_pending = false;

// general outgoing websocket message holder
let msg = null;

// the pin assigned to the sonar trigger
// initially set to -1, an illegal value
let sonar_report_pin = -1;

// flag to indicate if the user connected to a board
let connected = false;

// arrays to hold input values
let digital_inputs = new Array(32);
let analog_inputs = new Array(8);

// flag to indicate if a websocket connect was
// ever attempted.
let connect_attempt = false;

// an array to buffer operations until socket is opened
let wait_open = [];

let the_locale = null;

// common blocks

const FormDigitalWrite = {
    'pt-br': 'Definir Pino Digital[PIN]como[ON_OFF]',
    'pt': 'Definir Pino Digital[PIN]como[ON_OFF]',
    'en': 'Write Digital Pin [PIN] [ON_OFF]'
};

const FormPwmWrite = {
    'pt-br': 'Definir Pino PWM[PIN]com[VALUE]%',
    'pt': 'Definir Pino PWM[PIN]com[VALUE]%',
    'en': 'Write PWM Pin [PIN] [VALUE]%',
};

const FormTone = {
    'pt-br': 'Definir Buzzer no Pino[PIN]com[FREQ]Hz e[DURATION]ms',
    'pt': 'Definir Buzzer no Pino[PIN]com[FREQ]Hz  e[DURATION]ms',
    'en': 'Tone Pin [PIN] [FREQ] Hz [DURATION] ms',
};

const FormServo = {
    'pt-br': 'Mover Servo Motor no[PIN]para[ANGLE]°',
    'pt': 'Mover Servo Motor no[PIN]para[ANGLE]°',
    'en': 'Write Servo Pin [PIN] [ANGLE] Deg.',
};

const FormAnalogRead = {
    'pt-br': 'Ler Pino Analógico [PIN]',
    'pt': 'Ler Pino Analógico [PIN]',
    'en': 'Read Analog Pin [PIN]',
};

const FormDigitalRead = {
    'pt-br': 'Ler Pino Digital [PIN]',
    'pt': 'Ler Pino Digital [PIN]',
    'en': 'Read Digital Pin [PIN]',
};

const FormSonarRead = {
    'pt-br': 'Ler Distância: Sonar em T[TRIGGER_PIN] E[ECHO_PIN]',
    'pt': 'Ler Distância: Sonar em T[TRIGGER_PIN] E[ECHO_PIN]',
    'en': 'Read SONAR  T [TRIGGER_PIN]  E [ECHO_PIN]'
};

// ESP-8266 specific

const FormIPBlockE = {
    'pt-br': 'Endereço IP da placa ESP-8266 [IP_ADDR]',
    'pt': 'Endereço IP da placa ESP-8266 [IP_ADDR]',
    'en': 'ESP-8266 IP Address [IP_ADDR]'
};


// Raspbery Pi Specific
const FormIPBlockR = {
    'pt-br': 'Endereço IP do RPi [IP_ADDR]',
    'pt': 'Endereço IP do RPi [IP_ADDR]',
    'en': 'Remote IP Address [IP_ADDR]'
};

// General Alert
const FormWSClosed = {
    'pt-br': "A Conexão do WebSocket está Fechada",
    'pt': "A Conexão do WebSocket está Fechada",
    'en': "WebSocket Connection Is Closed."
};

// ESP-8266 Alert
const FormAlrt = {
    'pt-br': {
        title: "Atenção",
        text: "Informe o endereço IP da placa ESP-8266 no bloco apropriado",
        icon: "info",
    },
    'pt': {
        title: "Atenção",
        text: "Informe o endereço IP da placa ESP-8266 no bloco apropriado",
        icon: "info",
    },
    'en': {
        title: "Reminder",
        text: "Enter the IP Address of the ESP-8266 Into The IP Address Block",
        icon: "info",
    }
};


class Scratch3CpxOneGPIO {
    constructor(runtime) {
        the_locale = this._setLocale();
        this.runtime = runtime;
    }

    getInfo() {
        the_locale = this._setLocale();
        // connect to the websocket server
        this.connect();

        return {
            id: 'onegpioCpx',
            color1: '#0C5986',
            color2: '#34B0F7',
            name: 'OneGpio Arduino',
            blockIconURI: 'data:image/png;base64,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',
            blocks: [
                {
                    opcode: 'digital_write',
                    blockType: BlockType.COMMAND,
                    //text: 'Write Digital Pin [PIN] [ON_OFF]',
                    text: FormDigitalWrite[the_locale],

                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '2',
                            menu: "digital_pins"
                        },
                        ON_OFF: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0',
                            menu: "on_off"
                        }
                    }
                },
                {
                    opcode: 'pwm_write',
                    blockType: BlockType.COMMAND,
                    text: FormPwmWrite[the_locale],
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '3',
                            menu: 'pwm_pins'
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '50',
                        }
                    }
                },
                '---',
                {
                    opcode: 'tone_on',
                    blockType: BlockType.COMMAND,
                    text: FormTone[the_locale],
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '2',
                            menu: 'digital_pins'
                        },
                        FREQ: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100,
                        },
                        DURATION: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 50,
                        }
                    }
                },

                '---',
                {
                    opcode: 'servo',
                    blockType: BlockType.COMMAND,
                    text: FormServo[the_locale],
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '2',
                            menu: 'digital_pins'
                        },
                        ANGLE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 90,
                        },

                    }
                },
                '---',
                {
                    opcode: 'analog_read',
                    blockType: BlockType.REPORTER,
                    text: FormAnalogRead[the_locale],
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0',
                            menu: 'analog_pins'
                        },
                    }
                },
                '---',
                {
                    opcode: 'digital_read',
                    blockType: BlockType.REPORTER,
                    text: FormDigitalRead[the_locale],
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '2',
                            menu: 'digital_pins'
                        },
                    }
                },
                '---',
                {
                    opcode: 'sonar_read',
                    blockType: BlockType.REPORTER,
                    text: FormSonarRead[the_locale],

            arguments: {
                        TRIGGER_PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '7',
                            menu: 'digital_pins'
                        },
                        ECHO_PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '8',
                            menu: 'digital_pins'
                        }
                    }
                },
            ],
            menus: {
                digital_pins: {
                    acceptReporters: true,
                    items: ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
                        '12', '13', '14', '15', '16', '17', '18', '19']
                },
                pwm_pins: {
                    acceptReporters: true,
                    items: ['3', '5', '6', '9', '10', '11']
                },
                analog_pins: {
                    acceptReporters: true,
                    items: ['0', '1', '2', '3', '4', '5']
                },

                mode: {
                    acceptReporters: true,
                    items: [{text: "Input", value: '1'}, {text: "Output", value: '2'}]
                },
                on_off: {
                    acceptReporters: true,
                    items: [{text: "0", value: 0}, {text: "1", value: 1}]
                }
            }
        };
    }

    // The block handlers

    // command blocks

    digital_write(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }

        }

        if (!connected) {
            let callbackEntry = [this.digital_write.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            let pin = args['PIN'];
            pin = parseInt(pin, 10);

            if (pin_modes[pin] !== DIGITAL_OUTPUT) {
                pin_modes[pin] = DIGITAL_OUTPUT;
                msg = {"command": "set_mode_digital_output", "pin": pin};
                msg = JSON.stringify(msg);
                window.socket.send(msg);
            }
            let value = args['ON_OFF'];
            value = parseInt(value, 10);
            msg = {"command": "digital_write", "pin": pin, "value": value};
            msg = JSON.stringify(msg);
            window.socket.send(msg);
        }
    }

    //pwm
    pwm_write(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }
        }

        if (!connected) {
            let callbackEntry = [this.pwm_write.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            let pin = args['PIN'];
            // maximum value for RPi and Arduino
            let the_max = 255;
            pin = parseInt(pin, 10);

            let value = args['VALUE'];
            value = parseInt(value, 10);

            // calculate the value based on percentage
            value = the_max * (value / 100);
            value = Math.round(value);
            if (pin_modes[pin] !== PWM) {
                pin_modes[pin] = PWM;
                msg = {"command": "set_mode_pwm", "pin": pin};
                msg = JSON.stringify(msg);
                window.socket.send(msg);
            }
            msg = {"command": "pwm_write", "pin": pin, "value": value};
            msg = JSON.stringify(msg);
            window.socket.send(msg);

        }
    }

    tone_on(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }
        }

        if (!connected) {
            let callbackEntry = [this.tone_on.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            let pin = args['PIN'];
            pin = parseInt(pin, 10);
            let freq = args['FREQ'];
            freq = parseInt(freq, 10);
            let duration = args['DURATION'];
            duration = parseInt(duration, 10);
            // make sure duration maximum is 5 seconds
            if (duration > 5000) {
                duration = 5000;
            }


            if (pin_modes[pin] !== TONE) {
                pin_modes[pin] = TONE;
                msg = {"command": "set_mode_tone", "pin": pin};
                msg = JSON.stringify(msg);
                window.socket.send(msg);
            }
            msg = {"command": "play_tone", "pin": pin, 'freq': freq, 'duration': duration};
            msg = JSON.stringify(msg);
            window.socket.send(msg);

        }
    }

    // move servo
    servo(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }
        }
        if (!connected) {
            let callbackEntry = [this.servo.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            let pin = args['PIN'];
            pin = parseInt(pin, 10);
            let angle = args['ANGLE'];
            angle = parseInt(angle, 10);


            if (pin_modes[pin] !== SERVO) {
                pin_modes[pin] = SERVO;
                msg = {"command": "set_mode_servo", "pin": pin};
                msg = JSON.stringify(msg);
                window.socket.send(msg);
            }
            msg = {
                'command': 'servo_position', "pin": pin,
                'position': angle
            };
            msg = JSON.stringify(msg);
            window.socket.send(msg);

        }
    }

    // reporter blocks
    analog_read(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }
        }
        if (!connected) {
            let callbackEntry = [this.analog_read.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            let pin = args['PIN'];
            pin = parseInt(pin, 10);

            if (pin_modes[pin] !== ANALOG_INPUT) {
                pin_modes[pin] = ANALOG_INPUT;
                msg = {"command": "set_mode_analog_input", "pin": pin};
                msg = JSON.stringify(msg);
                window.socket.send(msg);
            }
            return analog_inputs[pin];

        }
    }

    digital_read(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }
        }
        if (!connected) {
            let callbackEntry = [this.digital_read.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            let pin = args['PIN'];
            pin = parseInt(pin, 10);

            if (pin_modes[pin] !== DIGITAL_INPUT) {
                pin_modes[pin] = DIGITAL_INPUT;
                msg = {"command": "set_mode_digital_input", "pin": pin};
                msg = JSON.stringify(msg);
                window.socket.send(msg);
            }
            return digital_inputs[pin];

        }
    }

    sonar_read(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }
        }
        if (!connected) {
            let callbackEntry = [this.sonar_read.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            let trigger_pin = args['TRIGGER_PIN'];
            trigger_pin = parseInt(trigger_pin, 10);
            sonar_report_pin = trigger_pin;
            let echo_pin = args['ECHO_PIN'];
            echo_pin = parseInt(echo_pin, 10);


            if (pin_modes[trigger_pin] !== SONAR) {
                pin_modes[trigger_pin] = SONAR;
                msg = {"command": "set_mode_sonar", "trigger_pin": trigger_pin, "echo_pin": echo_pin};
                msg = JSON.stringify(msg);
                window.socketx.send(msg);
            }
            return digital_inputs[sonar_report_pin];

        }
    }

    // end of block handlers

    _setLocale () {
        let now_locale = '';
        switch (formatMessage.setup().locale){
            case 'pt-br':
                now_locale='pt-br';
                break;
            case 'en':
                now_locale='en';
                break;
            default:
                now_locale='en';
                break;
        }
        return now_locale;
    }

    // helpers
    connect() {
        if (connected) {
            // ignore additional connection attempts
            return;
        } else {
            connect_attempt = true;
            window.socketx = new WebSocket("ws://127.0.0.1:9003");
            msg = JSON.stringify({"id": "to_cpx_gateway"});
        }



        // websocket event handlers
        window.socketx.onopen = function () {

            digital_inputs.fill(0);

            analog_inputs.fill(0);
            // connection complete
            connected = true;
            connect_attempt = true;
            // the message is built above
            try {
                //ws.send(msg);
                window.socketx.send(msg);

            } catch (err) {
                // ignore this exception
            }
            for (let index = 0; index < wait_open.length; index++) {
                let data = wait_open[index];
                data[0](data[1]);
            }
        };

        window.socketx.onclose = function () {

            if (alerted === false) {
                alerted = true;
                alert(FormWSClosed[the_locale]);
            }
            connected = false;
        };

        // reporter messages from the board
        window.socketx.onmessage = function (message) {
            msg = JSON.parse(message.data);
            let report_type = msg["report"];
            let pin = null;
            let value = null;

            // types - digital, analog, sonar
            if (report_type === 'digital_input') {
                pin = msg['pin'];
                pin = parseInt(pin, 10);
                value = msg['value'];
                digital_inputs[pin] = value;
            } else if (report_type === 'analog_input') {
                pin = msg['pin'];
                pin = parseInt(pin, 10);
                value = msg['value'];
                analog_inputs[pin] = value;
            } else if (report_type === 'sonar_data') {
                value = msg['value'];
                digital_inputs[sonar_report_pin] = value;
            }
        };
    }


}

module.exports = Scratch3CpxOneGPIO;
