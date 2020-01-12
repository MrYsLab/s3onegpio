/*
This is the Scratch 3 extension to remotely control a
Circuit Playground Express

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

require('sweetalert');

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

// menus

const MENU_LIGHT_TEMPERATURE = {
    'en': ['light', 'temperature'],
    'zh-tw':['光線', '溫度'],
    'zh-cn':['光线', '温度'],
};

const MENU_PUSH_BUTTONS = {
    'en': ['A', 'B'],
    'zh-tw': ['A', 'B'],
    'zh-cn': ['A', 'B'],
};

const MENU_PUSH_BUTTON_STATE = {
    'en': ['pressed', 'released'],
    'zh-tw': ['被按下', '被放開'],
    'zh-cn': ['被按下', '被放开'],
};

const MENU_SLIDE_SWITCH_POSITION = {
    'en': ['left', 'right'],
    'zh-tw': ['左', '右'],
    'zh-cn': ['左', '右'],

};

const MENU_TOUCH_PAD_STATES = {
    'en': ['touched', 'released'],
    'zh-tw': ['被按壓', '被放開'],
    'zh-cn': ['被按压', '被放开'],
};

const MENU_TILT_POSITION = {
    'en': ['flat', 'up', 'down', 'left', 'right'],
    'zh-tw': ['放平', '朝上', '朝下', '朝左', '朝右'],
    'zh-cn': ['放平', '朝上', '朝下', '朝左', '朝右'],

};

const MENU_BOARD_LED = {
    'en': ['on', 'off'],
    'zh-tw': ['亮', '暗'],
    'zh-cn': ['亮', '暗'],
};

// HAT BLOCK DESCRIPTORS

const HAT_BUTTONS = {
    'en': 'When [BUTTON] is [PRESSED_RELEASED]',
    'zh-tw': '當 [BUTTON] [PRESSED_RELEASED]',
    'zh-cn': '当 [BUTTON] [PRESSED_RELEASED]',
};


const HAT_SLIDE_SWITCH = {
    'en': 'When slide switch is moved [LEFT_RIGHT]',
    'zh-tw': '當開關朝向 [LEFT_RIGHT]',
    'zh-cn': '当开关朝向 [LEFT_RIGHT]',
};

const HAT_LIGHT_TEMPERATURE = {
    'en': 'When [SENSOR] [COMPARISON] [VALUE]',
    'zh-tw': '當 [SENSOR] [COMPARISON] [VALUE]',
    'zh-cn': '当 [SENSOR] [COMPARISON] [VALUE]',
};

const HAT_TILTED = {
    'en': 'When CPX position is [TILT_POSITION]',
    'zh-tw': '當燈板 [TILT_POSITION]',
    'zh-cn': '当灯板 [TILT_POSITION]',
};

const HAT_LOUD_SOUND = {
    'en': 'When a loud sound is detected',
    'zh-tw': '當偵測到聲音',
    'zh-cn': '当侦测到声音',
};

const HAT_TOUCHPAD = {
    'en': 'When touchpad [TOUCHPAD] is [TOUCH_STATE]',
    'zh-tw': '當連接腳位 [TOUCHPAD] [TOUCH_STATE]',
    'zh-cn': '当连接脚位 [TOUCHPAD] [TOUCH_STATE]',
};

// boolean blocks

const BOOL_AB_SWITCH = {
    'en': '[BUTTON] [PRESSED_RELEASED]',
    'zh-tw': '[BUTTON] [PRESSED_RELEASED]',
    'zh-cn': '[BUTTON] [PRESSED_RELEASED]',
};

const BOOL_SLIDE_SWITCH = {
    'en': 'slide switch on the [LEFT_RIGHT]',
    'zh-tw': '開關朝向 [LEFT_RIGHT]',
    'zh-cn': '开关朝向 [LEFT_RIGHT]',
};

const BOOL_LIGHT_TEMP = {
    'en': '[SENSOR] is [COMPARISON] [VALUE]',
    'zh-tw': '[SENSOR] [COMPARISON] [VALUE]',
    'zh-cn': '[SENSOR] [COMPARISON] [VALUE]',
};

const BOOL_TILTED = {
    'en': 'CPX position is [TILT_POSITION]',
    'zh-tw': '燈板 [TILT_POSITION]',
    'zh-cn': '灯板 [TILT_POSITION]',
};

const BOOL_TOUCH_PAD = {
    'en': 'touchpad [TOUCHPAD] is [TOUCH_STATE]',
    'zh-tw': '連接腳位 [TOUCHPAD] [TOUCH_STATE]',
    'zh-cn': '连接脚位 [TOUCHPAD] [TOUCH_STATE]',
};

const REPORTER_AB_SWITCH = {
    'en': 'Button [BUTTON] ',
    'zh-tw': '按鈕 [BUTTON] ',
    'zh-cn': '按钮 [BUTTON] ',
};

const REPORTER_SLIDE_SWITCH = {
    'en': 'Slide switch',
    'zh-tw': '開關',
    'zh-cn': '开关',
};

const REPORTER_LIGHT_TEMP = {
    'en': '[SENSOR]',
    'zh-tw': '[SENSOR]',
    'zh-cn': '[SENSOR]',
};

const REPORTER_TILT = {
    'en': 'CPX position is [TILT_POSITION]',
    'zh-tw': '燈板 [TILT_POSITION]',
    'zh-cn': '灯板 [TILT_POSITION]',
};

const REPORTER_TOUCHPAD = {
    'en': 'touchpad [TOUCHPAD]',
    'zh-tw': '連接腳位 [TOUCHPAD]',
    'zh-cn': '连接脚位 [TOUCHPAD]',
};

// command blocks
const COMMAND_SET_PIXEL = {
    'en': 'Pixel [NEOPIXEL] R [RED] G [GREEN] B [BLUE]',
    'zh-tw': '全彩LED [NEOPIXEL] 紅 [RED] 綠 [GREEN] 藍 [BLUE]',
    'zh-cn': '全彩LED [NEOPIXEL] 红 [RED] 绿 [GREEN] 蓝 [BLUE]',
};

const COMMAND_TONE = {
    'en': 'Tone [FREQ] Hz [DURATION] ms',
    'zh-tw': '播放音調 [FREQ] 赫茲 [DURATION] 毫秒',
    'zh-cn': '播放音调 [FREQ] 赫兹 [DURATION] 毫秒',
};

const COMMAND_BOARD_LED = {
    'en': 'Board LED [LED_STATE]',
    'zh-tw': 'D13 LED [LED_STATE]',
    'zh-cn': 'D13 LED [LED_STATE]',
};

const FormWSClosed = {
    'en': "WebSocket Connection Is Closed.",
    'zh-tw': "硬體連線中斷",
    'zh-cn': "硬件联机中断",
};

let data_store = {
    'a': 0, 'b': 0, 'light': 0, 'temp': 0.0,
    'slide': 1, 'sound': 0, 'tilted': [0, 0],
    'touch1': 0, 'touch2': 0, 'touch3': 0, 'touch4': 0,
    'touch5': 0, 'touch6': 0, 'touch7': 0
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
            name: 'OneGpio Playground Express',
            blockIconURI: 'data:image/png;base64,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',
            blocks: [
                {
                    opcode: 'hat_button_pressed',
                    blockType: BlockType.HAT,
                    text: HAT_BUTTONS[the_locale],
                    arguments: {
                        BUTTON: {
                            type: ArgumentType.STRING,
                            defaultValue: MENU_PUSH_BUTTONS[the_locale][0],
                            menu: 'pushButtons'
                        },
                        PRESSED_RELEASED: {
                            type: ArgumentType.STRING,
                            defaultValue: MENU_PUSH_BUTTON_STATE[the_locale][0],
                            menu: 'pushButtonStates'
                        },
                    }
                },
                {
                    opcode: 'hat_slide_moved',
                    blockType: BlockType.HAT,
                    text: HAT_SLIDE_SWITCH[the_locale],
                    arguments: {
                        LEFT_RIGHT: {
                            type: ArgumentType.STRING,
                            defaultValue: MENU_SLIDE_SWITCH_POSITION[the_locale][0],
                            menu: 'slidePositions'
                        },
                    }
                },
                {
                    opcode: 'hat_tilted',
                    blockType: BlockType.HAT,
                    text: HAT_TILTED[the_locale],
                    arguments: {
                        TILT_POSITION: {
                            type: ArgumentType.STRING,
                            defaultValue: MENU_TILT_POSITION[the_locale][0],
                            menu: 'tiltPositions'
                        }
                    }
                },
                {
                    opcode: 'hat_loud_sound',
                    blockType: BlockType.HAT,
                    text: HAT_LOUD_SOUND[the_locale],
                },
                {
                    opcode: 'hat_touchpad',
                    blockType: BlockType.HAT,
                    text: HAT_TOUCHPAD[the_locale],
                    arguments: {
                        TOUCHPAD: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '1',
                            menu: 'touchpads'
                        },
                        TOUCH_STATE: {
                            type: ArgumentType.STRING,
                            defaultValue: MENU_TOUCH_PAD_STATES[the_locale][0],
                            menu: 'touchPadStates'
                        },
                    }
                },
                '---',
                {
                    opcode: 'bool_button_pressed',
                    blockType: BlockType.BOOLEAN,
                    text: BOOL_AB_SWITCH[the_locale],
                    arguments: {
                        BUTTON: {
                            type: ArgumentType.STRING,
                            defaultValue: MENU_PUSH_BUTTONS[the_locale][0],
                            menu: 'pushButtons'
                        },
                        PRESSED_RELEASED: {
                            type: ArgumentType.STRING,
                            defaultValue: MENU_PUSH_BUTTON_STATE[the_locale][0],
                            menu: 'pushButtonStates'
                        },
                    }
                },
                {
                    opcode: 'bool_light_temp_comparison',
                    blockType: BlockType.BOOLEAN,
                    text: BOOL_LIGHT_TEMP[the_locale],
                    arguments: {
                        SENSOR: {
                            type: ArgumentType.STRING,
                            defaultValue: MENU_LIGHT_TEMPERATURE[the_locale][0],
                            menu: 'lightTemperature'
                        },
                        COMPARISON: {
                            type: ArgumentType.STRING,
                            defaultValue: '>',
                            menu: 'compare'
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0,
                        }
                    }
                },
                {
                    opcode: 'bool_tilted',
                    blockType: BlockType.BOOLEAN,
                    text: BOOL_TILTED[the_locale],
                    arguments: {
                        TILT_POSITION: {
                            type: ArgumentType.STRING,
                            defaultValue: MENU_TILT_POSITION[the_locale][0],
                            menu: 'tiltPositions'
                        }
                    }
                },
                {
                    opcode: 'bool_touch_pad',
                    blockType: BlockType.BOOLEAN,
                    text: BOOL_TOUCH_PAD[the_locale],
                    arguments: {
                        TOUCHPAD: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '1',
                            menu: 'touchpads'
                        },
                        TOUCH_STATE: {
                            type: ArgumentType.STRING,
                            defaultValue: MENU_TOUCH_PAD_STATES[the_locale][0],
                            menu: 'touchPadStates'
                        },
                    }
                },
                '---',

                {
                    opcode: 'reporter_light_temp',
                    blockType: BlockType.REPORTER,
                    text: REPORTER_LIGHT_TEMP[the_locale],
                    arguments: {
                        SENSOR: {
                            type: ArgumentType.STRING,
                            defaultValue: MENU_LIGHT_TEMPERATURE[the_locale][0],
                            menu: 'lightTemperature'
                        }
                    }
                },

                '---',
                {
                    opcode: 'command_pixel_write',
                    blockType: BlockType.COMMAND,
                    text: COMMAND_SET_PIXEL[the_locale],

                    arguments: {
                        NEOPIXEL: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '1',
                            menu: "neopixels"
                        },
                        RED: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '128',
                        },
                        GREEN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '128',
                        },
                        BLUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '128',
                        },
                    }
                },
                {
                    opcode: 'command_tone',
                    blockType: BlockType.COMMAND,
                    text: COMMAND_TONE[the_locale],

                    arguments: {
                        FREQ: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '1000',
                        },
                        DURATION: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '500',
                        },
                        GREEN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '128',
                        },
                        BLUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '128',
                        },
                    }
                },
                {
                    opcode: 'command_board_led',
                    blockType: BlockType.COMMAND,
                    text: COMMAND_BOARD_LED[the_locale],

                    arguments: {
                        LED_STATE: {
                            type: ArgumentType.STRING,
                            defaultValue: MENU_BOARD_LED[the_locale][0],
                            menu: 'boardLedStates'
                        }
                    }
                },


            ],
            menus: {

                pushButtons: 'getAllPushButtons',
                lightTemperature: 'getAllLightTemperature',
                pushButtonStates: 'getAllPushButtonStates',
                slidePositions: 'getAllSlidePositions',
                touchPadStates: 'getAllTouchPadStates',
                tiltPositions: 'getAllTiltPostions',
                boardLedStates: 'getAllBoardLedStates',
                neopixels:
                    {
                        items: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],

                    },
                touchpads: {
                    items: ['1', '2', '3', '4', '5', '6', '7',]
                },
                compare: {
                    items: ['>', '<']
                },
            }
        };
    }

    getAllPushButtons() {
        return MENU_PUSH_BUTTONS[the_locale];
    }

    getAllLightTemperature() {
        return MENU_LIGHT_TEMPERATURE[the_locale];
    }

    getAllPushButtonStates() {
        return MENU_PUSH_BUTTON_STATE[the_locale];
    }

    getAllSlidePositions() {
        return MENU_SLIDE_SWITCH_POSITION[the_locale];
    }

    getAllTouchPadStates() {
        return MENU_TOUCH_PAD_STATES[the_locale];
    }

    getAllTiltPostions() {
        return MENU_TILT_POSITION[the_locale];
    }

    getAllBoardLedStates() {
        return MENU_BOARD_LED[the_locale];
    }

    // The block handlers

    // command blocks

    hat_button_pressed(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }

        }

        if (!connected) {
            let callbackEntry = [this.hat_button_pressed.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            if (args['BUTTON'] === this.getAllPushButtons()[0]) {
                if (args['PRESSED_RELEASED'] === this.getAllPushButtonStates()[0]) {
                    return data_store['a'] === 1;
                } else {
                    if (args['PRESSED_RELEASED'] === this.getAllPushButtonStates()[1]) {
                        return data_store['a'] === 0;
                    }
                }
            }
            // for button b
            if (args['BUTTON'] === this.getAllPushButtons()[1]) {
                if (args['PRESSED_RELEASED'] === this.getAllPushButtonStates()[0]) {
                    return data_store['b'] === 1;
                } else {
                    if (args['PRESSED_RELEASED'] === this.getAllPushButtonStates()[1]) {
                        return data_store['b'] === 0;
                    }
                }
            }
        }
    }

    hat_slide_moved(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }

        }

        if (!connected) {
            let callbackEntry = [this.hat_slide_moved.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            let item_index = this.getAllSlidePositions().indexOf(args['LEFT_RIGHT']);
            item_index = parseInt(item_index, 10);

            // testing for pressed
            if (item_index === 0) {
                return data_store['slide'] === 1;
            } else {
                return data_store['slide'] === 0;
            }
        }
    }

    hat_tilted(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }
        }
        if (!connected) {
            let callbackEntry = [this.hat_tilted.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            let current_position = data_store['tilted'];
            let sensor_text = args['TILT_POSITION'];
            // get its index in the list of menu items
            let item_index = this.getAllTiltPostions().indexOf(sensor_text);
            item_index = parseInt(item_index, 10);
            // get index for the block position
            // ['flat', 'up', 'down', 'left', 'right',],
            if (item_index === 0 && data_store['tilted'][0] === 0) { // flat
                return true;
            } else if (item_index === 1 && data_store['tilted'][0] === 1) { // up
                return true;
            } else if (item_index === 2 && data_store['tilted'][0] === 2) { // down
                return true;
            } else if (item_index === 3 && data_store['tilted'][1] === 3) { // down
                return true;
            } else if (item_index === 4 && data_store['tilted'][1] === 4) { // down
                return true;
            } else {
                return false;
            }
        }
    }

    hat_loud_sound
    (args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }
        }

        if (!connected) {
            let callbackEntry = [this.hat_loud_sound.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            return data_store['sound'] > 540;
        }
    }

    hat_touchpad(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }
        }

        if (!connected) {
            let callbackEntry = [this.hat_touchpad.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            let touchpad = parseInt(args['TOUCHPAD'], 10);
            let state = args['TOUCH_STATE'];
            let index = this.getAllTouchPadStates().indexOf(state);
            let current_state = 0;
            switch (touchpad) {
                case 1:
                    current_state = data_store['touch1'];
                    break;
                case 2:
                    current_state = data_store['touch2'];
                    break;
                case 3:
                    current_state = data_store['touch3'];
                    break;
                case 4:
                    current_state = data_store['touch4'];
                    break;
                case 5:
                    current_state = data_store['touch5'];
                    break;
                case 6:
                    current_state = data_store['touch6'];
                    break;
                case 7:
                    current_state = data_store['touch7'];
                    break;
                default:
                    break;
            }
            if (index === 0 && current_state) { //touched and touched selected
                return true;
            } else if (index === 1 && !current_state) { //released and released selected
                return true;
            } else {
                return false;
            }
        }
    }


    bool_button_pressed(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }

        }
        if (!connected) {
            let callbackEntry = [this.bool_button_pressed.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            // for button a
            if (args['BUTTON'] === this.getAllPushButtons()[0]) {
                if (args['PRESSED_RELEASED'] === this.getAllPushButtonStates()[0]) {
                    return data_store['a'] === 1;
                } else {
                    if (args['PRESSED_RELEASED'] === this.getAllPushButtonStates()[1]) {
                        return data_store['a'] === 0;
                    }
                }
            }
            // for button b
            if (args['BUTTON'] === this.getAllPushButtons()[1]) {
                if (args['PRESSED_RELEASED'] === this.getAllPushButtonStates()[0]) {
                    return data_store['b'] === 1;
                } else {
                    if (args['PRESSED_RELEASED'] === this.getAllPushButtonStates()[1]) {
                        return data_store['b'] === 0;
                    }
                }
            }
        }
    }

    bool_light_temp_comparison(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }

        }

        if (!connected) {
            let callbackEntry = [this.bool_light_temp_comparison.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            let current_value = 0;
            let comp_type = args['COMPARISON'];
            let comp_value = args['VALUE'];
            if (args['SENSOR'] === this.getAllLightTemperature()[0]) {
                current_value = data_store['light'];
            } else {
                current_value = data_store['temp']
            }
            if (comp_type === '>') {
                return current_value > comp_value;
            } else {
                return current_value < comp_value;
            }
        }
    }

    bool_tilted(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }

        }

        if (!connected) {
            let callbackEntry = [this.bool_tilted.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            // get the current position
            let current_position = data_store['tilted'];
            let sensor_text = args['TILT_POSITION'];
            // get its index in the list of menu items
            let item_index = this.getAllTiltPostions().indexOf(sensor_text);
            item_index = parseInt(item_index, 10);
            // get index for the block position
            // ['flat', 'up', 'down', 'left', 'right',],
            if (item_index === 0) { // flat
                return data_store['tilted'][0] === 0 &&
                    data_store['tilted'][1] === 0;
            } else if (item_index === 1) { //up
                return data_store['tilted'][0] === 1;
            } else if (item_index === 2) { //down
                return data_store['tilted'][0] === 2;

            } else if (item_index === 3) { //left
                return data_store['tilted'][1] === 3;
            } else if (item_index === 4) { //left
                return data_store['tilted'][1] === 4;

            }
        }
    }

    bool_touch_pad(args) {

        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }

        }

        if (!connected) {
            let callbackEntry = [this.bool_touchpad.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            let touchpad = parseInt(args['TOUCHPAD'], 10);
            let value = false;

            switch (touchpad) {
                case 1:
                    value = data_store['touch1'];
                    break;
                case 2:
                    value = data_store['touch2'];
                    break;
                case 3:
                    value = data_store['touch3'];
                    break;
                case 4:
                    value = data_store['touch4'];
                    break;
                case 5:
                    value = data_store['touch5'];
                    break;
                case 6:
                    value = data_store['touch6'];
                    break;
                case 7:
                    value = data_store['touch7'];
                    break;
                default:
                    console.log('bool_touch_pad unexpected pad value', touchpad);
                    break;
            }
            if (args['TOUCH_STATE'] === this.getAllTouchPadStates()[0]) {
                return Boolean(value);
            } else {
                return Boolean(value ^ 1);
            }
        }
    }


    reporter_light_temp(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }

        }

        if (!connected) {
            let callbackEntry = [this.reporter_light_temp.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            // test for light
            if (args['SENSOR'] === this.getAllLightTemperature()[0]) {
                return data_store['light'];
            } else {
                return data_store['temp']
            }
        }
    }

    command_pixel_write(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }

        }

        if (!connected) {
            let callbackEntry = [this.command_pixel_write.bind(this), args];
            wait_open.push(callbackEntry);
        } else {
            let pixel = args['NEOPIXEL'];
            pixel = parseInt(pixel, 10);

            let red = args['RED'];
            red = parseInt(red, 10);

            let green = args['GREEN'];
            green = parseInt(green, 10);

            let blue = args['BLUE'];
            blue = parseInt(blue, 10);

            msg = {"command": 'pixel', 'pixel': pixel, 'red': red, 'green': green, 'blue': blue};
            msg = JSON.stringify(msg);
            window.socketx.send(msg);
        }
    }

    command_tone(args) {
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
            let freq = args['FREQ'];
            freq = parseInt(freq, 10);
            let duration = args['DURATION'];
            duration = parseInt(duration, 10);
            // make sure duration maximum is 5 seconds
            if (duration > 5000) {
                duration = 5000;
            }

            msg = {"command": 'play_tone', 'pin': 99, 'freq': freq, 'duration': duration};
            msg = JSON.stringify(msg);
            window.socketx.send(msg);

        }
    }

    command_board_led(args) {
        if (!connected) {
            if (!connection_pending) {
                this.connect();
                connection_pending = true;
            }
        }

        if (!connected) {
            let callbackEntry = [this.command_board_led.bind(this), args];
            wait_open.push(callbackEntry);
        } else {

            let state = args['LED_STATE'];
            let item_index = this.getAllBoardLedStates().indexOf(state);
            item_index = parseInt(item_index, 10);

            if (item_index === 0) {
                value = 1;
            } else {
                value = 0;
            }
            msg = {"command": 'digital_write', 'pin': 13, 'value': value};
            msg = JSON.stringify(msg);
            window.socketx.send(msg);

        }
    }

    // end of block handlers

    _setLocale() {
        let now_locale = '';
        switch (formatMessage.setup().locale) {
            case 'en':
                now_locale = 'en';
                break;
            case 'zh-tw':
                now_locale= 'zh-tw';
                break;
            case 'zh-cn':
                now_locale= 'zh-cn';
                break;
            default:
                now_locale = 'en';
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
            let report_type = msg['report'];

            // set the incoming value in the data store
            data_store[report_type] = msg['value'];
        };
    }
}

module.exports = Scratch3CpxOneGPIO;
