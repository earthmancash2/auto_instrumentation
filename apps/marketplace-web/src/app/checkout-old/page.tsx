/**
 * Old Checkout Page
 * TODO: Remove after migrating to new checkout flow
 * Feature flag: USE_NEW_CHECKOUT
 */

export default function OldCheckoutPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              This is the old checkout flow. The new checkout is available at <a href="/checkout" className="underline">/checkout</a>
            </p>
          </div>
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-6">Checkout (Old Version)</h1>

      <div className="border rounded-lg p-6">
        <p className="text-gray-600">
          This checkout flow is deprecated and will be removed once the new checkout (with Server Actions) is fully tested.
        </p>
        <p className="text-gray-600 mt-2">
          Feature flag: <code className="bg-gray-100 px-2 py-1 rounded">USE_NEW_CHECKOUT=false</code>
        </p>
      </div>

      {/* TODO: Remove this entire file after migration */}
      {/* FIXME: Some users still linked to this URL from old emails */}
    </div>
  );
}
