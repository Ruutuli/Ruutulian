/** Default Google Drive folder IDs for site gallery sync (overridable in Site Settings). */
export const DEFAULT_GALLERY_DRIVE_FOLDER_IDS: string[] = [
  '1cNbJyTekBz-72AuUFIK6nq38cWfj212F',
  '0B91YVOBsNxk_VnNteHpZWWE5TGM',
];

export function driveFileViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
