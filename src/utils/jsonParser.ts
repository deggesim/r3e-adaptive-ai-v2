import type { RaceRoomData, Assets, TrackAsset, ClassAsset } from '../types';

export function parseJson(data: RaceRoomData): Assets {
  const numClasses = Object.keys(data.classes).length;
  const classes: Record<string, ClassAsset> = {};
  const classesSorted: ClassAsset[] = [];

  for (const [id, cls] of Object.entries(data.classes)) {
    const tab: ClassAsset = { name: cls.Name, id };
    classesSorted.push(tab);
    classes[id] = tab;
  }

  const tracks: Record<string, TrackAsset> = {};
  const tracksSorted: TrackAsset[] = [];
  let numTracks = 0;

  for (const track of Object.values(data.tracks)) {
    for (const layout of track.layouts) {
      const name = `${track.Name} - ${layout.Name}`;
      const layoutId = layout.Id.toString();
      const tab: TrackAsset = { name, id: layoutId };
      tracksSorted.push(tab);
      tracks[layoutId] = tab;
      numTracks++;
    }
  }

  classesSorted.sort((a, b) => a.name.localeCompare(b.name));
  tracksSorted.sort((a, b) => a.name.localeCompare(b.name));

  return {
    classes,
    classesSorted,
    tracks,
    tracksSorted,
    numClasses,
    numTracks,
  };
}