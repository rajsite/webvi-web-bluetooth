(function () {
    'use strict';

    // General helper functions
    var domContentLoaded = function () {
        return new Promise(function (resolve) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => resolve());
            } else {
                resolve();
            }
        });
    };

    // Aliases
    var invokeAsWebVI = window.webvisimulator.invokeAsWebVI;

    // Test code
    var batteryEnable = async function () {
        // Based on https://googlechrome.github.io/samples/web-bluetooth/notifications.html?service=battery_service&characteristic=battery_level
        try {
            var requestDataOptionsJSON = JSON.stringify({
                filters: [{
                    services: ['battery_service']
                }]
            });

            var deviceRefnum = await invokeAsWebVI('webvi_web_bluetooth.requestDevice', [
                requestDataOptionsJSON,
                '#battery_connect',
                'click'
            ]);

            var gattServerRefnum = await invokeAsWebVI('webvi_web_bluetooth.gattServerConnect', [
                deviceRefnum
            ]);

            var serviceRefnum = await invokeAsWebVI('webvi_web_bluetooth.getPrimaryService', [
                gattServerRefnum,
                'battery_service'
            ]);

            var characteristicRefnum = await invokeAsWebVI('webvi_web_bluetooth.getCharacteristic', [
                serviceRefnum,
                'battery_level'
            ]);

            var value = await invokeAsWebVI('webvi_web_bluetooth.readValue', [
                characteristicRefnum
            ]);

            window.battery_result.value = value;

            invokeAsWebVI('webvi_web_bluetooth.gattServerDisconnect', [
                deviceRefnum
            ]);
        } catch (ex) {
            window.battery_error.value = ex.message;
            console.error(ex);
        }
    };

    var getPlaybulbRGBColorArray = function () {
        return window.playbulb_color.value.match(/#([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])/).slice(1).map(hex => parseInt(hex, 16));
    };

    var playbulbError = function (ex) {
        window.playbulb_error.value = ex.message;
        console.error(ex);
    };

    var playbulbEnable = async function () {
        /* eslint-disable no-magic-numbers */
        // Based on https://googlecodelabs.github.io/candle-bluetooth/playbulbCandle.js
        try {
            const CANDLE_SERVICE_UUID = invokeAsWebVI('webvi_web_bluetooth.canonicalUUID', [
                0xFF02
            ]);
            // const CANDLE_DEVICE_NAME_UUID = invokeAsWebVI('webvi_web_bluetooth.canonicalUUID', [
            //     0xFFFF
            // ]);
            const CANDLE_COLOR_UUID = invokeAsWebVI('webvi_web_bluetooth.canonicalUUID', [
                0xFFFC
            ]);
            // const CANDLE_EFFECT_UUID = invokeAsWebVI('webvi_web_bluetooth.canonicalUUID', [
            //     0xFFFB
            // ]);

            var requestDataOptionsJSON = JSON.stringify({
                filters: [{
                    services: [CANDLE_SERVICE_UUID]
                }]
            });

            var deviceRefnum = await invokeAsWebVI('webvi_web_bluetooth.requestDevice', [
                requestDataOptionsJSON,
                '#playbulb_connect',
                'click'
            ]);

            var gattServerRefnum = await invokeAsWebVI('webvi_web_bluetooth.gattServerConnect', [
                deviceRefnum
            ]);

            var serviceRefnum = await invokeAsWebVI('webvi_web_bluetooth.getPrimaryService', [
                gattServerRefnum,
                CANDLE_SERVICE_UUID
            ]);

            var characteristicRefnum = await invokeAsWebVI('webvi_web_bluetooth.getCharacteristic', [
                serviceRefnum,
                CANDLE_COLOR_UUID
            ]);

            // var value = await invokeAsWebVI('webvi_web_bluetooth.readValue', [
            //     characteristicRefnum
            // ]);

            // window.battery_result.value = value;

            window.playbulb_send.onclick = async function () {
                await invokeAsWebVI('webvi_web_bluetooth.writeValue', [
                    characteristicRefnum,
                    new Uint8Array([0x00, ...getPlaybulbRGBColorArray()])
                ]).catch(playbulbError);
            };

            window.playbulb_disconnect.onclick = async function () {
                try {
                    invokeAsWebVI('webvi_web_bluetooth.gattServerDisconnect', [
                        deviceRefnum
                    ]);
                } catch (ex) {
                    playbulbError(ex);
                }
            };
        } catch (ex) {
            playbulbError(ex);
        }
    };

    // Run test
    domContentLoaded().then(() => {
        window.battery_enable.onclick = batteryEnable;
        window.playbulb_enable.onclick = playbulbEnable;
    });
}());
