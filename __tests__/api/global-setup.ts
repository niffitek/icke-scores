import { execSync } from 'child_process'

const COMPOSE = 'docker compose -f docker-compose.test.yml'

export default async (): Promise<void> => {
  execSync(`${COMPOSE} up -d --wait`, { stdio: 'inherit' })
  // Fresh schema every run
  execSync(
    `${COMPOSE} exec -T db psql -q -v ON_ERROR_STOP=1 -U postgres -d main ` +
      `-c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;' -f /schema.sql`,
    { stdio: 'inherit' }
  )
  // The proxy has no healthcheck; wait until it answers
  for (let attempt = 0; ; attempt++) {
    try {
      await fetch('http://127.0.0.1:4444/sql', { method: 'POST' })
      return
    } catch {
      if (attempt >= 30) throw new Error('neon-proxy did not come up on :4444')
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
}
