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
    var main = async function () {
        // Based on https://googlechrome.github.io/samples/web-bluetooth/notifications.html?service=battery_service&characteristic=battery_level
        var requestDataOptionsJSON = JSON.stringify({
            filters: [{
                services: ['battery_service']
            }]
        });

        var deviceRefnum = await invokeAsWebVI('webvi_web_bluetooth.requestDevice', [
            requestDataOptionsJSON,
            '#start_button',
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

        console.log(value[0]);
    };

    // Run test
    domContentLoaded().then(() => main()).catch((ex) => {
        document.getElementById('error_box').textContent = ex.message;
        console.error(ex);
    });
}());
