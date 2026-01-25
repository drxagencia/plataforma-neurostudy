
export const PixService = {
  // Normalize text: Uppercase, remove accents, keep only valid PIX characters
  normalize: (text: string): string => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-zA-Z0-9 ]/g, "")   // Remove special chars
      .toUpperCase()
      .trim();
  },

  // Helper to create EMV fields: ID + LENGTH (2 digits) + VALUE
  createField: (id: string, value: string): string => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  },

  // CRC16-CCITT (0x1021) calculation standard for PIX
  getCRC16: (payload: string): string => {
    let crc = 0xFFFF;
    const polynomial = 0x1021;

    for (let i = 0; i < payload.length; i++) {
      let c = payload.charCodeAt(i);
      for (let j = 0; j < 8; j++) {
        const bit = ((c >> (7 - j)) & 1) === 1;
        const c15 = ((crc >> 15) & 1) === 1;
        crc <<= 1;
        if (c15 !== bit) crc ^= polynomial;
      }
    }
    
    crc &= 0xFFFF;
    return crc.toString(16).toUpperCase().padStart(4, '0');
  },

  generatePayload: (amount: number): string => {
    // 1. Prepare Data
    // Using simple Name/City to avoid "CFE-PGR-0108" (Invalid character/length errors)
    // The key MUST be valid. Using the CPF key provided in your example.
    const pixKey = "02976592438"; 
    const merchantName = "NEUROSTUDY";
    const merchantCity = "SAO PAULO";
    const txId = "***"; // "***" indicates a dynamically generated static QR code
    const amountStr = amount.toFixed(2);

    // 2. Build Field 26 (Merchant Account Information)
    const gui = PixService.createField("00", "BR.GOV.BCB.PIX");
    const key = PixService.createField("01", pixKey);
    const field26 = PixService.createField("26", gui + key);

    // 3. Build Field 62 (Additional Data Field Template)
    const field05 = PixService.createField("05", txId);
    const field62 = PixService.createField("62", field05);

    // 4. Construct Payload (Order is strict)
    const payloadItems = [
      PixService.createField("00", "01"),      // Payload Format Indicator
      field26,                                 // Merchant Account Info
      PixService.createField("52", "0000"),    // Merchant Category Code
      PixService.createField("53", "986"),     // Transaction Currency (BRL)
      PixService.createField("54", amountStr), // Transaction Amount (Dynamic)
      PixService.createField("58", "BR"),      // Country Code
      PixService.createField("59", merchantName), // Merchant Name
      PixService.createField("60", merchantCity), // Merchant City
      field62,                                 // Additional Data (TxID)
      "6304"                                   // CRC16 Header
    ];

    const payloadWithoutCRC = payloadItems.join('');
    
    // 5. Calculate and Append CRC
    const crc = PixService.getCRC16(payloadWithoutCRC);
    const finalPayload = payloadWithoutCRC + crc;

    return finalPayload;
  }
};
