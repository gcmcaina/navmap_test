
import type { jsPDF } from 'jspdf';

// Configurações de Orientação e Formato
type PageOrientation = 'p' | 'portrait' | 'l' | 'landscape';
const orientation: PageOrientation = 'p';
const format = 'a4'; // Ex: 'a4', 'letter', 'legal'
const unit = 'mm';

// Margens (em 'mm')
const margin = 15;

// Configurações de Fonte
const font = {
    name: 'Helvetica', // 'Helvetica', 'Times', 'Courier' (fontes padrão do jsPDF)
    style: 'normal',   // 'normal', 'bold', 'italic', 'bolditalic'
};

const titleSize = 18;
const headerSize = 9;
const bodySize = 12;
const smallSize = 10;

// Espaçamento entre linhas
const lineHeight = {
    small: 5,
    medium: 7,
    large: 9,
}

// Cor do link
const linkColor = { r: 4, g: 120, b: 255 }; // Cor azul para links

// Configuração da imagem de fundo
const image = {
    opacity: 0.05,
    width: 150,
    height: 150,
}

export const pdfLayoutConfig = {
    orientation,
    unit,
    format,
    margin,
    font,
    titleSize,
    headerSize,
    bodySize,
    smallSize,
    lineHeight,
    linkColor,
    image,
    pageWidth: 210, // A4 width in mm
    pageHeight: 297, // A4 height in mm
};
