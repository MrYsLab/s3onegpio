"""
 Copyright (c) 2018-2019 Alan Yorinks All rights reserved.

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
"""
import argparse
import json
import signal
import socket
import sys
import threading
import time

from python_banyan.gateway_base import GatewayBase


# noinspection PyAbstractClass
class Esp8266Gateway(GatewayBase, threading.Thread):
    """
    This class is a Python Banyan component that subscribes to topics requesting
    action or responses from an ESP8266. This component communicates with the
    ESP8266
    as a TCP client that connects to the ESP8266.

    It may also be configured as a TCP server, but then the code on the ESP8266
    will need to be updated with the IP address of the server.

    The main thread is the Banyan receive loop, and a separate thread is
    created to listen
    for TCP messages coming from the ESP826
    """

    def __init__(self, *subscriber_list, connection_mode='client',
                 back_plane_ip_address=None,
                 subscriber_port='43125',
                 publisher_port='43124',
                 ip_address=None,
                 ip_port=31337,
                 ip_packet_length=96,
                 validate_pin=True):
        """

        :param connection_mode: client (default) or server
        :param ip_address: ip address of the esp8266
        :param ip_port: ip port of the esp8266
        :param ip_packet_length: tcp packet length for communication
        with the esp8266
        :param validate_pin: validate the pin number
        """
        self.pin_info = {}
        self.gpio_pins = [4, 5, 12, 13, 14, 15]

        self.back_plane_ip_address = back_plane_ip_address
        self.publisher_port = publisher_port
        self.subscriber_port = subscriber_port

        self.subscriber_list = subscriber_list

        # initialize the parents
        super(Esp8266Gateway, self).__init__(
            subscriber_list=self.subscriber_list,
            back_plane_ip_address=self.back_plane_ip_address,
            publisher_port=self.publisher_port,
            subscriber_port=self.subscriber_port,
            process_name='Esp8266Gateway')
        threading.Thread.__init__(self)
        self.daemon = True

        self.pkt_len = ip_packet_length
        self.validate_pin = validate_pin

        # in case we need to stop the thread
        self.stop_event = threading.Event()

        # set up the socket and connect to the esp8266 server
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

        if connection_mode == 'server':
            self.sock.bind(('', ip_port))
            self.sock.listen(1)
            print('Esp8266Gateway waiting for connection...')
            try:
                self.connection_socket, self.address = self.sock.accept()
            except KeyboardInterrupt:
                # self.clean_up()
                sys.exit(0)
            print("Connected to {}:{}".format(self.address[0], self.address[1]))
        else:
            if not ip_address:
                raise RuntimeError('For client, ip address must be specified')

            # addr_port = ip_address, ip_port
            self.sock.connect((ip_address, ip_port))
            self.connection_socket = self.sock
            print('Connected to server on remote device',
                  self.connection_socket)
        # start the thread to receive messages from the esp8266
        self.start()

        # send system up message if other banyan components need a start trigger
        payload = {'sys_msg': 'system_up'}
        self.publish_payload(payload, 'sys_msg')

        # start the banyan receive loop
        try:
            self.receive_loop()
        except KeyboardInterrupt:
            self.clean_up()
            sys.exit(0)

    def init_pins_dictionary(self):
        """
        This method will initialize the pins dictionary contained
        in gateway base parent class. This method is called by
        the gateway base parent in its init method.

        NOTE: that this a a non-asyncio method
        :return:
        """
        # pins data structure
        # pins supported: GPIO4, GPIO5, GPIO12, GPIO13, GPIO14, GPIO15
        # modes - IN - PULL_UP, OUT - OPEN_DRAIN, PWM
        # irqs - Pin.IRQ_RISING | Pin.IRQ_FALLING

        # build a status table for the pins
        for x in self.gpio_pins:
            entry = {'mode': None, 'pull_up': False, 'drain': False,
                     'irq': None, 'duty': None, 'freq': None, 'count': 0,
                     'value': 0}
            self.pin_info[x] = entry

    def stop(self):
        """
        Called if the thread needs to be stopped
        :return:
        """
        self.stop_event.set()

    def is_stopped(self):
        """
        A test to determine if the thread is active or not
        :return:
        """
        return self.stop_event.is_set()

    def digital_write(self, topic, payload):
        """
        This method performs a digital write
        :param topic: message topic
        :param payload: {"command": "digital_write", "pin": “PIN”, "value":
        “VALUE”}
        """
        self.send_payload_to_esp(payload)

    def disable_analog_reporting(self, topic, payload):
        """
        This method disables analog input reporting for the selected pin.
        :param topic: message topic
        :param payload: {"command": "disable_analog_reporting", "pin": “PIN”,
        "tag": "TAG"}
        """
        payload_to_esp = {'command': 'disable_analog_reporting', 'pin': 0}
        self.send_payload_to_esp(payload_to_esp)

    def disable_digital_reporting(self, topic, payload):
        """
        This method disables digital input reporting for the selected pin.

        :param topic: message topic
        :param payload: {"command": "disable_digital_reporting", "pin":
        “PIN”, "tag": "TAG"}
        """
        payload_to_esp = {'command': 'disable_digital_reporting',
                          'pin': payload['pin']}
        self.send_payload_to_esp(payload_to_esp)

    def i2c_read(self, topic, payload):
        """
        This method will perform an i2c read by specifying the i2c
        device address, i2c device register and the number of bytes
        to read.

        Call set_mode_i2c first to establish the pins for i2c operation.

        :param topic: message topic
        :param payload: {"command": "i2c_read", "pin": “PIN”, "tag": "TAG",
                         "addr": “I2C ADDRESS, "register": “I2C REGISTER”,
                         "number_of_bytes": “NUMBER OF BYTES”}
        :return via the i2c_callback method
        """
        self.send_payload_to_esp(payload)

    def i2c_write(self, topic, payload):
        """
        This method will perform an i2c write for the i2c device with
        the specified i2c device address, i2c register and a list of byte
        to write.

        Call set_mode_i2c first to establish the pins for i2c operation.

        :param topic: message topic
        :param payload: {"command": "i2c_write", "pin": “PIN”, "tag": "TAG",
                         "addr": “I2C ADDRESS, "register": “I2C REGISTER”,
                         "data": [“DATA IN LIST FORM”]}
        """
        self.send_payload_to_esp(payload)

    def play_tone(self, topic, payload):
        """
        This method plays a tone on a piezo device connected to the selected
        pin at the frequency and duration requested.
        Frequency is in hz and duration in milliseconds.

        Call set_mode_tone before using this method.
        :param topic: message topic
        :param payload: {"command": "play_tone", "pin": “PIN”, "tag": "TAG",
                         “freq”: ”FREQUENCY”, duration: “DURATION”}
        """
        self.send_payload_to_esp(payload)

    def pwm_write(self, topic, payload):
        """
        This method sets the pwm value for the selected pin.
        Call set_mode_pwm before calling this method.
        :param topic: message topic
        :param payload: {“command”: “pwm_write”, "pin": “PIN”,
                         "tag":”TAG”,
                          “value”: “VALUE”}
        """
        self.send_payload_to_esp(payload)

    def servo_position(self, topic, payload):
        """
        This method will set a servo's position in degrees.
        Call set_mode_servo first to activate the pin for
        servo operation.

        :param topic: message topic
        :param payload: {'command': 'servo_position',
                         "pin": “PIN”,'tag': 'servo',
                        “position”: “POSITION”}
        """
        self.send_payload_to_esp(payload)

    def set_mode_analog_input(self, topic, payload):
        """
        This method sets a GPIO pin as analog input.
        :param topic: message topic
        :param payload: {"command": "set_mode_analog_input", "pin": “PIN”,
        "tag":”TAG” }
        """
        payload = {'command': 'set_mode_analog_input'}
        self.send_payload_to_esp(payload)

    def set_mode_digital_input(self, topic, payload):
        """
        This method sets a pin as digital input.
        :param topic: message topic
        :param payload: {"command": "set_mode_digital_input", "pin": “PIN”,
        "tag":”TAG” }
        """
        # self, pin, pull_up=True, irq='both', count=0

        pin = payload['pin']
        payload_to_esp = {'command': 'set_mode_digital_input', 'pin': pin,
                          'pull_up': True, 'irq': 'both',
                          'count': 0}
        if self.is_valid_pin(pin):
            self.pin_info[pin]['mode'] = GatewayBase.DIGITAL_INPUT_MODE

            if 'pull_up' in payload:
                payload_to_esp['pull_up'] = payload['pull_up']
                self.pin_info[pin][
                    'mode'] = GatewayBase.DIGITAL_INPUT_PULLUP_MODE
            self.pin_info[pin]['pull_up'] = payload_to_esp['pull_up']

            if 'irq' in payload:
                payload_to_esp['irq'] = payload['irq']
            self.pin_info[pin]['irq'] = payload_to_esp['irq']

            if 'count' in payload:
                payload_to_esp['count'] = payload['count']
            self.pin_info[pin]['count'] = payload_to_esp['count']

            self.send_payload_to_esp(payload)
        else:
            # invalid pin number
            raise RuntimeError('set_mode_digital_input - invalid pin:', pin)

    # elif cmd == 'get_in':

    def set_mode_digital_input_pullup(self, topic, payload):
        """
        This method sets a pin as digital input with pull up enabled.
        :param topic: message topic
        :param payload: message payload
        """
        payload['pull_up'] = True
        self.set_mode_digital_input(topic, payload)

    def set_mode_digital_output(self, topic, payload):
        """
        This method sets a pin as a digital output pin.
        :param topic: message topic
        :param payload: {"command": "set_mode_digital_output", "pin": PIN,
        "tag":”TAG” }
        """
        # for the esp8266, we set the pin mode when fulfilling the action
        # for example - digital write
        pass

    def set_mode_i2c(self, topic, payload):
        """
        This method sets up the i2c pins for i2c operations.
        :param topic: message topic
        :param payload: {"command": "set_mode_i2c"}
        """
        self.send_payload_to_esp(payload)

    def set_mode_pwm(self, topic, payload):
        """
         This method sets a GPIO pin capable of PWM for PWM operation.
         :param topic: message topic
         :param payload: {"command": "set_mode_pwm", "pin": “PIN”, "tag":”TAG” }
         """
        # not used by the esp8266 gateway
        pass

    def set_mode_servo(self, topic, payload):
        """
        This method establishes a GPIO pin for servo operation.
        :param topic: message topic
        :param payload: {"command": "set_mode_servo", "pin": “PIN”,
        "tag":”TAG” }
        """
        pass

    def set_mode_sonar(self, topic, payload):
        """
        This method sets the trigger and echo pins for sonar operation.
        :param topic: message topic
        :param payload: {"command": "set_mode_sonar", "trigger_pin": “PIN”,
        "tag":”TAG”
                         "echo_pin": “PIN”"tag":”TAG” }
        """
        self.send_payload_to_esp(payload)

    def set_mode_stepper(self, topic, payload):
        """
        This method establishes either 2 or 4 GPIO pins to be used in stepper
        motor operation.
        :param topic:
        :param payload:{"command": "set_mode_stepper", "pins": [“PINS”],
                        "steps_per_revolution": “NUMBER OF STEPS”}
        """
        self.send_payload_to_esp(payload)

    def set_mode_tone(self, topic, payload):
        """
        Establish a GPIO pin for tone operation.
        :param topic:
        :param payload:{"command": "set_mode_tone", "pin": “PIN”, "tag":”TAG” }
        """
        pass

    def stepper_write(self, topic, payload):
        """
        Move a stepper motor for the specified number of steps.
        :param topic:
        :param payload: {"command": "stepper_write", "motor_speed": “SPEED”,
                         "number_of_steps":”NUMBER OF STEPS” }
        """
        self.send_payload_to_esp(payload)

    def send_payload_to_esp(self, payload):
        """
        Encode and send payload/topic to esp8266
        :param payload:
        """

        # run it through json and send it out
        payload = json.dumps(payload)

        payload = payload.ljust(self.pkt_len).encode('utf-8')

        # send the data out
        self.connection_socket.sendall(payload)

    def is_valid_pin(self, pin):
        """
        validate pin
        :param pin: pin number
        :return: True or False
        """
        if self.validate_pin:
            if pin in self.pin_info:
                return True
            else:
                return False
        else:
            return True

    def run(self):
        """
        This is thread that receives packets from the eps8266
        :return:
        """

        while True:
            try:
                payload = self.connection_socket.recv(self.pkt_len)

                pkt_len_received = len(payload)
                # if the packet size is less than the fixed
                # length packet size - Nagle's algorithm,
                # keep receiving data for a complete packet
                while pkt_len_received < self.pkt_len:
                    wait_for = self.pkt_len - pkt_len_received
                    short_packet = self.connection_socket.recv(wait_for)
                    payload += short_packet
                    pkt_len_received += len(payload)
            except OSError:
                # we turned non-blocking on, so this exception is expected
                continue
            try:
                # perform a json decode
                # the data is in the form of a dictionary
                payload = json.loads(payload)
                # if 'report' in payload:
                #     if payload['report'] == 'i2c_data':
                #         print(payload)

                payload['timestamp'] = time.time()
                self.publish_payload(payload, 'from_esp8266_gateway')

            except ValueError:
                print('EspWiFiBridge -  data: {} length {}'.format(
                    payload, len(payload)))
                raise ValueError


