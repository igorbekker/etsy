"use client";

const GLOSSARY_SECTIONS = [
  {
    title: "Overall SEO Score (0–100)",
    description: "A weighted sum of five sub-scores. Each sub-score is evaluated independently and scaled to its maximum point value. The total possible is 100 points.",
    table: {
      headers: ["Category", "Max Points", "What It Measures"],
      rows: [
        ["Title", "25", "Length, structure, keyword placement, readability"],
        ["Tags", "25", "Tag count, multi-word usage, diversity, uniqueness"],
        ["Description", "20", "Length, paragraph structure, keyword overlap, practical info"],
        ["Images", "15", "Image count, alt text presence, alt text quality"],
        ["Metadata", "15", "Category, materials, styles, processing, personalization, section"],
      ],
    },
    bands: [
      { color: "text-green-400", label: "70–100", desc: "Good — well-optimized, minor improvements possible" },
      { color: "text-yellow-400", label: "40–69", desc: "Needs work — several meaningful opportunities" },
      { color: "text-red-400", label: "0–39", desc: "Poor — significant improvements needed" },
    ],
  },
  {
    title: "Title Score (max 25 pts)",
    description: "Evaluates the listing title for length, structure, keyword density, and readability.",
    rules: [
      { points: "+10", condition: "Length is 80–140 characters (ideal range)" },
      { points: "+5", condition: "Length is 60–79 or 141–160 characters (acceptable range)" },
      { points: "−5", condition: "Length is under 40 characters (too short)" },
      { points: "+5", condition: "Word count is 8–20 words" },
      { points: "−3", condition: "Word count is under 5 words" },
      { points: "+3", condition: "3 or fewer commas (no keyword stuffing)" },
      { points: "+4", condition: "First word is not a filler (A, An, The, My)" },
      { points: "+3", condition: "Uses a separator character (|, –, ,, &)" },
    ],
  },
  {
    title: "Tags Score (max 25 pts)",
    description: "Evaluates the listing tags for completeness, diversity, and specificity.",
    rules: [
      { points: "+10", condition: "All 13 tag slots are used" },
      { points: "+7", condition: "10–12 tags used" },
      { points: "+4", condition: "6–9 tags used" },
      { points: "+8", condition: "More than 50% of tags are multi-word phrases" },
      { points: "+4", condition: "No duplicate tags" },
      { points: "+3", condition: "Average tag length is 4 or more characters" },
    ],
  },
  {
    title: "Description Score (max 20 pts)",
    description: "Evaluates the listing description for length, structure, keyword coverage, and shopper-relevant information.",
    rules: [
      { points: "+8", condition: "Description is 500 or more characters" },
      { points: "+4", condition: "Description is 200–499 characters" },
      { points: "+4", condition: "Description has 3 or more paragraph breaks (line breaks)" },
      { points: "+5", condition: "At least one keyword from the title appears in the description" },
      { points: "+3", condition: "Description mentions practical info: shipping, materials, sizing, or care instructions" },
    ],
  },
  {
    title: "Images Score (max 15 pts)",
    description: "Evaluates image quantity and alt text quality. Alt text improves Etsy SEO and accessibility.",
    rules: [
      { points: "+6", condition: "8–10 images uploaded (ideal)" },
      { points: "+4", condition: "5–7 images uploaded" },
      { points: "+2", condition: "1–4 images uploaded" },
      { points: "+5", condition: "All images have alt text" },
      { points: "+2", condition: "Some images have alt text" },
      { points: "+4", condition: "Average alt text length is 20 or more characters" },
      { points: "+2", condition: "Some alt text is present but below 20 characters average" },
    ],
  },
  {
    title: "Metadata Score (max 15 pts)",
    description: "Evaluates whether all optional but important listing fields are filled in. Etsy uses these for search categorization.",
    rules: [
      { points: "+3", condition: "Category (taxonomy_id) is set" },
      { points: "+3", condition: "At least one material is listed" },
      { points: "+3", condition: "At least one style is listed" },
      { points: "+3", condition: "Processing time (min and max days) is set" },
      { points: "+2", condition: "Personalization is enabled (is_personalizable = true)" },
      { points: "+1", condition: "Listing is assigned to a shop section" },
    ],
  },
  {
    title: "AI Recommendations — How They Work",
    description: "When you open the AI Recs tab on a listing, the app sends the full listing data (title, description, tags, images, SEO score, and competitor data from Etsy search) to Claude. Claude returns specific rewrites for the title, description, tags, and image alt texts — plus a short reasoning for each change and an overall optimization strategy.",
    notes: [
      "Recommendations are generated fresh each time (not cached).",
      "Title, description, and tags cannot be updated via the Etsy API v3 — these are manual copy-paste changes.",
      "Image alt text can be updated via the Etsy API in a future Phase 2 feature.",
      "Regenerating produces a new independent response — variation between runs is expected.",
    ],
  },
];

export function GlossaryPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
      <h2 className="text-xl font-bold text-white mb-2">Glossary & Scoring Rules</h2>
      <p className="text-sm text-gray-500 mb-8">
        All business rules used to calculate scores and generate recommendations. Updated to match the live scoring engine.
      </p>

      <div className="space-y-8">
        {GLOSSARY_SECTIONS.map((section) => (
          <div key={section.title} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-white">{section.title}</h3>
              <p className="text-xs text-gray-400 mt-1">{section.description}</p>
            </div>

            <div className="p-5 space-y-4">
              {"table" in section && section.table && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-800">
                      {section.table.headers.map((h) => (
                        <th key={h} className="text-left text-gray-500 uppercase tracking-wider pb-2 pr-4 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {section.table.rows.map(([cat, pts, desc]) => (
                      <tr key={cat}>
                        <td className="py-2 pr-4 text-white font-medium">{cat}</td>
                        <td className="py-2 pr-4 text-orange-400 font-mono">{pts}</td>
                        <td className="py-2 text-gray-400">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {"bands" in section && section.bands && (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">Score Bands</p>
                  {section.bands.map((band) => (
                    <div key={band.label} className="flex items-center gap-3 text-xs">
                      <span className={`font-mono font-bold w-14 flex-shrink-0 ${band.color}`}>{band.label}</span>
                      <span className="text-gray-400">{band.desc}</span>
                    </div>
                  ))}
                </div>
              )}

              {"rules" in section && section.rules && (
                <div className="space-y-1.5">
                  {section.rules.map((rule, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                      <span className={`font-mono font-bold w-8 flex-shrink-0 ${rule.points.startsWith("+") ? "text-green-400" : "text-red-400"}`}>
                        {rule.points}
                      </span>
                      <span className="text-gray-300">{rule.condition}</span>
                    </div>
                  ))}
                </div>
              )}

              {"notes" in section && section.notes && (
                <ul className="space-y-1.5">
                  {section.notes.map((note, i) => (
                    <li key={i} className="text-xs text-gray-400 flex gap-2">
                      <span className="text-gray-600 flex-shrink-0">—</span>
                      {note}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
