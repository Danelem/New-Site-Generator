import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen p-8 sm:p-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-gray-900">
          Creatine Funnel Site Generator (Option B)
        </h1>
        
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            What This Tool Does
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            This generator empowers marketing teams to create professional funnel pages 
            for creatine products without waiting on developers. Simply pick a template, 
            fill in your product details and target audience information, and let AI 
            generate compelling content for your funnel.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Preview your funnel in real-time, make adjustments, and export a 
            developer-ready package when you&apos;re satisfied. The exported files can be 
            handed directly to your dev team for production deployment.
          </p>
        </div>

        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <Link 
            href="/wizard"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
          >
            Create New Funnel Site
          </Link>
          <Link 
            href="/preview"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
          >
            View Template Preview
          </Link>
          <Link 
            href="/templates"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg"
          >
            Manage Templates
          </Link>
          <Link 
            href="/funnels"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-md hover:shadow-lg"
          >
            My Funnels
          </Link>
        </div>

      </div>
    </main>
  )
}

