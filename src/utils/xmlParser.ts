import { XMLParser } from 'fast-xml-parser';
import type { Database, PlayerTimes } from '../types';

/**
 * Parses RaceRoom's aiadaptation.xml file structure.
 * Handles mixed array/object patterns in XML (single vs multiple entries).
 */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
});

/**
 * Parses the aiadaptation.xml file and populates database and player times.
 * Extracts AI skill levels, lap times, and number of sampled races for each track/class combo.
 * Preserves both single best player lap time and array of all player lap times.
 * Returns true if data was successfully parsed and added.
 */
export function parseAdaptive(xmlText: string, database: Database, playertimes?: PlayerTimes): boolean {
  const xml = parser.parse(xmlText);
  if (!xml) return false;

  // Get adaptation data: layout (track) and carClass (class) combinations
  const tracklist = xml.AiAdaptation.aiAdaptationData;
  if (!tracklist || typeof tracklist !== 'object') return false;

  // Handle both single entry and array of entries (XML parser quirk)
  const layoutIds = Array.isArray(tracklist.layoutId) ? tracklist.layoutId : [tracklist.layoutId];
  const values = Array.isArray(tracklist.value) ? tracklist.value : [tracklist.value];

  if (layoutIds.length !== values.length) return false;

  let added = false;

  for (let i = 0; i < layoutIds.length; i++) {
    const trackkey = layoutIds[i];
    const trackvalue = values[i];
    if (!trackkey || !trackvalue) continue;

    const trackid = trackkey["#text"]?.toString();
    if (!trackid) continue;

    if (!trackvalue || typeof trackvalue !== 'object') continue;

    const carClassIds = Array.isArray(trackvalue.carClassId) ? trackvalue.carClassId : [trackvalue.carClassId];
    const sampledDatas = Array.isArray(trackvalue.sampledData) ? trackvalue.sampledData : [trackvalue.sampledData];

    if (carClassIds.length !== sampledDatas.length) continue;

    for (let j = 0; j < carClassIds.length; j++) {
      const classkey = carClassIds[j];
      const classcustom = sampledDatas[j];
      if (!classkey || !classcustom) continue;

      const classid = classkey["#text"]?.toString();
      if (!classid) continue;

      const playerentries = classcustom.playerBestLapTimes;
      const aientries = classcustom.aiSkillVsLapTimes;

      // Extract player best lap times (all of them, not just the best)
      if (playertimes && playerentries) {
        const class_pt = playertimes.classes[classid] || { tracks: {} };
        playertimes.classes[classid] = class_pt;
        const track_pt = class_pt.tracks[trackid] || { playertimes: [], playertime: undefined };
        class_pt.tracks[trackid] = track_pt;

        // Handle both single and multiple lap time entries
        const lapTimes = Array.isArray(playerentries.lapTime) ? playerentries.lapTime : [playerentries.lapTime];
        const allTimes: number[] = [];
        let mintime = 1000000;
        for (const entry of lapTimes) {
          if (entry) {
            const playertime = parseFloat(entry["#text"] || entry);
            if (!isNaN(playertime)) {
              allTimes.push(playertime);
              mintime = Math.min(playertime, mintime);
            }
          }
        }
        // Store both: array of all times and single best time
        if (allTimes.length > 0) {
          track_pt.playertimes = allTimes;
          track_pt.playertime = mintime;
        }
      }

      // Extract AI skill levels and their corresponding lap times
      if (aientries) {
        // Handle both single and multiple AI entries
        const aiSkills = Array.isArray(aientries.aiSkill) ? aientries.aiSkill : [aientries.aiSkill];
        const aiDatas = Array.isArray(aientries.aiData) ? aientries.aiData : [aientries.aiData];

        if (aiSkills.length === aiDatas.length) {
          const class_db = database.classes[classid] || { tracks: {} };
          const track_db = class_db.tracks[trackid] || { ailevels: {}, samplesCount: {} };

          // Parse each AI level and store lap times with sample count
          for (let k = 0; k < aiSkills.length; k++) {
            const ailevel = parseInt(aiSkills[k]["#text"] || aiSkills[k]);
            const aitime = parseFloat(aiDatas[k].averagedLapTime["#text"] || aiDatas[k].averagedLapTime);
            // Preserve numberOfSampledRaces to distinguish original data from generated entries
            const numSamples = parseInt(aiDatas[k].numberOfSampledRaces?.["#text"] || aiDatas[k].numberOfSampledRaces || "1");
            if (isNaN(aitime)) continue;

            // Update class and track min/max AI levels
            class_db.minAI = Math.min(ailevel, class_db.minAI || ailevel);
            class_db.maxAI = Math.max(ailevel, class_db.maxAI || ailevel);

            track_db.minAI = Math.min(ailevel, track_db.minAI || ailevel);
            track_db.maxAI = Math.max(ailevel, track_db.maxAI || ailevel);

            // Store lap times for this AI level
            const times = track_db.ailevels[ailevel] || [];
            track_db.ailevels[ailevel] = times;

            // Track sample count per AI level
            const samplesCount = track_db.samplesCount || {};
            track_db.samplesCount = samplesCount;
            samplesCount[ailevel] = numSamples;

            // Add time if not already present
            const found = times.includes(aitime);
            if (!found) {
              added = true;
              times.push(aitime);
            }
          }

          if (track_db.maxAI !== undefined) {
            class_db.tracks[trackid] = track_db;
            database.classes[classid] = class_db;
          }
        }
      }
    }
  }

  return added;
}