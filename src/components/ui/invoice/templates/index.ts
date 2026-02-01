// Export all template configurations
export { hoeClassicTemplate } from './hoe-classic';
export { hoeClassicTypeBTemplate } from './hoe-classic-type-b';
export { hoeClassicTypeCTemplate } from './hoe-classic-type-c';
export { hoeClassicEkhlasTemplate } from './hoe-classic-ekhlas';
export { proCorporateTemplate } from './pro-corporate';

// Export all preview components
export { HoeClassicPreview } from './hoe-classic';
export { HoeClassicTypeBPreview } from './hoe-classic-type-b';
export { HoeClassicTypeCPreview } from './hoe-classic-type-c';
export { HoeClassicEkhlasPreview } from './hoe-classic-ekhlas';
export { ProCorporatePreview } from './pro-corporate';

// Array of all templates
import { InvoiceTemplate } from '../invoice-templates';
import { hoeClassicTemplate } from './hoe-classic';
import { hoeClassicTypeBTemplate } from './hoe-classic-type-b';
import { hoeClassicTypeCTemplate } from './hoe-classic-type-c';
import { hoeClassicEkhlasTemplate } from './hoe-classic-ekhlas';
import { proCorporateTemplate } from './pro-corporate';

export const allTemplates: InvoiceTemplate[] = [
  hoeClassicTemplate,
  hoeClassicTypeBTemplate,
  hoeClassicTypeCTemplate,
  hoeClassicEkhlasTemplate,
  proCorporateTemplate
];

// Templates visible in UI (only hoe-classic)
export const visibleTemplates: InvoiceTemplate[] = [
  hoeClassicTemplate
];
