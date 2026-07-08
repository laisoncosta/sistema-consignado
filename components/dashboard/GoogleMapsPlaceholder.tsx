type GoogleMapsPlaceholderProps = {
  latitude: number;
  longitude: number;
};

export function GoogleMapsPlaceholder({
  latitude,
  longitude,
}: GoogleMapsPlaceholderProps) {
  return (
    <iframe
      width="100%"
      height="200"
      className="mt-2 rounded-lg border border-slate-200"
      title="Mapa da localização do check-in"
      loading="lazy"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}`}
    />
  );
}
