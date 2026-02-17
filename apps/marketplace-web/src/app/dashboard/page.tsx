/**
 * Seller Dashboard - Basic placeholder
 */

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Seller Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="border rounded-lg p-6">
          <h3 className="text-gray-600 mb-2">Total Products</h3>
          <p className="text-3xl font-bold">24</p>
        </div>
        <div className="border rounded-lg p-6">
          <h3 className="text-gray-600 mb-2">Total Orders</h3>
          <p className="text-3xl font-bold">152</p>
        </div>
        <div className="border rounded-lg p-6">
          <h3 className="text-gray-600 mb-2">Revenue</h3>
          <p className="text-3xl font-bold">$12,450</p>
        </div>
      </div>

      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Your Products</h2>
        <p className="text-gray-600">Product management coming soon...</p>
      </div>
    </div>
  );
}
