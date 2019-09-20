#!/usr/bin/env python

# servo_demo.py
# 2016-10-07
# Public Domain

# servo_demo.py          # Send servo pulses to GPIO 4.
# servo_demo.py 23 24 25 # Send servo pulses to GPIO 23, 24, 25.

import sys
import time
import random
import pigpio

NUM_GPIO = 32

MIN_WIDTH = 500
MAX_WIDTH = 2500

step = [0] * NUM_GPIO
width = [0] * NUM_GPIO
used = [False] * NUM_GPIO

pi = pigpio.pi()

if not pi.connected:
    exit()

G = [4]


for g in G:
    used[g] = True
    step[g] = random.randrange(50, 55)
    if step[g] % 2 == 0:
        step[g] = -step[g]
    width[g] = random.randrange(MIN_WIDTH, MAX_WIDTH + 1)

print("Sending servos pulses to GPIO {}, control C to stop.".
      format(' '.join(str(g) for g in G)))

while True:

    try:

        for g in G:

            pi.set_servo_pulsewidth(g, width[g])

            # print(g, width[g])

            width[g] += step[g]

            if width[g] < MIN_WIDTH or width[g] > MAX_WIDTH:
                step[g] = -step[g]
                width[g] += step[g]

        time.sleep(0.01)

    except KeyboardInterrupt:
        break

print("\nTidying up")

for g in G:
    pi.set_servo_pulsewidth(g, 0)

pi.stop()
