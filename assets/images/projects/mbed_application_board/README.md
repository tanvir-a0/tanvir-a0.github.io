# Application Board for mbed NXP LPC1768 — Practice Log

This repository tracks my hands-on practice with the mbed NXP LPC1768 Application Board. Each folder name represents a task or mini-project I completed. These are mostly PlatformIO projects. I also added the libraries I used in a separate folder.

Important: All projects in this repository were built and flashed using PlatformIO (not Keil Studio). Many examples online use Keil Studio, but here everything targets PlatformIO in VS Code.

Special thanks to my friend Samin Sadiq Orin for lending me his board, which I used to practice and test all the code on.

## Keywords

mbed, NXP LPC1768, LPC1768, mbed Application Board, PlatformIO, Keil Studio Cloud, mbed Studio, ARM Cortex-M3, C12832 LCD, LCD fonts, MMA7660, accelerometer, joystick, RGB LED, potentiometer, temperature sensor, SPI, I2C, PWM, ADC, Ethernet, WebSocket, USB host, USB-A, HID keyboard, HID mouse, MSCFileSystem, Snake game, debugging on LCD

## Tasks Completed

- [1_blink](1_blink/) — Basic LED blink on the LPC1768 board. (This is just cpp file, put it in the template code for running it)
- [2_serial_blink](2_serial_blink/) — LED blink with serial logging for timing/feedback. (This is just cpp file, put it in the template code for running it)
- [3_lcd_disply_testing](3_lcd_disply_testing/) — Initial bring-up of the C12832 LCD; printed text and simple graphics.
- [4_joystick_testing](4_joystick_testing/) — Explored joystick input:
	- [simple_and_manual_code](4_joystick_testing/simple_and_manual_code/) — Polled and debounced joystick manually.
	- [complex_code](4_joystick_testing/complex_code/) — Structured input handling and state management.
- [5_using_lcd_for_debugging_function](5_using_lcd_for_debugging_function/) — Used the LCD to display runtime variables and debug info.
- [6_using_the_speaker_with_the_display](6_using_the_speaker_with_the_display/) — Played tones/sound effects alongside on-screen updates.
- [7_testing_the_MMA7660](7_testing_the_MMA7660/) — Read accelerometer (MMA7660) values and visualized orientation.
- [8_rgb_led](8_rgb_led/) — Drove RGB LED with PWM for color mixing and effects.
- [9_temperature_sensor_not_calibrated_properly](9_temperature_sensor_not_calibrated_properly/) — Read temperature sensor; noted calibration offset still unresolved.
- [10_potentiometer_testing](10_potentiometer_testing/) — Read analog input from a potentiometer and mapped to output.
- [11_snake_game_using_display_and_joystick](11_snake_game_using_display_and_joystick/) — Built a simple Snake game on the LCD controlled by the joystick.
- [12_etharnet_connectivity_test](12_etharnet_connectivity_test/) — Attempted Ethernet connectivity tests (DHCP/requests basic checks).
- [13_testing_keyboard_output](13_testing_keyboard_output/) — Tested keyboard/HID-style output signaling from the board.
- [14_integrating_joystick_led_and_keyboard_output](14_integrating_joystick_led_and_keyboard_output/) — Combined joystick input with RGB LED feedback and keyboard-style output.
- [15_mouse_display_joystick](15_mouse_display_joystick/) — Integrated mouse-style movement with display rendering and joystick control.
- [16_MMA7660_and_lcd_display](16_MMA7660_and_lcd_display/) — Combined accelerometer readings with LCD visualization.

## Project Structure

- Numbered folders — Individual tasks or demos (many as PlatformIO projects).
- Library I Used/ — Support libraries for LCD, fonts, and MMA7660 used by several tasks.
- Template Code/ — Starter PlatformIO scaffold used to spin up new tasks quickly.
- Using Mbed Studio/ — Notes relevant to using Keil Studio/Mbed tooling.

## Build & Run Notes

- All tasks are PlatformIO-based. Open a task folder in VS Code and use PlatformIO to build and upload.
- When using the PlatformIO Project Wizard, select Board: NXP mbed LPC1768 and Framework: Mbed.
- After flashing, press the board button/reset to start the new program, if needed.
- Board reference: https://docs.platformio.org/en/latest/boards/nxplpc/lpc1768.html#board-nxplpc-lpc1768 (The file is  also downloaded as PDF named platformI-board-nxplpc-lpc1768)
- This is the board from the official website: https://os.mbed.com/components/mbed-Application-Board/ (This file is also downloaded as PDF named Official Documentation)
- Keil Studio (online mbed tooling): https://studio.keil.arm.com/ (I tried to use it but I faced some problem. More details: [Using Mbed Studio or Keil Studio/README.md](Using%20Mbed%20Studio%20or%20Keil%20Studio/README.md))

## Known Issues / Attempts

- I tried implementing WebSocket communication using the Ethernet port and accessing the USB-A port (a pen drive) on the mbed application board but could not get either working. For USB, I wasn't able to set up the MSCFileSystem.

## Gallery

### PlatformIO Configuration
<img src="image.png" alt="PlatformIO Project Wizard — Board: NXP mbed LPC1768, Framework: Mbed" width="300">

*PlatformIO Project Wizard — Board: NXP mbed LPC1768, Framework: Mbed*

#### LCD Display Output
<img src="images/showing_time_and_counter_in_serial_blink.jpg" alt="BUilt in display showing time and counter from blink program" width="300">

*Built-in display showing time and counter from blink program*

#### Speaker Testing
<img src="images/playing_sound.png" alt="Playing sound with speaker and display (you can't hear image :) )" width="300">

*Playing sound with speaker and display (you can't hear image :) )*

#### Accelerometer & LCD Display
<img src="images/MMA7660_and_lcd.jpg" alt="MMA7660 accelerometer readings showing on the LCD display along with the bubble" width="300">

*MMA7660 accelerometer readings showing on the LCD display along with the bubble*

#### Snake Game
<img src="images/snake_game.png" alt="Snake game running on LCD display with joystick control" width="300">

*Snake game running on LCD display with joystick control*

#### Keyboard Output & HID
<img src="images/keyboard_initialization.jpg" alt="Keyboard initialization on LCD" width="300">

*Keyboard initialization on LCD*

<img src="images/testing_keyboard_output_making_the_device_act_like_a_keyboard.jpg" alt="Testing keyboard output - device acting as keyboard" width="300">

*Testing keyboard output - device acting as keyboard*

<img src="images/typing_as_a_keyboard.jpg" alt="Device typing as a keyboard" width="300">

*Device typing as a keyboard*

#### Ethernet Connectivity (Failed Attempt)
<img src="images/display_showing_the_ip_note_this_experiment_failed.jpg" alt="Display showing IP address - note this experiment failed" width="300">

*Display showing IP address - note this experiment failed*

### Setup & Board
<img src="image-1.png" alt="LPC1768 Application Board" width="300">

*LPC1768 Application Board*

<img src="images/keil studio view in my laptop with my table.jpg" alt="Development setup with Keil Studio on laptop" width="300">

*Development setup with Keil Studio on laptop*
