import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Alert, Button, Container } from "react-bootstrap";
import { useChampionshipStore } from "../store/championshipStore";
import { useLeaderboardAssetsStore } from "../store/leaderboardAssetsStore";
import { makeTime } from "../utils/timeUtils";
import "./ResultsDatabaseDetail.css";

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

function getRacePosition(slots: any[], driver: string): number | null {
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

function calculateDriverStandings(races: any[]): DriverStanding[] {
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
      if (driverMap.has(slot.Driver)) {
        const entry = driverMap.get(slot.Driver)!;
        if (
          !entry.isHuman &&
          typeof slot.UserId === "number" &&
          slot.UserId > 0
        ) {
          entry.isHuman = true;
        }
      } else {
        driverMap.set(slot.Driver, {
          vehicle: slot.Vehicle,
          vehicleId: slot.VehicleId,
          isHuman: !!(typeof slot.UserId === "number" && slot.UserId > 0),
          team: slot.Team,
          raceResults: [],
          racePoints: [],
        });
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

function calculateTeamStandings(races: any[]): TeamStanding[] {
  const teamMap = new Map<
    string,
    { entries: Set<string>; racePoints: (number | null)[] }
  >();

  races.forEach((race, raceIdx) => {
    const teamRacePoints = new Map<string, number>();

    race.slots.forEach((slot: any) => {
      const team = slot.Team || "No Team";
      const position = getRacePosition(race.slots, slot.Driver);

      if (!teamMap.has(team)) {
        teamMap.set(team, { entries: new Set(), racePoints: [] });
      }

      teamMap.get(team)!.entries.add(slot.Driver);

      if (position !== null && position <= DEFAULT_POINTS_SYSTEM.length) {
        const pts = DEFAULT_POINTS_SYSTEM[position - 1];
        teamRacePoints.set(team, (teamRacePoints.get(team) || 0) + pts);
      }
    });

    teamMap.forEach((data, team) => {
      data.racePoints[raceIdx] = teamRacePoints.get(team) || null;
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

function calculateVehicleStandings(races: any[]): VehicleStanding[] {
  const vehicleMap = new Map<
    string,
    {
      vehicleId?: string;
      entries: Set<string>;
      racePoints: (number | null)[];
    }
  >();

  races.forEach((race, raceIdx) => {
    const vehicleRacePoints = new Map<string, number>();

    race.slots.forEach((slot: any) => {
      const vehicle = slot.Vehicle;
      const position = getRacePosition(race.slots, slot.Driver);

      if (!vehicleMap.has(vehicle)) {
        vehicleMap.set(vehicle, {
          vehicleId: slot.VehicleId,
          entries: new Set(),
          racePoints: [],
        });
      }

      vehicleMap.get(vehicle)!.entries.add(slot.Driver);

      if (position !== null && position <= DEFAULT_POINTS_SYSTEM.length) {
        const pts = DEFAULT_POINTS_SYSTEM[position - 1];
        vehicleRacePoints.set(
          vehicle,
          (vehicleRacePoints.get(vehicle) || 0) + pts,
        );
      }
    });

    vehicleMap.forEach((data, vehicle) => {
      data.racePoints[raceIdx] = vehicleRacePoints.get(vehicle) || null;
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

function getBestLapTimesPerRace(races: any[], topN = 10): BestTime[][] {
  return races.map((race) => {
    const raceLapTimes: BestTime[] = [];

    race.slots.forEach((slot: any) => {
      if (slot.BestLap) {
        const timeMs = parseTime(slot.BestLap) * 1000;
        if (Number.isFinite(timeMs) && timeMs > 0) {
          raceLapTimes.push({
            driver: slot.Driver,
            vehicle: slot.Vehicle,
            vehicleId: slot.VehicleId,
            isHuman: !!(typeof slot.UserId === "number" && slot.UserId > 0),
            time: makeTime(parseTime(slot.BestLap)),
            timeMs,
          });
        }
      }
    });

    const sorted = [...raceLapTimes].sort((a: BestTime, b: BestTime) => a.timeMs - b.timeMs);
    return sorted.slice(0, topN);
  });
}

function getBestQualifyingTimesPerRace(races: any[], topN = 10): BestTime[][] {
  return races.map((race) => {
    const raceQualTimes: BestTime[] = [];

    race.slots.forEach((slot: any) => {
      if (slot.QualTime) {
        const timeMs = parseTime(slot.QualTime) * 1000;
        if (Number.isFinite(timeMs) && timeMs > 0) {
          raceQualTimes.push({
            driver: slot.Driver,
            vehicle: slot.Vehicle,
            vehicleId: slot.VehicleId,
            isHuman: !!(typeof slot.UserId === "number" && slot.UserId > 0),
            time: makeTime(parseTime(slot.QualTime)),
            timeMs,
          });
        }
      }
    });

    const sorted = [...raceQualTimes].sort((a: BestTime, b: BestTime) => a.timeMs - b.timeMs);
    return sorted.slice(0, topN);
  });
}

export default function ResultsDatabaseDetail() {
  const { alias } = useParams<{ alias: string }>();
  const navigate = useNavigate();
  const championships = useChampionshipStore((state) => state.championships);
  const leaderboardAssets = useLeaderboardAssetsStore((state) => state.assets);

  const championship = useMemo(() => {
    return championships.find((c) => c.alias === alias);
  }, [championships, alias]);

  const { driverStandings, teamStandings, vehicleStandings, bestLapTimes, bestQualTimes, raceHeaders } = useMemo(() => {
    if (!championship?.raceData || championship.raceData.length === 0) {
      return {
        driverStandings: [],
        teamStandings: [],
        vehicleStandings: [],
        bestLapTimes: [],
        bestQualTimes: [],
        raceHeaders: [],
      };
    }

    const races = championship.raceData;
    return {
      driverStandings: calculateDriverStandings(races),
      teamStandings: calculateTeamStandings(races),
      vehicleStandings: calculateVehicleStandings(races),
      bestLapTimes: getBestLapTimesPerRace(races),
      bestQualTimes: getBestQualifyingTimesPerRace(races),
      raceHeaders: races.map((r) => ({
        name: r.trackname || "Unknown Track",
        time: r.timestring || "",
      })),
    };
  }, [championship]);

  const getVehicleIcon = (vehicleId?: string) => {
    if (!vehicleId || !leaderboardAssets) return null;
    const icon = leaderboardAssets.classes.find((c) => c.id === vehicleId)?.iconUrl;
    return icon || null;
  };

  const getTrackIcon = (trackName: string) => {
    if (!trackName || !leaderboardAssets) return null;
    const icon = leaderboardAssets.tracks.find((t) => t.name === trackName)?.iconUrl;
    return icon || null;
  };

  const getVehicleName = (vehicleId?: string, vehicleName?: string): string => {
    if (vehicleName && vehicleName !== vehicleId) return vehicleName;
    if (!vehicleId) return vehicleName || "";
    // Try to get the name from leaderboard assets
    if (leaderboardAssets) {
      const classData = leaderboardAssets.classes.find((c) => c.id === vehicleId);
      if (classData?.name) {
        return classData.name;
      }
    }
    return vehicleName || vehicleId || "";
  };

  if (!championship) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Championship Not Found</Alert.Heading>
          <p>
            The championship "{alias}" was not found in the database.
          </p>
          <Button variant="outline-danger" onClick={() => navigate("/results-database")}>
            Back to Database
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!championship.raceData || championship.raceData.length === 0) {
    return (
      <Container fluid className="py-4">
        <Alert variant="warning">
          <Alert.Heading>No Race Data Available</Alert.Heading>
          <p>
            This championship was created before race data storage was implemented.
          </p>
          <Button variant="outline-warning" onClick={() => navigate("/results-database")}>
            Back to Database
          </Button>
        </Alert>
      </Container>
    );
  }

  const generatedDate = new Date(championship.generatedAt);
  const formattedDate = generatedDate.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const getPositionClass = (pos: number) => {
    if (pos === 1) return "pos1";
    if (pos === 2) return "pos2";
    if (pos === 3) return "pos3";
    return "";
  };

  return (
    <div className="results-detail-page">
      <Container fluid className="py-4">
        <Button variant="outline-secondary" onClick={() => navigate("/results-database")} className="back-button">
          ← Back to Database
        </Button>

        <div className="results-header">
          <div className="d-flex align-items-center gap-3 mb-2">
            {championship.carIcon && (
              <img
                src={championship.carIcon}
                alt={championship.carName || championship.alias}
                style={{ width: 48, height: 48, objectFit: "contain" }}
              />
            )}
            <h1 className="results-title mb-0">{championship.alias}</h1>
          </div>
          <p className="results-subtitle">
            {championship.carName && <span>{championship.carName} • </span>}
            <span>Championship Standings</span>
          </p>
          <p className="results-subtitle mb-0">
            Generated from R3E Toolbox • {formattedDate}
          </p>
        </div>

        {/* Driver Standings */}
        <div className="results-table-wrapper">
          <table className="results-table">
            <caption>Driver Standings</caption>
            <thead>
              <tr>
                <th rowSpan={2}>Pos</th>
                <th rowSpan={2}>Driver</th>
                <th rowSpan={2}>Vehicle</th>
                <th rowSpan={2}>Team</th>
                <th rowSpan={2}>Points</th>
                {raceHeaders.map((header, idx) => {
                  const trackIcon = getTrackIcon(header.name);
                  return (
                    <th key={`race-${idx}-${header.name}`} colSpan={2} className="track-header">
                      {trackIcon && <img src={trackIcon} alt={header.name} />}
                      {header.name}
                      {header.time && <span className="track-time">{header.time}</span>}
                    </th>
                  );
                })}
              </tr>
              <tr>
                {raceHeaders.map((header, idx) => (
                  <th key={`pts-${idx}-${header.name}`}>Pts</th>
                ))}
                {raceHeaders.map((header, idx) => (
                  <th key={`pos-${idx}-${header.name}`}>Pos</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {driverStandings.map((standing) => {
                const vehicleIcon = getVehicleIcon(standing.vehicleId);
                const vehicleName = getVehicleName(standing.vehicleId, standing.vehicle);
                return (
                  <tr key={standing.driver}>
                    <td>{standing.position}</td>
                    <td className="driver-name-cell">
                      {standing.driver}
                      {standing.isHuman && <span className="human-badge">Human</span>}
                    </td>
                    <td className="vehicle-name-cell">
                      {vehicleIcon && <img src={vehicleIcon} className="vehicle-icon" alt={vehicleName} />}
                      {vehicleName}
                    </td>
                    <td className="team-name-cell">{standing.team}</td>
                    <td className="points-cell">{standing.points}</td>
                    {standing.racePoints.map((pts, idx) => (
                      <td key={`pts-${standing.driver}-${idx}`} className="points-cell">
                        {pts ?? "-"}
                      </td>
                    ))}
                    {standing.raceResults.map((result, idx) => {
                      const posClass = result !== null && result <= 3 ? getPositionClass(result) : "";
                      return (
                        <td key={`result-${standing.driver}-${idx}`} className={posClass}>
                          {result ?? "-"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Team Standings */}
        {teamStandings.length > 1 && (
          <div className="results-table-wrapper">
            <table className="results-table">
              <caption>Team Standings</caption>
              <thead>
                <tr>
                  <th rowSpan={2}>Pos</th>
                  <th rowSpan={2}>Team</th>
                  <th rowSpan={2}>Entries</th>
                  <th rowSpan={2}>Points</th>
                  {raceHeaders.map((header, idx) => (
                    <th key={`team-race-${header.name}-${idx}`} className="track-header">
                      {header.name}
                      {header.time && <span className="track-time">{header.time}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamStandings.map((standing) => (
                  <tr key={standing.team}>
                    <td>{standing.position}</td>
                    <td className="team-name-cell">{standing.team}</td>
                    <td>{standing.entries}</td>
                    <td className="points-cell">{standing.points}</td>
                    {standing.racePoints.map((pts, idx) => (
                      <td key={`team-pts-${standing.team}-${idx}`} className="points-cell">
                        {pts ?? "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Vehicle Standings */}
        <div className="results-table-wrapper">
          <table className="results-table">
            <caption>Vehicle Standings</caption>
            <thead>
              <tr>
                <th rowSpan={2}>Pos</th>
                <th rowSpan={2}>Vehicle</th>
                <th rowSpan={2}>Entries</th>
                <th rowSpan={2}>Points</th>
                {raceHeaders.map((header, idx) => (
                  <th key={`vehicle-race-${header.name}-${idx}`} className="track-header">
                    {header.name}
                    {header.time && <span className="track-time">{header.time}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicleStandings.map((standing) => {
                const vehicleIcon = getVehicleIcon(standing.vehicleId);
                const vehicleName = getVehicleName(standing.vehicleId, standing.vehicle);
                return (
                  <tr key={standing.vehicle}>
                    <td>{standing.position}</td>
                    <td className="vehicle-name-cell">
                      {vehicleIcon && <img src={vehicleIcon} className="vehicle-icon" alt={vehicleName} />}
                      {vehicleName}
                    </td>
                    <td>{standing.entries}</td>
                    <td className="points-cell">{standing.points}</td>
                    {standing.racePoints.map((pts, idx) => (
                      <td key={`vehicle-pts-${standing.vehicle}-${idx}`} className="points-cell">
                        {pts ?? "-"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Best Lap Times Per Race */}
        {bestLapTimes.some((race) => race.length > 0) && (
          <div className="results-table-wrapper">
            <table className="results-table">
              <caption>Best Race Lap Times</caption>
              <thead>
                <tr>
                  <th>Pos</th>
                  {raceHeaders.map((header) => (
                    <th key={`${header.name}-${header.time}`} className="race-header">
                      {header.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {new Array(Math.max(...bestLapTimes.map((r) => r.length).filter(l => l > 0), 0)).fill(undefined).map((_, posIdx) => (
                  <tr key={`best-lap-pos-${championship.alias}-${posIdx}`}>
                    <td>{posIdx + 1}</td>
                    {bestLapTimes.map((raceTimesArray, raceIdx) => {
                      const time = raceTimesArray[posIdx];
                      if (!time) {
                        return <td key={`lap-${championship.alias}-${raceIdx}-${posIdx}`}>-</td>;
                      }
                      const vehicleIcon = getVehicleIcon(time.vehicleId);
                      const vehicleName = getVehicleName(time.vehicleId, time.vehicle);
                      return (
                        <td key={`lap-${championship.alias}-${raceIdx}-${posIdx}`} className="time-cell">
                          <div className="time-entry">
                            <div className="time-driver">
                              {time.driver}
                              {time.isHuman && <span className="human-badge">Human</span>}
                            </div>
                            <div className="time-info">
                              {vehicleIcon && <img src={vehicleIcon} className="vehicle-icon" alt={vehicleName} />}
                              <span className="time-value">{time.time}</span>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Best Qualifying Times Per Race */}
        {bestQualTimes.some((race) => race.length > 0) && (
          <div className="results-table-wrapper">
            <table className="results-table">
              <caption>Best Qualification Times</caption>
              <thead>
                <tr>
                  <th>Pos</th>
                  {raceHeaders.map((header) => (
                    <th key={`${header.name}-${header.time}`} className="race-header">
                      {header.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {new Array(Math.max(...bestQualTimes.map((r) => r.length).filter(l => l > 0), 0)).fill(undefined).map((_, posIdx) => (
                  <tr key={`best-qual-pos-${championship.alias}-${posIdx}`}>
                    <td>{posIdx + 1}</td>
                    {bestQualTimes.map((raceTimesArray, raceIdx) => {
                      const time = raceTimesArray[posIdx];
                      if (!time) {
                        return <td key={`qual-${championship.alias}-${raceIdx}-${posIdx}`}>-</td>;
                      }
                      const vehicleIcon = getVehicleIcon(time.vehicleId);
                      const vehicleName = getVehicleName(time.vehicleId, time.vehicle);
                      return (
                        <td key={`qual-${championship.alias}-${raceIdx}-${posIdx}`} className="time-cell">
                          <div className="time-entry">
                            <div className="time-driver">
                              {time.driver}
                              {time.isHuman && <span className="human-badge">Human</span>}
                            </div>
                            <div className="time-info">
                              {vehicleIcon && <img src={vehicleIcon} className="vehicle-icon" alt={vehicleName} />}
                              <span className="time-value">{time.time}</span>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Race Results */}
        <div className="results-table-wrapper">
          <table className="results-table">
            <caption>Race Results</caption>
            <thead>
              <tr>
                <th>Pos</th>
                {raceHeaders.map((header) => (
                  <th key={`race-result-${header.name}-${header.time}`} className="race-header">
                    {header.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(...(championship.raceData?.map(race => race.slots.length) || [0])) }, (_, posIdx) => (
                <tr key={`race-result-pos-${posIdx}`}>
                  <td>{posIdx + 1}</td>
                  {championship.raceData?.map((race, raceIdx) => {
                    const sortedSlots = [...race.slots].sort((a, b) => {
                      const aFinished = a.FinishStatus === "Finished" || !!a.TotalTime;
                      const bFinished = b.FinishStatus === "Finished" || !!b.TotalTime;
                      if (aFinished !== bFinished) return bFinished ? 1 : -1;
                      const aTime = parseTime(a.TotalTime);
                      const bTime = parseTime(b.TotalTime);
                      return aTime - bTime;
                    });
                    
                    const slot = sortedSlots[posIdx];
                    if (!slot?.TotalTime) {
                      return <td key={`race-result-${raceIdx}-${posIdx}`}>-</td>;
                    }
                    
                    const totalTimeSeconds = parseTime(slot.TotalTime);
                    const formattedTime = Number.isFinite(totalTimeSeconds) ? makeTime(totalTimeSeconds) : slot.TotalTime;
                    const vehicleIcon = getVehicleIcon(slot.VehicleId);
                    const vehicleName = getVehicleName(slot.VehicleId, slot.Vehicle);
                    const isHuman = !!(typeof slot.UserId === "number" && slot.UserId > 0);
                    
                    return (
                      <td key={`race-result-${raceIdx}-${posIdx}`} className="race-result-cell">
                        <div className="race-result-entry">
                          <div className="result-driver">
                            {slot.Driver}
                            {isHuman && <span className="human-badge">Human</span>}
                          </div>
                          <div className="result-vehicle">
                            {vehicleIcon && <img src={vehicleIcon} className="vehicle-icon-small" alt={vehicleName} />}
                            <span>{vehicleName}</span>
                          </div>
                          <div className="result-time">{formattedTime}</div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </div>
  );
}
