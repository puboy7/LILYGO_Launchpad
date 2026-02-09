// 设备列表（定制版：每个设备绑定多固件版本，路径按你的需求配置）
export const deviceList = [
    {
        label: "T-Deck",
        value: "T-Deck/T-Deck Plus",
        chip: "ESP32_S3",
        img: "images/t-deck.svg",
        defaultAddr: "0x000000",
        // 该设备的固件版本列表（name-显示名，path-实际固件路径）
        firmwareVersions: [
            { name: "UnitTest_251113", path: "firmware/T-deck/T-Deck_UnitTest_251113.bin" },
            { name: "UnitTest_250000", path: "firmware/T-deck/T-Deck_UnitTest_251113.bin" }
        ]
    },
    {
        label: "T-Deck Pro",
        value: "T-Deck Pro",
        chip: "ESP32_S3",
        img: "images/tdeck_pro.svg",
        defaultAddr: "0x000000",
        firmwareVersions: [
            { name: "Default_Firmware", path: "firmware/T-Deck Pro/ESP32-C3.bin" }
        ]
    },
    {
        label: "T-LoRa Pager",
        value: "T-LoRa Pager",
        chip: "ESP32_S3",
        img: "images/lilygo-tlora-pager.svg",
        defaultAddr: "0x000000",
        firmwareVersions: [
            { name: "Default_Firmware", path: "firmware/T-LoRa Pager/ESP8266.bin" }
        ]
    },
    {
        label: "T3-S3",
        value: "T3-S3",
        chip: "ESP32_S3",
        img: "images/tlora-t3s3-v1.svg",
        defaultAddr: "0x000000",
        firmwareVersions: [
            { name: "Default_Firmware", path: "firmware/T3-S3/ESP32-C3.bin" }
        ]
    },
    {
        label: "T3-S3 E-Paper",
        value: "T3-S3 E-Paper",
        chip: "ESP32_S3",
        img: "images/tlora-t3s3-epaper.svg",
        defaultAddr: "0x000000",
        firmwareVersions: [
            { name: "Default_Firmware", path: "firmware/T3-S3 E-Paper/ESP32-C3.bin" }
        ]
    },
    {
        label: "T-Beam Supreme",
        value: "T-Beam Supreme",
        chip: "ESP32_S3",
        img: "images/tbeam-s3-core.svg",
        defaultAddr: "0x000000",
        firmwareVersions: [
            { name: "Default_Firmware", path: "firmware/T-Beam Supreme/ESP32-C3.bin" }
        ]
    }
];