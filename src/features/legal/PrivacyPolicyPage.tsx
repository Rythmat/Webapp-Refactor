import { LegalDocument } from './LegalDocument';
import privacy from './content/privacy.md?raw';

export const PrivacyPolicyPage = () => <LegalDocument source={privacy} />;
