import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.ALLOW_EXECUTION = 'false';
const { createGatewayServer } = await import('../src/server.mjs');

async function withServer(run) {
  const server = createGatewayServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('health and snapshot expose bounded simulated state', async () => {
  await withServer(async (baseUrl) => {
    const health = await fetch(`${baseUrl}/healthz`).then((response) => response.json());
    assert.equal(health.status, 'ok');

    const snapshot = await fetch(`${baseUrl}/api/v1/snapshot`).then((response) => response.json());
    assert.equal(snapshot.provenance.simulated, true);
    assert.equal(snapshot.freshness.state, 'live');
    assert.ok(snapshot.pipeline.length > 0);
  });
});

test('event pagination is bounded', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/events?after=0&limit=3`).then((item) => item.json());
    assert.equal(response.events.length, 3);
    assert.equal(response.nextSequence, 3);
  });
});

test('intervention requires preview and emits an audit receipt', async () => {
  await withServer(async (baseUrl) => {
    const previewResponse = await fetch(`${baseUrl}/api/v1/interventions/preview`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'create checkpoint', target: 'reasoning' }),
    });
    assert.equal(previewResponse.status, 201);
    const preview = await previewResponse.json();
    assert.equal(preview.executionEnabled, false);

    const confirmationResponse = await fetch(`${baseUrl}/api/v1/interventions/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ previewToken: preview.previewToken }),
    });
    assert.equal(confirmationResponse.status, 200);
    const confirmation = await confirmationResponse.json();
    assert.equal(confirmation.status, 'simulated');
    assert.equal(confirmation.receipt.kind, 'intervention_simulated');

    const replay = await fetch(`${baseUrl}/api/v1/interventions/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ previewToken: preview.previewToken }),
    });
    assert.equal(replay.status, 409);
  });
});
