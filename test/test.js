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

    // Run test
    domContentLoaded().then(() => {
        window.battery_enable.onclick = batteryEnable;
    });
}());
