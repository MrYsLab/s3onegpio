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

let ws_ip_address = '127.0.0.1';

// common
const FormDigitalWrite = {
    'pt-br': 'Escrever Pino Digital [PIN]como[ON_OFF]',
    'pt': 'Escrever Pino Digital[PIN]como[ON_OFF]',
    'en': 'Write Digital Pin [PIN] [ON_OFF]',
    'fr': 'Mettre la pin numérique[PIN]à[ON_OFF]',
    'zh-tw': '腳位[PIN]數位輸出[ON_OFF]',
    'zh-cn': '引脚[PIN]数字输出[ON_OFF]',
    'pl': 'Ustaw cyfrowy Pin [PIN] na [ON_OFF]',
    'de': 'Setze digitalen Pin [PIN] [ON_OFF]',
    'ja': 'デジタル・ピン [PIN] に [ON_OFF] を出力',
};

const FormPwmWrite = {
    'pt-br': 'Escrever Pino PWM[PIN]com[VALUE]%',
    'pt': 'Escrever Pino PWM[PIN]com[VALUE]%',
    'en': 'Write PWM Pin [PIN] [VALUE]%',
    'fr': 'Mettre la pin PWM[PIN]à[VALUE]%',
    'zh-tw': '腳位[PIN]類比輸出[VALUE]%',
    'zh-cn': '引脚[PIN]模拟输出[VALUE]%',
    'pl': 'Ustaw PWM Pin [PIN] na [VALUE]%',
    'de': 'Setze PWM-Pin [PIN] [VALUE]%',
    'ja': 'PWM ピン [PIN] に [VALUE]% を出力',
};

const FormTone = {
    'pt-br': 'Soar no Pino[PIN]com[FREQ]Hz e[DURATION]ms',
    'pt': 'Soar no Pino[PIN]com[FREQ]Hz  e[DURATION]ms',
    'en': 'Tone Pin [PIN] [FREQ] Hz [DURATION] ms',
    'fr': 'Définir le buzzer sur la pin[PIN]à[FREQ]Hz pendant[DURATION] ms',
    'zh-tw': '腳位[PIN]播放音調，頻率為[FREQ]赫茲 時間為[DURATION]毫秒',
    'zh-cn': '引脚[PIN]播放音调，频率为[FREQ]赫兹 时间为[DURATION]毫秒',
    'pl': 'Ustaw brzęczyk na Pinie [PIN] na [FREQ] Hz i [DURATION] ms%',
    'de': 'Spiele Ton am Pin [PIN] [FREQ] Hz [DURATION] ms',
    'ja': '音調ピン [PIN] を [FREQ] Hz [DURATION] ms に',
};

const FormServo = {
    'pt-br': 'Mover Servo Motor no[PIN]para[ANGLE]°',
    'pt': 'Mover Servo Motor no[PIN]para[ANGLE]°',
    'en': 'Write Servo Pin [PIN] [ANGLE] Deg.',
    'fr': 'Mettre le servo[PIN]à[ANGLE] Deg.',
    'zh-tw': '伺服馬達腳位[PIN]轉動角度到[ANGLE]度',
    'zh-cn': '伺服马达脚位[PIN]转动角度到[ANGLE]度',
    'pl': 'Ustaw silnik servo na Pinie [PIN] na [ANGLE]°',
    'de': 'Setze Servo-Pin [PIN] [ANGLE]°',
    'ja': 'サーボ・ピン [PIN] に [ANGLE] 度を出力',
};

const FormAnalogRead = {
    'pt-br': 'Ler Pino Analógico [PIN]',
    'pt': 'Ler Pino Analógico [PIN]',
    'en': 'Read Analog Pin [PIN]',
    'fr': 'Lecture analogique [PIN]',
    'zh-tw': '讀取類比腳位[PIN]',
    'zh-cn': '读取类比脚位[PIN]',
    'pl': 'Odczytaj analogowy Pin [PIN]',
    'de': 'Lies analogen Pin [PIN]',
    'ja': 'アナログ・ピン [PIN] から入力',
};

const FormDigitalRead = {
    'pt-br': 'Ler Pino Digital [PIN]',
    'pt': 'Ler Pino Digital [PIN]',
    'en': 'Read Digital Pin [PIN]',
    'fr': 'Lecture numérique [PIN]',
    'zh-tw': '讀取數位腳位[PIN]',
    'zh-cn': '读取数位脚位[PIN]',
    'pl': 'Odczytaj cyfrowy Pin [PIN]',
    'de': 'Lies digitalen Pin [PIN]',
    'ja': 'デジタル・ピン [PIN] から入力',
};

