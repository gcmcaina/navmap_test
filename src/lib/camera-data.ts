/**
 * Mapeamento de IDs de câmera para seus respectivos endereços e coordenadas.
 *
 * Preencha esta matriz com os IDs de câmera, os endereços e as coordenadas da sua planilha.
 * A chave deve ser o ID da câmera (da coluna 'A'), o valor do endereço (da coluna 'F'),
 * e as coordenadas (latitude e longitude).
 */

export interface Camera {
  id: string;
  address: string;
  coords: [number, number];
}

export const cameraData: Camera[] = [
  // Exemplo de dados - substitua pelos seus dados reais
  {
    id: '0023da99-e9f6-4472-900d-df44bf4e8a58',
    address: 'Avenida Francisco Rodrigues, 665, Jardim Modelo',
    coords: [-23.5615, -46.6564],
  },
  {
    id: '004f2b73-f924-4ebe-babf-266eafe2f43b',
    address: 'Estrada do MBoi Mirim, Jardim das Flôres, Jardim Ângela',
    coords: [-23.693, -46.77],
  },
  {
    id: '0073e364-c1d8-4b09-948f-eb056ed29208',
    address: 'Gran Diesel Injeção Diesel, 838, Avenida Guilherme',
    coords: [-23.518, -46.617],
  },
   // Adicione o resto dos seus dados de câmera aqui
];
