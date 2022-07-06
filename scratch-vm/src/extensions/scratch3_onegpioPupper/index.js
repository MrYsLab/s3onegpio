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

const FormMode = {
    'pt-br': '[MODE] Mode',
    'pt': '[MODE] Mode',
    'en': '[MODE] Mode',
    'fr': '[MODE] Mode',
    'zh-tw': '[MODE] Mode',
    'zh-cn': '[MODE] Mode',
    'pl': '[MODE] Mode',
    'de': '[MODE] Mode',
    'ja': '[MODE] Mode',
};

const FormDirection = {
    'pt-br': 'Move [DIRECTION]',
    'pt': 'Move [DIRECTION]',
    'en': 'Move [DIRECTION]',
    'fr': 'Move [DIRECTION]',
    'zh-tw': 'Move [DIRECTION]',
    'zh-cn': 'Move [DIRECTION]',
    'pl': 'Move [DIRECTION]',
    'de': 'Move [DIRECTION]',
    'ja': 'Move [DIRECTION]',
};

const FormHeight = {
    'pt-br': '[HEIGHT] Body',
    'pt': '[HEIGHT] Body',
    'en': '[HEIGHT] Body',
    'fr': '[HEIGHT] Body',
    'zh-tw': '[HEIGHT] Body',
    'zh-cn': '[HEIGHT] Body',
    'pl': '[HEIGHT] Body',
    'de': '[HEIGHT] Body',
    'ja': '[HEIGHT] Body',
};

