// 1. 设备列表（ABCD自定义型号，关联对应芯片型号）
export const deviceList = [
    { label: "T-Deck", value: "DEVICE_A", chip: "ESP32_C3" }, // 设备A用ESP32-C3芯片
    { label: "设备B", value: "DEVICE_B", chip: "ESP32_C3" }, // 设备B和A同芯片
    { label: "设备C", value: "DEVICE_C", chip: "ESP8266" },  // 设备C用ESP8266芯片
    { label: "设备D", value: "DEVICE_D", chip: "ESP32_S3" }, // 设备D用ESP32-S3芯片
    { label: "设备E", value: "DEVICE_E", chip: "ESP32_S3" }, // 设备E和D同芯片
];

// 2. 固件库（按芯片型号分类，同一芯片可对应多个固件文件）
export const firmwareLibrary = {
    // ESP32-C3芯片对应的固件（设备A、B共用）
    "ESP32_C3": [
        {
            address: 0x00000, // Flash起始地址
            data: new Uint8Array([/* 替换为ESP32-C3固件二进制数据 */]),
            name: "设备A/B_主固件_v1.0.bin"
        },
        {
            address: 0x8000, // 分区表地址
            data: new Uint8Array([/* 替换为ESP32-C3分区表二进制数据 */]),
            name: "分区表_partitions.bin"
        }
    ],
    // ESP8266芯片对应的固件（设备C专用）
    "ESP8266": [
        {
            address: 0x00000,
            data: new Uint8Array([/* 替换为ESP8266固件二进制数据 */]),
            name: "设备C_固件_v2.1.bin"
        }
    ],
    // ESP32-S3芯片对应的固件（设备D、E共用）
    "ESP32_S3": [
        {
            address: 0x00000,
            data: new Uint8Array([/* 替换为ESP32-S3固件二进制数据 */]),
            name: "设备D/E_应用固件_v1.5.bin"
        }
    ]
};