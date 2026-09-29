export default function Privacy() {
  return (
    <div className="safe-top mx-auto max-w-2xl px-4 py-8 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      <h2 className="mt-6 text-base font-semibold">What we collect</h2>
      <p className="mt-2">
        Sriram Hollow Bricks stores the business data you enter: your business
        profile (name, phone, address, GSTIN), your customers, products, invoices,
        payments, and expenses. This data is stored on your device and synced to
        Google Firebase (Firestore and Authentication) so it survives device loss.
      </p>

      <h2 className="mt-6 text-base font-semibold">How we use it</h2>
      <p className="mt-2">
        Your data is used only to provide the app's features. We do not sell it,
        share it with advertisers, or use it for profiling. There is no
        third-party analytics SDK in this application.
      </p>

      <h2 className="mt-6 text-base font-semibold">Who can see it</h2>
      <p className="mt-2">
        Your account is protected by Firebase Authentication. Firestore security
        rules restrict access so that only the signed-in owner of a business can
        read or write that business's documents.
      </p>

      <h2 className="mt-6 text-base font-semibold">Data retention and deletion</h2>
      <p className="mt-2">
        You can delete individual records at any time inside the app. To delete
        your account and all associated data, contact us at the email below.
        Requests are processed within 30 days.
      </p>

      <h2 className="mt-6 text-base font-semibold">Backups</h2>
      <p className="mt-2">
        Settings → Export backup downloads a JSON file of your entire business.
        Keep it safe — it is not encrypted.
      </p>

      <h2 className="mt-6 text-base font-semibold">Children</h2>
      <p className="mt-2">
        This app is not intended for use by anyone under 18.
      </p>

      <h2 className="mt-6 text-base font-semibold">Contact</h2>
      <p className="mt-2">
        <a href="mailto:privacy@sriram-hollow-bricks.web.app" className="text-primary underline">
          privacy@sriram-hollow-bricks.web.app
        </a>
      </p>
    </div>
  )
}
