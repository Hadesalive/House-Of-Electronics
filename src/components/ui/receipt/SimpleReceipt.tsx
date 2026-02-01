import React from "react";

export interface SimpleReceiptData {
  receiptNumber: string;
  date: string;
  time: string;
  company: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    email?: string;
  };
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  paymentMethod: string;
  taxRate: number;
  discount: number;
  subtotal?: number;
  total?: number;
  footerMessage?: string;
}

export function renderSimpleReceiptHTML(receiptData: SimpleReceiptData, formatCurrency?: (n: number) => string): string {
  const fc = formatCurrency || ((n:number) => n.toFixed(2));
  const subtotal = receiptData.subtotal !== undefined
    ? receiptData.subtotal
    : receiptData.items.reduce((sum, i) => sum + (i.amount || 0), 0);
  const total = receiptData.total !== undefined ? receiptData.total : subtotal;
  return `
    <div class="receipt">
      <div class="header">
        <div class="company-name">${receiptData.company.name}</div>
        <div class="company-details">
          ${[receiptData.company.address, receiptData.company.city && receiptData.company.state ? receiptData.company.city + ', ' + receiptData.company.state : receiptData.company.city || receiptData.company.state, receiptData.company.zip, receiptData.company.phone].filter(Boolean).join('<br>')}<br>
        </div>
      </div>
     <div class="receipt-title">RECEIPT</div>
     <div class="receipt-info">
        <div><strong>Receipt #:</strong> ${receiptData.receiptNumber}</div>
        <div><strong>Date:</strong> ${receiptData.date}</div>
        <div><strong>Time:</strong> ${receiptData.time}</div>
      </div>
      <div class="customer-section">
        <div class="customer-title">Customer:</div>
        <div class="customer-details">
          ${receiptData.customer.name}<br>
          ${(receiptData.customer.email ? receiptData.customer.email + '<br>' : '') + (receiptData.customer.phone || '')}
        </div>
      </div>
      <div class="items-section">
        <div class="item-header">
          <span>Item</span>
          <span>Total</span>
        </div>
        ${receiptData.items.map(item => `
          <div class="item">
            <div class="item-description">${item.description}</div>
            <div class="item-details">${item.quantity} × ${fc(item.rate)}</div>
          </div>
          <div style="text-align: right; font-weight: bold;">${fc(item.amount)}</div>
        `).join('')}
      </div>
      <div class="totals">
        <div class="total-line">
          <span>Subtotal:</span>
          <span>${fc(subtotal)}</span>
        </div>
        <div class="total-line">
          <span>Tax (${receiptData.taxRate}%):</span>
          <span>${fc(((receiptData.taxRate/100) * subtotal))}</span>
        </div>
        ${receiptData.discount > 0 ? `<div class="total-line"><span>Discount:</span><span>- ${fc(receiptData.discount)}</span></div>` : ''}
        <div class="total-line total-final">
          <span>Total:</span>
          <span>${fc(total)}</span>
        </div>
      </div>
      <div class="payment-method">
        <span>Payment Method:</span>
        <span>${receiptData.paymentMethod}</span>
      </div>
      <div class="footer">
        <div>${receiptData.footerMessage || 'Thank you for your business!'}</div>
        <div>Keep this receipt for your records</div>
        <div>Questions? Contact us${receiptData.company.email ? ' at ' + receiptData.company.email : ''}</div>
      </div>
    </div>
    <style>
      /* Thermal printer 80mm standard paper size */
      body { margin: 0; padding: 0; font-family: monospace; }
      .receipt { max-width: 80mm; width: 100%; margin: 0 auto; }
      .header { text-align: center; margin-bottom: 20px; }
      .company-name { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
      .company-details { font-size: 12px; line-height: 1.4; }
      .receipt-title { text-align: center; font-size: 16px; font-weight: bold; margin: 20px 0; }
      .receipt-info { text-align: center; font-size: 12px; margin-bottom: 20px; }
      .customer-section { margin-bottom: 20px; }
      .customer-title { font-size: 12px; font-weight: bold; margin-bottom: 5px; }
      .customer-details { font-size: 12px; }
      .items-section { margin-bottom: 20px; }
      .item-header { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
      .item { margin-bottom: 10px; font-size: 12px; }
      .item-description { font-weight: 500; }
      .item-details { font-size: 10px; color: #666; }
      .totals { margin-bottom: 20px; }
      .total-line { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; }
      .total-final { font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 5px; }
      .payment-method { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 20px; }
      .footer { text-align: center; font-size: 10px; line-height: 1.4; margin-top: 16px; }
      @media print { body { margin: 0; padding: 0; } }
      @page { size: 80mm auto; margin: 0; }
    </style>
  `;
}

