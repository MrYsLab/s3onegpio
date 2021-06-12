/*
This is the Scratch 3 extension to remotely control
a RoboHAT MM1


 Copyright (c) 2020 Alan Yorinks All rights reserved.

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


// The following are constants used within the extension

// Digital Modes
const DIGITAL_INPUT = 1;
const DIGITAL_OUTPUT = 2;
const PWM = 3;
const SERVO = 4;
const SONAR = 6;
const ANALOG_INPUT = 7;

require('sweetalert');

// an array to save the current pin mode
// this is common to all board types since it contains enough
// entries for all the boards.
// Modes are listed above - initialize to invalid mode of -1
let pin_modes = new Array(30).fill(-1);

// has an websocket message already been received
let alerted = false;

// flag to only initialize mpu once
let mpu_initialized = false;

// mpu returned from the RoboHAT
let mpu_data = {};

// flag to only initialize ina once
let ina_initialized = false;

// data to hold reported ina values
let ina_data = {'V':0, 'A':0,
                 'Supply':0, 'Shunt':0,
                 'Power':0
};

// flag to indicate if connection is complete or not
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
    'pt-br': 'Escrever Pino Digital[PIN]como[ON_OFF]',
    'pt': 'Escrever Pino Digital[PIN]como[ON_OFF]',
    'en': 'Write Digital Pin [PIN] [ON_OFF]',
    'fr': 'Mettre la pin numérique[PIN]à[ON_OFF]',
    'zh-tw': '腳位[PIN]數位輸出[ON_OFF]',
    'zh-cn': '引脚[PIN]数字输出[ON_OFF]',
    'pl': 'Ustaw cyfrowy Pin [PIN] na [ON_OFF]',
    'ja': 'デジタル・ピン [PIN] に [ON_OFF] を出力',
};

const FormIPBlockR = {
    'pt-br': 'Endereço IP do RPi [IP_ADDR]',
    'pt': 'Endereço IP do RPi [IP_ADDR]',
    'en': 'Remote IP Address [IP_ADDR]',
    'fr': 'Adresse IP du RPi [IP_ADDR]',
    'zh-tw': '遠端 IP 位址[IP_ADDR]',
    'zh-cn': '远程 IP 地址[IP_ADDR]',
    'pl': 'Adres IP Rasberry Pi [IP_ADDR]',
    'ja': 'Robo HAT の IP アドレスを [IP_ADDR] に',
};

const FormPwmWrite = {
    'pt-br': 'Escrever Pino PWM[PIN]com[VALUE]%',
    'pt': 'Escrever Pino PWM[PIN]com[VALUE]%',
    'en': 'Write PWM Pin [PIN] [VALUE]%',
    'fr': 'Mettre la pin PWM[PIN]à[VALUE]%',
    'zh-tw': '腳位[PIN]類比輸出[VALUE]%',
    'zh-cn': '引脚[PIN]模拟输出[VALUE]%',
    'pl': 'Ustaw PWM Pin [PIN] na [VALUE]%',
    'ja': 'PWM ピン [PIN] に [VALUE]% を出力',
};

const FormServo = {
    'pt-br': 'Mover Servo Motor no[PIN]para[ANGLE]°',
    'pt': 'Mover Servo Motor no[PIN]para[ANGLE]°',
    'en': 'Write Servo Pin [PIN] [ANGLE] Deg.',
    'fr': 'Mettre le servo[PIN]à[ANGLE] Deg.',
    'zh-tw': '伺服馬達腳位[PIN]轉動角度到[ANGLE]度',
    'zh-cn': '伺服电机引脚[PIN]转动角度到[ANGLE]度',
    'pl': 'Ustaw silnik servo na Pinie [PIN] na [ANGLE]°',
    'ja': 'サーボ・ピン [PIN] に [ANGLE] 度を出力',
};

const FormAnalogRead = {
    'pt-br': 'Ler Pino Analógico [PIN]',
    'pt': 'Ler Pino Analógico [PIN]',
    'en': 'Read Analog Pin [PIN]',
    'fr': 'Lecture analogique [PIN]',
    'zh-tw': '讀取類比腳位[PIN]',
    'zh-cn': '读取模拟引脚[PIN]',
    'pl': 'Odczytaj analogowy Pin [PIN]',
    'ja': 'アナログ・ピン [PIN] から入力',
};

const FormDigitalRead = {
    'pt-br': 'Ler Pino Digital [PIN]',
    'pt': 'Ler Pino Digital [PIN]',
    'en': 'Read Digital Pin [PIN]',
    'fr': 'Lecture numérique [PIN]',
    'zh-tw': '讀取數位腳位[PIN]',
    'zh-cn': '读取数字引脚[PIN]',
    'pl': 'Odczytaj cyfrowy Pin [PIN]',
    'ja': 'デジタル・ピン [PIN] から入力',
};

const FormMPURead = {
    'pt-br': 'Ler MPU [MODE]',
    'pt': 'Ler MPU [MODE]',
    'en': 'Read MPU [MODE]',
    'fr': 'Lecture MPU [MODE]',
    'zh-tw': '讀取 MPU [MODE]',
    'zh-cn': '读取 MPU [MODE]',
    'pl': 'Odczytaj MPU [MODE]',
    'ja': 'MPU の [MODE] から入力',
};

const FormINARead = {
    'pt-br': 'Ler INA [MODE]',
    'pt': 'Ler INA [MODE]',
    'en': 'Read INA [MODE]',
    'fr': 'Lecture INA [MODE]',
    'zh-tw': '讀取 INA [MODE]',
    'zh-cn': '读取 INA [MODE]',
    'pl': 'Odczytaj INA [MODE]',
    'ja': 'INA の [MODE] から入力',
};

const FormAxRead = {
    'pt-br': 'Read Accelerometer X Axis',
    'pt': 'Read Accelerometer X Axis',
    'en': 'Read Accelerometer X Axis',
    'fr': 'Read Accelerometer X Axis',
    'zh-tw': '讀取加速度計 X 軸',
    'zh-cn': '读取加速度计 X 轴',
    'pl': 'Read Accelerometer X Axis',
    'ja': '加速度計の X 軸から入力',
};

const FormAyRead = {
    'pt-br': 'Read Accelerometer Y Axis',
    'pt': 'Read Accelerometer Y Axis',
    'en': 'Read Accelerometer Y Axis',
    'fr': 'Read Accelerometer Y Axis',
    'zh-tw': '讀取加速度計 Y 軸',
    'zh-cn': '读取加速度计 Y 轴',
    'pl': 'Read Accelerometer Y Axis',
    'ja': '加速度計の Y 軸から入力',
};
const FormAzRead = {
    'pt-br': 'Read Accelerometer Z Axis',
    'pt': 'Read Accelerometer Z Axis',
    'en': 'Read Accelerometer Z Axis',
    'fr': 'Read Accelerometer Z Axis',
    'zh-tw': '讀取加速度計 Z 軸',
    'zh-cn': '读取加速度计 Z 轴',
    'pl': 'Read Accelerometer Z Axis',
    'ja': '加速度計の Z 軸から入力',
};

const FormGxRead = {
    'pt-br': 'Read Gyroscope X Axis',
    'pt': 'Read Gyroscope X Axis',
    'en': 'Read Gyroscope X Axis',
    'fr': 'Read Gyroscope X Axis',
    'zh-tw': '讀取陀螺儀 X 軸',
    'zh-cn': '读取陀螺仪 X 轴',
    'pl': 'Read Gyroscope X Axis',
    'ja': '方位計の X 軸から入力',
};

const FormGyRead = {
    'pt-br': 'Read Gyroscope Y Axis',
    'pt': 'Read Gyroscope Y Axis',
    'en': 'Read Gyroscope Y Axis',
    'fr': 'Read Gyroscope Y Axis',
    'zh-tw': '讀取陀螺儀 Y 軸',
    'zh-cn': '读取陀螺仪 Y 轴',
    'pl': 'Read Gyroscope Y Axis',
    'ja': '方位計の Y 軸から入力',
};
const FormGzRead = {
    'pt-br': 'Read Gyroscope Z Axis',
    'pt': 'Read Gyroscope Z Axis',
    'en': 'Read Gyroscope Z Axis',
    'fr': 'Read Gyroscope Z Axis',
    'zh-tw': '讀取陀螺儀 Z 軸',
    'zh-cn': '读取陀螺仪 Z 轴',
    'pl': 'Read Gyroscope Z Axis',
    'ja': '方位計の Z 軸から入力',
};

const FormSonarRead = {
    'pt-br': 'Ler Distância: Sonar em T[TRIGGER_PIN] E[ECHO_PIN]',
    'pt': 'Ler Distância: Sonar em T[TRIGGER_PIN] E[ECHO_PIN]',
    'en': 'Read SONAR T [TRIGGER_PIN] E [ECHO_PIN]',
    'fr': 'Distance de lecture : Sonar T [TRIGGER_PIN] E [ECHO_PIN]',
    'zh-tw': 'HCSR超音波感測器，Echo在腳位[ECHO_PIN] Trig在腳位[TRIGGER_PIN]',
    'zh-cn': 'HCSR超声波传感器，Echo在引脚[ECHO_PIN] Trig在引脚[TRIGGER_PIN]',
    'pl': 'Odczytaj odległość: Sonar T [TRIGGER_PIN] E [ECHO_PIN]',
    'ja': '超音波測距器からトリガ・ピン [TRIGGER_PIN] とエコー・ピン [ECHO_PIN] で入力',
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
    'ja': "ウェブソケット接続が切断されています",
};

const RoboHatPins = {
    "Servo1": 2,
    "Servo2": 3,
    "Servo3": 4,
    "Servo4": 5,
    "Servo5": 6,
    "Servo6": 7,
    "Servo7": 8,
    "Servo8": 9,
    "NeoPixel": 11,
    "LED": 13,
    "RCC1": 14,
    "RCC2": 15,
    "RCC3": 16,
    "RCC4": 17
}

const AnalogRoboHatPins = {
    "RCC1": 0,
    "RCC2": 1,
    "RCC3": 2,
    "RCC4": 3
}

const RoboHatPinsDigitalInput = {
    "Servo1": 2,
    "Servo2": 3,
    "Servo3": 4,
    "Servo4": 5,
    "Servo5": 6,
    "Servo6": 7,
    "Servo7": 8,
    "Servo8": 9,
    "NeoPixel": 11,
    "RCC1": 14,
    "RCC2": 15,
    "RCC3": 16,
    "RCC4": 17
}


class Scratch3RoboHatOneGPIO {
    constructor(runtime) {
        the_locale = this._setLocale();
        this.runtime = runtime;
    }

    getInfo() {
        the_locale = this._setLocale();
        //this.connect();

        return {
            id: 'onegpioRoboHAT',
            color1: '#0C5986',
            color2: '#34B0F7',
            name: 'OneGpio RoboHAT',
            blockIconURI: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAXIAAAEiCAYAAADkqln+AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH5AgJCgkON5Tk5wAAMghJREFUeNrt3WdzHFee7/nvSVe+CqiCdwRBErQgKd9qaWZud9x5eCN2496YfQ/z2vbRRuzG7r1j2qpl6EGABAiA8CigUN5Xun1QAJ0otSgWRCXx/4QohkQQlZmo+uXJY/5HAT5CCCECS3vXByCEEOLtSJALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTASZALIUTAGe/6AMSvTzweZ2pqikgkwt7eHtlsFs/z3vVhCSF+gLTIxfeMjo7yL//yL/zrv/4rn376KYYh93shfs3kEyq+J5VK8fHHH3Pp0iXm5+fRdf1dH5IQ4kdIi1wIIQJOglwIIQJOglwIIQJOglwIIQJOglwI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',
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
                    //text: 'Write Digital Pin [PIN] [ON_OFF]',
                    text: FormDigitalWrite[the_locale],

                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Servo1',
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
                            type: ArgumentType.STRING,
                            defaultValue: 'Servo1',
                            menu: 'pwm_pins'
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '50',
                        }
                    }
                },
                {
                    opcode: 'servo',
                    blockType: BlockType.COMMAND,
                    text: FormServo[the_locale],
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Servo1',
                            menu: 'servo_pins'
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
                            type: ArgumentType.STRING,
                            defaultValue: 'RCC1',
                            menu: 'analog_pins'
                        },
                    }
                },
                {
                    opcode: 'digital_read',
                    blockType: BlockType.REPORTER,
                    text: FormDigitalRead[the_locale],
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Servo1',
                            menu: 'digital_input_pins'
                        },
                    }
                },
                {
                    opcode: 'mpu_read',
                    blockType: BlockType.REPORTER,
                    text: FormMPURead[the_locale],
                    arguments: {
                        MODE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'AX',
                            menu: 'mpu_modes'
                        },
                    }
                },
                {
                    opcode: 'ina_read',
                    blockType: BlockType.REPORTER,
                    text: FormINARead[the_locale],
                    arguments: {
                        MODE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'V',
                            menu: 'ina_modes'
                        },
                    }
                },

            ],
            menus: {
                digital_pins: {
                    acceptReporters: true,
                    items: ['Servo1', 'Servo2', 'Servo3', 'Servo4',
                           'Servo5', 'Servo6', 'Servo7', 'Servo8',
                           'NeoPixel', 'LED', 'RCC1', 'RCC2', 'RCC3',
                           'RCC4'
                    ]
                },
                digital_input_pins: {
                    acceptReporters: true,
                    items: ['Servo1', 'Servo2', 'Servo3', 'Servo4',
                        'Servo5', 'Servo6', 'Servo7', 'Servo8',
                        'NeoPixel', 'RCC1', 'RCC2', 'RCC3',
                        'RCC4'
                    ]
                },
                pwm_pins: {
                    acceptReporters: true,
                    items: ['Servo1', 'Servo2',
                        'Servo5', 'Servo6', 'Servo7', 'Servo8',
                ]

                },
                analog_pins: {
                    acceptReporters: true,
                    items: ['RCC1', 'RCC2', 'RCC3', 'RCC4']
                },

                servo_pins: {
                    acceptReporters:true,
                    items: ['Servo1', 'Servo2', 'Servo3', 'Servo4',
                        'Servo5', 'Servo6', 'Servo7', 'Servo8',
                        'NeoPixel', 'RCC1', 'RCC2', 'RCC3',
                        'RCC4'
                ]

                },

                mpu_modes: {
                    acceptReporters: true,
                    items:['Ax', 'Ay', 'Az', 'Gx', 'Gy', 'Gz', 'Mx', 'My', 'Mz', 'Temperature']
                },

                ina_modes: {
                    acceptReporters: true,
                    items:['V', 'A', 'Supply', 'Shunt', 'Power']
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
            //pin = parseInt(pin, 10);
            pin = RoboHatPins[pin];

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
            let the_max = 255;
            // pin = parseInt(pin, 10);
            pin = RoboHatPins[pin];


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

    mpu_read(args){
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }
        }
        if (!connected) {
            let callbackEntry = [this.mpu_read.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            if (!mpu_initialized) {
                mpu_initialized = true;
                msg = {"command": "initialize_mpu"};
                msg = JSON.stringify(msg);
                window.socketr.send(msg);
                msg = {"command":'read_mpu'}
                msg = JSON.stringify(msg);
                window.socketr.send(msg);
            }
            if(mpu_data){
                let mode = args['MODE'];

                return mpu_data[mode]
                }
            }
        }

    ina_read(args){
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }
        }
        if (!connected) {
            let callbackEntry = [this.ina_read.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            if (!ina_initialized) {
                ina_initialized = true;
                msg = {"command": "initialize_ina"};
                msg = JSON.stringify(msg);
                window.socketr.send(msg);
            }
            let mode = args['MODE'];
            console.log(mode)
            if( args['MODE'] === 'V') {
                msg = {"command": "get_ina_bus_voltage"};
            } else if ( args['MODE'] === 'A') {
                msg = {"command": "get_ina_bus_current"};
            } else if ( args['MODE'] === 'Supply') {
                msg = {"command": "get_supply_voltage"};
            } else if ( args['MODE'] === 'Shunt') {
                msg = {"command": "get_shunt_voltage"};
            } else if ( args['MODE'] === 'Power') {
                msg = {"command": "get_power"};
            }
            msg = JSON.stringify(msg);
            window.socketr.send(msg);
            return ina_data[mode];
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
            //pin = parseInt(pin, 10);
            pin = RoboHatPins[pin];

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
            // pin = parseInt(pin, 10);
            pin = AnalogRoboHatPins[pin];


            if (pin_modes[pin] !== ANALOG_INPUT) {
                pin_modes[pin] = ANALOG_INPUT;
                msg = {"command": "set_mode_analog_input", "pin": pin};
                msg = JSON.stringify(msg);
                window.socketr.send(msg);
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
            //pin = parseInt(pin, 10);
            pin = RoboHatPinsDigitalInput[pin];

            if (pin_modes[pin] !== DIGITAL_INPUT) {
                pin_modes[pin] = DIGITAL_INPUT;
                msg = {"command": "set_mode_digital_input", "pin": pin};
                msg = JSON.stringify(msg);
                window.socketr.send(msg);
            }
            return digital_inputs[pin];

        }
    }



    // end of block handlers

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
            let url = "ws://" + ws_ip_address + ":9005";
            console.log(url);

            window.socketr = new WebSocket(url);
            msg = JSON.stringify({"id": "to_robohat_gateway"});
        }


        // websocket event handlers
        window.socketr.onopen = function () {

            digital_inputs.fill(0);
            analog_inputs.fill(0);
            pin_modes.fill(-1);
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
            } else if (report_type === 'mpu'){
                mpu_data = msg;
            } else if (report_type === 'ina') {
                ina_data[msg['param']] = msg['value']
                console.log(msg)
            }
        };
    }


}

module.exports = Scratch3RoboHatOneGPIO;
