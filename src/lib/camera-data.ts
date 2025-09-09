/**
 * Mapeamento de IDs de câmera para seus respectivos endereços.
 *
 * Preencha este objeto com os IDs de câmera e os endereços da sua planilha.
 * A chave deve ser o ID da câmera (da coluna 'A') e o valor deve ser o endereço (da coluna 'F').
 *
 * Exemplo:
 * 'ID_DA_CAMERA_1': 'Endereço da Câmera 1',
 * 'ID_DA_CAMERA_2': 'Endereço da Câmera 2',
 */

export const cameraAddressMapping: Record<string, string> = {
  // Exemplo de dados - substitua pelos seus dados reais
  'CAM-001': 'Avenida Brasil, 123 - Centro',
  'CAM-002': 'Rua Principal, 456 - Bairro Norte',
  'LPR-XYZ-789': 'Rodovia dos Bandeirantes, km 50',
};