export const SimpleReceipt: React.FC<{
  receiptData: SimpleReceiptData;
  formatCurrency?: (n: number) => string;
}> = ({ receiptData, formatCurrency }) => {
  const fc = formatCurrency || ((n:number) => n.toFixed(2));
  const subtotal = receiptData.subtotal !== undefined
    ? receiptData.subtotal
    : receiptData.items.reduce((sum, i) => sum + (i.amount || 0), 0);
  const total = receiptData.total !== undefined ? receiptData.total : subtotal;
  return (
    <div style={{ maxWidth: 300, fontFamily: 'monospace', margin: '0 auto' }} className="receipt">
      <style>{`
      /* Thermal printer 80mm standard paper size */
      body { margin: 0; padding: 0; font-family: monospace; }
      .receipt { max-width: 80mm; width: 100%; margin: 0 auto; }
      .header { text-align: center; margin-bottom: 20px; }
      .company-name { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
      .company-details { font-size: 12px; line-height: 1.4; }
      .receipt-title { text-align: center; font-size: 16px; font-weight: bold; margin: 20px 0; }
      .receipt-info { text-align: center; font-size: 12px; margin-bottom: 20px; }
      .customer-section { margin-bottom: 20px; }
      .customer-title { font-size: 12px; font-weight: bold; margin-bottom: 5px; }
      .customer-details { font-size: 12px; }
      .items-section { margin-bottom: 20px; }
      .item-header { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
      .item { margin-bottom: 10px; font-size: 12px; }
      .item-description { font-weight: 500; }
      .item-details { font-size: 10px; color: #666; }
      .totals { margin-bottom: 20px; }
      .total-line { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; }
      .total-final { font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 5px; }
      .payment-method { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 20px; }
      .footer { text-align: center; font-size: 10px; line-height: 1.4; margin-top: 16px; }
      `}</style>
      <div className="header">
        <div className="company-name">{receiptData.company.name}</div>
        <div className="company-details">
          {[
            receiptData.company.address,
            receiptData.company.city && receiptData.company.state ? receiptData.company.city + ', ' + receiptData.company.state : receiptData.company.city || receiptData.company.state,
            receiptData.company.zip,
            receiptData.company.phone
          ].filter(Boolean).map((val, i) => (<span key={i}>{val}<br /></span>))}
        </div>
      </div>
      <div className="receipt-title">RECEIPT</div>
      <div className="receipt-info">
        <div><strong>Receipt #:</strong> {receiptData.receiptNumber}</div>
        <div><strong>Date:</strong> {receiptData.date}</div>
        <div><strong>Time:</strong> {receiptData.time}</div>
      </div>
      <div className="customer-section">
        <div className="customer-title">Customer:</div>
        <div className="customer-details">
          {receiptData.customer.name}<br />
          {receiptData.customer.email && (<>{receiptData.customer.email}<br /></>)}
          {receiptData.customer.phone}
        </div>
      </div>
      <div className="items-section">
        <div className="item-header">
          <span>Item</span>
          <span>Total</span>
        </div>
        {receiptData.items.map((item, i) => (
          <React.Fragment key={i}>
            <div className="item">
              <div className="item-description">{item.description}</div>
              <div className="item-details">{item.quantity} × {fc(item.rate)}</div>
            </div>
            <div style={{ textAlign: "right", fontWeight: "bold" }}>{fc(item.amount)}</div>
          </React.Fragment>
        ))}
      </div>
      <div className="totals">
        <div className="total-line">
          <span>Subtotal:</span>
          <span>{fc(subtotal)}</span>
        </div>
        <div className="total-line">
          <span>Tax ({receiptData.taxRate}%):</span>
          <span>{fc(((receiptData.taxRate / 100) * subtotal))}</span>
        </div>
        {receiptData.discount > 0 && (
          <div className="total-line"><span>Discount:</span><span>- {fc(receiptData.discount)}</span></div>
        )}
        <div className="total-line total-final">
          <span>Total:</span>
          <span>{fc(total)}</span>
        </div>
      </div>
      <div className="payment-method">
        <span>Payment Method:</span>
        <span>{receiptData.paymentMethod}</span>
      </div>
      <div className="footer">
        <div>{receiptData.footerMessage || 'Thank you for your business!'}</div>
        <div>Keep this receipt for your records</div>
        <div>Questions? Contact us{receiptData.company.email ? ' at ' + receiptData.company.email : ''}</div>
      </div>
    </div>
  );
};