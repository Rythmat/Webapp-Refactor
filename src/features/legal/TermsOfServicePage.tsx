import { ScrambleEmail } from '@/components/ScrambleEmail';
import { SUPPORT_EMAIL } from '@/constants';

export const TermsOfServicePage = () => {
  return (
    <main className="prose mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Terms of Service</h1>

      <div className="mb-8 rounded-lg bg-muted p-4 text-xl text-red-500">
        <p>
          This is a placeholder for the Terms of Service. Any statement herein
          should not be construed as a promise or guarantee. This is not the
          actual Terms of Service.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">1. Agreement to Terms</h2>
        <p>
          By accessing and using MusicAtlas (&ldquo;the Service&rdquo;), you
          agree to be bound by these Terms of Service and all applicable laws
          and regulations. If you do not agree with any of these terms, you are
          prohibited from using or accessing the Service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">2. Use License</h2>
        <p>
          We grant you a limited, non-exclusive, non-transferable license to use
          the Service for personal or commercial music composition and
          arrangement purposes, subject to these Terms.
        </p>
        <ul className="mt-4 list-disc pl-6">
          <li>
            You must not modify, copy, distribute, transmit, or derive another
            work from the Service
          </li>
          <li>
            You must not use the Service for any illegal or unauthorized purpose
          </li>
          <li>
            You must not attempt to gain unauthorized access to any portion of
            the Service
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">3. Content Ownership</h2>
        <p>
          You retain all rights to the content you create using our Service.
          However, you grant us a worldwide, non-exclusive, royalty-free license
          to use, reproduce, and distribute your content solely for the purpose
          of providing and improving the Service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">
          4. User Responsibilities
        </h2>
        <p>
          You are responsible for maintaining the confidentiality of your
          account and password. You agree to accept responsibility for all
          activities that occur under your account.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">
          5. Service Modifications
        </h2>
        <p>
          We reserve the right to modify or discontinue the Service at any time,
          with or without notice. We shall not be liable to you or any third
          party for any modification, suspension, or discontinuance of the
          Service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">6. Privacy</h2>
        <p>
          Your use of the Service is also governed by our Privacy Policy. Please
          review our Privacy Policy to understand our practices regarding your
          personal information.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">
          7. Limitation of Liability
        </h2>
        <p>
          In no event shall MusicAtlas, its directors, employees, partners,
          agents, suppliers, or affiliates be liable for any indirect,
          incidental, special, consequential, or punitive damages, including
          without limitation, loss of profits, data, use, goodwill, or other
          intangible losses.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">8. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the
          laws of the jurisdiction in which the Service is primarily operated,
          without regard to its conflict of law provisions.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">9. Changes to Terms</h2>
        <p>
          We reserve the right to update or change these Terms at any time. We
          will provide notice of any changes by posting the new Terms on this
          page. Your continued use of the Service after any changes indicates
          your acceptance of the new Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">10. Contact Information</h2>
        <p>
          If you have any questions about these Terms, please contact us at{' '}
          <ScrambleEmail emailParts={SUPPORT_EMAIL} />.
        </p>
      </section>

      <footer className="mt-12 text-sm text-gray-600">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </footer>
    </main>
  );
};
