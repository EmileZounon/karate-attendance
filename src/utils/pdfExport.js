import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const downloadPDF = async (elementId, filename, orientation = 'portrait') => {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('Content not found for PDF export');
    return;
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    logging: false,
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  const pageWidth = orientation === 'landscape' ? 297 : 210;
  const pageHeight = orientation === 'landscape' ? 210 : 297;
  const margin = 10;
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
  heightLeft -= (pageHeight - margin * 2);

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + margin;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - margin * 2);
  }

  pdf.save(`${filename}.pdf`);
};
