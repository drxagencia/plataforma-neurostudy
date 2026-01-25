
export const PixService = {
  // Calcula o CRC16 (CCITT-FALSE) necessário para o padrão EMV
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
    const name = "NeuroStudy User"; // Merchant Name (Max 25 chars)
    const city = "SAO PAULO"; // Merchant City (Max 15 chars)
    const txtId = "***"; // Transaction ID (*** allows any)
    
    const amountStr = amount.toFixed(2);

    // Build Payload
    let payload = 
      PixService.formatField("00", "01") + // Payload Format Indicator
      PixService.formatField("26", // Merchant Account Information
        PixService.formatField("00", "BR.GOV.BCB.PIX") +
        PixService.formatField("01", key)
      ) +
      PixService.formatField("52", "0000") + // Merchant Category Code
      PixService.formatField("53", "986") + // Transaction Currency (BRL)
      PixService.formatField("54", amountStr) + // Transaction Amount
      PixService.formatField("58", "BR") + // Country Code
      PixService.formatField("59", name) + // Merchant Name
      PixService.formatField("60", city) + // Merchant City
      PixService.formatField("62", // Additional Data Field Template
        PixService.formatField("05", txtId)
      ) +
      "6304"; // CRC16 ID + Length (placeholder)

    // Calculate CRC
    const crc = PixService.crc16(payload);
    return payload + crc;
  }
};
