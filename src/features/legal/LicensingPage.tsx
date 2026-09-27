import { LegalDocument } from './LegalDocument';
import licensing from './content/licensing.md?raw';

export const LicensingPage = () => <LegalDocument source={licensing} />;
