import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

function Feature({ title, desc }) {
  return (
    <div className="col col--4" style={{ marginBottom: '1.5rem' }}>
      <div className="card" style={{ padding: '1.25rem', height: '100%' }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ color: '#a3a3a3', marginBottom: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Layout title="nodeweave" description="A framework-agnostic node / graph canvas">
      <header className="hero hero--nodeweave">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="hero__title">nodeweave</h1>
          <p className="hero__subtitle">
            A framework-agnostic node / graph canvas — build node editors, flow
            builders, pipelines and diagrams. A zero-dependency core plus a
            signal-first Angular 22 binding.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}>
            <Link className="button button--primary button--lg" to="/docs/getting-started">Get started</Link>
            <Link className="button button--secondary button--lg" to="/docs/angular">Angular guide</Link>
            <Link className="button button--secondary button--lg" to="/docs/core-api">API reference</Link>
          </div>
        </div>
      </header>
      <main className="container" style={{ padding: '3rem 1rem' }}>
        <div className="row">
          <Feature title="Nodes & edges" desc="Typed ports and DAG validation. Bezier / straight / step / smoothstep edges, arrowheads, labels and animation." />
          <Feature title="Interactions" desc="Drag, multi-select, pan/zoom, connect-by-drag, 8-handle resize, keyboard shortcuts, undo/redo." />
          <Feature title="Signal-first Angular" desc="A standalone <nodeweave> with custom Angular node components via nodeTypes, on a signal-first service." />
        </div>
      </main>
    </Layout>
  );
}
