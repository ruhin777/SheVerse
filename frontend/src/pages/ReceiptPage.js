import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const buildHTML = ({ type, name, date, amount, userName, receiptId, details }) => {
  const isMarketplace = type === "order";
  const isTrip        = type === "trip";
  const sectionTitle  = isMarketplace ? "Order Items" : isTrip ? "Trip Details" : "Booking Details";
  const footerNote    = isMarketplace ? "Thank you for shopping with us 💜" : isTrip ? "Have a safe journey! 💜" : "Thank you for booking with us 💜";

  const detailRows = details.map(({ label, value }, i) => `
    <tr style="background:${i % 2 === 0 ? "#faf5ff" : "#ffffff"};">
      <td style="width:40%;padding:12px 22px;font-size:12px;color:#9d6b9d;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #f0e8f8;">${label}</td>
      <td style="width:60%;padding:12px 22px;font-size:14px;color:#3b0764;font-family:Arial,sans-serif;font-weight:600;border-bottom:1px solid #f0e8f8;">${String(value)}</td>
    </tr>
  `).join("");

  const itemRows = details.map(({ label, value }, i) => {
    const valueStr  = String(value);
    const parts     = valueStr.split(" x ");
    const priceStr  = parts[0]?.trim() || valueStr;
    const qtyStr    = parts[1]?.trim() || "1";
    const unitPrice = Number(priceStr.replace(/[৳,\s]/g, ""));
    const quantity  = Number(qtyStr);
    const subtotal  = (!isNaN(unitPrice) && !isNaN(quantity) && unitPrice > 0)
      ? `৳ ${(unitPrice * quantity).toLocaleString()}`
      : priceStr;

    return `
      <tr style="background:${i % 2 === 0 ? "#faf5ff" : "#ffffff"};">
        <td style="width:40%;padding:12px 22px;font-size:14px;color:#3b0764;font-family:Arial;">${label}</td>
        <td style="width:20%;padding:12px;font-size:13px;color:#6b5b7b;text-align:right;">${priceStr}</td>
        <td style="width:10%;padding:12px;font-size:13px;color:#6b5b7b;text-align:center;">${qtyStr}</td>
        <td style="width:30%;padding:12px 22px;font-size:14px;color:#7c3aed;font-weight:700;text-align:right;">${subtotal}</td>
      </tr>
    `;
  }).join("");

  return `
    <div style="width:794px;background:#ffffff;font-family:Arial,sans-serif;margin:0 auto;">
      <table width="100%" cellspacing="0" cellpadding="0">

        <tr>
          <td style="background:linear-gradient(135deg,#6d28d9,#a855f7,#c084c4);padding:40px;">
            <h2 style="color:#fff;margin:0;font-size:28px;">${name}</h2>
            <p style="color:#eee;font-size:13px;">Receipt No: ${receiptId}</p>
          </td>
        </tr>

        <tr>
          <td style="background:#f3e8ff;padding:24px;">
            <h1 style="margin:0;color:#7c3aed;font-size:32px;">৳ ${Number(amount).toLocaleString()}</h1>
            <p style="margin:6px 0 0;font-size:14px;">Issued to: <b>${userName}</b></p>
          </td>
        </tr>

        <tr>
          <td style="padding:20px;">
            <h3 style="color:#c084c4;">${sectionTitle}</h3>
          </td>
        </tr>

        ${isMarketplace ? `
          <tr>
            <td>
              <table width="100%">
                ${itemRows}
              </table>
            </td>
          </tr>
        ` : `
          <tr>
            <td>
              <table width="100%">
                ${detailRows}
              </table>
            </td>
          </tr>
        `}

        <tr>
          <td style="padding:24px;background:#faf5ff;text-align:center;">
            <p style="font-size:14px;color:#7c3aed;">${footerNote}</p>
          </td>
        </tr>

      </table>
    </div>
  `;
};

export const downloadReceipt = async (data) => {
  const html = buildHTML(data);

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:794px;background:#fff;";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: 794,
    });

    document.body.removeChild(container);

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");

    const imgWidth = 210; // A4 width
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`receipt-${data.receiptId}.pdf`);

  } catch (err) {
    document.body.removeChild(container);
    console.error("Receipt generation failed:", err);
  }
};