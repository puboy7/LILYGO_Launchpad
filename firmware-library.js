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
            { name: "UnitTest_251113", path: "firmware/T-deck/T-Deck_UnitTest.bin" }
            // { name: "UnitTest_250000", path: "firmware/T-deck/T-Deck_UnitTest_251113.bin" }
        ]
    },
    {
        label: "T-Deck Pro",
        value: "T-Deck Pro",
        chip: "ESP32_S3",
        img: "images/tdeck_pro.svg",
        defaultAddr: "0x000000",
        firmwareVersions: [
            { name: "Factory_Firmware", path: "firmware/T-deck-pro/T-Deck-pro.bin" },
        ]
    },
    {
        label: "T-LoRa Pager",
        value: "T-LoRa Pager",
        chip: "ESP32_S3",
        img: "images/lilygo-tlora-pager.svg",
        defaultAddr: "0x000000",
        firmwareVersions: [
            { name: "T-LoRa-pager-Factory-LR1121", path: "firmware/T-LoRa-pager/T-LoRa-pager-Factory-LR1121.bin" },
            { name: "T-LoRa-pager-Factory-SX1262", path: "firmware/T-LoRa-pager/T-LoRa-pager-Factory-SX1262.bin" }
        ]
    },
    {
        label: "T3",
        value: "T3",
        chip: "ESP32_S3/ESP32",
        img: "images/tlora-t3s3-v1.svg",
        defaultAddr: "0x000000",
        firmwareVersions: [
            { name: "LoRa32-V1_3-Recv-868M", path: "firmware/T3/LoRa32-V1_3-Recv-868M.bin" },
            { name: "LoRa32-V1_3-Send-868M", path: "firmware/T3/LoRa32-V1_3-Send-868M.bin" },
            { name: "LoRa32-V1_3-Recv-915M", path: "firmware/T3/LoRa32-V1_3-Recv-915M.bin" },
            { name: "LoRa32-V1_3-Send-915M", path: "firmware/T3/LoRa32-V1_3-Send-915M.bin" },
            { name: "LoRa32-V1_6_1-Recv-433M", path: "firmware/T3/LoRa32-V1_6_1-Recv-433M.bin" },
            { name: "LoRa32-V1_6_1-Send-433M", path: "firmware/T3/LoRa32-V1_6_1-Send-433M.bin" },
            { name: "LoRa32-V1_6_1-Recv-868M", path: "firmware/T3/LoRa32-V1_6_1-Recv-868M.bin" },
            { name: "LoRa32-V1_6_1-Send-868M", path: "firmware/T3/LoRa32-V1_6_1-Send-868M.bin" },
            { name: "LoRa32-V1_6_1-Recv-915M", path: "firmware/T3/LoRa32-V1_6_1-Recv-915M.bin" },
            { name: "LoRa32-V1_6_1-Send-915M", path: "firmware/T3/LoRa32-V1_6_1-Send-915M.bin" },
            
            { name: "T3_S3-V1_2_LR1121_Factory", path: "firmware/T3/T3_S3-V1_2_LR1121_Factory.bin" },
            { name: "T3_S3-V1_2_SX1262_Factory", path: "firmware/T3/T3_S3-V1_2_SX1262_Factory.bin" },
            { name: "T3_S3-V1_2_SX1276_Factory", path: "firmware/T3/T3_S3-V1_2_SX1276_Factory.bin" },
            { name: "T3_S3-V1_2_SX1278_Factory", path: "firmware/T3/T3_S3-V1_2_SX1278_Factory.bin" },
            { name: "T3_S3-V1_2_SX1280_Factory", path: "firmware/T3/T3_S3-V1_2_SX1280_Factory.bin" },
            { name: "T3_S3-V1_2_SX1280_PA_Factory", path: "firmware/T3/T3_S3-V1_2_SX1280_PA_Factory.bin" },
            

            { name: "T3_V3-TXCO_Recv", path: "firmware/T3/T3_V3_TXCO_Recv.bin" },
            { name: "T3_V3-TXCO_Send", path: "firmware/T3/T3_V3_TXCO_Send.bin" },

            { name: "T3_C6-Recv", path: "firmware/T3/T3-C6_Receive_868_BW125_OP22_CL140_SF8.bin" },
            { name: "T3_V3-Send", path: "firmware/T3/T3-C6_Transmit_868_BW125_OP22_CL140_SF8.bin" }


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
        label: "T-Watch-S3",
        value: "T-Watch-S3",
        chip: "ESP32_S3",
        img: "images/t-watch-s3.svg",
        defaultAddr: "0x000000",
        firmwareVersions: [
            { name: "T-Watch-S3-SX1262", path: "firmware/T-Watch/T-Watch-s3-sx1262.bin" },
            { name: "T-Watch-S3-SX1280", path: "firmware/T-Watch/T-Watch-s3-sx1280.bin" },
            { name: "T-Watch-S3-Ultra", path: "firmware/T-Watch/T-Watch-ultra-sx1262.bin"} 
        ]
    },
    {
        label: "T-Beam",
        value: "T-Beam",
        chip: "ESP32_S3",
        img: "images/tbeam.svg",
        defaultAddr: "0x000000",
        firmwareVersions: [
            { name: "SX1262_Factory", path: "firmware/T-Beam/T_BEAM_SX1262_Factory.bin" },
            { name: "SX1276_Factory" , path: "firmware/T-Beam/T_BEAM_SX1276_Factory.bin" },    
            { name: "SX1278_Factory", path: "firmware/T-Beam/T_BEAM_SX1278_Factory.bin" },
        ]
    },
    {
        label: "T-Beam Supreme",
        value: "T-Beam Supreme",
        chip: "ESP32_S3",
        img: "images/tbeam-s3-core.svg",
        defaultAddr: "0x000000",
        firmwareVersions: [
            { name: "LR1121_920Mhz_Factory", path: "firmware/T-Beam-Supme/T_BEAM_S3_SUPREME_LR1121_Factory_920Mhz.bin" },
            { name: "LR1121_AllFreband_Factory", path: "firmware/T-Beam-Supme/T_BEAM_S3_SUPREME_LR1121_Factory_AllFreqband.bin" },
            { name: "SX1262_920Mhz_Factory", path: "firmware/T-Beam-Supme/T_BEAM_S3_SUPREME_SX1262_Factory_920Mhz.bin" },
            { name: "SX1262_AllFreband_Factory", path: "firmware/T-Beam-Supme/T_BEAM_S3_SUPREME_SX1262_Factory_AllFreqband.bin" }
        ]
    },
    {
        label: "T-Display",
        value: "T-Display",
        chip: "ESP32_S3",
        img: "images/t-display.svg",
        defaultAddr: "0x000000",
        firmwareVersions: [
            { name: "Default_Firmware", path: "firmware/T-Beam Supreme/ESP32-C3.bin" }
        ]
    }        
    
];