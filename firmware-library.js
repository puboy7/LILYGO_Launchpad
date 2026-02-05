// 设备列表（ABCD型号+关联芯片+产品图片地址，图片放在images文件夹）
export const deviceList = [
    {
        label: "T-Deck",
        value: "DEVICE_A",
        chip: "ESP32_C3",
        img: "images/device-a.png" // 设备A产品图片
    },
    {
        label: "设备B",
        value: "DEVICE_B",
        chip: "ESP32_C3",
        img: "images/device-b.png" // 设备B产品图片
    },
    {
        label: "设备C",
        value: "DEVICE_C",
        chip: "ESP8266",
        img: "images/device-c.png" // 设备C产品图片
    },
    {
        label: "设备D",
        value: "DEVICE_D",
        chip: "ESP32_S3",
        img: "images/device-d.png" // 设备D产品图片
    },
    {
        label: "设备E",
        value: "DEVICE_E",
        chip: "ESP32_S3",
        img: "images/device-e.png" // 设备E产品图片
    },
];

// 固件库（按芯片分类，同一芯片设备共用固件，无需修改）
export const firmwareLibrary = {
    // ESP32-C3芯片（设备A、B共用）
    "ESP32_C3": [
        {
            address: 0x00000,
            data: new Uint8Array([/* 替换为ESP32-C3固件二进制数据 */]),
            name: "设备A/B_主固件_v1.0.bin"
        },
        {
            address: 0x8000,
            data: new Uint8Array([/* 替换为ESP32-C3分区表数据 */]),
            name: "分区表_partitions.bin"
        }
    ],
    // ESP8266芯片（设备C专用）
    "ESP8266": [
        {
            address: 0x00000,
            data: new Uint8Array([/* 替换为ESP8266固件二进制数据 */]),
            name: "设备C_固件_v2.1.bin"
        }
    ],
    // ESP32-S3芯片（设备D、E共用）
    "ESP32_S3": [
        {
            address: 0x00000,
            data: new Uint8Array([/* 替换为ESP32-S3固件二进制数据 */]),
            name: "设备D/E_应用固件_v1.5.bin"
        }
    ]
};