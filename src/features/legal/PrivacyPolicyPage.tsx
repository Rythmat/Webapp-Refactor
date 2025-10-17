import { ScrambleEmail } from '@/components/ScrambleEmail';
import { SUPPORT_EMAIL } from '@/constants';

export const PrivacyPolicyPage = () => {
  return (
    <main className="prose mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Privacy Policy</h1>

      <div className="mb-8 rounded-lg bg-muted p-4 text-xl text-red-500">
        <p>
          This is a placeholder for the Privacy Policy. Any statement herein
          should not be construed as a promise or guarantee. This is not the
          actual Privacy Policy.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">
          1. Information We Collect
        </h2>
        <p>
          We collect information that you provide directly to us when using
          MusicAtlas:
        </p>
        <ul className="mt-4 list-disc pl-6">
          <li>Account information (name, email, password)</li>
          <li>Profile information</li>
          <li>Communications with us</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">
          2. How We Use Your Information
        </h2>
        <p>We use the information we collect to:</p>
        <ul className="mt-4 list-disc pl-6">
          <li>Provide, maintain, and improve our services</li>
          <li>Process your transactions</li>
          <li>Send you technical notices and support messages</li>
          <li>Respond to your comments and questions</li>
          <li>Protect against fraud and abuse</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">3. Information Sharing</h2>
        <p>
          We do not sell, trade, or rent your personal information to third
          parties. We may share your information only in the following
          circumstances:
        </p>
        <ul className="mt-4 list-disc pl-6">
          <li>With your consent</li>
          <li>To comply with legal obligations</li>
          <li>To protect our rights and prevent fraud</li>
          <li>With service providers who assist in our operations</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">4. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to
          protect your personal information. However, no method of transmission
          over the internet is 100% secure, and we cannot guarantee absolute
          security.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">5. Your Rights</h2>
        <p>You have the right to:</p>
        <ul className="mt-4 list-disc pl-6">
          <li>Access your personal information</li>
          <li>Correct inaccurate information</li>
          <li>Request deletion of your information</li>
          <li>Object to our processing of your information</li>
          <li>Export your data in a portable format</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">6. Cookies and Tracking</h2>
        <p>
          We use cookies and similar tracking technologies to track activity on
          our service and hold certain information. You can instruct your
          browser to refuse all cookies or to indicate when a cookie is being
          sent.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">
          7. Children&apos;s Privacy
        </h2>
        <p>
          Our service is not intended for children under 13 years of age. We do
          not knowingly collect personal information from children under 13. If
          you are a parent or guardian and believe your child has provided us
          with personal information, please contact us.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">
          8. Changes to Privacy Policy
        </h2>
        <p>
          We may update our Privacy Policy from time to time. We will notify you
          of any changes by posting the new Privacy Policy on this page and
          updating the date below. Your continued use of the Service after such
          modifications will constitute your acknowledgment of the modified
          Privacy Policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">9. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us
          at:
        </p>
        <p className="mt-2">
          Email: <ScrambleEmail emailParts={SUPPORT_EMAIL} />
        </p>
      </section>

      <footer className="mt-12 text-sm text-gray-600">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </footer>
    </main>
  );
};
