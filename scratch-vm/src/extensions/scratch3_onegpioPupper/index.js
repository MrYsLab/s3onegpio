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


// has an websocket message already been received
let alerted = false;

let connection_pending = false;

// general outgoing websocket message holder
let msg = null;

// flag to indicate if the user connected to a board
let connected = false;

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

const FormActivateMode = {
    'pt-br': '[ACTIVATE_MODE] Mode',
    'pt': '[ACTIVATE_MODE] Mode',
    'en': '[ACTIVATE_MODE] Mode',
    'fr': '[ACTIVATE_MODE] Mode',
    'zh-tw': '[ACTIVATE_MODE] Mode',
    'zh-cn': '[ACTIVATE_MODE] Mode',
    'pl': '[ACTIVATE_MODE] Mode',
    'de': '[ACTIVATE_MODE] Mode',
    'ja': '[ACTIVATE_MODE] Mode',
};

const MENU_ACTIVATIONS = {
    'pt-br': ["Active", "Inactive"],
    'pt': ["Active", "Inactive"],
    'en': ["Active", "Inactive"],
    'fr': ["Active", "Inactive"],
    'zh-tw': ["Active", "Inactive"],
    'zh-cn': ["Active", "Inactive"],
    'pl': ["Active", "Inactive"],
    'de': ["Active", "Inactive"],
    'ja': ["Active", "Inactive"]
};

const FormRestTrot = {
    'pt-br': '[REST_TROT_MODE] Mode',
    'pt': '[REST_TROT_MODE] Mode',
    'en': '[REST_TROT_MODE] Mode',
    'fr': '[REST_TROT_MODE] Mode',
    'zh-tw': '[REST_TROT_MODE] Mode',
    'zh-cn': '[REST_TROT_MODE] Mode',
    'pl': '[REST_TROT_MODE] Mode',
    'de': '[REST_TROT_MODE] Mode',
    'ja': '[REST_TROT_MODE] Mode',
};

