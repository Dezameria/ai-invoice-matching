import type { InvoiceDocument } from '../types/invoice';
import type { KpiMetrics } from '../types/navigation';

export const initialMockInvoices: InvoiceDocument[] = [
  // 1. Case: Review (Price Variance on Line 2 + Minor VAT Rounding)
  {
    id: 'INV-2026-001',
    externalId: 'EXT-AIVA-88210',
    verificationStatus: 'REVIEW',
    workflowStatus: 'PENDING_REVIEW',
    status: 'REVIEW',
    urgency: 'HIGH',
    assignedRole: 'accounting',
    summary: {
      invoiceNum: 'INV-2026-8821',
      supplierName: 'บจก. สยาม ออโต้พาร์ท เทคโนโลยี',
      company: 'AAPICO Hitech PCL',
      poNumber: 'PO-2026-09412',
      releaseNumber: '01',
      receiptNumber: 'RC-881923',
      receiverName: 'สมชาย รักดี (WH-02)',
      orgId: 'ORG_AHP_01',
      supplierTaxId: '0105542091823',
      customerTaxId: '0107539000241',
      customerAddress: '99 หมู่ 1 ต.บ้านโพธิ์ อ.บ้านโพธิ์ จ.ฉะเชิงเทรา 24140',
      currency: 'THB',
      subTotal: 125400.00,
      vat: 8778.00,
      grandTotal: 134178.00,
      invoiceDate: '2026-10-01',
      dueDate: '2026-10-31',
      validationRound: 1,
      schemaVersion: '1.0',
      standardVersion: '6.2',
      engineVersion: 'Table9-Engine v6.2-20261001',
      eventId: 'EV-20261001-01',
      sourceSystem: 'OCR_VISION_LITELLM',
      pdfAvailable: true,
      pdfPages: 2,
      signatures: {
        supplierOrDeliverer: { present: true, page: 2 },
        receiver: { present: true, page: 2 },
        pagesComplete: true
      }
    },
    flowSteps: {
      step1: { title: 'สกัดและตรวจเอกสาร (V-01..V-03, V-06)', status: 'ok', note: 'สกัดฟิลด์ครบ 100% Tax ID และลายเซ็นสมบูรณ์ (V-01, V-02, V-06 ผ่าน)' },
      step2: { title: 'ค้นใบรับและลูกค้า Oracle (V-04, V-05)', status: 'ok', note: 'พบใบรับ RC-881923 และ ORG_ID ตรงกับ Master Data ผู้ขาย (V-04, V-05 ผ่าน)' },
      step3: { title: 'เทียบ 3-Way Match (V-07..V-09)', status: 'warn', note: 'ตรวจพบส่วนต่างราคาต่อหน่วยในรายการที่ 2 เกินเกณฑ์ (+50.00 THB/ชิ้น, Exception E05)' },
      step4: { title: 'Human Review & AP Action', status: 'warn', note: 'รอเจ้าหน้าที่บัญชีพิจารณาอนุมัติหรือส่งต่อจัดซื้อ (Pending Review)' }
    },
    exceptions: [
      {
        code: 'E05',
        ruleId: 'V-07',
        ruleTitle: 'ตรวจสอบส่วนต่างราคาต่อหน่วยในใบแจ้งหนี้เทียบกับใบสั่งซื้อ (Unit Price Tolerance)',
        step: 3,
        severity: 'Medium',
        responsible: 'เจ้าหน้าที่บัญชี (Accountant)',
        assignedRole: 'accounting',
        message: 'ราคาต่อหน่วยในใบแจ้งหนี้ (500.00 THB) สูงกว่า PO (450.00 THB) ส่วนต่าง 50.00 THB/ชิ้น รวมส่วนต่าง 5,000.00 THB',
        evidence: 'หน้า 1 รายการที่ 2: Bracket Steel Plate เทียบ PO-2026-09412 Line 2',
        evidencePage: 1,
        suggestedAction: 'ตรวจสอบใบขอซื้อ (PR) เพิ่มเติม หรือส่งคำขอปรับปรุง PO ไปยังฝ่ายจัดซื้อ'
      },
      {
        code: 'E16',
        ruleId: 'V-03',
        ruleTitle: 'ตรวจสอบเศษทศนิยมภาษีมูลค่าเพิ่มในเกณฑ์อนุโลม (VAT Rounding Within Tolerance)',
        step: 1,
        severity: 'Low',
        responsible: 'เจ้าหน้าที่บัญชี (Accountant)',
        assignedRole: 'accounting',
        message: 'ยอด VAT ในใบแจ้งหนี้มีเศษต่าง 0.12 THB จากการคำนวณ 7% ของยอด Subtotal (125,400 x 7% = 8,778.00) อยู่ในเกณฑ์อนุโลม <= 1.00 THB',
        evidence: 'หน้า 1 สรุปยอดรวมท้ายเอกสาร (Grand Total box)',
        evidencePage: 1,
        suggestedAction: 'อนุโลมตามเกณฑ์ปัดเศษไม่เกิน 1.00 บาท ไม่ส่งผลต่อการปฏิเสธเอกสาร'
      }
    ],
    rules: [
      { ruleId: 'V-01', title: 'ความครบถ้วนของข้อมูลหลัก (Header, Lines, Pages)', step: 1, result: 'PASS', details: 'พบเลขที่ INV-2026-8821 วันที่ 01/10/2026 รายการสินค้าและหน้าเอกสารครบ 2 หน้า' },
      { ruleId: 'V-02', title: 'คณิตศาสตร์รายบรรทัด (Line Arithmetic)', step: 1, result: 'PASS', details: 'จำนวน x ราคาต่อหน่วย = จำนวนเงิน ถูกต้องทุกบรรทัด (ส่วนต่าง <= 0.50)' },
      { ruleId: 'V-03', title: 'คณิตศาสตร์ทั้งเอกสารและภาษี (Totals & VAT 7%)', step: 1, result: 'PASS', details: 'ผลรวมบรรทัดตรงกับ Subtotal, VAT ต่าง 0.12 อยู่ในกรอบอนุโลม', exceptionCode: 'E16', severity: 'Low', evidence: 'VAT diff 0.12 THB', page: 1 },
      { ruleId: 'V-04', title: 'ตรวจใบรับสินค้าที่ใช้งานได้ (Active Goods Receipt)', step: 2, result: 'PASS', details: 'พบใบรับสินค้า RC-881923 สถานะสมบูรณ์ 1 ใบรับ' },
      { ruleId: 'V-05', title: 'ตรวจ Entity ลูกค้าและสาขา (Customer Entity & Master Data)', step: 2, result: 'PASS', details: 'ORG_ID ตรงกับ AAPICO Hitech PCL และ Tax ID 0107539000241 ถูกต้อง' },
      { ruleId: 'V-06', title: 'ตรวจลายเซ็นผู้ส่งมอบและผู้รับสินค้า (Required Signatures)', step: 1, result: 'PASS', details: 'พบลายเซ็นผู้ส่งมอบและผู้รับสินค้าครบถ้วนในหน้า 2', evidence: 'หน้า 2 ช่องผู้รับของ/ผู้ส่งของ', page: 2 },
      { ruleId: 'V-07', title: 'การจับคู่รายการสินค้าและราคา 3-Way (Line & Price Match)', step: 3, result: 'FAIL', details: 'ราคาต่อหน่วยรายการที่ 2 สูงกว่า PO เกินเกณฑ์ (+50.00 THB)', exceptionCode: 'E05', severity: 'Medium', evidence: 'INV: 500.00 vs PO: 450.00', page: 1 },
      { ruleId: 'V-08', title: 'การจับคู่ปริมาณสินค้า 3-Way (Quantity Match)', step: 3, result: 'PASS', details: 'ปริมาณสินค้าในใบแจ้งหนี้ตรงกับใบรับสินค้า (100 ชิ้น และ 100 ชิ้น)' },
      { ruleId: 'V-09', title: 'ตรวจยอดรวมใบรับสินค้ากับยอดใบแจ้งหนี้ (Receipt Total Match)', step: 3, result: 'PASS', details: 'ยอดรวมบรรทัดใบรับตรงกับยอดใบแจ้งหนี้' }
    ],
    lineItems: [
      {
        lineNum: 1,
        itemCode: 'ST-BRK-001',
        itemDescription: 'Hex Head Flange Bolt M10x1.25x35 Steel 8.8 Zn',
        uom: 'PCS',
        invoiceQty: 100,
        invoiceUnitPrice: 754.00,
        invoiceAmount: 75400.00,
        poQty: 100,
        poUnitPrice: 754.00,
        poAmount: 75400.00,
        poLine: 1,
        receiptQty: 100,
        receiptUnitPrice: 754.00,
        receiptAmount: 75400.00,
        receiptNum: 'RC-881923',
        receiptLine: 1,
        matchStatus: 'EXACT_MATCH',
        matchLevel: 'item_code',
        candidateCount: 1,
        varianceAmount: 0.00,
        notes: 'จับคู่สมบูรณ์ตรงกัน 100% ตามรหัสสินค้า'
      },
      {
        lineNum: 2,
        itemCode: 'PL-MNT-092',
        itemDescription: 'Rear Suspension Bracket Steel Plate ED-Coated',
        uom: 'PCS',
        invoiceQty: 100,
        invoiceUnitPrice: 500.00,
        invoiceAmount: 50000.00,
        poQty: 100,
        poUnitPrice: 450.00,
        poAmount: 45000.00,
        poLine: 2,
        receiptQty: 100,
        receiptUnitPrice: 450.00,
        receiptAmount: 45000.00,
        receiptNum: 'RC-881923',
        receiptLine: 2,
        matchStatus: 'PRICE_MISMATCH',
        matchLevel: 'item_code',
        candidateCount: 1,
        varianceAmount: 5000.00,
        notes: 'ราคาต่อหน่วยเกิน PO (+50.00 THB/ชิ้น, Exception E05)'
      }
    ],
    poSummary: {
      poNumber: 'PO-2026-09412',
      totalAmount: 120400.00,
      currency: 'THB',
      buyerName: 'กรรณิการ์ มั่นคง',
      orderDate: '2026-09-20',
      status: 'OPEN_APPROVED'
    },
    grnSummary: {
      receiptNumber: 'RC-881923',
      receiverName: 'สมชาย รักดี',
      receiptDate: '2026-09-28',
      totalReceivedAmount: 120400.00
    },
    revisions: [
      {
        revision: 1,
        receivedAt: '2026-10-01T09:30:00+07:00',
        verificationStatus: 'REVIEW',
        workflowStatus: 'PENDING_REVIEW',
        status: 'REVIEW',
        eventId: 'EV-20261001-01',
        note: 'สกัดจาก OCR Service ครั้งแรก พบ Exception E05 (Price Variance)'
      }
    ],
    activities: [
      {
        id: 'act-01',
        timestamp: '2026-10-01T09:30:15+07:00',
        actor: 'AIVA Vision OCR Engine',
        actorId: 'system-ocr-engine',
        action: 'EXTRACT_SNAPSHOT',
        detail: 'ประมวลผล OCR และ 3-Way Matching สำเร็จ 2 รายการสินค้า',
        badgeVariant: 'info'
      },
      {
        id: 'act-02',
        timestamp: '2026-10-01T09:30:16+07:00',
        actor: 'Rule Evaluation Engine',
        actorId: 'system-rules-engine',
        action: 'RULE_TRIGGER',
        detail: 'ตรวจพบ Exception E05 (Price Variance) กำหนดสถานะเป็น REVIEW จัดเส้นทางให้เจ้าหน้าที่บัญชี',
        badgeVariant: 'warning'
      }
    ],
    rawJsonSnapshot: {
      schema_version: '1.0',
      standard_version: '6.2',
      engine_version: 'Table9-Engine v6.2-20261001',
      source_system: 'OCR_VISION_LITELLM',
      event_id: 'EV-20261001-01',
      invoice_number: 'INV-2026-8821',
      total_variance: 5000.00,
      currency: 'THB',
      verification_status: 'REVIEW',
      workflow_status: 'PENDING_REVIEW',
      decision: {
        status: 'Review',
        assigned_to: 'accounting',
        halted_by: null,
        manual_review: false
      }
    }
  },

  // 2. Case: Auto-pass (Clean 100% Match, Confirmed)
  {
    id: 'INV-2026-002',
    externalId: 'EXT-AIVA-90421',
    verificationStatus: 'AUTO_PASS',
    workflowStatus: 'CONFIRMED',
    status: 'AUTO_PASS',
    urgency: 'NORMAL',
    assignedRole: 'none',
    summary: {
      invoiceNum: 'INV-2026-9042',
      supplierName: 'บมจ. ไทยเพรซิชั่น เมทัล อินดัสตรี',
      company: 'AAPICO Amata Co., Ltd.',
      poNumber: 'PO-2026-08810',
      receiptNumber: 'RC-990142',
      receiverName: 'วิชัย ช่างทอง',
      orgId: 'ORG_AMA_02',
      supplierTaxId: '0107536000189',
      customerTaxId: '0205545001201',
      customerAddress: '700/89 หมู่ 5 นิคมฯ อมตะซิตี้ ต.คลองตำหรุ อ.เมือง ชลบุรี 20000',
      currency: 'THB',
      subTotal: 84000.00,
      vat: 5880.00,
      grandTotal: 89880.00,
      invoiceDate: '2026-10-02',
      dueDate: '2026-11-01',
      validationRound: 1,
      schemaVersion: '1.0',
      standardVersion: '6.2',
      engineVersion: 'Table9-Engine v6.2-20261001',
      eventId: 'EV-20261002-02',
      sourceSystem: 'OCR_VISION_LITELLM',
      pdfAvailable: true,
      pdfPages: 1,
      signatures: {
        supplierOrDeliverer: { present: true, page: 1 },
        receiver: { present: true, page: 1 },
        pagesComplete: true
      }
    },
    flowSteps: {
      step1: { title: 'สกัดและตรวจเอกสาร (V-01..V-03, V-06)', status: 'ok', note: 'สกัดฟิลด์ครบ 100% ลายเซ็นและคณิตศาสตร์ถูกต้อง (V-01, V-02, V-06 ผ่าน)' },
      step2: { title: 'ค้นใบรับและลูกค้า Oracle (V-04, V-05)', status: 'ok', note: 'พบใบรับ RC-990142 และ Entity Master ตรงกัน (V-04, V-05 ผ่าน)' },
      step3: { title: 'เทียบ 3-Way Match (V-07..V-09)', status: 'ok', note: 'ตรวจผ่าน 3-Way Match สมบูรณ์ 100% ไม่มีส่วนต่าง (V-07, V-08, V-09 ผ่าน)' },
      step4: { title: 'Human Review & AP Action', status: 'ok', note: 'ระบบยืนยันผ่านอัตโนมัติ (Confirmed / Ready for AP Post)' }
    },
    exceptions: [],
    rules: [
      { ruleId: 'V-01', title: 'ความครบถ้วนของข้อมูลหลัก (Header, Lines, Pages)', step: 1, result: 'PASS', details: 'ข้อมูลครบ 100%' },
      { ruleId: 'V-02', title: 'คณิตศาสตร์รายบรรทัด (Line Arithmetic)', step: 1, result: 'PASS', details: 'คณิตศาสตร์รายบรรทัดถูกต้อง' },
      { ruleId: 'V-03', title: 'คณิตศาสตร์ทั้งเอกสารและภาษี (Totals & VAT 7%)', step: 1, result: 'PASS', details: 'Subtotal + VAT 7% ตรงกับ Grand Total' },
      { ruleId: 'V-04', title: 'ตรวจใบรับสินค้าที่ใช้งานได้ (Active Goods Receipt)', step: 2, result: 'PASS', details: 'พบใบรับ RC-990142 ตรวจรับครบแล้ว' },
      { ruleId: 'V-05', title: 'ตรวจ Entity ลูกค้าและสาขา (Customer Entity & Master Data)', step: 2, result: 'PASS', details: 'ORG_ID และ Tax ID ตรงกับ Master Data' },
      { ruleId: 'V-06', title: 'ตรวจลายเซ็นผู้ส่งมอบและผู้รับสินค้า (Required Signatures)', step: 1, result: 'PASS', details: 'พบลายเซ็นผู้ส่งมอบและผู้รับสินค้าในหน้า 1', page: 1 },
      { ruleId: 'V-07', title: 'การจับคู่รายการสินค้าและราคา 3-Way (Line & Price Match)', step: 3, result: 'PASS', details: 'รหัสสินค้าและราคาต่อหน่วยตรงกัน 100%' },
      { ruleId: 'V-08', title: 'การจับคู่ปริมาณสินค้า 3-Way (Quantity Match)', step: 3, result: 'PASS', details: 'ปริมาณสินค้า 200 ชิ้น ตรงกับใบรับ' },
      { ruleId: 'V-09', title: 'ตรวจยอดรวมใบรับสินค้ากับยอดใบแจ้งหนี้ (Receipt Total Match)', step: 3, result: 'PASS', details: 'ยอดรวมใบรับตรงกับยอดใบแจ้งหนี้' }
    ],
    lineItems: [
      {
        lineNum: 1,
        itemCode: 'CR-STL-045',
        itemDescription: 'Cold Rolled Steel Sheet SPCC-SD 1.2x1219x2438mm',
        uom: 'SHT',
        invoiceQty: 200,
        invoiceUnitPrice: 420.00,
        invoiceAmount: 84000.00,
        poQty: 200,
        poUnitPrice: 420.00,
        poAmount: 84000.00,
        poLine: 1,
        receiptQty: 200,
        receiptUnitPrice: 420.00,
        receiptAmount: 84000.00,
        receiptNum: 'RC-990142',
        receiptLine: 1,
        matchStatus: 'EXACT_MATCH',
        matchLevel: 'item_code',
        candidateCount: 1,
        varianceAmount: 0.00,
        notes: 'ตรงกัน 100%'
      }
    ],
    poSummary: {
      poNumber: 'PO-2026-08810',
      totalAmount: 84000.00,
      currency: 'THB',
      buyerName: 'ณรงค์เดช วิบูลย์กิจ',
      orderDate: '2026-09-25',
      status: 'OPEN_APPROVED'
    },
    grnSummary: {
      receiptNumber: 'RC-990142',
      receiverName: 'วิชัย ช่างทอง',
      receiptDate: '2026-09-30',
      totalReceivedAmount: 84000.00
    },
    revisions: [
      {
        revision: 1,
        receivedAt: '2026-10-02T10:15:00+07:00',
        verificationStatus: 'AUTO_PASS',
        workflowStatus: 'CONFIRMED',
        status: 'AUTO_PASS',
        eventId: 'EV-20261002-02',
        note: 'ผ่านการตรวจแบบ Auto-pass 100%'
      }
    ],
    activities: [
      {
        id: 'act-03',
        timestamp: '2026-10-02T10:15:10+07:00',
        actor: 'Rule Evaluation Engine',
        actorId: 'system-rules-engine',
        action: 'AUTO_PASS',
        detail: 'ตรวจผ่าน Table 9 ครบ 9 กฎ สถานะ AUTO_PASS',
        badgeVariant: 'success'
      }
    ],
    rawJsonSnapshot: {
      schema_version: '1.0',
      standard_version: '6.2',
      engine_version: 'Table9-Engine v6.2-20261001',
      source_system: 'OCR_VISION_LITELLM',
      event_id: 'EV-20261002-02',
      invoice_number: 'INV-2026-9042',
      total_variance: 0.00,
      currency: 'THB',
      verification_status: 'AUTO_PASS',
      workflow_status: 'CONFIRMED'
    }
  },

  // 3. Case: Hold (Missing Goods Receipt - Rule V-04 Exception E17)
  {
    id: 'INV-2026-003',
    externalId: 'EXT-AIVA-77341',
    verificationStatus: 'HOLD',
    workflowStatus: 'ON_HOLD',
    status: 'HOLD',
    urgency: 'HIGH',
    assignedRole: 'user',
    summary: {
      invoiceNum: 'INV-2026-7734',
      supplierName: 'บจก. เคมีภัณฑ์ แอนด์ สารหล่อลื่นไทย',
      company: 'AAPICO Structural Products',
      poNumber: 'PO-2026-08102',
      receiptNumber: '-',
      receiverName: '-',
      orgId: 'ORG_ASP_03',
      supplierTaxId: '0105548002341',
      customerTaxId: '0105553089123',
      customerAddress: 'นิคมอุตสาหกรรมบางปะอิน จ.พระนครศรีอยุธยา 13160',
      currency: 'THB',
      subTotal: 345000.00,
      vat: 24150.00,
      grandTotal: 369150.00,
      invoiceDate: '2026-10-02',
      dueDate: '2026-11-15',
      validationRound: 1,
      schemaVersion: '1.0',
      standardVersion: '6.2',
      engineVersion: 'Table9-Engine v6.2-20261001',
      eventId: 'EV-20261002-03',
      sourceSystem: 'OCR_VISION_LITELLM',
      pdfAvailable: true,
      pdfPages: 2,
      signatures: {
        supplierOrDeliverer: { present: true, page: 2 },
        receiver: { present: false },
        pagesComplete: true
      }
    },
    flowSteps: {
      step1: { title: 'สกัดและตรวจเอกสาร (V-01..V-03, V-06)', status: 'warn', note: 'ขาดลายเซ็นผู้รับสินค้าบนเอกสาร (Exception E26 High, V-06 ล้มเหลว)' },
      step2: { title: 'ค้นใบรับและลูกค้า Oracle (V-04, V-05)', status: 'bad', note: 'ไม่พบใบรับสินค้า (GRN) ใน Oracle EBS สำหรับ PO นี้ (Exception E17 High, V-04 ล้มเหลว)' },
      step3: { title: 'เทียบ 3-Way Match (V-07..V-09)', status: 'bad', note: 'ไม่สามารถจับคู่ 3-Way ได้เนื่องจากไม่มีใบรับสินค้า (Exception E30, E06, E31)' },
      step4: { title: 'Human Review & AP Action', status: 'bad', note: 'ระบบพักเอกสาร (Hold) รอฝ่ายคลังสินค้าตรวจรับสินค้าและออก GRN' }
    },
    exceptions: [
      {
        code: 'E17',
        ruleId: 'V-04',
        ruleTitle: 'ตรวจสอบการมีอยู่ของใบรับสินค้าที่ใช้งานได้ (Active Receipt Existence)',
        step: 2,
        severity: 'High',
        responsible: 'เจ้าหน้าที่คลังสินค้า / ผู้ตรวจรับ (Warehouse / User)',
        assignedRole: 'user',
        message: 'ไม่พบรายการใบรับสินค้า (Goods Receipt) ที่มีจำนวนรับ > 0 ในระบบ Oracle EBS สำหรับ PO-2026-08102',
        evidence: 'ผลการค้นหา Oracle EBS Receipt Lookup: 0 rows found',
        suggestedAction: 'ประสานงานแผนกคลังสินค้าเพื่อตรวจสอบการรับของจริงและบันทึกใบรับสินค้าเข้าสู่ระบบ ERP'
      },
      {
        code: 'E26',
        ruleId: 'V-06',
        ruleTitle: 'ตรวจสอบลายเซ็นผู้รับสินค้า (Receiver Signature)',
        step: 1,
        severity: 'High',
        responsible: 'เจ้าหน้าที่ตรวจรับ (Receiver / User)',
        assignedRole: 'user',
        message: 'ไม่พบลายเซ็นหรือตราประทับผู้รับสินค้าในเอกสารใบแจ้งหนี้/ใบส่งของ',
        evidence: 'หน้า 2 ช่องลงนามผู้รับสินค้าว่างเปล่า',
        evidencePage: 2,
        suggestedAction: 'ขอให้ผู้ขายส่งเอกสารที่มีลายเซ็นผู้รับสินค้ากำกับถูกต้อง'
      }
    ],
    rules: [
      { ruleId: 'V-01', title: 'ความครบถ้วนของข้อมูลหลัก (Header, Lines, Pages)', step: 1, result: 'PASS', details: 'ข้อมูลหลักครบถ้วน' },
      { ruleId: 'V-02', title: 'คณิตศาสตร์รายบรรทัด (Line Arithmetic)', step: 1, result: 'PASS', details: 'คณิตศาสตร์รายบรรทัดถูกต้อง' },
      { ruleId: 'V-03', title: 'คณิตศาสตร์ทั้งเอกสารและภาษี (Totals & VAT 7%)', step: 1, result: 'PASS', details: 'ยอดรวมและภาษี 7% ถูกต้อง' },
      { ruleId: 'V-04', title: 'ตรวจใบรับสินค้าที่ใช้งานได้ (Active Goods Receipt)', step: 2, result: 'FAIL', details: 'ไม่พบใบรับสินค้าใน Oracle EBS', exceptionCode: 'E17', severity: 'High', evidence: 'Oracle RCV: 0 rows' },
      { ruleId: 'V-05', title: 'ตรวจ Entity ลูกค้าและสาขา (Customer Entity & Master Data)', step: 2, result: 'PASS', details: 'ORG_ID ตรงกับ AAPICO Structural Products' },
      { ruleId: 'V-06', title: 'ตรวจลายเซ็นผู้ส่งมอบและผู้รับสินค้า (Required Signatures)', step: 1, result: 'FAIL', details: 'ขาดลายเซ็นผู้รับสินค้า', exceptionCode: 'E26', severity: 'High', evidence: 'ช่องผู้รับของว่างเปล่า', page: 2 },
      { ruleId: 'V-07', title: 'การจับคู่รายการสินค้าและราคา 3-Way (Line & Price Match)', step: 3, result: 'FAIL', details: 'ไม่พบใบรับสินค้าสำหรับจับคู่', exceptionCode: 'E30', severity: 'High' },
      { ruleId: 'V-08', title: 'การจับคู่ปริมาณสินค้า 3-Way (Quantity Match)', step: 3, result: 'FAIL', details: 'จำนวนรับจริงเป็น 0', exceptionCode: 'E06', severity: 'High' },
      { ruleId: 'V-09', title: 'ตรวจยอดรวมใบรับสินค้ากับยอดใบแจ้งหนี้ (Receipt Total Match)', step: 3, result: 'FAIL', details: 'ยอดรวมใบรับเป็น 0.00 THB', exceptionCode: 'E31', severity: 'High' }
    ],
    lineItems: [
      {
        lineNum: 1,
        itemCode: 'OIL-HYD-68',
        itemDescription: 'Industrial Hydraulic Oil ISO VG 68 (200L Drum)',
        uom: 'DRUM',
        invoiceQty: 50,
        invoiceUnitPrice: 6900.00,
        invoiceAmount: 345000.00,
        poQty: 50,
        poUnitPrice: 6900.00,
        poAmount: 345000.00,
        poLine: 1,
        receiptQty: 0,
        receiptUnitPrice: 0,
        receiptAmount: 0,
        matchStatus: 'MISSING_GRN',
        matchLevel: 'unmatched',
        varianceAmount: 345000.00,
        notes: 'ขาดใบรับสินค้า (GRN Missing)'
      }
    ],
    poSummary: {
      poNumber: 'PO-2026-08102',
      totalAmount: 345000.00,
      currency: 'THB',
      buyerName: 'สมเจตน์ พิทักษ์ธรรม',
      orderDate: '2026-09-18',
      status: 'OPEN_APPROVED'
    },
    revisions: [
      {
        revision: 1,
        receivedAt: '2026-10-02T14:20:00+07:00',
        verificationStatus: 'HOLD',
        workflowStatus: 'ON_HOLD',
        status: 'HOLD',
        eventId: 'EV-20261002-03',
        note: 'สกัดจาก OCR ตรวจไม่พบใบรับสินค้า (E17) พักเอกสารอัตโนมัติ'
      }
    ],
    activities: [
      {
        id: 'act-04',
        timestamp: '2026-10-02T14:20:05+07:00',
        actor: 'Rule Evaluation Engine',
        actorId: 'system-rules-engine',
        action: 'SYSTEM_HOLD',
        detail: 'ตรวจพบ Exception E17 (Missing Receipt) และ E26 (Missing Signature) พักเอกสาร (HOLD) และจัดเส้นทางให้ผู้เกี่ยวข้อง (User)',
        badgeVariant: 'warning'
      }
    ],
    rawJsonSnapshot: {
      schema_version: '1.0',
      standard_version: '6.2',
      engine_version: 'Table9-Engine v6.2-20261001',
      source_system: 'OCR_VISION_LITELLM',
      event_id: 'EV-20261002-03',
      invoice_number: 'INV-2026-7734',
      total_variance: 345000.00,
      currency: 'THB',
      verification_status: 'HOLD',
      workflow_status: 'ON_HOLD',
      decision: {
        status: 'Hold',
        assigned_to: 'user',
        halted_by: null,
        manual_review: false
      }
    }
  },

  // 4. Case: Manual Review (Billed Qty > Received Qty - Rule V-08 Exception E06 + Tax Branch Mismatch E09)
  {
    id: 'INV-2026-004',
    externalId: 'EXT-AIVA-66192',
    verificationStatus: 'MANUAL_REVIEW',
    workflowStatus: 'PENDING_REVIEW',
    status: 'MANUAL_REVIEW',
    urgency: 'HIGH',
    assignedRole: 'user',
    summary: {
      invoiceNum: 'INV-2026-6619',
      supplierName: 'บจก. เจริญชัย ฟาสเทนเนอร์ แอนด์ ทูลส์',
      company: 'AAPICO Hitech PCL',
      poNumber: 'PO-2026-07750',
      receiptNumber: 'RC-771020',
      receiverName: 'ประเสริฐ สุขสวัสดิ์',
      orgId: 'ORG_AHP_01',
      supplierTaxId: '0105539098765',
      customerTaxId: '0107539000241',
      customerAddress: 'สาขา 00002 ชลบุรี (ไม่ตรงกับ Master สาขาสำนักงานใหญ่)',
      currency: 'THB',
      subTotal: 180000.00,
      vat: 12600.00,
      grandTotal: 192600.00,
      invoiceDate: '2026-10-01',
      dueDate: '2026-10-25',
      validationRound: 1,
      schemaVersion: '1.0',
      standardVersion: '6.2',
      engineVersion: 'Table9-Engine v6.2-20261001',
      eventId: 'EV-20261001-04',
      sourceSystem: 'OCR_VISION_LITELLM',
      pdfAvailable: true,
      pdfPages: 1,
      signatures: {
        supplierOrDeliverer: { present: true, page: 1 },
        receiver: { present: true, page: 1 },
        pagesComplete: true
      }
    },
    flowSteps: {
      step1: { title: 'สกัดและตรวจเอกสาร (V-01..V-03, V-06)', status: 'ok', note: 'สกัดฟิลด์ครบ ลายเซ็นและคณิตศาสตร์รายบรรทัดถูกต้อง' },
      step2: { title: 'ค้นใบรับและลูกค้า Oracle (V-04, V-05)', status: 'warn', note: 'พบสาขาในใบแจ้งหนี้ (00002) ไม่ตรงกับ Master Data ผู้ซื้อ (Exception E09, V-05 ล้มเหลว)' },
      step3: { title: 'เทียบ 3-Way Match (V-07..V-09)', status: 'bad', note: 'จำนวนวางบิล (200) เกินกว่าจำนวนรับจริงในใบรับ (150) (Exception E06 High, V-08 ล้มเหลว)' },
      step4: { title: 'Human Review & AP Action', status: 'bad', note: 'ต้องการการตรวจประเมินเป็นกรณีพิเศษ (Manual Review) โดยฝ่ายจัดซื้อ' }
    },
    exceptions: [
      {
        code: 'E06',
        ruleId: 'V-08',
        ruleTitle: 'ตรวจสอบจำนวนวางบิลเกินกว่าจำนวนรับจริง (Billed Qty Exceeds Received Qty)',
        step: 3,
        severity: 'High',
        responsible: 'ฝ่ายจัดซื้อ / เจ้าหน้าที่ตรวจรับ (Buyer / User)',
        assignedRole: 'user',
        message: 'จำนวนสินค้าในใบแจ้งหนี้ (200 PCS) มากกว่าจำนวนที่บันทึกรับจริงในใบรับสินค้า RC-771020 (150 PCS) ส่วนต่าง 50 PCS มูลค่า 45,000.00 THB',
        evidence: 'หน้า 1 รายการที่ 1: วางบิล 200 PCS เทียบใบรับ RC-771020 รับจริง 150 PCS',
        evidencePage: 1,
        suggestedAction: 'ตรวจสอบว่ามีการส่งมอบสินค้าเพิ่มในรอบอื่นหรือไม่ หรือให้ผู้ขายออกใบลดหนี้ (Credit Note) สำหรับ 50 ชิ้นที่เกิน'
      },
      {
        code: 'E09',
        ruleId: 'V-05',
        ruleTitle: 'ตรวจสอบข้อมูลสาขาและที่อยู่ลูกค้า (Customer Branch & Address Match)',
        step: 2,
        severity: 'Medium',
        responsible: 'เจ้าหน้าที่บัญชี (Accountant)',
        assignedRole: 'accounting',
        message: 'สาขาในใบแจ้งหนี้ระบุสาขา 00002 (ชลบุรี) แต่ Master Data ใน PO กำหนดส่งสำนักงานใหญ่ (00000)',
        evidence: 'ที่อยู่ผู้ซื้อในใบแจ้งหนี้หน้า 1 เทียบ ORG_ID Master Data',
        evidencePage: 1,
        suggestedAction: 'ตรวจสอบความถูกต้องของสาขาเพื่อป้องกันปัญหาการขอคืนภาษีมูลค่าเพิ่ม'
      }
    ],
    rules: [
      { ruleId: 'V-01', title: 'ความครบถ้วนของข้อมูลหลัก (Header, Lines, Pages)', step: 1, result: 'PASS', details: 'ข้อมูลหลักครบถ้วน' },
      { ruleId: 'V-02', title: 'คณิตศาสตร์รายบรรทัด (Line Arithmetic)', step: 1, result: 'PASS', details: 'คณิตศาสตร์รายบรรทัดถูกต้อง' },
      { ruleId: 'V-03', title: 'คณิตศาสตร์ทั้งเอกสารและภาษี (Totals & VAT 7%)', step: 1, result: 'PASS', details: 'Subtotal และ VAT คำนวณถูกต้อง' },
      { ruleId: 'V-04', title: 'ตรวจใบรับสินค้าที่ใช้งานได้ (Active Goods Receipt)', step: 2, result: 'PASS', details: 'พบใบรับสินค้า RC-771020' },
      { ruleId: 'V-05', title: 'ตรวจ Entity ลูกค้าและสาขา (Customer Entity & Master Data)', step: 2, result: 'FAIL', details: 'สาขาไม่ตรงกับ Master Data', exceptionCode: 'E09', severity: 'Medium', evidence: 'สาขา 00002 vs 00000', page: 1 },
      { ruleId: 'V-06', title: 'ตรวจลายเซ็นผู้ส่งมอบและผู้รับสินค้า (Required Signatures)', step: 1, result: 'PASS', details: 'พบลายเซ็นครบถ้วน' },
      { ruleId: 'V-07', title: 'การจับคู่รายการสินค้าและราคา 3-Way (Line & Price Match)', step: 3, result: 'PASS', details: 'ราคาต่อหน่วย 900.00 THB ตรงกับ PO' },
      { ruleId: 'V-08', title: 'การจับคู่ปริมาณสินค้า 3-Way (Quantity Match)', step: 3, result: 'FAIL', details: 'จำนวนวางบิลเกินจำนวนรับจริง 50 PCS', exceptionCode: 'E06', severity: 'High', evidence: 'INV: 200 vs RCV: 150', page: 1 },
      { ruleId: 'V-09', title: 'ตรวจยอดรวมใบรับสินค้ากับยอดใบแจ้งหนี้ (Receipt Total Match)', step: 3, result: 'FAIL', details: 'ยอดรวมใบรับสินค้าต่ำกว่าใบแจ้งหนี้ 45,000.00 THB', exceptionCode: 'E31', severity: 'High' }
    ],
    lineItems: [
      {
        lineNum: 1,
        itemCode: 'FST-NUT-M12',
        itemDescription: 'High Tensile Hex Nut Grade 10.9 M12x1.75 Dacromet',
        uom: 'PCS',
        invoiceQty: 200,
        invoiceUnitPrice: 900.00,
        invoiceAmount: 180000.00,
        poQty: 200,
        poUnitPrice: 900.00,
        poAmount: 180000.00,
        poLine: 1,
        receiptQty: 150,
        receiptUnitPrice: 900.00,
        receiptAmount: 135000.00,
        receiptNum: 'RC-771020',
        receiptLine: 1,
        matchStatus: 'QTY_MISMATCH',
        matchLevel: 'item_code',
        candidateCount: 1,
        varianceAmount: 45000.00,
        notes: 'จำนวนวางบิลเกินกว่าที่ตรวจรับจริงในใบรับ 50 PCS (Exception E06)'
      }
    ],
    poSummary: {
      poNumber: 'PO-2026-07750',
      totalAmount: 180000.00,
      currency: 'THB',
      buyerName: 'ศิริพร บุญเจริญ',
      orderDate: '2026-09-12',
      status: 'OPEN_APPROVED'
    },
    grnSummary: {
      receiptNumber: 'RC-771020',
      receiverName: 'ประเสริฐ สุขสวัสดิ์',
      receiptDate: '2026-09-29',
      totalReceivedAmount: 135000.00
    },
    revisions: [
      {
        revision: 1,
        receivedAt: '2026-10-01T16:00:00+07:00',
        verificationStatus: 'MANUAL_REVIEW',
        workflowStatus: 'PENDING_REVIEW',
        status: 'MANUAL_REVIEW',
        eventId: 'EV-20261001-04',
        note: 'ตรวจพบจำนวนสินค้าเกินใบรับ (E06) กำหนดสถานะเป็น MANUAL_REVIEW'
      }
    ],
    activities: [
      {
        id: 'act-05',
        timestamp: '2026-10-01T16:00:10+07:00',
        actor: 'Rule Evaluation Engine',
        actorId: 'system-rules-engine',
        action: 'FLAG_MANUAL_REVIEW',
        detail: 'ตรวจพบ Exception E06 (High Severity) ส่งตรวจคู่มือ (MANUAL_REVIEW) ให้ผู้เกี่ยวข้อง (User)',
        badgeVariant: 'danger'
      }
    ],
    rawJsonSnapshot: {
      schema_version: '1.0',
      standard_version: '6.2',
      engine_version: 'Table9-Engine v6.2-20261001',
      source_system: 'OCR_VISION_LITELLM',
      event_id: 'EV-20261001-04',
      invoice_number: 'INV-2026-6619',
      total_variance: 45000.00,
      currency: 'THB',
      verification_status: 'MANUAL_REVIEW',
      workflow_status: 'PENDING_REVIEW',
      decision: {
        status: 'Manual Review',
        assigned_to: 'user',
        halted_by: null,
        manual_review: true
      }
    }
  },

  // 5. Case: Halted by Line Math (Rule V-02 Line Arithmetic Error E28 -> Halts before Oracle lookup)
  {
    id: 'INV-2026-005',
    externalId: 'EXT-AIVA-55102',
    verificationStatus: 'HOLD',
    workflowStatus: 'PENDING_REVIEW',
    status: 'HOLD',
    urgency: 'HIGH',
    assignedRole: 'accounting',
    summary: {
      invoiceNum: 'INV-2026-5510',
      supplierName: 'บจก. สยาม โลจิสติกส์ แอนด์ ซัพพลาย',
      company: 'AAPICO Hitech PCL',
      poNumber: 'PO-2026-09941',
      currency: 'THB',
      subTotal: 75000.00,
      vat: 5250.00,
      grandTotal: 80250.00,
      invoiceDate: '2026-10-02',
      dueDate: '2026-11-02',
      validationRound: 1,
      schemaVersion: '1.0',
      standardVersion: '6.2',
      engineVersion: 'Table9-Engine v6.2-20261001',
      eventId: 'EV-20261002-05',
      sourceSystem: 'OCR_VISION_LITELLM',
      haltedBy: 'V-02',
      pdfAvailable: true,
      pdfPages: 1,
      signatures: {
        supplierOrDeliverer: { present: true, page: 1 },
        receiver: { present: true, page: 1 },
        pagesComplete: true
      }
    },
    flowSteps: {
      step1: { title: 'สกัดและตรวจเอกสาร (V-01..V-03, V-06)', status: 'bad', note: 'คณิตศาสตร์รายบรรทัดไม่ถูกต้อง: 50 x 1,200 = 60,000 แต่พิมพ์ 75,000 (Exception E28 High, หยุดการประมวลผลทันที)' },
      step2: { title: 'ค้นใบรับและลูกค้า Oracle (V-04, V-05)', status: 'skip', note: 'ข้ามการสืบค้น Oracle EBS เนื่องจากเอกสารล้มเหลวกฎ V-02 (Halted by V-02)' },
      step3: { title: 'เทียบ 3-Way Match (V-07..V-09)', status: 'skip', note: 'ข้ามการตรวจ 3-Way Match เนื่องจากถูกระงับที่ขั้นตอนก่อนหน้า (not_evaluated)' },
      step4: { title: 'Human Review & AP Action', status: 'bad', note: 'พักเอกสาร (Hold) รอผู้ขายแก้ไขใบแจ้งหนี้ให้ถูกต้อง' }
    },
    exceptions: [
      {
        code: 'E28',
        ruleId: 'V-02',
        ruleTitle: 'ตรวจสอบความถูกต้องของคณิตศาสตร์รายบรรทัด (Line-Item Arithmetic Check)',
        step: 1,
        severity: 'High',
        responsible: 'เจ้าหน้าที่บัญชี (Accountant)',
        assignedRole: 'accounting',
        message: 'รายการที่ 1: จำนวน 50 x ราคาต่อหน่วย 1,200.00 THB ต้องเท่ากับ 60,000.00 THB แต่ในใบแจ้งหนี้ระบุจำนวนเงิน 75,000.00 THB ส่วนต่าง 15,000.00 THB เกินเกณฑ์ 0.50 THB กฎ V-02 ระงับการค้นหา Oracle ทันที',
        evidence: 'หน้า 1 ตารางสินค้าแถวที่ 1 (50 x 1,200.00 != 75,000.00)',
        evidencePage: 1,
        suggestedAction: 'ปฏิเสธเอกสารหรือส่งคืนผู้ขายให้ออกใบแจ้งหนี้ฉบับแก้ไขที่คำนวณถูกต้อง'
      }
    ],
    rules: [
      { ruleId: 'V-01', title: 'ความครบถ้วนของข้อมูลหลัก (Header, Lines, Pages)', step: 1, result: 'PASS', details: 'ข้อมูลหัวเอกสารครบถ้วน' },
      { ruleId: 'V-02', title: 'คณิตศาสตร์รายบรรทัด (Line Arithmetic)', step: 1, result: 'FAIL', details: 'รายการที่ 1 คำนวณผิด (50 x 1,200 != 75,000) สั่งระงับการสืบค้น Oracle', exceptionCode: 'E28', severity: 'High', evidence: 'Line 1 diff 15,000.00 THB', page: 1 },
      { ruleId: 'V-03', title: 'คณิตศาสตร์ทั้งเอกสารและภาษี (Totals & VAT 7%)', step: 1, result: 'FAIL', details: 'ยอดรวมอิงจากบรรทัดที่คำนวณผิด', exceptionCode: 'E31', severity: 'High' },
      { ruleId: 'V-04', title: 'ตรวจใบรับสินค้าที่ใช้งานได้ (Active Goods Receipt)', step: 2, result: 'not_evaluated', details: 'ข้ามการตรวจเนื่องจากเครื่องยนต์ระงับที่ V-02 (Halted by V-02)' },
      { ruleId: 'V-05', title: 'ตรวจ Entity ลูกค้าและสาขา (Customer Entity & Master Data)', step: 2, result: 'not_evaluated', details: 'ข้ามการตรวจเนื่องจากเครื่องยนต์ระงับที่ V-02 (Halted by V-02)' },
      { ruleId: 'V-06', title: 'ตรวจลายเซ็นผู้ส่งมอบและผู้รับสินค้า (Required Signatures)', step: 1, result: 'PASS', details: 'พบลายเซ็นครบถ้วน' },
      { ruleId: 'V-07', title: 'การจับคู่รายการสินค้าและราคา 3-Way (Line & Price Match)', step: 3, result: 'not_evaluated', details: 'ข้ามการตรวจเนื่องจากเครื่องยนต์ระงับที่ V-02 (Halted by V-02)' },
      { ruleId: 'V-08', title: 'การจับคู่ปริมาณสินค้า 3-Way (Quantity Match)', step: 3, result: 'not_evaluated', details: 'ข้ามการตรวจเนื่องจากเครื่องยนต์ระงับที่ V-02 (Halted by V-02)' },
      { ruleId: 'V-09', title: 'ตรวจยอดรวมใบรับสินค้ากับยอดใบแจ้งหนี้ (Receipt Total Match)', step: 3, result: 'not_evaluated', details: 'ข้ามการตรวจเนื่องจากเครื่องยนต์ระงับที่ V-02 (Halted by V-02)' }
    ],
    lineItems: [
      {
        lineNum: 1,
        itemCode: 'SRV-TRP-01',
        itemDescription: 'Warehouse Transfer Transportation Service (Rayong to Bangpoo)',
        uom: 'TRIP',
        invoiceQty: 50,
        invoiceUnitPrice: 1200.00,
        invoiceAmount: 75000.00,
        poQty: 50,
        poUnitPrice: 1200.00,
        poAmount: 60000.00,
        poLine: 1,
        matchStatus: 'PRICE_MISMATCH',
        matchLevel: 'unmatched',
        varianceAmount: 15000.00,
        notes: 'คำนวณยอดเงินผิดพลาด (50 x 1,200.00 = 60,000 != 75,000, Exception E28)'
      }
    ],
    poSummary: {
      poNumber: 'PO-2026-09941',
      totalAmount: 60000.00,
      currency: 'THB',
      buyerName: 'อภิเชษฐ์ สมบูรณ์สุข',
      orderDate: '2026-09-28',
      status: 'OPEN_APPROVED'
    },
    revisions: [
      {
        revision: 1,
        receivedAt: '2026-10-02T11:45:00+07:00',
        verificationStatus: 'HOLD',
        workflowStatus: 'PENDING_REVIEW',
        status: 'HOLD',
        eventId: 'EV-20261002-05',
        note: 'ตรวจพบ Line Math Error (E28) ระงับการประมวลผลก่อนเข้า Oracle'
      }
    ],
    activities: [
      {
        id: 'act-06',
        timestamp: '2026-10-02T11:45:05+07:00',
        actor: 'Rule Evaluation Engine',
        actorId: 'system-rules-engine',
        action: 'EXECUTION_HALTED',
        detail: 'ระงับการทำงานที่กฎ V-02 เนื่องจากตรวจพบ Exception E28 บายพาสขั้นตอนค้นหา Oracle',
        badgeVariant: 'danger'
      }
    ],
    rawJsonSnapshot: {
      schema_version: '1.0',
      standard_version: '6.2',
      engine_version: 'Table9-Engine v6.2-20261001',
      source_system: 'OCR_VISION_LITELLM',
      event_id: 'EV-20261002-05',
      invoice_number: 'INV-2026-5510',
      total_variance: 15000.00,
      currency: 'THB',
      verification_status: 'HOLD',
      workflow_status: 'PENDING_REVIEW',
      decision: {
        status: 'Hold',
        assigned_to: 'accounting',
        halted_by: 'V-02',
        manual_review: false
      }
    }
  },

  // 6. Case: Duplicate Invoice Detected
  {
    id: 'INV-2026-006',
    externalId: 'EXT-AIVA-44019',
    verificationStatus: 'HOLD',
    workflowStatus: 'PENDING_REVIEW',
    status: 'DUPLICATE',
    isDuplicate: true,
    duplicateOf: 'INV-2026-8821',
    urgency: 'HIGH',
    assignedRole: 'accounting',
    summary: {
      invoiceNum: 'INV-2026-8821',
      supplierName: 'บจก. สยาม ออโต้พาร์ท เทคโนโลยี',
      company: 'AAPICO Hitech PCL',
      poNumber: 'PO-2026-09412',
      currency: 'THB',
      subTotal: 125400.00,
      vat: 8778.00,
      grandTotal: 134178.00,
      invoiceDate: '2026-10-01',
      dueDate: '2026-10-31',
      validationRound: 2,
      schemaVersion: '1.0',
      standardVersion: '6.2',
      engineVersion: 'Table9-Engine v6.2-20261001',
      eventId: 'EV-20261002-06',
      sourceSystem: 'OCR_VISION_LITELLM',
      pdfAvailable: true,
      pdfPages: 2,
      signatures: {
        supplierOrDeliverer: { present: true, page: 2 },
        receiver: { present: true, page: 2 },
        pagesComplete: true
      }
    },
    flowSteps: {
      step1: { title: 'สกัดและตรวจเอกสาร (V-01..V-03, V-06)', status: 'ok', note: 'สกัดฟิลด์สำเร็จ' },
      step2: { title: 'ค้นใบรับและลูกค้า Oracle (V-04, V-05)', status: 'ok', note: 'พบข้อมูลใบรับในระบบ' },
      step3: { title: 'เทียบ 3-Way Match (V-07..V-09)', status: 'warn', note: 'ตรวจพบความซ้ำซ้อนกับเอกสารเดิมในคลังข้อมูล' },
      step4: { title: 'Human Review & AP Action', status: 'bad', note: 'แจ้งเตือนเอกสารซ้ำซ้อนในระบบ (Duplicate Invoice Number)' }
    },
    exceptions: [
      {
        code: 'E13',
        ruleId: 'V-01',
        ruleTitle: 'ตรวจพบเลขที่ใบแจ้งหนี้ซ้ำซ้อนในระบบ (Duplicate Invoice)',
        step: 1,
        severity: 'High',
        responsible: 'เจ้าหน้าที่บัญชี (Accountant)',
        assignedRole: 'accounting',
        message: 'เลขที่ใบแจ้งหนี้ INV-2026-8821 ของผู้ขายรายนี้ถูกส่งเข้าสู่ระบบแล้วในเอกสารรหัส INV-2026-001',
        evidence: 'ERP AP_INVOICES_ALL duplicate check: invoice_num matches INV-2026-001',
        suggestedAction: 'ตรวจสอบว่าเป็นเอกสารส่งซ้ำ หรือเป็นการส่งรอบใหม่ (Revision) ของเอกสารเดิม'
      }
    ],
    rules: [
      { ruleId: 'V-01', title: 'ความครบถ้วนของข้อมูลหลัก (Header, Lines, Pages)', step: 1, result: 'FAIL', details: 'เลขที่เอกสารซ้ำกับประวัติเดิม', exceptionCode: 'E13', severity: 'High' },
      { ruleId: 'V-02', title: 'คณิตศาสตร์รายบรรทัด (Line Arithmetic)', step: 1, result: 'PASS' },
      { ruleId: 'V-03', title: 'คณิตศาสตร์ทั้งเอกสารและภาษี (Totals & VAT 7%)', step: 1, result: 'PASS' },
      { ruleId: 'V-04', title: 'ตรวจใบรับสินค้าที่ใช้งานได้ (Active Goods Receipt)', step: 2, result: 'PASS' },
      { ruleId: 'V-05', title: 'ตรวจ Entity ลูกค้าและสาขา (Customer Entity & Master Data)', step: 2, result: 'PASS' },
      { ruleId: 'V-06', title: 'ตรวจลายเซ็นผู้ส่งมอบและผู้รับสินค้า (Required Signatures)', step: 1, result: 'PASS' },
      { ruleId: 'V-07', title: 'การจับคู่รายการสินค้าและราคา 3-Way (Line & Price Match)', step: 3, result: 'PASS' },
      { ruleId: 'V-08', title: 'การจับคู่ปริมาณสินค้า 3-Way (Quantity Match)', step: 3, result: 'PASS' },
      { ruleId: 'V-09', title: 'ตรวจยอดรวมใบรับสินค้ากับยอดใบแจ้งหนี้ (Receipt Total Match)', step: 3, result: 'PASS' }
    ],
    lineItems: [],
    revisions: [
      {
        revision: 2,
        receivedAt: '2026-10-02T15:00:00+07:00',
        verificationStatus: 'HOLD',
        workflowStatus: 'PENDING_REVIEW',
        status: 'DUPLICATE',
        eventId: 'EV-20261002-06',
        note: 'ตรวจพบเป็นเอกสารเลขที่ซ้ำในระบบ AP'
      }
    ],
    activities: [
      {
        id: 'act-07',
        timestamp: '2026-10-02T15:00:10+07:00',
        actor: 'Duplicate Detection Engine',
        actorId: 'system-dedup-engine',
        action: 'DUPLICATE_FLAGGED',
        detail: 'ตรวจพบเลขที่ใบแจ้งหนี้ซ้ำกับ INV-2026-001 ขึ้นสถานะ DUPLICATE',
        badgeVariant: 'danger'
      }
    ],
    rawJsonSnapshot: {
      schema_version: '1.0',
      standard_version: '6.2',
      engine_version: 'Table9-Engine v6.2-20261001',
      source_system: 'OCR_VISION_LITELLM',
      event_id: 'EV-20261002-06',
      invoice_number: 'INV-2026-8821',
      status: 'DUPLICATE',
      duplicate_of: 'INV-2026-001'
    }
  }
];

export function calculateKpiMetrics(invoices: InvoiceDocument[]): KpiMetrics {
  const metrics: KpiMetrics = {
    total: invoices.length,
    autoPass: 0,
    review: 0,
    hold: 0,
    manualReview: 0,
    duplicate: 0,
    confirmed: 0
  };

  invoices.forEach(inv => {
    if (inv.workflowStatus === 'CONFIRMED') {
      metrics.confirmed = (metrics.confirmed || 0) + 1;
    }

    if (inv.isDuplicate || inv.status === 'DUPLICATE') {
      metrics.duplicate += 1;
    } else {
      switch (inv.verificationStatus) {
        case 'AUTO_PASS':
          metrics.autoPass += 1;
          break;
        case 'REVIEW':
          metrics.review += 1;
          break;
        case 'HOLD':
          metrics.hold += 1;
          break;
        case 'MANUAL_REVIEW':
          metrics.manualReview += 1;
          break;
      }
    }
  });

  return metrics;
}
