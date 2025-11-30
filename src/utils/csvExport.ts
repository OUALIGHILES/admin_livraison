import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Sheet1') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Create a worksheet from the data
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-adjust column widths based on content
  const range = XLSX.utils.decode_range(worksheet['!ref'] || '');
  const cols = [];
  for (let C = range.s.c; C <= range.e.c; C++) {
    let maxWidth = 10; // Default width
    for (let R = range.s.r; R <= range.e.r; R++) {
      const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
      const cell = worksheet[cellAddress];
      if (cell && cell.v) {
        const cellLength = cell.v.toString().length;
        if (cellLength > maxWidth) {
          maxWidth = cellLength;
        }
      }
    }
    cols.push({ wch: Math.min(maxWidth + 2, 50) }); // Max width of 50 characters
  }
  worksheet['!cols'] = cols;

  // Add some styling to the header row (first row)
  const headerRow = 1;
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cellAddress = XLSX.utils.encode_cell({ c: C, r: headerRow - 1 }); // 0-indexed
    if (!worksheet[cellAddress]) continue;

    // Apply header styling
    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4F46E5" } }, // Tailwind indigo-600 color
      alignment: { vertical: 'center', horizontal: 'center' }
    };
  }

  // Apply basic styling to all data cells
  for (let R = range.s.r + 1; R <= range.e.r; R++) { // Skip header row
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
      if (!worksheet[cellAddress]) continue;

      // Apply basic styling
      if (!worksheet[cellAddress].s) {
        worksheet[cellAddress].s = {};
      }

      // Add border styling
      worksheet[cellAddress].s = {
        ...worksheet[cellAddress].s,
        border: {
          top: { style: "thin", color: { rgb: "D1D5DB" } },
          bottom: { style: "thin", color: { rgb: "D1D5DB" } },
          left: { style: "thin", color: { rgb: "D1D5DB" } },
          right: { style: "thin", color: { rgb: "D1D5DB" } }
        },
        alignment: { vertical: 'center', horizontal: 'left' }
      };
    }
  }

  // Create a workbook and append the worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Write the workbook and trigger download
  XLSX.writeFile(workbook, filename);
};