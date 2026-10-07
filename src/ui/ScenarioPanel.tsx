import { useState } from 'react';
import { getScenario, reset, SCENARIOS, setScenario, type ScenarioName } from '../mocks/scenarios';

export function ScenarioPanel() {
  const [scenario, setCurrentScenario] = useState<ScenarioName>(getScenario);
  const updateScenario = (value: ScenarioName): void => {
    setScenario(value);
    setCurrentScenario(value);
  };
  const resetState = (): void => {
    reset();
    setCurrentScenario(getScenario());
  };

  return (
    <details className="scenario-panel">
      <summary>Developer tools</summary>
      <label htmlFor="network-scenario">Network scenario</label>
      <select id="network-scenario" value={scenario} onChange={(event) => updateScenario(event.target.value as ScenarioName)}>
        {SCENARIOS.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
      <span role="status">Active scenario: {scenario}</span>
      <button type="button" onClick={resetState}>Reset network state</button>
    </details>
  );
}
