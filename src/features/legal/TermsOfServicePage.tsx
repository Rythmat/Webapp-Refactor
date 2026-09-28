import { LegalDocument } from './LegalDocument';
import terms from './content/terms.md?raw';

export const TermsOfServicePage = () => <LegalDocument source={terms} />;
