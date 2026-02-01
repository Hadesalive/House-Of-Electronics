import Script from 'next/script';

export default function InvoiceRenderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Invoice Render</title>
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { margin: 0; }
              .print-invoice { page-break-inside: avoid; }
            }
            
            .page-break {
              page-break-after: always !important;
              break-after: page !important;
            }
            
            /* Ensure proper A4 sizing */
            .invoice-pdf-render {
              width: 100%;
              min-height: 100vh;
            }
          `
        }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