const FormSonarRead = {
    'pt-br': 'Ler Distância: Sonar em T[TRIGGER_PIN] E[ECHO_PIN]',
    'pt': 'Ler Distância: Sonar em T[TRIGGER_PIN] E[ECHO_PIN]',
    'en': 'Read SONAR  T [TRIGGER_PIN]  E [ECHO_PIN]',
    'fr': 'Distance de lecture : Sonar T [TRIGGER_PIN] E [ECHO_PIN]',
    'zh-tw': 'HCSR超音波感測器，Echo在腳位[ECHO_PIN] Trig在腳位[TRIGGER_PIN]',
    'zh-cn': 'HCSR超声波传感器，Echo在引脚[ECHO_PIN] Trig在引脚[TRIGGER_PIN]',
    'pl': 'Odczytaj odległość: Sonar T [TRIGGER_PIN]  E [ECHO_PIN]',
    'de': 'Lies Sonar T [TRIGGER_PIN]  E [ECHO_PIN]',
    'ja': '超音波測距器からトリガ [TRIGGER_PIN] とエコー [ECHO_PIN] で入力',
};

// ESP-8266 specific

const FormIPBlockE = {
    'pt-br': 'Endereço IP da placa ESP-8266 [IP_ADDR]',
    'pt': 'Endereço IP da placa ESP-8266 [IP_ADDR]',
    'en': 'ESP-8266 IP Address [IP_ADDR]',
    'fr': "Adresse IP de l'ESP-8266 [IP_ADDR]",
    'zh-tw': 'ESP-8266 IP 位址[IP_ADDR]',
    'zh-cn': 'ESP-8266 IP 地址[IP_ADDR]',
    'pl': 'Adres IP ESP-8266 [IP_ADDR]',
    'de': 'ESP-8266 IP-Adresse [IP_ADDR]',
    'ja': 'ESP-8266 の IP アドレスを [IP_ADDR] に',
};

// Raspbery Pi Specific
const FormIPBlockR = {
    'pt-br': 'Endereço IP do RPi [IP_ADDR]',
    'pt': 'Endereço IP do RPi [IP_ADDR]',
    'en': 'Remote IP Address [IP_ADDR]',
    'fr': 'Adresse IP du RPi [IP_ADDR]',
    'zh-tw': '遠端 IP 位址[IP_ADDR]',
    'zh-cn': '远程 IP 地址[IP_ADDR]',
    'pl': 'Adres IP Rasberry Pi [IP_ADDR]',
    'de': 'IP-Adresse des RPi [IP_ADDR]',
    'ja': 'ラズパイの IP アドレスを [IP_ADDR] に',
};

// General Alert
const FormWSClosed = {
    'pt-br': "A Conexão do WebSocket está Fechada",
    'pt': "A Conexão do WebSocket está Fechada",
    'en': "WebSocket Connection Is Closed.",
    'fr': "La connexion WebSocket est fermée.",
    'zh-tw': "網路連線中斷",
    'zh-cn': "网络连接中断",
    'pl': "Połączenie WebSocket jest zamknięte.",
    'de': "WebSocket-Verbindung geschlossen.",
    'ja': "ウェブソケット接続が切断されています",
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
        icon: "info",
    },
    'zh-cn': {
        title: "提醒",
        text: "请于 IP 地址积木中输入 ESP-8266 的 IP 地址",
        icon: "info",
    },
    'pl': {
        title: "Przypomnienie",
        text: "Wprowadź adres IP ESP-8266 do bloku adresu IP",
        icon: "info",
    },
    'de': {
        title: "Wichtig",
        text: "Trage die IP-Adresse des ESP-8266 im Blcok IP-Adresse ein",
        icon: "info",
    },
    'ja': {
        title: "注意",
        text: "ESP-8266 の IP アドレスを IP アドレス・ブロックに記入して下さい",
        icon: "info",
    },
};

class Scratch3RpiOneGPIO {
    constructor(runtime) {
        the_locale = this._setLocale();
        this.runtime = runtime;
    }