def esp8266_gateway():
    # allow user to bypass the IP address auto-discovery. This is necessary
    # if the component resides on a computer
    # other than the computing running the backplane.

    parser = argparse.ArgumentParser()
    parser.add_argument("-b", dest="back_plane_ip_address", default="None",
                        help="None or IP address used by Back Plane")
    parser.add_argument("-c", dest="connection_mode", default="client",
                        help="client or server")
    # allow the user to specify a name for the component and have it shown on
    # the console banner.
    # modify the default process name to one you wish to see on the banner.
    # change the default in the derived class to set the name
    parser.add_argument("-m", dest="subscriber_list",
                        default="to_esp8266_gateway", nargs='+',
                        help="Banyan topics space delimited: topic1 topic2 "
                             "topic3")
    # allow the user to specify a name for the component and have it shown on
    # the console banner.
    # modify the default process name to one you wish to see on the banner.
    # change the default in the derived class to set the name
    parser.add_argument("-i", dest="ip_address", default="None",
                        help="None or IP address of remote device if running "
                             "in client mode")
    parser.add_argument("-l", dest="ip_packet_length", default=96,
                        help="IP packet length - must match remote device")
    parser.add_argument("-p", dest="publisher_port", default='43124',
                        help="Publisher IP port")
    parser.add_argument("-s", dest="subscriber_port", default='43125',
                        help="Subscriber IP port")
    parser.add_argument("-t", dest="ip_port", default="31337",
                        help="ip connection port")
    parser.add_argument("-x", dest="validate_pin", default="True",
                        help="Validate Pin Number - True or False")

    args = parser.parse_args()

    validate_pin = args.validate_pin.lower()
    if validate_pin == 'false':
        validate_pin = False
    else:
        validate_pin = True

    kw_options = {
        'connection_mode': args.connection_mode,
        'ip_address': args.ip_address,
        'ip_packet_length': args.ip_packet_length,
        'ip_port': int(args.ip_port),
        'validate_pin': validate_pin
    }

    if args.back_plane_ip_address != 'None':
        kw_options['back_plane_ip_address'] = args.back_plane_ip_address

    # replace with the name of your class
    Esp8266Gateway(args.subscriber_list, **kw_options)

    Esp8266Gateway()


def signal_handler(sig, frame):
    print('Exiting Through Signal Handler')
    raise KeyboardInterrupt


# listen for SIGINT
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

if __name__ == '__main__':
    # replace with name of function you defined above
    esp8266_gateway()
