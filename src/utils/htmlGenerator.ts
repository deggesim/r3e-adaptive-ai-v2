import type { ChampionshipEntry } from "../types";
import type { ParsedRace, RaceSlot } from "../types/raceResults";

interface DriverStanding {
  position: number;
  driver: string;
  vehicle: string;
  vehicleId?: string;
   isHuman: boolean;
  team: string;
  points: number;
  raceResults: (number | null)[];
  racePoints: (number | null)[];
}

interface TeamStanding {
  position: number;
  team: string;
  entries: number;
  points: number;
  racePoints: (number | null)[];
}

interface VehicleStanding {
  position: number;
  vehicle: string;
  vehicleId?: string;
  entries: number;
  points: number;
  racePoints: (number | null)[];
}

interface BestTime {
  driver: string;
  vehicle: string;
  vehicleId?: string;
   isHuman: boolean;
  time: string;
  timeMs: number;
}

const DEFAULT_POINTS_SYSTEM = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

function parseTime(timeStr: string | undefined): number {
  if (!timeStr) return Infinity;
  const parts = timeStr.split(":");
  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    return h * 3600 + m * 60 + s;
  } else if (parts.length === 2) {
    const [m, s] = parts.map(Number);
    return m * 60 + s;
  }
  return Infinity;
}

function formatTimeDiff(baseMs: number, currentMs: number): string {
  const diff = currentMs - baseMs;
  if (diff === 0) return "";
  const sign = diff > 0 ? "+ " : "- ";
  const absDiff = Math.abs(diff) / 1000;
  return `${sign}${absDiff.toFixed(3)}`;
}

function getRacePosition(slots: RaceSlot[], driver: string): number | null {
  const sortedSlots = [...slots].sort((a, b) => {
    const aFinished = a.FinishStatus === "Finished" || !!a.TotalTime;
    const bFinished = b.FinishStatus === "Finished" || !!b.TotalTime;
    if (aFinished !== bFinished) return bFinished ? 1 : -1;

    const aTime = parseTime(a.TotalTime);
    const bTime = parseTime(b.TotalTime);
    return aTime - bTime;
  });

  const index = sortedSlots.findIndex((s) => s.Driver === driver);
  return index >= 0 && sortedSlots[index].TotalTime ? index + 1 : null;
}

function calculateDriverStandings(races: ParsedRace[]): DriverStanding[] {
  const driverMap = new Map<
    string,
    {
      vehicle: string;
      vehicleId?: string;
      isHuman: boolean;
      team: string;
      raceResults: (number | null)[];
      racePoints: (number | null)[];
    }
  >();

  for (const race of races) {
    for (const slot of race.slots) {
      if (!driverMap.has(slot.Driver)) {
        driverMap.set(slot.Driver, {
          vehicle: slot.Vehicle,
          vehicleId: slot.VehicleId,
          isHuman: !!(typeof slot.UserId === "number" && slot.UserId > 0),
          team: slot.Team,
          raceResults: [],
          racePoints: [],
        });
      } else {
        const entry = driverMap.get(slot.Driver)!;
        if (!entry.isHuman && typeof slot.UserId === "number" && slot.UserId > 0) {
          entry.isHuman = true;
        }
      }
    }
  }

  races.forEach((race, raceIdx) => {
    driverMap.forEach((data, driver) => {
      const position = getRacePosition(race.slots, driver);
      data.raceResults[raceIdx] = position;

      if (position !== null && position <= DEFAULT_POINTS_SYSTEM.length) {
        data.racePoints[raceIdx] = DEFAULT_POINTS_SYSTEM[position - 1];
      } else {
        data.racePoints[raceIdx] = null;
      }
    });
  });

  const standings: DriverStanding[] = [];
  driverMap.forEach((data, driver) => {
    const points = data.racePoints.reduce<number>(
      (sum, p) => sum + (p || 0),
      0,
    );
    standings.push({
      position: 0,
      driver,
      vehicle: data.vehicle,
      vehicleId: data.vehicleId,
      team: data.team,
      points,
      raceResults: data.raceResults,
      racePoints: data.racePoints,
      isHuman: data.isHuman,
    });
  });

  standings.sort((a, b) => b.points - a.points);
  standings.forEach((s, i) => (s.position = i + 1));

  return standings;
}