const MENU_REST_TROT = {
    'pt-br': ["Rest", "Trot"],
    'pt': ["Rest", "Trot"],
    'en': ["Rest", "Trot"],
    'fr': ["Rest", "Trot"],
    'zh-tw': ["Rest", "Trot"],
    'zh-cn': ["Rest", "Trot"],
    'pl': ["Rest", "Trot"],
    'de':["Rest", "Trot"],
    'ja': ["Rest", "Trot"],
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
            blockIconURI:  ' data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAABtCAYAAACFvc7EAAAABHNCSVQICAgIfAhkiAAAABl0RVh0U29mdHdhcmUAZ25vbWUtc2NyZWVuc2hvdO8Dvz4AAAAtdEVYdENyZWF0aW9uIFRpbWUAV2VkIDA2IEp1bCAyMDIyIDAxOjQ4OjU5IFBNIEVEVGSyJrUAAAT8SURBVHic7dx/aJR1HMDx93PPbrfNnW6nO/arhdLZWDFjNAU1cP4RyfxDS0UoSQmTBWVYIUER/UIo/6loif4hhZISjApDR0FUri0EyXSoc6nbGvPXanM7d7t77p7+aDe3uCWu3XPbfT4vGOxuz+353N7P8+W5O5jx8NYDtt8XQaWvDO+sCK9sOZPqOVQSZczxRijwhVI9h0oiV6oHUMmnkQXQyAJoZAE0sgAaWQCNLIBGFkAjC6CRBdDIAmhkATSyABpZAI0sgEYWQCMLoJEF0MgCaGQBNLIAGlkAjSyARhZAIwugkQXQyAJoZAE0sgAaWQCNLIBGFkAjC6CRBdDIAmhkATSyABpZAI0sgEYWQCMLoJEF0MgCZDi9w1hkkEMXfueDq0MEAQw36yureMNn3NXvCR9pZOkz7YTsxD83XC48s7MpDvipfqycjU8vIDB73CS07f6C9e/dIAqQWcTOn9eyqSzxHPaVM2yt/oGWYQAX8194gi9f82NOySzJ5eCZHKO7t4ttJ1rZFQ+cRHYsRqgvyMUTlzj89lE2rPiGA7+l5l8+p3oWRyLbVpCGc62sO91N87DNBAf85BkGHm8Wefm3v7w5LlxjTsrIH5d5f/Nxfuyb6p1P41lGOLJcR/qvsLsnyADgycpjS4mbxovXuTRVtQ0Ptfs289ZKc8ydUfrOdbB/5/fsbw4RA6Ld59n3eRXL6+Yk7+ieTrOMcG65NtwsKrmPQ9Xl1Pk8DhxdJnnlC9j+yRKWZI/cZUc529TDwJQvJdN7Fkcim548djxUyWcL5xFw+FLP5S9k0b23n6Z1NUhvzNkZUj2LI39yM3cu65zYUUJRwmOucYxMk8y7u5Cf8bOk/etkq62Tls746WKQG8inIEXPOlWzOP462SmxcIjOX9rY8+pJzsbPHlcONauL8QibJT0ix0I0bNxDw39uZJC/cjHP1rjlzDIi7ZdrAAwT/4olfFhfQal5583TbZb0OJMNg+z8HLyja5+B4TLweHMorShk+ZoK1j7qwzvukDYwTYPR6x7b4tbQxLuIDYQZHHMl7PZMcH5MapbkSpPIHlbVb/rXGxB3fBB587JuL2VWPxfOR+D+zIRbB89co8OKP9SgoGhW4mVwUrMkl4zlegJ5lX5K44e5HeanT8/RaSXYMNzL4b0dDMbfuMjwUVWdRcpeid0l0ZHNBwLUVpijsYLHm3mu7lea2oexAGyL66fa+eipI3x80hp9zz13aQWrAzMlsUPLdf+f3ezqucXoSWLd4kr8eztKS0c7L/eM3DYyqZlfRm22A3/EjLk8+eaDHN14ivZhwLa4/FUT275uwsx047YthsPjP1Bx+e5h+7sVlMyg08ORyKGhfhqv3STxh2sxuvp66YrfNLIoLi2jNjvhxlMud9lS6vfa7HjxNK1/jQS1IToc+edz5jFyAgFe2lPDhoUzqDDpcuH1v7goXvUIBxeX8+3Bsxz7rpvW8wPcuGkRdWUw2+9lfmURy2rLeXxNIf7E12XTmrHm9b32O8+fSvUcKolm1rqjJkUjC6CRBdDIAmhkATSyABpZAI0sgEYWQCMLoJEF0MgCaGQBNLIAGlkAjSyARhZAIwugkQXQyAJoZAE0sgAaWQCNLIBGFkAjC6CRBdDIAmhkATSyABpZAI0sgEYWQCMLoJEF0MgCaGQBNLIAGlkAjSyARhZAIwugkQXQyAL8DWN+esfzSQVfAAAAAElFTkSuQmCC',
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
                    opcode: 'activate_mode',
                    blockType: BlockType.COMMAND,
                    text: FormActivateMode[the_locale],

                    arguments: {
                        ACTIVATE_MODE: {
                            type: ArgumentType.STRING,
                            defaultValue: MENU_ACTIVATIONS[the_locale][0],
                            menu: 'active_states'
                        }
                    }
                },
                {
                    opcode: 'rest_trot_mode',
                    blockType: BlockType.COMMAND,
                    text: FormRestTrot[the_locale],

                    arguments: {
                        REST_TROT_MODE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: MENU_REST_TROT[the_locale][0],
                            menu: "rest_states"
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
                active_states: 'get_active_states',
                rest_states: 'get_rest_states',


            }
        };
    }

    get_active_states() {
        return MENU_ACTIVATIONS[the_locale];
    }

    get_rest_states(){
        return MENU_REST_TROT[the_locale];
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
