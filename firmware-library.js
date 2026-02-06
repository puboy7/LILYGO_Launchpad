// 设备列表（修改图片地址和设备信息）
export const deviceList = [
    {
        label: "设备A",
        value: "DEVICE_A",
        chip: "ESP32_C3",
        img: "images/device-a.png"
    },
    {
        label: "设备B",
        value: "DEVICE_B",
        chip: "ESP32_C3",
        img: "images/device-b.png"
    },
    {
        label: "设备C",
        value: "DEVICE_C",
        chip: "ESP8266",
        img: "images/device-c.png"
    },
    {
        label: "设备D",
        value: "DEVICE_D",
        chip: "ESP32_S3",
        img: "images/device-d.png"
    }
];

// 固件地址映射（自动填充对应设备的固件地址）
export const firmwareAddressMap = {
    "DEVICE_A": {
        main: "0x000000",       // 主固件地址
        partition: "0x080000"   // 分区表地址
    },
    "DEVICE_B": {
        main: "0x000000",
        partition: "0x080000"
    },
    "DEVICE_C": {
        main: "0x000000"        // ESP8266无分区表
    },
    "DEVICE_D": {
        main: "0x000000",
        partition: "0x080000"
    }
};