function calculateTeamStandings(races: ParsedRace[]): TeamStanding[] {
  const teamMap = new Map<
    string,
    { entries: Set<string>; racePoints: (number | null)[] }
  >();

  races.forEach((race, raceIdx) => {
    race.slots.forEach((slot) => {
      if (!teamMap.has(slot.Team)) {
        teamMap.set(slot.Team, {
          entries: new Set(),
          racePoints: Array(races.length).fill(null),
        });
      }
      teamMap.get(slot.Team)!.entries.add(slot.Driver);
    });

    const sortedSlots = [...race.slots].sort((a, b) => {
      const aTime = parseTime(a.TotalTime);
      const bTime = parseTime(b.TotalTime);
      return aTime - bTime;
    });

    const teamRacePoints = new Map<string, number>();
    sortedSlots.forEach((slot, idx) => {
      if (idx < DEFAULT_POINTS_SYSTEM.length && slot.TotalTime) {
        const pts = teamRacePoints.get(slot.Team) || 0;
        teamRacePoints.set(slot.Team, pts + DEFAULT_POINTS_SYSTEM[idx]);
      }
    });

    teamRacePoints.forEach((pts, team) => {
      teamMap.get(team)!.racePoints[raceIdx] = pts;
    });
  });

  const standings: TeamStanding[] = [];
  teamMap.forEach((data, team) => {
    const points = data.racePoints.reduce<number>(
      (sum, p) => sum + (p || 0),
      0,
    );
    standings.push({
      position: 0,
      team,
      entries: data.entries.size,
      points,
      racePoints: data.racePoints,
    });
  });

  standings.sort((a, b) => b.points - a.points);
  standings.forEach((s, i) => (s.position = i + 1));

  return standings;
}

function calculateVehicleStandings(races: ParsedRace[]): VehicleStanding[] {
  const vehicleMap = new Map<
    string,
    { vehicleId?: string; entries: Set<string>; racePoints: (number | null)[] }
  >();

  races.forEach((race, raceIdx) => {
    race.slots.forEach((slot) => {
      if (!vehicleMap.has(slot.Vehicle)) {
        vehicleMap.set(slot.Vehicle, {
          vehicleId: slot.VehicleId,
          entries: new Set(),
          racePoints: Array(races.length).fill(null),
        });
      }
      vehicleMap.get(slot.Vehicle)!.entries.add(slot.Driver);
    });

    const sortedSlots = [...race.slots].sort((a, b) => {
      const aTime = parseTime(a.TotalTime);
      const bTime = parseTime(b.TotalTime);
      return aTime - bTime;
    });

    const vehicleRacePoints = new Map<string, number>();
    sortedSlots.forEach((slot, idx) => {
      if (idx < DEFAULT_POINTS_SYSTEM.length && slot.TotalTime) {
        const pts = vehicleRacePoints.get(slot.Vehicle) || 0;
        vehicleRacePoints.set(slot.Vehicle, pts + DEFAULT_POINTS_SYSTEM[idx]);
      }
    });

    vehicleRacePoints.forEach((pts, vehicle) => {
      vehicleMap.get(vehicle)!.racePoints[raceIdx] = pts;
    });
  });

  const standings: VehicleStanding[] = [];
  vehicleMap.forEach((data, vehicle) => {
    const points = data.racePoints.reduce<number>(
      (sum, p) => sum + (p || 0),
      0,
    );
    standings.push({
      position: 0,
      vehicle,
      vehicleId: data.vehicleId,
      entries: data.entries.size,
      points,
      racePoints: data.racePoints,
    });
  });

  standings.sort((a, b) => b.points - a.points);
  standings.forEach((s, i) => (s.position = i + 1));

  return standings;
}

function getBestLapTimes(races: ParsedRace[], topN: number = 20): BestTime[][] {
  return races.map((race) => {
    const times: BestTime[] = race.slots
      .filter((s) => s.BestLap)
      .map((s) => ({
        driver: s.Driver,
        vehicle: s.Vehicle,
        vehicleId: s.VehicleId,
        isHuman: !!(typeof s.UserId === "number" && s.UserId > 0),
        time: s.BestLap!,
        timeMs: parseTime(s.BestLap!) * 1000,
      }))
      .sort((a, b) => a.timeMs - b.timeMs);

    return times.slice(0, topN);
  });
}

