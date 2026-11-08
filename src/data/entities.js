/**
 * Định dạng số tiền theo quy ước Việt Nam.
 *
 * Input:
 *   1500000
 *
 * Output:
 *   "1.500.000 VNĐ"
 */

// Helper currency formatter (Vietnamese convention: 1.500.000 VNĐ)
export function formatVND(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return '0 VNĐ';
    return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' VNĐ';
}

// Helper date formatter (Vietnamese convention: dd/MM/yyyy)
export function formatDateVN(dateStr) {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    const datePart = str.split('T')[0].split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}
