// 设备列表（修改图片地址和设备信息）
export const deviceList = [
    {
        label: "T-Deck",
        value: "T-Deck",
        chip: "ESP32_S3",
        img: "images/t-deck.svg",
        defaultAddr: "0x000000", // ESP32-C3默认烧录地址
        firmwarePath: "firmware/T-deck/T-Deck_UnitTest_251113.bin" // 对应固件路径
    },
    {
        label: "设备B",
        value: "DEVICE_B",
        chip: "ESP32_C3",
        img: "images/device-b.png",
        defaultAddr: "0x000000", // ESP32-C3默认烧录地址
        firmwarePath: "firmware/ESP32-C3.bin" // 对应固件路径
    },
    {
        label: "设备C",
        value: "DEVICE_C",
        chip: "ESP8266",
        img: "images/device-c.png",
        defaultAddr: "0x000000", // ESP8266默认烧录地址
        firmwarePath: "firmware/ESP8266.bin" // 对应固件路径
    },
    {
        label: "设备D",
        value: "DEVICE_D",
        chip: "ESP32_S3",
        img: "images/device-d.png",
        defaultAddr: "0x000000", // ESP32-C3默认烧录地址
        firmwarePath: "firmware/ESP32-C3.bin" // 对应固件路径
    }
];