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
const TOUCH_INPUT = 5;
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
    'pt-br': 'Escrever Pino Digital [PIN]como[ON_OFF]',
    'pt': 'Escrever Pino Digital[PIN]como[ON_OFF]',
    'en': 'Write Digital Pin [PIN] [ON_OFF]',
    'fr': 'Mettre la pin numérique[PIN]à[ON_OFF]',
    'zh-tw': '腳位[PIN]數位輸出[ON_OFF]',
    'zh-cn': '引脚[PIN]数字输出[ON_OFF]',
    'pl': 'Ustaw cyfrowy Pin [PIN] na [ON_OFF]',
    'de': 'Setze digitalen Pin [PIN] [ON_OFF]',
    'ja': 'デジタル・ピン [PIN] に [ON_OFF] を出力',
    'nl': 'Schrijf Digitale Pin [PIN] [ON_OFF]',
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
    'nl': 'Schrijf PWM Pin [PIN] [VALUE]%',
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
    'nl': 'Zet toon van pin [PIN] op [FREQ] Hz voor [DURATION] ms',
};

const FormServo = {
    'pt-br': 'Mover Servo Motor no[PIN]para[ANGLE]°',
    'pt': 'Mover Servo Motor no[PIN]para[ANGLE]°',
    'en': 'Write Servo Pin [PIN] [ANGLE] Deg.',
    'fr': 'Mettre le servo[PIN]à[ANGLE] Deg.',
    'zh-tw': '伺服馬達腳位[PIN]轉動角度到[ANGLE]度',
    'zh-cn': '伺服电机引脚[PIN]转动角度到[ANGLE]度',
    'pl': 'Ustaw silnik servo na Pinie [PIN] na [ANGLE]°',
    'de': 'Setze Servo-Pin [PIN] [ANGLE]°',
    'ja': 'サーボ・ピン [PIN] に [ANGLE] 度を出力',
    'nl': 'Schrijf Servo Pin [PIN] [ANGLE]° graden',
};

const FormAnalogRead = {
    'pt-br': 'Ler Pino Analógico [PIN]',
    'pt': 'Ler Pino Analógico [PIN]',
    'en': 'Read Analog Pin [PIN]',
    'fr': 'Lecture analogique [PIN]',
    'zh-tw': '讀取類比腳位[PIN]',
    'zh-cn': '读取模拟引脚[PIN]',
    'pl': 'Odczytaj analogowy Pin [PIN]',
    'de': 'Lies analogen Pin [PIN]',
    'ja': 'アナログ・ピン [PIN] から入力',
    'nl': 'Lees Analoge Pin [PIN]',
};

const FormDigitalRead = {
    'pt-br': 'Ler Pino Digital [PIN]',
    'pt': 'Ler Pino Digital [PIN]',
    'en': 'Read Digital Pin [PIN]',
    'fr': 'Lecture numérique [PIN]',
    'zh-tw': '讀取數位腳位[PIN]',
    'zh-cn': '读取数字引脚[PIN]',
    'pl': 'Odczytaj cyfrowy Pin [PIN]',
    'de': 'Lies digitalen Pin [PIN]',
    'ja': 'デジタル・ピン [PIN] から入力',
    'nl': 'Lees Digitale Pin [PIN]',
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
    'nl': 'Lees SONAR T [TRIGGER_PIN] E [ECHO_IPN]',
};

// ESP32 specific

const FormIPBlockE = {
    'pt-br': 'Endereço IP da placa ESP-32 [IP_ADDR]',
    'pt': 'Endereço IP da placa ESP-32 [IP_ADDR]',
    'en': 'ESP-32 IP Address [IP_ADDR]',
    'fr': "Adresse IP de l'ESP-32 [IP_ADDR]",
    'zh-tw': 'ESP-32 IP 位址[IP_ADDR]',
    'zh-cn': 'ESP-32 IP 地址[IP_ADDR]',
    'pl': 'Adres IP ESP-32 [IP_ADDR]',
    'de': 'ESP-32 IP-Adresse [IP_ADDR]',
    'ja': 'ESP-32 の IP アドレスを [IP_ADDR] に',
    'nl': 'ESP-32 IP Adres [IP_ADDR]',
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
    'nl': 'Adres IP Rasberry Pi [IP_ADDR]',
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
    'nl': 'WebSocket Connectie is gesloten.',
};

