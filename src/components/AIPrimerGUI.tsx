import React, { useState, useEffect } from 'react';
import type { Assets, ProcessedDatabase, PlayerTimes } from '../types';
import { makeTime } from '../utils/timeUtils';
import { computeTime } from '../utils/timeUtils';

interface AIPrimerGUIProps {
  assets: Assets | null;
  processed: ProcessedDatabase | null;
  playertimes: PlayerTimes | null;
  onApplyModification: (classid: string, trackid: string, aifrom: number, aito: number, aiSpacing: number) => void;
  onRemoveGenerated: () => void;
  onResetAll: () => void;
}

const AIPrimerGUI: React.FC<AIPrimerGUIProps> = ({
  assets,
  processed,
  playertimes,
  onApplyModification,
  onRemoveGenerated,
  onResetAll,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  const [selectedAILevel, setSelectedAILevel] = useState<number | null>(null);

  const aiNumLevels = 5; // from config
  const aiSpacing = 1; // from config

  useEffect(() => {
    if (assets?.classesSorted.length && !selectedClassId) {
      // Auto-select first available class
      const firstClass = assets.classesSorted[0];
      if (firstClass) {
        setSelectedClassId(firstClass.id);
      }
    }
  }, [assets, selectedClassId]);

  useEffect(() => {
    if (selectedClassId && assets?.tracksSorted.length && !selectedTrackId) {
      // Auto-select first available track
      const firstTrack = assets.tracksSorted[0];
      if (firstTrack) {
        setSelectedTrackId(firstTrack.id);
      }
    }
  }, [selectedClassId, assets, selectedTrackId]);

  const availableClasses = assets?.classesSorted.filter(classAsset => {
    // Show all classes if no processed data, otherwise filter by available data
    if (!processed || Object.keys(processed.classes).length === 0) {
      return true; // Show all classes when no AI data is loaded
    }
    const classData = processed?.classes[classAsset.id];
    const playerClass = playertimes?.classes[classAsset.id];
    return classData || playerClass;
  }) || [];

  const availableTracks = assets?.tracksSorted.filter(trackAsset => {
    if (!selectedClassId) return false;
    // Show all tracks if no processed data, otherwise filter by available data
    if (!processed || Object.keys(processed.classes).length === 0) {
      return true; // Show all tracks when no AI data is loaded
    }
    const classData = processed?.classes[selectedClassId];
    const track = classData?.tracks[trackAsset.id];
    const playerClass = playertimes?.classes[selectedClassId];
    const playerTrack = playerClass?.tracks[trackAsset.id];
    return track || playerTrack;
  }) || [];

  const aiLevels = [];
  if (selectedTrackId && processed?.classes[selectedClassId]?.tracks[selectedTrackId]) {
    const track = processed.classes[selectedClassId].tracks[selectedTrackId];
    for (let ai = track.minAI || 80; ai <= (track.maxAI || 120); ai++) {
      const [num, time] = computeTime(track.ailevels[ai] || []);
      if (num > 0) {
        aiLevels.push({ ai, time, num });
      }
    }
  }

  const aifrom = selectedAILevel ? Math.max(80, selectedAILevel - Math.floor(aiNumLevels / 2)) : 80;
  const aito = Math.min(120, aifrom + aiNumLevels - 1);

  const handleApply = () => {
    if (selectedClassId && selectedTrackId && selectedAILevel) {
      onApplyModification(selectedClassId, selectedTrackId, aifrom, aito, aiSpacing);
    }
  };

  if (!assets) {
    return <div>Please upload RaceRoom Data JSON file first.</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>R3E Adaptive AI Primer</h1>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={onRemoveGenerated} style={{ marginRight: '10px' }}>
          Remove likely generated
        </button>
        <button onClick={onResetAll}>
          Reset all AI times
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div>
          <h3>Classes</h3>
          <select
            size={10}
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedTrackId('');
              setSelectedAILevel(null);
            }}
            style={{ width: '200px' }}
          >
            {availableClasses.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <h3>Tracks</h3>
          <select
            size={10}
            value={selectedTrackId}
            onChange={(e) => {
              setSelectedTrackId(e.target.value);
              setSelectedAILevel(null);
            }}
            style={{ width: '300px' }}
          >
            {availableTracks.map(track => {
              const playerClass = playertimes?.classes[selectedClassId];
              const playerTrack = playerClass?.tracks[track.id];
              const playerTime = playerTrack?.playertime ? makeTime(playerTrack.playertime, ' : ') : '';
              return (
                <option key={track.id} value={track.id}>
                  {track.name} {playerTime && `(Player: ${playerTime})`}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <h3>AI Levels</h3>
          <select
            size={10}
            value={selectedAILevel || ''}
            onChange={(e) => setSelectedAILevel(Number(e.target.value) || null)}
            style={{ width: '150px' }}
          >
            {aiLevels.map(({ ai, time }) => (
              <option key={ai} value={ai}>
                {ai}: {makeTime(time, ' : ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Modification</h3>
        <p>
          {selectedClassId && selectedTrackId && selectedAILevel
            ? `${assets.classes[selectedClassId].name} - ${assets.tracks[selectedTrackId].name} : ${aifrom} - ${aito} step: ${aiSpacing}`
            : 'Select class, track, and AI level'}
        </p>
        <button onClick={handleApply} disabled={!selectedClassId || !selectedTrackId || !selectedAILevel}>
          Apply Selected Modification
        </button>
      </div>
    </div>
  );
};

export default AIPrimerGUI;