const FormBodyRoll = {
    'pt-br': 'Roll Body [ROLL]',
    'pt': 'Roll Body [ROLL]',
    'en': 'Roll Body [ROLL]',
    'fr': 'Roll Body [ROLL]',
    'zh-tw': 'Roll Body [ROLL]',
    'zh-cn': 'Roll Body [ROLL]',
    'pl': 'Roll Body [ROLL]',
    'de': 'Roll Body [ROLL]',
    'ja': 'Roll Body [ROLL]',
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

// pupper
// Raspbery Pi Specific
const FormIPBlockP = {
    'pt-br': 'Pupper IP Address [IP_ADDR]',
    'pt': 'Pupper IP Address [IP_ADDR]',
    'en': 'Pupper IP Address [IP_ADDR]',
    'fr': 'Pupper IP Address [IP_ADDR]',
    'zh-tw': 'Pupper IP Address [IP_ADDR]',
    'zh-cn': 'Pupper IP Address [IP_ADDR]',
    'pl': 'Pupper IP Address [IP_ADDR]',
    'de': 'Pupper IP Address [IP_ADDR]',
    'ja': 'Pupper IP Address [IP_ADDR]',
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

class Scratch3Pupper {
    constructor(runtime) {
        the_locale = this._setLocale();
        this.runtime = runtime;
    }

    getInfo() {
        the_locale = this._setLocale();
        //this.connect();

        return {
            id: 'onegpioPupper',
            color1: '#0C5986',
            color2: '#34B0F7',
            name: 'OneGpio Pupper',
            blockIconURI: ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAABtCAMAAACyYz72AAAAA3NCSVQICAjb4U/gAAAAGXRFWHRTb2Z0d2FyZQBnbm9tZS1zY3JlZW5zaG907wO/PgAAAC10RVh0Q3JlYXRpb24gVGltZQBXZWQgMDYgSnVsIDIwMjIgMDE6NDg6NTkgUE0gRURUZLImtQAAAfhQTFRFAAAAAAABAAACAAEAAAEBAAEDAAEEAAEGAAIIAAILAAUVAAYZAKkzAKk1AKo4AKo7AQAAAQICAakzAgAAAgEAAgUFAhIdAwAAAwcFAxwqBAAABAEABC84BQMBBRwgBTU7BakzBgAABw0IB7FDCAEACAYBCBALCEZDCRILCiUlCz09C6kzDD8/DQEADQoCDaozDqkzDqo4EBEIEBsSEURBEVpMFhkLFhkMFkA4FxsNGREFHblGHigXIE87IW5VIaozIgQAIjUhJAcAJaozJnVXKgUALAUALBEBL8RXMUkrMYFcNGWkOAcAOQkAObA0OlIvO45iQXCfRDgSSJxlSLs8SL9GSMBMSnefTCYETL9GUH2aUqZmUqhoVdhqV31JYiMCYtxqYzkIZ0AMaCgCaMxIbJRTbS4DbcNqbzMEdqJZd8xqeLxmesA8e8Rpfb1mgNpmgsI+ieFqjHwtltprmcZko9prrnYUr9xrr+ZrsXkVsudrtK09tuZruOdruOhruddOuehruqEuvc9BvuRrv7tHv9hzwY0dxMJJxdhQxelrxpkjx+hryK8vzeprzp4kztdI0MA20Opr0bsz0cU50ddW0d5P0d5Y0epr0tA/0uRj0uVf0upr09I/0+Zg0+pr1ORY1OZU1OZX1OZY1Oln1Opo1Opp1Opq1Opr4KB7tQAAAdtJREFUaN7t1llT03AYxeFTbF1KlCioICoC7qLVUmtdAVnEFQGLiAuuVEQQWdxRFAQFAQW1Klo36vs1vUjLwLQJ005Kb865yiS/mecm/0xw8nyShurXSRoaJEmjTJkyZcqUKVOmTJkyZcqUKVOmTJky5STI3+7uUJZdnnlndCMAAMs3l1x5KCLBB6uRekd79v0UUo74I5I45OCLMysUHRkA1rcYyuEkdvlHu0NRosjWPKfTuSsDQFanjjwriV0e263k3yyKlBdfEpGpwWvpsJ2YjC7PSuKQ91Q++lSqI4t8OQ1seWsgh5PY5c/3/GIg/74BrH1iKGtJfKfKQP7VCOQ8N5S1xHT5fTkse0cMZS0xWf76tF7FkotiIIcT8+TpWVw9c51ni6snAbLN0z3Xl8Tm6RYTZetWt3vf/kNVzcMi8u/xGth92rOJCqSU+SMS09+w0AZysahWuxzaCdvZQGSSIHm8GNj+TETk520Vdp/Mm/ynScXCw10f/vZfzwYKes2Q31zwes85lKUHvd66+7qyvDsKYEHmJhXAqlYxQ361QQkv7aq+HHx5TA29ytvaAvMpi3zsqDmwbmXh8Vt9ugn/wyhTpkyZMmXKlClTpkyZMmXKlClTpkw5kfsPg6wSrbwjcGYAAAAASUVORK5CYII=',
            blocks: [
                {
                    opcode: 'ip_address',
                    blockType: BlockType.COMMAND,
                    //text: 'Write Digital Pin [PIN] [ON_OFF]',
                    text: FormIPBlockP[the_locale],

                    arguments: {
                        IP_ADDR: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '',
                            //menu: "digital_pins"
                        },

                    }

                },
                {
                    opcode: 'mode',
                    blockType: BlockType.COMMAND,
                    text: FormMode[the_locale],

                    arguments: {
                        MODE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Active',
                            menu: "mode"
                        }
                    }
                },
                {
                    opcode: 'move',
                    blockType: BlockType.COMMAND,
                    text: FormDirection[the_locale],
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Forward',
                            menu: "motion"
                        },
                    }
                },
                {
                    opcode: 'height',
                    blockType: BlockType.COMMAND,
                    text: FormHeight[the_locale],
                    arguments: {
                        HEIGHT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Raise',
                            menu: 'body'
                        },
                    }
                },


                {
                    opcode: 'roll',
                    blockType: BlockType.COMMAND,
                    text: FormBodyRoll[the_locale],
                    arguments: {
                        ROLL: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Left',
                            menu: 'roll'
                        },
                    }
                },


            ],
            menus: {
                mode: {
                    acceptReporters: true,
                    items: ['Active', 'Inactive', 'Trot', 'Rest']
                },
                motion: {
                    acceptReporters: true,
                    items: ['Forward', 'Backward']
                },
                body: {
                    acceptReporters: true,
                    items: ['Raise', 'Lower']
                },
                roll: {
                    acceptReporters: true,
                    items: ['Left', 'Right']
                },
            }
        };
    }


// The block handlers

// command blocks

ip_address(args)
{
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

mode(args)
{

}

move(args){

}

height(args){

}

roll(args){

}


_setLocale()
{
    let now_locale = '';
    switch (formatMessage.setup().locale) {
        case 'pt-br':
        case 'pt':
            now_locale = 'pt-br';
            break;
        case 'en':
            now_locale = 'en';
            break;
        case 'fr':
            now_locale = 'fr';
            break;
        case 'zh-tw':
            now_locale = 'zh-tw';
            break;
        case 'zh-cn':
            now_locale = 'zh-cn';
            break;
        case 'pl':
            now_locale = 'pl';
            break;
        case 'ja':
            now_locale = 'ja';
            break;
        case 'de':
            now_locale = 'de';
            break;
        default:
            now_locale = 'en';
            break;
    }
    return now_locale;
}

// end of block handlers

// helpers
connect()
{
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
            alert(FormWSClosed[the_locale]);
        }
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

module.exports = Scratch3Pupper;
