import { NexusRegistry } from './src/runtime/registry.js';
import path from 'path';

async function finalAudit() {
  const registry = new NexusRegistry(process.cwd()).load();
  const specialists = registry.agents.filter(a => a.source === 'nexus-specialist');
  const zkSteward = specialists.find(a => a.id === 'nexus-zk-steward');

  console.log(`--- Final Amalgam Audit ---`);
  console.log(`Total Native Specialists: ${specialists.length}`);
  
  if (zkSteward) {
    console.log(`ZK Steward Status: Validated (Description Length: ${zkSteward.description.length})`);
  } else {
    console.log(`ZK Steward Status: MISSING`);
  }

  const gameDevs = specialists.filter(a => a.id.includes('nexus-unity') || a.id.includes('nexus-unreal') || a.id.includes('nexus-godot') || a.id.includes('nexus-roblox'));
  console.log(`Game Dev Specialists: ${gameDevs.length}`);

  if (specialists.length >= 130 && zkSteward && gameDevs.length >= 15) {
    console.log(`\nRESULT: SUCCESS - The Perfect Amalgam is complete.`);
  } else {
    console.log(`\nRESULT: FAILURE - Some components are missing or invalid.`);
    process.exit(1);
  }
}

finalAudit().catch(console.error);