    getInfo() {
        the_locale = this._setLocale();
        //this.connect();

        return {
            id: 'onegpioRpi',
            color1: '#0C5986',
            color2: '#34B0F7',
            name: 'OneGpio Raspberry Pi',
            blockIconURI: 'data:image/png;base64,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AIwg+ABgBMEHACMIPgAYQfABwAiCDwBGEHwAMILgA4ARBB8AjCD4AGAEwQcAIwg+ABhB8AHACIIPAEYQfAAwguADgBEEHwCMIPgAYATBBwAjCD4AGEHwAcAIgg8ARhB8ADCC4AOAEQQfAIwg+ABgBMEHACMIPgAYQfABwAiCDwBGEHwAMILgA4ARBB8AjCD4AGAEwQcAIwg+ABhB8AHACIIPAEYQfAAwguADgBEEHwCMIPgAYATBBwAjCD4AGEHwAcAIgg8ARhB8ADCC4AOAEQQfAIwg+ABgBMEHACMIPgAYQfABwAiCDwBGEHwAMILgA4ARBB8AjCD4AGAEwQcAIwg+ABhB8AHACIIPAEYQfAAwguADgBEEHwCMIPgAYATBBwAjCD4AGEHwAcAIgg8ARhB8ADCC4AOAEQQfAIwg+ABgBMEHACMIPgAYQfABwAiCDwBGEHwAMILgA4ARBB8AjCD4AGAEwQcAIwg+ABhB8AHACIIPAEYQfAAwguADgBEEHwCMIPgAYATBBwAjCD4AGEHwAcAIgg8ARhB8ADCC4AOAEQQfAIwg+ABgBMEHACMIPgAYQfABwAiCDwBGEHwAMILgA4ARBB8AjCD4AGAEwQcAIwg+ABhB8AHACIIPAEYQfAAwguADgBEEHwCMIPgAYATBBwAjCD4AGEHwAcAIgg8ARhB8ADCC4AOAEQQfAIwg+ABgBMEHACMIPgAYQfABwAiCDwBGEHwAMILgA4ARBB8AjCD4AGAEwQcAIwg+ABhB8AHACIIPAEYQfAAwguADgBEEHwCMIPgAYATBBwAjCD4AGEHwAcAIgg8ARhB8ADDiH0kHZ+HRDpA+AAAAAElFTkSuQmCC',
            blocks: [
                {
                    opcode: 'ip_address',
                    blockType: BlockType.COMMAND,
                    //text: 'Write Digital Pin [PIN] [ON_OFF]',
                    text: FormIPBlockR[the_locale],

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
                    opcode: 'digital_read',
                    blockType: BlockType.REPORTER,
                    text: FormDigitalRead[the_locale],
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '4',
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
                    items: ['2', '3', '4', '5', '6', '7', '8', '9',
                        '10', '11', '12', '13', '14', '15', '16',
                        '17', '18', '19', '20',
                        '21', '22', '23', '24', '25', '26', '27']
                },
                pwm_pins: {
                    acceptReporters: true,
                    items: ['2', '3', '4', '5', '6', '7', '8', '9',
                        '10', '11', '12', '13', '14', '15', '16',
                        '17', '18', '19', '20',
                        '21', '22', '23', '24', '25', '26', '27']
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
        if (args['IP_ADDR']) {
            ws_ip_address = args['IP_ADDR'];
            if (!connected) {
                if (!connection_pending) {
                    this.connect();
                    connection_pending = true;
                }
            }

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
                window.socketr.send(msg);
            }
            let value = args['ON_OFF'];
            value = parseInt(value, 10);
            msg = {"command": "digital_write", "pin": pin, "value": value};
            msg = JSON.stringify(msg);
            window.socketr.send(msg);
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
                window.socketr.send(msg);
            }
            msg = {"command": "pwm_write", "pin": pin, "value": value};
            msg = JSON.stringify(msg);
            window.socketr.send(msg);

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
                window.socketr.send(msg);
            }
            msg = {"command": "play_tone", "pin": pin, 'freq': freq, 'duration': duration};
            msg = JSON.stringify(msg);
            window.socketr.send(msg);

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
                window.socketr.send(msg);
            }
            msg = {
                'command': 'servo_position', "pin": pin,
                'position': angle
            };
            msg = JSON.stringify(msg);
            window.socketr.send(msg);

        }
    }

    // reporter blocks


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
                window.socketr.send(msg);
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
                window.socketr.send(msg);
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
            case 'pl':
                now_locale='pl';
                break;
            case 'ja':
                now_locale='ja';
                break;
            case 'de':
                now_locale= 'de';
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
            let url = "ws://" + ws_ip_address + ":9001";
            console.log(url);
            //window.socketr = new WebSocket("ws://127.0.0.1:9001");
            window.socketr = new WebSocket(url);
            msg = JSON.stringify({"id": "to_rpi_gateway"});
        }


        // websocket event handlers
        window.socketr.onopen = function () {

            digital_inputs.fill(0);
            analog_inputs.fill(0);
            // connection complete
            connected = true;
            connect_attempt = true;
            // the message is built above
            try {
                //ws.send(msg);
                window.socketr.send(msg);

            } catch (err) {
                // ignore this exception
            }
            for (let index = 0; index < wait_open.length; index++) {
                let data = wait_open[index];
                data[0](data[1]);
            }
        };

        window.socketr.onclose = function () {
            digital_inputs.fill(0);
            analog_inputs.fill(0);
            pin_modes.fill(-1);
            if (alerted === false) {
                alerted = true;
                alert(FormWSClosed[the_locale]);}
            connected = false;
        };

        // reporter messages from the board
        window.socketr.onmessage = function (message) {
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

module.exports = Scratch3RpiOneGPIO;
