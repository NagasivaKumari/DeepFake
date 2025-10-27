import React from "react";

export default function Admin() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-2xl font-semibold mb-4">Admin App moved</h1>
        <p className="text-gray-600 mb-2">The admin interface has been moved out of the main app and now lives in the top-level <code>/admin</code> folder as a standalone app.</p>
        <p className="text-gray-600">Run the admin app from the `admin/` folder (it has its own build/dev setup). This placeholder prevents the full admin UI from being bundled into the main user-facing app.</p>
      </div>
    </div>
  );
}
