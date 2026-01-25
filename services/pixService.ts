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
    const amountStr = amount.toFixed(2);

    // Build Payload following strictly the working example provided:
    // 00020126330014BR.GOV.BCB.PIX011102976592438520400005303986540520.005802BR5901N6001C62070503***6304
    
    // Note: The example provided omits the root Field 01 (Point of Initiation Method), 
    // and uses "N" and "C" for Name and City. We duplicate this structure for compatibility.
    
    const payloadStart = 
      PixService.formatField("00", "01") + 
      // Field 01 (Point of Initiation) is OMITTED in the working example, so we omit it here too.
      PixService.formatField("26",
        PixService.formatField("00", "BR.GOV.BCB.PIX") +
        PixService.formatField("01", key)
      ) +
      PixService.formatField("52", "0000") +
      PixService.formatField("53", "986") + // BRL
      PixService.formatField("54", amountStr) +
      PixService.formatField("58", "BR") +
      PixService.formatField("59", "N") + // Using "N" to match working example validation
      PixService.formatField("60", "C") + // Using "C" to match working example validation
      PixService.formatField("62",
        PixService.formatField("05", "***")
      ) +
      "6304"; // CRC16 ID + Length

    const crc = PixService.crc16(payloadStart);
    return payloadStart + crc;
  }
};