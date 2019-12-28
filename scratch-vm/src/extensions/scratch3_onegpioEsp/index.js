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

// The following are constants used within the extension

// Digital Modes
const DIGITAL_INPUT = 1;
const DIGITAL_OUTPUT = 2;
const PWM = 3;
const SERVO = 4;
const TONE = 5;
const SONAR = 6;
const ANALOG_INPUT = 7;


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

// common

const FormDigitalWrite = {
    'pt-br': 'Definir Pino Digital[PIN]como[ON_OFF]',
    'pt': 'Definir Pino Digital[PIN]como[ON_OFF]',
    'en': 'Write Digital Pin [PIN] [ON_OFF]',
    'fr': 'Mettre la pin numérique[PIN]à[ON_OFF]',
    'zh-tw': '腳位[PIN]數位輸出[ON_OFF]',
    'zh-cn': '脚位[PIN]数位输出[ON_OFF]',
};

const FormPwmWrite = {
    'pt-br': 'Definir Pino PWM[PIN]com[VALUE]%',
    'pt': 'Definir Pino PWM[PIN]com[VALUE]%',
    'en': 'Write PWM Pin [PIN] [VALUE]%',
    'fr': 'Mettre la pin PWM[PIN]à[VALUE]%',
    'zh-tw': '腳位[PIN]類比輸出[VALUE]%',
    'zh-cn': '脚位[PIN]类比输出[VALUE]%',
};

const FormTone = {
    'pt-br': 'Definir Buzzer no Pino[PIN]com[FREQ]Hz e[DURATION]ms',
    'pt': 'Definir Buzzer no Pino[PIN]com[FREQ]Hz  e[DURATION]ms',
    'en': 'Tone Pin [PIN] [FREQ] Hz [DURATION] ms',
    'fr': 'Définir le buzzer sur la pin[PIN]à[FREQ]Hz pendant[DURATION] ms',
    'zh-tw': '腳位[PIN]播放音調，頻率為[FREQ]時間為[DURATION]',
    'zh-cn': '脚位[PIN]播放音调，频率为[FREQ]时间为[DURATION]',
};

const FormServo = {
    'pt-br': 'Mover Servo Motor no[PIN]para[ANGLE]°',
    'pt': 'Mover Servo Motor no[PIN]para[ANGLE]°',
    'en': 'Write Servo Pin [PIN] [ANGLE] Deg.',
    'fr': 'Mettre le servo[PIN]à[ANGLE] Deg.',
    'zh-tw': '伺服馬達腳位[PIN]轉動角度到[ANGLE]度',
    'zh-cn': '伺服马达脚位[PIN]转动角度到[ANGLE]度',

};

const FormAnalogRead = {
    'pt-br': 'Ler Pino Analógico [PIN]',
    'pt': 'Ler Pino Analógico [PIN]',
    'en': 'Read Analog Pin [PIN]',
    'fr': 'Lecture analogique [PIN]',
    'zh-tw': '讀取類比腳位[PIN]',
    'zh-cn': '读取类比脚位[PIN]',

};

const FormDigitalRead = {
    'pt-br': 'Ler Pino Digital [PIN]',
    'pt': 'Ler Pino Digital [PIN]',
    'en': 'Read Digital Pin [PIN]',
    'fr': 'Lecture numérique [PIN]',
    'zh-tw': '讀取數位腳位[PIN]',
    'zh-cn': '读取数位脚位[PIN]',
};

const FormSonarRead = {
    'pt-br': 'Ler Distância: Sonar em T[TRIGGER_PIN] E[ECHO_PIN]',
    'pt': 'Ler Distância: Sonar em T[TRIGGER_PIN] E[ECHO_PIN]',
    'en': 'Read SONAR  T [TRIGGER_PIN]  E [ECHO_PIN]',
    'fr': 'Distance de lecture : Sonar T [TRIGGER_PIN] E [ECHO_PIN]',
    'zh-tw': 'HCSR超音波感測器，Echo在腳位[ECHO_PIN]Trig在腳位[TRIGGER_PIN]',
    'zh-cn': 'HCSR超音波感测器，Echo在脚位[ECHO_PIN]Trig在脚位[TRIGGER_PIN]',
};

// ESP-8266 specific

const FormIPBlockE = {
    'pt-br': 'Endereço IP da placa ESP-8266 [IP_ADDR]',
    'pt': 'Endereço IP da placa ESP-8266 [IP_ADDR]',
    'en': 'ESP-8266 IP Address [IP_ADDR]',
    'fr': "Adresse IP de l'ESP-8266 [IP_ADDR]",
    'zh-tw': 'ESP-8266 IP 位址[IP_ADDR]',
    'zh-cn': 'ESP-8266 IP 地址[IP_ADDR]',
};


// Raspbery Pi Specific
const FormIPBlockR = {
    'pt-br': 'Endereço IP do RPi [IP_ADDR]',
    'pt': 'Endereço IP do RPi [IP_ADDR]',
    'en': 'Remote IP Address [IP_ADDR]',
    'fr': 'Adresse IP du RPi [IP_ADDR]',
    'zh-tw': '遠端 IP 位址[IP_ADDR]',
    'zh-cn': '远程 IP 地址[IP_ADDR]',
};

