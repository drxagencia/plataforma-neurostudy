export const PixService = {
  // Normalize text to uppercase ASCII (removes accents)
  normalizeText: (str: string): string => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "") // Keep alphanumeric and spaces
      .toUpperCase();
  },

  // Calculate CRC16 (CCITT-FALSE) for EMV standard
  crc16: (buffer: string): string => {
    let crc = 0xFFFF;
    for (let i = 0; i < buffer.length; i++) {
        crc = ((crc >>> 8) | (crc << 8)) & 0xffff;
        crc ^= (buffer.charCodeAt(i) & 0xff00);
        crc ^= ((crc >>> 4) | (crc << 4)) & 0xffff;
        crc ^= ((crc >>> 12) | (crc << 12)) & 0xffff;
        crc ^= ((crc & 0xff) << 5) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  },

  formatField: (id: string, value: string): string => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  },

  generatePayload: (amount: number): string => {
    const key = "02976592438"; // CPF Key
    // Standardize Name and City: No accents, limited length
    const name = PixService.normalizeText("NeuroStudy User").substring(0, 25);
    const city = PixService.normalizeText("SAO PAULO").substring(0, 15);
    const txtId = "***"; // Transaction ID (*** allows dynamic payment in some banks, or use valid ID)
    
    const amountStr = amount.toFixed(2);

    // Build Payload following strictly EMV QRCPS-MPM
    const payloadStart = 
      PixService.formatField("00", "01") + // Payload Format Indicator
      PixService.formatField("01", "11") + // Point of Initiation Method (12 for dynamic, 11/empty for static)
      PixService.formatField("26", // Merchant Account Information
        PixService.formatField("00", "BR.GOV.BCB.PIX") +
        PixService.formatField("01", key)
      ) +
      PixService.formatField("52", "0000") + // Merchant Category Code (General)
      PixService.formatField("53", "986") + // Transaction Currency (BRL)
      PixService.formatField("54", amountStr) + // Transaction Amount
      PixService.formatField("58", "BR") + // Country Code
      PixService.formatField("59", name) + // Merchant Name
      PixService.formatField("60", city) + // Merchant City
      PixService.formatField("62", // Additional Data Field Template
        PixService.formatField("05", txtId)
      ) +
      "6304"; // CRC16 ID + Length

    // Calculate CRC
    const crc = PixService.crc16(payloadStart);
    return payloadStart + crc;
  }
};