function getBestQualifyingTimes(
  races: ParsedRace[],
  topN: number = 20,
): BestTime[][] {
  return races.map((race) => {
    const times: BestTime[] = race.slots
      .filter((s) => s.QualTime)
      .map((s) => ({
        driver: s.Driver,
        vehicle: s.Vehicle,
        vehicleId: s.VehicleId,
        isHuman: !!(typeof s.UserId === "number" && s.UserId > 0),
        time: s.QualTime!,
        timeMs: parseTime(s.QualTime!) * 1000,
      }))
      .sort((a, b) => a.timeMs - b.timeMs);

    return times.slice(0, topN);
  });
}

export function generateStandingsHTML(
  races: ParsedRace[],
  championshipName: string,
  leaderboardAssets?: {
    classes: Record<string, string>;
    tracks: Record<string, string>;
  },
  gameData?: Record<string, any> | null,
): string {
  // Helper function to get vehicle name from ID
  const getVehicleName = (vehicleId?: string, vehicleName?: string): string => {
    if (vehicleName && vehicleName !== vehicleId) return vehicleName;
    if (!vehicleId || !gameData?.cars) return vehicleName || vehicleId || "";
    const car = gameData.cars[vehicleId];
    return car?.Name || vehicleName || vehicleId;
  };

  const driverStandings = calculateDriverStandings(races);
  const teamStandings = calculateTeamStandings(races);
  const vehicleStandings = calculateVehicleStandings(races);
  const bestLapTimes = getBestLapTimes(races);
  const bestQualTimes = getBestQualifyingTimes(races);

  let html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8"/>
<link href='http://fonts.googleapis.com/css?family=Open+Sans:400,700' rel='stylesheet' type='text/css'>
<style>
body { font-family: 'Open Sans', sans-serif; margin: 20px; background: #f5f5f5; }
h1 { color: #333; margin-bottom: 5px; }
h3 { color: #666; margin-top: 0; }
table { border-collapse: collapse; width: 100%; margin: 30px 0; background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
caption { font-size: 1.3em; font-weight: bold; padding: 15px; background: #2c3e50; color: white; text-align: left; }
thead { background-color: #34495e; color: white; }
th { border: 1px solid #ddd; padding: 12px 8px; text-align: center; font-weight: 600; }
td { border: 1px solid #ddd; padding: 10px 8px; text-align: center; }
tbody tr:hover { background-color: #ecf0f1; }
.even { background-color: #f9f9f9; }
.points { font-weight: bold; font-size: 1.1em; }
.pos1 { background-color: #ffd700 !important; }
.pos2 { background-color: #c0c0c0 !important; }
.pos3 { background-color: #cd7f32 !important; }
.track-header { font-size: 0.9em; padding: 5px; }
.track-header img { display: block; margin: 5px auto; max-width: 80px; height: auto; }
.track-time { font-size: 0.8em; color: #95a5a6; display: block; }
.driver-name { text-align: left; font-weight: 600; }
.vehicle-name, .team-name { text-align: left; font-size: 0.9em; }
.vehicle-icon { height: auto; vertical-align: middle; margin-right: 5px; }
.human-badge { display: inline-flex; align-items: center; gap: 4px; margin-left: 8px; padding: 2px 6px; border-radius: 999px; background: #16a085; color: white; font-size: 0.75em; font-weight: 700; text-transform: uppercase; }
.time-diff { color: #e74c3c; font-size: 0.85em; display: block; }
.minor { color: #7f8c8d; font-size: 0.9em; margin-bottom: 20px; }
</style>
</head>
<body>
<span class="minor">Generated from R3E Toolbox</span>
<h1>${championshipName}</h1>
<h3>Championship Standings</h3>

<!-- Driver Standings -->
<table>
<caption>Driver Standings</caption>
<thead>
<tr>
<th rowspan="2">Pos</th>
<th rowspan="2">Driver</th>
<th rowspan="2">Vehicle</th>
<th rowspan="2">Team</th>
<th rowspan="2">Points</th>`;

  races.forEach((race) => {
    const trackImg = leaderboardAssets?.tracks[race.trackname] || "";
    html += `\n<th colspan="2" class="track-header">`;
    if (trackImg) html += `<img src="${trackImg}" alt="${race.trackname}"/>`;
    html += `${race.trackname}<span class="track-time">${race.timestring}</span></th>`;
  });

  html += `
</tr>
<tr>`;
  races.forEach(() => {
    html += `\n<th>Pts</th><th>Pos</th>`;
  });
  html += `
</tr>
</thead>
<tbody>`;

  driverStandings.forEach((standing, idx) => {
    const rowClass = idx % 2 === 0 ? "" : ' class="even"';
    const vehicleIcon =
      standing.vehicleId && leaderboardAssets?.classes[standing.vehicleId]
        ? leaderboardAssets.classes[standing.vehicleId]
        : "";
    const displayVehicleName = getVehicleName(standing.vehicleId, standing.vehicle);
    const humanBadge = standing.isHuman
      ? '<span class="human-badge">Human</span>'
      : "";
    html += `\n<tr${rowClass}>
<td>${standing.position}</td>
<td class="driver-name">${standing.driver}${humanBadge}</td>
<td class="vehicle-name">${vehicleIcon ? `<img src="${vehicleIcon}" class="vehicle-icon" alt="${displayVehicleName}" title="${displayVehicleName}"/> ${displayVehicleName}` : displayVehicleName}</td>
<td class="team-name">${standing.team}</td>
<td class="points">${standing.points}</td>`;

    standing.racePoints.forEach((pts, raceIdx) => {
      const pos = standing.raceResults[raceIdx];
      html += `\n<td class="points">${pts !== null ? pts : "-"}</td>`;

      let posClass = "";
      if (pos === 1) posClass = ' class="pos1"';
      else if (pos === 2) posClass = ' class="pos2"';
      else if (pos === 3) posClass = ' class="pos3"';

      html += `\n<td${posClass}>${pos !== null ? pos : "-"}</td>`;
    });

    html += "\n</tr>";
  });

  html += `
</tbody>
</table>

<!-- Team Standings -->
<table>
<caption>Team Standings</caption>
<thead>
<tr>
<th rowspan="2">Pos</th>
<th rowspan="2">Team</th>
<th rowspan="2">Entries</th>
<th rowspan="2">Points</th>`;

  races.forEach((race) => {
    html += `\n<th class="track-header">${race.trackname}<span class="track-time">${race.timestring}</span></th>`;
  });

  html += `
</tr>
</thead>
<tbody>`;

  teamStandings.forEach((standing, idx) => {
    const rowClass = idx % 2 === 0 ? "" : ' class="even"';
    html += `\n<tr${rowClass}>
<td>${standing.position}</td>
<td class="team-name">${standing.team}</td>
<td>${standing.entries}</td>
<td class="points">${standing.points}</td>`;

    standing.racePoints.forEach((pts) => {
      html += `\n<td class="points">${pts !== null ? pts : "-"}</td>`;
    });

    html += "\n</tr>";
  });

  html += `
</tbody>
</table>

<!-- Vehicle Standings -->
<table>
<caption>Vehicle Standings</caption>
<thead>
<tr>
<th rowspan="2">Pos</th>
<th rowspan="2">Vehicle</th>
<th rowspan="2">Entries</th>
<th rowspan="2">Points</th>`;

  races.forEach((race) => {
    html += `\n<th class="track-header">${race.trackname}<span class="track-time">${race.timestring}</span></th>`;
  });

  html += `
</tr>
</thead>
<tbody>`;

  vehicleStandings.forEach((standing, idx) => {
    const rowClass = idx % 2 === 0 ? "" : ' class="even"';
    const vehicleIcon =
      standing.vehicleId && leaderboardAssets?.classes[standing.vehicleId]
        ? leaderboardAssets.classes[standing.vehicleId]
        : "";
    const displayVehicleName = getVehicleName(standing.vehicleId, standing.vehicle);
    const vehicleDisplay = vehicleIcon
      ? `<img src="${vehicleIcon}" class="vehicle-icon" alt="${displayVehicleName}" title="${displayVehicleName}"/> ${displayVehicleName}`
      : displayVehicleName;
    html += `\n<tr${rowClass}>
<td>${standing.position}</td>
<td class="vehicle-name">${vehicleDisplay}</td>
<td>${standing.entries}</td>
<td class="points">${standing.points}</td>`;

    standing.racePoints.forEach((pts) => {
      html += `\n<td class="points">${pts !== null ? pts : "-"}</td>`;
    });

    html += "\n</tr>";
  });

  html += `
</tbody>
</table>

<!-- Best Race Lap Times -->
<table>
<caption>Best Race Lap Times</caption>
<thead>
<tr>
<th>Pos</th>`;

  races.forEach((race) => {
    html += `\n<th class="track-header">${race.trackname}<span class="track-time">${race.timestring}</span></th>`;
  });

  html += `
</tr>
</thead>
<tbody>`;

  const maxLapRows = Math.max(...bestLapTimes.map((times) => times.length));
  for (let i = 0; i < maxLapRows; i++) {
    const rowClass = i % 2 === 0 ? "" : ' class="even"';
    html += `\n<tr${rowClass}>
<td>${i + 1}</td>`;

    bestLapTimes.forEach((raceTimes) => {
      if (i < raceTimes.length) {
        const time = raceTimes[i];
        const diff =
          i > 0 ? formatTimeDiff(raceTimes[0].timeMs, time.timeMs) : "";
        const diffHtml = diff
          ? '<span class="time-diff">' + diff + "</span>"
          : "";
        const vehicleIcon =
          time.vehicleId && leaderboardAssets?.classes[time.vehicleId]
            ? leaderboardAssets.classes[time.vehicleId]
            : "";
        const displayVehicleName = getVehicleName(time.vehicleId, time.vehicle);
        const vehicleDisplay = vehicleIcon
          ? `<img src="${vehicleIcon}" class="vehicle-icon" alt="${displayVehicleName}" title="${displayVehicleName}"/> ${displayVehicleName}`
          : displayVehicleName;
        const humanBadge = time.isHuman
          ? '<span class="human-badge">Human</span>'
          : "";
        html += `\n<td class="driver-name">${time.driver}${humanBadge}<br><span class="vehicle-name">${vehicleDisplay}</span><br>${time.time}${diffHtml}</td>`;
      } else {
        html += `\n<td>-</td>`;
      }
    });

    html += "\n</tr>";
  }

  html += `
</tbody>
</table>

<!-- Best Qualification Times -->
<table>
<caption>Best Qualification Times</caption>
<thead>
<tr>
<th>Pos</th>`;

  races.forEach((race) => {
    html += `\n<th class="track-header">${race.trackname}<span class="track-time">${race.timestring}</span></th>`;
  });

  html += `
</tr>
</thead>
<tbody>`;

  const maxQualRows = Math.max(...bestQualTimes.map((times) => times.length));
  for (let i = 0; i < maxQualRows; i++) {
    const rowClass = i % 2 === 0 ? "" : ' class="even"';
    html += `\n<tr${rowClass}>
<td>${i + 1}</td>`;

    bestQualTimes.forEach((raceTimes) => {
      if (i < raceTimes.length) {
        const time = raceTimes[i];
        const diff =
          i > 0 ? formatTimeDiff(raceTimes[0].timeMs, time.timeMs) : "";
        const diffHtml = diff
          ? '<span class="time-diff">' + diff + "</span>"
          : "";
        const vehicleIcon =
          time.vehicleId && leaderboardAssets?.classes[time.vehicleId]
            ? leaderboardAssets.classes[time.vehicleId]
            : "";
        const displayVehicleName = getVehicleName(time.vehicleId, time.vehicle);
        const vehicleDisplay = vehicleIcon
          ? `<img src="${vehicleIcon}" class="vehicle-icon" alt="${displayVehicleName}" title="${displayVehicleName}"/> ${displayVehicleName}`
          : displayVehicleName;
        const humanBadge = time.isHuman
          ? '<span class="human-badge">Human</span>'
          : "";
        html += `\n<td class="driver-name">${time.driver}${humanBadge}<br><span class="vehicle-name">${vehicleDisplay}</span><br>${time.time}${diffHtml}</td>`;
      } else {
        html += `\n<td>-</td>`;
      }
    });

    html += "\n</tr>";
  }

  html += `
</tbody>
</table>

<!-- Race Results -->
<table>
<caption>Race Results</caption>
<thead>
<tr>
<th>Pos</th>`;

  races.forEach((race) => {
    html += `\n<th class="track-header">${race.trackname}<span class="track-time">${race.timestring}</span></th>`;
  });

  html += `
</tr>
</thead>
<tbody>`;

  const maxDrivers = Math.max(
    ...driverStandings.map((s) => s.raceResults.length),
  );
  for (let pos = 1; pos <= maxDrivers; pos++) {
    const rowClass = pos % 2 === 0 ? ' class="even"' : "";
    html += `\n<tr${rowClass}>
<td>${pos}</td>`;

    races.forEach((_race, raceIdx) => {
      const driver = driverStandings.find(
        (s) => s.raceResults[raceIdx] === pos,
      );
      if (driver) {
        let posClass = "";
        if (pos === 1) posClass = ' class="pos1"';
        else if (pos === 2) posClass = ' class="pos2"';
        else if (pos === 3) posClass = ' class="pos3"';

        const humanBadge = driver.isHuman
          ? '<span class="human-badge">Human</span>'
          : "";
        html += `\n<td${posClass} class="driver-name">${driver.driver}${humanBadge}</td>`;
      } else {
        html += `\n<td>-</td>`;
      }
    });

    html += "\n</tr>";
  }

  html += `
</tbody>
</table>

</body>
</html>`;

  return html;
}

export function generateChampionshipIndexHTML(
  championships: ChampionshipEntry[],
): string {
  const sorted = [...championships].sort((a, b) =>
    b.generatedAt.localeCompare(a.generatedAt),
  );

  const rows = sorted
    .map((c, idx) => {
      const date = new Date(c.generatedAt);
      const formattedDate = date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      const rowClass = idx % 2 === 0 ? "even" : "odd";

      const carCell = c.carName
        ? `<div class="car-cell">
            ${c.carIcon ? `<img src="${c.carIcon}" alt="${c.carName || "Car icon"}" />` : ""}
            <span>${c.carName}</span>
          </div>`
        : "-";

      return `<tr class="${rowClass}">
  <td class="alias"><a href="./${encodeURIComponent(
    c.fileName,
  )}" target="_blank" rel="noopener noreferrer">${c.alias}</a></td>
  <td class="car">${carCell}</td>
  <td class="races">${c.races}</td>
  <td class="date">${formattedDate}</td>
</tr>`;
    })
    .join("\n");

  const emptyState = `<tr><td colspan="4" class="empty">No championships exported yet.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Championship Index</title>
  <style>
    :root {
      --bg: #0b1021;
      --card: #141a33;
      --text: #f7f8ff;
      --muted: #a9b1d6;
      --accent: #7aa2f7;
      --border: #1f2747;
      --row-even: #11182d;
    }
    body {
      margin: 0;
      font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
      background: radial-gradient(circle at 20% 20%, #101732, #0b1021 40%),
                  radial-gradient(circle at 80% 0%, #122349, #0b1021 30%),
                  #0b1021;
      color: var(--text);
      min-height: 100vh;
      padding: 24px;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.35);
      overflow: hidden;
    }
    header {
      padding: 24px 28px;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(135deg, rgba(122,162,247,0.12), rgba(122,162,247,0));
    }
    h1 {
      margin: 0;
      font-size: 1.4rem;
      letter-spacing: 0.5px;
    }
    p.subtitle {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 0.95rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 14px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th {
      color: var(--muted);
      font-weight: 600;
      font-size: 0.9rem;
      background: #0f152b;
    }
    tr.even { background: var(--row-even); }
    tr:hover { background: rgba(122,162,247,0.08); }
    a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
    }
    a:hover { text-decoration: underline; }
    td.alias { width: 45%; }
    td.car { width: 20%; color: var(--muted); }
    td.car .car-cell { display: inline-flex; align-items: center; gap: 10px; }
    td.car img { width: 28px; height: 28px; object-fit: contain; border-radius: 6px; background: #0f152b; padding: 4px; border: 1px solid var(--border); }
    td.car span { color: var(--text); font-weight: 600; }
    td.races { width: 15%; color: var(--muted); }
    td.date { width: 20%; color: var(--muted); }
    td.empty {
      text-align: center;
      color: var(--muted);
      padding: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Championship Index</h1>
      <p class="subtitle">Links to exported standings (save all files in the same folder).</p>
    </header>
    <table>
      <thead>
        <tr>
          <th>Championship</th>
          <th>Car</th>
          <th>Races</th>
          <th>Generated</th>
        </tr>
      </thead>
      <tbody>
        ${rows || emptyState}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

export function downloadHTML(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