// General Alert
const FormWSClosed = {
    'pt-br': "A Conexão do WebSocket está Fechada",
    'pt': "A Conexão do WebSocket está Fechada",
    'en': "WebSocket Connection Is Closed.",
    'fr': "La connexion WebSocket est fermée.",
    'zh-tw': "網路連線中斷",
    'zh-cn': "网絡连线中断",
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
    },
    'fr': {
        title: "Attention",
        text: "Entrez l'adresse IP de l'ESP-8266 dans le bloc approprié.",
        icon: "info",
    },
    'zh-tw': {
        title: "提醒",
        text: "請於 IP 位址積木中輸入 ESP-8266 的 IP 位址",
        icon: "資訊",
    },
    'zh-cn': {
        title: "提醒",
        text: "请于 IP 位址积木中输入 ESP-8266 的 IP 地址",
        icon: "资讯",
    },
};

class Scratch3EspOneGPIO {
    constructor(runtime) {
        the_locale = this._setLocale();
        this.runtime = runtime;
    }

    getInfo() {
        the_locale = this._setLocale();
        this.connect();
        swal(FormAlrt[the_locale]);

        return {
            id: 'onegpioEsp',
            color1: '#0C5986',
            color2: '#34B0F7',
            name: 'OneGpio ESP-8266',
            blockIconURI: 'data:image/png;base64,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',
            blocks: [
                {
                    opcode: 'ip_address',
                    blockType: BlockType.COMMAND,
                    //text: 'Write Digital Pin [PIN] [ON_OFF]',
                    text: FormIPBlockE[the_locale],

                    arguments: {
                        IP_ADDR: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '',
                            //menu: "digital_pins"
                        },

                    }
                },
                {
                    opcode: 'digital_write',
                    blockType: BlockType.COMMAND,
                    text: FormDigitalWrite[the_locale],

                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '4',
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
                            defaultValue: '4',
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
                            defaultValue: '4',
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
                            defaultValue: '4',
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
                            defaultValue: '0'
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
                            defaultValue: '4',
                            menu: 'digital_pins'
                        },
                        ECHO_PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '5',
                            menu: 'digital_pins'
                        }
                    }
                },
            ],
            menus: {
                digital_pins: {
                    acceptReporters: true,
                    items: ['4', '5', '12', '13', '14', '15']
                },
                pwm_pins: {
                    acceptReporters: true,
                    items: ['4', '5', '12', '13', '14', '15']
                },

                mode: {
                    acceptReporters: true,
                    items: [{text: "Input", value: '1'}, {text: "Output", value: '2'}]
                },
                on_off: {
                    acceptReporters: true,
                    items: ['0', '1']
                }
            }
        };
    }

    // The block handlers

    // command blocks

    ip_address(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }
        }
        if (!connected) {
            let callbackEntry = [this.ip_address.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            msg = {"command": "ip_address", "address": args['IP_ADDR']};
            msg = JSON.stringify(msg);
            window.sockete.send(msg);
        }
    }

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
                window.sockete.send(msg);
            }
            let value = args['ON_OFF'];
            value = parseInt(value, 10);
            msg = {"command": "digital_write", "pin": pin, "value": value};
            msg = JSON.stringify(msg);
            window.sockete.send(msg);
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
                window.sockete.send(msg);
            }
            msg = {"command": "pwm_write", "pin": pin, "value": value};
            msg = JSON.stringify(msg);
            window.sockete.send(msg);

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
                window.sockete.send(msg);
            }
            msg = {"command": "play_tone", "pin": pin, 'freq': freq, 'duration': duration};
            msg = JSON.stringify(msg);
            window.sockete.send(msg);

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
                window.sockete.send(msg);
            }
            msg = {
                'command': 'servo_position', "pin": pin,
                'position': angle
            };
            msg = JSON.stringify(msg);
            window.sockete.send(msg);

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
            let pin = 0;

            if (pin_modes[pin] !== ANALOG_INPUT) {
                pin_modes[pin] = ANALOG_INPUT;
                msg = {"command": "set_mode_analog_input", "pin": pin};
                msg = JSON.stringify(msg);
                window.sockete.send(msg);
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
                window.sockete.send(msg);
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
                window.sockete.send(msg);
            }
            return digital_inputs[sonar_report_pin];

        }
    }

    _setLocale () {
        let now_locale = '';
        switch (formatMessage.setup().locale){
            case 'pt-br':
            case 'pt':
                now_locale='pt-br';
                break;
            case 'en':
                now_locale='en';
                break;
            case 'fr':
                now_locale='fr';
                break;
            case 'zh-tw':
                now_locale= 'zh-tw';
                break;
            case 'zh-cn':
                now_locale= 'zh-cn';
                break;
            default:
                now_locale='en';
                break;
        }
        return now_locale;
    }

    // end of block handlers

    // helpers
    connect() {
        if (connected) {
            // ignore additional connection attempts
            return;
        } else {
            connect_attempt = true;
            window.sockete = new WebSocket("ws://127.0.0.1:9002");
            msg = JSON.stringify({"id": "to_esp8266_gateway"});
        }


        // websocket event handlers
        window.sockete.onopen = function () {

            digital_inputs.fill(1);
            analog_inputs.fill(0);
            // connection complete
            connected = true;
            connect_attempt = true;
            // the message is built above
            try {
                //ws.send(msg);
                window.sockete.send(msg);

            } catch (err) {
                // ignore this exception
            }
            for (let index = 0; index < wait_open.length; index++) {
                let data = wait_open[index];
                data[0](data[1]);
            }
        };

        window.sockete.onclose = function () {
            digital_inputs.fill(1);
            analog_inputs.fill(0);
            sonar_report_pin = -1;
            pin_modes.fill(-1);

            if (alerted === false) {
                alerted = true;
                alert(FormWSClosed[the_locale]);
            }
            connected = false;
        };

        // reporter messages from the board
        window.sockete.onmessage = function (message) {
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

module.exports = Scratch3EspOneGPIO;
