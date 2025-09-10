
export type PlateData = {
  id: string;
  "License Plate": string;
  "Image URL": string;
  "Detected At"?: string | number;
  Year?: string;
  Make?: string;
  Model?: string;
  BodyType?: 'Carro' | 'Moto';
  Marca?: string;
  CameraID?: string;
  CameraAddress?: string;
  preloadedImageUrl?: string;
};

    