"use client";

import type { Listing } from "@/types";

interface ImagesTabProps {
  listing: Listing;
}

export function ImagesTab({ listing }: ImagesTabProps) {
  return (
    <section>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Images ({listing.images?.length || 0}/10)
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {listing.images?.sort((a, b) => a.rank - b.rank).map((img) => (
          <div key={img.listing_image_id}>
            <img
              src={img.url_570xN}
              alt={img.alt_text || "Listing image"}
              className="w-full rounded-lg border border-gray-700"
            />
            <div className="mt-1 text-xs">
              <span className="text-gray-500">Alt: </span>
              <span className={img.alt_text ? "text-gray-300" : "text-red-400"}>
                {img.alt_text || "Missing!"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
