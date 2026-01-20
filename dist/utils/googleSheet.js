"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCsvFromGoogleSheet = void 0;
const axios_1 = __importDefault(require("axios"));
const getCsvFromGoogleSheet = async (sheetUrl) => {
    const match = sheetUrl.match(/\/d\/(.*?)\//);
    if (!match) {
        throw new Error('Invalid Google Sheet URL');
    }
    const sheetId = match[1];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    const response = await axios_1.default.get(csvUrl);
    const csv = response.data;
    const rows = csv
        .split('\n')
        .map(row => row.split(',').map(cell => cell.trim()));
    const headers = rows.shift();
    return rows.map(row => {
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = row[i];
        });
        return obj;
    });
};
exports.getCsvFromGoogleSheet = getCsvFromGoogleSheet;
//# sourceMappingURL=googleSheet.js.map