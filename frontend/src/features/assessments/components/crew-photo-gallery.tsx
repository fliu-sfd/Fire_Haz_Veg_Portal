import { Camera } from "lucide-react";
import { crewPhotoUrl } from "@/features/assessments/api";
import type { CrewPhoto } from "@/features/assessments/types";

type CrewPhotoGalleryProps = {
  photos: CrewPhoto[];
  inspectionNumber: number;
  comparison?: boolean;
};

export function CrewPhotoGallery({ photos, inspectionNumber, comparison = false }: CrewPhotoGalleryProps) {
  if (photos.length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-charcoal">
        <Camera aria-hidden="true" className="size-4 text-civic-blue" />
        Crew photos
      </h4>
      <ul className={`mt-3 grid gap-3 sm:grid-cols-2 ${comparison ? "lg:grid-cols-1" : "lg:grid-cols-3"}`}>
        {photos.map((photo, photoIndex) => (
          <li key={photo.id} className="overflow-hidden rounded-md border border-city-light bg-city-gray">
            <a href={crewPhotoUrl(photo.id)} target="_blank" rel="noreferrer" className="block">
              {/* Protected photos are loaded directly so the browser sends the session cookie. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={crewPhotoUrl(photo.id)}
                alt={`Crew photo ${photoIndex + 1} for inspection point ${inspectionNumber}`}
                loading="lazy"
                className={`aspect-[4/3] w-full ${comparison ? "object-contain" : "object-cover"}`}
              />
              <span className="block truncate px-3 py-2 text-xs font-medium text-city-dark">{photo.fileName}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