// ESP-32 Alert
const FormAlrt = {
    'pt-br': {
        title: "Atenção",
        text: "Informe o endereço IP da placa ESP-32 no bloco apropriado",
        icon: "info",
    },
    'pt': {
        title: "Atenção",
        text: "Informe o endereço IP da placa ESP-32 no bloco apropriado",
        icon: "info",
    },
    'en': {
        title: "Reminder",
        text: "Enter the IP Address of the ESP-32 Into The IP Address Block",
        icon: "info",
    },
    'fr': {
        title: "Attention",
        text: "Entrez l'adresse IP de l'ESP-32 dans le bloc approprié.",
        icon: "info",
    },
    'zh-tw': {
        title: "提醒",
        text: "請於 IP 位址積木中輸入 ESP-32 的 IP 位址",
        icon: "info",
    },
    'zh-cn': {
        title: "提醒",
        text: "请于 IP地址积木中输入 ESP-32 的 IP 地址",
        icon: "info",
    },
    'pl': {
        title: "Przypomnienie",
        text: "Wprowadź adres IP ESP-32 do bloku adresu IP",
        icon: "info",
    },
    'de': {
        title: "Wichtig",
        text: "Trage die IP-Adresse des ESP-32 im Blcok IP-Adresse ein",
        icon: "info",
    },
    'ja': {
        title: "注意",
        text: "ESP-32 の IP アドレスを IP アドレス・ブロックに記入して下さい",
        icon: "info",
    },
    'nl': {
        title: "Attentie",
        text: "Geef het IP adres van de ESP-32 in het IP Adres Blok",
        icon: "info",
    },
};
class Scratch3Esp32OneGPIO {
    constructor(runtime) {
        the_locale = this._setLocale();
        this.runtime = runtime;
    }

    getInfo() {
        the_locale = this._setLocale();
        this.connect();
        swal(FormAlrt[the_locale]);

        return {
            id: 'onegpioEsp32',
            color1: '#0C5986',
            color2: '#34B0F7',
            name: 'OneGpio ESP32',
            blockIconURI: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAATEAAAEwCAYAAADfOUbNAAAABHNCSVQICAgIfAhkiAAAABl0RVh0U29mdHdhcmUAZ25vbWUtc2NyZWVuc2hvdO8Dvz4AAAAtdEVYdENyZWF0aW9uIFRpbWUAVHVlIDE5IE1hciAyMDI0IDA0OjQwOjEzIFBNIEVEVIAc5LYAABUASURBVHic7d15YFTlvYfx75mZhKwQGLYkbAkgGGRfIqAWKC64sClqa2uv4HLRorTuXpcWsG63tFet1aLY1uJOBSrKUmipIogg+yYYlCUEIwFJAkkmmXP/qHVBSM6wJPNjns9/QDJzQmaeec97znuO47quKwAwKiBJ4apKzf/bIoWq6BmA6JbUuLG69zhdDVPrSfoyYvuLinXvWwVqvn9rnW4cANSkIK2dRu9zNHZ4V0lfRsyVq7jKMg1cO7VONw4AalI88k6Fw1/vNfrqcFsA4LgRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEAphExAKYRMQCmETEApgXqegOAWOdLCiolPV0pjRsqPiFBgYCjcKhclWXFKttbqNI9BSotCdX1ZkYtInZECWpwzuXq2Dkon1P9V4a3ztYHcz5S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',
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
                            defaultValue: '32',
                            menu: 'analog_input_pins'
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
                    items: ['4', '5', '12', '13', '14', '16', '17',
                        '18', '19', '21', '22', '23', '25', '26', '27', '32', '33']
                },
                pwm_pins: {
                    acceptReporters: true,
                    items: ['2', '4', '5', '12', '13', '14', '16', '17', '18', '19',
                        '21', '22', '23', '25', '26', '27', '32', '33']
                },
                analog_input_pins: {
                    acceptReporters: true,
                    items: ['32', '33', '34', '35', '36', '39']
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
            case 'pl':
                now_locale= 'pl';
                break;
            case 'ja':
                now_locale= 'ja';
                break;
            case 'de':
                now_locale= 'de';
                break;
            case 'nl':
                now_locale= 'nl';
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
            window.sockete = new WebSocket("ws://127.0.0.1:9007");
            msg = JSON.stringify({"id": "to_esp8232_gateway"});
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

module.exports = Scratch3Esp32OneGPIO;
