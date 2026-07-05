export interface ExtMetadata {
  LicenseShortName?: { value: string };
  LicenseName?: { value: string };
  LicenseUrl?: { value: string };
  Artist?: { value: string };
  ImageDescription?: { value: string };
  DateTimeOriginal?: { value: string };
  Credit?: { value: string };
}

export interface CommonsImageInfo {
  url: string;
  thumburl?: string;
  width: number;
  height: number;
  extmetadata: ExtMetadata;
  descriptionurl?: string;
  descriptionshorturl?: string;
}

export interface CommonsFile {
  pageId: number;
  title: string;
  imageInfo: CommonsImageInfo;
  categoryId: string;
  licenseShortName: string;
  artistText: string;
  year: string;
  commonsUrl: string;
}
